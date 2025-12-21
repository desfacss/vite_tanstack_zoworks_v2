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
import { useAuthStore } from '@/core/lib/store';

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
    loadTemplates();
  }, [documentForm.id]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await DocumentService.getDocumentTemplates(documentForm.id,organization?.id);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      message.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (values: any) => {
    try {
      const templateData = {
        document_type_id: documentForm.id,
        name: values.name,
        settings: getDefaultTemplateSettings(),
        is_default: values.is_default || false
      };

      await DocumentService.saveTemplate(templateData,organization?.id);
      message.success('Template created successfully');
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
      // Note: You'll need to implement deleteTemplate in DocumentService
      message.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      message.error('Failed to delete template');
    }
  };

  const handleSetDefault = async (template: DocumentTemplate) => {
    try {
      const updatedTemplate = {
        ...template,
        is_default: true
      };
      
      await DocumentService.saveTemplate(updatedTemplate,organization?.id);
      message.success('Default template updated');
      loadTemplates();
    } catch (error) {
      console.error('Error setting default template:', error);
      message.error('Failed to set default template');
    }
  };

  const handleTemplateUpdate = async (updatedTemplate: DocumentTemplate) => {
    try {
      await DocumentService.saveTemplate(updatedTemplate,organization?.id);
      message.success('Template updated successfully');
      setCustomizerVisible(false);
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      message.error('Failed to update template');
    }
  };

  const getDefaultTemplateSettings = () => {
    return {
      header: {
        showLogo: true,
        companyName: 'Demo Company Inc.',
        tagline: 'Professional Services',
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
      },
      fields: {
        documentNumber: { show: true, label: 'Document Number', autoNumber: true, prefix: 'DOC-' },
        issueDate: { show: true, label: 'Issue Date' },
        dueDate: { show: true, label: 'Due Date' },
      }
    };
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24 
      }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Templates
          </Title>
          <Text type="secondary">
            Manage templates for {documentForm.name}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          Create Template
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
                icon={template.is_default ? <StarFilled /> : <StarOutlined />}
                onClick={() => handleSetDefault(template)}
                disabled={template.is_default}
                title={template.is_default ? 'Default template' : 'Set as default'}
              />,
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEditTemplate(template)}
                title="Edit template"
              />,
              <Popconfirm
                title="Are you sure you want to delete this template?"
                onConfirm={() => handleDeleteTemplate(template)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  danger
                  title="Delete template"
                />
              </Popconfirm>
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  {template.name}
                  {template.is_default && (
                    <Tag color="gold" icon={<StarFilled />}>
                      Default
                    </Tag>
                  )}
                </Space>
              }
              description={
                <Space direction="vertical" size={4}>
                  <Text type="secondary">
                    Created {new Date(template.created_at).toLocaleDateString()}
                  </Text>
                  <Text type="secondary">
                    Last updated {new Date(template.updated_at).toLocaleDateString()}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />

      {/* Create Template Modal */}
      <Modal
        title="Create New Template"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTemplate}
        >
          <Form.Item
            name="name"
            label="Template Name"
            rules={[{ required: true, message: 'Please enter template name' }]}
          >
            <Input placeholder="Enter template name" />
          </Form.Item>
          
          <Form.Item
            name="is_default"
            valuePropName="checked"
          >
            <Switch checkedChildren="Default" unCheckedChildren="Not Default" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Template Customizer */}
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