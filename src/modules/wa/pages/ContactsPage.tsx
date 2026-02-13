import React, { useState } from 'react';
import { Table, Button, Input, Space, Modal, Form, Tag, Typography, Card, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, ImportOutlined, ExportOutlined, MoreOutlined } from '@ant-design/icons';
import { useWaContacts, useCreateContact, useUpdateContact, useDeleteContact } from '../hooks';
import { useResponsive } from '../hooks/useResponsive';
import { ActionBar } from '../components/common/ActionBar';
import dayjs from 'dayjs';

const { Text } = Typography;

const ContactsPage: React.FC = () => {
    const { isMobile } = useResponsive();
    const [searchText, setSearchText] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<any>(null);
    const [form] = Form.useForm();

    const { data: contacts, isLoading } = useWaContacts();
    const createContact = useCreateContact();
    const updateContact = useUpdateContact();
    const deleteContact = useDeleteContact();

    const handleAdd = () => {
        setEditingContact(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record: any) => {
        setEditingContact(record);
        form.setFieldsValue({
            name: record.name,
            wa_id: record.wa_id,
            tags: record.tags,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        await deleteContact.mutateAsync(id);
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingContact) {
                await updateContact.mutateAsync({ ...values, id: editingContact.id });
            } else {
                await createContact.mutateAsync(values);
            }
            setIsModalOpen(false);
            form.resetFields();
        } catch (e) {
            // Form validation failed
        }
    };

    const filteredContacts = contacts?.filter((c: any) =>
        c.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        c.wa_id?.includes(searchText)
    );

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => (
                <Space>
                    <UserOutlined />
                    {text || 'Unknown'}
                </Space>
            ),
        },
        {
            title: 'WhatsApp ID (Phone)',
            dataIndex: 'wa_id',
            key: 'wa_id',
        },
        {
            title: 'Tags',
            dataIndex: 'tags',
            key: 'tags',
            render: (tags: string[]) => (
                <>
                    {tags?.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
                <Dropdown
                    menu={{
                        items: [
                            { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(record) },
                            { type: 'divider' },
                            { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record.id) },
                        ],
                    }}
                    trigger={['click']}
                >
                    <Button type="text" icon={<MoreOutlined />} size="small" />
                </Dropdown>
            ),
        },
    ];

    // No page header setup needed - handled by authed layout

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Action Bar */}
            <ActionBar
                search={{
                    placeholder: 'Search contacts...',
                    value: searchText,
                    onChange: setSearchText,
                }}
                primaryAction={{
                    label: 'Add Contact',
                    icon: <PlusOutlined />,
                    onClick: handleAdd,
                }}
                secondaryActions={[
                    {
                        key: 'import',
                        label: 'Import Contacts',
                        icon: <ImportOutlined />,
                        onClick: () => console.log('Import'),
                    },
                    {
                        key: 'export',
                        label: 'Export Contacts',
                        icon: <ExportOutlined />,
                        onClick: () => console.log('Export'),
                    },
                ]}
            />

            {/* Content */}
            <div style={{ padding: isMobile ? 12 : 24, flex: 1, overflow: 'auto' }}>
                {isMobile ? (
                    /* Mobile: Card View - Consistent pattern */
                    <div className="flex flex-col gap-3">
                        {filteredContacts?.map(contact => (
                            <Card
                                key={contact.id}
                                size="small"
                                styles={{ body: { padding: 12 } }}
                            >
                                {/* Header: Name + More */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <UserOutlined style={{ fontSize: 20, color: '#666' }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {contact.name || 'Unknown'}
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{contact.wa_id}</Text>
                                    </div>
                                    <Dropdown
                                        menu={{
                                            items: [
                                                { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(contact) },
                                                { type: 'divider' },
                                                { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(contact.id) },
                                            ],
                                        }}
                                        trigger={['click']}
                                    >
                                        <Button type="text" icon={<MoreOutlined />} size="small" />
                                    </Dropdown>
                                </div>
                                {/* Tags and metadata */}
                                {contact.tags?.length > 0 && (
                                    <Space size={4} wrap style={{ marginBottom: 4 }}>
                                        {contact.tags.map((tag: string) => (
                                            <Tag key={tag} style={{ margin: 0, fontSize: 11 }}>{tag}</Tag>
                                        ))}
                                    </Space>
                                )}
                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                    Created: {dayjs(contact.created_at).format('YYYY-MM-DD HH:mm')}
                                </Text>
                            </Card>
                        ))}
                    </div>
                ) : (
                    /* Desktop: Table View */
                    <Table
                        columns={columns}
                        dataSource={filteredContacts}
                        rowKey="id"
                        loading={isLoading}
                        pagination={{ pageSize: 10 }}
                    />
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                title={editingContact ? "Edit Contact" : "Add Contact"}
                open={isModalOpen}
                onOk={handleOk}
                onCancel={() => setIsModalOpen(false)}
                confirmLoading={createContact.isPending || updateContact.isPending}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Please enter a name' }]}
                    >
                        <Input placeholder="John Doe" className="input-mobile" />
                    </Form.Item>
                    <Form.Item
                        name="wa_id"
                        label="WhatsApp ID (Phone)"
                        rules={[{ required: true, message: 'Please enter phone number' }]}
                    >
                        <Input placeholder="1234567890" disabled={!!editingContact} className="input-mobile" />
                    </Form.Item>
                    <Form.Item
                        name="tags"
                        label="Tags"
                    >
                        <Input placeholder="vip, lead (comma separated)" className="input-mobile" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ContactsPage;
