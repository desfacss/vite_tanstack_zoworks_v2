import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Tabs, message, Table, Typography, Divider, InputNumber } from 'antd';
import { supabase } from '@/core/lib/supabase';
import JsonEditor from '@/modules/ai/components/JsonEditor';
import { EntityBlueprintRecord, EntityBlueprintHistoryRecord } from '../types';

const { TabPane } = Tabs;
const { Title } = Typography;

interface EntityBlueprintFormProps {
    parentEditItem?: EntityBlueprintRecord;
    record?: EntityBlueprintRecord; // Alias for backward compatibility
    onClose: () => void;
    onSuccess?: () => void;
}

/**
 * EntityBlueprintForm component
 * Handles adding and editing of entity blueprints with multiple tabs for complex fields
 */
const EntityBlueprintForm: React.FC<EntityBlueprintFormProps> = ({ 
    parentEditItem,
    record: recordProp,
    onClose, 
    onSuccess 
}) => {
    const record = parentEditItem || recordProp;
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [history, setHistory] = useState<EntityBlueprintHistoryRecord[]>([]);
    const isEdit = !!record?.id;

    useEffect(() => {
        if (record) {
            // Convert JSON objects to strings for JsonEditor
            const formValues = {
                ...record,
                semantics: record.semantics ? JSON.stringify(record.semantics, null, 2) : '',
                rules: record.rules ? JSON.stringify(record.rules, null, 2) : '',
                ai_metadata: record.ai_metadata ? JSON.stringify(record.ai_metadata, null, 2) : '',
                jsonb_schema: record.jsonb_schema ? JSON.stringify(record.jsonb_schema, null, 2) : '',
                display_format: record.display_format ? JSON.stringify(record.display_format, null, 2) : '',
                ui_general: record.ui_general ? JSON.stringify(record.ui_general, null, 2) : '',
                ui_details_overview: record.ui_details_overview ? JSON.stringify(record.ui_details_overview, null, 2) : '',
                ui_dashboard: record.ui_dashboard ? JSON.stringify(record.ui_dashboard, null, 2) : '',
            };
            form.setFieldsValue(formValues);
            fetchHistory(record.id);
        } else {
            form.resetFields();
            setHistory([]);
        }
    }, [record, form]);

    const fetchHistory = async (blueprintId: string) => {
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
                .schema('core')
                .from('entity_blueprint_history')
                .select('*')
                .eq('blueprint_id', blueprintId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error: any) {
            console.error('Error fetching history:', error);
            message.error('Failed to fetch blueprint history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Parse JSON strings back to objects
            const payload: any = {
                ...values,
                semantics: values.semantics ? JSON.parse(values.semantics) : null,
                rules: values.rules ? JSON.parse(values.rules) : null,
                ai_metadata: values.ai_metadata ? JSON.parse(values.ai_metadata) : null,
                jsonb_schema: values.jsonb_schema ? JSON.parse(values.jsonb_schema) : null,
                display_format: values.display_format ? JSON.parse(values.display_format) : null,
                ui_general: values.ui_general ? JSON.parse(values.ui_general) : null,
                ui_details_overview: values.ui_details_overview ? JSON.parse(values.ui_details_overview) : null,
                ui_dashboard: values.ui_dashboard ? JSON.parse(values.ui_dashboard) : null,
            };

            let error;
            if (isEdit) {
                const { error: updateError } = await supabase
                    .schema('core')
                    .from('entity_blueprints')
                    .update(payload)
                    .eq('id', record.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .schema('core')
                    .from('entity_blueprints')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            message.success(`Entity blueprint ${isEdit ? 'updated' : 'created'} successfully`);
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Error saving blueprint:', error);
            message.error(`Failed to save blueprint: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const historyColumns = [
        {
            title: 'Version/Date',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text: string) => new Date(text).toLocaleString(),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Author',
            dataIndex: 'created_by',
            key: 'created_by',
            render: (text: string) => text || 'System',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: EntityBlueprintHistoryRecord) => (
                <Button 
                    type="link" 
                    onClick={() => {
                        console.log('Viewing history record:', record);
                        // Optional: Could implement a diff or viewer here
                        message.info('History record viewing to be implemented');
                    }}
                >
                    View
                </Button>
            ),
        },
    ];

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ version: 1 }}
        >
            <Tabs defaultActiveKey="1">
                <TabPane tab="Basic Info" key="1">
                    <div style={{ padding: '16px 0' }}>
                        <Form.Item
                            name="entity_type"
                            label="Entity Type"
                            rules={[{ required: true, message: 'Please enter entity type' }]}
                        >
                            <Input placeholder="e.g. leads, tickets, invoice" />
                        </Form.Item>
                        <Form.Item
                            name="entity_schema"
                            label="Entity Schema"
                            rules={[{ required: true, message: 'Please enter entity schema' }]}
                        >
                            <Input placeholder="e.g. crm, support, erp" />
                        </Form.Item>
                        <Form.Item
                            name="base_source"
                            label="Base Source"
                        >
                            <Input placeholder="e.g. table name or view name" />
                        </Form.Item>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <Form.Item
                                name="classification"
                                label="Classification"
                                style={{ flex: 1 }}
                            >
                                <Input placeholder="e.g. transactional, master, metadata" />
                            </Form.Item>
                            <Form.Item
                                name="version"
                                label="Version"
                                style={{ width: '120px' }}
                            >
                                <InputNumber style={{ width: '100%' }} min={1} />
                            </Form.Item>
                        </div>
                    </div>
                </TabPane>

                <TabPane tab="Configuration" key="2">
                    <div style={{ padding: '16px 0' }}>
                        <Form.Item name="semantics" label="Semantics (JSON)">
                            <JsonEditor rows={6} placeholder="Define semantic fields and types..." />
                        </Form.Item>
                        <Form.Item name="rules" label="Rules (JSON)">
                            <JsonEditor rows={6} placeholder="Define validation or business rules..." />
                        </Form.Item>
                        <Form.Item name="ai_metadata" label="AI Metadata (JSON)">
                            <JsonEditor rows={6} placeholder="AI training and processing metadata..." />
                        </Form.Item>
                    </div>
                </TabPane>

                <TabPane tab="UI Settings" key="3">
                    <div style={{ padding: '16px 0' }}>
                        <Form.Item name="ui_general" label="UI General (JSON)">
                            <JsonEditor rows={6} placeholder="General UI settings, icons, actions..." />
                        </Form.Item>
                        <Form.Item name="ui_details_overview" label="Details Overview (JSON)">
                            <JsonEditor rows={6} placeholder="Layout for details view..." />
                        </Form.Item>
                        <Form.Item name="ui_dashboard" label="Dashboard Config (JSON)">
                            <JsonEditor rows={6} placeholder="Widgets and charts config..." />
                        </Form.Item>
                    </div>
                </TabPane>

                <TabPane tab="Schema" key="4">
                    <div style={{ padding: '16px 0' }}>
                        <Form.Item name="jsonb_schema" label="JSONB Schema (JSON)">
                            <JsonEditor rows={10} placeholder="Full JSONB schema definition..." />
                        </Form.Item>
                        <Form.Item name="display_format" label="Display Format (JSON)">
                            <JsonEditor rows={6} placeholder="Field formatting and masks..." />
                        </Form.Item>
                    </div>
                </TabPane>

                {isEdit && (
                    <TabPane tab="History" key="5">
                        <div style={{ padding: '16px 0' }}>
                            <Title level={5}>Historical Versions</Title>
                            <Table 
                                dataSource={history} 
                                columns={historyColumns} 
                                size="small" 
                                loading={historyLoading}
                                rowKey="id"
                                pagination={{ pageSize: 5 }}
                            />
                        </div>
                    </TabPane>
                )}
            </Tabs>

            <Divider />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                    {isEdit ? 'Update Blueprint' : 'Create Blueprint'}
                </Button>
            </div>
        </Form>
    );
};

export default EntityBlueprintForm;
