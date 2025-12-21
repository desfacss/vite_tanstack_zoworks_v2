import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Switch, message, Space, Popconfirm, Drawer, Checkbox, List, Typography } from 'antd';
import { supabase } from '@/lib/supabase';
import { PlusOutlined, EditOutlined, DeleteOutlined, ImportOutlined } from '@ant-design/icons';
const { Title } = Typography;

interface Role {
  id: string;
  name: string;
  permissions: { [key: string]: any };
  is_sassadmin: boolean;
  is_active: boolean;
  organization_id: string | null;
  feature: { [key: string]: any };
}

interface Organization {
  id: string;
  name: string;
}

interface RoleManagementProps {
  organization: { id: string; name: string } | null;
  user: { id: string } | null;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ organization, user }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [allRoles, setAllRoles] = useState<{ organization: Organization | null; roles: Role[] }[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // Fetch roles for the selected organization
  useEffect(() => {
    const fetchRoles = async () => {
      if (!organization?.id) {
        setRoles([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .schema('identity').from('roles')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) throw error;
        setRoles(data || []);
      } catch (error) {
        console.error('Error fetching roles:', error);
        message.error('Failed to load roles');
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [organization?.id]);

  // Fetch all roles grouped by organization for the import drawer
  useEffect(() => {
    const fetchAllRoles = async () => {
      try {
        // Fetch all roles and join with organizations to get organization names
        const { data: rolesData, error: rolesError } = await supabase
          .schema('identity').from('roles')
          .select('id, name, permissions, is_sassadmin, is_active, organization_id, feature, organizations(name)')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (rolesError) throw rolesError;

        // Group roles by organization_id
        const groupedRoles = rolesData.reduce((acc: { [key: string]: Role[] }, role) => {
          const orgId = role.organization_id || 'no-org';
          if (!acc[orgId]) {
            acc[orgId] = [];
          }
          acc[orgId].push({
            ...role,
            organization_id: role.organization_id,
            organizations: undefined, // Remove organizations field from role
          });
          return acc;
        }, {});

        // Fetch organization details
        const { data: orgsData, error: orgsError } = await supabase
          .schema('identity').from('organizations')
          .select('id, name');

        if (orgsError) throw orgsError;

        // Map to grouped structure
        const grouped = Object.entries(groupedRoles).map(([orgId, roles]) => ({
          organization: orgId === 'no-org' ? null : orgsData.find((org) => org.id === orgId) || null,
          roles,
        }));

        setAllRoles(grouped);
      } catch (error) {
        console.error('Error fetching all roles:', error);
        message.error('Failed to load roles for import');
      }
    };

    fetchAllRoles();
  }, []);

  // Open modal for creating or editing a role
  const showModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      form.setFieldsValue({
        name: role.name,
        is_sassadmin: role.is_sassadmin,
        is_active: role.is_active,
      });
    } else {
      setEditingRole(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  // Handle form submission for creating or updating a role
  const handleOk = async () => {
    if (!organization || !user) {
      message.error('Organization or user not found');
      return;
    }
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        is_sassadmin: values.is_sassadmin,
        is_active: values.is_active,
        organization_id: organization.id,
        created_by: user.id,
        updated_by: user.id,
        permissions: editingRole ? editingRole.permissions : {},
        // base_role: editingRole ? editingRole.base_role : null,
        feature: editingRole ? editingRole.feature : {},
      };

      if (editingRole) {
        // Update existing role
        const { error } = await supabase
          .schema('identity').from('roles')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRole.id);

        if (error) throw error;

        setRoles((prev) =>
          prev.map((role) =>
            role.id === editingRole.id ? { ...role, ...payload } : role
          )
        );
        message.success('Role updated successfully');
      } else {
        // Create new role
        const { data, error } = await supabase
          .schema('identity').from('roles')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        setRoles((prev) => [...prev, data]);
        message.success('Role created successfully');
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingRole(null);
    } catch (error: any) {
      console.error('Error saving role:', error);
      message.error(
        error.message.includes('roles_organization_id_name_key')
          ? 'A role with this name already exists in the organization'
          : 'Failed to save role'
      );
    }
  };

  // Handle role deletion
  const handleDelete = async (roleId: string) => {
    try {
      const { error } = await supabase
        .schema('identity').from('roles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', roleId);

      if (error) throw error;
      setRoles((prev) => prev.filter((role) => role.id !== roleId));
      message.success('Role deleted successfully');
    } catch (error) {
      console.error('Error deleting role:', error);
      message.error('Failed to delete role');
    }
  };

  // Handle role selection for import
  const handleRoleSelect = (roleId: string, checked: boolean) => {
    setSelectedRoleIds((prev) =>
      checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)
    );
  };

  // Handle import of selected roles
  const handleImport = async () => {
    if (!organization || !user) {
      message.error('Organization or user not found');
      return;
    }
    if (selectedRoleIds.length === 0) {
      message.warning('Please select at least one role to import');
      return;
    }

    try {
      // Fetch selected roles
      const { data: selectedRoles, error: fetchError } = await supabase
        .schema('identity').from('roles')
        .select('*')
        .in('id', selectedRoleIds);

      if (fetchError) throw fetchError;

      // Prepare payload for new roles
      const newRoles = selectedRoles.map((role) => ({
        name: role.name,
        permissions: role.permissions,
        is_sassadmin: role.is_sassadmin,
        is_active: true,
        organization_id: organization.id,
        created_by: user.id,
        updated_by: user.id,
        // base_role: role.base_role,
        feature: role.feature,
      }));

      // Insert new roles
      const { data: insertedRoles, error: insertError } = await supabase
        .schema('identity').from('roles')
        .insert(newRoles)
        .select();

      if (insertError) throw insertError;

      // Update local roles state
      setRoles((prev) => [...prev, ...insertedRoles]);
      message.success(`${insertedRoles.length} role(s) imported successfully`);
      setIsDrawerOpen(false);
      setSelectedRoleIds([]);
    } catch (error: any) {
      console.error('Error importing roles:', error);
      message.error(
        error.message.includes('roles_organization_id_name_key')
          ? 'One or more roles already exist in this organization'
          : 'Failed to import roles'
      );
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'SaaS Admin',
      dataIndex: 'is_sassadmin',
      key: 'is_sassadmin',
      render: (is_sassadmin: boolean) => (is_sassadmin ? 'Yes' : 'No'),
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active: boolean) => (is_active ? 'Yes' : 'No'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Role) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            disabled={!organization}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this role?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={!organization}
          >
            <Button icon={<DeleteOutlined />} danger disabled={!organization}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
          disabled={!organization}
        >
          Add Role
        </Button>
        <Button
          type="default"
          icon={<ImportOutlined />}
          onClick={() => setIsDrawerOpen(true)}
          disabled={!organization}
        >
          Import Roles
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        loading={loading}
        pagination={false}
        bordered
      />
      <Modal
        title={editingRole ? 'Edit Role' : 'Create Role'}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingRole(null);
        }}
        okText={editingRole ? 'Update' : 'Create'}
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Please enter the role name' }]}
          >
            <Input placeholder="Enter role name" />
          </Form.Item>
          <Form.Item
            name="is_sassadmin"
            label="SaaS Admin"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        title="Import Roles"
        width={600}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedRoleIds([]);
        }}
        open={isDrawerOpen}
        extra={
          <Button
            type="primary"
            onClick={handleImport}
            disabled={selectedRoleIds.length === 0}
          >
            Import Selected
          </Button>
        }
      >
        {allRoles.map((group) => (
          <div key={group.organization?.id || 'no-org'} style={{ marginBottom: 24 }}>
             <Title level={4}>{group.organization?.name || 'No Organization'} </Title>
            <List
              dataSource={group.roles}
              renderItem={(role) => (
                <List.Item>
                  <Checkbox
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={(e) => handleRoleSelect(role.id, e.target.checked)}
                  >
                    {role.name} {role.is_sassadmin ? '(SaaS Admin)' : ''}
                  </Checkbox>
                </List.Item>
              )}
            />
          </div>
        ))}
      </Drawer>
    </div>
  );
};

export default RoleManagement;