import React, { useState, useEffect } from 'react';
import { Select, Tabs, Spin, message } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import RolePermissions from './RolePermissions';
import ModuleConfigForm from './ModuleConfigForm';
import RoleManagement from './RoleManagement';
import UserManagement from './UserManagement';

interface Organization {
  id: string;
  name: string;
}

const OrganizationSettings: React.FC = () => {
  const { user, organization } = useAuthStore(); 
  const sassAdmin = true || (user?.role_id as any)?.name === 'SassAdmin' || (user?.roles as any)?.name === 'SassAdmin';
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch organizations from Supabase
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (sassAdmin) {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .schema('identity').from('organizations')
            .select('*')
            .order('name', { ascending: true });
  
          if (error) throw error;
          setOrganizations(data || []);
          if (data && data.length > 0) {
            setSelectedOrg(data[0]); // Default to first organization
          }
        } catch (error) {
          console.error('Error fetching organizations:', error);
          message.error('Failed to load organizations');
        } finally {
          setLoading(false);
        }
      } else {
        setSelectedOrg(organization as any); 
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [sassAdmin, organization]);

  // Handle organization selection
  const handleOrgChange = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId) || null;
    setSelectedOrg(org);
  };

  if (loading) {
    return <Spin tip="Loading organizations..." />;
  }

  return (
    <div style={{ padding: 24 }}>
      {sassAdmin && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8, fontWeight: 'bold' }}>Select Organization:</span>
          <Select
            style={{ width: 300 }}
            placeholder="Select Organization"
            value={selectedOrg?.id}
            onChange={handleOrgChange}
            options={organizations.map((org) => ({
              value: org.id,
              label: org.name,
            }))}
          />
        </div>
      )}
      <Tabs
        defaultActiveKey="modules"
        items={[
          {
            key: 'modules',
            label: 'Module Configurations',
            children: <ModuleConfigForm organization={selectedOrg} user={user as any} />,
          },
          {
            key: 'roles',
            label: 'Role Management',
            children: <RoleManagement organization={selectedOrg} user={user as any} />,
          },
          {
            key: 'permissions',
            label: 'Role Permissions',
            children: <RolePermissions organization={selectedOrg} />,
          },
          {
            key: 'users',
            label: 'User Management',
            children: <UserManagement organization={selectedOrg} user={user as any} />,
          },
        ]}
      />
    </div>
  );
};

export default OrganizationSettings;
