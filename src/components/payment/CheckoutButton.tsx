import React, { useState } from 'react';
import { createPaymentOrder, PaymentOrderResponse } from '../../services/api/paymentApi';
import { usePaymentGateway } from '../../hooks/usePaymentGateway';
import { Button } from '../../core/components/shared/Button';
import { message } from 'antd';


interface CheckoutButtonProps {
  organizationId: string;
  amount: number;
  currency?: string;
  customerDetails?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  onSuccess?: (paymentInfo: any) => void;
  onError?: (error: any) => void;
}

// Global types for Razorpay/Cashfree SDKs
declare global {
  interface Window {
    Razorpay: any;
    Cashfree: any;
  }
}

export const CheckoutButton: React.FC<CheckoutButtonProps> = ({
  organizationId,
  amount,
  currency = 'INR',
  customerDetails = {},
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [gatewayType, setGatewayType] = useState<'RAZORPAY' | 'CASHFREE' | null>(null);

  // The hook dynamically loads the SDK script when gatewayType is set
  const { isReady, error: sdkError } = usePaymentGateway(gatewayType);

  // Cashfree SDK instance ref to avoid re-initializing
  const cashfreeRef = React.useRef<any>(null);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      // 1. Create order on the backend
      const response: PaymentOrderResponse = await createPaymentOrder({
        organization_id: organizationId,
        amount,
        currency,
        notes: {
          customer_details: customerDetails
        }
      });

      // 2. Set the gateway type to trigger the SDK load via the hook
      setGatewayType(response.gateway_type);

      // We need to wait for the script to load. A simple polling approach here since 
      // the hook state update will happen asynchronously.
      const checkSdkReady = setInterval(async () => {
         const scriptLoaded = 
            (response.gateway_type === 'RAZORPAY' && window.Razorpay) ||
            (response.gateway_type === 'CASHFREE' && window.Cashfree);

         if (scriptLoaded) {
            clearInterval(checkSdkReady);
            await openGatewayUI(response);
            setLoading(false);
         }
      }, 500);

      // Timeout safety
      setTimeout(() => {
         clearInterval(checkSdkReady);
         if (loading) {
            setLoading(false);
            const err = new Error("Gateway SDK failed to load in time.");
            message.error("Payment Gateway Error: Could not load SDK.");

            if (onError) onError(err);
         }
      }, 10000);

    } catch (err: any) {
      setLoading(false);
      message.error(err.message || 'Failed to initialize checkout');

      if (onError) onError(err);
    }
  };

  const openGatewayUI = async (config: PaymentOrderResponse) => {
    if (config.gateway_type === 'RAZORPAY') {
      const options = {
        key: config.api_key,
        amount: config.gateway_response.amount,
        currency: config.gateway_response.currency,
        name: 'Your Company Name', // Replace with dynamic name if needed
        description: `Payment for Order ${config.gateway_response.id}`,
        order_id: config.gateway_response.id,
        prefill: {
          name: customerDetails.name || '',
          email: customerDetails.email || '',
          contact: customerDetails.phone || '',
        },
        handler: function (response: any) {
          // Local success handling. Webhook will do the primary DB update.
          message.success("Payment successful!");

          if (onSuccess) onSuccess(response);
        },
        theme: {
          color: '#3399cc',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
         message.error("Payment failed.");
         if (onError) onError(response.error);
      });
      rzp.open();

    } else if (config.gateway_type === 'CASHFREE') {
      if (!cashfreeRef.current) {
         cashfreeRef.current = await window.Cashfree({
           mode: "sandbox", // Change to "production" in prod
         });
      }
      
      const checkoutOptions = {
        paymentSessionId: config.gateway_response.payment_session_id,
        redirectTarget: "_modal",
      };

      try {
         await cashfreeRef.current.checkout(checkoutOptions);
         // Cashfree handles redirects or modal closures internally.
         // You might need to listen to specific CF events if using _modal
      } catch (err) {
         console.error(err);
      }
    }
  };

  return (
    <Button 
      onClick={handleCheckout} 
      disabled={loading || !!sdkError}
      className="w-full sm:w-auto"
    >
      {loading ? 'Initializing...' : `Pay ₹${amount}`}
    </Button>
  );
};
