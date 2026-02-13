import React from 'react';
import { Form, Select, InputNumber, Button, Space, Mentions, Input, Typography, Tag } from 'antd';

const { Text } = Typography;
const { Option } = Select;
import { useQuery } from '@tanstack/react-query';
import { supabase, getOrganizationId } from '@/lib/supabase';
import { useTeamMembers } from '../../hooks/useConversationActions';
import { useMetaTemplates } from '../../hooks/useMetaTemplates';

export interface StepData {
    id: string;
    stepType: 'message' | 'delay' | 'action';
    content: {
        action_type?: 'assign_agent' | 'update_status';
        action_value?: string;
        template_name?: string;
        template_params?: Record<string, string>;
        text?: string;
        delay_hours?: number;
        trigger_payload?: string;
        button_text?: string;
    };
    parent_step_id?: string | null;
    position?: { x: number; y: number };
}

interface StepEditorFormProps {
    step: StepData | null;
    parentStep?: StepData | null;
    onSave: (values: any) => void;
    onDelete?: () => void;
    onCancel: () => void;
}

export const StepEditorForm: React.FC<StepEditorFormProps> = ({ step, parentStep, onSave, onDelete, onCancel }) => {
    const [form] = Form.useForm();
    const { data: templates = [] } = useMetaTemplates();
    const { data: teamMembers = [] } = useTeamMembers();

    // Fetch Variables
    const { data: variables } = useQuery({
        queryKey: ['variables'],
        queryFn: async () => {
            const organizationId = await getOrganizationId();
            const { data, error } = await supabase
                .from('wa_variable_definitions')
                .select('*')
                .eq('organization_id', organizationId)
                .order('name', { ascending: true });

            if (error) throw error;
            return data;
        }
    });

    React.useEffect(() => {
        if (step) {
            form.setFieldsValue({
                stepType: step.stepType,
                ...step.content
            });
        } else {
            form.resetFields();
        }
    }, [step, form]);

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            const stepType = values.stepType;
            let content: any = {};

            if (stepType === 'message') {
                const cleanedParams: Record<string, string> = {};
                if (values.template_params) {
                    Object.keys(values.template_params).forEach(key => {
                        cleanedParams[key] = (values.template_params[key] || '').replace(/@\{\{/g, '{{').replace(/\{\{\{\{/g, '{{');
                    });
                }

                const cleanedText = (values.text || '').replace(/@\{\{/g, '{{').replace(/\{\{\{\{/g, '{{');

                content = {
                    template_name: values.template_name,
                    template_params: cleanedParams,
                    text: cleanedText
                };
            } else if (stepType === 'delay') {
                content = {
                    delay_hours: values.delay_hours
                };
            } else if (stepType === 'action') {
                content = {
                    action_type: values.action_type,
                    action_value: values.action_value
                };
            }

            // Common fields for branching
            if (values.trigger_payload) content.trigger_payload = values.trigger_payload;
            if (values.button_text) content.button_text = values.button_text;

            onSave({ stepType, content });
        });
    };

    return (
        <Form form={form} layout="vertical">
            <Form.Item name="stepType" label="Step Type" rules={[{ required: true }]}>
                <Select>
                    <Option value="message">Send Message</Option>
                    <Option value="delay">Time Delay</Option>
                    <Option value="action">Action (Automation)</Option>
                </Select>
            </Form.Item>

            {/* Branching Trigger Section - Only show if there is a parent to branch FROM and parent is NOT a Delay */}
            {parentStep && parentStep.stepType !== 'delay' && (
                <div style={{ marginBottom: 16, padding: 12, border: '1px dashed #d9d9d9', borderRadius: 8, background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong style={{ fontSize: 13 }}>
                            Channel Choice
                        </Text>
                        <Tag color="cyan">Branching</Tag>
                    </div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                        This step runs only when the user chooses a specific option from the previous message.
                    </Text>

                    <Form.Item
                        name="trigger_payload"
                        label="Wait for User to Click/Type:"
                        tooltip="Select a button from your previous template or type a keyword."
                    >
                        <Select
                            showSearch
                            allowClear
                            placeholder="Select a button or type keyword"
                            onSearch={(val) => form.setFieldValue('trigger_payload', val)}
                            onChange={(val) => {
                                if (!form.getFieldValue('button_text')) {
                                    form.setFieldValue('button_text', val);
                                }
                            }}
                        >
                            {(() => {
                                const parentTemplateName = parentStep?.content?.template_name;
                                const parentTemplate = templates.find((t: any) => t.name === parentTemplateName);
                                const buttons = parentTemplate?.components?.find((c: any) => c.type === 'BUTTONS')?.buttons || [];

                                if (parentTemplateName && buttons.length === 0) {
                                    return <Option disabled value="none">⚠️ Parent template has no buttons</Option>;
                                }

                                return buttons.map((btn: any, idx: number) => (
                                    <Option key={idx} value={btn.text}>{btn.text}</Option>
                                ));
                            })()}
                        </Select>
                    </Form.Item>

                    {/* Visual warning if branching from a plain text template */}
                    {(() => {
                        const parentTemplateName = parentStep?.content?.template_name;
                        const parentTemplate = templates.find((t: any) => t.name === parentTemplateName);
                        const hasButtons = parentTemplate?.components?.some((c: any) => c.type === 'BUTTONS');
                        if (parentTemplateName && !hasButtons) {
                            return (
                                <div style={{ marginTop: -10, marginBottom: 10 }}>
                                    <Text type="warning" style={{ fontSize: 11 }}>
                                        ⚠️ Note: This template has no buttons. Users must type the text exactly.
                                    </Text>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <Form.Item name="button_text" label="Visual Label for Flow" tooltip="Friendly label for the map viewer.">
                        <Input placeholder="e.g., Interested Branch" />
                    </Form.Item>
                </div>
            )}

            {/* If parent is a delay, explain that this is automatic */}
            {parentStep && parentStep.stepType === 'delay' && (
                <div style={{ marginBottom: 16, padding: 12, border: '1px solid #e6f7ff', borderRadius: 8, background: '#f5faff' }}>
                    <Text strong style={{ fontSize: 13, color: '#1890ff' }}>
                        ⚡ Automatic Follow-up
                    </Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                        Since the previous step is a <strong>Delay</strong>, this message will be sent automatically once the time is up.
                    </Text>
                </div>
            )}

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.stepType !== curr.stepType}>
                {({ getFieldValue }) => {
                    const stepType = getFieldValue('stepType');

                    if (stepType === 'message') {
                        return (
                            <>
                                <Form.Item name="template_name" label="Template (Optional)">
                                    <Select allowClear placeholder="Select a template" onChange={() => form.setFieldValue('template_params', {})}>
                                        {templates.map((t: any) => (
                                            <Option key={t.name} value={t.name}>{t.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.template_name !== curr.template_name}>
                                    {({ getFieldValue: getInnerFieldValue }) => {
                                        const templateName = getInnerFieldValue('template_name');
                                        const selectedTemplate = templates.find((t: any) => t.name === templateName);

                                        if (!selectedTemplate) return null;

                                        const body = selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || '';
                                        const matches = body.match(/\{\{(\d+)\}\}/g);
                                        const indices: string[] = matches ? (Array.from(new Set(matches.map((m: string) => m.match(/\d+/)?.[0] || ''))).filter(Boolean) as string[]) : [];
                                        const buttons = selectedTemplate.components?.find((c: any) => c.type === 'BUTTONS')?.buttons || [];

                                        return (
                                            <div style={{ marginBottom: 24 }}>
                                                {indices.length > 0 && (
                                                    <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                                            Variables in: "{body.substring(0, 50)}..."
                                                        </Text>
                                                        {indices.map((index: string) => (
                                                            <Form.Item
                                                                key={index}
                                                                name={['template_params', index]}
                                                                label={`Variable {{${index}}}`}
                                                                rules={[{ required: true, message: 'Required' }]}
                                                            >
                                                                <Mentions
                                                                    placeholder={`Value for {{${index}}}`}
                                                                    prefix={['@', '{{']}
                                                                    options={variables?.map((v: any) => ({
                                                                        value: v.variable_syntax,
                                                                        label: v.name,
                                                                    }))}
                                                                />
                                                            </Form.Item>
                                                        ))}
                                                    </div>
                                                )}

                                                {buttons.length > 0 && (
                                                    <div style={{ padding: 12, border: '1px solid #d9d9d9', borderRadius: 8, background: '#fafafa' }}>
                                                        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                                                            Template Buttons (Next Triggers):
                                                        </Text>
                                                        <Space wrap>
                                                            {buttons.map((btn: any, idx: number) => (
                                                                <Tag key={idx} color="blue">{btn.text}</Tag>
                                                            ))}
                                                        </Space>
                                                        <div style={{ marginTop: 8 }}>
                                                            <Text type="secondary" italic style={{ fontSize: 11 }}>
                                                                These buttons can trigger branches to following steps.
                                                            </Text>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                </Form.Item>

                                <Form.Item name="text" label="Or Custom Text">
                                    <Mentions
                                        rows={4}
                                        placeholder="Enter message text (if not using template). Use @ for variables."
                                        prefix={['@', '{{']}
                                        options={variables?.map((v: any) => ({
                                            value: v.variable_syntax,
                                            label: v.name,
                                        }))}
                                    />
                                </Form.Item>
                            </>
                        );
                    }

                    if (stepType === 'delay') {
                        return (
                            <Form.Item
                                name="delay_hours"
                                label="Delay Amount (Hours)"
                                rules={[{ required: true, message: 'Please enter delay' }]}
                                extra="Tip: 0.01h is about 36 seconds (helpful for testing)."
                            >
                                <InputNumber
                                    min={0.01}
                                    max={720}
                                    step={0.01}
                                    style={{ width: '100%' }}
                                    placeholder="e.g. 24"
                                />
                            </Form.Item>
                        );
                    }

                    if (stepType === 'action') {
                        return (
                            <>
                                <Form.Item name="action_type" label="Action To Perform" rules={[{ required: true }]}>
                                    <Select placeholder="Select an action">
                                        <Option value="assign_agent">Assign to Agent</Option>
                                        <Option value="update_status">Update Conversation Status</Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.action_type !== curr.action_type}>
                                    {({ getFieldValue: getActionValue }) => {
                                        const actionType = getActionValue('action_type');

                                        if (actionType === 'assign_agent') {
                                            return (
                                                <Form.Item name="action_value" label="Select Agent" rules={[{ required: true }]}>
                                                    <Select placeholder="Select team member">
                                                        {teamMembers.map(member => (
                                                            <Option key={member.id} value={member.id}>{member.name}</Option>
                                                        ))}
                                                    </Select>
                                                </Form.Item>
                                            );
                                        }

                                        if (actionType === 'update_status') {
                                            return (
                                                <Form.Item name="action_value" label="New Status" rules={[{ required: true }]}>
                                                    <Select placeholder="Select status">
                                                        <Option value="open">Open</Option>
                                                        <Option value="closed">Closed</Option>
                                                        <Option value="snoozed">Snoozed</Option>
                                                    </Select>
                                                </Form.Item>
                                            );
                                        }

                                        return null;
                                    }}
                                </Form.Item>
                            </>
                        );
                    }

                    return null;
                }}
            </Form.Item>

            <Form.Item style={{ marginTop: 24 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                        <Button type="primary" onClick={handleSubmit}>
                            Save Step
                        </Button>
                        <Button onClick={onCancel}>
                            Cancel
                        </Button>
                    </Space>
                    {onDelete && (
                        <Button danger onClick={onDelete}>
                            Delete Step
                        </Button>
                    )}
                </Space>
            </Form.Item>
        </Form >
    );
};

export default StepEditorForm;
