import { Button, Card, notification, Table, Drawer, Form, Input, Select, DatePicker, Modal, Tooltip, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from "@/core/lib/store"; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { camelCaseToTitleCase } from "@/core/components/common/utils/casing";
import { Edit2, Trash2, AlertCircle } from "lucide-react";

const getAllValues = (obj: any) => {
    let values: any[] = [];
    for (let key in obj) {
        if (key.toLowerCase().includes("id")) continue;
        if (typeof obj[key] === "object" && obj[key] !== null) {
            values = values.concat(getAllValues(obj[key]));
        } else {
            values.push(obj[key]);
        }
    }
    return values;
};

dayjs.extend(utc);
const { confirm } = Modal;

interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'users' | 'public' | 'location' | 'team' | 'roles';
    start: string;
    expiry: string;
    users: string[] | null;
    locations: string[] | null;
    teams: string[] | null;
    roles: string[] | null;
    organization_id: string;
    updated_at: string;
}

interface User { id: string; name: string; }
interface Location { id: string; name: string; }
interface Team { id: string; name: string; }
interface Role { id: string; name: string; }

const Notifications: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [editItem, setEditItem] = useState<Notification | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [type, setType] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();

    const { organization } = useAuthStore();
    const organizationId = organization?.id;

    useEffect(() => {
        const fetchRelatedData = async () => {
            if (!organizationId) return;
            const [usersData, locationsData, teamsData, rolesData] = await Promise.all([
                supabase.schema('identity').from('users').select('id, name').eq('organization_id', organizationId).eq('is_active', true),
                supabase.schema('identity').from('locations').select('id, name').eq('organization_id', organizationId),
                supabase.schema('identity').from('teams').select('id, name').eq('organization_id', organizationId),
                supabase.schema('identity').from('roles').select('id, name').eq('organization_id', organizationId),
            ]);
            setUsers(usersData.data as User[] || []);
            setLocations(locationsData.data as Location[] || []);
            setTeams(teamsData.data as Team[] || []);
            setRoles(rolesData.data as Role[] || []);
        };
        fetchRelatedData();
        fetchNotifications();
    }, [organizationId]);

    const fetchNotifications = async () => {
        if (!organizationId) return;
        const { data, error } = await supabase.from('notifications').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false });
        if (data) setNotifications(data as Notification[]);
        if (error) notification.error({ message: error.message || "Failed to fetch notifications" });
    };

    const handleAddOrEdit = async (values: any) => {
        const { type, start, expiry, ...rest } = values;
        const payload = {
            ...rest,
            type,
            start: dayjs(start).utc().startOf('day').toISOString(),
            expiry: dayjs(expiry).utc().endOf('day').toISOString(),
            users: type === 'users' ? values.users : null,
            locations: type === 'location' ? values.locations : null,
            teams: type === 'team' ? values.teams : null,
            roles: type === 'roles' ? values.roles : null,
            organization_id: organizationId,
        };

        try {
            if (editItem) {
                const { error } = await supabase.from('notifications').update(payload).eq('id', editItem.id);
                if (error) throw error;
                notification.success({ message: "Notification updated" });
            } else {
                const { error } = await supabase.from('notifications').insert([payload]);
                if (error) throw error;
                notification.success({ message: "Notification added" });
            }
            fetchNotifications();
            setIsDrawerOpen(false);
            setEditItem(null);
            form.resetFields();
        } catch (error: any) {
            notification.error({ message: error.message || "Operation failed" });
        }
    };

    const filteredNotifications = useMemo(() => {
        if (!searchText) return notifications;
        return notifications.filter(item => getAllValues(item).some(val => String(val).toLowerCase().includes(searchText.toLowerCase())));
    }, [notifications, searchText]);

    const columns = [
        { title: 'Title', dataIndex: 'title', key: 'title', sorter: (a: any, b: any) => (a.title || '').localeCompare(b.title || '') },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => camelCaseToTitleCase(t) },
        { 
            title: 'Actions', 
            key: 'actions', 
            render: (_: any, record: Notification) => (
                <div className="flex gap-2">
                    <Tooltip title="Edit">
                        <Button icon={<Edit2 size={14} />} onClick={() => {
                            setEditItem(record);
                            setType(record.type);
                            form.setFieldsValue({ ...record, start: dayjs(record.start), expiry: dayjs(record.expiry) });
                            setIsDrawerOpen(true);
                        }} />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button danger icon={<Trash2 size={14} />} onClick={() => {
                            confirm({
                                title: 'Delete notification?',
                                icon: <AlertCircle color="red" />,
                                onOk: async () => {
                                    await supabase.from('notifications').delete().eq('id', record.id);
                                    fetchNotifications();
                                }
                            });
                        }} />
                    </Tooltip>
                </div>
            )
        },
    ];

    return (
        <Card title={<div className="flex justify-between items-center w-full"><Typography.Title level={4} className="m-0">System Notifications</Typography.Title><Button type="primary" icon={<PlusOutlined />} onClick={() => {setIsDrawerOpen(true); form.resetFields(); setEditItem(null);}}>Add New</Button></div>}>
            <div className="mb-4">
                <Input placeholder="Search notifications..." prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 300 }} />
            </div>
            <Table dataSource={filteredNotifications} columns={columns} rowKey="id" />
            <Drawer title={editItem ? "Edit Notification" : "Add Notification"} open={isDrawerOpen} width={480} onClose={() => setIsDrawerOpen(false)} footer={null}>
                <Form form={form} layout="vertical" onFinish={handleAddOrEdit}>
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="message" label="Message" rules={[{ required: true }]}>
                        <Input.TextArea rows={4} />
                    </Form.Item>
                    <Form.Item name="type" label="Target Type" rules={[{ required: true }]}>
                        <Select onChange={setType}>
                            <Select.Option value="public">Public (All)</Select.Option>
                            <Select.Option value="users">Specific Users</Select.Option>
                            <Select.Option value="location">Locations</Select.Option>
                            <Select.Option value="team">Teams</Select.Option>
                            <Select.Option value="roles">Roles</Select.Option>
                        </Select>
                    </Form.Item>
                    <div className="flex gap-4">
                        <Form.Item name="start" label="Start Date" className="flex-1" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="expiry" label="Expiry Date" className="flex-1" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </div>

                    {type === 'users' && <Form.Item name="users" label="Users"><Select mode="multiple">{users.map(u => <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>)}</Select></Form.Item>}
                    {type === 'location' && <Form.Item name="locations" label="Locations"><Select mode="multiple">{locations.map(l => <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>)}</Select></Form.Item>}
                    {type === 'team' && <Form.Item name="teams" label="Teams"><Select mode="multiple">{teams.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}</Select></Form.Item>}
                    {type === 'roles' && <Form.Item name="roles" label="Roles"><Select mode="multiple">{roles.map(r => <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>)}</Select></Form.Item>}

                    <Button type="primary" htmlType="submit" className="w-full mt-4">Save Notification</Button>
                </Form>
            </Drawer>
        </Card>
    );
};

export default Notifications;
