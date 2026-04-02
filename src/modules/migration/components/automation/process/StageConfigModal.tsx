import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, Radio, Card, Row, Col, Typography, Space, Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { WorkflowStage } from '../types';

const { Text } = Typography;

interface StageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stage: WorkflowStage) => void;
  stage?: WorkflowStage | null;
  existingStages: WorkflowStage[];
}

export function StageConfigModal({ isOpen, onClose, onSave, stage, existingStages }: StageConfigModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (stage) {
      form.setFieldsValue(stage);
    } else {
      const nextSeq = Math.max(...existingStages.map((s:any) => s.sequence || 0), 0) + 1;
      form.setFieldsValue({ sequence: nextSeq, systemStatusCategory: 'IN_PROGRESS' });
    }
  }, [stage, existingStages, isOpen, form]);

  const handleSave = (values: any) => {
    onSave({ ...values, id: values.id || values.name.toLowerCase().replace(/\s+/g, '_') });
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 p-6 overflow-auto">
        <Form form={form} layout="vertical" onFinish={handleSave} size="small">
          <Card title="Basic Details" size="small" className="mb-4">
            <Row gutter={8}>
              <Col span={12}><Form.Item name="name" label="Stage Name" rules={[{ required: true }]}><Input placeholder="Internal Name" /></Form.Item></Col>
              <Col span={12}><Form.Item name="displayLabel" label="Display Label" rules={[{ required: true }]}><Input placeholder="Public Label" /></Form.Item></Col>
            </Row>
            <Row gutter={8}>
               <Col span={12}><Form.Item name="id" label="Stage ID"><Input placeholder="unique_id" /></Form.Item></Col>
               <Col span={12}><Form.Item name="sequence" label="Sequence"><InputNumber className="w-full" /></Form.Item></Col>
            </Row>
          </Card>

          <Card title="Status Category" size="small" className="mb-4">
            <Form.Item name="systemStatusCategory" rules={[{ required: true }]}>
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="NEW">New / Open</Radio>
                  <Radio value="IN_PROGRESS">In Progress</Radio>
                  <Radio value="CLOSED_WON">Completed / Won</Radio>
                  <Radio value="CANCELLED">Cancelled / Lost</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </Card>

          <Card title="Events" size="small">
             <Form.Item name="on_entry_event_name" label="On Entry Event"><Input placeholder="entered_event" /></Form.Item>
             <Form.Item name="on_exit_event_name" label="On Exit Event"><Input placeholder="exited_event" /></Form.Item>
          </Card>
        </Form>
      </div>
      <div className="p-4 bg-white border-t flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>Save Stage</Button>
      </div>
    </div>
  );
}
