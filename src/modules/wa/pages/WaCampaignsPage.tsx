import React, { useState } from 'react';
import {
    Button, Table, Tag, Typography,
    Card, Space, Modal, Form, Input,
    Select, DatePicker, App, Popconfirm, theme, Empty
} from 'antd';
import {
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    RocketOutlined,
    TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSetPageHeader } from '../contexts/PageHeaderContext';
import { useWaCampaigns, useCreateWaCampaign, useDeleteWaCampaign, WaCampaign } from '../hooks/useWaCampaigns';
import { useMetaTemplates } from '../hooks/useMetaTemplates';

const { Title, Text } = Typography;

const WaCampaignsPage: React.FC = () => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    // Data Hooks
    const { data: campaigns = [], isLoading } = useWaCampaigns();
    const { data: templates = [] } = useMetaTemplates();
    const createCampaign = useCreateWaCampaign();
    const deleteCampaign = useDeleteWaCampaign();

    // Set Header
    useSetPageHeader({
        title: 'Broadcast Campaigns',
        subtitle: 'Send one-time messages to your audience',
        actions: (
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalOpen(true)}
            >
                Create Campaign
            </Button>
        )
    }, []);

    // Handlers
    const handleCreate = async (values: any) => {
        try {
            const template = templates.find((t: any) => t.id === values.template_id);

            await createCampaign.mutateAsync({
                name: values.name,
                template_id: values.template_id,
                template_name: template?.name,
                segment_id: values.segment_id, // Mock ID for now if no segments
                scheduled_at: values.scheduled_at ? values.scheduled_at.toISOString() : null,
                status: values.scheduled_at ? 'scheduled' : 'draft'
            });

            message.success('Campaign created successfully');
            setIsModalOpen(false);
            form.resetFields();
        } catch (error) {
            message.error('Failed to create campaign');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCampaign.mutateAsync(id);
            message.success('Campaign deleted');
        } catch (error) {
            message.error('Failed to delete campaign');
        }
    };

    // Columns
    const columns = [
        {
            title: 'Campaign Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, string> = {
                    draft: 'default',
                    scheduled: 'processing',
                    processing: 'warning',
                    completed: 'success',
                    failed: 'error',
                    cancelled: 'default'
                };
                return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Audience',
            dataIndex: 'segment_id',
            key: 'segment_id',
            render: (_: any) => (
                <Space>
                    <TeamOutlined style={{ color: token.colorTextSecondary }} />
                    <Text type="secondary">All Contacts</Text> {/* Placeholder until Segments integrated */}
                </Space>
            )
        },
        {
            title: 'Schedule',
            dataIndex: 'scheduled_at',
            key: 'scheduled_at',
            render: (date: string) => date ? dayjs(date).format('MMM D, h:mm A') : <Text type="secondary">Immediate</Text>
        },
        {
            title: 'Performance',
            key: 'stats',
            render: (_: any, record: WaCampaign) => {
                if (record.status === 'draft') return <Text type="secondary">-</Text>;
                return (
                    <Space size="small">
                        <Tag color="blue">{record.stats?.sent || 0} Sent</Tag>
                        <Tag color="green">{record.stats?.read || 0} Read</Tag>
                    </Space>
                );
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: WaCampaign) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        disabled={record.status !== 'draft'}
                    />
                    <Popconfirm
                        title="Delete Campaign?"
                        onConfirm={() => handleDelete(record.id)}
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* Stats Overview (Mock for now) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <Card size="small">
                    <Text type="secondary">Total Campaigns</Text>
                    <Title level={3} style={{ margin: 0 }}>{campaigns.length}</Title>
                </Card>
                <Card size="small">
                    <Text type="secondary">Messages Sent</Text>
                    <Title level={3} style={{ margin: 0 }}>
                        {campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0)}
                    </Title>
                </Card>
                <Card size="small">
                    <Text type="secondary">Avg. Read Rate</Text>
                    <Title level={3} style={{ margin: 0 }}>-</Title>
                </Card>
                <Card size="small">
                    <Text type="secondary">Replied</Text>
                    <Title level={3} style={{ margin: 0 }}>-</Title>
                </Card>
            </div>

            {/* Campaign Table */}
            <Card styles={{ body: { padding: 0 } }}>
                <Table
                    dataSource={campaigns}
                    columns={columns}
                    rowKey="id"
                    loading={isLoading}
                    locale={{ emptyText: <Empty description="No campaigns found" /> }}
                />
            </Card>

            {/* Create Modal */}
            <Modal
                title="Create Broadcast Campaign"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreate}
                >
                    <Form.Item
                        name="name"
                        label="Campaign Name"
                        rules={[{ required: true, message: 'Please enter a name' }]}
                    >
                        <Input placeholder="e.g. Summer Sale Announcement" />
                    </Form.Item>

                    <Form.Item
                        name="template_id"
                        label="Message Template"
                        rules={[{ required: true, message: 'Please select a template' }]}
                    >
                        <Select
                            placeholder="Select a WhatsApp template"
                            options={templates.map((t: any) => ({ label: t.name, value: t.id }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="segment_id"
                        label="Target Audience"
                    >
                        <Select
                            placeholder="Select Audience"
                            disabled // Disabled until Segments are fully integrated
                            defaultValue="all"
                            options={[{ label: 'All Contacts', value: 'all' }]}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Currently defaults to "All Contacts" (Mock)
                        </Text>
                    </Form.Item>

                    <Form.Item
                        name="scheduled_at"
                        label="Schedule Send (Optional)"
                    >
                        <DatePicker showTime style={{ width: '100%' }} placeholder="Send Immediately" />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                        <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit" icon={<RocketOutlined />}>
                            Create & Schedule
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default WaCampaignsPage;
