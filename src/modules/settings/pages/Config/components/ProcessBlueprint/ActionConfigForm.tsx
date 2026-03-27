import React from 'react';
import { Form, Input, Select, Row, Col, Typography, Card, Space, Divider } from 'antd';
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
      case 'update_field':
        return (
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item label="Target Field" name={['config', 'field']} rules={[{ required: true }]}>
                <Select placeholder="Select field" showSearch filterOption={(input, option) =>
                      (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }>
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

      case 'send_notification':
        return (
          <>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item label="Recipient Type" name={['config', 'recipient_type']} initialValue="responsible">
                  <Select>
                    <Option value="responsible">Responsible Role</Option>
                    <Option value="accountable">Accountable Role</Option>
                    <Option value="specific_user">Specific User</Option>
                    <Option value="role">Specific Role</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Channel" name={['config', 'channel']} initialValue="in_app">
                  <Select mode="multiple">
                    <Option value="in_app">In-App Notification</Option>
                    <Option value="email">Email</Option>
                    <Option value="whatsapp">WhatsApp</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Message Template" name={['config', 'message']} rules={[{ required: true }]}>
              <Input.TextArea rows={3} placeholder="e.g. A new lead {{entity.name}} has been assigned to you." />
            </Form.Item>
          </>
        );

      case 'trigger_webhook':
        return (
          <>
            <Form.Item label="Endpoint URL" name={['config', 'url']} rules={[{ required: true }]}>
              <Input placeholder="https://api.example.com/webhook" prefix={<Globe size={14} />} />
            </Form.Item>
            <Row gutter={8}>
              <Col span={6}>
                <Form.Item label="Method" name={['config', 'method']} initialValue="POST">
                  <Select>
                    <Option value="POST">POST</Option>
                    <Option value="PUT">PUT</Option>
                    <Option value="GET">GET</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={18}>
                <Form.Item label="Headers (JSON)" name={['config', 'headers']}>
                  <Input placeholder='{"Authorization": "Bearer..."}' />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Payload Template (JSON)" name={['config', 'payload']}>
              <Input.TextArea rows={4} placeholder='{"event": "stage_changed", "data": "{{entity}}"}' />
            </Form.Item>
          </>
        );

      case 'create_task':
        return (
          <>
            <Form.Item label="Task Subject" name={['config', 'subject']} rules={[{ required: true }]}>
              <Input placeholder="Follow up with {{entity.name}}" />
            </Form.Item>
            <Form.Item label="Due Offset (Days)" name={['config', 'due_offset_days']} initialValue={1}>
              <Input type="number" />
            </Form.Item>
          </>
        );

      case 'execute_script':
        return (
          <Form.Item label="JavaScript Snippet" name={['config', 'script']} rules={[{ required: true }]}>
            <Input.TextArea rows={10} style={{ fontFamily: 'monospace' }} placeholder="// Custom logic here..." />
          </Form.Item>
        );

      default:
        return <Text type="secondary">Configuration form not yet available for this action type.</Text>;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'update_field': return <Database size={16} />;
      case 'send_notification': return <Mail size={16} />;
      case 'trigger_webhook': return <Globe size={16} />;
      case 'create_task': return <PlusSquare size={16} />;
      case 'execute_script': return <Code size={16} />;
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
