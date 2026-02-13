import React, { useState } from 'react';
import {
    Table,
    Button,
    Drawer,
    Form,
    Input,
    Space,
    App,
    Popconfirm,
    Typography,
    Row,
    Col,
    Card,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CustomerSegment } from '../../types/ecom';
import { useResponsive } from '../../hooks/useResponsive';

// Helper function to generate UUID using native crypto API
const generateUUID = () => crypto.randomUUID();

const { TextArea } = Input;

const getTableName = () => 'wa_contact_segments';
const getSchemaName = () => 'identity';

interface CustomerSegmentsPageProps {
    selectedOrganization: string;
}

interface CustomerSegmentWithVersion extends CustomerSegment {
    version?: number;
}

const CustomerSegmentsPage: React.FC<CustomerSegmentsPageProps> = ({ selectedOrganization }) => {
    const { isMobile, drawerWidth } = useResponsive();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState<CustomerSegmentWithVersion | null>(null);
    const [form] = Form.useForm();

    const { data: customerSegments = [], isLoading } = useQuery<CustomerSegment[]>({
        queryKey: [getTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getSchemaName())
                .from(getTableName())
                .select('*')
                .eq('organization_id', selectedOrganization)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const createMutation = useMutation({
        mutationFn: async (newRecord: any) => {
            const { error } = await supabase.schema(getSchemaName()).from(getTableName()).insert([newRecord]);
            if (error) throw error;
        },
        onSuccess: () => {
            message.success('Customer segment created successfully');
            queryClient.invalidateQueries({ queryKey: [getTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error creating segment:', error);
            message.error('Failed to create segment');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (updatedRecord: any) => {
            const { error } = await supabase
                .schema(getSchemaName())
                .from(getTableName())
                .update(updatedRecord)
                .eq('id', updatedRecord.id);
            if (error) throw error;
        },
        onSuccess: () => {
            message.success('Customer segment updated successfully');
            queryClient.invalidateQueries({ queryKey: [getTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error updating segment:', error);
            message.error('Failed to update segment');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.schema(getSchemaName()).from(getTableName()).delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            message.success('Customer segment deleted successfully');
            queryClient.invalidateQueries({ queryKey: [getTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error deleting segment:', error);
            message.error('Failed to delete segment');
        },
    });

    const handleCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        setDrawerVisible(true);
    };

    const handleEdit = (record: CustomerSegment) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setDrawerVisible(true);
    };

    const handleDelete = (record: CustomerSegment) => {
        deleteMutation.mutate(record.id);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const now = new Date().toISOString();

            const baseRecord = {
                ...values,
                organization_id: selectedOrganization,
                updated_at: now,
                version: editingRecord ? (editingRecord.version || 1) + 1 : 1,
            };

            if (editingRecord) {
                baseRecord.id = editingRecord.id;
                updateMutation.mutate(baseRecord);
            } else {
                const newRecord = {
                    id: generateUUID(),
                    ...baseRecord,
                    created_at: now,
                };
                createMutation.mutate(newRecord);
            }

            setDrawerVisible(false);
            form.resetFields();
        } catch (error) {
            console.error('Form validation error:', error);
        }
    };

    const columns = [
        { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
        { title: 'Short Code', dataIndex: 'short_code', key: 'short_code', width: 120 },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 150,
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            fixed: 'right' as const,
            render: (record: CustomerSegment) => (
                <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm
                        title="Are you sure you want to delete this segment?"
                        onConfirm={() => handleDelete(record)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="link" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreate}
                    disabled={!selectedOrganization}
                >
                    Add Segment
                </Button>
            </div>

            {isMobile ? (
                <div className="flex flex-col gap-3">
                    {customerSegments.map((segment) => (
                        <Card key={segment.id} size="small">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ flex: 1 }}>
                                    <Typography.Text strong>{segment.name}</Typography.Text>
                                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                        {segment.short_code}
                                    </Typography.Text>
                                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                        Created: {new Date(segment.created_at).toLocaleDateString()}
                                    </Typography.Text>
                                </div>
                                <Space>
                                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(segment)} className="btn-touch" />
                                    <Popconfirm
                                        title="Delete this segment?"
                                        onConfirm={() => handleDelete(segment)}
                                    >
                                        <Button type="text" danger icon={<DeleteOutlined />} className="btn-touch" />
                                    </Popconfirm>
                                </Space>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Table
                    columns={columns}
                    dataSource={customerSegments}
                    rowKey="id"
                    loading={isLoading}
                    scroll={{ x: 'max-content' }}
                    pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                        responsive: true,
                    }}
                />
            )}

            <Drawer
                title={`${editingRecord ? 'Edit' : 'Create'} Customer Segment`}
                open={drawerVisible}
                onClose={() => {
                    setDrawerVisible(false);
                    form.resetFields();
                }}
                width={drawerWidth}
                footer={
                    <Space className={isMobile ? 'w-full' : ''} style={isMobile ? { display: 'flex' } : {}}>
                        <Button
                            onClick={() => {
                                setDrawerVisible(false);
                                form.resetFields();
                            }}
                            className={isMobile ? 'flex-1' : ''}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleSave}
                            loading={createMutation.isPending || updateMutation.isPending}
                            className={isMobile ? 'flex-1' : ''}
                        >
                            {editingRecord ? 'Update' : 'Create'}
                        </Button>
                    </Space>
                }
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="name"
                                label="Name"
                                rules={[{ required: true, message: 'Please enter segment name' }]}
                            >
                                <Input className="input-mobile" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="short_code"
                                label="Short Code"
                                rules={[{ required: true, message: 'Please enter short code' }]}
                            >
                                <Input className="input-mobile" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={3} className="input-mobile" />
                    </Form.Item>
                </Form>
            </Drawer>
        </>
    );
};

export default CustomerSegmentsPage;
