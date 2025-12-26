// src/modules/admin/pages/Settings/Teams.tsx
/**
 * Teams Management Tab
 * Custom component for managing all organization teams and their members
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
  Card,
  Form,
  Popconfirm,
  Collapse,
  Avatar,
  Badge,
  Empty,
} from 'antd';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Users as UsersIcon,
  ChevronDown,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import type { ColumnsType } from 'antd/es/table';

interface Team {
  id: string;
  name: string;
  organization_id: string;
  location_id: string | null;
  details: Record<string, any>;
  created_at: string;
  location: { id: string; name: string } | null;
  members: TeamMember[];
}

interface TeamMember {
  id: string;
  organization_user_id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface AvailableUser {
  id: string;
  user_id: string;
  user: { id: string; name: string; email: string };
}

interface AvailableLocation {
  id: string;
  name: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

const Teams: React.FC = () => {
  const { organization: currentOrg, user: currentUser, permissions: userPermissions } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  // Organization filter for admins
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const isSaasAdmin = userPermissions?.admin === 'all';

  // Create/Edit team modal
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Add member modal
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [targetTeam, setTargetTeam] = useState<Team | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Available options
  const [availableLocations, setAvailableLocations] = useState<AvailableLocation[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  
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

  // Fetch teams with members
  const fetchTeams = async () => {
    if (!effectiveOrgId) return;
    setLoading(true);

    try {
      const { data: teamsData, error: teamsError } = await supabase
        .schema('identity')
        .from('teams')
        .select(`
          id,
          name,
          organization_id,
          location_id,
          details,
          created_at,
          location:locations!teams_location_id_fkey(id, name)
        `)
        .eq('organization_id', effectiveOrgId)
        .order('name');

      if (teamsError) throw teamsError;

      // Fetch members for each team
      const teamsWithMembers = await Promise.all(
        (teamsData || []).map(async (team: any) => {
          const { data: members } = await supabase
            .schema('identity')
            .from('user_teams')
            .select(`
              id,
              organization_user_id,
              org_user:organization_users!user_teams_organization_user_id_fkey(
                id,
                user:users!organization_users_user_id_fkey(id, name, email)
              )
            `)
            .eq('team_id', team.id);

          return {
            ...team,
            members: (members || []).map((m: any) => ({
              id: m.id,
              organization_user_id: m.organization_user_id,
              user: m.org_user?.user,
            })).filter((m: any) => m.user),
          };
        })
      );

      setTeams(teamsWithMembers);
    } catch (error: any) {
      message.error('Failed to fetch teams: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available options
  const fetchOptions = async () => {
    if (!effectiveOrgId) return;

    const [locationsRes, usersRes] = await Promise.all([
      supabase.schema('identity').from('locations').select('id, name').eq('organization_id', effectiveOrgId),
      supabase.schema('identity').from('organization_users').select(`
        id,
        user_id,
        user:users!organization_users_user_id_fkey(id, name, email)
      `).eq('organization_id', effectiveOrgId).eq('is_active', true),
    ]);

    setAvailableLocations(locationsRes.data || []);
    setAvailableUsers(usersRes.data || []);
  };

  useEffect(() => {
    fetchOrganizations();
  }, [isSaasAdmin, currentOrg?.id]);

  useEffect(() => {
    if (effectiveOrgId) {
      fetchTeams();
      fetchOptions();
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    if (currentOrg?.id && !selectedOrgId) {
      setSelectedOrgId(currentOrg.id);
    }
  }, [currentOrg?.id]);

  // Open create/edit modal
  const handleOpenTeamModal = (team?: Team) => {
    setEditingTeam(team || null);
    form.setFieldsValue(team ? { name: team.name, location_id: team.location_id } : { name: '', location_id: null });
    setTeamModalOpen(true);
  };

  // Save team
  const handleSaveTeam = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingTeam) {
        // Update existing team
        const { error } = await supabase
          .schema('identity')
          .from('teams')
          .update({
            name: values.name,
            location_id: values.location_id || null,
            updated_by: currentUser?.id,
          })
          .eq('id', editingTeam.id);

        if (error) throw error;
        message.success('Team updated successfully');
      } else {
        // Create new team
        const { error } = await supabase
          .schema('identity')
          .from('teams')
          .insert({
            name: values.name,
            organization_id: effectiveOrgId,
            location_id: values.location_id || null,
            created_by: currentUser?.id,
          });

        if (error) throw error;
        message.success('Team created successfully');
      }

      setTeamModalOpen(false);
      fetchTeams();
    } catch (error: any) {
      message.error('Failed to save team: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId: string) => {
    try {
      // First delete all user_teams records
      await supabase.schema('identity').from('user_teams').delete().eq('team_id', teamId);
      
      // Then delete the team
      const { error } = await supabase.schema('identity').from('teams').delete().eq('id', teamId);
      if (error) throw error;

      message.success('Team deleted successfully');
      fetchTeams();
    } catch (error: any) {
      message.error('Failed to delete team: ' + error.message);
    }
  };

  // Open add member modal
  const handleOpenAddMember = (team: Team) => {
    setTargetTeam(team);
    setSelectedUserIds([]);
    setAddMemberModalOpen(true);
  };

  // Add members to team
  const handleAddMembers = async () => {
    if (!targetTeam || selectedUserIds.length === 0) return;
    setSaving(true);

    try {
      const memberAssignments = selectedUserIds.map(orgUserId => ({
        organization_user_id: orgUserId,
        team_id: targetTeam.id,
        created_by: currentUser?.id,
      }));

      const { error } = await supabase
        .schema('identity')
        .from('user_teams')
        .insert(memberAssignments);

      if (error) throw error;

      message.success('Members added successfully');
      setAddMemberModalOpen(false);
      fetchTeams();
    } catch (error: any) {
      message.error('Failed to add members: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Remove member from team
  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .schema('identity')
        .from('user_teams')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      message.success('Member removed');
      fetchTeams();
    } catch (error: any) {
      message.error('Failed to remove member: ' + error.message);
    }
  };

  // Filter teams by search text
  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Get users not already in the target team
  const getAvailableUsersForTeam = () => {
    if (!targetTeam) return availableUsers;
    const existingMemberIds = targetTeam.members.map(m => m.organization_user_id);
    return availableUsers.filter(u => !existingMemberIds.includes(u.id));
  };

  const columns: ColumnsType<Team> = [
    {
      title: 'Team',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <UsersIcon size={20} className="text-green-500" />
          </div>
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-xs text-text-secondary">
              {record.members.length} member{record.members.length !== 1 ? 's' : ''}
            </div>
          </div>
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
      title: 'Members',
      key: 'members',
      width: 300,
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <Avatar.Group maxCount={5}>
            {record.members.map(member => (
              <Tooltip key={member.id} title={member.user?.name}>
                <Avatar size="small" style={{ backgroundColor: 'var(--color-primary)' }}>
                  {member.user?.name?.charAt(0).toUpperCase() || '?'}
                </Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
          <Button
            type="text"
            size="small"
            icon={<UserPlus size={14} />}
            onClick={() => handleOpenAddMember(record)}
          />
        </div>
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
              onClick={() => handleOpenTeamModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this team?"
            description="All member assignments will be removed."
            onConfirm={() => handleDeleteTeam(record.id)}
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

  // Expandable row to show team members
  const expandedRowRender = (record: Team) => (
    <div className="py-2">
      {record.members.length === 0 ? (
        <Empty description="No members" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {record.members.map(member => (
            <Tag
              key={member.id}
              closable
              onClose={(e) => {
                e.preventDefault();
                handleRemoveMember(member.id);
              }}
              className="px-3 py-1"
            >
              {member.user?.name || 'Unknown'}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );

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
            placeholder="Search teams..."
            prefix={<Search size={16} className="text-text-tertiary" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => handleOpenTeamModal()}
        >
          Add Team
        </Button>
      </div>

      {/* Teams Table */}
      <Table
        columns={columns}
        dataSource={filteredTeams}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="middle"
        expandable={{
          expandedRowRender,
          expandIcon: ({ expanded, onExpand, record }) => (
            <Button
              type="text"
              size="small"
              icon={<ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />}
              onClick={(e) => onExpand(record, e)}
            />
          ),
        }}
      />

      {/* Create/Edit Team Modal */}
      <Modal
        title={editingTeam ? 'Edit Team' : 'Create Team'}
        open={teamModalOpen}
        onCancel={() => setTeamModalOpen(false)}
        onOk={handleSaveTeam}
        okText={editingTeam ? 'Save Changes' : 'Create Team'}
        okButtonProps={{ loading: saving }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="py-4">
          <Form.Item
            name="name"
            label="Team Name"
            rules={[{ required: true, message: 'Please enter a team name' }]}
          >
            <Input placeholder="Enter team name" />
          </Form.Item>

          <Form.Item name="location_id" label="Location">
            <Select
              placeholder="Select location (optional)"
              allowClear
              options={availableLocations.map(l => ({ label: l.name, value: l.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Members Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <UserPlus size={18} />
            <span>Add Members to {targetTeam?.name}</span>
          </div>
        }
        open={addMemberModalOpen}
        onCancel={() => setAddMemberModalOpen(false)}
        onOk={handleAddMembers}
        okText="Add Members"
        okButtonProps={{ loading: saving, disabled: selectedUserIds.length === 0 }}
        destroyOnClose
      >
        <div className="py-4">
          <Select
            mode="multiple"
            placeholder="Select users to add"
            value={selectedUserIds}
            onChange={setSelectedUserIds}
            className="w-full"
            options={getAvailableUsersForTeam().map(u => ({
              label: `${u.user?.name || 'Unknown'} (${u.user?.email || ''})`,
              value: u.id,
            }))}
            optionFilterProp="label"
          />
        </div>
      </Modal>
    </div>
  );
};

export default Teams;
