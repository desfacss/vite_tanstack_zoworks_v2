import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, Tabs, Row, Col, message, Divider, Typography, Button, Space, InputNumber, Slider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgentRecord } from '../types';
import JsonEditor from './JsonEditor';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

// Props interface matching GlobalActions expectations
interface AgentFormProps {
    entityType: string;
    parentEditItem?: AgentRecord | null;
    onSuccess: () => void;
    onClose: () => void;
}

const PROVIDERS = [
    { label: 'Gemini', value: 'gemini' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'Anthropic', value: 'anthropic' },
];

const MODELS = [
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', provider: 'gemini' },
    { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', provider: 'gemini' },
    { label: 'Gemini 2.0 Flash Exp', value: 'gemini-2.0-flash-exp', provider: 'gemini' },
    { label: 'GPT-4o', value: 'gpt-4o', provider: 'openai' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini', provider: 'openai' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-latest', provider: 'anthropic' },
];

const AGENT_PATTERNS = [
    { label: 'ReAct', value: 'react' },
    { label: 'Router', value: 'router' },
    { label: 'Planner', value: 'planner' },
    { label: 'Workflow', value: 'workflow' },
    { label: 'Autonomous', value: 'autonomous' },
    { label: 'Swarm', value: 'swarm' },
];

const defaultModelConfig = {
    temp: 0.7,
    model: 'gemini-2.0-flash-exp',
    provider: 'gemini',
    max_tokens: 4096
};

const defaultPlanningConfig: any = {
    agent_pattern: ['react', 'router'],
    entities_access: {},
    allowed_patterns: ['react', 'router'],
    routing_entities: [],
    routing_keywords: [],
    presentation_strategy: {
        preferred_formats: ['table', 'summary'],
        strict_enforcement: {
            create: 'JSON',
            update: 'JSON'
        }
    }
};

const AgentForm: React.FC<AgentFormProps> = ({
    parentEditItem,
    onSuccess,
    onClose
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState<AgentRecord[]>([]);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const { organization } = useAuthStore();

    // Determine mode based on parentEditItem
    const mode = parentEditItem ? 'edit' : 'create';
    const initialData = parentEditItem;

    useEffect(() => {
        loadAgents();
        loadOrganizations();
        
        if (initialData && mode === 'edit') {
            const config = initialData.config || {};
            form.setFieldsValue({
                ...initialData,
                model_config: initialData.model_config || defaultModelConfig,
                planning_config: initialData.planning_config || defaultPlanningConfig,
                // Extract common config fields for UI widgets
                config_routing_entities: config.routing?.entities || [],
                config_routing_keywords: config.routing?.keywords || [],
                config_patterns: config.patterns || [],
                // The editor will show everything except what we extracted (optional)
                // For simplicity, we'll keep the full JSON in the editor but synced
                config: JSON.stringify(config, null, 2),
                semantics: initialData.semantics || {},
            });
        } else {
            form.setFieldsValue({
                role_level: 'specialist',
                is_active: true,
                agent_layer: 3,
                domain: 'global',
                organization_id: organization?.id,
                model_config: defaultModelConfig,
                planning_config: defaultPlanningConfig,
                config_routing_entities: [],
                config_routing_keywords: [],
                config_patterns: [],
                config: '{}',
                semantics: {},
            });
        }
    }, [initialData, mode, form, organization]);

    const loadAgents = async () => {
        try {
            const { data, error } = await supabase
                .from('agents')
                .select('agent_key, name, role_level')
                .eq('organization_id', organization?.id)
                .order('name');
            
            if (!error && data) {
                setAgents(data as AgentRecord[]);
            }
        } catch (err) {
            console.error('Error loading agents:', err);
        }
    };

    const loadOrganizations = async () => {
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .order('name');
            
            if (!error && data) {
                setOrganizations(data);
            }
        } catch (err) {
            console.error('Error loading organizations:', err);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // Parse config if it's a string (from JsonEditor)
            let configObj: any = {};
            try {
                configObj = typeof values.config === 'string' ? JSON.parse(values.config || '{}') : values.config || {};
            } catch (e) {
                message.error('Invalid JSON in System Config');
                setLoading(false);
                return;
            }

            // Sync from UI widgets back to config object
            if (values.config_routing_entities || values.config_routing_keywords) {
                configObj.routing = {
                    ...(configObj.routing || {}),
                    entities: values.config_routing_entities || [],
                    keywords: values.config_routing_keywords || [],
                };
            }
            if (values.config_patterns) {
                configObj.patterns = values.config_patterns;
            }

            // Directly use objects from form
            const payload: Partial<AgentRecord> = {
                ...values,
                config: configObj,
                organization_id: values.organization_id || organization?.id,
            };

            // Clean up temporary form fields
            delete (payload as any).config_routing_entities;
            delete (payload as any).config_routing_keywords;
            delete (payload as any).config_patterns;

            if (mode === 'create') {
                const { error } = await supabase
                    .schema('ai_mcp')
                    .from('agents')
                    .insert([payload]);

                if (error) throw error;
                message.success('Agent created successfully');
            } else {
                const { error } = await supabase
                    .schema('ai_mcp')
                    .from('agents')
                    .update(payload)
                    .eq('agent_key', initialData?.agent_key);

                if (error) throw error;
                message.success('Agent updated successfully');
            }

            onSuccess();
        } catch (error: any) {
            console.error('Error saving agent:', error);
            message.error(error.message || 'Failed to save agent');
        } finally {
            setLoading(false);
        }
    };

    // Sub-components for dynamic lists
    const EntitiesAccessInput = ({ value = {}, onChange }: { value?: Record<string, string>, onChange?: (val: Record<string, string>) => void }) => {
        const rules = Object.entries(value).map(([entity, access]) => ({ entity, access: access as string }));

        const handleRuleChange = (index: number, key: 'entity' | 'access', val: string) => {
            const newRules = [...rules];
            newRules[index] = { ...newRules[index], [key]: val };
            const newValue = Object.fromEntries(newRules.map(r => [r.entity, r.access]));
            onChange?.(newValue);
        };

        const addRule = () => {
            onChange?.({ ...value, '': 'READ' });
        };

        const removeRule = (entity: string) => {
            const newValue = { ...value };
            delete newValue[entity];
            onChange?.(newValue);
        };

        return (
            <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
                <Title level={5} style={{ fontSize: '14px', marginBottom: '12px' }}>Entities Access Rules</Title>
                {rules.map((rule, idx) => (
                    <Row key={idx} gutter={8} style={{ marginBottom: '8px' }}>
                        <Col span={14}>
                            <Input 
                                placeholder="schema.table" 
                                size="small"
                                value={rule.entity} 
                                onChange={e => handleRuleChange(idx, 'entity', e.target.value)}
                            />
                        </Col>
                        <Col span={7}>
                            <Select 
                                value={rule.access} 
                                size="small"
                                style={{ width: '100%' }}
                                onChange={val => handleRuleChange(idx, 'access', val)}
                            >
                                <Option value="READ">READ</Option>
                                <Option value="CRUD">CRUD</Option>
                                <Option value="ADMIN">ADMIN</Option>
                            </Select>
                        </Col>
                        <Col span={3}>
                            <Button 
                                type="text" 
                                size="small"
                                danger 
                                icon={<DeleteOutlined />} 
                                onClick={() => removeRule(rule.entity)} 
                            />
                        </Col>
                    </Row>
                ))}
                <Button type="dashed" size="small" onClick={addRule} block icon={<PlusOutlined />}>
                    Add Access Rule
                </Button>
            </div>
        );
    };

    const tabItems = [
        {
            key: 'basic',
            label: 'Basic Info',
            children: (
                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <Form.Item
                            name="agent_key"
                            label="Agent Key"
                            rules={[{ required: true, message: 'Please enter agent key' }]}
                        >
                            <Input placeholder="e.g., my_agent" disabled={mode === 'edit'} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="name"
                            label="Name"
                            rules={[{ required: true, message: 'Please enter name' }]}
                        >
                            <Input placeholder="e.g., My Custom Agent" />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item name="description" label="Description">
                            <TextArea rows={2} placeholder="Brief description of what this agent does" />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            name="system_prompt"
                            label="System Prompt"
                            rules={[{ required: true, message: 'Please enter system prompt' }]}
                        >
                            <TextArea
                                rows={6}
                                placeholder="You are a helpful assistant. Your role is to..."
                            />
                        </Form.Item>
                    </Col>
                </Row>
            )
        },
        {
            key: 'config',
            label: 'Configuration',
            children: (
                <Row gutter={[16, 16]}>
                    <Col span={8}>
                        <Form.Item name="role_level" label="Role Level">
                            <Select size="small">
                                <Select.Option value="specialist">Specialist</Select.Option>
                                <Select.Option value="orchestrator">Orchestrator</Select.Option>
                                <Select.Option value="supervisor">Supervisor</Select.Option>
                                <Select.Option value="router">Router</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="agent_layer" label="Agent Layer">
                            <InputNumber size="small" style={{ width: '100%' }} min={0} max={10} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="domain" label="Domain">
                            <Input size="small" placeholder="e.g., global" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="parent_agent_key" label="Parent Agent">
                            <Select size="small" allowClear placeholder="Select parent agent">
                                {agents.map(agent => (
                                    <Select.Option key={agent.agent_key} value={agent.agent_key}>
                                        {agent.name} ({agent.role_level})
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="required_module_key" label="Required Module">
                            <Select size="small" allowClear placeholder="Select module">
                                <Select.Option value="hr">HR</Select.Option>
                                <Select.Option value="crm">CRM</Select.Option>
                                <Select.Option value="ctrm">CTRM</Select.Option>
                                <Select.Option value="support">Support</Select.Option>
                                <Select.Option value="ai">AI</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="organization_id" label="Organization">
                            <Select size="small" allowClear placeholder="Select organization (optional)">
                                {organizations.map(org => (
                                    <Select.Option key={org.id} value={org.id}>
                                        {org.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="is_active" label="Active" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Col>
                </Row>
            )
        },
        {
            key: 'model',
            label: 'Model Config',
            children: (
                <div style={{ padding: '4px' }}>
                    <Row gutter={[24, 16]}>
                        <Col span={12}>
                            <Form.Item name={['model_config', 'provider']} label="AI Provider">
                                <Select size="small" options={PROVIDERS} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name={['model_config', 'model']} label="Model Name">
                                <Select 
                                    size="small"
                                    showSearch 
                                    options={MODELS} 
                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name={['model_config', 'temp']} label="Temperature">
                                <Row gutter={12} align="middle">
                                    <Col span={16}>
                                        <Slider min={0} max={1} step={0.1} />
                                    </Col>
                                    <Col span={8}>
                                        <InputNumber size="small" min={0} max={1} step={0.1} style={{ width: '100%' }} />
                                    </Col>
                                </Row>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name={['model_config', 'max_tokens']} label="Max Tokens">
                                <InputNumber size="small" style={{ width: '100%' }} min={1} step={1024} />
                            </Form.Item>
                        </Col>
                    </Row>
                </div>
            )
        },
        {
            key: 'planning',
            label: 'Planning Config',
            children: (
                <div style={{ padding: '4px' }}>
                    <Row gutter={[24, 16]}>
                        <Col span={12}>
                            <Form.Item name={['planning_config', 'agent_pattern']} label="Agent Patterns">
                                <Select size="small" mode="tags" placeholder="Select patterns" options={AGENT_PATTERNS} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name={['planning_config', 'allowed_patterns']} label="Allowed Patterns">
                                <Select size="small" mode="tags" placeholder="Select allowed patterns" options={AGENT_PATTERNS} />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name={['planning_config', 'routing_entities']} label="Routing Entities">
                                <Select size="small" mode="tags" placeholder="e.g., deals, leads, accounts" tokenSeparators={[',']} />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name={['planning_config', 'routing_keywords']} label="Routing Keywords">
                                <Select size="small" mode="tags" placeholder="Add keywords for routing" tokenSeparators={[',']} />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name={['planning_config', 'entities_access']}>
                                <EntitiesAccessInput />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name={['planning_config', 'presentation_strategy', 'preferred_formats']} label="Preferred Presentation Formats">
                                <Select size="small" mode="tags" placeholder="e.g., table, summary, chart">
                                    <Select.Option value="table">Table</Select.Option>
                                    <Select.Option value="summary">Summary</Select.Option>
                                    <Select.Option value="chart">Chart</Select.Option>
                                    <Select.Option value="bar_chart">Bar Chart</Select.Option>
                                    <Select.Option value="markdown">Markdown</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </div>
            )
        },
        {
            key: 'advanced',
            label: 'Advanced',
            children: (
                <Row gutter={[24, 12]}>
                    <Col span={24}>
                        <Title level={5}>Semantics & Scope</Title>
                        <Divider style={{ margin: '4px 0 12px' }} />
                    </Col>
                    <Col span={24}>
                        <Form.Item name={['semantics', 'role']} label="Semantic Role">
                            <TextArea rows={2} placeholder="Explain the agent's persona semantically" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name={['semantics', 'positive_scope']} label="Positive Scope">
                            <TextArea rows={3} placeholder="What this agent IS responsible for" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name={['semantics', 'negative_scope']} label="Negative Scope">
                            <TextArea rows={3} placeholder="What this agent IS NOT responsible for" />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item name={['semantics', 'handoff_to']} label="Allowed Handoffs">
                            <Select size="small" mode="multiple" placeholder="Select target agents">
                                {agents.map(agent => (
                                    <Select.Option key={agent.agent_key} value={agent.agent_key}>
                                        {agent.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    
                    <Col span={24}>
                        <Title level={5}>Extra System Routing</Title>
                        <Divider style={{ margin: '4px 0 12px' }} />
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="config_routing_entities" label="System Routing Entities">
                                    <Select size="small" mode="tags" placeholder="Entities in extra config" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="config_routing_keywords" label="System Routing Keywords">
                                    <Select size="small" mode="tags" placeholder="Keywords in extra config" />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item name="config_patterns" label="System Patterns">
                                    <Select size="small" mode="tags" placeholder="Patterns in extra config" options={AGENT_PATTERNS} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Col>

                    <Col span={24}>
                        <Title level={5}>Miscellaneous Config (JSON)</Title>
                        <Divider style={{ margin: '4px 0 12px' }} />
                        <Form.Item name="config">
                            <JsonEditor
                                placeholder="Additional system config JSON"
                                rows={6}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            )
        }
    ];

    return (
        <div style={{ height: '70vh', overflowY: 'auto', paddingRight: '12px' }}>
            <Form
                form={form}
                layout="vertical"
                requiredMark="optional"
            >
                <Tabs items={tabItems} />
            </Form>
            
            <div style={{ 
                position: 'sticky', 
                bottom: 0, 
                background: '#fff', 
                padding: '16px 0', 
                borderTop: '1px solid #f0f0f0',
                zIndex: 10,
                textAlign: 'right'
            }}>
                <Space>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="primary" onClick={handleSubmit} loading={loading}>
                        {mode === 'create' ? 'Create Agent' : 'Update Agent'}
                    </Button>
                </Space>
            </div>
        </div>
    );
};

export default AgentForm;
