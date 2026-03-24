// src/modules/shop/pages/AccountPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, User, MapPin, LogOut, ChevronRight } from 'lucide-react';
import { getMockOrders } from '../services/dataService';
import type { Order } from '../types';

const NAV_ITEMS = [
  { key: 'orders',    label: 'My Orders',   icon: <Package size={16} /> },
  { key: 'profile',   label: 'Profile',      icon: <User size={16} /> },
  { key: 'addresses', label: 'Addresses',    icon: <MapPin size={16} /> },
];

const OrdersPanel: React.FC = () => {
  const orders = getMockOrders();
  const [selected, setSelected] = useState<Order | null>(null);

  if (selected) return (
    <div>
      <button className="shop-btn shop-btn-outline shop-btn-sm" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>← Back to Orders</button>
      <div className="shop-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{selected.display_id}</div>
            <div style={{ fontSize: 13, color: 'var(--shop-muted)' }}>{new Date(selected.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
          </div>
          <span className={`shop-status-badge status-${selected.status}`}>{selected.status}</span>
        </div>
        {selected.items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--shop-border)', fontSize: 14 }}>
            <span>{item.product_name} × {item.quantity}</span>
            <span style={{ fontWeight: 600 }}>₹{item.line_total.toLocaleString()}</span>
          </div>
        ))}
        <div style={{ borderTop: '1.5px solid var(--shop-border)', marginTop: 8, paddingTop: 12 }}>
          {[
            ['Subtotal', `₹${selected.subtotal.toLocaleString()}`],
            ['Shipping', selected.shipping_total === 0 ? 'FREE' : `₹${selected.shipping_total}`],
            ['Tax', `₹${selected.tax_total.toLocaleString()}`],
          ].map(([k, v]) => (
            <div key={k} className="shop-summary-row"><span>{k}</span><span>{v}</span></div>
          ))}
          <div className="shop-summary-row total"><span>Total</span><span>₹{selected.grand_total.toLocaleString()}</span></div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>My Orders</h2>
      {orders.length === 0 ? (
        <div className="shop-empty">
          <div className="shop-empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Your orders will appear here after you make a purchase.</p>
          <Link to="/shop/products" className="shop-btn shop-btn-primary">Shop Now</Link>
        </div>
      ) : (
        <div className="shop-card" style={{ padding: 0 }}>
          {orders.map(order => (
            <div key={order.id} className="shop-order-row" style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => setSelected(order)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{order.display_id}</div>
                <div style={{ fontSize: 12, color: 'var(--shop-muted)' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--shop-muted)' }}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</div>
              <span className={`shop-status-badge status-${order.status}`}>{order.status}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

const ProfilePanel: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Profile</h2>
      <div className="shop-card">
        <div className="shop-form-grid full">
          <div className="shop-form-group">
            <label className="shop-form-label">Full Name</label>
            <input className="shop-form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="shop-form-group">
            <label className="shop-form-label">Email</label>
            <input className="shop-form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="shop-form-group">
            <label className="shop-form-label">Phone</label>
            <input className="shop-form-input" placeholder="+91 9XXXXXXXXX" />
          </div>
        </div>
        <button className="shop-btn shop-btn-primary" style={{ marginTop: 16 }}>Save Changes</button>
      </div>
    </div>
  );
};

const AddressesPanel: React.FC = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Saved Addresses</h2>
        <button className="shop-btn shop-btn-primary shop-btn-sm">+ Add Address</button>
      </div>
      <div className="shop-empty">
        <div className="shop-empty-icon">📍</div>
        <h3>No addresses saved</h3>
        <p>Add a delivery address to speed up checkout.</p>
      </div>
    </div>
  );
};

const AccountPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const navigate = useNavigate();

  return (
    <div className="shop-container shop-page shop-fade-in">
      <h1 className="shop-page-title" style={{ marginBottom: 24 }}>My Account</h1>
      <div className="shop-account-layout">
        {/* Sidebar nav */}
        <div className="shop-account-nav">
          {NAV_ITEMS.map(item => (
            <div
              key={item.key}
              className={`shop-account-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              {item.icon} {item.label}
            </div>
          ))}
          <div className="shop-account-nav-item" onClick={() => navigate('/shop')} style={{ color: '#dc2626' }}>
            <LogOut size={16} /> Exit Shop
          </div>
        </div>

        {/* Panel */}
        <div>
          {activeTab === 'orders'    && <OrdersPanel />}
          {activeTab === 'profile'   && <ProfilePanel />}
          {activeTab === 'addresses' && <AddressesPanel />}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
