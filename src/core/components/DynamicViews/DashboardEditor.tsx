import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Select, Typography, Space } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { MetricWidgetConfig } from './MetricChartWidget';

// A mock Dashboard type for demonstration
interface Dashboard {
    id?: string;
    name: string;
    entities: string[];
    widgets: MetricWidgetConfig[];
}

interface DashboardEditorProps {
    dashboard: Dashboard | null; // The dashboard being edited, or null for new
    onClose: (saved: boolean) => void;
}

const MOCK_VIEW_CONFIGS = {
    'external.service_assets': {
        metricsview: {
            measures: [
                { metric_key: 'total_assets_count', display_name: 'Total Assets' },
                { metric_key: 'assets_with_barcode', display_name: 'Assets with Barcode' },
            ]
        },
        metadata: [],
    },
    'external.contacts': {
        metricsview: {
            measures: [
                { metric_key: 'total_contacts', display_name: 'Total Contacts' },
                { metric_key: 'new_contacts_this_month', display_name: 'New Contacts This Month' },
            ]
        },
        metadata: [],
    },
};

const DashboardEditor: React.FC<DashboardEditorProps> = ({ dashboard, onClose }) => {
    const { user, organization } = useAuthStore();
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [selectedEntities, setSelectedEntities] = useState<string[]>(dashboard?.entities || []);

    useEffect(() => {
        if (dashboard) {
            form.setFieldsValue({
                name: dashboard.name,
            });
            setSelectedEntities(dashboard.entities);
        } else {
            form.resetFields();
            setSelectedEntities([]);
        }
    }, [dashboard, form]);

    const handleSave = async (values: any) => {
        if (!user?.id || !organization?.id) {
            message.error('User or organization not found.');
            return;
        }

        setIsSaving(true);

        // In a real editor, you would build the 'widgets' array based on user input
        // For this example, we'll create a simple one based on the selected entities.
        const mockWidgets: MetricWidgetConfig[] = selectedEntities.flatMap(entity => {
            const [entitySchema, entityType] = entity.split('.');
            const viewConfig = MOCK_VIEW_CONFIGS[entity];
            return viewConfig?.metricsview?.measures.map((measure: any) => ({
                id: `${measure.metric_key}-${entityType}-${Date.now()}`,
                entitySchema: entitySchema,
                entityType: entityType,
                metricKey: measure.metric_key,
                groupByColumns: [],
                chartType: 'statistic',
                title: measure.display_name,
            })) || [];
        });


        try {
            await supabase.rpc('core_save_user_dashboard_v2', {
                p_user_id: user.id,
                p_organization_id: organization.id,
                p_name: values.name,
                p_entities: selectedEntities,
                p_widgets: mockWidgets,
                p_dashboard_id: dashboard?.id || null,
            });

            message.success('Dashboard saved successfully!');
            onClose(true);
        } catch (error: any) {
            console.error('Save dashboard error:', error);
            message.error(`Failed to save dashboard: ${error.message}`);
            onClose(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        onClose(false);
    };

    return (
        <Modal
            title={dashboard ? 'Edit Dashboard' : 'Create New Dashboard'}
            open={true}
            onCancel={handleCancel}
            footer={null}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={{ name: dashboard?.name || '' }}
            >
                <Form.Item
                    name="name"
                    label="Dashboard Name"
                    rules={[{ required: true, message: 'Please enter a dashboard name!' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="entities"
                    label="Entities to Include"
                    tooltip="This is where a real editor would let you select metrics from these entities."
                >
                    <Select
                        mode="multiple"
                        placeholder="Select entities"
                        value={selectedEntities}
                        onChange={setSelectedEntities}
                        options={[
                            { value: 'external.service_assets', label: 'Service Assets' },
                            { value: 'external.contacts', label: 'Contacts' },
                            { value: 'sales.deals', label: 'Sales Deals' },
                        ]}
                    />
                </Form.Item>
                
                <Space style={{ marginTop: '20px', justifyContent: 'flex-end', width: '100%' }}>
                    <Button onClick={handleCancel}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={isSaving}>
                        Save
                    </Button>
                </Space>
            </Form>
        </Modal>
    );
};

export default DashboardEditor;