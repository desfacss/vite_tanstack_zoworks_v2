import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


serve(async (req) => {
  try {
    // We need the raw body for signature verification in some cases (like Stripe), 
    // but Razorpay expects HMAC of the raw JSON body string.
    const rawBody = await req.text()
    const payload = JSON.parse(rawBody)

    // Determine Gateway from Headers
    const isRazorpay = req.headers.has('X-Razorpay-Signature')
    const isCashfree = req.headers.has('x-webhook-signature')

    let organizationId = null;
    let gatewayOrderId = null;
    let paymentId = null;
    let signature = null;
    let gatewayType = null;
    let eventType = null;

    if (isRazorpay) {
      gatewayType = 'RAZORPAY';
      signature = req.headers.get('X-Razorpay-Signature');
      // Razorpay passes notes in the entity
      organizationId = payload.payload?.payment?.entity?.notes?.organization_id;
      gatewayOrderId = payload.payload?.payment?.entity?.order_id;
      paymentId = payload.payload?.payment?.entity?.id;
      eventType = payload.event;
    } else if (isCashfree) {
      gatewayType = 'CASHFREE';
      signature = req.headers.get('x-webhook-signature');
      // Cashfree passes tags
      organizationId = payload.data?.order?.order_tags?.organization_id;
      gatewayOrderId = payload.data?.order?.order_id;
      paymentId = payload.data?.payment?.cf_payment_id;
      eventType = payload.type;
    } else {
      throw new Error('Unknown webhook source');
    }

    if (!organizationId) {
      throw new Error('Organization ID not found in webhook payload');
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch gateway secret
    const { data: gatewayData, error: gatewayError } = await supabaseAdmin
      .from('tenant_gateways')
      .select('secret_key_id')
      .eq('organization_id', organizationId)
      .eq('gateway_type', gatewayType)
      .single()

    if (gatewayError || !gatewayData) {
      throw new Error('No gateway configuration found for this organization');
    }

    // Fetch decrypted secret from vault using the RPC function
    const { data: secretKey, error: secretError } = await supabaseAdmin
      .rpc('get_decrypted_secret', { secret_id: gatewayData.secret_key_id })

    if (secretError || !secretKey) {
      throw new Error('Failed to retrieve gateway secret');
    }

    // Verify Signature
    let isValid = false;

    // Helper function for HMAC SHA-256 using Deno native Web Crypto API
    const createHmacSignature = async (secret: string, data: string, format: 'hex' | 'base64'): Promise<string> => {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      
      if (format === 'hex') {
        return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        return btoa(String.fromCharCode.apply(null, signatureArray));
      }
    };

    if (gatewayType === 'RAZORPAY') {
      // Razorpay: HMAC-SHA256 of raw body
      const expectedSignature = await createHmacSignature(secretKey, rawBody, 'hex');
      isValid = (signature === expectedSignature);
    } else if (gatewayType === 'CASHFREE') {
       // Cashfree signature logic:
       // x-webhook-signature = Base64(HMAC-SHA256(timestamp + rawBody, secret))
       const timestamp = req.headers.get('x-webhook-timestamp');
       const expectedSignature = await createHmacSignature(secretKey, (timestamp || '') + rawBody, 'base64');
       isValid = (signature === expectedSignature);
    }

    if (!isValid) {
      console.error("Invalid signature detected", { expected: isValid, provided: signature });
      return new Response("Invalid signature", { status: 400 });
    }

    // Process successful payment
    if ((gatewayType === 'RAZORPAY' && eventType === 'payment.captured') ||
        (gatewayType === 'CASHFREE' && eventType === 'PAYMENT_SUCCESS_WEBHOOK')) {
      
      const { error: updateError } = await supabaseAdmin
        .from('payment_intents')
        .update({
          status: 'SUCCESS',
          gateway_payment_id: paymentId,
          gateway_signature: signature
        })
        .eq('gateway_order_id', gatewayOrderId)

      if (updateError) {
        console.error("DB Update Error:", updateError);
        throw new Error("Failed to update payment intent");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
