import React from 'react';
import { Form, Input, Select, Radio, Card, Row, Col, Typography, Space, Switch } from 'antd';
import { BranchesOutlined } from '@ant-design/icons';
import type { WorkflowDefinition, ViewConfig } from '../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ProcessBasicInfoProps {
  definition: Partial<WorkflowDefinition>;
  onUpdate: (definition: Partial<WorkflowDefinition>) => void;
  availableTables: ViewConfig[];
}

export function ProcessBasicInfo({ definition, onUpdate, availableTables }: ProcessBasicInfoProps) {
  const [form] = Form.useForm();

  const processTypes = [
    { value: 'STATE_DRIVEN', label: 'State-Driven', description: 'Defined stages and transitions' },
    { value: 'APPROVAL', label: 'Approval', description: 'Multi-step approval workflow' },
  ];

  React.useEffect(() => {
    form.setFieldsValue({
      name: definition.name || '',
      description: definition.description || '',
      processType: definition.definitions?.processType || 'STATE_DRIVEN',
      entity_schema: definition.entity_schema || 'public',
      entity_type: definition.entity_type || '',
      is_active: definition.is_active !== false,
    });
  }, [definition, form]);

  const handleValuesChange = (changed: any) => {
      const next = { ...definition, ...changed };
      if (changed.processType) {
          next.definitions = { ...definition.definitions, processType: changed.processType };
          delete next.processType;
      }
      onUpdate(next);
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <div>
        <Title level={4}>Process Definition</Title>
        <Paragraph type="secondary">Basic settings for the lifecycle process</Paragraph>
      </div>
        
      <Form form={form} layout="vertical" size="small" onValuesChange={handleValuesChange}>
        <Card title="Identification" size="small" className="mb-4">
          <Form.Item name="name" label="Process Name" rules={[{ required: true }]}><Input placeholder="Name" /></Form.Item>
          <Form.Item name="description" label="Description"><TextArea placeholder="Purpose" rows={2} /></Form.Item>
        </Card>

        <Card title="Type" size="small" className="mb-4">
          <Form.Item name="processType" rules={[{ required: true }]}>
            <Radio.Group className="w-full">
               <Row gutter={8}>
                  {processTypes.map(t => (
                    <Col span={12} key={t.value}>
                       <Radio value={t.value}>
                          <Text strong style={{ fontSize: '12px' }}>{t.label}</Text>
                       </Radio>
                    </Col>
                  ))}
               </Row>
            </Radio.Group>
          </Form.Item>
        </Card>

        <Card title="Entity Mapping" size="small">
           <Row gutter={8}>
              <Col span={12}>
                 <Form.Item name="entity_schema" label="Schema">
                    <Select options={[{value:'public'}, {value:'organization'}, {value:'external'}, {value:'identity'}, {value:'workflow'}]} />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="entity_type" label="Table" rules={[{ required: true }]}>
                    <Select showSearch options={availableTables.filter(t => t.entity_schema === (form.getFieldValue('entity_schema') || 'public')).map(t => ({ value: t.entity_type, label: t.entity_type }))} />
                 </Form.Item>
              </Col>
           </Row>
           <Form.Item name="is_active" label="Status" valuePropName="checked"><Switch checkedChildren="Active" unCheckedChildren="Disabled" /></Form.Item>
        </Card>
      </Form>
    </Space>
  );
}
