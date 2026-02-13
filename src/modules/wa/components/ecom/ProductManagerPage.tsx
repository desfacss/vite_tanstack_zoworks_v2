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
    Typography,
    Tag,
    Row,
    Col,
    Divider,
    App,
    Card,
    Alert,
    Modal,
    Dropdown,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined, SyncOutlined, QuestionCircleOutlined, ExportOutlined, MoreOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getWhatsAppConfig, getCommerceSettings } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { Offering, OfferingVariant, OfferingBundle } from '../../types/ecom';
import { MetaCommerceSyncService } from '../../services/metaCommerceSync';
import { useResponsive } from '../../hooks/useResponsive';

// Helper function to generate UUID using native crypto API
const generateUUID = () => crypto.randomUUID();

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const getOfferingTableName = () => 'offerings';
const getVariantTableName = () => 'offering_variants';
const getBundleTableName = () => 'offering_bundles';
const getBundleItemsTableName = () => 'bundle_items';
const getCatalogSchemaName = () => 'catalog';

interface ProductManagerPageProps {
    selectedOrganization: string;
}

const ProductManagerPage: React.FC<ProductManagerPageProps> = ({ selectedOrganization }) => {
    const { isMobile, drawerWidth } = useResponsive();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState<Offering | null>(null);
    const [form] = Form.useForm();
    const { organization } = useAuthStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isCreatingCatalog, setIsCreatingCatalog] = useState(false);
    const [setupModalVisible, setSetupModalVisible] = useState(false);
    const [helpModalVisible, setHelpModalVisible] = useState(false);
    const [manualIdForm] = Form.useForm();
    const formOfferingType = Form.useWatch('type', form);

    const { data: commerceSettings } = useQuery({
        queryKey: ['commerceSettings', selectedOrganization],
        queryFn: () => getCommerceSettings(selectedOrganization),
        enabled: !!selectedOrganization,
    });

    const { data: offerings = [], isLoading } = useQuery<Offering[]>({
        queryKey: [getOfferingTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getOfferingTableName())
                .select(`
          *,
          variants:offering_variants(*),
          bundles:offering_bundles!offering_bundles_offering_id_fkey(
            *,
            items:bundle_items!bundle_items_bundle_id_fkey(
              *,
              component_offering:offerings(name)
            )
          )
        `)
                .eq('organization_id', selectedOrganization)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const upsertProductMutation = useMutation({
        mutationFn: async ({ offering, variants, bundles, bundleItems }: { offering: any; variants: any[]; bundles: any[]; bundleItems: any[] }) => {
            const { data: updatedOffering, error: offeringError } = await supabase
                .schema(getCatalogSchemaName())
                .from(getOfferingTableName())
                .upsert(offering)
                .select()
                .single();
            if (offeringError) throw offeringError;

            const offeringId = updatedOffering.id;

            if (variants?.length > 0) {
                const variantsWithOfferingId = variants.map(v => ({
                    ...v,
                    id: v.id || generateUUID(),
                    version: v.version ? v.version + 1 : 1,
                    offering_id: offeringId,
                    organization_id: selectedOrganization
                }));
                const { error: variantsError } = await supabase
                    .schema(getCatalogSchemaName())
                    .from(getVariantTableName())
                    .upsert(variantsWithOfferingId);
                if (variantsError) throw variantsError;
            }

            if (offering.type === 'bundle' && bundles?.length > 0) {
                const bundleRecord = {
                    ...bundles[0],
                    id: bundles[0].id || generateUUID(),
                    version: bundles[0].version ? bundles[0].version + 1 : 1,
                    offering_id: offeringId,
                    organization_id: selectedOrganization,
                };
                const { data: upsertedBundle, error: bundleError } = await supabase
                    .schema(getCatalogSchemaName())
                    .from(getBundleTableName())
                    .upsert(bundleRecord)
                    .select()
                    .single();
                if (bundleError) throw bundleError;

                const bundleId = upsertedBundle.id;

                const bundleItemsWithBundleId = bundleItems.map(item => ({
                    ...item,
                    id: item.id || generateUUID(),
                    version: item.version ? item.version + 1 : 1,
                    bundle_id: bundleId,
                    organization_id: selectedOrganization
                }));

                const { error: bundleItemsError } = await supabase
                    .schema(getCatalogSchemaName())
                    .from(getBundleItemsTableName())
                    .upsert(bundleItemsWithBundleId);
                if (bundleItemsError) throw bundleItemsError;
            }

            return updatedOffering;
        },
        onSuccess: () => {
            message.success('Product saved successfully');
            queryClient.invalidateQueries({ queryKey: [getOfferingTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error saving product:', error);
            message.error('Failed to save product');
        },
    });

    const deleteProductMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.schema(getCatalogSchemaName()).from(getOfferingTableName()).delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            message.success('Product deleted successfully');
            queryClient.invalidateQueries({ queryKey: [getOfferingTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error deleting product:', error);
            message.error('Failed to delete product');
        },
    });

    const handleCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        setDrawerVisible(true);
    };

    const handleEdit = (record: Offering) => {
        setEditingRecord(record);
        const formattedRecord = {
            ...record,
            variants: record.variants?.map(v => ({ ...v, attributes: JSON.stringify(v.attributes, null, 2) })),
            bundles: record.bundles?.length ? record.bundles[0] : null,
            bundle_items: record.bundles?.length ? record.bundles[0].items : [],
        }
        form.setFieldsValue(formattedRecord);
        setDrawerVisible(true);
    };

    const handleDelete = (record: Offering) => {
        deleteProductMutation.mutate(record.id);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const now = new Date().toISOString();

            const baseOffering = {
                name: values.name,
                short_code: values.short_code,
                type: values.type,
                description: values.description,
                unit_of_measure: values.unit_of_measure,
                is_active: values.is_active,
                is_digital: values.is_digital,
                is_service: values.is_service,
                is_configurable: values.is_configurable,
                is_physical: values.is_physical,
                is_inventory_tracked: values.is_inventory_tracked,
                organization_id: selectedOrganization,
                updated_at: now,
                version: editingRecord ? (editingRecord.version || 1) + 1 : 1,
                id: editingRecord ? editingRecord.id : generateUUID(),
            };

            upsertProductMutation.mutate({
                offering: baseOffering,
                variants: values.variants || [],
                bundles: values.bundles ? [values.bundles] : [],
                bundleItems: values.bundle_items || [],
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
            width: 100,
            render: (type: string) => <Tag color="blue">{type}</Tag>,
        },
        {
            title: 'Variants',
            dataIndex: 'variants',
            key: 'variants',
            render: (variants: OfferingVariant[]) => variants?.length || 0,
            width: 80,
        },
        {
            title: 'Bundles',
            dataIndex: 'bundles',
            key: 'bundles',
            render: (bundles: OfferingBundle[]) => bundles?.length || 0,
            width: 80,
        },
        {
            title: 'Meta Sync',
            key: 'meta_sync',
            width: 120,
            render: (_: any, record: Offering) => {
                if (!commerceSettings?.sync_enabled) return null;
                const isSynced = record.is_active;
                return (
                    <Tag color={isSynced ? 'processing' : 'default'} icon={isSynced ? <SyncOutlined spin={false} /> : null}>
                        {isSynced ? 'Synced' : 'Not Synced'}
                    </Tag>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 80,
            fixed: 'right' as const,
            render: (record: Offering) => (
                <Dropdown
                    menu={{
                        items: [
                            { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(record) },
                            { type: 'divider' },
                            { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record) },
                        ],
                    }}
                    trigger={['click']}
                >
                    <Button type="text" icon={<MoreOutlined />} size="small" />
                </Dropdown>
            ),
        },
    ];

    return (
        <>
            {commerceSettings?.sync_enabled && (
                <Alert
                    message="Meta Commerce Beta"
                    description="Advanced features like automated catalog creation and real-time sync are currently undergoing Meta App Review. For immediate testing, you can manually link a catalog ID."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 12 }}>
                {commerceSettings?.sync_enabled && (
                    <Button
                        icon={<SyncOutlined />}
                        loading={isSyncing}
                        onClick={async () => {
                            const config = await getWhatsAppConfig(selectedOrganization) as any;
                            if (config.commerce?.catalog_id) {
                                // Direct sync if ID exists
                                try {
                                    setIsSyncing(true);
                                    await MetaCommerceSyncService.syncCatalog(
                                        selectedOrganization,
                                        config.accessToken,
                                        config.commerce.catalog_id
                                    );
                                    message.success('Catalog synced to Meta successfully!');
                                } catch (error: any) {
                                    message.error(`Sync failed: ${error.message}`);
                                } finally {
                                    setIsSyncing(false);
                                }
                            } else {
                                // Show setup options if ID is missing
                                setSetupModalVisible(true);
                            }
                        }}
                    >
                        Sync to Meta
                    </Button>
                )}
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreate}
                    disabled={!selectedOrganization}
                >
                    Add Product
                </Button>
            </div>

            {isMobile ? (
                // Mobile Card View - Consistent with other pages
                <div className="flex flex-col gap-3">
                    {offerings.map((offering) => (
                        <Card
                            key={offering.id}
                            size="small"
                            styles={{ body: { padding: 12 } }}
                        >
                            {/* Header: Name + Type + More */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {offering.name}
                                    </div>
                                    <Space size={4} style={{ marginTop: 4 }}>
                                        <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{offering.type}</Tag>
                                        <Tag style={{ margin: 0, fontSize: 11 }}>{offering.short_code}</Tag>
                                    </Space>
                                </div>
                                <Dropdown
                                    menu={{
                                        items: [
                                            { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(offering) },
                                            { type: 'divider' },
                                            { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(offering) },
                                        ],
                                    }}
                                    trigger={['click']}
                                >
                                    <Button type="text" icon={<MoreOutlined />} size="small" />
                                </Dropdown>
                            </div>
                            {/* Info */}
                            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                {offering.variants?.length || 0} variants | {offering.bundles?.length || 0} bundles
                            </Typography.Text>
                            {commerceSettings?.sync_enabled && (
                                <Tag
                                    color={offering.is_active ? 'processing' : 'default'}
                                    style={{ fontSize: 10, marginTop: 6 }}
                                >
                                    {offering.is_active ? 'Meta Synced' : 'Not Synced'}
                                </Tag>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                // Desktop Table View
                <Table
                    columns={columns}
                    dataSource={offerings}
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
                title={`${editingRecord ? 'Edit' : 'Create'} Product`}
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
                            loading={upsertProductMutation.isPending}
                            className={isMobile ? 'flex-1' : ''}
                        >
                            {editingRecord ? 'Update' : 'Create'}
                        </Button>
                    </Space>
                }
            >
                <Form form={form} layout="vertical">
                    <Title level={5}>Offering Details</Title>
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
                                    <Option value="product">Product</Option>
                                    <Option value="service">Service</Option>
                                    <Option value="subscription">Subscription</Option>
                                    <Option value="bundle">Bundle</Option>
                                    <Option value="digital">Digital</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="unit_of_measure" label="Unit of Measure" rules={[{ required: true, message: 'Please enter unit of measure' }]}>
                                <Input className="input-mobile" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter description' }]}>
                        <TextArea rows={3} className="input-mobile" />
                    </Form.Item>
                    <Form.Item name="is_active" label="Active" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col xs={12} md={8}>
                            <Form.Item name="is_digital" label="Digital" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item name="is_service" label="Service" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item name="is_physical" label="Physical" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={12} md={8}>
                            <Form.Item name="is_configurable" label="Configurable" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item name="is_inventory_tracked" label="Inventory Tracked" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>

                    {formOfferingType !== 'bundle' && (
                        <>
                            <Divider />
                            <Title level={5}>Variants</Title>
                            <Form.List name="variants">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <div key={key} style={{ marginBottom: 8, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                                                <Form.Item name={[name, 'id']} hidden />
                                                <Row gutter={8}>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'sku']}
                                                            rules={[{ required: true, message: 'Missing SKU' }]}
                                                            style={{ marginBottom: 8 }}
                                                        >
                                                            <Input placeholder="SKU" className="input-mobile" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={10}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'attributes']}
                                                            rules={[{ required: true, message: 'Missing attributes' }]}
                                                            style={{ marginBottom: 8 }}
                                                        >
                                                            <Input placeholder='{"color": "Red"}' className="input-mobile" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={12} md={3}>
                                                        <Form.Item {...restField} name={[name, 'is_active']} valuePropName="checked" style={{ marginBottom: 8 }}>
                                                            <Switch size="small" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={12} md={3} style={{ textAlign: 'right' }}>
                                                        <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} className="btn-touch" />
                                                    </Col>
                                                </Row>
                                            </div>
                                        ))}
                                        <Form.Item>
                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                                Add Variant
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </>
                    )}

                    {formOfferingType === 'bundle' && (
                        <>
                            <Divider />
                            <Title level={5}>Bundle Items</Title>
                            <Form.List name="bundle_items">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <div key={key} style={{ marginBottom: 8, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                                                <Form.Item name={[name, 'id']} hidden />
                                                <Row gutter={8}>
                                                    <Col xs={24} md={10}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'component_offering_id']}
                                                            rules={[{ required: true, message: 'Missing component' }]}
                                                            style={{ marginBottom: 8 }}
                                                        >
                                                            <Select placeholder="Select Offering" className="input-mobile">
                                                                {offerings.map(o => (
                                                                    <Option key={o.id} value={o.id}>
                                                                        {o.name}
                                                                    </Option>
                                                                ))}
                                                            </Select>
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={12} md={5}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'quantity']}
                                                            rules={[{ required: true, message: 'Qty' }]}
                                                            style={{ marginBottom: 8 }}
                                                        >
                                                            <InputNumber placeholder="Qty" min={1} style={{ width: '100%' }} className="input-mobile" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={8} md={6}>
                                                        <Form.Item {...restField} name={[name, 'is_required']} valuePropName="checked" style={{ marginBottom: 8 }}>
                                                            <Switch checkedChildren="Req" unCheckedChildren="Opt" size="small" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={4} md={3} style={{ textAlign: 'right' }}>
                                                        <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} className="btn-touch" />
                                                    </Col>
                                                </Row>
                                            </div>
                                        ))}
                                        <Form.Item>
                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                                Add Bundle Item
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </>
                    )}
                </Form>
            </Drawer>

            {/* Meta Catalog Setup Modal */}
            <Modal
                title="Meta Catalog Setup"
                open={setupModalVisible}
                onCancel={() => setSetupModalVisible(false)}
                footer={null}
                width={600}
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Typography.Paragraph>
                        To sync your products, Zoworks needs to be linked to a Meta Catalog.
                    </Typography.Paragraph>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
                        <Button
                            type="primary"
                            size="large"
                            icon={<SyncOutlined />}
                            loading={isCreatingCatalog}
                            onClick={async () => {
                                try {
                                    setIsCreatingCatalog(true);
                                    const config = await getWhatsAppConfig(selectedOrganization) as any;

                                    if (!config.accessToken || !config.wabaId) {
                                        throw new Error("WhatsApp configuration incomplete. Please ensure Access Token and WABA ID are set.");
                                    }

                                    await MetaCommerceSyncService.createCatalog(
                                        selectedOrganization,
                                        config.accessToken,
                                        config.wabaId,
                                        organization?.name || 'My Store'
                                    );

                                    message.success('New Meta Catalog created successfully!');
                                    setSetupModalVisible(false);
                                    queryClient.invalidateQueries({ queryKey: ['commerceSettings', selectedOrganization] });
                                } catch (error: any) {
                                    message.error(`Auto-creation failed: ${error.message}`);
                                } finally {
                                    setIsCreatingCatalog(false);
                                }
                            }}
                        >
                            Create Catalog Automatically
                        </Button>

                        <Divider>OR</Divider>

                        <div style={{ textAlign: 'left' }}>
                            <Typography.Text strong>Link Manually</Typography.Text>
                            <Form
                                form={manualIdForm}
                                layout="inline"
                                style={{ marginTop: 8 }}
                                onFinish={async (values) => {
                                    try {
                                        const { catalog_id } = values;
                                        if (!catalog_id || catalog_id.length < 10) {
                                            return message.error("Please enter a valid 15-digit Catalog ID");
                                        }

                                        // Update settings via service (we should add an updateSettings helper)
                                        const { error } = await supabase
                                            .schema('identity')
                                            .from('organizations')
                                            .update({
                                                app_settings: supabase.rpc('jsonb_set_recursive', {
                                                    target: 'app_settings',
                                                    path: '{channels,whatsapp,commerce,catalog_id}',
                                                    value: `"${catalog_id}"`
                                                })
                                            })
                                            .eq('id', selectedOrganization);

                                        if (error) throw error;

                                        message.success("Catalog ID linked successfully!");
                                        setSetupModalVisible(false);
                                        queryClient.invalidateQueries({ queryKey: ['commerceSettings', selectedOrganization] });
                                    } catch (error: any) {
                                        message.error(`Linking failed: ${error.message}`);
                                    }
                                }}
                            >
                                <Form.Item name="catalog_id" rules={[{ required: true }]}>
                                    <Input placeholder="Enter 15-digit ID" style={{ width: 250 }} />
                                </Form.Item>
                                <Form.Item>
                                    <Button type="default" htmlType="submit">Link ID</Button>
                                </Form.Item>
                            </Form>
                            <Button
                                type="link"
                                icon={<QuestionCircleOutlined />}
                                style={{ padding: 0, marginTop: 8 }}
                                onClick={() => setHelpModalVisible(true)}
                            >
                                How do I find my Catalog ID?
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Help Info Modal */}
            <Modal
                title="How to create a Meta Catalog manually"
                open={helpModalVisible}
                onCancel={() => setHelpModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setHelpModalVisible(false)}>Got it</Button>
                ]}
                width={700}
            >
                <div style={{ padding: '10px 0' }}>
                    <ol style={{ paddingLeft: 20 }}>
                        <li style={{ marginBottom: 12 }}>
                            Go to <strong>Meta Commerce Manager</strong>:
                            <a href="https://business.facebook.com/commerce" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8 }}>
                                Open Commerce Manager <ExportOutlined />
                            </a>
                        </li>
                        <li style={{ marginBottom: 12 }}>
                            Click <strong>+ Add Catalog</strong> and select <strong>Ecommerce</strong>.
                        </li>
                        <li style={{ marginBottom: 12 }}>
                            When asked for "Product Upload Method", choose <strong>Upload Product Info</strong> and give it a name like "Zoworks Shop".
                        </li>
                        <li style={{ marginBottom: 12 }}>
                            Once created, go to <strong>Settings</strong> in the left sidebar.
                        </li>
                        <li style={{ marginBottom: 12 }}>
                            Look for <strong>Catalog ID</strong> at the top of the settings page. It is a 15-digit number.
                        </li>
                    </ol>
                    <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginTop: 16 }}>
                        <Typography.Text type="secondary" italic>
                            Tip: If the "Create Automatically" button failed, it is likely because your Meta App is still in "App Review" or missing permissions like <code>business_management</code>. Manual linking always works.
                        </Typography.Text>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ProductManagerPage;
