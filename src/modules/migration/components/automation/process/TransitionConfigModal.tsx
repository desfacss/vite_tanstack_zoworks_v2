import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, Radio, Card, Row, Col, Typography, Space, Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { WorkflowTransition, WorkflowStage } from '../types';

const { Title, Text } = Typography;

interface TransitionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transition: WorkflowTransition) => void;
  transition?: WorkflowTransition | null;
  stages: WorkflowStage[];
}

export function TransitionConfigModal({ isOpen, onClose, onSave, transition, stages }: TransitionConfigModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (transition) {
      form.setFieldsValue(transition);
    } else {
      form.setFieldsValue({ trigger: 'manual' });
    }
  }, [transition, isOpen, form]);

  const handleSave = (values: any) => {
    onSave({ ...values, id: values.id || `T_${Date.now()}` });
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 p-6 overflow-auto">
        <Form form={form} layout="vertical" onFinish={handleSave} size="small">
          <Card title="Definition" size="small" className="mb-4">
             <Row gutter={8}>
                <Col span={12}><Form.Item name="name" label="Transition Name" rules={[{ required: true }]}><Input placeholder="Internal Name" /></Form.Item></Col>
                <Col span={12}><Form.Item name="id" label="Transition ID"><Input placeholder="unique_id" /></Form.Item></Col>
             </Row>
             <Row gutter={8}>
                <Col span={12}>
                   <Form.Item name="from" label="Source Stage" rules={[{ required: true }]}>
                      <Select options={stages.map(s => ({ value: s.id, label: s.displayLabel }))} />
                   </Form.Item>
                </Col>
                <Col span={12}>
                   <Form.Item name="to" label="Target Stage" rules={[{ required: true }]}>
                      <Select options={stages.map(s => ({ value: s.id, label: s.displayLabel }))} />
                   </Form.Item>
                </Col>
             </Row>
          </Card>

          <Card title="Trigger" size="small" className="mb-4">
             <Form.Item name="trigger" rules={[{ required: true }]}>
                <Radio.Group>
                   <Space direction="vertical">
                      <Radio value="manual">Manual (User Click)</Radio>
                      <Radio value="automatic">Automatic (Immediate)</Radio>
                      <Radio value="time_elapsed_in_state">Time-Based (Timeout)</Radio>
                   </Space>
                </Radio.Group>
             </Form.Item>
             <Form.Item noStyle shouldUpdate={(p, c) => p.trigger !== c.trigger}>
                {() => form.getFieldValue('trigger') === 'time_elapsed_in_state' && (
                  <Form.Item name="timeThresholdHours" label="Hours Threshold"><InputNumber min={0} className="w-full" /></Form.Item>
                )}
             </Form.Item>
          </Card>
        </Form>
      </div>
      <div className="p-4 bg-white border-t flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>Save Transition</Button>
      </div>
    </div>
  );
}
