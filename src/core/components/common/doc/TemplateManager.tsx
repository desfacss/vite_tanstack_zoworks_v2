import React, { useState, useEffect } from 'react';
import { 
  List, 
  Button, 
  Space, 
  Card, 
  Typography, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Switch,
  message,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  StarOutlined, 
  StarFilled 
} from '@ant-design/icons';
import { DocumentService } from './services/documentService';
import { DocumentTemplate, DocumentForm } from './types/document';
import TemplateCustomizer from './TemplateCustomizer';
import { useAuthStore } from '@/lib/store';

const { Title, Text } = Typography;

interface TemplateManagerProps {
  documentForm: DocumentForm;
  onClose: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ 
  documentForm, 
  onClose 
}) => {
  const { organization } = useAuthStore();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [customizerVisible, setCustomizerVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (organization?.id) {
       loadTemplates();
    }
  }, [documentForm.id, organization?.id]);

  const loadTemplates = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const data = await DocumentService.getDocumentTemplates(documentForm.id, organization.id);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      message.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (values: any) => {
    if (!organization?.id) return;
    try {
      const templateData = {
        document_type_id: documentForm.id,
        name: values.name,
        settings: getDefaultTemplateSettings(),
        is_default: values.is_default || false
      };

      await DocumentService.saveTemplate(templateData, organization.id);
      message.success('Template created');
      setCreateModalVisible(false);
      form.resetFields();
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      message.error('Failed to create template');
    }
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setCustomizerVisible(true);
  };

  const handleDeleteTemplate = async (template: DocumentTemplate) => {
    try {
      // Logic for delete if needed
      message.info('Delete functionality to be confirmed');
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleSetDefault = async (template: DocumentTemplate) => {
    if (!organization?.id) return;
    try {
      const updatedTemplate = { ...template, is_default: true };
      await DocumentService.saveTemplate(updatedTemplate, organization.id);
      message.success('Default template updated');
      loadTemplates();
    } catch (error) {
      console.error('Error setting default template:', error);
    }
  };

  const handleTemplateUpdate = async (updatedTemplate: DocumentTemplate) => {
    if (!organization?.id) return;
    try {
      await DocumentService.saveTemplate(updatedTemplate, organization.id);
      message.success('Template updated');
      setCustomizerVisible(false);
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const getDefaultTemplateSettings = () => {
    return {
      header: {
        showLogo: true,
        companyName: organization?.name || 'Demo Company Inc.',
        tagline: '',
        backgroundColor: '#ffffff',
        textColor: '#000000',
      },
      footer: {
        showFooter: true,
        text: 'Thank you for your business!',
        backgroundColor: '#f5f5f5',
        textColor: '#666666',
      },
      layout: {
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        spacing: 16,
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
      },
      branding: {
        primaryColor: '#1890ff',
        secondaryColor: '#52c41a',
        accentColor: '#faad14',
      }
    };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Templates</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          New Template
        </Button>
      </div>

      <List
        loading={loading}
        dataSource={templates}
        renderItem={(template) => (
          <List.Item
            actions={[
              <Button
                type="text"
                icon={template.is_default ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                onClick={() => handleSetDefault(template)}
                disabled={template.is_default}
              />,
              <Button type="text" icon={<EditOutlined />} onClick={() => handleEditTemplate(template)} />,
              <Popconfirm title="Delete template?" onConfirm={() => handleDeleteTemplate(template)}>
                <Button type="text" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  {template.name}
                  {template.is_default && <Tag color="gold">Default</Tag>}
                </Space>
              }
              description={`Updated ${new Date(template.updated_at).toLocaleDateString()}`}
            />
          </List.Item>
        )}
      />

      <Modal
        title="Create New Template"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTemplate}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked">
            <Switch checkedChildren="Default" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>

      {selectedTemplate && (
        <TemplateCustomizer
          visible={customizerVisible}
          onClose={() => setCustomizerVisible(false)}
          documentForm={documentForm}
          currentTemplate={selectedTemplate}
          onChange={handleTemplateUpdate}
        />
      )}
    </div>
  );
};

export default TemplateManager;
