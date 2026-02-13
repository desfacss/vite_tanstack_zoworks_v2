import React, { useState } from 'react';
import { Table, Button, Tag, Space, Typography, Drawer, Form, Input, Select, Card, Alert, Modal, theme, Empty, Dropdown, App } from 'antd';
import { PlusOutlined, DeleteOutlined, WhatsAppOutlined, ReloadOutlined, EditOutlined, SettingOutlined, DatabaseOutlined, GlobalOutlined, UserOutlined, QuestionCircleOutlined, MoreOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useCreateMetaTemplate, useDeleteMetaTemplate, useUpdateMetaTemplate, useSyncTemplates, useLocalTemplates, useTemplateWithMappings, useSaveVariableMappings } from '../hooks/useMetaTemplates';
import { extractVariablesFromTemplate, fetchCommunityTemplates, sendTemplateMessage } from '../services/whatsappTemplates';
import TemplateEditor from './TemplateEditor';
import type { GraphTemplate } from '../services/whatsappTemplates';
import type { BestPracticeTemplate } from '../data/bestPracticeTemplates';
import { useResponsive } from '../hooks';
import { useSetPageHeader } from '../contexts/PageHeaderContext';
import { ActionBar } from '../components/common/ActionBar';
import { usePageTour } from '../help';
import { libraryTour } from '../help/tours';

const { Text } = Typography;

// Data source options for variable mapping
const DATA_SOURCES = [
    { label: 'Contact', value: 'contact', fields: ['name', 'wa_id', 'email', 'phone'] },
    { label: 'Order', value: 'order', fields: ['order_number', 'total_amount', 'status', 'created_at'] },
    { label: 'Invoice', value: 'invoice', fields: ['invoice_number', 'amount', 'due_date'] },
    { label: 'Product', value: 'product', fields: ['name', 'price', 'sku', 'quantity'] },
    { label: 'Custom', value: 'custom', fields: [] },
];

const TemplatesPage: React.FC = () => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const { isMobile, drawerWidth } = useResponsive();
    const { data: localTemplates, isLoading, refetch } = useLocalTemplates();
    // Keep metaTemplates for background sync comparison if needed, but primarily use local
    const syncTemplates = useSyncTemplates();
    const createTemplate = useCreateMetaTemplate();
    const updateTemplate = useUpdateMetaTemplate();
    const deleteTemplate = useDeleteMetaTemplate();
    const saveMappings = useSaveVariableMappings();

    const [activeTab, setActiveTab] = useState('my-templates');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<GraphTemplate | undefined>(undefined);
    const [mappingDrawerOpen, setMappingDrawerOpen] = useState(false);
    const [selectedTemplateForMapping, setSelectedTemplateForMapping] = useState<any>(null);
    const [mappingForm] = Form.useForm();
    const [communityTemplates, setCommunityTemplates] = useState<GraphTemplate[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState(false);
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [testTemplate, setTestTemplate] = useState<GraphTemplate | null>(null);
    const [testForm] = Form.useForm();
    const [sendingTest, setSendingTest] = useState(false);

    // Set page header
    useSetPageHeader({
        title: 'Templates',
    }, []);

    // Register help tour
    const { startTour: startTemplatesTour } = usePageTour(libraryTour);

    // Filter templates based on search term
    const filterBySearch = (items: any[]) => {
        if (!searchTerm.trim()) return items;
        const lowerSearch = searchTerm.toLowerCase();
        return items.filter((t: any) =>
            t.name?.toLowerCase().includes(lowerSearch) ||
            t.category?.toLowerCase().includes(lowerSearch)
        );
    };

    React.useEffect(() => {
        if (activeTab === 'community') {
            setLoadingCommunity(true);
            fetchCommunityTemplates()
                .then(setCommunityTemplates)
                .catch(console.error)
                .finally(() => setLoadingCommunity(false));
        }
    }, [activeTab]);

    // Get template with mappings
    const { data: templateWithMappings, refetch: refetchMappings } = useTemplateWithMappings(
        selectedTemplateForMapping?.localId || null
    );

    const handleCreateOrUpdate = async (values: GraphTemplate) => {
        try {
            if (editingTemplate && editingTemplate.id) {
                await updateTemplate.mutateAsync({ id: editingTemplate.id, template: values });
            } else {
                await createTemplate.mutateAsync(values);
            }
            setIsDrawerOpen(false);
            setEditingTemplate(undefined);
        } catch (error) {
            // Error handled in hook
        }
    };

    const handleEdit = (record: GraphTemplate) => {
        setEditingTemplate(record);
        setIsDrawerOpen(true);
    };

    const handleUseTemplate = (template: BestPracticeTemplate) => {
        // Convert BestPracticeTemplate to GraphTemplate format for editor
        // Append random suffix to avoid name collision
        const randomSuffix = Math.floor(Math.random() * 1000);
        const graphTemplate: GraphTemplate = {
            name: `${template.name}_copy_${randomSuffix}`,
            category: template.category as any,
            language: template.language,
            components: JSON.parse(JSON.stringify(template.components)),
            status: 'PENDING'
        };
        setEditingTemplate(graphTemplate);
        setIsDrawerOpen(true);
    };

    const handleTestTemplate = (template: any) => {
        setTestTemplate(template);
        testForm.resetFields();
        setTestModalOpen(true);
    };

    const handleSendTest = async () => {
        try {
            const values = await testForm.validateFields();
            setSendingTest(true);

            await sendTemplateMessage(
                testTemplate!.name,
                values.phone_number,
                testTemplate!.language,
                values
            );

            message.success('Test message sent successfully!');
            setTestModalOpen(false);
        } catch (error: any) {
            message.error(error.message || 'Failed to send test message');
        } finally {
            setSendingTest(false);
        }
    };

    const handleDelete = async (name: string) => {
        try {
            await deleteTemplate.mutateAsync(name);
        } catch (error) {
            // Error handled in hook
        }
    };

    const handleSync = async () => {
        try {
            await syncTemplates.mutateAsync();
            message.success('Templates synced successfully!');
        } catch (error) {
            message.error('Failed to sync templates');
        }
    };

    const handleOpenMappingDrawer = (record: any) => {
        // Find the local template by name
        const localTemplate = localTemplates?.find((t: any) => t.name === record.name);
        const variables = extractVariablesFromTemplate(record);

        setSelectedTemplateForMapping({
            ...record,
            localId: localTemplate?.id,
            variables
        });
        setMappingDrawerOpen(true);

        // Load existing mappings into form
        if (localTemplate?.id) {
            refetchMappings();
        }
    };

    const handleSaveMappings = async () => {
        try {
            const values = mappingForm.getFieldsValue();
            await saveMappings.mutateAsync({
                templateId: selectedTemplateForMapping?.localId,
                mappings: values
            });
            message.success('Variable mappings saved!');
            setMappingDrawerOpen(false);
            refetchMappings();
        } catch (error) {
            message.error('Failed to save mappings');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'APPROVED': return 'success';
            case 'REJECTED': return 'error';
            case 'PENDING': return 'warning';
            default: return 'default';
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category?.toUpperCase()) {
            case 'MARKETING': return 'blue';
            case 'UTILITY': return 'purple';
            case 'AUTHENTICATION': return 'orange';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (cat: string) => <Tag color={getCategoryColor(cat)}>{cat}</Tag>,
        },
        {
            title: 'Language',
            dataIndex: 'language',
            key: 'language',
            render: (lang: string) => <Tag>{lang}</Tag>,
        },
        {
            title: 'Variables',
            key: 'variables',
            render: (_: any, record: GraphTemplate) => {
                const vars = extractVariablesFromTemplate(record);
                return vars.length > 0 ? (
                    <Space wrap>
                        {vars.slice(0, 3).map((v, i) => (
                            <Tag key={i} color="geekblue">{`{{${v}}}`}</Tag>
                        ))}
                        {vars.length > 3 && <Tag>+{vars.length - 3}</Tag>}
                    </Space>
                ) : '-';
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: GraphTemplate) => (
                <Space size="small">
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => handleUseTemplate(record as any)}
                    >
                        Use
                    </Button>
                    <Dropdown
                        menu={{
                            items: [
                                { key: 'test', label: 'Test', icon: <PlayCircleOutlined />, onClick: () => handleTestTemplate(record) },
                                { key: 'config', label: 'Configure', icon: <SettingOutlined />, onClick: () => handleOpenMappingDrawer(record) },
                                { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(record) },
                                { type: 'divider' },
                                { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record.name) },
                            ],
                        }}
                        trigger={['click']}
                    >
                        <Button icon={<MoreOutlined />} size="small" />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Action Bar with dropdown and search */}
            <ActionBar
                viewModeFilter={{
                    value: activeTab,
                    onChange: setActiveTab,
                    options: [
                        { value: 'my-templates', label: <Space><UserOutlined />My Templates</Space> },
                        { value: 'community', label: <Space><GlobalOutlined />Community</Space> },
                    ],
                }}
                search={{
                    placeholder: 'Search templates...',
                    value: searchTerm,
                    onChange: setSearchTerm,
                }}
                primaryAction={{
                    label: 'Create Template',
                    icon: <PlusOutlined />,
                    onClick: () => {
                        setEditingTemplate(undefined);
                        setIsDrawerOpen(true);
                    },
                }}
                secondaryActions={[
                    {
                        key: 'sync',
                        label: 'Sync from Meta',
                        icon: <DatabaseOutlined />,
                        onClick: handleSync,
                    },
                    {
                        key: 'refresh',
                        label: 'Refresh',
                        icon: <ReloadOutlined />,
                        onClick: () => refetch(),
                    },
                    {
                        key: 'help',
                        label: 'Show Help Tour',
                        icon: <QuestionCircleOutlined />,
                        onClick: startTemplatesTour,
                    },
                ]}
            />

            {/* Content */}
            <div style={{ padding: isMobile ? 12 : 24, flex: 1, overflow: 'auto' }}>
                {/* Template content */}
                {activeTab === 'my-templates' && (
                    <>
                        {localTemplates && localTemplates.length > 0 && (
                            <Alert
                                message={`${localTemplates.length} template(s) synced`}
                                type="success"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        {isMobile ? (
                            // Mobile Card View - Compact with more dropdown
                            <div className="flex flex-col gap-3">
                                {filterBySearch(localTemplates || []).map((template: any) => (
                                    <Card
                                        key={template.id}
                                        size="small"
                                        styles={{ body: { padding: 12 } }}
                                    >
                                        {/* Header: Title + Status + More */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {template.name}
                                                </div>
                                                <Space size={4} style={{ marginTop: 4 }}>
                                                    <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{template.category}</Tag>
                                                    <Tag style={{ margin: 0, fontSize: 11 }}>{template.language}</Tag>
                                                </Space>
                                            </div>
                                            <Tag
                                                color={template.status === 'APPROVED' ? 'success' : template.status === 'REJECTED' ? 'error' : 'warning'}
                                                style={{ margin: 0, fontSize: 11 }}
                                            >
                                                {template.status}
                                            </Tag>
                                            <Dropdown
                                                menu={{
                                                    items: [
                                                        { key: 'use', label: 'Use Template', icon: <WhatsAppOutlined />, onClick: () => handleUseTemplate(template) },
                                                        { key: 'test', label: 'Test', icon: <PlayCircleOutlined />, onClick: () => handleTestTemplate(template) },
                                                        { key: 'config', label: 'Configure', icon: <SettingOutlined />, onClick: () => handleOpenMappingDrawer(template) },
                                                        { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(template) },
                                                        { type: 'divider' },
                                                        { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(template.name) },
                                                    ],
                                                }}
                                                trigger={['click']}
                                            >
                                                <Button type="text" icon={<MoreOutlined />} size="small" />
                                            </Dropdown>
                                        </div>
                                        {/* Content Preview */}
                                        <div style={{
                                            background: token.colorFillQuaternary,
                                            padding: 8,
                                            borderRadius: 4,
                                            fontSize: 12,
                                            lineHeight: 1.4,
                                            color: token.colorTextSecondary,
                                            maxHeight: 60,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                        }}>
                                            {typeof template.components === 'string'
                                                ? JSON.parse(template.components).find((c: any) => c.type === 'BODY')?.text
                                                : template.components?.find((c: any) => c.type === 'BODY')?.text || 'No content'}
                                        </div>
                                    </Card>
                                ))}
                                {!localTemplates?.length && !isLoading && (
                                    <Empty
                                        description={
                                            <Space direction="vertical">
                                                <span>No templates found in database</span>
                                                <Button type="primary" onClick={handleSync} loading={syncTemplates.isPending}>
                                                    Sync from Meta
                                                </Button>
                                            </Space>
                                        }
                                    />
                                )}
                            </div>
                        ) : (
                            // Desktop Table View
                            <Table
                                columns={columns}
                                dataSource={filterBySearch(localTemplates || [])}
                                loading={isLoading}
                                rowKey="id"
                                pagination={{ pageSize: 10 }}
                                scroll={{ x: 800 }}
                            />
                        )}
                    </>
                )}

                {activeTab === 'community' && (
                    <>
                        <Alert
                            message="Community Templates"
                            description="Browse approved templates used by other businesses."
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                        <div className="flex flex-col gap-3">
                            {loadingCommunity ? (
                                <Card loading size="small" />
                            ) : filterBySearch(communityTemplates).map((template, idx) => (
                                <Card
                                    key={template.id || idx}
                                    size="small"
                                    styles={{ body: { padding: 12 } }}
                                >
                                    {/* Header: Title + Status + More */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {template.name}
                                            </div>
                                            <Space size={4} style={{ marginTop: 4 }}>
                                                <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{template.category}</Tag>
                                                <Tag style={{ margin: 0, fontSize: 11 }}>{template.language}</Tag>
                                            </Space>
                                        </div>
                                        <Tag
                                            color={template.status === 'APPROVED' ? 'success' : 'default'}
                                            style={{ margin: 0, fontSize: 11 }}
                                        >
                                            {template.status}
                                        </Tag>
                                        <Dropdown
                                            menu={{
                                                items: [
                                                    { key: 'use', label: 'Use Template', icon: <WhatsAppOutlined />, onClick: () => handleUseTemplate(template as any) },
                                                    { key: 'test', label: 'Test', icon: <PlayCircleOutlined />, onClick: () => handleTestTemplate(template) },
                                                ],
                                            }}
                                            trigger={['click']}
                                        >
                                            <Button type="text" icon={<MoreOutlined />} size="small" />
                                        </Dropdown>
                                    </div>
                                    {/* Content Preview */}
                                    <div style={{
                                        background: token.colorFillQuaternary,
                                        padding: 8,
                                        borderRadius: 4,
                                        fontSize: 12,
                                        lineHeight: 1.4,
                                        color: token.colorTextSecondary,
                                        maxHeight: 60,
                                        overflow: 'hidden',
                                    }}>
                                        {template.components?.find((c: any) => c.type === 'BODY')?.text || 'No content'}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* Best Practices tab hidden temporarily */}
            </div>

            {/* Create/Edit Template Drawer */}
            <Drawer
                title={editingTemplate ? "Edit Template" : "Create New Template"}
                width={drawerWidth}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setEditingTemplate(undefined);
                }}
                open={isDrawerOpen}
                destroyOnClose
            >
                <TemplateEditor
                    onSubmit={handleCreateOrUpdate}
                    isLoading={createTemplate.isPending || updateTemplate.isPending}
                    onCancel={() => {
                        setIsDrawerOpen(false);
                        setEditingTemplate(undefined);
                    }}
                    isEditing={!!editingTemplate}
                    initialValues={editingTemplate}
                />
            </Drawer>

            {/* Variable Mapping Drawer */}
            <Drawer
                title={`Configure Variable Mappings: ${selectedTemplateForMapping?.name || ''}`}
                width={drawerWidth}
                onClose={() => setMappingDrawerOpen(false)}
                open={mappingDrawerOpen}
                destroyOnClose
                extra={
                    <Button
                        type="primary"
                        onClick={handleSaveMappings}
                        loading={saveMappings.isPending}
                        disabled={!selectedTemplateForMapping?.localId}
                    >
                        Save Mappings
                    </Button>
                }
            >
                {!selectedTemplateForMapping?.localId ? (
                    <Alert
                        message="Template Not Synced"
                        description="Click 'Sync to Database' first to enable variable mappings."
                        type="warning"
                        showIcon
                    />
                ) : selectedTemplateForMapping?.variables?.length === 0 ? (
                    <Alert
                        message="No Variables"
                        description="This template has no dynamic variables ({{1}}, {{2}}, etc.)"
                        type="info"
                        showIcon
                    />
                ) : (
                    <Form form={mappingForm} layout="vertical" initialValues={
                        templateWithMappings?.variable_mappings?.reduce((acc: any, m: any) => ({
                            ...acc,
                            [`label_${m.variable_index}`]: m.variable_label,
                            [`source_${m.variable_index}`]: m.data_source,
                            [`field_${m.variable_index}`]: m.data_field,
                            [`default_${m.variable_index}`]: m.default_value,
                        }), {}) || {}
                    }>
                        {selectedTemplateForMapping?.variables?.map((v: any) => (
                            <Card
                                key={v.index}
                                size="small"
                                title={`Variable {{${v.index}}} (${v.componentType})`}
                                style={{ marginBottom: 16 }}
                            >
                                <Form.Item name={`label_${v.index}`} label="Label">
                                    <Input placeholder="e.g., Customer Name" />
                                </Form.Item>
                                <Form.Item name={`source_${v.index}`} label="Data Source">
                                    <Select placeholder="Select data source">
                                        {DATA_SOURCES.map(s => (
                                            <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    noStyle
                                    shouldUpdate={(prev, curr) => prev[`source_${v.index}`] !== curr[`source_${v.index}`]}
                                >
                                    {({ getFieldValue }) => {
                                        const source = getFieldValue(`source_${v.index}`);
                                        const sourceConfig = DATA_SOURCES.find(s => s.value === source);

                                        return sourceConfig?.fields?.length ? (
                                            <Form.Item name={`field_${v.index}`} label="Field">
                                                <Select placeholder="Select field">
                                                    {sourceConfig.fields.map(f => (
                                                        <Select.Option key={f} value={f}>{f}</Select.Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        ) : (
                                            <Form.Item name={`field_${v.index}`} label="Custom Field Path">
                                                <Input placeholder="e.g., order.items[0].name" />
                                            </Form.Item>
                                        );
                                    }}
                                </Form.Item>
                                <Form.Item name={`default_${v.index}`} label="Default Value">
                                    <Input placeholder="Fallback if data unavailable" />
                                </Form.Item>
                            </Card>
                        ))}
                    </Form>
                )}
            </Drawer>

            {/* Test Template Modal */}
            <Modal
                title={`Test Send: ${testTemplate?.name}`}
                open={testModalOpen}
                onCancel={() => setTestModalOpen(false)}
                onOk={handleSendTest}
                confirmLoading={sendingTest}
                okText="Send Test"
                width={isMobile ? '95%' : 520}
            >
                <Form form={testForm} layout="vertical">
                    <Form.Item
                        name="phoneNumber"
                        label="Phone Number"
                        rules={[{ required: true, message: 'Required' }]}
                        initialValue="918095063070"
                    >
                        <Input placeholder="e.g. 15551234567" className="input-mobile" />
                    </Form.Item>

                    <Alert message="Enter variable values below" type="info" showIcon style={{ marginBottom: 16 }} />

                    {testTemplate?.components.find((c: any) => c.type === 'BODY')?.text?.match(/\{\{\d+\}\}/g)?.map((_: string, idx: number) => (
                        <Form.Item
                            key={idx}
                            name={['params', idx]}
                            label={`Variable {{${idx + 1}}}`}
                            rules={[{ required: true }]}
                        >
                            <Input placeholder={`Value for {{${idx + 1}}}`} className="input-mobile" />
                        </Form.Item>
                    ))}
                </Form>
            </Modal>
        </div>
    );
};

export default TemplatesPage;
