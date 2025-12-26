// src/modules/admin/pages/Settings/Users.tsx
/**
 * Users Management Tab
 * Custom component for managing all organization users
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
  Avatar,
  Popconfirm,
  Spin,
} from 'antd';
import { Search, UserPlus, Pencil, Trash2, MapPin, Shield, Users as UsersIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import type { ColumnsType } from 'antd/es/table';

interface OrganizationUser {
  id: string;
  user_id: string;
  organization_id: string;
  location_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    mobile: string;
  };
  location: {
    id: string;
    name: string;
  } | null;
  roles: { id: string; name: string }[];
  teams: { id: string; name: string }[];
}

interface AvailableOption {
  id: string;
  name: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

const Users: React.FC = () => {
  const { organization: currentOrg, user: currentUser, permissions: userPermissions } = useAuthStore();
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  
  // Organization filter for admins
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const isSaasAdmin = userPermissions?.admin === 'all';
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Available options
  const [availableRoles, setAvailableRoles] = useState<AvailableOption[]>([]);
  const [availableTeams, setAvailableTeams] = useState<AvailableOption[]>([]);
  const [availableLocations, setAvailableLocations] = useState<AvailableOption[]>([]);
  
  // Get effective org ID
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

  // Fetch users with their relations
  const fetchUsers = async () => {
    if (!effectiveOrgId) return;
    setLoading(true);
    
    try {
      // Fetch organization users with user details
      const { data: orgUsers, error: orgUsersError } = await supabase
        .schema('identity')
        .from('organization_users')
        .select(`
          id,
          user_id,
          organization_id,
          location_id,
          manager_id,
          is_active,
          status,
          created_at,
          user:users!organization_users_user_id_fkey(id, name, email, mobile),
          location:locations!organization_users_location_id_fkey(id, name)
        `)
        .eq('organization_id', effectiveOrgId)
        .order('created_at', { ascending: false });

      if (orgUsersError) throw orgUsersError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (orgUsers || []).map(async (ou: any) => {
          const { data: userRoles } = await supabase
            .schema('identity')
            .from('user_roles')
            .select('role:roles!user_roles_role_id_fkey(id, name)')
            .eq('organization_user_id', ou.id);

          const { data: userTeams } = await supabase
            .schema('identity')
            .from('user_teams')
            .select('team:teams!user_teams_team_id_fkey(id, name)')
            .eq('organization_user_id', ou.id);

          return {
            ...ou,
            roles: userRoles?.map((ur: any) => ur.role).filter(Boolean) || [],
            teams: userTeams?.map((ut: any) => ut.team).filter(Boolean) || [],
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      message.error('Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available options
  const fetchOptions = async () => {
    if (!effectiveOrgId) return;

    const [rolesRes, teamsRes, locationsRes] = await Promise.all([
      supabase.schema('identity').from('roles').select('id, name').eq('organization_id', effectiveOrgId).eq('is_active', true),
      supabase.schema('identity').from('teams').select('id, name').eq('organization_id', effectiveOrgId),
      supabase.schema('identity').from('locations').select('id, name').eq('organization_id', effectiveOrgId),
    ]);

    setAvailableRoles(rolesRes.data || []);
    setAvailableTeams(teamsRes.data || []);
    setAvailableLocations(locationsRes.data || []);
  };

  useEffect(() => {
    fetchOrganizations();
  }, [isSaasAdmin, currentOrg?.id]);

  useEffect(() => {
    if (effectiveOrgId) {
      fetchUsers();
      fetchOptions();
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    if (currentOrg?.id && !selectedOrgId) {
      setSelectedOrgId(currentOrg.id);
    }
  }, [currentOrg?.id]);

  // Open edit modal
  const handleEdit = (record: OrganizationUser) => {
    setEditingUser(record);
    setSelectedRoles(record.roles.map(r => r.id));
    setSelectedTeams(record.teams.map(t => t.id));
    setSelectedLocation(record.location_id);
    setEditModalOpen(true);
  };

  // Save user changes
  const handleSave = async () => {
    if (!editingUser || !currentUser?.id) return;
    setSaving(true);

    try {
      // Update location
      await supabase
        .schema('identity')
        .from('organization_users')
        .update({ location_id: selectedLocation, updated_by: currentUser.id })
        .eq('id', editingUser.id);

      // Update roles - delete old and insert new
      await supabase.schema('identity').from('user_roles').delete().eq('organization_user_id', editingUser.id);
      
      if (selectedRoles.length > 0 && selectedTeams.length > 0) {
        const roleAssignments = selectedRoles.map(roleId => ({
          organization_user_id: editingUser.id,
          organization_id: effectiveOrgId,
          role_id: roleId,
          team_id: selectedTeams[0], // Use first team as default
          created_by: currentUser.id,
        }));
        await supabase.schema('identity').from('user_roles').insert(roleAssignments);
      }

      // Update teams - delete old and insert new
      await supabase.schema('identity').from('user_teams').delete().eq('organization_user_id', editingUser.id);
      
      if (selectedTeams.length > 0) {
        const teamAssignments = selectedTeams.map(teamId => ({
          organization_user_id: editingUser.id,
          team_id: teamId,
          created_by: currentUser.id,
        }));
        await supabase.schema('identity').from('user_teams').insert(teamAssignments);
      }

      message.success('User updated successfully');
      setEditModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      message.error('Failed to update user: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (record: OrganizationUser) => {
    try {
      await supabase
        .schema('identity')
        .from('organization_users')
        .update({ is_active: !record.is_active, updated_by: currentUser?.id })
        .eq('id', record.id);

      message.success(`User ${record.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      message.error('Failed to update user status: ' + error.message);
    }
  };

  // Filter users by search text
  const filteredUsers = users.filter(u => {
    const searchLower = searchText.toLowerCase();
    return (
      u.user?.name?.toLowerCase().includes(searchLower) ||
      u.user?.email?.toLowerCase().includes(searchLower) ||
      u.roles.some(r => r.name.toLowerCase().includes(searchLower)) ||
      u.teams.some(t => t.name.toLowerCase().includes(searchLower))
    );
  });

  const columns: ColumnsType<OrganizationUser> = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ backgroundColor: 'var(--color-primary)' }}>
            {record.user?.name?.charAt(0).toUpperCase() || '?'}
          </Avatar>
          <div>
            <div className="font-medium">{record.user?.name || 'Unknown'}</div>
            <div className="text-xs text-text-secondary">{record.user?.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Roles',
      key: 'roles',
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record.roles.length > 0 ? (
            record.roles.map(role => (
              <Tag key={role.id} color="purple" className="text-xs">
                <Shield size={10} className="inline mr-1" />
                {role.name}
              </Tag>
            ))
          ) : (
            <span className="text-text-tertiary text-xs">No roles</span>
          )}
        </div>
      ),
    },
    {
      title: 'Teams',
      key: 'teams',
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record.teams.length > 0 ? (
            record.teams.map(team => (
              <Tag key={team.id} color="green" className="text-xs">
                <UsersIcon size={10} className="inline mr-1" />
                {team.name}
              </Tag>
            ))
          ) : (
            <span className="text-text-tertiary text-xs">No teams</span>
          )}
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        record.location ? (
          <Tag color="blue">
            <MapPin size={10} className="inline mr-1" />
            {record.location.name}
          </Tag>
        ) : (
          <span className="text-text-tertiary text-xs">No location</span>
        )
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.is_active ? 'success' : 'default'}>
          {record.is_active ? 'Active' : 'Inactive'}
        </Tag>
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
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title={`${record.is_active ? 'Deactivate' : 'Activate'} this user?`}
            onConfirm={() => handleToggleActive(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title={record.is_active ? 'Deactivate' : 'Activate'}>
              <Button
                type="text"
                danger={record.is_active}
                icon={<Trash2 size={16} />}
              />
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
            placeholder="Search users..."
            prefix={<Search size={16} className="text-text-tertiary" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>

      {/* Users Table */}
      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="middle"
      />

      {/* Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Pencil size={18} />
            <span>Edit User: {editingUser?.user?.name}</span>
          </div>
        }
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        okText="Save Changes"
        okButtonProps={{ loading: saving }}
        destroyOnClose
        width={500}
      >
        <div className="space-y-4 py-4">
          {/* Roles */}
          <div>
            <label className="block text-sm font-medium mb-2">Roles</label>
            <Select
              mode="multiple"
              placeholder="Select roles"
              value={selectedRoles}
              onChange={setSelectedRoles}
              className="w-full"
              options={availableRoles.map(r => ({ label: r.name, value: r.id }))}
            />
          </div>

          {/* Teams */}
          <div>
            <label className="block text-sm font-medium mb-2">Teams</label>
            <Select
              mode="multiple"
              placeholder="Select teams"
              value={selectedTeams}
              onChange={setSelectedTeams}
              className="w-full"
              options={availableTeams.map(t => ({ label: t.name, value: t.id }))}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">Primary Location</label>
            <Select
              placeholder="Select location"
              value={selectedLocation}
              onChange={setSelectedLocation}
              className="w-full"
              allowClear
              options={availableLocations.map(l => ({ label: l.name, value: l.id }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
