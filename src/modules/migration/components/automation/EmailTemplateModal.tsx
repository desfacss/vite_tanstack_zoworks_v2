import React, { useState } from 'react';
import { Modal, Form, Input, Button, Switch, Row, Col, Typography, Space, Tag, Alert, Card, Divider } from 'antd';
import { SaveOutlined, MailOutlined, EyeOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import type { EmailTemplate } from './types';

const { Text } = Typography;
const { TextArea } = Input;

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: EmailTemplate) => void;
  template?: EmailTemplate | null;
}

export function EmailTemplateModal({ isOpen, onClose, onSave, template }: EmailTemplateModalProps) {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);

  React.useEffect(() => {
    if (template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description || '',
        subject: template.details?.subject || '',
        body: template.details?.body || '',
        is_active: template.is_active !== false,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true });
    }
  }, [template, isOpen, form]);

  const handleSave = async (values: any) => {
    setSaving(true);
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    try {
      const payload = {
        name: values.name,
        description: values.description,
        details: { subject: values.subject, body: values.body },
        is_active: values.is_active,
        organization_id: orgId
      };

      const { data, error } = template?.id 
          ? await supabase.from('email_templates' as any).update(payload).eq('id', template.id).select().single()
          : await supabase.from('email_templates' as any).insert(payload).select().single();
      
      if (error) throw error;
      onSave(data);
      onClose();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const insert = (token: string, field: 'subject' | 'body') => {
      const cur = form.getFieldValue(field) || '';
      form.setFieldValue(field, cur + ` {{${token}}}`);
  };

  const tokens = ['new.id', 'new.status', 'new.type', 'organization.name', 'user.name'];

  return (
    <Modal title={<Space><MailOutlined /><span>Email Template</span></Space>} open={isOpen} onCancel={onClose} width={800} footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button key="preview" icon={<EyeOutlined />} onClick={() => setPreview(!preview)}>{preview ? 'Hide' : 'Show'} Preview</Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()}>Save</Button>
    ]}>
      {error && <Alert message={error} type="error" closable className="mb-4" />}
      <Row gutter={16}>
         <Col span={16}>
            <Form form={form} layout="vertical" onFinish={handleSave} size="small">
               <Row gutter={8}>
                  <Col span={12}><Form.Item name="name" label="Name" rules={[{required: true}]}><Input /></Form.Item></Col>
                  <Col span={12}><Form.Item name="description" label="Description"><Input /></Form.Item></Col>
               </Row>
               <Form.Item name="subject" label="Subject" rules={[{required: true}]}><Input /></Form.Item>
               <Form.Item name="body" label="Body (HTML supported)" rules={[{required: true}]}><TextArea rows={10} /></Form.Item>
               <Form.Item name="is_active" label="Status" valuePropName="checked"><Switch /></Form.Item>
            </Form>
         </Col>
         <Col span={8}>
            <Card title="Placeholders" size="small">
               <Space wrap>
                  {tokens.map(t => (
                    <Tag key={t} className="cursor-pointer" onClick={() => insert(t, 'body')}>
                       {t}
                    </Tag>
                  ))}
               </Space>
               <Divider />
               <Text type="secondary" style={{ fontSize:'12px' }}>Click a tag to insert into Body.</Text>
            </Card>
         </Col>
      </Row>
      {preview && (
        <Card size="small" className="mt-4 bg-gray-50 border-dashed" title="Preview">
           <Text strong>{form.getFieldValue('subject')}</Text>
           <Divider className="my-2" />
           <div dangerouslySetInnerHTML={{ __html: form.getFieldValue('body') }} />
        </Card>
      )}
    </Modal>
  );
}
