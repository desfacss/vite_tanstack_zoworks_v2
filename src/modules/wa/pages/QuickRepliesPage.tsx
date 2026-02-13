import React, { useState } from 'react';
import { Card, Button, Typography, Space, Modal, Form, Input, Select, Tag, Empty, message, Mentions, Dropdown } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    CopyOutlined,
    ThunderboltOutlined,
    QuestionCircleOutlined,
    MoreOutlined,
} from '@ant-design/icons';
import { useQuickReplies, useCreateQuickReply, useUpdateQuickReply, useDeleteQuickReply } from '../hooks';
import type { QuickReply } from '../types';
import { useQuery } from '@tanstack/react-query';
import { supabase, getOrganizationId } from '@/lib/supabase';
import { useResponsive } from '../hooks';
import { useSetPageHeader } from '../contexts/PageHeaderContext';
import { ActionBar } from '../components/common/ActionBar';
import { usePageTour } from '../help';
import { libraryTour } from '../help/tours';

const { Text, Paragraph } = Typography;
const { Option } = Select;

const QuickRepliesPage: React.FC = () => {
    const { isMobile } = useResponsive();
    const { data: quickReplies = [], isLoading } = useQuickReplies();
    const createQuickReply = useCreateQuickReply();
    const updateQuickReply = useUpdateQuickReply();
    const deleteQuickReply = useDeleteQuickReply();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [form] = Form.useForm();

    // Set page header
    useSetPageHeader({
        title: 'Quick Replies',
    }, []);

    // Register help tour
    const { startTour: startQuickRepliesTour } = usePageTour(libraryTour);

    // Filter quick replies based on search
    const filterBySearch = (items: QuickReply[]) => {
        if (!searchTerm.trim()) return items;
        const lowerSearch = searchTerm.toLowerCase();
        return items.filter((r) =>
            r.title?.toLowerCase().includes(lowerSearch) ||
            r.shortcut?.toLowerCase().includes(lowerSearch) ||
            r.content?.toLowerCase().includes(lowerSearch) ||
            r.category?.toLowerCase().includes(lowerSearch)
        );
    };

    // Fetch Variables
    const { data: variables } = useQuery({
        queryKey: ['variables'],
        queryFn: async () => {
            const organizationId = await getOrganizationId();
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_variable_definitions')
                .select('*')
                .eq('organization_id', organizationId)
                .order('name', { ascending: true });

            if (error) throw error;
            return data;
        }
    });

    const categories = ['General', 'Sales', 'Support', 'Follow-up'];

    const handleSave = () => {
        form.validateFields().then((values) => {
            // Clean content
            const cleanedContent = (values.content || '').replace(/@\{\{/g, '{{').replace(/\{\{\{\{/g, '{{');

            const payload = {
                ...values,
                content: cleanedContent
            };

            if (editingReply) {
                updateQuickReply.mutate({ id: editingReply.id, ...payload }, {
                    onSuccess: () => {
                        setShowCreateModal(false);
                        setEditingReply(null);
                        form.resetFields();
                    }
                });
            } else {
                createQuickReply.mutate(payload, {
                    onSuccess: () => {
                        setShowCreateModal(false);
                        setEditingReply(null);
                        form.resetFields();
                    }
                });
            }
        });
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Delete Quick Reply',
            content: 'Are you sure you want to delete this quick reply?',
            onOk: () => deleteQuickReply.mutate(id)
        });
    };

    const handleEdit = (reply: QuickReply) => {
        setEditingReply(reply);
        form.setFieldsValue(reply);
        setShowCreateModal(true);
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        message.success('Copied to clipboard!');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Action Bar with search */}
            <ActionBar
                search={{
                    placeholder: 'Search quick replies...',
                    value: searchTerm,
                    onChange: setSearchTerm,
                }}
                primaryAction={{
                    label: 'Create Quick Reply',
                    icon: <PlusOutlined />,
                    onClick: () => setShowCreateModal(true),
                }}
                secondaryActions={[
                    {
                        key: 'help',
                        label: 'Show Help Tour',
                        icon: <QuestionCircleOutlined />,
                        onClick: startQuickRepliesTour,
                    },
                ]}
            />

            {/* Content */}
            <div style={{ padding: isMobile ? 12 : 24, flex: 1, overflow: 'auto' }}>
                {isLoading ? (
                    <Card loading className="section-spacing" />
                ) : filterBySearch(quickReplies).length === 0 ? (
                    <Empty
                        image={<ThunderboltOutlined className="text-6xl text-gray-300" />}
                        description={searchTerm ? 'No matching quick replies' : 'No quick replies yet'}
                        className="mt-8"
                    >
                        {!searchTerm && (
                            <Button type="primary" onClick={() => setShowCreateModal(true)}>
                                Create Your First Quick Reply
                            </Button>
                        )}
                    </Empty>
                ) : (
                    <div
                        style={isMobile ? undefined : {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: 12
                        }}
                        className={isMobile ? 'flex flex-col gap-3' : ''}
                    >
                        {filterBySearch(quickReplies).map((reply) => (
                            <Card
                                key={reply.id}
                                size="small"
                                styles={{ body: { padding: 12 } }}
                            >
                                {/* Header: Title + Shortcut + Category + More */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {reply.title}
                                        </div>
                                        <Space size={4} style={{ marginTop: 4 }}>
                                            <Tag color="default" style={{ margin: 0, fontSize: 11 }}>{reply.category}</Tag>
                                            {reply.shortcut && (
                                                <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{reply.shortcut}</Tag>
                                            )}
                                        </Space>
                                    </div>
                                    <Dropdown
                                        menu={{
                                            items: [
                                                { key: 'copy', label: 'Copy', icon: <CopyOutlined />, onClick: () => handleCopy(reply.content) },
                                                { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(reply) },
                                                { type: 'divider' },
                                                { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(reply.id) },
                                            ],
                                        }}
                                        trigger={['click']}
                                    >
                                        <Button type="text" icon={<MoreOutlined />} size="small" />
                                    </Dropdown>
                                </div>
                                {/* Content Preview */}
                                <Paragraph
                                    style={{
                                        marginBottom: 0,
                                        fontSize: 12,
                                        color: '#666',
                                        lineHeight: 1.4
                                    }}
                                    ellipsis={{ rows: 2 }}
                                >
                                    {reply.content}
                                </Paragraph>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                <Modal
                    title={editingReply ? 'Edit Quick Reply' : 'Create Quick Reply'}
                    open={showCreateModal}
                    onOk={handleSave}
                    onCancel={() => {
                        setShowCreateModal(false);
                        setEditingReply(null);
                        form.resetFields();
                    }}
                    okText={editingReply ? 'Update' : 'Create'}
                    width={isMobile ? '95%' : 500}
                >
                    <Form form={form} layout="vertical">
                        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                            <Input placeholder="e.g., Greeting" className="input-mobile" />
                        </Form.Item>
                        <Form.Item name="shortcut" label="Shortcut (optional)">
                            <Input placeholder="e.g., /hi" prefix="/" className="input-mobile" />
                        </Form.Item>
                        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                            <Select placeholder="Select category">
                                {categories.map((cat) => (
                                    <Option key={cat} value={cat}>{cat}</Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item name="media_type" label="Media Type" initialValue="none">
                            <Select>
                                <Option value="none">Text Only</Option>
                                <Option value="image">Image</Option>
                                <Option value="video">Video</Option>
                                <Option value="document">Document</Option>
                                <Option value="audio">Audio</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            noStyle
                            shouldUpdate={(prev, curr) => prev.media_type !== curr.media_type}
                        >
                            {({ getFieldValue }) =>
                                getFieldValue('media_type') !== 'none' ? (
                                    <Form.Item name="media_url" label="Media URL" rules={[{ required: true }]}>
                                        <Input placeholder="https://example.com/image.png" className="input-mobile" />
                                    </Form.Item>
                                ) : null
                            }
                        </Form.Item>

                        <Form.Item name="content" label="Content" rules={[{ required: true }]}>
                            <Mentions
                                rows={4}
                                placeholder="Type your quick reply message... Use @ for variables."
                                prefix={['@', '{{']}
                                options={variables?.map((v: any) => ({
                                    value: v.variable_syntax,
                                    label: v.name,
                                }))}
                                className="input-mobile"
                            />
                        </Form.Item>
                        <Text type="secondary" className="text-xs">
                            Tip: Use @ to insert variables like contact name or company.
                        </Text>
                    </Form>
                </Modal>
            </div>
        </div >
    );
};

export default QuickRepliesPage;
