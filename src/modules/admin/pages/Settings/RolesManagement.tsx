// src/modules/admin/pages/Settings/RolesManagement.tsx
/**
 * Roles Management Tab
 * Custom component for managing all organization roles
 */
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Tag,
  Space,
  Modal,
  Select,
  message,
  Tooltip,
  Form,
  Popconfirm,
  Switch,
  Collapse,
} from 'antd';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Key,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import type { ColumnsType } from 'antd/es/table';

interface Role {
  id: string;
  name: string;
  organization_id: string;
  permissions: Record<string, any>;
  feature: Record<string, any>;
  is_active: boolean;
  is_sassadmin: boolean;
  base_role: string | null;
  ui_order: number;
  created_at: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

const RolesManagement: React.FC = () => {
  const { organization: currentOrg, user: currentUser, permissions: userPermissions } = useAuthStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  // Organization filter for admins
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const isSaasAdmin = userPermissions?.admin === 'all';

  // Create/Edit role modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Get effective org ID (selected or current)
  const effectiveOrgId = selectedOrgId || currentOrg?.id;

  // Fetch organizations (for admins)
  const fetchOrganizations = async () => {
    if (!isSaasAdmin) {
      setOrganizations(currentOrg ? [{ id: currentOrg.id, name: currentOrg.name }] : []);
      return;
    }

    const { data, error } = await supabase
      .schema('identity')
      .from('organizations')
      .select('id, name')
      .order('name');

    if (!error && data) {
      setOrganizations(data);
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    if (!effectiveOrgId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .schema('identity')
        .from('roles')
        .select('*')
        .eq('organization_id', effectiveOrgId)
        .order('ui_order', { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      message.error('Failed to fetch roles: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [isSaasAdmin, currentOrg?.id]);

  useEffect(() => {
    if (effectiveOrgId) {
      fetchRoles();
    }
  }, [effectiveOrgId]);

  // Initialize selected org
  useEffect(() => {
    if (currentOrg?.id && !selectedOrgId) {
      setSelectedOrgId(currentOrg.id);
    }
  }, [currentOrg?.id]);

  // Open create/edit modal
  const handleOpenRoleModal = (role?: Role) => {
    setEditingRole(role || null);
    form.setFieldsValue(role ? {
      name: role.name,
      is_active: role.is_active,
      base_role: role.base_role,
      ui_order: role.ui_order,
    } : {
      name: '',
      is_active: true,
      base_role: null,
      ui_order: roles.length + 1,
    });
    setRoleModalOpen(true);
  };

  // Save role
  const handleSaveRole = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingRole) {
        const { error } = await supabase
          .schema('identity')
          .from('roles')
          .update({
            name: values.name,
            is_active: values.is_active,
            base_role: values.base_role || null,
            ui_order: values.ui_order,
            updated_by: currentUser?.id,
          })
          .eq('id', editingRole.id);

        if (error) throw error;
        message.success('Role updated successfully');
      } else {
        const { error } = await supabase
          .schema('identity')
          .from('roles')
          .insert({
            name: values.name,
            organization_id: effectiveOrgId,
            is_active: values.is_active,
            base_role: values.base_role || null,
            ui_order: values.ui_order,
            permissions: {},
            feature: {},
            created_by: currentUser?.id,
          });

        if (error) throw error;
        message.success('Role created successfully');
      }

      setRoleModalOpen(false);
      fetchRoles();
    } catch (error: any) {
      message.error('Failed to save role: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const handleDeleteRole = async (roleId: string) => {
    try {
      // First delete user_roles assignments
      await supabase.schema('identity').from('user_roles').delete().eq('role_id', roleId);

      // Then delete the role
      const { error } = await supabase.schema('identity').from('roles').delete().eq('id', roleId);
      if (error) throw error;

      message.success('Role deleted successfully');
      fetchRoles();
    } catch (error: any) {
      message.error('Failed to delete role: ' + error.message);
    }
  };

  // Toggle role active status
  const handleToggleActive = async (role: Role) => {
    try {
      await supabase
        .schema('identity')
        .from('roles')
        .update({ is_active: !role.is_active, updated_by: currentUser?.id })
        .eq('id', role.id);

      message.success(`Role ${role.is_active ? 'deactivated' : 'activated'}`);
      fetchRoles();
    } catch (error: any) {
      message.error('Failed to update role: ' + error.message);
    }
  };

  // Filter roles by search text
  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Render permissions summary
  const renderPermissionsSummary = (permissions: Record<string, any>) => {
    const modules = Object.keys(permissions);
    if (modules.length === 0) return <span className="text-text-tertiary text-xs">No permissions</span>;

    return (
      <div className="flex flex-wrap gap-1">
        {modules.slice(0, 4).map(module => (
          <Tag key={module} color="blue" className="text-xs capitalize">
            {module}
          </Tag>
        ))}
        {modules.length > 4 && (
          <Tag className="text-xs">+{modules.length - 4} more</Tag>
        )}
      </div>
    );
  };

  const columns: ColumnsType<Role> = [
    {
      title: 'Role',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Shield size={20} className="text-purple-500" />
          </div>
          <div>
            <div className="font-medium">{record.name}</div>
            {record.base_role && (
              <div className="text-xs text-text-secondary">Base: {record.base_role}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, record) => renderPermissionsSummary(record.permissions),
    },
    {
      title: 'Order',
      key: 'ui_order',
      width: 80,
      render: (_, record) => (
        <Tag className="text-xs">{record.ui_order}</Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Switch
          checked={record.is_active}
          onChange={() => handleToggleActive(record)}
          size="small"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<Pencil size={16} />}
              onClick={() => handleOpenRoleModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this role?"
            description="All user assignments will be removed."
            onConfirm={() => handleDeleteRole(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<Trash2 size={16} />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Organization Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Organization Selector (for admins) */}
          {isSaasAdmin && organizations.length > 1 && (
            <Select
              value={selectedOrgId}
              onChange={setSelectedOrgId}
              className="min-w-[200px]"
              options={organizations.map(o => ({ label: o.name, value: o.id }))}
              placeholder="Select Organization"
            />
          )}

          <Input
            placeholder="Search roles..."
            prefix={<Search size={16} className="text-text-tertiary" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => handleOpenRoleModal()}
        >
          Add Role
        </Button>
      </div>

      {/* Roles Table */}
      <Table
        columns={columns}
        dataSource={filteredRoles}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="middle"
      />

      {/* Create/Edit Role Modal */}
      <Modal
        title={editingRole ? 'Edit Role' : 'Create Role'}
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={handleSaveRole}
        okText={editingRole ? 'Save Changes' : 'Create Role'}
        okButtonProps={{ loading: saving }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="py-4">
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Please enter a role name' }]}
          >
            <Input placeholder="Enter role name" />
          </Form.Item>

          <Form.Item name="base_role" label="Base Role (optional)">
            <Select
              placeholder="Select a base role to inherit from"
              allowClear
              options={roles
                .filter(r => r.id !== editingRole?.id)
                .map(r => ({ label: r.name, value: r.name }))}
            />
          </Form.Item>

          <Form.Item name="ui_order" label="Display Order">
            <Input type="number" min={1} />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RolesManagement;
