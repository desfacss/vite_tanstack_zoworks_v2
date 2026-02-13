import React from 'react';
import { Form, Select, Input, Button, Divider, InputNumber, Switch, Space, Tag } from 'antd';

const { TextArea } = Input;

interface TriggerConfig {
    tag_ids?: string[];
    tag_name?: string;
    match_mode?: 'any' | 'all';
    keywords?: string[];
    days_inactive?: number;
    [key: string]: any;
}

interface CampaignSettingsFormProps {
    campaign: {
        name: string;
        description?: string | null;
        trigger_type: string;
        trigger_config?: TriggerConfig;
        is_active?: boolean;
    } | null;
    onSave: (values: any) => void;
    loading?: boolean;
}

export const CampaignSettingsForm: React.FC<CampaignSettingsFormProps> = ({ campaign, onSave, loading }) => {
    const [form] = Form.useForm();

    React.useEffect(() => {
        if (campaign) {
            form.setFieldsValue({
                name: campaign.name,
                description: campaign.description,
                trigger_type: campaign.trigger_type === 'keyword' ? 'message_received' : campaign.trigger_type,
                is_active: campaign.is_active,
                // Flatten trigger_config into form fields
                tag_name: campaign.trigger_config?.tag_name,
                match_mode: campaign.trigger_config?.match_mode || 'any',
                keywords: campaign.trigger_config?.keywords?.join(', '),
                days_inactive: campaign.trigger_config?.days_inactive
            });
        }
    }, [campaign, form]);

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            // Build trigger_config based on trigger_type
            let trigger_config: TriggerConfig = {};

            switch (values.trigger_type) {
                case 'tag_added':
                    trigger_config = {
                        tag_name: values.tag_name,
                        match_mode: values.match_mode || 'any'
                    };
                    break;
                case 'message_received':
                case 'keyword':
                    trigger_config = {
                        keywords: values.keywords?.split(',').map((k: string) => k.trim()).filter(Boolean),
                        match_mode: values.match_mode || 'contains'
                    };
                    break;
                case 'inactive':
                    trigger_config = {
                        days_inactive: values.days_inactive
                    };
                    break;
                default:
                    trigger_config = {};
            }

            onSave({
                name: values.name,
                description: values.description,
                trigger_type: values.trigger_type,
                trigger_config,
                is_active: values.is_active
            });
        });
    };

    const triggerType = Form.useWatch('trigger_type', form);

    return (
        <Form form={form} layout="vertical">
            <Form.Item name="name" label="Sequence Name" rules={[{ required: true }]}>
                <Input placeholder="e.g., Welcome Series" />
            </Form.Item>

            <Form.Item name="description" label="Description">
                <TextArea rows={2} placeholder="Describe this sequence..." />
            </Form.Item>

            <Form.Item name="is_active" label="Status" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Draft" />
            </Form.Item>

            <Divider>Trigger Settings</Divider>

            <Form.Item name="trigger_type" label="When to Start Sequence" rules={[{ required: true }]}>
                <Select>
                    <Select.Option value="new_lead">
                        <Space>
                            <Tag color="green">Auto</Tag>
                            New Lead Added
                        </Space>
                    </Select.Option>
                    <Select.Option value="tag_added">
                        <Space>
                            <Tag color="blue">Auto</Tag>
                            Tag Added to Contact
                        </Space>
                    </Select.Option>
                    <Select.Option value="manual">
                        <Space>
                            <Tag color="default">Manual</Tag>
                            Manual Enrollment
                        </Space>
                    </Select.Option>
                    <Select.Option value="message_received">
                        <Space>
                            <Tag color="purple">Auto</Tag>
                            Message Contains Keywords
                        </Space>
                    </Select.Option>
                    <Select.Option value="inactive">
                        <Space>
                            <Tag color="orange">Auto</Tag>
                            Contact Inactive
                        </Space>
                    </Select.Option>
                </Select>
            </Form.Item>

            {/* Dynamic config fields based on trigger type */}

            {triggerType === 'tag_added' && (
                <>
                    <Form.Item
                        name="tag_name"
                        label="Tag Name"
                        rules={[{ required: true, message: 'Enter tag name to watch' }]}
                        extra="Enter the exact tag name that should trigger this sequence"
                    >
                        <Input placeholder="e.g., Interested, VIP, Hot Lead" />
                    </Form.Item>
                </>
            )}

            {triggerType === 'message_received' && (
                <>
                    <Form.Item
                        name="keywords"
                        label="Keywords (comma-separated)"
                        rules={[{ required: true, message: 'Enter at least one keyword' }]}
                        extra="Sequence starts when message contains any of these words"
                    >
                        <Input placeholder="e.g., interested, pricing, demo" />
                    </Form.Item>
                    <Form.Item name="match_mode" label="Match Mode">
                        <Select>
                            <Select.Option value="any">Any (contains any keyword)</Select.Option>
                            <Select.Option value="all">All (contains all keywords)</Select.Option>
                            <Select.Option value="exact">Exact Match</Select.Option>
                        </Select>
                    </Form.Item>
                </>
            )}

            {triggerType === 'inactive' && (
                <Form.Item
                    name="days_inactive"
                    label="Days Inactive"
                    rules={[{ required: true, message: 'Enter number of days' }]}
                    extra="Sequence starts if contact hasn't messaged in N days"
                >
                    <InputNumber min={1} max={365} style={{ width: '100%' }} placeholder="e.g., 7" />
                </Form.Item>
            )}

            {triggerType === 'new_lead' && (
                <div style={{ padding: 12, background: '#f6ffed', borderRadius: 8, marginBottom: 16 }}>
                    <strong>Auto-Trigger:</strong> This sequence will start automatically when any new contact is added.
                </div>
            )}

            {triggerType === 'manual' && (
                <div style={{ padding: 12, background: '#f0f5ff', borderRadius: 8, marginBottom: 16 }}>
                    <strong>Manual Enrollment:</strong> You'll need to manually enroll contacts from their profile page.
                </div>
            )}

            <Form.Item style={{ marginTop: 24 }}>
                <Button type="primary" onClick={handleSubmit} loading={loading} block>
                    Save Settings
                </Button>
            </Form.Item>
        </Form>
    );
};

export default CampaignSettingsForm;
