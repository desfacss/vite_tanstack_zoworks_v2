import React, { useState, useEffect } from 'react';
import { Table, Button, Drawer, Form, Input, Select, Space, Tag, Popconfirm, message, Typography, Card, Tooltip, Row, Col } from 'antd';
import { Plus, Edit2, Trash2, Code, FileCode, Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import jsYaml from 'js-yaml';
import YamlEditor from '../components/YamlEditor';
import JsonEditor from '../components/JsonEditor';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ContextRecord {
    id: string;
    key: string;
    format: 'yaml' | 'json';
    content: string;
    organization_id: string;
    created_at: string;
}

const ContextRegistryPage: React.FC = () => {
    const [records, setRecords] = useState<ContextRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<ContextRecord | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [form] = Form.useForm();
    const { organization } = useAuthStore();

    useEffect(() => {
        loadRecords();
    }, [organization]);

    const loadRecords = async () => {
        setLoading(true);
        try {
            let query = supabase
                .schema('ai_mcp')
                .from('context_registry')
                .select('*');
            
            if (organization?.id) {
                query = query.eq('organization_id', organization.id);
            }

            const { data, error } = await query.order('key', { ascending: true });

            if (error) throw error;
            setRecords(data || []);
        } catch (err: any) {
            console.error('Error fetching context registry:', err);
            message.error(err.message || 'Failed to load context registry');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            format: 'yaml',
            content: '# Write rules in YAML format here\nmeta:\n  scope: ""\nconstraints:\n  - ""\noutput_guarantees:\n  - ""'
        });
        setDrawerOpen(true);
    };

    const handleEdit = (record: ContextRecord) => {
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue(record);
        setDrawerOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .schema('ai_mcp')
                .from('context_registry')
                .delete()
                .eq('id', id);

            if (error) throw error;
            message.success('Context rule deleted successfully');
            loadRecords();
        } catch (err: any) {
            console.error('Error deleting context rule:', err);
            message.error(err.message || 'Failed to delete context rule');
        }
    };

    const validateContent = (_rule: any, value: string) => {
        if (!value) return Promise.resolve();
        const format = form.getFieldValue('format');
        if (format === 'json') {
            try {
                JSON.parse(value);
                return Promise.resolve();
            } catch (e: any) {
                return Promise.reject(new Error(`Invalid JSON syntax: ${e.message}`));
            }
        } else if (format === 'yaml') {
            try {
                jsYaml.load(value);
                return Promise.resolve();
            } catch (e: any) {
                return Promise.reject(new Error(`Invalid YAML syntax: ${e.message}`));
            }
        }
        return Promise.resolve();
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const payload = {
                key: values.key,
                format: values.format,
                content: values.content,
                organization_id: editingRecord?.organization_id || organization?.id || '00000000-0000-0000-0000-000000000000',
            };

            if (editingRecord) {
                const { error } = await supabase
                    .schema('ai_mcp')
                    .from('context_registry')
                    .update(payload)
                    .eq('id', editingRecord.id);

                if (error) throw error;
                message.success('Context rule updated successfully');
            } else {
                const { error } = await supabase
                    .schema('ai_mcp')
                    .from('context_registry')
                    .insert([payload]);

                if (error) throw error;
                message.success('Context rule created successfully');
            }

            setDrawerOpen(false);
            loadRecords();
        } catch (err: any) {
            console.error('Error saving context rule:', err);
            if (err.errorFields) return; // Form validation error handled by UI
            message.error(err.message || 'Failed to save context rule');
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(r => 
        r.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns = [
        {
            title: 'Key / Path',
            dataIndex: 'key',
            key: 'key',
            render: (text: string) => (
                <Space>
                    <Code size={16} className="text-blue-500" />
                    <Text strong className="font-mono">{text}</Text>
                </Space>
            ),
        },
        {
            title: 'Format',
            dataIndex: 'format',
            key: 'format',
            width: 100,
            render: (text: string) => (
                <Tag color={text === 'yaml' ? 'orange' : 'cyan'} style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {text}
                </Tag>
            ),
        },
        {
            title: 'Content Preview',
            dataIndex: 'content',
            key: 'content',
            ellipsis: true,
            render: (text: string) => (
                <Text type="secondary" className="font-mono text-xs">
                    {text.length > 80 ? `${text.substring(0, 80)}...` : text}
                </Text>
            ),
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (text: string) => text ? new Date(text).toLocaleString() : '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: any, record: ContextRecord) => (
                <Space size="middle">
                    <Tooltip title="Edit Code">
                        <Button 
                            type="text" 
                            icon={<Edit2 size={16} className="text-gray-600" />} 
                            onClick={() => handleEdit(record)} 
                        />
                    </Tooltip>
                    <Popconfirm 
                        title="Delete Context Rule?" 
                        description="This might break playbooks or agents referencing this key."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes, delete"
                        cancelText="Cancel"
                    >
                        <Button 
                            type="text" 
                            danger 
                            icon={<Trash2 size={16} />} 
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="page-container" style={{ padding: '24px' }}>
            <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileCode className="text-blue-500" size={28} />
                        Context-as-Code: Context Registry
                    </Title>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                        Define atomic business rules, personas, templates, and constraints version-controlled in the database.
                    </Paragraph>
                </div>
                <Space>
                    <Button icon={<RefreshCw size={16} />} onClick={loadRecords} loading={loading}>
                        Refresh
                    </Button>
                    <Button type="primary" icon={<Plus size={16} />} onClick={handleCreate}>
                        New Context Rule
                    </Button>
                </Space>
            </div>

            <Card className="glass-card premium-shadow" style={{ minHeight: '60vh' }}>
                <div style={{ marginBottom: 16 }}>
                    <Input
                        placeholder="Search context rules by key or content..."
                        prefix={<Search size={16} className="text-gray-400" />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                        style={{ maxWidth: 400 }}
                    />
                </div>

                <Table 
                    dataSource={filteredRecords} 
                    columns={columns} 
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Drawer
                title={editingRecord ? `Edit Context: ${editingRecord.key}` : 'New Context Rule'}
                width={720}
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
                bodyStyle={{ paddingBottom: 80 }}
                extra={
                    <Space>
                        <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
                        <Button type="primary" onClick={handleSubmit} loading={loading}>
                            Save Changes
                        </Button>
                    </Space>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                    hideRequiredMark
                >
                    <Row gutter={16}>
                        <Col span={16}>
                            <Form.Item
                                name="key"
                                label="Context Key / Path"
                                rules={[
                                    { required: true, message: 'Please enter a unique key path' },
                                    { pattern: /^[a-zA-Z0-9_.-]+$/, message: 'Key path can only contain letters, numbers, dots, dashes, and underscores.' }
                                ]}
                            >
                                <Input placeholder="e.g. rules.billing.refund_policy" disabled={!!editingRecord} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="format"
                                label="Format"
                                rules={[{ required: true, message: 'Select format' }]}
                            >
                                <Select onChange={() => form.validateFields(['content'])}>
                                    <Option value="yaml">YAML</Option>
                                    <Option value="json">JSON</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.format !== currentValues.format}
                    >
                        {({ getFieldValue }) => {
                            const format = getFieldValue('format');
                            return (
                                <Form.Item
                                    name="content"
                                    label={`${format?.toUpperCase() || 'YAML'} Content Code`}
                                    rules={[
                                        { required: true, message: 'Please enter context content' },
                                        { validator: validateContent }
                                    ]}
                                >
                                    {format === 'json' ? (
                                        <JsonEditor rows={15} placeholder="Enter JSON..." />
                                    ) : (
                                        <YamlEditor rows={15} placeholder="Enter YAML..." />
                                    )}
                                </Form.Item>
                            );
                        }}
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    );
};

export default ContextRegistryPage;
