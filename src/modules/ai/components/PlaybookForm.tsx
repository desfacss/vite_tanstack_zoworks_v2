import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, message, Typography, Divider, Switch, Card, Popconfirm, Select } from 'antd';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import JsonEditor from '@/modules/ai/components/JsonEditor';
import YamlEditor from '@/modules/ai/components/YamlEditor';
import { useAuthStore } from '@/core/lib/store';
import { PlaybookRecord, PlaybookStepRecord } from '../types';

const { Title, Text } = Typography;

interface PlaybookFormProps {
    parentEditItem?: PlaybookRecord;
    record?: PlaybookRecord;
    onClose: () => void;
    onSuccess?: () => void;
}

/**
 * PlaybookForm component
 * Handles management of playbooks and their nested steps
 */
const PlaybookForm: React.FC<PlaybookFormProps> = ({ 
    parentEditItem,
    record: recordProp,
    onClose, 
    onSuccess 
}) => {
    const record = parentEditItem || recordProp;
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [steps, setSteps] = useState<Partial<PlaybookStepRecord>[]>([]);
    const [contextKeys, setContextKeys] = useState<string[]>([]);
    const [mcpTools, setMcpTools] = useState<string[]>([]);
    const [registryContents, setRegistryContents] = useState<Record<string, { id?: string; format: 'yaml' | 'json'; content: string }>>({});
    const { organization } = useAuthStore();
    const isEdit = !!record?.id;

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

    const loadContextKeys = async () => {
        try {
            const { data, error } = await supabase
                .schema('ai_mcp')
                .from('context_registry')
                .select('key')
                .order('key', { ascending: true });
            if (!error && data) {
                setContextKeys(data.map(r => r.key));
            }
        } catch (err) {
            console.error('Error loading context keys:', err);
        }
    };

    const loadMcpTools = async () => {
        try {
            const { data, error } = await supabase
                .schema('ai_mcp')
                .from('mcp_tools')
                .select('tool_key')
                .eq('is_enabled', true)
                .order('name', { ascending: true });
            if (!error && data) {
                setMcpTools(data.map(r => r.tool_key));
            }
        } catch (err) {
            console.error('Error loading mcp tools:', err);
        }
    };

    // Fetch steps if editing
    useEffect(() => {
        loadContextKeys();
        loadMcpTools();

        const fetchSteps = async () => {
            if (isEdit && record?.id) {
                const { data, error } = await supabase
                    .schema('ai_mcp')
                    .from('playbook_steps')
                    .select('*')
                    .eq('playbook_id', record.id)
                    .order('position', { ascending: true });
                
                if (error) {
                    message.error('Failed to load playbook steps');
                } else if (data) {
                    const stepRecords = data.map(s => ({
                        ...s,
                        static_context_keys: s.static_context_keys || [],
                        allowed_tools: s.allowed_tools || [],
                        allowed_entities: s.allowed_entities || [],
                    }));
                    setSteps(stepRecords);

                    // Collect all static context keys from steps
                    const stepKeys = stepRecords.flatMap(s => s.static_context_keys || []);
                    const allKeys = Array.from(new Set([...(record.static_context_keys || []), ...stepKeys]));
                    if (allKeys.length > 0) {
                        fetchRegistryContents(allKeys);
                    }
                }
            } else if (record && record.static_context_keys && record.static_context_keys.length > 0) {
                fetchRegistryContents(record.static_context_keys);
            }
        };

        if (record) {
            form.setFieldsValue({
                ...record,
                static_context_keys: record.static_context_keys || []
            });
            fetchSteps();
        } else {
            form.resetFields();
            setSteps([]);
        }
    }, [record, form, isEdit]);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Save all context registry changes first
            const allSelectedKeys = Array.from(new Set([
                ...(values.static_context_keys || []),
                ...steps.flatMap(s => s.static_context_keys || [])
            ]));
            const orgId = record?.organization_id || organization?.id || '00000000-0000-0000-0000-000000000000';

            for (const key of allSelectedKeys) {
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

            // 1. Save Playbook (Parent)
            const playbookPayload = {
                name: values.name,
                description: values.description,
                trigger_command: values.trigger_command,
                static_context_keys: values.static_context_keys || [],
            };

            let playbookId = record?.id;
            let error;

            if (isEdit) {
                const { error: updateError } = await supabase
                    .schema('ai_mcp')
                    .from('playbooks')
                    .update(playbookPayload)
                    .eq('id', playbookId);
                error = updateError;
            } else {
                const { data: newData, error: insertError } = await supabase
                    .schema('ai_mcp')
                    .from('playbooks')
                    .insert(playbookPayload)
                    .select()
                    .single();
                error = insertError;
                playbookId = newData?.id;
            }

            if (error) throw error;
            if (!playbookId) throw new Error('Failed to retrieve playbook ID');

            // 2. Save Steps (Children)
            // Strategy: Simple approach is to delete all existing steps and re-insert 
            // OR use upsert if they have IDs. Since we are doing inline management, 
            // we'll use a combination or just upsert.
            
            // First, find steps to delete (if any were removed from local state)
            if (isEdit) {
                const currentStepIds = steps.map(s => s.id).filter(Boolean);
                const { error: deleteError } = await supabase
                    .schema('ai_mcp')
                    .from('playbook_steps')
                    .delete()
                    .eq('playbook_id', playbookId)
                    .not('id', 'in', `(${currentStepIds.join(',') || '00000000-0000-0000-0000-000000000000'})`);
                
                if (deleteError) throw deleteError;
            }

            // Prepare steps for upsert
            const stepsToSave = steps.map((step, index) => ({
                ...step,
                playbook_id: playbookId,
                position: index + 1, // Ensure position is sequential
                execution_logic: typeof step.execution_logic === 'string' 
                    ? JSON.parse(step.execution_logic) 
                    : (step.execution_logic || {}),
                static_context_keys: step.static_context_keys || [],
                allowed_tools: step.allowed_tools || [],
                allowed_entities: step.allowed_entities || [],
            }));

            if (stepsToSave.length > 0) {
                const { error: stepsError } = await supabase
                    .schema('ai_mcp')
                    .from('playbook_steps')
                    .upsert(stepsToSave);
                
                if (stepsError) throw stepsError;
            }

            message.success(`Playbook ${isEdit ? 'updated' : 'created'} successfully`);
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Error saving playbook:', error);
            message.error(`Failed to save playbook: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const addStep = () => {
        setSteps([...steps, { 
            name: 'New Step', 
            instruction: '', 
            position: steps.length + 1,
            is_auto_execute: true,
            static_context_keys: [],
            allowed_tools: [],
            allowed_entities: []
        }]);
    };

    const removeStep = (index: number) => {
        const newSteps = [...steps];
        newSteps.splice(index, 1);
        setSteps(newSteps);
    };

    const updateStep = (index: number, field: string, value: any) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="p-4"
        >
            <Title level={4}>{isEdit ? 'Edit Playbook' : 'New Playbook'}</Title>
            <Divider />

            <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item
                    name="name"
                    label="Playbook Name"
                    rules={[{ required: true, message: 'Please enter name' }]}
                    style={{ flex: 2 }}
                >
                    <Input placeholder="e.g. Candidate Processing Pipeline" />
                </Form.Item>
                <Form.Item
                    name="trigger_command"
                    label="Trigger Command"
                    style={{ flex: 1 }}
                >
                    <Input placeholder="e.g. /process_candidate" />
                </Form.Item>
            </div>

            <Form.Item
                name="description"
                label="Description"
            >
                <Input.TextArea rows={2} placeholder="Brief summary of what this playbook does..." />
            </Form.Item>

            <Form.Item
                name="static_context_keys"
                label="Playbook Context Rules"
                tooltip="Global context rules applied to the entire playbook."
            >
                <Select
                    mode="multiple"
                    placeholder="Select context rules to apply..."
                    style={{ width: '100%' }}
                    onChange={(val) => {
                        form.setFieldsValue({ static_context_keys: val });
                        const unloaded = val.filter(k => !registryContents[k]);
                        if (unloaded.length > 0) {
                            fetchRegistryContents(unloaded);
                        }
                    }}
                >
                    {contextKeys.map(key => (
                        <Select.Option key={key} value={key}>{key}</Select.Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.static_context_keys !== curr.static_context_keys}
            >
                {({ getFieldValue }) => {
                    const keys: string[] = getFieldValue('static_context_keys') || [];
                    if (keys.length === 0) return null;
                    return (
                        <div style={{ marginBottom: '16px' }}>
                            <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Playbook Context Editors (Saved on submit)</Text>
                            <Card size="small" style={{ background: '#fafafa', maxHeight: '300px', overflowY: 'auto' }}>
                                {keys.map(key => {
                                    const item = registryContents[key] || { format: 'yaml', content: '' };
                                    return (
                                        <div key={key} style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{key}</span>
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
                                                    <Select.Option value="yaml">YAML</Select.Option>
                                                    <Select.Option value="json">JSON</Select.Option>
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

            <Divider orientation="left">Playbook Steps</Divider>
            
            <div className="space-y-4 mb-6">
                {steps.map((step, index) => (
                    <Card 
                        key={step.id || `new-${index}`} 
                        size="small" 
                        className="relative border-l-4 border-l-blue-500 shadow-sm"
                        title={<Space><GripVertical size={14} className="text-gray-400" /> <Text strong>Step {index + 1}</Text></Space>}
                        extra={
                            <Popconfirm title="Remove this step?" onConfirm={() => removeStep(index)}>
                                <Button type="text" danger icon={<Trash2 size={16} />} />
                            </Popconfirm>
                        }
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Step Name" required>
                                <Input 
                                    value={step.name} 
                                    onChange={(e) => updateStep(index, 'name', e.target.value)} 
                                />
                            </Form.Item>
                            <Form.Item label="Step Key (unique)">
                                <Input 
                                    value={step.step_key} 
                                    onChange={(e) => updateStep(index, 'step_key', e.target.value)} 
                                    placeholder="e.g. human_review"
                                />
                            </Form.Item>
                        </div>
                        
                        <Form.Item label="Instruction" required>
                            <Input.TextArea 
                                rows={2} 
                                value={step.instruction} 
                                onChange={(e) => updateStep(index, 'instruction', e.target.value)} 
                                placeholder="Detailed AI instructions for this step..."
                            />
                        </Form.Item>

                        <div className="grid grid-cols-3 gap-4 items-end">
                            <Form.Item label="Required Tool">
                                <Input 
                                    value={step.required_tool_key} 
                                    onChange={(e) => updateStep(index, 'required_tool_key', e.target.value)} 
                                    placeholder="e.g. screen_candidate"
                                />
                            </Form.Item>
                            <Form.Item label="Auto Execute">
                                <Switch 
                                    checked={step.is_auto_execute} 
                                    onChange={(val) => updateStep(index, 'is_auto_execute', val)} 
                                />
                            </Form.Item>
                            <Form.Item label="Execution Logic (JSON)">
                                <JsonEditor 
                                    value={typeof step.execution_logic === 'string' ? step.execution_logic : JSON.stringify(step.execution_logic || {}, null, 2)} 
                                    onChange={(val) => updateStep(index, 'execution_logic', val)}
                                    rows={4}
                                />
                            </Form.Item>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <Form.Item label="Step Context Rules">
                                <Select
                                    mode="multiple"
                                    placeholder="Bind context rules..."
                                    style={{ width: '100%' }}
                                    value={step.static_context_keys || []}
                                    onChange={(val) => {
                                        updateStep(index, 'static_context_keys', val);
                                        const unloaded = val.filter(k => !registryContents[k]);
                                        if (unloaded.length > 0) {
                                            fetchRegistryContents(unloaded);
                                        }
                                    }}
                                >
                                    {contextKeys.map(k => (
                                        <Select.Option key={k} value={k}>{k}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item label="Step Tool Permissions">
                                <Select
                                    mode="multiple"
                                    placeholder="Permitted tools..."
                                    style={{ width: '100%' }}
                                    value={step.allowed_tools || []}
                                    onChange={(val) => updateStep(index, 'allowed_tools', val)}
                                >
                                    {mcpTools.map(t => (
                                        <Select.Option key={t} value={t}>{t}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item label="Step Data Permissions">
                                <Select
                                    mode="tags"
                                    placeholder="Allowed entities..."
                                    style={{ width: '100%' }}
                                    value={step.allowed_entities || []}
                                    onChange={(val) => updateStep(index, 'allowed_entities', val)}
                                    tokenSeparators={[',']}
                                >
                                    <Select.Option value="crm.leads">crm.leads</Select.Option>
                                    <Select.Option value="crm.deals">crm.deals</Select.Option>
                                    <Select.Option value="crm.contacts">crm.contacts</Select.Option>
                                    <Select.Option value="accounting.invoices">accounting.invoices</Select.Option>
                                    <Select.Option value="ctrm.trades">ctrm.trades</Select.Option>
                                    <Select.Option value="ctrm.contracts">ctrm.contracts</Select.Option>
                                </Select>
                            </Form.Item>
                        </div>

                        {step.static_context_keys && step.static_context_keys.length > 0 && (
                            <div style={{ marginTop: '16px' }}>
                                <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>Step Context Editors (Saved on submit)</Text>
                                <Card size="small" style={{ background: '#fafafa', maxHeight: '250px', overflowY: 'auto' }}>
                                    {step.static_context_keys.map(key => {
                                        const item = registryContents[key] || { format: 'yaml', content: '' };
                                        return (
                                            <div key={key} style={{ marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '12px' }}>{key}</span>
                                                    <Select
                                                        size="small"
                                                        value={item.format}
                                                        style={{ width: '70px' }}
                                                        onChange={(val: 'yaml' | 'json') => {
                                                            setRegistryContents(prev => ({
                                                                ...prev,
                                                                [key]: { ...prev[key], format: val }
                                                            }));
                                                        }}
                                                    >
                                                        <Select.Option value="yaml">YAML</Select.Option>
                                                        <Select.Option value="json">JSON</Select.Option>
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
                                                        rows={4}
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
                                                        rows={4}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </Card>
                            </div>
                        )}
                    </Card>
                ))}
                
                <Button 
                    type="dashed" 
                    onClick={addStep} 
                    block 
                    icon={<Plus size={16} />}
                >
                    Add Step
                </Button>
            </div>

            <Divider />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading} disabled={steps.length === 0}>
                    {isEdit ? 'Update Playbook' : 'Create Playbook'}
                </Button>
            </div>
        </Form>
    );
};

export default PlaybookForm;
