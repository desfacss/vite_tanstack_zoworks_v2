import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, message, Typography, Divider, Switch, Card, Popconfirm } from 'antd';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import JsonEditor from '@/modules/ai/components/JsonEditor';
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
    const isEdit = !!record?.id;

    // Fetch steps if editing
    useEffect(() => {
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
                    setSteps(data);
                }
            }
        };

        if (record) {
            form.setFieldsValue(record);
            fetchSteps();
        } else {
            form.resetFields();
            setSteps([]);
        }
    }, [record, form, isEdit]);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // 1. Save Playbook (Parent)
            const playbookPayload = {
                name: values.name,
                description: values.description,
                trigger_command: values.trigger_command,
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
                    : (step.execution_logic || {})
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
            is_auto_execute: true 
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
