import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, message, Typography, Divider, DatePicker } from 'antd';
import { supabase } from '@/core/lib/supabase';
import JsonEditor from '@/modules/ai/components/JsonEditor';
import { ActionApprovalRecord } from '../types';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface ActionApprovalFormProps {
    parentEditItem?: ActionApprovalRecord;
    record?: ActionApprovalRecord;
    onClose: () => void;
    onSuccess?: () => void;
}

/**
 * ActionApprovalForm component
 * Handles editing and creation of AI action approvals
 */
const ActionApprovalForm: React.FC<ActionApprovalFormProps> = ({ 
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
            form.setFieldsValue({
                ...record,
                parameters: record.parameters ? JSON.stringify(record.parameters, null, 2) : '',
                decided_at: record.decided_at ? dayjs(record.decided_at) : null,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ status: 'pending' });
        }
    }, [record, form]);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Parse JSON strings back to objects
            const payload: any = {
                ...values,
                parameters: values.parameters ? JSON.parse(values.parameters) : {},
                decided_at: values.decided_at ? values.decided_at.toISOString() : null,
            };

            let error;
            if (isEdit) {
                const { error: updateError } = await supabase
                    .schema('ai_mcp')
                    .from('action_approvals')
                    .update(payload)
                    .eq('id', record.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .schema('ai_mcp')
                    .from('action_approvals')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            message.success(`Action approval ${isEdit ? 'updated' : 'created'} successfully`);
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Error saving action approval:', error);
            message.error(`Failed to save action approval: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ status: 'pending' }}
            className="p-4"
        >
            <Title level={4}>{isEdit ? 'Edit Action Approval' : 'New Action Approval'}</Title>
            <Divider />

            <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item
                    name="action_type"
                    label="Action Type"
                    rules={[{ required: true, message: 'Please enter action type' }]}
                    style={{ flex: 1 }}
                >
                    <Input placeholder="e.g. create_candidate, approve_requisition" />
                </Form.Item>
                <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true }]}
                    style={{ width: '150px' }}
                >
                    <Select>
                        <Option value="pending">Pending</Option>
                        <Option value="approved">Approved</Option>
                        <Option value="rejected">Rejected</Option>
                    </Select>
                </Form.Item>
            </div>

            <Form.Item
                name="session_id"
                label="Session ID (UUID)"
                rules={[{ required: true, message: 'Please enter session ID' }]}
            >
                <Input placeholder="Enter the AI session UUID" />
            </Form.Item>

            <Form.Item
                name="organization_id"
                label="Organization ID (UUID)"
                rules={[{ required: true, message: 'Please enter organization ID' }]}
            >
                <Input placeholder="Enter the organization UUID" />
            </Form.Item>

            <Form.Item
                name="description"
                label="Description"
            >
                <Input.TextArea rows={2} placeholder="Brief description of the action..." title="Action Description" />
            </Form.Item>

            <Form.Item name="parameters" label="Parameters (JSON)">
                <JsonEditor rows={8} placeholder="Action parameters in JSON format..." />
            </Form.Item>

            <Divider orientation="left">Decision Details</Divider>
            
            <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item
                    name="decided_by"
                    label="Decided By (User UUID)"
                    style={{ flex: 1 }}
                >
                    <Input placeholder="User ID who made the decision" />
                </Form.Item>
                <Form.Item
                    name="decided_at"
                    label="Decided At"
                    style={{ width: '200px' }}
                >
                    <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
            </div>

            <Form.Item
                name="decision_note"
                label="Decision Note"
            >
                <Input.TextArea rows={2} placeholder="Reason or notes for the decision..." title="Decision Note" />
            </Form.Item>

            <Divider />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                    {isEdit ? 'Update Approval' : 'Create Approval'}
                </Button>
            </div>
        </Form>
    );
};

export default ActionApprovalForm;
