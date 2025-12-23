import React, { useState, useEffect } from 'react';
import { supabase } from '@/core/lib/supabase';
import {
  Form,
  Input,
  Select,
  Button,
  message,
  Space,
  Card,
  InputNumber,
  Tooltip,
  Skeleton
} from 'antd';
import { Search, Save, Plus, Trash2, HelpCircle } from 'lucide-react';

const { Option } = Select;
const { TextArea } = Input;

interface EntityConfig {
  id: string;
  entity_type: string;
  entity_schema: string;
  display_format: any;
  max_counter: any;
}

interface TokenConfigItem {
  type: 'lookup' | 'date_part' | 'counter';
  token: string;
  entity_field?: string;
  lookup_table?: string;
  lookup_schema?: string;
  lookup_value_field?: string;
  date_format?: string;
}

interface DisplayFormatFormValues {
  format: string;
  date_field: string;
  counter_padding: number;
  reset_period: 'CALENDAR_YEAR' | 'FINANCIAL_YEAR';
  fy_start_month?: number;
  reset_group?: string;
  token_config: TokenConfigItem[];
}

const EntityConfigForm: React.FC = () => {
  const [form] = Form.useForm<DisplayFormatFormValues & { selected_entity_id: string }>();
  const [entities, setEntities] = useState<EntityConfig[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .schema('core')
        .from('entities')
        .select('id, entity_type, entity_schema, display_format, max_counter')
        .order('entity_schema, entity_type');

      if (error) {
        message.error(`Error fetching entities: ${error.message}`);
      } else if (data) {
        setEntities(data as EntityConfig[]);
      }
      setLoading(false);
    };
    fetchEntities();
  }, []);

  const handleEntitySelect = (entityId: string) => {
    const entity = entities.find(e => e.id === entityId);
    setSelectedEntity(entity || null);

    if (entity) {
      const formatData = entity.display_format || {};
      const counterConfig = formatData.counter_config || {};

      form.setFieldsValue({
        selected_entity_id: entityId,
        format: formatData.format || '',
        date_field: formatData.date_field || '',
        counter_padding: formatData.counter_padding || 4,
        token_config: formatData.token_config || [],
        reset_period: counterConfig.reset_period || 'CALENDAR_YEAR',
        fy_start_month: counterConfig.fy_start_month,
        reset_group: counterConfig.reset_group,
      });
    } else {
      form.resetFields();
    }
  };

  const filterOption = (input: string, option: any) => {
    if (option && typeof option.children === 'string') {
      return option.children.toLowerCase().includes(input.toLowerCase());
    }
    return false;
  };

  const onFinish = async (values: DisplayFormatFormValues) => {
    if (!selectedEntity) {
      message.error('Please select an entity to update.');
      return;
    }

    const newCounterConfig: any = {
      reset_period: values.reset_period,
    };
    if (values.reset_period === 'FINANCIAL_YEAR' && values.fy_start_month) {
      newCounterConfig.fy_start_month = values.fy_start_month;
    }
    if (values.reset_group) {
      newCounterConfig.reset_group = values.reset_group;
    }

    const newDisplayFormat = {
      ...selectedEntity.display_format,
      format: values.format,
      date_field: values.date_field,
      counter_padding: values.counter_padding,
      token_config: values.token_config.filter(t => t.token && t.type),
      counter_config: newCounterConfig,
    };

    setIsSaving(true);
    const { error } = await supabase
      .schema('core')
      .from('entities')
      .update({
        display_format: newDisplayFormat,
      })
      .eq('id', selectedEntity.id);

    setIsSaving(false);

    if (error) {
      message.error(`Update failed: ${error.message}`);
    } else {
      setEntities((prev: EntityConfig[]) =>
        prev.map(e => e.id === selectedEntity.id
          ? { ...e, display_format: newDisplayFormat }
          : e
        )
      );
      setSelectedEntity(prev => prev ? { ...prev, display_format: newDisplayFormat } : null);
      message.success('Entity configuration updated successfully!');
    }
  };

  const groupingTokens = form.getFieldValue('token_config')?.filter((t: TokenConfigItem) => t.type === 'lookup').map((t: TokenConfigItem) => t.token) || [];

  return (
    <Card title="Display ID Format Configuration" style={{ maxWidth: 1000, margin: '20px auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish as any}
        initialValues={{ counter_padding: 4, reset_period: 'CALENDAR_YEAR', token_config: [] }}
      >
        <Form.Item
          label="Select Entity"
          name="selected_entity_id"
          rules={[{ required: true, message: 'Please select an entity' }]}
        >
          <Select
            placeholder="Search by entity_schema.entity_type"
            showSearch
            loading={loading}
            optionFilterProp="children"
            onChange={handleEntitySelect}
            filterOption={filterOption}
          >
            {entities.map(entity => (
              <Option key={entity.id} value={entity.id}>
                {entity.entity_schema}.{entity.entity_type}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {loading ? <Skeleton active /> : (
          <Space direction="vertical" style={{ width: '100%' }}>

            <Card title="Core ID Format" size="small" style={{ marginBottom: 16 }}>
              <Form.Item
                label="ID Format String"
                name="format"
                tooltip="The template for the generated ID. Use tokens defined below. E.g., AST-{LOCATION_CODE}-{DATE}-{COUNTER}"
                rules={[{ required: true, message: 'Format string is required' }]}
              >
                <Input placeholder="E.g., AST-{LOCATION_CODE}-{DATE}-{COUNTER}" />
              </Form.Item>

              <Form.Item
                label="Date Field (Entity Table Column)"
                name="date_field"
                tooltip="The column in the entity table to use for date tokens and counter resets (e.g., request_date)"
                rules={[{ required: true, message: 'Date field is required' }]}
              >
                <Input placeholder="E.g., request_date" />
              </Form.Item>

              <Form.Item
                label="Counter Padding Length"
                name="counter_padding"
                tooltip="The minimum length of the counter part (e.g., 4 means 0001, 0010)"
                rules={[{ required: true, message: 'Padding is required' }]}
              >
                <InputNumber min={1} max={10} style={{ width: 200 }} />
              </Form.Item>
            </Card>

            <Card title="ID Token Configuration" size="small" style={{ marginBottom: 16 }}>
              <Form.List name="token_config">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8, border: '1px solid #ddd', padding: 12, borderRadius: 4 }} align="start">
                        <Form.Item
                          {...restField}
                          name={[name, 'type']}
                          rules={[{ required: true, message: 'Type missing' }]}
                          style={{ width: 120, marginBottom: 0 }}
                        >
                          <Select placeholder="Type">
                            <Option value="lookup">Lookup</Option>
                            <Option value="date_part">Date Part</Option>
                            <Option value="counter">Counter</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'token']}
                          rules={[{ required: true, message: 'Token missing' }]}
                          style={{ width: 150, marginBottom: 0 }}
                        >
                          <Input placeholder="E.g., {CODE}" />
                        </Form.Item>

                        {form.getFieldValue(['token_config', name, 'type']) === 'lookup' && (
                          <>
                            <Form.Item {...restField} name={[name, 'entity_field']} rules={[{ required: true }]} style={{ width: 150, marginBottom: 0 }}>
                              <Input placeholder="Source Field (e.g., location_id)" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'lookup_schema']} rules={[{ required: true }]} style={{ width: 100, marginBottom: 0 }}>
                              <Input placeholder="Lkp Schema" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'lookup_table']} rules={[{ required: true }]} style={{ width: 120, marginBottom: 0 }}>
                              <Input placeholder="Lkp Table" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'lookup_value_field']} rules={[{ required: true }]} style={{ width: 140, marginBottom: 0 }}>
                              <Input placeholder="Lkp Value Field (e.g., short_code)" />
                            </Form.Item>
                          </>
                        )}

                        {form.getFieldValue(['token_config', name, 'type']) === 'date_part' && (
                          <Form.Item {...restField} name={[name, 'date_format']} rules={[{ required: true }]} style={{ width: 120, marginBottom: 0 }}>
                            <Input placeholder="Format (e.g., YYYY)" />
                          </Form.Item>
                        )}

                        {form.getFieldValue(['token_config', name, 'type']) === 'counter' && (
                          <Tooltip title="This token is automatically handled by the trigger and does not require extra configuration.">
                            <HelpCircle size={16} style={{ color: '#1890ff', marginTop: 8 }} />
                          </Tooltip>
                        )}

                        <Trash2 onClick={() => remove(name)} style={{ color: 'red', marginTop: 8, cursor: 'pointer' }} size={16} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add({ type: 'lookup', token: '{NEW_TOKEN}' })} block icon={<Plus size={14} />}>
                        Add ID Token
                      </Button>
                      <p style={{ fontSize: '12px', color: '#888', marginTop: 8 }}>
                        Define all tokens used in the "ID Format String" here.
                      </p>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Card>

            <Card title="Counter Reset Logic" size="small" style={{ marginBottom: 16 }}>
              <Form.Item
                label="Counter Reset Period"
                name="reset_period"
                tooltip="When the main counter resets to 1."
                rules={[{ required: true, message: 'Reset period is required' }]}
              >
                <Select>
                  <Option value="CALENDAR_YEAR">Calendar Year (Jan 1)</Option>
                  <Option value="FINANCIAL_YEAR">Financial Year</Option>
                </Select>
              </Form.Item>

              {form.getFieldValue('reset_period') === 'FINANCIAL_YEAR' && (
                <Form.Item
                  label="Financial Year Start Month"
                  name="fy_start_month"
                  rules={[{ required: true, message: 'Start month is required' }]}
                >
                  <InputNumber min={1} max={12} placeholder="E.g., 4 for April" style={{ width: 200 }} />
                </Form.Item>
              )}

              <Form.Item
                label="Counter Reset Group"
                name="reset_group"
                tooltip="Optional: Counter resets separately for each value of this token (e.g., per location code). Must be a Lookup token."
              >
                <Select
                  placeholder="Select a Lookup Token (e.g., {LOCATION_CODE})"
                  allowClear
                >
                  {groupingTokens.map((token: string) => (
                    <Option key={token} value={token}>{token}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>

            <Card title="Current Max Counter Status (Read-Only)" size="small">
              <Form.Item label="Max Counter Values (Database Status)">
                <TextArea
                  rows={5}
                  value={JSON.stringify(selectedEntity?.max_counter, null, 2)}
                  readOnly
                />
                <p style={{ fontSize: '12px', color: '#888' }}>
                  This field is managed by the database trigger and shows the last used counter for each period/group key.
                </p>
              </Form.Item>
            </Card>

            <Form.Item style={{ marginTop: 24 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={isSaving} disabled={!selectedEntity}>
                  <Save size={14} /> {isSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button onClick={() => handleEntitySelect(form.getFieldValue('selected_entity_id'))} disabled={!selectedEntity}>
                  <Search size={14} /> Reset Form
                </Button>
              </Space>
            </Form.Item>
          </Space>
        )}
      </Form>
    </Card>
  );
};

export default EntityConfigForm;
