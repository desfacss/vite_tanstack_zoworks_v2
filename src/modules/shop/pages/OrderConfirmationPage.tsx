// src/modules/shop/pages/OrderConfirmationPage.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const OrderConfirmationPage: React.FC = () => {
  const location = useLocation();
  const { order_display_id } = (location.state as any) || {};
  const orderNum = order_display_id ?? `ZW-${Date.now()}`;

  return (
    <div className="shop-container shop-page shop-fade-in">
      <div className="shop-confirmation">
        <div className="shop-confirmation-icon">
          <CheckCircle size={40} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Order Placed! 🎉</h1>
        <p style={{ fontSize: 15, color: 'var(--shop-muted)', marginBottom: 24 }}>
          Thank you for your purchase. Your order has been confirmed.
        </p>
        <div className="shop-card" style={{ marginBottom: 24, textAlign: 'left' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--shop-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Order Number</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--shop-primary)' }}>{orderNum}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--shop-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Estimated Delivery</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {new Date(Date.now() + 5 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} –{' '}
                {new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { emoji: '📧', text: 'Confirmation email sent to your inbox' },
            { emoji: '📦', text: 'Your order is being prepared' },
            { emoji: '🚚', text: 'Tracking info will be emailed when shipped' },
          ].map(({ emoji, text }) => (
            <div key={text} className="shop-card" style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</div>
              <div style={{ fontSize: 12, color: 'var(--shop-muted)' }}>{text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/shop/account/orders" className="shop-btn shop-btn-outline">View My Orders</Link>
          <Link to="/shop/products" className="shop-btn shop-btn-primary">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
