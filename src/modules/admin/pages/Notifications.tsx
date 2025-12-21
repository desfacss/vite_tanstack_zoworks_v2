import { Button, Card, notification, Table, Drawer, Form, Input, Select, DatePicker, Modal, Tooltip, Typography } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PlusOutlined, EditFilled, DeleteOutlined, ExclamationCircleFilled, SearchOutlined } from "@ant-design/icons";
import { supabase } from '@/lib/supabase';
import { useAuthStore } from "@/core/lib/store";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { camelCaseToTitleCase } from "@/core/components/common/utils/casing";
import { Edit2, Trash2 } from "lucide-react";

const getAllValues = (obj) => {
    let values = [];
    for (let key in obj) {
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

// Enable the UTC plugin
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

interface User {
    id: string;
    name: string;
}

interface Location {
    id: string;
    name: string;
}

interface Team {
    id: string;
    name: string;
}

interface Role {
    id: string;
    name: string;
}

const Notifications: React.FC = () => {
    const componentRef = useRef(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [editItem, setEditItem] = useState<Notification | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [type, setType] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [searchText, setSearchText] = useState('');

    const dateFormat = 'YYYY/MM/DD';

    const { organization } = useAuthStore();
    const organizationId = organization?.id;

    const filteredNotifications = useMemo(() => {
        if (!searchText) return notifications;
        return notifications?.filter((item) => {
            return getAllValues(item).some((value) =>
                String(value).toLowerCase().includes(searchText?.toLowerCase())
            );
        });
    }, [notifications, searchText]);

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
    }, [organizationId]);


    useEffect(() => {
        fetchNotifications();
    }, [organizationId]);

    const fetchNotifications = async () => {
        if (!organizationId) return;
        const { data, error } = await supabase.from('notifications').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false });
        if (data) {
            setNotifications(data as Notification[]);
        }
        if (error) {
            notification.error({ message: error?.message || "Failed to fetch notifications" });
        }
    };

    const [form] = Form.useForm();

    const handleAddOrEdit = async (values: any) => {
        const { type, start, expiry, ...rest } = values;

        // Ensure dates are correctly formatted to ISO strings
        const startDay = dayjs(start).utc().startOf('day').toISOString();
        const expiryDay = dayjs(expiry).utc().endOf('day').toISOString();

        const payload: Partial<Omit<Notification, 'id' | 'updated_at'>> = {
            ...rest,
            type,
            start: startDay,
            expiry: expiryDay,
            users: type === 'users' ? values.users : null,
            locations: type === 'location' ? values.locations : null,
            teams: type === 'team' ? values.teams : null,
            roles: type === 'roles' ? values.roles : null,
            organization_id: organizationId,
        };

        try {
            let response;
            if (editItem) {
                response = await supabase.from('notifications').update(payload).eq('id', editItem.id);
                if (response.error) throw new Error("Failed to update notification");
                notification.success({ message: "Notification updated successfully" });
            } else {
                response = await supabase.from('notifications').insert([payload]);
                if (response.error) throw new Error("Failed to add notification");
                notification.success({ message: "Notification added successfully" });
            }
            fetchNotifications();
            form.resetFields();
            setIsDrawerOpen(false);
            setEditItem(null);
        } catch (error: any) {
            notification.error({ message: error.message || "An error occurred" });
        }
    };

    const handleEdit = (record: Notification) => {
        setEditItem(record);
        setType(record.type);
        form.setFieldsValue({
            ...record,
            start: dayjs(record.start),
            expiry: dayjs(record.expiry),
        });
        setIsDrawerOpen(true);
    };

    const showDeleteConfirm = (record: Notification) => {
        confirm({
            title: `Confirm deletion of Notification - ${record?.title} ?`,
            icon: <ExclamationCircleFilled />,
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                const { error } = await supabase.from('notifications').delete().eq('id', record?.id);
                if (!error) {
                    notification.success({ message: "Notification deleted successfully" });
                    fetchNotifications();
                } else {
                    notification.error({ message: error?.message || "Failed to delete Notification" });
                }
            },
        });
    };

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            sorter: (a: Notification, b: Notification) => a?.title?.localeCompare(b?.title)
        },
        {
            title: 'Message',
            dataIndex: 'message',
            key: 'message',
            sorter: (a: Notification, b: Notification) => a?.message?.localeCompare(b?.message)
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            sorter: (a: Notification, b: Notification) => a?.type?.localeCompare(b?.type),
            render: (text: string) => camelCaseToTitleCase(text)
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Notification) => (
                <div className="d-flex">
                    <Tooltip title="Edit">
                        <Button icon={<Edit2 size={16} />}
                            className="mr-2" onClick={() => handleEdit(record)} />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button icon={<Trash2 size={16} />} danger
                            onClick={() => showDeleteConfirm(record)} />
                    </Tooltip>
                </div>
            ),
        },
    ];

    return (
        <Card styles={{ body: { padding: "20px" } }}>
            <div className="d-flex justify-content-between align-items-center flex justify-between items-center" style={{ marginBottom: "10px" }}>
                <Typography.Title level={4} className="m-0">Notifications</Typography.Title>
                <div>
                    <Input className="mr-2" placeholder="Search" value={searchText} onChange={(e) => setSearchText(e.target.value)} prefix={<SearchOutlined />} style={{ width: 200 }} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setIsDrawerOpen(true); form.resetFields(); setEditItem(null); setType(null); }} >
                        Add Notification
                    </Button>
                </div>
            </div>
            <div className="table-responsive" ref={componentRef}>
                <Table<Notification> columns={columns} dataSource={filteredNotifications}
                    rowKey={(record) => record.id} loading={!filteredNotifications} pagination={true} />
            </div>
            <Drawer footer={null} width={500} title={editItem ? "Edit Notification" : "Add Notification"}
                open={isDrawerOpen} maskClosable={false}
                onClose={() => { setIsDrawerOpen(false); setEditItem(null); setType(null); }} >
                <Form form={form} layout="vertical" onFinish={handleAddOrEdit}>
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter the Title' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="message" label="Message" rules={[{ required: true, message: 'Please enter the Message' }]}>
                        <Input.TextArea rows={4} />
                    </Form.Item>
                    <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Please select the Type' }]}>
                        <Select onChange={(value) => setType(value)}>
                            <Select.Option value="public">Public</Select.Option>
                            <Select.Option value="users">Users</Select.Option>
                            <Select.Option value="location">Location</Select.Option>
                            <Select.Option value="team">Team</Select.Option>
                            <Select.Option value="roles">Roles</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="start" label="Start" rules={[{ required: true, message: 'Please select the Start date' }]}>
                        <DatePicker size={'small'} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="expiry" label="Expiry" format={dateFormat} rules={[{ required: true, message: 'Please select the Expiry date' }]}>
                        <DatePicker size={'small'} style={{ width: '100%' }} />
                    </Form.Item>

                    {type === 'users' && (
                        <Form.Item name="users" label="Select Users" rules={[{ required: true, message: 'Please select Users' }]}>
                            <Select mode="multiple" placeholder="Select users">
                                {users?.map((user) => (
                                    <Select.Option key={user?.id} value={user?.id}>
                                        {user?.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    {type === 'location' && (
                        <Form.Item name="locations" label="Select Locations" rules={[{ required: true, message: 'Please select Locations' }]}>
                            <Select mode="multiple" placeholder="Select locations">
                                {locations?.map((location) => (
                                    <Select.Option key={location?.id} value={location?.id}>
                                        {location?.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    {type === 'team' && (
                        <Form.Item name="teams" label="Select Teams" rules={[{ required: true, message: 'Please select Teams' }]}>
                            <Select mode="multiple" placeholder="Select teams">
                                {teams?.map((team) => (
                                    <Select.Option key={team?.id} value={team?.id}>
                                        {team?.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    {type === 'roles' && (
                        <Form.Item name="roles" label="Select Roles" rules={[{ required: true, message: 'Please select Roles' }]}>
                            <Select mode="multiple" placeholder="Select roles">
                                {roles?.map((role) => (
                                    <Select.Option key={role?.id} value={role?.id}>
                                        {role?.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Submit
                        </Button>
                    </Form.Item>
                    {form.getFieldValue('start') && form.getFieldValue('expiry') && (
                        <div style={{ marginTop: 16, padding: 12, border: '1px solid #f0f0f0', borderRadius: 4, backgroundColor: '#fafafa' }}>
                            <p>
                                {`This notice will display from ${dayjs(form.getFieldValue('start')).format('MMMM D, YYYY, h:mm A')} to `}
                                {` ${dayjs(form.getFieldValue('expiry')).hour(23).minute(59).format('MMMM D, YYYY, h:mm A')} (UTC Time)`}
                            </p>
                        </div>
                    )}
                </Form>
            </Drawer>
        </Card>
    );
};

export default Notifications;