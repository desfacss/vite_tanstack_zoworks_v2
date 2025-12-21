import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, Switch, message, Space } from 'antd';
import { supabase } from '@/lib/supabase';
import { EditOutlined } from '@ant-design/icons';

interface User {
  id: string;
  name: string | null;
  organization_id: string;
  role_id: string | null;
  location_id: string | null;
  is_active: boolean;
}

interface Role {
  id: string;
  name: string;
  organization_id: string | null;
}

interface Location {
  id: string;
  name: string;
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
}

interface UserManagementProps {
  organization: { id: string; name: string } | null;
  user: { id: string } | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ organization, user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Fetch users, roles, locations, and organizations
  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) {
        setUsers([]);
        setRoles([]);
        setLocations([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // Fetch users
        const { data: usersData, error: usersError } = await supabase
          .schema('identity').from('users')
          .select('id, name, organization_id, role_id, location_id, is_active')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (usersError) throw usersError;
        setUsers(usersData || []);

        // Fetch roles
        const { data: rolesData, error: rolesError } = await supabase
          .schema('identity').from('roles')
          .select('id, name, organization_id')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (rolesError) throw rolesError;
        setRoles(rolesData || []);

        // Fetch locations
        const { data: locationsData, error: locationsError } = await supabase
          .schema('identity').from('locations')
          .select('id, name, organization_id')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);

        // Fetch all organizations (for changing organization_id)
        const { data: orgsData, error: orgsError } = await supabase
          .schema('identity').from('organizations')
          .select('id, name')
          .order('name', { ascending: true });

        if (orgsError) throw orgsError;
        setOrganizations(orgsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organization?.id]);

  // Fetch roles and locations when organization_id changes in the form
  useEffect(() => {
    const fetchRolesAndLocations = async () => {
      if (!selectedOrgId || selectedOrgId === organization?.id) {
        return;
      }
      try {
        // Fetch roles for the new organization
        const { data: rolesData, error: rolesError } = await supabase
          .schema('identity').from('roles')
          .select('id, name, organization_id')
          .eq('organization_id', selectedOrgId)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (rolesError) throw rolesError;
        setRoles(rolesData || []);

        // Fetch locations for the new organization
        const { data: locationsData, error: locationsError } = await supabase
          .schema('identity').from('locations')
          .select('id, name, organization_id')
          .eq('organization_id', selectedOrgId)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);
      } catch (error) {
        console.error('Error fetching roles/locations for new org:', error);
        message.error('Failed to load roles or locations');
      }
    };

    fetchRolesAndLocations();
  }, [selectedOrgId, organization?.id]);

  // Open modal for editing a user
  const showModal = (userRecord: User) => {
    setEditingUser(userRecord);
    setSelectedOrgId(userRecord.organization_id);
    form.setFieldsValue({
      role_id: userRecord.role_id,
      location_id: userRecord.location_id,
      organization_id: userRecord.organization_id,
      is_active: userRecord.is_active,
    });
    setIsModalOpen(true);
  };

  // Handle form submission for updating a user
  const handleOk = async () => {
    if (!organization || !user || !editingUser) {
      message.error('Organization, user, or editing user not found');
      return;
    }
    try {
      const values = await form.validateFields();
      const payload = {
        role_id: values.role_id || null,
        location_id: values.location_id || null,
        organization_id: values.organization_id,
        is_active: values.is_active,
        // updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .schema('identity').from('users')
        .update(payload)
        .eq('id', editingUser.id);

      if (error) throw error;

      // If organization_id changed, remove user from current list
      if (values.organization_id !== organization.id) {
        setUsers((prev) => prev.filter((u) => u.id !== editingUser.id));
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id ? { ...u, ...payload } : u
          )
        );
      }

      message.success('User updated successfully');
      setIsModalOpen(false);
      form.resetFields();
      setEditingUser(null);
      setSelectedOrgId(null);
    } catch (error) {
      console.error('Error updating user:', error);
      message.error('Failed to update user');
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string | null) => name || 'N/A',
    },
    {
      title: 'Role',
      dataIndex: 'role_id',
      key: 'role_id',
      render: (role_id: string | null) =>
        roles.find((role) => role.id === role_id)?.name || 'No Role',
    },
    {
      title: 'Location',
      dataIndex: 'location_id',
      key: 'location_id',
      render: (location_id: string | null) =>
        locations.find((loc) => loc.id === location_id)?.name || 'No Location',
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
      render: (_: any, record: User) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => showModal(record)}
          disabled={!organization}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={false}
        bordered
      />
      <Modal
        title="Edit User"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingUser(null);
          setSelectedOrgId(null);
        }}
        okText="Update"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="organization_id"
            label="Organization"
            rules={[{ required: true, message: 'Please select an organization' }]}
          >
            <Select
              placeholder="Select organization"
              onChange={(value) => setSelectedOrgId(value)}
              options={organizations.map((org) => ({
                value: org.id,
                label: org.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="role_id" label="Role">
            <Select
              placeholder="Select role"
              allowClear
              options={roles.map((role) => ({
                value: role.id,
                label: role.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="location_id" label="Location">
            <Select
              placeholder="Select location"
              allowClear
              options={locations.map((loc) => ({
                value: loc.id,
                label: loc.name,
              }))}
            />
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
    </div>
  );
};

export default UserManagement;