import React, { useState, useEffect } from 'react';
import { Button, Input, Form, Select, Typography, Space, Divider, Row, Col, Card, message, Modal } from 'antd';
import { SettingOutlined, SwapOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import TokenTemplateModal, { useTokenTemplates } from './TokenTemplateModal'; // Import the new modal

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface DisplayIdConfigProps {
  entityType: string;
  entitySchema: string;
}

interface IdConfig {
  prefix: string;
  counter_padding: number;
  template_string: string;
  start_number: number;
  reset_period: 'none' | 'daily' | 'monthly' | 'yearly_cal' | 'yearly_fin';
}

const DisplayIdConfig: React.FC<DisplayIdConfigProps> = ({ entityType, entitySchema }) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<IdConfig>({
    prefix: '',
    counter_padding: 4,
    template_string: '',
    start_number: 1,
    reset_period: 'none',
  });
  const [previewId, setPreviewId] = useState('');
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Use the custom hook for template logic
  const {
      availableTokens,
      fetchTokens,
      loadingTokens
  } = useTokenTemplates(entityType, entitySchema);

  useEffect(() => {
    fetchConfig();
    fetchTokens(); // Fetch tokens when component mounts
  }, [entityType, entitySchema]);

  useEffect(() => {
    generatePreview();
  }, [config]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema('core')
        .from('entities')
        .select('id_config')
        .eq('entity_type', entityType)
        .eq('entity_schema', entitySchema)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.id_config) {
        setConfig(data.id_config);
        form.setFieldsValue(data.id_config);
      }
    } catch (error: any) {
      console.error('Error fetching ID config:', error);
      message.error('Failed to load ID configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: IdConfig) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .schema('core')
        .from('entities')
        .update({ id_config: values })
        .eq('entity_type', entityType)
        .eq('entity_schema', entitySchema);

      if (error) throw error;
      
      setConfig(values);
      message.success('ID configuration saved successfully');
    } catch (error: any) {
      console.error('Error saving ID config:', error);
      message.error('Failed to save ID configuration');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    const today = new Date();
    const tokens: Record<string, string> = {
      '{YYYY}': today.getFullYear().toString(),
      '{YY}': today.getFullYear().toString().slice(-2),
      '{MM}': (today.getMonth() + 1).toString().padStart(2, '0'),
      '{DD}': today.getDate().toString().padStart(2, '0'),
      // Add fake values for lookup tokens for preview
      ...availableTokens.reduce((acc, token) => ({
          ...acc, 
          [token.token]: `[${token.name}]` 
      }), {})
    };

    let preview = config.template_string || '';
    
    // Replace tokens
    Object.entries(tokens).forEach(([token, value]) => {
      preview = preview.replace(new RegExp(token, 'g'), value);
    });

    // Add counter
    const counter = config.start_number.toString().padStart(config.counter_padding, '0');
    preview += (preview ? '-' : '') + counter;

    setPreviewId(preview);
  };
  
  const handleTemplateSelect = (selectedTemplate: string) => {
      form.setFieldsValue({ template_string: selectedTemplate });
      setConfig(prev => ({ ...prev, template_string: selectedTemplate }));
      setIsTemplateModalVisible(false);
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {/* <h2>Display ID Configuration</h2>
      <Paragraph type="secondary">
        Configure how unique identifiers are generated for {entityType}. 
        IDs are composed of a prefix/template part and an auto-incrementing counter.
      </Paragraph> */}

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          onValuesChange={(_, allValues) => setConfig(prev => ({ ...prev, ...allValues }))}
          initialValues={config}
        >
          <Row gutter={24}>
            <Col span={24}>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '16px', 
                borderRadius: '8px', 
                marginBottom: '24px',
                border: '1px solid #d9d9d9',
                textAlign: 'center'
              }}>
                <Text type="secondary">ID Preview</Text>
                <Title level={2} style={{ margin: '8px 0 0' }}>{previewId}</Title>
              </div>
            </Col>

            <Col span={24}>
              <Form.Item label="Format Template" tooltip="Use tokens to construct the dynamic part of the ID">
                <Space.Compact style={{ width: '100%' }}>
                    <Form.Item
                        name="template_string"
                        noStyle
                    >
                        <Input 
                            placeholder="e.g., INV-{YYYY}-{MM}" 
                            onChange={(e) => setConfig(prev => ({ ...prev, template_string: e.target.value }))}
                        />
                    </Form.Item>
                    <Button 
                        icon={<SwapOutlined />} 
                        onClick={() => setIsTemplateModalVisible(true)}
                    >
                        Insert Token
                    </Button>
                </Space.Compact>
              </Form.Item>
            </Col>

            <Col span={12}>
                {/* Prefix is essentially redundant if we have a full template string, 
                    but keeping it for backward compatibility or simple use cases if needed. 
                    Maybe hide it if template_string is used? Or treat it as a static potential start?
                    For this impl, lets keep it but maybe de-emphasize it.
                */}
              <Form.Item 
                name="prefix" 
                label="Static Prefix (Optional)"
                extra="Added before the template string"
              >
                <Input placeholder="e.g. PO" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item 
                name="counter_padding" 
                label="Counter Padding" 
                initialValue={4}
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value={3}>3 Digits (001)</Option>
                  <Option value={4}>4 Digits (0001)</Option>
                  <Option value={5}>5 Digits (00001)</Option>
                  <Option value={6}>6 Digits (000001)</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item 
                name="start_number" 
                label="Start Number" 
                initialValue={1}
                rules={[{ required: true }]}
              >
                <Input type="number" min={1} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item 
                name="reset_period" 
                label="Counter Reset Period" 
                initialValue="none"
              >
                <Select>
                  <Option value="none">Never Reset</Option>
                  <Option value="daily">Daily (First ID of day is 1)</Option>
                  <Option value="monthly">Monthly (First ID of month is 1)</Option>
                  <Option value="yearly_cal">Yearly (Calendar - Jan 1st)</Option>
                  <Option value="yearly_fin">Yearly (Financial - Apr 1st)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SettingOutlined />}>
              Save Configuration
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <TokenTemplateModal 
        visible={isTemplateModalVisible}
        onClose={() => setIsTemplateModalVisible(false)}
        onSelect={handleTemplateSelect}
        entityType={entityType}
        entitySchema={entitySchema}
      />
    </div>
  );
};

export default DisplayIdConfig;
