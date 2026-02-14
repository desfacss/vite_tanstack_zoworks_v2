import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, Tabs, Row, Col, message, Divider, Typography, Button, Space } from 'antd';
import { AgentRecord } from '../types';
import JsonEditor from './JsonEditor';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

// Props interface matching GlobalActions expectations
interface AgentFormProps {
    entityType: string;
    parentEditItem?: AgentRecord | null;
    onSuccess: () => void;
    onClose: () => void;
}

const defaultModelConfig = {
    temp: 0.7,
    model: 'gemini-2.0-flash-exp',
    provider: 'gemini',
    max_tokens: 4096
};

const defaultPlanningConfig = {
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
    entityType,
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
            form.setFieldsValue({
                agent_key: initialData.agent_key,
                name: initialData.name,
                description: initialData.description || '',
                system_prompt: initialData.system_prompt,
                role_level: initialData.role_level || 'specialist',
                model_config: JSON.stringify(initialData.model_config || defaultModelConfig, null, 2),
                planning_config: JSON.stringify(initialData.planning_config || defaultPlanningConfig, null, 2),
                organization_id: initialData.organization_id,
                is_active: initialData.is_active !== false,
                parent_agent_key: initialData.parent_agent_key,
                required_module_key: initialData.required_module_key,
                agent_layer: initialData.agent_layer || 3,
                domain: initialData.domain || 'global',
                config: JSON.stringify(initialData.config || {}, null, 2),
                semantics: JSON.stringify(initialData.semantics || {}, null, 2),
            });
        } else {
            form.setFieldsValue({
                role_level: 'specialist',
                is_active: true,
                agent_layer: 3,
                domain: 'global',
                organization_id: organization?.id,
                model_config: JSON.stringify(defaultModelConfig, null, 2),
                planning_config: JSON.stringify(defaultPlanningConfig, null, 2),
                config: JSON.stringify({}, null, 2),
                semantics: JSON.stringify({}, null, 2),
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

    const validateJSON = (jsonString: string): boolean => {
        try {
            JSON.parse(jsonString || '{}');
            return true;
        } catch {
            return false;
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            
            // Validate all JSON fields
            const jsonFields = ['model_config', 'planning_config', 'config', 'semantics'];
            for (const field of jsonFields) {
                if (!validateJSON(values[field])) {
                    message.error(`Invalid JSON in ${field}`);
                    return;
                }
            }

            setLoading(true);

            const payload: Partial<AgentRecord> = {
                agent_key: values.agent_key,
                name: values.name,
                description: values.description,
                system_prompt: values.system_prompt,
                role_level: values.role_level,
                model_config: JSON.parse(values.model_config || '{}'),
                planning_config: JSON.parse(values.planning_config || '{}'),
                organization_id: values.organization_id || organization?.id,
                is_active: values.is_active,
                parent_agent_key: values.parent_agent_key,
                required_module_key: values.required_module_key,
                agent_layer: values.agent_layer,
                domain: values.domain,
                config: JSON.parse(values.config || '{}'),
                semantics: JSON.parse(values.semantics || '{}'),
            };

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
                            <Select>
                                <Option value="specialist">Specialist</Option>
                                <Option value="orchestrator">Orchestrator</Option>
                                <Option value="supervisor">Supervisor</Option>
                                <Option value="router">Router</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="agent_layer" label="Agent Layer">
                            <Input type="number" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="domain" label="Domain">
                            <Input placeholder="e.g., global" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="parent_agent_key" label="Parent Agent">
                            <Select allowClear placeholder="Select parent agent">
                                {agents.map(agent => (
                                    <Option key={agent.agent_key} value={agent.agent_key}>
                                        {agent.name} ({agent.role_level})
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="required_module_key" label="Required Module">
                            <Select allowClear placeholder="Select module">
                                <Option value="hr">HR</Option>
                                <Option value="crm">CRM</Option>
                                <Option value="ctrm">CTRM</Option>
                                <Option value="support">Support</Option>
                                <Option value="ai">AI</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="organization_id" label="Organization">
                            <Select allowClear placeholder="Select organization (optional)">
                                {organizations.map(org => (
                                    <Option key={org.id} value={org.id}>
                                        {org.name}
                                    </Option>
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
                <div>
                    <Text type="secondary">Configure the AI model settings</Text>
                    <Divider />
                    <Form.Item name="model_config">
                        <JsonEditor
                            defaultValue={defaultModelConfig}
                            placeholder="Model configuration JSON"
                            rows={10}
                        />
                    </Form.Item>
                </div>
            )
        },
        {
            key: 'planning',
            label: 'Planning Config',
            children: (
                <div>
                    <Text type="secondary">Configure agent patterns, routing, and behavior</Text>
                    <Divider />
                    <Form.Item name="planning_config">
                        <JsonEditor
                            defaultValue={defaultPlanningConfig}
                            placeholder="Planning configuration JSON"
                            rows={15}
                        />
                    </Form.Item>
                </div>
            )
        },
        {
            key: 'advanced',
            label: 'Advanced',
            children: (
                <Row gutter={[16, 16]}>
                    <Col span={24}>
                        <Title level={5}>Additional Configuration</Title>
                        <Form.Item name="config">
                            <JsonEditor
                                placeholder="Additional config JSON"
                                rows={8}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Title level={5}>Semantics</Title>
                        <Form.Item name="semantics">
                            <JsonEditor
                                placeholder="Semantics JSON"
                                rows={8}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            )
        }
    ];

    return (
        <div>
            <Form
                form={form}
                layout="vertical"
                requiredMark="optional"
            >
                <Tabs items={tabItems} />
            </Form>
            
            <Divider />
            
            <Space style={{ float: 'right' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="primary" onClick={handleSubmit} loading={loading}>
                    {mode === 'create' ? 'Create' : 'Update'}
                </Button>
            </Space>
        </div>
    );
};

export default AgentForm;
