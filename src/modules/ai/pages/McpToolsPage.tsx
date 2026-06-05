import React, { useState, useEffect } from 'react';
import { Table, Button, Drawer, Form, Input, Select, Space, Tag, Switch, Popconfirm, message, Typography, Card, Tooltip, Row, Col } from 'antd';
import { Settings, Wrench, Edit2, Search, RefreshCw, Key, ShieldAlert } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import YamlEditor from '../components/YamlEditor';
import JsonEditor from '../components/JsonEditor';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface McpToolRecord {
    id: string;
    tool_key: string;
    name: string;
    description: string;
    input_schema: any;
    requires_approval: boolean;
    is_enabled: boolean;
    required_context_keys: string[];
}

interface ContextRecord {
    key: string;
}

const McpToolsPage: React.FC = () => {
    const [tools, setTools] = useState<McpToolRecord[]>([]);
    const [contextKeys, setContextKeys] = useState<string[]>([]);
    const [registryContents, setRegistryContents] = useState<Record<string, { id?: string; format: 'yaml' | 'json'; content: string }>>({});
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<McpToolRecord | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [form] = Form.useForm();
    const { organization } = useAuthStore();

    const fetchRegistryContents = async (keys: string[]) => {
        if (!keys || keys.length === 0) return;
        try {
            let query = supabase
                .schema('ai_mcp')
                .from('context_registry')
                .select('*')
                .in('key', keys);
            
            if (organization?.id) {
                query = query.eq('organization_id', organization.id);
            }
            const { data, error } = await query;
            if (!error && data) {
                setRegistryContents(prev => {
                    const next = { ...prev };
                    data.forEach(item => {
                        next[item.key] = {
                            id: item.id,
                            format: item.format as any,
                            content: item.content
                        };
                    });
                    // Defaults for keys not yet in db
                    keys.forEach(key => {
                        if (!next[key]) {
                            next[key] = {
                                format: 'yaml',
                                content: `# ${key}\nmeta:\n  scope: ""\nconstraints:\n  - ""`
                            };
                        }
                    });
                    return next;
                });
            }
        } catch (err) {
            console.error('Error fetching registry contents:', err);
        }
    };

    useEffect(() => {
        loadTools();
        loadContextKeys();
    }, [organization]);

    const loadTools = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .schema('ai_mcp')
                .from('mcp_tools')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setTools(data || []);
        } catch (err: any) {
            console.error('Error fetching MCP tools:', err);
            message.error(err.message || 'Failed to load MCP tools');
        } finally {
            setLoading(false);
        }
    };

    const loadContextKeys = async () => {
        try {
            let query = supabase
                .schema('ai_mcp')
                .from('context_registry')
                .select('key');
            
            if (organization?.id) {
                query = query.eq('organization_id', organization.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setContextKeys((data || []).map(r => r.key));
        } catch (err) {
            console.error('Error fetching context keys:', err);
        }
    };

    const handleEdit = (tool: McpToolRecord) => {
        setEditingTool(tool);
        form.resetFields();
        form.setFieldsValue({
            ...tool,
            required_context_keys: tool.required_context_keys || [],
            input_schema_str: typeof tool.input_schema === 'object' ? JSON.stringify(tool.input_schema, null, 2) : tool.input_schema
        });
        fetchRegistryContents(tool.required_context_keys || []);
        setDrawerOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            if (!editingTool) return;

            // 1. Save all context registry changes first
            const selectedKeys: string[] = values.required_context_keys || [];
            const orgId = organization?.id || '00000000-0000-0000-0000-000000000000';

            for (const key of selectedKeys) {
                const item = registryContents[key];
                if (item) {
                    const { error: registryError } = await supabase
                        .schema('ai_mcp')
                        .from('context_registry')
                        .upsert({
                            id: item.id || undefined,
                            organization_id: orgId,
                            key: key,
                            format: item.format,
                            content: item.content
                        }, { onConflict: 'organization_id,key' });

                    if (registryError) throw registryError;
                }
            }

            // 2. Update the tool configuration
            const payload = {
                description: values.description,
                requires_approval: values.requires_approval,
                is_enabled: values.is_enabled,
                required_context_keys: selectedKeys,
            };

            const { error } = await supabase
                .schema('ai_mcp')
                .from('mcp_tools')
                .update(payload)
                .eq('id', editingTool.id);

            if (error) throw error;
            message.success('MCP tool configuration and context rules saved successfully');
            setDrawerOpen(false);
            loadTools();
        } catch (err: any) {
            console.error('Error saving MCP tool config:', err);
            if (err.errorFields) return;
            message.error(err.message || 'Failed to save tool configuration');
        } finally {
            setLoading(false);
        }
    };

    const filteredTools = tools.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tool_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const columns = [
        {
            title: 'Tool Info',
            dataIndex: 'name',
            key: 'name',
            render: (_: any, record: McpToolRecord) => (
                <div>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wrench size={16} className="text-gray-500" />
                        {record.name}
                    </div>
                    <Text type="secondary" className="font-mono text-xs">{record.tool_key}</Text>
                </div>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Required Context Rules',
            dataIndex: 'required_context_keys',
            key: 'required_context_keys',
            render: (keys: string[]) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {keys && keys.length > 0 ? (
                        keys.map(key => (
                            <Tag color="purple" key={key} className="font-mono text-xs">
                                {key}
                            </Tag>
                        ))
                    ) : (
                        <Text type="secondary" italic style={{ fontSize: '12px' }}>None</Text>
                    )}
                </div>
            ),
        },
        {
            title: 'Requires Approval',
            dataIndex: 'requires_approval',
            key: 'requires_approval',
            width: 150,
            render: (checked: boolean) => (
                <Space>
                    {checked ? <ShieldAlert size={16} className="text-orange-500" /> : null}
                    <Text>{checked ? 'Yes' : 'No'}</Text>
                </Space>
            ),
        },
        {
            title: 'Enabled',
            dataIndex: 'is_enabled',
            key: 'is_enabled',
            width: 100,
            render: (checked: boolean) => (
                <Tag color={checked ? 'success' : 'error'}>
                    {checked ? 'Active' : 'Disabled'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_: any, record: McpToolRecord) => (
                <Tooltip title="Configure Tool Dependencies">
                    <Button 
                        type="text" 
                        icon={<Edit2 size={16} className="text-gray-600" />} 
                        onClick={() => handleEdit(record)} 
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div className="page-container" style={{ padding: '24px' }}>
            <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings className="text-purple-500" size={28} />
                        Context-as-Code: MCP Tools UI
                    </Title>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                        Configure required business contexts and policies for tools. Toggling a tool forces playbooks to import dependent context rules.
                    </Paragraph>
                </div>
                <Button icon={<RefreshCw size={16} />} onClick={loadTools} loading={loading}>
                    Refresh
                </Button>
            </div>

            <Card className="glass-card premium-shadow" style={{ minHeight: '60vh' }}>
                <div style={{ marginBottom: 16 }}>
                    <Input
                        placeholder="Search tools by name, key, or description..."
                        prefix={<Search size={16} className="text-gray-400" />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                        style={{ maxWidth: 400 }}
                    />
                </div>

                <Table 
                    dataSource={filteredTools} 
                    columns={columns} 
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Drawer
                title={`Configure Tool: ${editingTool?.name || ''}`}
                width={640}
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
                bodyStyle={{ paddingBottom: 80 }}
                extra={
                    <Space>
                        <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
                        <Button type="primary" onClick={handleSubmit} loading={loading}>
                            Save Configuration
                        </Button>
                    </Space>
                }
            >
                {editingTool && (
                    <Form
                        form={form}
                        layout="vertical"
                        hideRequiredMark
                    >
                        <Form.Item label="Tool Key (read-only)">
                            <Input value={editingTool.tool_key} disabled className="font-mono" />
                        </Form.Item>

                        <Form.Item label="Name (read-only)">
                            <Input value={editingTool.name} disabled />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Description"
                            rules={[{ required: true, message: 'Please enter a description' }]}
                        >
                            <Input.TextArea rows={3} />
                        </Form.Item>

                        <Form.Item
                            name="required_context_keys"
                            label={
                                <Space>
                                    <Key size={14} className="text-purple-500" />
                                    <span>Required Context Rules</span>
                                </Space>
                            }
                            tooltip="These rules will be dynamically forced into playbooks or steps whenever this tool is allowed."
                        >
                            <Select
                                mode="multiple"
                                placeholder="Select corporate policies (e.g. rules.finance.refund_policy)"
                                style={{ width: '100%' }}
                                tokenSeparators={[',']}
                                onChange={(val) => {
                                    form.setFieldsValue({ required_context_keys: val });
                                    const unloaded = val.filter(k => !registryContents[k]);
                                    if (unloaded.length > 0) {
                                        fetchRegistryContents(unloaded);
                                    }
                                }}
                            >
                                {contextKeys.map(key => (
                                    <Option key={key} value={key}>
                                        {key}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            noStyle
                            shouldUpdate={(prev, curr) => prev.required_context_keys !== curr.required_context_keys}
                        >
                            {({ getFieldValue }) => {
                                const keys: string[] = getFieldValue('required_context_keys') || [];
                                if (keys.length === 0) return null;
                                return (
                                    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                                        <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Context Code Editors (Saved on submit)</Text>
                                        <Card size="small" style={{ background: '#fafafa', maxHeight: '400px', overflowY: 'auto' }}>
                                            {keys.map(key => {
                                                const item = registryContents[key] || { format: 'yaml', content: '' };
                                                return (
                                                    <div key={key} style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                            <Tag color="purple" className="font-mono">{key}</Tag>
                                                            <Select
                                                                size="small"
                                                                value={item.format}
                                                                style={{ width: '80px' }}
                                                                onChange={(val: 'yaml' | 'json') => {
                                                                    setRegistryContents(prev => ({
                                                                        ...prev,
                                                                        [key]: { ...prev[key], format: val }
                                                                    }));
                                                                }}
                                                            >
                                                                <Option value="yaml">YAML</Option>
                                                                <Option value="json">JSON</Option>
                                                            </Select>
                                                        </div>
                                                        {item.format === 'json' ? (
                                                            <JsonEditor
                                                                value={item.content}
                                                                onChange={(val) => {
                                                                    setRegistryContents(prev => ({
                                                                        ...prev,
                                                                        [key]: { ...prev[key], content: val }
                                                                    }));
                                                                }}
                                                                rows={5}
                                                            />
                                                        ) : (
                                                            <YamlEditor
                                                                value={item.content}
                                                                onChange={(val) => {
                                                                    setRegistryContents(prev => ({
                                                                        ...prev,
                                                                        [key]: { ...prev[key], content: val }
                                                                    }));
                                                                }}
                                                                rows={5}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </Card>
                                    </div>
                                );
                            }}
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="requires_approval"
                                    label="Requires Action Approval"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="is_enabled"
                                    label="Is Tool Enabled"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item label="Input Schema (read-only)">
                            <Input.TextArea
                                name="input_schema_str"
                                disabled
                                rows={10}
                                style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '12px' }}
                            />
                        </Form.Item>
                    </Form>
                )}
            </Drawer>
        </div>
    );
};

export default McpToolsPage;
