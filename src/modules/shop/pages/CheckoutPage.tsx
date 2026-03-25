// src/modules/shop/pages/CheckoutPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useShopConfig } from '../hooks/useShopConfig';
import { createOrder } from '../services/dataService';
import type { Address, CartItem } from '../types';

const PAYMENT_LABELS: Record<string, { label: string; icon: string }> = {
  card:       { label: 'Credit / Debit Card', icon: '💳' },
  upi:        { label: 'UPI / Google Pay', icon: '📱' },
  netbanking: { label: 'Net Banking', icon: '🏦' },
  cod:        { label: 'Cash on Delivery', icon: '💵' },
  wallet:     { label: 'Wallet', icon: '👛' },
};

const CheckoutPage: React.FC = () => {
  const config = useShopConfig();
  const { cart, cartId, clearCart } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const isMultiStep = config.checkout_type === 'multi_step';
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<string>(config.checkout_payment_methods?.[0] ?? 'card');
  const [placing, setPlacing] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India',
    same_as_shipping: true, notes: '',
  });

  const set = (k: string, v: string | boolean) => setForm((f: any) => ({ ...f, [k]: v }));

  const handlePlaceOrder = async () => {
    if (!cartId) {
      setError('Cart session expired. Please refresh and try again.');
      return;
    }
    setError(null);
    setPlacing(true);

    const shippingAddress: Address = {
      id: crypto.randomUUID(),
      full_name: form.full_name,
      phone: form.phone,
      line1: form.line1,
      city: form.city,
      state: form.state,
      postal_code: form.postal_code,
      country: form.country,
    };

    try {
      const result = await createOrder(cartId, form.email, shippingAddress);

      if (result) {
        clearCart();
        navigate('/shop/order-confirmation', { 
          state: { 
            order_id: result.order_id,
            order_number: result.order_number,
            total: result.total_amount
          } 
        });
      } else {
        setError('Failed to place order. Please try again.');
        setPlacing(false);
      }
    } catch (err) {
      console.error("Error placing order:", err);
      setError('An unexpected error occurred. Please try again.');
      setPlacing(false);
    }
  };

  const steps = isMultiStep
    ? [
        { label: 'Address', num: 1 },
        { label: 'Payment', num: 2 },
        { label: 'Review', num: 3 },
      ]
    : [];

  const showAddress = !isMultiStep || step === 1;
  const showPayment = !isMultiStep || step === 2;
  const showReview = !isMultiStep || step === 3;

  return (
    <div className="shop-container shop-page shop-fade-in">
      <h1 className="shop-page-title" style={{ marginBottom: 24 }}>Checkout</h1>
      
      {error && (
        <div className="shop-alert alert-error" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Step Indicator (multi-step only) */}
      {isMultiStep && (
        <div className="shop-step-indicator">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className={`shop-step ${s.num === step ? 'active' : s.num < step ? 'done' : ''}`}>
                <div className="shop-step-circle">{s.num < step ? '✓' : s.num}</div>
                {s.label}
              </div>
              {i < steps.length - 1 && <div className="shop-step-line" />}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="shop-checkout-layout">
        <div>
          {/* ── Shipping Address ── */}
          {showAddress && (
            <div className="shop-checkout-section">
              <h3>📦 Shipping Address</h3>
              <div className="shop-form-grid">
                <div className="shop-form-group">
                  <label className="shop-form-label">Full Name *</label>
                  <input className="shop-form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="shop-form-group">
                  <label className="shop-form-label">Phone *</label>
                  <input className="shop-form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9XXXXXXXXX" />
                </div>
                <div className="shop-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="shop-form-label">Email *</label>
                  <input className="shop-form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="shop-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="shop-form-label">Address Line 1 *</label>
                  <input className="shop-form-input" value={form.line1} onChange={e => set('line1', e.target.value)} placeholder="123 Main St, Apt 4" />
                </div>
                <div className="shop-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="shop-form-label">Address Line 2</label>
                  <input className="shop-form-input" value={form.line2} onChange={e => set('line2', e.target.value)} placeholder="Landmark (optional)" />
                </div>
                <div className="shop-form-group">
                  <label className="shop-form-label">City *</label>
                  <input className="shop-form-input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Bangalore" />
                </div>
                <div className="shop-form-group">
                  <label className="shop-form-label">State *</label>
                  <input className="shop-form-input" value={form.state} onChange={e => set('state', e.target.value)} placeholder="Karnataka" />
                </div>
                <div className="shop-form-group">
                  <label className="shop-form-label">Pincode *</label>
                  <input className="shop-form-input" value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="560001" />
                </div>
                <div className="shop-form-group">
                  <label className="shop-form-label">Country</label>
                  <input className="shop-form-input" value={form.country} onChange={e => set('country', e.target.value)} />
                </div>
              </div>
              {isMultiStep && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="shop-btn shop-btn-primary" onClick={() => setStep(2)}>Continue to Payment →</button>
                </div>
              )}
            </div>
          )}

          {/* ── Payment ── */}
          {showPayment && (
            <div className="shop-checkout-section">
              <h3>💳 Payment Method</h3>
              {(config.checkout_payment_methods ?? ['card', 'upi', 'cod']).map(method => {
                const info = PAYMENT_LABELS[method];
                if (!info) return null;
                return (
                  <label key={method} className={`shop-payment-method ${paymentMethod === method ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod(method)}>
                    <input type="radio" name="payment" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                    <span style={{ fontSize: 18 }}>{info.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{info.label}</span>
                  </label>
                );
              })}

              {paymentMethod === 'card' && (
                <div className="shop-form-grid" style={{ marginTop: 16 }}>
                  <div className="shop-form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="shop-form-label">Card Number</label>
                    <input className="shop-form-input" placeholder="•••• •••• •••• ••••" maxLength={19} />
                  </div>
                  <div className="shop-form-group">
                    <label className="shop-form-label">Expiry</label>
                    <input className="shop-form-input" placeholder="MM/YY" maxLength={5} />
                  </div>
                  <div className="shop-form-group">
                    <label className="shop-form-label">CVV</label>
                    <input className="shop-form-input" placeholder="•••" maxLength={4} type="password" />
                  </div>
                  <div className="shop-form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="shop-form-label">Name on Card</label>
                    <input className="shop-form-input" placeholder="Jane Doe" />
                  </div>
                </div>
              )}
              {paymentMethod === 'upi' && (
                <div className="shop-form-group" style={{ marginTop: 16 }}>
                  <label className="shop-form-label">UPI ID</label>
                  <input className="shop-form-input" placeholder="yourname@upi" />
                </div>
              )}
              {isMultiStep && (
                <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  <button className="shop-btn shop-btn-outline" onClick={() => setStep(1)}>← Back</button>
                  <button className="shop-btn shop-btn-primary" onClick={() => setStep(3)}>Review Order →</button>
                </div>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          {(!isMultiStep || step === 1) && (
            <div className="shop-checkout-section">
              <h3>🗒️ Order Notes (Optional)</h3>
              <textarea className="shop-form-input" rows={3} style={{ height: 'auto', resize: 'vertical' }}
                placeholder="Special instructions..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          )}
        </div>

        {/* ── Order Summary ── */}
        <div className="shop-cart-summary" style={{ position: 'sticky', top: 72 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Order Summary</h3>
          {cart.items.map((item: CartItem) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--shop-border)' }}>
              <span style={{ flex: 1, color: 'var(--shop-text)' }}>{item.product.name} <span style={{ color: 'var(--shop-muted)' }}>×{item.quantity}</span></span>
              <span style={{ fontWeight: 600, color: 'var(--shop-text)' }}>₹{item.line_total.toLocaleString()}</span>
            </div>
          ))}
          <div className="shop-summary-row" style={{ marginTop: 8 }}><span>Subtotal</span><span>₹{cart.subtotal.toLocaleString()}</span></div>
          {cart.discount_total > 0 && (
            <div className="shop-summary-row" style={{ color: '#16a34a' }}><span>Discount</span><span>−₹{cart.discount_total.toLocaleString()}</span></div>
          )}
          <div className="shop-summary-row"><span>Shipping</span><span style={{ color: cart.shipping_total === 0 ? '#16a34a' : undefined }}>{cart.shipping_total === 0 ? 'FREE' : `₹${cart.shipping_total}`}</span></div>
          <div className="shop-summary-row"><span>Tax</span><span>₹{cart.tax_total.toLocaleString()}</span></div>
          <div className="shop-summary-row total"><span>Total</span><span>₹{cart.grand_total.toLocaleString()}</span></div>

          {(showReview || !isMultiStep) && (
            <button
              className="shop-btn shop-btn-primary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={handlePlaceOrder}
              disabled={placing}
            >
              {placing ? '⏳ Placing Order...' : '✅ Place Order'}
            </button>
          )}
          {isMultiStep && step === 3 && (
            <button className="shop-btn shop-btn-outline shop-btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setStep(2)}>← Back to Payment</button>
          )}
          <p style={{ fontSize: 11, color: 'var(--shop-muted)', textAlign: 'center', marginTop: 10 }}>🔒 Secure payment powered by ZoWorks</p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
