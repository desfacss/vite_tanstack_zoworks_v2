// src/modules/shop/components/account/AddressesPanel.tsx
import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { getCustomerAddresses, saveAddress, deleteAddress } from '../../services/dataService';
import type { Address } from '../../types';

const AddressesPanel: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Address> | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadAddresses();
    }
  }, [user?.id]);

  async function loadAddresses() {
    setLoading(true);
    const data = await getCustomerAddresses(user?.id || '');
    setAddresses(data);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    await saveAddress(user?.id || '', editing as Address);
    setEditing(null);
    loadAddresses();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this address?')) return;
    await deleteAddress(user?.id || '', id);
    loadAddresses();
  }

  if (loading) return <div className="shop-loading-shimmer" style={{ height: 200 }} />;

  return (
    <div className="shop-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Saved Addresses</h2>
        {!editing && (
          <button 
            className="shop-btn shop-btn-primary shop-btn-sm" 
            onClick={() => setEditing({ full_name: '', phone: '', line1: '', city: '', state: '', postal_code: '', country: 'IN' })}
          >
            <Plus size={16} /> Add Address
          </button>
        )}
      </div>

      {editing && (
        <div className="shop-card" style={{ marginBottom: 24, border: '1.5px solid var(--shop-primary)' }}>
          <form onSubmit={handleSave}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{editing.id ? 'Edit Address' : 'New Address'}</h3>
            <div className="shop-form-grid">
              <div className="shop-form-group">
                <label className="shop-form-label">Full Name</label>
                <input required className="shop-form-input" value={editing.full_name} onChange={e => setEditing({...editing, full_name: e.target.value})} />
              </div>
              <div className="shop-form-group">
                <label className="shop-form-label">Phone</label>
                <input required className="shop-form-input" value={editing.phone} onChange={e => setEditing({...editing, phone: e.target.value})} />
              </div>
              <div className="shop-form-group full">
                <label className="shop-form-label">Address Line 1</label>
                <input required className="shop-form-input" value={editing.line1} onChange={e => setEditing({...editing, line1: e.target.value})} />
              </div>
              <div className="shop-form-group">
                <label className="shop-form-label">City</label>
                <input required className="shop-form-input" value={editing.city} onChange={e => setEditing({...editing, city: e.target.value})} />
              </div>
              <div className="shop-form-group">
                <label className="shop-form-label">Postal Code</label>
                <input required className="shop-form-input" value={editing.postal_code} onChange={e => setEditing({...editing, postal_code: e.target.value})} />
              </div>
              <div className="shop-form-group">
                <label className="shop-form-label">State</label>
                <input required className="shop-form-input" value={editing.state} onChange={e => setEditing({...editing, state: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="submit" className="shop-btn shop-btn-primary"><Check size={16} /> Save Address</button>
              <button type="button" className="shop-btn shop-btn-outline" onClick={() => setEditing(null)}><X size={16} /> Cancel</button>
            </div>
          </form>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="shop-empty">
          <div className="shop-empty-icon"><MapPin size={48} /></div>
          <h3>No addresses saved</h3>
          <p>Add a delivery address to speed up checkout.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {addresses.map(addr => (
            <div key={addr.id} className="shop-card" style={{ padding: 16, position: 'relative' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{addr.full_name}</div>
              <div style={{ fontSize: 13, color: 'var(--shop-muted)', lineHeight: 1.6, marginBottom: 12 }}>
                {addr.line1}<br />
                {addr.city}, {addr.state} - {addr.postal_code}<br />
                Phone: {addr.phone}
              </div>
              <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--shop-border)', paddingTop: 12 }}>
                <button 
                  className="shop-btn-text" 
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--shop-primary)' }}
                  onClick={() => setEditing(addr)}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button 
                  className="shop-btn-text" 
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444' }}
                  onClick={() => handleDelete(addr.id)}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressesPanel;
