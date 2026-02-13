import React, { useState } from 'react';
import {
    Typography,
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Space,
    Tag,
    message,
    Tooltip,
    Card,
    Alert,
    Dropdown
} from 'antd';
import {
    PlusOutlined,
    CopyOutlined,
    EditOutlined,
    DeleteOutlined,
    CodeOutlined,
    GlobalOutlined,
    UserOutlined,
    QuestionCircleOutlined,
    MoreOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getOrganizationId } from '@/lib/supabase';
import { useResponsive } from '../hooks';
import { useSetPageHeader } from '../contexts/PageHeaderContext';
import { ActionBar } from '../components/common/ActionBar';
import { usePageTour } from '../help';
import { libraryTour } from '../help/tours';

const { Text } = Typography;
const { Option } = Select;

interface VariableDefinition {
    id: string;
    name: string;
    variable_syntax: string;
    description: string;
    category: string;
    is_system: boolean;
}

const VariablesPage: React.FC = () => {
    const { isMobile } = useResponsive();
    const [viewMode, setViewMode] = useState<string>('my-variables');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingVariable, setEditingVariable] = useState<VariableDefinition | null>(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // Set page header
    useSetPageHeader({
        title: 'Variables',
    }, []);

    // Register help tour
    const { startTour: startVariablesTour } = usePageTour(libraryTour);

    // Filter variables based on search term
    const filterBySearch = (items: VariableDefinition[]) => {
        if (!searchTerm.trim()) return items;
        const lowerSearch = searchTerm.toLowerCase();
        return items.filter((v) =>
            v.name?.toLowerCase().includes(lowerSearch) ||
            v.category?.toLowerCase().includes(lowerSearch) ||
            v.variable_syntax?.toLowerCase().includes(lowerSearch)
        );
    };

    // Fetch My Variables (tenant-filtered)
    const { data: myVariables, isLoading: isLoadingMy } = useQuery({
        queryKey: ['variables', 'my'],
        queryFn: async () => {
            const organizationId = await getOrganizationId();
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_variable_definitions')
                .select('*')
                .eq('organization_id', organizationId)
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching variables:', error);
                throw error;
            }
            return data as VariableDefinition[];
        }
    });

    // Fetch Community Variables (all tenants)
    const { data: communityVariables, isLoading: isLoadingCommunity } = useQuery({
        queryKey: ['variables', 'community'],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_variable_definitions')
                .select('*')
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching community variables:', error);
                throw error;
            }
            return data as VariableDefinition[];
        },
        enabled: viewMode === 'community'
    });

    // Current view data
    const variables = viewMode === 'my-variables' ? myVariables : communityVariables;
    const isLoading = viewMode === 'my-variables' ? isLoadingMy : isLoadingCommunity;

    // Create/Update Mutation
    const saveMutation = useMutation({
        mutationFn: async (values: any) => {
            const organizationId = await getOrganizationId();
            const payload = { ...values, organization_id: organizationId };

            if (editingVariable) {
                const { error } = await supabase
                    .schema('wa')
                    .from('wa_variable_definitions')
                    .update(payload)
                    .eq('id', editingVariable.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .schema('wa')
                    .from('wa_variable_definitions')
                    .insert([payload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            message.success(`Variable ${editingVariable ? 'updated' : 'created'} successfully`);
            setIsModalVisible(false);
            form.resetFields();
            setEditingVariable(null);
            queryClient.invalidateQueries({ queryKey: ['variables', 'my'] });
            queryClient.invalidateQueries({ queryKey: ['variables', 'community'] });
        },
        onError: (error: any) => {
            message.error(`Failed to save variable: ${error.message}`);
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .schema('wa')
                .from('wa_variable_definitions')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            message.success('Variable deleted');
            queryClient.invalidateQueries({ queryKey: ['variables', 'my'] });
            queryClient.invalidateQueries({ queryKey: ['variables', 'community'] });
        },
        onError: (error: any) => {
            message.error(`Failed to delete variable: ${error.message}`);
        }
    });

    const handleEdit = (record: VariableDefinition) => {
        setEditingVariable(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('Copied to clipboard');
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: VariableDefinition) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    {record.is_system && <Tag color="blue" className="text-xs leading-4">System</Tag>}
                </Space>
            )
        },
        {
            title: 'Syntax',
            dataIndex: 'variable_syntax',
            key: 'variable_syntax',
            render: (text: string) => (
                <Tooltip title="Click to copy">
                    <Tag
                        icon={<CodeOutlined />}
                        className="cursor-pointer text-sm py-1 px-2"
                        onClick={() => handleCopy(text)}
                    >
                        {text}
                    </Tag>
                </Tooltip>
            )
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (text: string) => <Tag>{text}</Tag>,
            filters: Array.from(new Set(variables?.map(v => v.category))).map(c => ({ text: c, value: c })),
            onFilter: (value: any, record: VariableDefinition) => record.category === value,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_: any, record: VariableDefinition) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(record.variable_syntax)}
                        size="small"
                    />
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'clone',
                                    label: 'Clone',
                                    icon: <CopyOutlined />,
                                    onClick: () => {
                                        setEditingVariable(null);
                                        form.setFieldsValue({
                                            ...record,
                                            name: `${record.name} (Copy)`,
                                            id: undefined
                                        });
                                        setIsModalVisible(true);
                                    }
                                },
                                ...(!record.is_system ? [
                                    { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(record) },
                                    { type: 'divider' as const },
                                    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record.id) },
                                ] : []),
                            ],
                        }}
                        trigger={['click']}
                    >
                        <Button type="text" icon={<MoreOutlined />} size="small" />
                    </Dropdown>
                </Space>
            )
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Action Bar with dropdown and search */}
            <ActionBar
                viewModeFilter={{
                    value: viewMode,
                    onChange: setViewMode,
                    options: [
                        { value: 'my-variables', label: <Space><UserOutlined />My Variables</Space> },
                        { value: 'community', label: <Space><GlobalOutlined />Community</Space> },
                    ],
                }}
                search={{
                    placeholder: 'Search variables...',
                    value: searchTerm,
                    onChange: setSearchTerm,
                }}
                primaryAction={{
                    label: 'Create Variable',
                    icon: <PlusOutlined />,
                    onClick: () => {
                        setEditingVariable(null);
                        form.resetFields();
                        setIsModalVisible(true);
                    },
                }}
                secondaryActions={[
                    {
                        key: 'help',
                        label: 'Show Help Tour',
                        icon: <QuestionCircleOutlined />,
                        onClick: startVariablesTour,
                    },
                ]}
            />

            {/* Content */}
            <div style={{ padding: isMobile ? 12 : 24, flex: 1, overflow: 'auto' }}>
                {viewMode === 'community' && (
                    <Alert
                        message="Community Variables"
                        description="Clone to use in your templates."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                {/* Variable List */}
                {isMobile ? (
                    /* Mobile: Card View - Compact with more dropdown */
                    <div className="flex flex-col gap-3">
                        {filterBySearch(variables || []).map((variable) => (
                            <Card
                                key={variable.id}
                                size="small"
                                styles={{ body: { padding: 12 } }}
                            >
                                {/* Header: Name + Category + More */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {variable.name}
                                            {variable.is_system && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>System</Tag>}
                                        </div>
                                        <Tag color="default" style={{ margin: 0, marginTop: 4, fontSize: 11 }}>{variable.category}</Tag>
                                    </div>
                                    <Dropdown
                                        menu={{
                                            items: [
                                                { key: 'copy', label: 'Copy Syntax', icon: <CopyOutlined />, onClick: () => handleCopy(variable.variable_syntax) },
                                                ...(!variable.is_system ? [
                                                    { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(variable) },
                                                    { type: 'divider' as const },
                                                    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(variable.id) },
                                                ] : []),
                                            ],
                                        }}
                                        trigger={['click']}
                                    >
                                        <Button type="text" icon={<MoreOutlined />} size="small" />
                                    </Dropdown>
                                </div>
                                {/* Syntax display */}
                                <Tooltip title="Tap to copy">
                                    <Tag
                                        icon={<CodeOutlined />}
                                        style={{ width: '100%', padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}
                                        onClick={() => handleCopy(variable.variable_syntax)}
                                    >
                                        {variable.variable_syntax}
                                    </Tag>
                                </Tooltip>
                                {variable.description && (
                                    <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                                        {variable.description}
                                    </Text>
                                )}
                            </Card>
                        ))}
                    </div>
                ) : (
                    /* Desktop: Table View */
                    <Table
                        columns={columns}
                        dataSource={filterBySearch(variables || [])}
                        rowKey="id"
                        loading={isLoading}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 800 }}
                    />
                )}

                {/* Create/Edit Modal */}
                <Modal
                    title={editingVariable ? "Edit Variable" : "Create Variable"}
                    open={isModalVisible}
                    onCancel={() => setIsModalVisible(false)}
                    onOk={() => form.submit()}
                    confirmLoading={saveMutation.isPending}
                    width={isMobile ? '95%' : 500}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={(values) => saveMutation.mutate(values)}
                    >
                        <Form.Item
                            name="name"
                            label="Name"
                            rules={[{ required: true, message: 'Please enter a name' }]}
                        >
                            <Input placeholder="e.g. Contact Name" className="input-mobile" />
                        </Form.Item>

                        <Form.Item
                            name="variable_syntax"
                            label="Syntax"
                            rules={[{ required: true, message: 'Please enter the syntax' }]}
                            help="Use {{schema.table.list.column}} format for generic resolution."
                        >
                            <Input placeholder="e.g. {{contact.name}}" className="input-mobile" />
                        </Form.Item>

                        <Form.Item
                            name="category"
                            label="Category"
                            initialValue="General"
                        >
                            <Select mode="tags">
                                <Option value="Contact">Contact</Option>
                                <Option value="Catalog">Catalog</Option>
                                <Option value="System">System</Option>
                                <Option value="General">General</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Description"
                        >
                            <Input.TextArea
                                rows={3}
                                placeholder="Describe what this variable resolves to."
                                className="input-mobile"
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </div>
    );
};

export default VariablesPage;

