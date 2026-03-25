// src/modules/shop/components/account/OrdersPanel.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuthStore } from '@/lib/authStore';
import { getOrders } from '../../services/dataService';
import type { Order } from '../../types';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { icon: any, label: string, color: string }> = {
    pending:    { icon: <Clock size={12} />, label: 'Pending', color: '#f59e0b' },
    processing: { icon: <Clock size={12} />, label: 'Processing', color: '#3b82f6' },
    shipped:    { icon: <Truck size={12} />, label: 'Shipped', color: '#8b5cf6' },
    delivered:  { icon: <CheckCircle size={12} />, label: 'Delivered', color: '#10b981' },
    cancelled:  { icon: <AlertCircle size={12} />, label: 'Cancelled', color: '#ef4444' },
  };
  const s = config[status.toLowerCase()] || { icon: null, label: status, color: '#6b7280' };
  return (
    <span className="shop-status-badge" style={{ backgroundColor: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', gap: 4 }}>
      {s.icon} {s.label}
    </span>
  );
};

const OrdersPanel: React.FC = () => {
  const { orgId } = useShop();
  const user = useAuthStore(s => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadOrders();
    }
  }, [user?.id, orgId]);

  async function loadOrders() {
    setLoading(true);
    const data = await getOrders(orgId, user?.id || '');
    setOrders(data);
    setLoading(false);
  }

  if (loading) return <div className="shop-loading-shimmer" style={{ height: 200 }} />;

  if (selected) return (
    <div className="shop-fade-in">
      <button className="shop-btn shop-btn-outline shop-btn-sm" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>← Back to Orders</button>
      <div className="shop-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Order {selected.display_id}</div>
            <div style={{ fontSize: 13, color: 'var(--shop-muted)' }}>Placed on {new Date(selected.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
          </div>
          <StatusBadge status={selected.status} />
        </div>

        <div className="shop-order-items" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items</h3>
          {selected.items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--shop-border)', fontSize: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--shop-muted)' }}>{item.quantity} ×</span>
                <span style={{ fontWeight: 500 }}>{item.product_name}</span>
              </div>
              <span className="shop-item-price">₹{item.price.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1.5px solid var(--shop-border)', paddingTop: 16 }}>
          <div className="shop-summary-row"><span>Subtotal</span><span>₹{selected.subtotal.toLocaleString()}</span></div>
          {selected.discount_total > 0 && <div className="shop-summary-row" style={{ color: '#10b981' }}><span>Discount</span><span>-₹{selected.discount_total.toLocaleString()}</span></div>}
          <div className="shop-summary-row"><span>Shipping</span><span>{selected.shipping_total === 0 ? 'FREE' : `₹${selected.shipping_total}`}</span></div>
          <div className="shop-summary-row"><span>Tax</span><span>₹{selected.tax_total.toLocaleString()}</span></div>
          <div className="shop-summary-row total" style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--shop-border)' }}>
            <span style={{ fontSize: 18 }}>Total</span>
            <span style={{ fontSize: 18 }}>₹{selected.grand_total.toLocaleString()}</span>
          </div>
        </div>

        {selected.shipping_address && (
          <div style={{ marginTop: 24, padding: 16, backgroundColor: 'var(--shop-surface)', borderRadius: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Shipping Address</h3>
            <div style={{ fontSize: 13, color: 'var(--shop-muted)', lineHeight: 1.5 }}>
              {(selected.shipping_address as any).full_name}<br />
              {(selected.shipping_address as any).line1}, {(selected.shipping_address as any).city}<br />
              {(selected.shipping_address as any).state} - {(selected.shipping_address as any).postal_code}<br />
              Phone: {(selected.shipping_address as any).phone}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="shop-fade-in">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>My Orders</h2>
      {orders.length === 0 ? (
        <div className="shop-empty">
          <div className="shop-empty-icon"><Package size={48} /></div>
          <h3>No orders yet</h3>
          <p>Your orders will appear here after you make a purchase.</p>
          <Link to="/shop/products" className="shop-btn shop-btn-primary">Shop Now</Link>
        </div>
      ) : (
        <div className="shop-card" style={{ padding: 0, overflow: 'hidden' }}>
          {orders.map(order => (
            <div 
              key={order.id} 
              className="shop-order-row" 
              style={{ 
                padding: '16px 20px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--shop-border)'
              }} 
              onClick={() => setSelected(order)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{order.display_id}</div>
                <div style={{ fontSize: 12, color: 'var(--shop-muted)' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--shop-muted)' }}>
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <StatusBadge status={order.status} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                <span style={{ fontWeight: 700 }}>₹{order.grand_total.toLocaleString()}</span>
                <ChevronRight size={16} color="var(--shop-muted)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPanel;
