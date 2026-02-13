import React, { useState } from 'react';
import {
    Table,
    Button,
    Drawer,
    Form,
    Input,
    Select,
    Switch,
    InputNumber,
    Space,
    App,
    Popconfirm,
    Typography,
    Tag,
    Row,
    Col,
    Divider,
    Card,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Discount, DiscountRule, Offering, CustomerSegment, Location } from '../../types/ecom';
import DiscountRuleItem from './DiscountRuleItem';
import { useResponsive } from '../../hooks/useResponsive';

// Helper function to generate UUID using native crypto API
const generateUUID = () => crypto.randomUUID();

const { Title } = Typography;
const { Option } = Select;

const getDiscountTableName = () => 'discounts';
const getRulesTableName = () => 'discount_rules';
const getCatalogSchemaName = () => 'catalog';
const getIdentitySchemaName = () => 'identity';

interface DiscountManagerPageProps {
    selectedOrganization: string;
}

interface DiscountWithRules extends Discount {
    rules?: DiscountRule[];
}

const DiscountManagerPage: React.FC<DiscountManagerPageProps> = ({ selectedOrganization }) => {
    const { isMobile, drawerWidth } = useResponsive();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState<DiscountWithRules | null>(null);
    const [form] = Form.useForm();

    const { data: discounts = [], isLoading } = useQuery<DiscountWithRules[]>({
        queryKey: [getDiscountTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getDiscountTableName())
                .select(`*, rules:discount_rules(*)`)
                .eq('organization_id', selectedOrganization)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const { data: offerings = [] } = useQuery<Offering[]>({
        queryKey: ['offerings', selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getCatalogSchemaName())
                .from('offerings')
                .select('*')
                .eq('organization_id', selectedOrganization);
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const { data: customerSegments = [] } = useQuery<CustomerSegment[]>({
        queryKey: ['wa_contact_segments', selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getIdentitySchemaName())
                .from('wa_contact_segments')
                .select('*')
                .eq('organization_id', selectedOrganization);
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: ['locations', selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getIdentitySchemaName())
                .from('locations')
                .select('*')
                .eq('organization_id', selectedOrganization);
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const upsertDiscountMutation = useMutation({
        mutationFn: async ({ discount, rules }: { discount: any; rules: any[] }) => {
            const { data: updatedDiscount, error: discountError } = await supabase
                .schema(getCatalogSchemaName())
                .from(getDiscountTableName())
                .upsert(discount)
                .select()
                .single();
            if (discountError) throw discountError;

            const discountId = updatedDiscount.id;

            const rulesWithDiscountId = rules.map(r => ({
                ...r,
                id: r.id || generateUUID(),
                discount_id: discountId,
                organization_id: selectedOrganization,
            }));
            const { error: rulesError } = await supabase
                .schema(getCatalogSchemaName())
                .from(getRulesTableName())
                .upsert(rulesWithDiscountId);
            if (rulesError) throw rulesError;

            return updatedDiscount;
        },
        onSuccess: () => {
            message.success('Discount saved successfully');
            queryClient.invalidateQueries({ queryKey: [getDiscountTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error saving discount:', error);
            message.error('Failed to save discount');
        },
    });

    const deleteDiscountMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.schema(getCatalogSchemaName()).from(getDiscountTableName()).delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            message.success('Discount deleted successfully');
            queryClient.invalidateQueries({ queryKey: [getDiscountTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error deleting discount:', error);
            message.error('Failed to delete discount');
        },
    });

    const handleCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        setDrawerVisible(true);
    };

    const handleEdit = (record: DiscountWithRules) => {
        setEditingRecord(record);
        form.setFieldsValue({
            ...record,
            rules: record.rules || [],
        });
        setDrawerVisible(true);
    };

    const handleDelete = (record: Discount) => {
        deleteDiscountMutation.mutate(record.id);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const now = new Date().toISOString();
            const { rules, ...discountValues } = values;

            const baseDiscount = {
                ...discountValues,
                organization_id: selectedOrganization,
                updated_at: now,
                id: editingRecord ? editingRecord.id : generateUUID(),
            };

            upsertDiscountMutation.mutate({
                discount: baseDiscount,
                rules: rules || [],
            });

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
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (type: string) => <Tag color="purple">{type}</Tag>,
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
            width: 100,
            render: (value: number, record: Discount) =>
                record.type === 'percentage' ? `${(value * 100).toFixed(0)}%` : value.toFixed(2),
        },
        {
            title: 'Rules',
            dataIndex: 'rules',
            key: 'rules',
            render: (rules: DiscountRule[]) => rules?.length || 0,
            width: 80,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            fixed: 'right' as const,
            render: (record: DiscountWithRules) => (
                <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm
                        title="Are you sure you want to delete this discount and its rules?"
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
                    Add Discount
                </Button>
            </div>

            {isMobile ? (
                // Mobile Card View
                <div className="flex flex-col gap-3">
                    {discounts.map((discount) => (
                        <Card key={discount.id} size="small">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ flex: 1 }}>
                                    <Typography.Text strong>{discount.name}</Typography.Text>
                                    <div style={{ marginTop: 4 }}>
                                        <Tag color="purple">{discount.type}</Tag>
                                        <Tag>{discount.short_code}</Tag>
                                    </div>
                                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                        Value: {discount.type === 'percentage' ? `${(discount.value * 100).toFixed(0)}%` : discount.value.toFixed(2)} | {discount.rules?.length || 0} rules
                                    </Typography.Text>
                                </div>
                                <Space>
                                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(discount)} className="btn-touch" />
                                    <Popconfirm
                                        title="Delete this discount?"
                                        onConfirm={() => handleDelete(discount)}
                                    >
                                        <Button type="text" danger icon={<DeleteOutlined />} className="btn-touch" />
                                    </Popconfirm>
                                </Space>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                // Desktop Table View
                <Table
                    columns={columns}
                    dataSource={discounts}
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
                title={`${editingRecord ? 'Edit' : 'Create'} Discount & Rules`}
                open={drawerVisible}
                onClose={() => {
                    setDrawerVisible(false);
                    form.resetFields();
                }}
                width={drawerWidth}
                footer={
                    <Space className={isMobile ? 'w-full' : ''} style={isMobile ? { display: 'flex' } : {}}>
                        <Button onClick={() => setDrawerVisible(false)} className={isMobile ? 'flex-1' : ''}>Cancel</Button>
                        <Button
                            type="primary"
                            onClick={handleSave}
                            loading={upsertDiscountMutation.isPending}
                            className={isMobile ? 'flex-1' : ''}
                        >
                            {editingRecord ? 'Update' : 'Create'}
                        </Button>
                    </Space>
                }
            >
                <Form form={form} layout="vertical">
                    <Title level={5}>Discount Details</Title>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter name' }]}>
                                <Input className="input-mobile" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="short_code" label="Short Code" rules={[{ required: true, message: 'Please enter short code' }]}>
                                <Input className="input-mobile" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Please select a type' }]}>
                                <Select className="input-mobile">
                                    <Option value="percentage">Percentage</Option>
                                    <Option value="fixed_amount">Fixed Amount</Option>
                                    <Option value="buy_x_get_y_free">Buy X Get Y Free</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="value" label="Value" rules={[{ required: true, message: 'Please enter value' }]}>
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    precision={4}
                                    placeholder="Enter value (0.20 for 20% or 50.00 for $50)"
                                    className="input-mobile"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="is_active" label="Active" valuePropName="checked">
                        <Switch defaultChecked />
                    </Form.Item>

                    <Divider />

                    <Title level={5}>Discount Rules</Title>
                    <Form.List name="rules">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <DiscountRuleItem
                                        key={key}
                                        name={name}
                                        form={form}
                                        restField={restField}
                                        remove={remove}
                                        offerings={offerings}
                                        customerSegments={customerSegments}
                                        locations={locations}
                                    />
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Add Rule
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Drawer>
        </>
    );
};

export default DiscountManagerPage;
