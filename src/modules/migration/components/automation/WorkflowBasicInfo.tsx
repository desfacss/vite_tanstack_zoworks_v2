import React from 'react';
import { Form, Input, Select, Radio, Switch, Space, Typography, Card, Row, Col } from 'antd';
import { DatabaseOutlined, ClockCircleOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { WorkflowRule, ViewConfig } from './types';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface WorkflowBasicInfoProps {
  workflow: Partial<WorkflowRule>;
  onUpdate: (workflow: Partial<WorkflowRule>) => void;
  availableTables: ViewConfig[];
}

export function WorkflowBasicInfo({ workflow, onUpdate, availableTables }: WorkflowBasicInfoProps) {
  const [form] = Form.useForm();

  const triggerTypes = [
    { value: 'on_create', label: 'On Create', description: 'Trigger when new records are created', icon: ThunderboltOutlined },
    { value: 'on_update', label: 'On Update', description: 'Trigger when records are updated', icon: ReloadOutlined },
    { value: 'both', label: 'Create & Update', description: 'Trigger on both create and update', icon: DatabaseOutlined },
    { value: 'cron', label: 'Scheduled', description: 'Run on a schedule using cron', icon: ClockCircleOutlined },
  ];

  React.useEffect(() => {
    form.setFieldsValue({
      name: workflow.name || '',
      description: workflow.description || '',
      trigger_type: workflow.trigger_type || 'on_create',
      trigger_table: workflow.trigger_table || '',
      priority: workflow.priority || 0,
      is_active: workflow.is_active !== false,
    });
  }, [workflow, form]);

  const handleValuesChange = (changedValues: any) => {
    onUpdate({ ...workflow, ...changedValues });
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={4}>Basic Workflow Information</Title>
        <Paragraph type="secondary">Configure fundamental properties</Paragraph>
      </div>
        
      <Form 
        form={form}
        layout="vertical" 
        size="small"
        onValuesChange={handleValuesChange}
      >
        <Card title="Definition" size="small" className="mb-4">
          <Form.Item name="name" label="Workflow Name" rules={[{ required: true }]}>
            <Input placeholder="Descriptive name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea placeholder="What does this do?" rows={2} />
          </Form.Item>
        </Card>

        <Card title="Trigger" size="small" className="mb-4">
          <Form.Item name="trigger_type" label="Trigger Type" rules={[{ required: true }]}>
            <Radio.Group className="w-full">
              <Row gutter={[8, 8]}>
                {triggerTypes.map((type) => (
                  <Col span={12} key={type.value}>
                    <Radio value={type.value}>
                        <Text strong style={{ fontSize: '12px' }}>{type.label}</Text>
                    </Radio>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="trigger_table" label="Target Table" rules={[{ required: true }]}>
            <Select placeholder="Select table" showSearch>
              {availableTables.map((table) => (
                <Select.Option key={table.id} value={table.entity_type}>
                  {table.entity_schema ? `${table.entity_schema}.${table.entity_type}` : table.entity_type}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Card>

        <Card title="Options" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label="Priority">
                <Select>
                  <Select.Option value={0}>Normal</Select.Option>
                  <Select.Option value={1}>High</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="Status" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Paused" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </Space>
  );
}
