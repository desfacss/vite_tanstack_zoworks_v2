// src/modules/shop/components/account/ProfilePanel.tsx
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { supabase } from '@/lib/supabase';

const ProfilePanel: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      const u = user as any;
      setName(u.user_metadata?.full_name || u.user_metadata?.name || '');
      setEmail(user.email || '');
      setPhone(u.user_metadata?.phone || '');
    }
  }, [user]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name, phone: phone }
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    }
    setSaving(false);
  }

  return (
    <div className="shop-fade-in">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Personal Profile</h2>
      <div className="shop-card">
        {message && (
          <div className={`shop-alert alert-${message.type}`} style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, fontSize: 14 }}>
            {message.text}
          </div>
        )}

        <div className="shop-form-grid full">
          <div className="shop-form-group">
            <label className="shop-form-label"><User size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Full Name</label>
            <input 
              className="shop-form-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Your full name" 
            />
          </div>
          <div className="shop-form-group">
            <label className="shop-form-label"><Mail size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Email Address</label>
            <input 
              className="shop-form-input" 
              type="email" 
              value={email} 
              disabled 
              style={{ backgroundColor: 'var(--shop-surface-alt)', cursor: 'not-allowed' }}
              placeholder="you@example.com" 
            />
            <p style={{ fontSize: 11, color: 'var(--shop-muted)', marginTop: 4 }}>Email cannot be changed from the shop profile.</p>
          </div>
          <div className="shop-form-group">
            <label className="shop-form-label"><Phone size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Phone Number</label>
            <input 
              className="shop-form-input" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="+91 9XXXXXXXXX" 
            />
          </div>
        </div>

        <div style={{ marginTop: 24, padding: 16, backgroundColor: 'var(--shop-surface)', borderRadius: 8, border: '1px dashed var(--shop-border)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ color: 'var(--shop-primary)' }}><Shield size={20} /></div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Login Security</div>
              <div style={{ fontSize: 12, color: 'var(--shop-muted)' }}>To change your password or security settings, please use the main account settings.</div>
            </div>
          </div>
        </div>

        <button 
          className="shop-btn shop-btn-primary" 
          style={{ marginTop: 24 }} 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePanel;
