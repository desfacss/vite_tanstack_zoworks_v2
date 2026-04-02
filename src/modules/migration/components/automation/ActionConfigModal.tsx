import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Radio, Card, Row, Col, Typography, Space, Button, Switch, Alert } from 'antd';
import { SaveOutlined, ThunderboltOutlined, MailOutlined, UserSwitchOutlined, EditOutlined } from '@ant-design/icons';
import { EmailActionConfig } from './actions/EmailActionConfig';
import { AssignOwnerActionConfig } from './actions/AssignOwnerActionConfig';
import { UpdateFieldsActionConfig } from './actions/UpdateFieldsActionConfig';
import type { WorkflowAction, WorkflowRule, ViewConfig, EmailTemplate, Team } from './types';

const { Title, Paragraph, Text } = Typography;

interface ActionConfigModalProps {
  onClose: () => void;
  onSave: (action: Partial<WorkflowAction>) => void;
  onCancel?: () => void;
  action?: WorkflowAction | null;
  workflow: Partial<WorkflowRule>;
  availableTables: ViewConfig[];
  emailTemplates: EmailTemplate[];
  teams: Team[];
  visible?: boolean;
}

export default function ActionConfigModal({
  onClose,
  onSave,
  onCancel,
  action,
  workflow,
  availableTables,
  emailTemplates,
  teams,
}: ActionConfigModalProps) {
  const [form] = Form.useForm();
  const [actionData, setActionData] = useState<Partial<WorkflowAction>>({
    action_type: 'send_email',
    configuration: {},
    is_enabled: true,
    max_retries: 3,
    name: '',
  });

  const actionTypes = [
    { value: 'send_email', label: 'Send Email', icon: MailOutlined },
    { value: 'assign_owner', label: 'Assign Owner', icon: UserSwitchOutlined },
    { value: 'update_fields', label: 'Update Fields', icon: EditOutlined },
  ];

  useEffect(() => {
    if (action) {
      setActionData(action);
      form.setFieldsValue(action);
    }
  }, [action, form]);

  const handleSave = (values: any) => {
    const finalData = { ...actionData, ...values, id: actionData.id || `temp-${Date.now()}` };
    onSave(finalData);
  };

  const handleConfigurationChange = (config: any) => {
    setActionData(prev => ({ ...prev, configuration: config }));
  };

  const currentActionType = Form.useWatch('action_type', form) || actionData.action_type;

  const renderConfig = () => {
    switch (currentActionType) {
        case 'send_email':
            return <EmailActionConfig configuration={actionData.configuration || {}} onChange={handleConfigurationChange} workflow={workflow} availableTables={availableTables} emailTemplates={emailTemplates} teams={teams} />;
        case 'assign_owner':
            return <AssignOwnerActionConfig configuration={actionData.configuration || {}} onChange={handleConfigurationChange} workflow={workflow} availableTables={availableTables} teams={teams} />;
        case 'update_fields':
            return <UpdateFieldsActionConfig configuration={actionData.configuration || {}} onChange={handleConfigurationChange} workflow={workflow} availableTables={availableTables} />;
        default:
            return <Alert message="Not implemented" type="warning" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 bg-slate-900 text-white">
        <Space>
          <ThunderboltOutlined style={{ fontSize: 24 }} />
          <div>
            <Title level={4} style={{ color: 'white', margin: 0 }}>Configure Action</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>Define what happens when triggered</Paragraph>
          </div>
        </Space>
      </div>

      <div className="flex-1 p-6 overflow-auto bg-gray-50">
        <Form form={form} layout="vertical" onFinish={handleSave} size="small">
          <Card title="Basic Info" className="mb-4" size="small">
            <Row gutter={8}>
              <Col span={16}><Form.Item name="name" label="Action Name" rules={[{ required: true }]}><Input placeholder="Descriptive name" /></Form.Item></Col>
              <Col span={8}><Form.Item name="max_retries" label="Max Retries"><InputNumber min={0} className="w-full" /></Form.Item></Col>
            </Row>
          </Card>

          <Card title="Action Type" className="mb-4" size="small">
            <Form.Item name="action_type" rules={[{ required: true }]}>
              <Radio.Group onChange={e => {
                  setActionData(prev => ({ ...prev, action_type: e.target.value, configuration: {} }));
              }} block>
                <Row gutter={[8, 8]}>
                   {actionTypes.map(t => (
                     <Col span={8} key={t.value}>
                       <Radio.Button value={t.value} className="w-full text-center">
                          <Space><t.icon />{t.label}</Space>
                       </Radio.Button>
                     </Col>
                   ))}
                </Row>
              </Radio.Group>
            </Form.Item>
          </Card>

          <Card title="Configuration" className="mb-4" size="small">
             {renderConfig()}
          </Card>

          <Card size="small">
            <Form.Item name="is_enabled" valuePropName="checked" className="m-0"><Switch /> <Text className="ml-2">Enable this action</Text></Form.Item>
          </Card>
        </Form>
      </div>

      <div className="p-4 bg-white border-t flex justify-end gap-2">
        <Button onClick={onCancel || onClose}>Cancel</Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>Save Action</Button>
      </div>
    </div>
  );
}
