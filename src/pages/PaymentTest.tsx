import React, { useState } from 'react';
import { CheckoutButton } from '../components/payment/CheckoutButton';
import { useAuthStore, useThemeStore } from '../core/lib/store';

const PaymentTestPage = () => {
  const organization = useAuthStore(state => state.organization);
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  
  // Theme colors
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    text: isDarkMode ? '#f1f5f9' : '#1e293b',
    label: isDarkMode ? '#94a3b8' : '#374151',
    inputBg: isDarkMode ? '#0f172a' : '#ffffff',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    muted: isDarkMode ? '#64748b' : '#64748b',
    accent: '#10b981', // green
  };

  const [organizationId, setOrganizationId] = useState(organization?.id || '');
  const [amount, setAmount] = useState<number>(100);

  React.useEffect(() => {
    if (organization?.id && !organizationId) {
      setOrganizationId(organization.id);
    }
  }, [organization, organizationId]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: colors.bg,
      padding: '20px',
      fontFamily: 'sans-serif',
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
        backgroundColor: colors.card, 
        color: colors.text,
        borderRadius: '12px', 
        boxShadow: isDarkMode ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '32px',
        border: `1px solid ${colors.border}`,
        transition: 'all 0.3s ease'
      }}>
        {/* <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '24px' }}>
          Test Direct Payment Integration
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px', color: colors.label }}>
            Organization ID (UUID)
          </label>
          {organization?.name && (
            <p style={{ fontSize: '0.75rem', color: colors.accent, marginBottom: '8px' }}>
              Logged in as: <strong>{organization.name}</strong>
            </p>
          )}
          <input 
            type="text"
            placeholder="Enter Org UUID" 
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 14px', 
              borderRadius: '6px', 
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.inputBg,
              color: colors.text,
              boxSizing: 'border-box',
              outline: 'none',
              fontSize: '0.95rem'
            }}
          />
          <p style={{ fontSize: '0.75rem', color: colors.muted, marginTop: '8px' }}>
            This is pre-filled from your current session.
          </p>
        </div> */}

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px', color: colors.label }}>
            Amount (INR)
          </label>
          <input 
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ 
              width: '100%', 
              padding: '10px 14px', 
              borderRadius: '6px', 
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.inputBg,
              color: colors.text,
              boxSizing: 'border-box',
              outline: 'none',
              fontSize: '0.95rem'
            }}
          />
        </div>

        <div style={{ paddingTop: '24px', borderTop: `1px solid ${colors.border}` }}>
          {organizationId ? (
            <div style={{ textAlign: 'center' }}>
              <CheckoutButton 
                organizationId={organizationId} 
                amount={amount} 
                customerDetails={{ 
                  name: "Test User", 
                  email: "test@example.com",
                  phone: "9999999999"
                }} 
                onSuccess={(res) => {
                  console.log("Frontend Success Callback:", res);
                  alert("Payment Successful!");
                }}
                onError={(err) => {
                  console.error("Frontend Error Callback:", err);
                  alert("Error: " + (err.message || "Unknown error"));
                }}
              />
              <p style={{ fontSize: '0.75rem', color: colors.muted, marginTop: '12px' }}>
                Testing {organizationId ? 'Active' : 'Inactive'} Integration
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: '#f59e0b' }}>
              Please enter an Organization ID to enable the payment button.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentTestPage;