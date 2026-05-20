import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { organization_id, amount, currency = 'INR', notes = {} } = await req.json()

    if (!organization_id || !amount) {
      throw new Error('organization_id and amount are required')
    }

    // Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Admin client to access vault and tenant_gateways (which might have RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch gateway info
    const { data: gatewayData, error: gatewayError } = await supabaseAdmin
      .from('tenant_gateways')
      .select('gateway_type, api_key, secret_key_id')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .single()

    if (gatewayError || !gatewayData) {
      throw new Error('No active payment gateway found for this organization')
    }

    // 2. Fetch decrypted secret from vault using the RPC function
    const { data: secretKey, error: secretError } = await supabaseAdmin
      .rpc('get_decrypted_secret', { secret_id: gatewayData.secret_key_id })

    if (secretError || !secretKey) {
        console.error("Vault access error:", secretError);
        throw new Error('Failed to retrieve gateway secret')
    }
    const gatewayType = gatewayData.gateway_type

    let gatewayOrderId = null;
    let orderResponse = null;

    // 3. Create order in respective gateway
    if (gatewayType === 'RAZORPAY') {
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${gatewayData.api_key}:${secretKey}`)
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Razorpay expects paise
          currency: currency,
          notes: {
            ...notes,
            organization_id: organization_id // Important for webhook routing
          }
        })
      });

      orderResponse = await rzpResponse.json();
      if (!rzpResponse.ok) {
        console.error("Razorpay Error:", orderResponse);
        throw new Error('Failed to create Razorpay order');
      }
      gatewayOrderId = orderResponse.id;
      
    } else if (gatewayType === 'CASHFREE') {
       const cfResponse = await fetch('https://sandbox.cashfree.com/pg/orders', { // Use api.cashfree.com for prod
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': gatewayData.api_key,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01'
          },
          body: JSON.stringify({
            order_amount: amount,
            order_currency: currency,
            customer_details: {
               customer_id: "cust_" + organization_id.substring(0,8), // Cashfree requires a customer ID
               customer_phone: "9999999999", // Dummy if not provided
               ...notes.customer_details
            },
            order_meta: {
                return_url: "http://localhost:5173/payment/success?order_id={order_id}"
            },
            order_tags: {
                organization_id: organization_id
            }
          })
       });
       orderResponse = await cfResponse.json();
       if (!cfResponse.ok) {
          console.error("Cashfree Error:", orderResponse);
          throw new Error('Failed to create Cashfree order');
       }
       gatewayOrderId = orderResponse.order_id;
       // Cashfree also uses a payment_session_id for the frontend
       orderResponse.payment_session_id = orderResponse.payment_session_id;
    } else {
        throw new Error('Unsupported gateway type')
    }

    // 4. Save payment intent in database
    const { data: intentData, error: intentError } = await supabaseAdmin
      .from('payment_intents')
      .insert({
        organization_id,
        amount,
        currency,
        status: 'CREATED',
        gateway_type: gatewayType,
        gateway_order_id: gatewayOrderId,
        metadata: notes
      })
      .select()
      .single()

    if (intentError) {
        console.error("Intent Insert Error:", intentError);
        throw new Error('Failed to save payment intent');
    }

    return new Response(
      JSON.stringify({
        success: true,
        intent: intentData,
        gateway_type: gatewayType,
        api_key: gatewayData.api_key,
        gateway_response: orderResponse // Needed for frontend SDK init
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
