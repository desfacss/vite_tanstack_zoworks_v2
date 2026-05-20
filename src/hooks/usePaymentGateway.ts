import { useState, useEffect } from 'react';

type GatewayType = 'RAZORPAY' | 'CASHFREE';

interface UsePaymentGatewayResult {
  isReady: boolean;
  error: Error | null;
}

export const usePaymentGateway = (gatewayType: GatewayType | null): UsePaymentGatewayResult => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!gatewayType) return;

    let scriptUrl = '';
    
    if (gatewayType === 'RAZORPAY') {
      scriptUrl = 'https://checkout.razorpay.com/v1/checkout.js';
    } else if (gatewayType === 'CASHFREE') {
      scriptUrl = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    }

    if (!scriptUrl) return;

    // Check if script is already loaded
    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
      setIsReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;

    script.onload = () => {
      setIsReady(true);
    };

    script.onerror = () => {
      setError(new Error(`Failed to load ${gatewayType} SDK`));
    };

    document.body.appendChild(script);

    return () => {
      // Optional: Cleanup script if component unmounts before loading
      // Usually, we keep it loaded for subsequent checkouts
    };
  }, [gatewayType]);

  return { isReady, error };
};
