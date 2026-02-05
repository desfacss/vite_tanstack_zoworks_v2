import React, { useState, useEffect } from 'react';
import { Button, Input, Form, Select, Typography, Space, Divider, Row, Col, Card, message } from 'antd';
import { SettingOutlined, SwapOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import TokenTemplateModal, { useTokenTemplates } from './TokenTemplateModal'; // Import the new modal

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface DisplayIdConfigProps {
  entityType: string;
  entitySchema: string;
  organizationId?: string;
}

interface IdConfig {
  format_template: string;
  reset_period: 'CALENDAR_YEAR' | 'FINANCIAL_YEAR';
  padding: number;
  current_counter?: Record<string, number>;
}

const DisplayIdConfig: React.FC<DisplayIdConfigProps> = ({ entityType, entitySchema, organizationId }) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<IdConfig>({
    format_template: '',
    reset_period: 'CALENDAR_YEAR',
    padding: 4,
    current_counter: {},
  });
  const [previewId, setPreviewId] = useState('');
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Use the custom hook for template logic
  const {
      availableTokens,
      fetchTokens
  } = useTokenTemplates(entityType, entitySchema);

  useEffect(() => {
    fetchConfig();
    fetchTokens(); // Fetch tokens when component mounts
  }, [entityType, entitySchema, organizationId]);

  useEffect(() => {
    generatePreview();
  }, [config, availableTokens]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      let query = supabase
        .schema('core')
        .from('display_id_states')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_schema', entitySchema);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.is('organization_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        const fetchedConfig = {
          format_template: data.format_template || '',
          reset_period: data.reset_period || 'CALENDAR_YEAR',
          padding: data.padding || 4,
          current_counter: data.current_counter || {},
        };
        setConfig(fetchedConfig);
        form.setFieldsValue(fetchedConfig);
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
      const upsertData = {
        entity_type: entityType,
        entity_schema: entitySchema,
        organization_id: organizationId || null,
        format_template: values.format_template,
        padding: values.padding,
        reset_period: values.reset_period,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .schema('core')
        .from('display_id_states')
        .upsert(upsertData, { 
          onConflict: 'entity_schema,entity_type,organization_id' 
        });

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, ...values }));
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
      '{SEQ}': '0'.repeat(config.padding),
      '{COUNTER}': '0'.repeat(config.padding),
      // Add fake values for lookup tokens for preview
      ...availableTokens.reduce((acc, token) => ({
          ...acc, 
          [token.token]: `[${token.name}]` 
      }), {})
    };

    // Add template string with tokens replaced
    let preview = config.format_template || '';
    Object.entries(tokens).forEach(([token, value]) => {
      preview = preview.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    setPreviewId(preview);
  };
  
  const handleTemplateSelect = (selectedToken: string) => {
      const currentTemplate = config.format_template || '';
      const newTemplate = currentTemplate ? `${currentTemplate}-${selectedToken}` : selectedToken;
      
      form.setFieldsValue({ format_template: newTemplate });
      setConfig(prev => ({ ...prev, format_template: newTemplate }));
  };

  return (
    <div style={{ maxWidth: 800 }}>
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
              <Form.Item label="Format Template" tooltip="Use tokens to construct the dynamic part of the ID. Tokens like {YYYY}, {MM}, {COUNTER}, {SEQ} are supported.">
                <Space.Compact style={{ width: '100%' }}>
                    <Form.Item
                        name="format_template"
                        noStyle
                    >
                        <Input 
                            placeholder="e.g., REQ-{SEQ} or TKT-{DATE}-{COUNTER}" 
                            style={{ flex: 1 }}
                            onChange={(e) => setConfig(prev => ({ ...prev, format_template: e.target.value }))}
                        />
                    </Form.Item>
                    <Button 
                        onClick={() => {
                          form.setFieldsValue({ format_template: '' });
                          setConfig(prev => ({ ...prev, format_template: '' }));
                        }}
                    >
                        Clear
                    </Button>
                    <Button 
                        icon={<SwapOutlined />} 
                        type="primary"
                        onClick={() => setIsTemplateModalVisible(true)}
                    >
                        Insert Token
                    </Button>
                </Space.Compact>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item 
                name="padding" 
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
                name="reset_period" 
                label="Counter Reset Period" 
                initialValue="CALENDAR_YEAR"
              >
                <Select>
                  <Option value="CALENDAR_YEAR">Calendar Year (Jan 1st)</Option>
                  <Option value="FINANCIAL_YEAR">Financial Year (Apr 1st)</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Current Counter Status (Read-Only)">
                <TextArea 
                  rows={4} 
                  value={JSON.stringify(config.current_counter || {}, null, 2)} 
                  readOnly 
                  style={{ background: '#f9f9f9', fontFamily: 'monospace' }}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  This shows the current counter values stored in the database for different keys.
                </Text>
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
