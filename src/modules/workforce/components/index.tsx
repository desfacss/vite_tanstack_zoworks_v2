import { Button, Card, notification, Table, Drawer, Modal, Form, Avatar, message, Spin, Tooltip, Menu, Dropdown, Col, Row, Input, Select } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Send, List, MoreHorizontal, LayoutGrid, Search, Copy, AlertCircle, Eye } from "lucide-react";
import { LeftOutlined, RightOutlined, HolderOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import './Services.css'; // Add a CSS file to style the cards grid
import { serverErrorParsing } from "@/core/components/common/utils/serverErrorParsing";
import { camelCaseToTitleCase } from "@/core/components/common/utils/casing";
import DynamicForm from "@/core/components/shared/DynamicForm";
import AgentActivityReport from "./AgentActivityReport"; // Import the AgentActivityReport component
import env_def from "@/core/lib/env";

export const getAllValues = (obj) => {
  let values = [];
  for (const key in obj) {
    if (key.toLowerCase().includes("id")) {
      // Skip properties containing 'id'
      continue;
    }
    if (typeof obj[key] === "object" && obj[key] !== null) {
      // Recursively get values from nested objects
      values = values.concat(getAllValues(obj[key]));
    } else {
      values.push(obj[key]);
    }
  }
  return values;
};

const { confirm } = Modal;

// Define interfaces for type safety
interface UserDetails {
  email?: string;
  mobile?: string;
  firstName?: string;
  lastName?: string;
  rate?: number;
  role_type?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  birthDate?: string;
  address?: string;
  emergencyContact?: string;
  has_resigned?: boolean;
  last_date?: string;
  profileImage?: string;
}

interface User {
  id: string;
  auth_id?: string;
  name: string;
  details: UserDetails;
  role_id: string;
  role_type?: string;
  location?: { id: string; name: string; leave_settings?: any };
  organization_id: string;
  is_active?: boolean;
  team_id?: string[];
  privacy?: { groups: string[] };
  profile_privacy?: { [key: string]: boolean };
  subscriptions?: { [key: string]: any };
  relationship_details?: { [key: string]: any };
  post_read_statuses?: { [key: string]: any };
  status?: string;
}

interface Role {
  id: string;
  role_name: string;
}

interface Location {
  id: string;
  name: string;
  leave_settings?: any;
}

interface FormSchema {
  [key: string]: any;
}

interface TeamUsersProps {
  selectedTeamId?: string | null; // Optional team ID prop
}

const TeamUsers: React.FC<TeamUsersProps> = ({ selectedTeamId }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [editItem, setEditItem] = useState<Partial<User> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState<boolean>(false); // New state for activity drawer
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // New state for selected user ID
  const [schema, setSchema] = useState<FormSchema | undefined>();
  const [clone, setClone] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [loading, setLoading] = useState<boolean>(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchText, setSearchText] = useState<string>('');

  const { user, organization, location } = useAuthStore();
  const [form] = Form.useForm();

  const filteredUsers = useMemo(() => {
    if (!searchText) return users;
    return users?.filter((item) =>
      getAllValues(item).some((value) =>
        String(value).toLowerCase().includes(searchText.toLowerCase())
      )
    );
  }, [users, searchText]);

  const getForms = async () => {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('name', 'user_add_edit_form')
      .single();
    if (data) {
      setSchema(data);
    }
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .schema('identity').from('roles')
      .select('*')
      // .eq('organization_id', organization?.id)
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching roles:', error);
    } else {
      setRoles(data);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .schema('identity').from('users')
      .select(`*, location:location_id (*), role:role_id (name)`)
      .eq('organization_id', organization?.id)
      .eq('is_active', true)
      .order('name', { ascending: true });
    // Conditionally filter by location_id
    if (location?.id && organization?.app_settings?.partition === 'locations') {
      query = query.eq('location_id', location.id);
    }
    // If a team is selected, filter users by team_id
    if (selectedTeamId) {
      query = query.contains('team_id', [selectedTeamId]);
    }

    const { data, error } = await query;

    if (data) {
      // Map role_name to role_type for backward compatibility
      const mappedData = data.map((user: any) => ({
        ...user,
        role_type: user.role?.role_name,
      }));
      setUsers(mappedData);
    }
    if (error) {
      notification.error({ message: error?.message || 'Failed to fetch users' });
    }
    setLoading(false);
  };

  useEffect(() => {
    getForms();
    fetchRoles();
    fetchUsers();
  }, [selectedTeamId]); // Re-fetch users when selectedTeamId changes

  // Rest of the component remains the same
  // ... (handleAddOrEdit, handleEdit, showDeleteConfirm, showResendLoginLinkConfirm, columns, actionsMenu, etc.)
  const handleAddOrEdit = async (values: any) => {
    setLoading(true);
    const {
      email,
      mobile,
      firstName,
      lastName,
      role_id,
      location_id,
      team_id,
      has_resigned,
      last_date,
      rate,
      designation,
      department,
      joiningDate,
      birthDate,
      address,
      emergencyContact,
    } = values;

    const role_type = roles?.find((r) => r.id === role_id)?.role_name;
    const userName = `${firstName} ${lastName}`;
    const payload = {
      organization_id: organization?.id,
      role_id,
      // role_type,
      details: {
        rate,
        role_id,
        role_type,
        email,
        mobile,
        lastName,
        userName,
        firstName,
        has_resigned,
        last_date,
        designation,
        department,
        joiningDate,
        birthDate,
        address,
        emergencyContact,
      },
      name: userName,
      is_active: true,
      location_id,
      team_id: team_id || [],
      privacy: { groups: ['Contact Info'] },
      profile_privacy: { 'Contact Info': false },
      subscriptions: {},
      relationship_details: {},
      post_read_statuses: {},
      created_by: user?.id,
      updated_by: user?.id,
    };

    try {
      if (editItem && !clone) {
        const { error } = await supabase
          .schema('identity').from('users')
          .update(payload)
          .eq('id', editItem.id);
        if (error) throw new Error('Failed to update user.');
        notification.success({ message: `${payload.name} updated successfully` });
        setEditItem(null);
      } else {
        const { data: existingUser, error: checkError } = await supabase
          .schema('identity').from('users')
          .select('id')
          .eq('details->>email', email)
          .eq('organization_id', organization?.id);

        if (checkError && checkError?.code !== 'PGRST116') throw checkError;
        if (existingUser?.length > 0) {
          message.warning('User with this email already exists.');
          return;
        }

        // const response = await fetch(
        //   'https://kxpeuyomuohexsvcxneu.supabase.co/functions/v1/invite_users',
        //   {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ email }),
        //   }
        // );

        const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGV1eW9tdW9oZXhzdmN4bmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NDc0MzQsImV4cCI6MjA1NzAyMzQzNH0.3qwGqTuhWPlrKoxQGLns2E4o-0Gcbyn161S5sjgazEE';
        const response = await fetch(
          `${env_def?.SUPABASE_URL}/functions/v1/invite_users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ANON_KEY}`,
            },
            body: JSON.stringify({ email }),
          }
        );

        if (!response.ok) throw new Error('Failed to invite user.');
        const inviteResponse = await response.json();
        const authId = inviteResponse?.id;
        const insertPayload = { ...payload, auth_id: authId };

        const { error: insertError } = await supabase.schema('identity').from('users').insert([insertPayload]);
        if (insertError) throw insertError;

        message.success(
          <>
            {payload.name} invited successfully. {payload.name} can accept the invite sent from Inbox/Spam folder!
          </>
        );
      }
    } catch (error: any) {
      message.error(error.message || 'An error occurred.');
    } finally {
      setLoading(false);
      fetchUsers();
      setIsModalOpen(false);
      form.resetFields();
      setEditItem(null);
      setClone(false);
    }
  };

  const handleEdit = (record: User, copy?: boolean) => {
    const item = {
      ...record.details,
      has_resigned: record.details?.has_resigned,
      department: record.details?.department,
      designation: record.details?.designation,
      joiningDate: record.details?.joiningDate,
      id: record.id,
      location_id: record.location?.id,
      team_id: record.team_id || [],
    };
    if (copy) {
      delete item.email;
      delete item.firstName;
      delete item.lastName;
      delete item.mobile;
      setClone(true);
    }
    setEditItem(item);
    form.setFieldsValue(item);
    setIsModalOpen(true);
  };

  const showDeleteConfirm = async (record: User) => {
    confirm({
      title: `Confirm deletion of ${record.name}?`,
      icon: <AlertCircle size={16} />,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const { error } = await supabase.schema('identity').from('users').delete().eq('id', record.id);
          if (!error) {
            notification.success({ message: 'User deleted successfully' });
            fetchUsers();
          } else {
            notification.error({ message: serverErrorParsing(error.message) || 'Failed to delete user' });
          }
        } catch (e: any) {
          notification.error({ message: e.message || 'Unexpected error occurred' });
        }
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  };

  const showResendLoginLinkConfirm = async (record: User) => {
    confirm({
      title: `Do you want to resend Login Link to ${record.name}?`,
      icon: <AlertCircle size={16} />,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(record.details?.email || '');
          if (error) throw error;
          message.success(`Login Link sent to ${record.name}`);
        } catch (error: any) {
          message.error(error.message || 'Failed to send Login Link.');
        }
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  };
  const prefill = {
    "rate": 70,
    "email": "ganeshmr3003@gmail.com",
    "mobile": 2342342342,
    "lastName": "R",
    "firstName": "ganesh",
    "department": "Dept3",
    "designation": "Desig3",
    "joiningDate": "2025-03-28",
    "id": "914bbeea-c7ed-4b78-93f8-4a8c33e2171c",
    "location_id": "22222222-1111-1111-1111-111111111111",
    "team_id": []
  }


  // New handler for opening the activity report drawer
  const handleViewActivity = (userId: string) => {
    setSelectedUserId(userId);
    setIsActivityDrawerOpen(true);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: User, b: User) => a.name.localeCompare(b.name) },
    {
      title: 'Email',
      dataIndex: ['details', 'email'],
      key: 'email',
      sorter: (a: User, b: User) => a.details?.email?.localeCompare(b.details?.email || '') || 0,
    },
    { title: 'Mobile', dataIndex: ['details', 'mobile'], key: 'mobile' },
    { title: 'Cost/Hr', dataIndex: ['details', 'rate'], key: 'rate', sorter: (a: User, b: User) => (a.details?.rate || 0) - (b.details?.rate || 0) },
    {
      title: 'Role',
      dataIndex: ['details', 'role_type'],
      key: 'role',
      sorter: (a: User, b: User) => a.details?.role_type?.localeCompare(b.details?.role_type || '') || 0,
      render: (text: string) => camelCaseToTitleCase(text),
    },
    {
      title: 'Location',
      dataIndex: ['location', 'name'],
      key: 'location',
      sorter: (a: User, b: User) => a.location?.name?.localeCompare(b.location?.name || '') || 0,
    },
    {
      title: 'Teams',
      dataIndex: 'team_id',
      key: 'team_id',
      render: (teamIds: string[]) => (teamIds?.length > 0 ? teamIds.join(', ') : 'None'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: User) => (
        <div className="d-flex">
          <Tooltip title="Edit">
            <Button type="primary" icon={<Pencil size={14} />} size="small" className="mr-2" onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Copy">
            <Button type="primary" icon={<Copy size={14} />} size="small" className="mr-2" onClick={() => handleEdit(record, true)} />
          </Tooltip>
          <Tooltip title="Resend Login Link">
            <Button type="primary" icon={<Send size={14} />} size="small" className="mr-2" onClick={() => showResendLoginLinkConfirm(record)} />
          </Tooltip>
          <Tooltip title="View Activity">
            <Button type="primary" icon={<Eye size={14} />} size="small" className="mr-2" onClick={() => handleViewActivity(record.id)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="primary" ghost icon={<Trash2 size={14} />} size="small" onClick={() => showDeleteConfirm(record)} />
          </Tooltip>
        </div>
      ),
    },
  ];

  const actionsMenu = (user: User) => (
    <Menu>
      <Menu.Item key="edit" onClick={() => handleEdit(user)}>
        <Button type="link" size="small">Edit</Button>
      </Menu.Item>
      <Menu.Item key="copy" onClick={() => handleEdit(user, true)}>
        <Button type="link" size="small">Copy</Button>
      </Menu.Item>
      <Menu.Item key="resend" onClick={() => showResendLoginLinkConfirm(user)}>
        <Button type="link" size="small">Resend Link</Button>
      </Menu.Item>
      <Menu.Item key="view-activity" onClick={() => handleViewActivity(user.id)}>
        <Button type="link" size="small">View Activity</Button>
      </Menu.Item>
      <Menu.Item key="delete" onClick={() => showDeleteConfirm(user)}>
        <Button type="link" ghost size="small">Delete</Button>
      </Menu.Item>
    </Menu>
  );

  return (
    <Card styles={{ body: { padding: '0px' } }}>
      <div
        className="d-flex p-2 justify-content-between align-items-center"
        style={{ marginBottom: '16px' }}
      >
        <h2 className="text-h2 !m-0">Manage Team</h2>
        <div>
          <Input
            className="mr-2"
            placeholder="Search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<Search size={14} />}
            style={{ width: 200 }}
          />
          <Button
            icon={viewMode === 'card' ? <List size={16} /> : <LayoutGrid size={16} />}
            style={{ marginRight: '10px' }}
            onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
          />
          <Button type="primary" icon={<Plus size={16} />} onClick={() => { setEditItem(null); setIsModalOpen(true); }}>
            Invite User
          </Button>
        </div>
      </div>
      <div ref={componentRef}>
        {viewMode === 'card' ? (
          <div>
            <Row gutter={[16, 16]}>
              {filteredUsers?.map((user) => (
                <Col key={user.id} xs={24} sm={12} lg={6}>
                  <Card
                    extra={
                      <Dropdown overlay={actionsMenu(user)} trigger={['click']}>
                        <Button icon={<MoreHorizontal size={16} />} shape="circle" />
                      </Dropdown>
                    }
                    title={
                      <div className="service-card-title">
                        <Avatar
                          size={80}
                          src={user.details?.profileImage}
                          alt={user.name?.[0] || ''}
                        >
                          {user.name?.[0] || ''}
                        </Avatar>
                      </div>
                    }
                    className="service-card"
                  >
                    <p><b>Name:</b> {user.name}</p>
                    <p><b>Email:</b> {user.details?.email}</p>
                    <p><b>Mobile:</b> {user.details?.mobile}</p>
                    <p><b>Role:</b> {camelCaseToTitleCase(user?.role?.name || '')}</p>
                    <p><b>Teams:</b> {user.team_id?.length > 0 ? user.team_id.join(', ') : 'None'}</p>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        ) : (
          <div className="pl-3 pr-3">
            <Table
              size="small"
              columns={columns}
              dataSource={filteredUsers}
              rowKey={(record) => record.id}
              loading={loading}
              pagination={true}
            />
          </div>
        )}
      </div>
      <Drawer
        width={600}
        footer={null}
        title={editItem && !clone ? 'Edit User Details' : 'Invite User'}
        open={isModalOpen}
        closable={!loading}
        maskClosable={!loading}
        onClose={() => {
          setIsModalOpen(false);
          setEditItem(null);
          setClone(false);
        }}
      >
        <Spin spinning={loading}>
          <DynamicForm schemas={schema} onFinish={handleAddOrEdit} formData={editItem} />
        </Spin>
      </Drawer>
      <Drawer
        width="80%"
        title={`Activity Report for ${users.find(u => u.id === selectedUserId)?.name || 'User'}`}
        open={isActivityDrawerOpen}
        onClose={() => {
          setIsActivityDrawerOpen(false);
          setSelectedUserId(null);
        }}
        closable={true}
      >
        {selectedUserId && <AgentActivityReport editItem={{ id: selectedUserId }} />}
      </Drawer>
    </Card>
  );
};

export default TeamUsers;