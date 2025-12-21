import React from 'react';
import { useAuthStore } from '@/lib/store';

const ContextDebug: React.FC = () => {
    const { user, organization, location } = useAuthStore();

    if (!user) return null;

    // Cast user to any to access pref_organization_id if it's not in the strict type definition yet
    const userWithPref = user as any;
    const prefOrgId = userWithPref.pref_organization_id;
    const storeOrgId = organization?.id;
    const isMatch = prefOrgId === storeOrgId;

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px',
            fontFamily: 'monospace'
        }}>
            <h4 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #555' }}>Auth Context Debug</h4>
            <div><strong>User ID:</strong> {user.id?.substring(0, 8)}...</div>

            <div style={{ marginTop: '5px', color: isMatch ? '#4caf50' : '#ff9800' }}>
                <strong>Org Sync Status:</strong> {isMatch ? 'MATCH' : 'MISMATCH'}
            </div>

            <div><strong>Store Org ID:</strong> {storeOrgId || 'null'}</div>
            <div><strong>User Pref Org ID:</strong> {prefOrgId || 'undefined'}</div>

            <div style={{ marginTop: '5px' }}>
                <strong>Store Location ID:</strong> {location?.id || 'null'}
            </div>

            <div style={{ marginTop: '5px', fontSize: '10px', color: '#aaa' }}>
                <em>Note: 'User Pref Org ID' comes from user.pref_organization_id</em>
            </div>
        </div>
    );
};

export default ContextDebug;
