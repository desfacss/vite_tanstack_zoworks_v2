import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, message, Checkbox,Row,Col } from 'antd';
import {supabase} from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { Plus, Trash } from 'lucide-react';

const { Option } = Select;

interface ProfileField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface OrganizationSettings {
  profile_fields: ProfileField[];
}

const OrganizationProfileSettings: React.FC = () => {
  const { organization, user } = useAuthStore();
  const [form] = Form.useForm();
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (organization?.id) {
      fetchSettings();
    }
  }, [organization?.id]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('profile_fields')
        .eq('organization_id', organization?.id)
        .single();

      if (error) throw error;
      setFields(data?.profile_fields || []);
      form.setFieldsValue({ profile_fields: data?.profile_fields || [] });
    } catch (error) {
      message.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: { profile_fields: ProfileField[] }) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organization_settings')
        .upsert(
          {
            organization_id: organization?.id,
            profile_fields: values.profile_fields,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id' }
        );

      if (error) throw error;
      message.success('Settings updated successfully');
      setFields(values.profile_fields);
    } catch (error) {
      message.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    const newFields = [
      ...fields,
      { key: '', label: '', type: 'text', required: false, options: [] },
    ];
    setFields(newFields);
    form.setFieldsValue({ profile_fields: newFields });
  };

  const handleRemoveField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    form.setFieldsValue({ profile_fields: newFields });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Organization Profile Settings</h2>
      <Form
        form={form}
        onFinish={onFinish}
        layout="vertical"
        initialValues={{ profile_fields: fields }}
      >
        <Form.List name="profile_fields">
          {(fieldsList, { add, remove }) => (
            <>
              {fieldsList.map((field, index) => (
                <div
                  key={field.key}
                  style={{
                    border: '1px solid #f0f0f0',
                    padding: '16px',
                    marginBottom: '16px',
                    borderRadius: '4px',
                  }}
                >
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item
                        name={[field.name, 'key']}
                        label="Field Key"
                        rules={[{ required: true, message: 'Please enter field key' }]}
                      >
                        <Input placeholder="e.g., department" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name={[field.name, 'label']}
                        label="Label"
                        rules={[{ required: true, message: 'Please enter field label' }]}
                      >
                        <Input placeholder="e.g., Department" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name={[field.name, 'type']}
                        label="Type"
                        rules={[{ required: true, message: 'Please select field type' }]}
                      >
                        <Select
                          onChange={(value) => {
                            const currentFields = form.getFieldValue('profile_fields');
                            if (value !== 'select') {
                              delete currentFields[index].options;
                            } else {
                              currentFields[index].options = currentFields[index].options || [];
                            }
                            form.setFieldsValue({ profile_fields: currentFields });
                          }}
                        >
                          <Option value="text">Text</Option>
                          <Option value="select">Select</Option>
                          <Option value="email">Email</Option>
                          <Option value="phone">Phone</Option>
                          <Option value="date">Date</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        name={[field.name, 'required']}
                        label="Required"
                        valuePropName="checked"
                      >
                        <Checkbox />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button
                        type="dashed"
                        danger
                        icon={<Trash size={16} />}
                        onClick={() => handleRemoveField(index)}
                        style={{ marginTop: '30px' }}
                      />
                    </Col>
                  </Row>
                  {form.getFieldValue(['profile_fields', index, 'type']) === 'select' && (
                    <Form.Item
                      name={[field.name, 'options']}
                      label="Options"
                      rules={[{ required: true, message: 'Please provide options' }]}
                    >
                      <Select
                        mode="tags"
                        placeholder="Enter options and press Enter"
                        tokenSeparators={[',']}
                      />
                    </Form.Item>
                  )}
                </div>
              ))}
              <Button
                type="dashed"
                onClick={handleAddField}
                icon={<Plus size={16} />}
                style={{ width: '100%', marginBottom: '16px' }}
              >
                Add Field
              </Button>
            </>
          )}
        </Form.List>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default OrganizationProfileSettings;
