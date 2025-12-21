import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Button, Card, Space, Typography, Row, Col, message } from 'antd';
import { DocumentTypeConfig } from './types';
import ItemsTable from './ItemsTable';
import SignatureWidget from './SignatureWidget';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

// Use Vite's import.meta.glob to handle dynamic imports of schema files
const schemaModules = import.meta.glob('../schemas/*.json');

interface DocumentFormProps {
  documentType: DocumentTypeConfig;
  onSubmit: (formData: any) => void;
  initialData?: any;
}

const DocumentForm: React.FC<DocumentFormProps> = ({ documentType, onSubmit, initialData }) => {
  const [form] = Form.useForm();
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const loadSchema = async () => {
      try {
        setLoading(true);
        
        // Construct the full import path for the schema module
        const fullImportPath = `../schemas/${documentType.schemaPath.replace('/schemas/', '')}`;
        
        // Get the schema module using the glob import
        const schemaLoader = schemaModules[fullImportPath];
        if (!schemaLoader) {
          throw new Error(`Schema not found: ${fullImportPath}`);
        }
        
        const module = await schemaLoader();
        setSchema((module as any).default);
        
        // Initialize form with default values
        if (initialData) {
          form.setFieldsValue({
            ...initialData,
            issueDate: initialData.issueDate ? dayjs(initialData.issueDate) : undefined,
            dueDate: initialData.dueDate ? dayjs(initialData.dueDate) : undefined,
            serviceDate: initialData.serviceDate ? dayjs(initialData.serviceDate) : undefined,
          });
          setItems(initialData.items || []);
        }
      } catch (err) {
        message.error('Failed to load document schema');
        console.error('Error loading schema:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSchema();
  }, [documentType, initialData, form]);

  const handleSubmit = (values: any) => {
    const formData = {
      ...values,
      items,
      issueDate: values.issueDate?.format('YYYY-MM-DD'),
      dueDate: values.dueDate?.format('YYYY-MM-DD'),
      serviceDate: values.serviceDate?.format('YYYY-MM-DD'),
    };
    onSubmit(formData);
  };

  const renderFormFields = () => {
    if (!schema) return null;

    const { properties } = schema;
    const fields = [];

    // Basic document fields
    Object.entries(properties).forEach(([key, property]: [string, any]) => {
      if (key === 'items' || key === 'signature') return; // Handle separately

      if (property.type === 'string' && property.format === 'date') {
        fields.push(
          <Col span={12} key={key}>
            <Form.Item
              name={key}
              label={property.title}
              rules={[{ required: schema.required?.includes(key), message: `${property.title} is required` }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        );
      } else if (property.type === 'string' && key === 'notes') {
        fields.push(
          <Col span={24} key={key}>
            <Form.Item name={key} label={property.title}>
              <TextArea rows={3} />
            </Form.Item>
          </Col>
        );
      } else if (property.type === 'string' && property.enum) {
        fields.push(
          <Col span={12} key={key}>
            <Form.Item
              name={key}
              label={property.title}
              rules={[{ required: schema.required?.includes(key), message: `${property.title} is required` }]}
            >
              <select className="ant-input">
                <option value="">Select {property.title}</option>
                {property.enum.map((option: string) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Form.Item>
          </Col>
        );
      } else if (property.type === 'string') {
        fields.push(
          <Col span={12} key={key}>
            <Form.Item
              name={key}
              label={property.title}
              rules={[{ required: schema.required?.includes(key), message: `${property.title} is required` }]}
            >
              <Input />
            </Form.Item>
          </Col>
        );
      } else if (property.type === 'object') {
        // Handle nested objects like billedTo, vendor, client
        const objectFields = Object.entries(property.properties).map(([nestedKey, nestedProperty]: [string, any]) => (
          <Col span={12} key={`${key}.${nestedKey}`}>
            <Form.Item
              name={[key, nestedKey]}
              label={nestedProperty.title}
              rules={[{ 
                required: property.required?.includes(nestedKey), 
                message: `${nestedProperty.title} is required` 
              }]}
            >
              {nestedProperty.type === 'string' && nestedKey === 'address' ? (
                <TextArea rows={2} />
              ) : (
                <Input />
              )}
            </Form.Item>
          </Col>
        ));

        fields.push(
          <Col span={24} key={key}>
            <Card title={property.title} size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                {objectFields}
              </Row>
            </Card>
          </Col>
        );
      }
    });

    return fields;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <span className="text-gray-600">Loading form...</span>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <Card>
        <div className="text-center text-gray-500">
          No schema available for this document type.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Title level={3}>Create {documentType.displayName}</Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialData}
      >
        <Row gutter={16}>
          {renderFormFields()}
          
          {/* Items Table */}
          {schema.properties.items && (
            <Col span={24}>
              <Card title="Items" size="small" style={{ marginBottom: 16 }}>
                <ItemsTable
                  items={items}
                  onChange={setItems}
                  schema={schema.properties.items.items}
                />
              </Card>
            </Col>
          )}

          {/* Signature */}
          {schema.properties.signature && (
            <Col span={24}>
              <Form.Item name="signature" label="Signature">
                <SignatureWidget />
              </Form.Item>
            </Col>
          )}

          <Col span={24}>
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                Create Document
              </Button>
              <Button size="large">
                Cancel
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default DocumentForm;