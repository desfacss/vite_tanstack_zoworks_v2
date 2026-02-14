import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, message, Typography, Divider, InputNumber } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { TenantTierConfigRecord } from '../types';

const { Title } = Typography;
const { Option } = Select;

interface TenantTierConfigFormProps {
    parentEditItem?: TenantTierConfigRecord;
    record?: TenantTierConfigRecord;
    onClose: () => void;
    onSuccess?: () => void;
}

/**
 * TenantTierConfigForm component
 * Handles editing and creation of AI tenant tier configurations
 */
const TenantTierConfigForm: React.FC<TenantTierConfigFormProps> = ({ 
    parentEditItem,
    record: recordProp,
    onClose, 
    onSuccess 
}) => {
    const record = parentEditItem || recordProp;
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const isEdit = !!record?.id;

    useEffect(() => {
        if (record) {
            form.setFieldsValue(record);
        } else {
            form.resetFields();
            form.setFieldsValue({ provider: 'gemini', temperature: 0.7 });
        }
    }, [record, form]);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const payload = {
                ...values,
                updated_at: isEdit ? new Date().toISOString() : undefined
            };

            let error;
            if (isEdit) {
                const { error: updateError } = await supabase
                    .schema('ai_mcp')
                    .from('tenant_tier_configs')
                    .update(payload)
                    .eq('id', record.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .schema('ai_mcp')
                    .from('tenant_tier_configs')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            message.success(`Tenant tier configuration ${isEdit ? 'updated' : 'created'} successfully`);
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Error saving tenant tier config:', error);
            message.error(`Failed to save tenant tier configuration: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ provider: 'gemini', temperature: 0.7 }}
            className="p-4"
        >
            <Title level={4}>{isEdit ? 'Edit Tenant Tier Configuration' : 'New Tenant Tier Configuration'}</Title>
            <Divider />

            <Form.Item
                name="organization_id"
                label="Organization ID (UUID)"
                rules={[{ required: true, message: 'Please enter organization ID' }]}
            >
                <Input placeholder="Enter the organization UUID" />
            </Form.Item>

            <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item
                    name="tier"
                    label="Tier"
                    rules={[{ required: true }]}
                    style={{ flex: 1 }}
                >
                    <Select placeholder="Select model tier">
                        <Option value="mini">Mini (Fast/Cheap)</Option>
                        <Option value="med">Medium (Balanced)</Option>
                        <Option value="max">Max (Powerful/Slow)</Option>
                    </Select>
                </Form.Item>
                <Form.Item
                    name="provider"
                    label="Provider"
                    rules={[{ required: true }]}
                    style={{ flex: 1 }}
                >
                    <Input placeholder="e.g. gemini, openai, anthropic" />
                </Form.Item>
            </div>

            <Form.Item
                name="model_name"
                label="Model Name"
                rules={[{ required: true, message: 'Please enter model name' }]}
            >
                <Input placeholder="e.g. gemini-2.0-flash-lite, gpt-4o-mini" />
            </Form.Item>

            <Form.Item
                name="api_key"
                label="API Key (Optional)"
            >
                <Input.Password placeholder="Override default API key for this tier..." />
            </Form.Item>

            <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item
                    name="temperature"
                    label="Temperature"
                    style={{ flex: 1 }}
                >
                    <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                    name="max_tokens"
                    label="Max Tokens"
                    style={{ flex: 1 }}
                >
                    <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
            </div>

            <Divider />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                    {isEdit ? 'Update Config' : 'Create Config'}
                </Button>
            </div>
        </Form>
    );
};

export default TenantTierConfigForm;
