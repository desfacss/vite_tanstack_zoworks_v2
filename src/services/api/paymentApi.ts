import { supabase } from '@/lib/supabase'; // Assuming standard supabase client setup
// Note: replace with your actual supabase client import path if different

export interface PaymentOrderRequest {
  organization_id: string;
  amount: number;
  currency?: string;
  notes?: Record<string, any>;
}

export interface PaymentOrderResponse {
  success: boolean;
  intent: any;
  gateway_type: 'RAZORPAY' | 'CASHFREE';
  api_key: string;
  gateway_response: any;
  error?: string;
}

export const createPaymentOrder = async (
  requestData: PaymentOrderRequest
): Promise<PaymentOrderResponse> => {
  // We invoke the Supabase Edge Function directly
  const { data, error } = await supabase.functions.invoke<PaymentOrderResponse>('create-payment-order', {
    body: requestData,
  });

  if (error) {
    throw new Error(error.message || 'Failed to create payment order');
  }

  if (!data) {
     throw new Error('No data received from payment order function');
  }

  return data;
};
