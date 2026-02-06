import React, { useState, useEffect } from 'react';
import { Button, Input, Form, Select, Space, Row, Col, Card, message, Tabs } from 'antd';
import { SaveOutlined, RocketOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { EntityBlueprint } from './types/entityTypes';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface BlueprintConfigProps {
  entityType: string;
  entitySchema: string;
}

const BlueprintConfig: React.FC<BlueprintConfigProps> = ({ entityType, entitySchema }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blueprint, setBlueprint] = useState<Partial<EntityBlueprint>>({});
  const [form] = Form.useForm();

  useEffect(() => {
    fetchBlueprint();
  }, [entityType, entitySchema]);

  const fetchBlueprint = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema('core')
        .from('entity_blueprints')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_schema', entitySchema)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBlueprint(data);
        form.setFieldsValue({
          ...data,
          extra_objects: JSON.stringify(data.extra_objects || {}, null, 2),
          ui_config: JSON.stringify(data.ui_config || {}, null, 2),
          semantics: JSON.stringify(data.semantics || {}, null, 2),
          rules: JSON.stringify(data.rules || {}, null, 2),
          ai_metadata: JSON.stringify(data.ai_metadata || {}, null, 2),
          sub_panels: JSON.stringify(data.sub_panels || [], null, 2),
          dependencies: (data.dependencies || []).join('\n'),
        });
      } else {
        const defaults: Partial<EntityBlueprint> = {
          entity_type: entityType,
          entity_schema: entitySchema,
          status: 'draft',
          classification: 'transactional',
          ai_metadata: { embedding_model: "text-embedding-3-large" },
          extra_objects: {},
          ui_config: {},
          semantics: {},
          rules: {},
          sub_panels: [],
        };
        setBlueprint(defaults);
        form.setFieldsValue({
          ...defaults,
          ai_metadata: JSON.stringify(defaults.ai_metadata, null, 2),
          extra_objects: JSON.stringify(defaults.extra_objects, null, 2),
          ui_config: JSON.stringify(defaults.ui_config, null, 2),
          semantics: JSON.stringify(defaults.semantics, null, 2),
          rules: JSON.stringify(defaults.rules, null, 2),
          sub_panels: JSON.stringify(defaults.sub_panels, null, 2),
        });
      }
    } catch (error: any) {
      console.error('Error fetching blueprint:', error);
      message.error('Failed to load blueprint configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      setSaving(true);
      
      // Parse JSON fields and formats
      const payload: any = {
        entity_type: entityType,
        entity_schema: entitySchema,
        ...values,
        extra_objects: JSON.parse(values.extra_objects || '{}'),
        ui_config: JSON.parse(values.ui_config || '{}'),
        semantics: JSON.parse(values.semantics || '{}'),
        rules: JSON.parse(values.rules || '{}'),
        ai_metadata: JSON.parse(values.ai_metadata || '{}'),
        sub_panels: JSON.parse(values.sub_panels || '[]'),
        dependencies: (values.dependencies || '').split('\n').map((s: string) => s.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      };

      // Remove display_format as requested to ignore it
      delete payload.display_format;

      const { error } = await supabase
        .schema('core')
        .from('entity_blueprints')
        .upsert(payload, { 
          onConflict: 'entity_schema,entity_type' 
        });

      if (error) throw error;

      message.success('Blueprint saved successfully');
      
      // Call bootstrap RPCs
      await bootstrapEntity();
      
    } catch (error: any) {
      console.error('Error saving blueprint:', error);
      message.error(`Failed to save blueprint: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const bootstrapEntity = async () => {
    try {
      message.loading({ content: 'Bootstrapping entity and suggesting views...', key: 'bootstrap' });
      
      // RPC 1: Bootstrap Entity
      const { error: error1 } = await supabase.schema('core').rpc('comp_util_ops_bootstrap_entity', {
        p_schema_name: entitySchema,
        p_entity_type: entityType,
        p_config: {},
        p_force_refresh: true,
        p_dry_run: false
      });
      if (error1) throw error1;

      // RPC 2: Auto Suggest Views
      const { error: error2 } = await supabase.schema('core').rpc('util_auto_suggest_views', {
        p_schema_name: entitySchema,
        p_entity_type: entityType,
        p_dry_run: false
      });
      if (error2) throw error2;

      message.success({ content: 'Entity bootstrapped and views suggested successfully!', key: 'bootstrap' });
    } catch (error: any) {
      console.error('Error during bootstrap:', error);
      message.error({ content: `Bootstrap failed: ${error.message}`, key: 'bootstrap' });
    }
  };

  const JsonField = ({ name, label, tooltip }: any) => (
    <Form.Item 
      name={name} 
      label={label} 
      tooltip={tooltip}
      rules={[
        {
          validator: (_, value) => {
            if (!value) return Promise.resolve();
            try {
              JSON.parse(value);
              return Promise.resolve();
            } catch (e) {
              return Promise.reject('Invalid JSON format');
            }
          }
        }
      ]}
    >
      <TextArea rows={6} style={{ fontFamily: 'monospace' }} placeholder="{}" />
    </Form.Item>
  );

  if (loading) return <div>Loading blueprint...</div>;

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        <Card title="General Information" style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="display_name" label="Display Name">
                <Input placeholder="Human readable name" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="classification" label="Classification" initialValue="transactional">
                <Select>
                  <Option value="transactional">Transactional</Option>
                  <Option value="master">Master</Option>
                  <Option value="lifecycle">Lifecycle</Option>
                  <Option value="reference">Reference</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" label="Status" initialValue="draft">
                <Select>
                  <Option value="draft">Draft</Option>
                  <Option value="active">Active</Option>
                  <Option value="archived">Archived</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="base_source" label="Base Source Table">
                <Input placeholder="e.g. unified.contacts" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="partition_filter" label="Partition Filter">
                <Input placeholder="e.g. contact_type = 'agent'" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="dependencies" label="Dependencies (one per line)">
            <TextArea rows={3} placeholder="e.g.\nexternal.contacts\nexternal.accounts" />
          </Form.Item>
        </Card>

        <Tabs defaultActiveKey="sql" type="card">
          <TabPane tab="SQL Definition" key="sql">
            <Card>
              <Form.Item name="physical_ddl" label="Physical DDL">
                <TextArea rows={10} style={{ fontFamily: 'monospace' }} placeholder="CREATE TABLE ..." />
              </Form.Item>
              <Form.Item name="custom_view_sql" label="Custom View SQL">
                <TextArea rows={10} style={{ fontFamily: 'monospace' }} placeholder="CREATE OR REPLACE VIEW ..." />
              </Form.Item>
            </Card>
          </TabPane>
          <TabPane tab="JSON Configs" key="json">
            <Card>
              <Row gutter={24}>
                <Col span={12}>
                  <JsonField name="ui_config" label="UI Config" />
                </Col>
                <Col span={12}>
                  <JsonField name="extra_objects" label="Extra Objects" />
                </Col>
              </Row>
              <Row gutter={24}>
                <Col span={12}>
                  <JsonField name="semantics" label="Semantics" />
                </Col>
                <Col span={12}>
                  <JsonField name="rules" label="Rules" />
                </Col>
              </Row>
              <Row gutter={24}>
                <Col span={12}>
                  <JsonField name="sub_panels" label="Sub Panels" />
                </Col>
                <Col span={12}>
                  <JsonField name="ai_metadata" label="AI Metadata" />
                </Col>
              </Row>
            </Card>
          </TabPane>
        </Tabs>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={saving} 
              icon={<SaveOutlined />}
              size="large"
            >
              Save Blueprint & Bootstrap
            </Button>
            <Button 
              icon={<RocketOutlined />} 
              onClick={bootstrapEntity}
              disabled={!blueprint.id}
            >
              Trigger Bootstrap Only
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default BlueprintConfig;
