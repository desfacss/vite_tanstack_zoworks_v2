// src/modules/shop/pages/AccountPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, User, MapPin, ArrowLeft } from 'lucide-react';
import OrdersPanel from '../components/account/OrdersPanel';
import ProfilePanel from '../components/account/ProfilePanel';
import AddressesPanel from '../components/account/AddressesPanel';

const NAV_ITEMS = [
  { key: 'orders',    label: 'My Orders',   icon: <Package size={16} /> },
  { key: 'profile',   label: 'Profile',      icon: <User size={16} /> },
  { key: 'addresses', label: 'Addresses',    icon: <MapPin size={16} /> },
];

const AccountPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const navigate = useNavigate();

  return (
    <div className="shop-container shop-page shop-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button 
          className="shop-btn-text" 
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0 }} 
          onClick={() => navigate('/shop')}
        >
          <ArrowLeft size={18} /> Back to Shop
        </button>
      </div>

      <h1 className="shop-page-title" style={{ marginBottom: 32 }}>Account Settings</h1>
      
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
        </div>

        {/* Panel */}
        <div className="shop-account-content">
          {activeTab === 'orders'    && <OrdersPanel />}
          {activeTab === 'profile'   && <ProfilePanel />}
          {activeTab === 'addresses' && <AddressesPanel />}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
