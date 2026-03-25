// src/modules/shop/pages/CartPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useShopConfig } from '../hooks/useShopConfig';

const CartPage: React.FC = () => {
  const config = useShopConfig();
  const { cart, itemCount, updateQuantity, removeItem, applyCoupon, removeCoupon, coupon, couponError } = useCart();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplying(true);
    await applyCoupon(couponInput.trim());
    setApplying(false);
    setCouponInput('');
  };

  if (itemCount === 0) return (
    <div className="shop-container shop-page">
      <div className="shop-empty">
        <div className="shop-empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some products to get started.</p>
        <Link to="/shop/products" className="shop-btn shop-btn-primary">Shop Now</Link>
      </div>
    </div>
  );

  const freeShippingThreshold = config.cart_free_shipping_threshold ?? 999;
  const toFreeShipping = Math.max(0, freeShippingThreshold - cart.subtotal);

  return (
    <div className="shop-container shop-page shop-fade-in">
      <div className="shop-page-header">
        <h1 className="shop-page-title">Shopping Cart</h1>
        <span style={{ fontSize: 14, color: 'var(--shop-muted)' }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>

      {toFreeShipping > 0 ? (
        <div style={{ background: 'rgba(var(--color-primary-rgb,99,102,241),0.08)', borderRadius: 'var(--shop-radius)', padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--shop-text)' }}>
          🚚 Add <strong>₹{toFreeShipping.toLocaleString()}</strong> more for free shipping!
        </div>
      ) : (
        <div style={{ background: 'rgba(22,163,74,0.08)', borderRadius: 'var(--shop-radius)', padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#16a34a' }}>
          ✅ You qualify for <strong>FREE shipping!</strong>
        </div>
      )}

      <div className="shop-cart-layout">
        {/* ── Items ── */}
        <div className="shop-card" style={{ padding: 0 }}>
          {cart.items.map(item => (
            <div key={item.id} className="shop-cart-item" style={{ padding: '16px 20px' }}>
              <div className="shop-cart-image">
                {item.product.meta?.images?.[0]
                  ? <img src={item.product.meta.images[0]} alt={item.product.name} />
                  : <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: 'var(--shop-bg)' }}>
                      {item.product.type === 'service' ? '🔧' : item.product.type === 'digital' ? '💾' : '📦'}
                    </div>
                }
              </div>
              <div className="shop-cart-info">
                <h4>{item.product.name}</h4>
                {item.variant && (
                  <p>{Object.entries(item.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>
                )}
                <div className="shop-qty-stepper">
                  <button className="shop-qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                  <span className="shop-qty-value">{item.quantity}</span>
                  <button className="shop-qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="shop-price" style={{ marginBottom: 6 }}><span style={{ fontWeight: 600 }}>₹{item.line_total.toLocaleString()}</span></div>
                <div style={{ fontSize: 12, color: 'var(--shop-muted)', marginBottom: 8 }}>₹{item.price.toLocaleString()} each</div>
                <button
                  className="shop-btn shop-btn-sm"
                  style={{ color: '#dc2626', borderColor: 'currentColor', background: 'transparent', border: '1px solid currentColor' }}
                  onClick={() => removeItem(item.id)}
                  title="Remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--shop-border)', display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/shop/products" className="shop-btn shop-btn-outline shop-btn-sm">
              <ShoppingBag size={14} /> Continue Shopping
            </Link>
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="shop-cart-summary">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Order Summary</h3>

          {/* Coupon */}
          {!coupon ? (
            <div className="shop-coupon-row">
              <input
                className="shop-coupon-input"
                placeholder="Add coupon code"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
              />
              <button className="shop-btn shop-btn-primary shop-btn-sm" onClick={handleApplyCoupon} disabled={applying}>
                {applying ? '...' : 'Apply'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(22,163,74,0.08)', borderRadius: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>🏷️ {coupon.code} applied</span>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12 }} onClick={removeCoupon}>Remove</button>
            </div>
          )}
          {couponError && <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 8px' }}>{couponError}</p>}

          <div className="shop-summary-row"><span>Subtotal</span><span>₹{cart.subtotal.toLocaleString()}</span></div>
          {cart.discount_total > 0 && (
            <div className="shop-summary-row" style={{ color: '#16a34a' }}><span>Discount</span><span>−₹{cart.discount_total.toLocaleString()}</span></div>
          )}
          <div className="shop-summary-row">
            <span>Shipping</span>
            <span style={{ color: cart.shipping_total === 0 ? '#16a34a' : undefined }}>
              {cart.shipping_total === 0 ? 'FREE' : `₹${cart.shipping_total}`}
            </span>
          </div>
          <div className="shop-summary-row"><span>Tax (18%)</span><span>₹{cart.tax_total.toLocaleString()}</span></div>
          <div className="shop-summary-row total"><span>Total</span><span>₹{cart.grand_total.toLocaleString()}</span></div>

          <button className="shop-btn shop-btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => navigate('/shop/checkout')}>
            Proceed to Checkout →
          </button>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--shop-muted)', marginTop: 10 }}>🔒 Secure 256-bit SSL checkout</div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
