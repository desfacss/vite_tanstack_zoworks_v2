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
import { Location } from '../../types/ecom';
import { useResponsive } from '../../hooks/useResponsive';

// Helper function to generate UUID using native crypto API
const generateUUID = () => crypto.randomUUID();

const getTableName = () => 'locations';
const getSchemaName = () => 'identity';

interface LocationsPageProps {
    selectedOrganization: string;
}

interface LocationWithVersion extends Location {
    version?: number;
}

const LocationsPage: React.FC<LocationsPageProps> = ({ selectedOrganization }) => {
    const { isMobile, drawerWidth } = useResponsive();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState<LocationWithVersion | null>(null);
    const [form] = Form.useForm();

    const { data: locations = [], isLoading } = useQuery<Location[]>({
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
            message.success('Location created successfully');
            queryClient.invalidateQueries({ queryKey: [getTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error creating location:', error);
            message.error('Failed to create location');
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
            message.success('Location updated successfully');
            queryClient.invalidateQueries({ queryKey: [getTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error updating location:', error);
            message.error('Failed to update location');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.schema(getSchemaName()).from(getTableName()).delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            message.success('Location deleted successfully');
            queryClient.invalidateQueries({ queryKey: [getTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error deleting location:', error);
            message.error('Failed to delete location');
        },
    });

    const handleCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        setDrawerVisible(true);
    };

    const handleEdit = (record: Location) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setDrawerVisible(true);
    };

    const handleDelete = (record: Location) => {
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
            render: (record: Location) => (
                <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm
                        title="Are you sure you want to delete this location?"
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
                    Add Location
                </Button>
            </div>

            {isMobile ? (
                <div className="flex flex-col gap-3">
                    {locations.map((location) => (
                        <Card key={location.id} size="small">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ flex: 1 }}>
                                    <Typography.Text strong>{location.name}</Typography.Text>
                                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                        {location.short_code}
                                    </Typography.Text>
                                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                        Created: {new Date(location.created_at).toLocaleDateString()}
                                    </Typography.Text>
                                </div>
                                <Space>
                                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(location)} className="btn-touch" />
                                    <Popconfirm
                                        title="Delete this location?"
                                        onConfirm={() => handleDelete(location)}
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
                    dataSource={locations}
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
                title={`${editingRecord ? 'Edit' : 'Create'} Location`}
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
                                rules={[{ required: true, message: 'Please enter location name' }]}
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
                </Form>
            </Drawer>
        </>
    );
};

export default LocationsPage;
