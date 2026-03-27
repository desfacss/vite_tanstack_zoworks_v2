import React from 'react';
import { Form, Input, Select, Row, Col, Typography, Space } from 'antd';
import { Mail, Database, Globe, PlusSquare, Code } from 'lucide-react';

const { Text } = Typography;
const { Option } = Select;

interface ActionConfigFormProps {
  type: string;
  fields: any[]; // Entity metadata
}

const ActionConfigForm: React.FC<ActionConfigFormProps> = ({ type, fields }) => {
  const renderForm = () => {
    switch (type) {
      case 'send_email':
        return (
          <>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item label="Email Template ID" name={['config', 'template_id']} rules={[{ required: true }]}>
                  <Input placeholder="e.g. ticket-acknowledge" />
                </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item label="Subject (Optional Override)" name={['config', 'subject']}>
                    <Input placeholder="Fixed subject or {{expression}}" />
                 </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Recipients / Body (Advanced JSON)" name={['config']}>
              <Input.TextArea rows={6} placeholder="Full configuration JSON..." style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          </>
        );

      case 'create_entity':
        return (
          <>
            <Row gutter={8}>
              <Col span={8}>
                <Form.Item label="Schema" name={['config', 'entity_schema']} initialValue="blueprint">
                  <Input placeholder="blueprint" />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item label="Entity Name" name={['config', 'entity_name']} rules={[{ required: true }]}>
                  <Select placeholder="Pick target entity">
                    <Option value="tasks">Tasks (Work Orders)</Option>
                    <Option value="tickets">Tickets</Option>
                    <Option value="customers">Customers</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Entity Payload (JSON Template)" name={['config', 'payload']} rules={[{ required: true }]}>
              <Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} placeholder='{ "name": "Task for {{new.id}}", ... }' />
            </Form.Item>
          </>
        );

      case 'rpc':
        return (
          <>
            <Form.Item label="PostgreSQL RPC Function" name={['config', 'rpc_name']} rules={[{ required: true }]}>
              <Input placeholder="schema.function_name" />
            </Form.Item>
            <Form.Item label="Arguments (JSON)" name={['config', 'args']}>
              <Input.TextArea rows={4} style={{ fontFamily: 'monospace' }} placeholder='{ "id": "{{entity.id}}", ... }' />
            </Form.Item>
          </>
        );

      case 'update_field':
        return (
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item label="Target Field" name={['config', 'field']} rules={[{ required: true }]}>
                <Select placeholder="Select field" showSearch>
                  {(fields || []).map(f => (
                    <Option key={f.key} value={f.key}>{f.display_name || f.key}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="New Value" name={['config', 'value']} rules={[{ required: true }]}>
                <Input placeholder="Fixed value or {{expression}}" />
              </Form.Item>
            </Col>
          </Row>
        );

      default:
        return (
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                    Visual editor not yet optimized for: <Text strong>{type}</Text>. 
                    You can still edit the raw configuration below.
                </Text>
                <Form.Item name="config">
                    <Input.TextArea rows={10} style={{ fontFamily: 'monospace' }} placeholder="Raw configuration JSON..." />
                </Form.Item>
            </div>
        );
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'update_field': return <Database size={16} />;
      case 'send_email': return <Mail size={16} />;
      case 'trigger_webhook': return <Globe size={16} />;
      case 'create_entity': return <PlusSquare size={16} />;
      case 'rpc': return <Code size={16} />;
      default: return null;
    }
  };

  return (
    <div className="action-config-form">
      <Space style={{ marginBottom: 12 }}>
        {getIcon()}
        <Text strong>{type.toUpperCase().replace('_', ' ')} Settings</Text>
      </Space>
      {renderForm()}
    </div>
  );
};

export default ActionConfigForm;
