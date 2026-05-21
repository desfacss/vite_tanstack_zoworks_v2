import React, { useState, useEffect } from 'react';
import { Button, Input, Form, Select, Space, Row, Col, Card, message, Tabs, Table, Typography, Modal, Popconfirm, Switch, Divider, Tooltip, Tag, Collapse, Alert } from 'antd';
import { SaveOutlined, RocketOutlined, HistoryOutlined, SettingOutlined, DatabaseOutlined, DesktopOutlined, DeleteOutlined, InfoCircleOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { EntityBlueprint } from './types/entityTypes';
import JsonEditor from '@/modules/ai/components/JsonEditor';
import ReactDiffViewer from 'react-diff-viewer-continued';

// ─── Business rule constants (frozen — sourced from DB constraints) ───────────
const CLASSIFICATION_OPTIONS = [
  { value: 'transactional', label: 'Transactional' },
  { value: 'master',        label: 'Master' },
  { value: 'configuration', label: 'Configuration' },
  { value: 'analytical',    label: 'Analytical' },
];

const REGISTRATION_MODE_BY_CLASSIFICATION: Record<string, { value: string; label: string }[]> = {
  master:        [{ value: 'anchor', label: 'Anchor' }, { value: 'contact_anchor', label: 'Contact Anchor' }, { value: 'graduated', label: 'Graduated' }],
  transactional: [{ value: 'none', label: 'None' }, { value: 'graduated', label: 'Graduated' }],
  configuration: [{ value: 'none', label: 'None' }],
  analytical:    [{ value: 'none', label: 'None' }],
};

const FORM_TYPE_OPTIONS = [
  { value: 'simple',    label: 'Simple' },
  { value: 'dependent', label: 'Dependent' },
  { value: 'composite', label: 'Composite' },
  { value: 'nested',    label: 'Nested' },
  { value: 'junction',  label: 'Junction' },
  { value: 'allocator', label: 'Allocator' },
];

// form_type → ai_resolution auto-derivation (business rule)
const AI_RESOLUTION_BY_FORM_TYPE: Record<string, string> = {
  simple:    'direct',
  junction:  'direct',
  dependent: 'resolve_parent',
  composite: 'resolve_parent',
  nested:    'nested_create',
  allocator: 'allocator_flow',
};

const AI_RESOLUTION_OPTIONS = [
  { value: 'direct',        label: 'Direct' },
  { value: 'resolve_parent',label: 'Resolve Parent' },
  { value: 'chain_resolve', label: 'Chain Resolve' },
  { value: 'nested_create', label: 'Nested Create' },
  { value: 'allocator_flow',label: 'Allocator Flow' },
];

const RLS_TEMPLATE_OPTIONS = [
  { value: 'standard',         label: 'Standard (org isolation)' },
  { value: 'tenant_isolation', label: 'Tenant Isolation' },
  { value: 'multi_org',        label: 'Multi-Org' },
  { value: 'configuration',    label: 'Configuration (read-only)' },
  { value: 'analytical',       label: 'Analytical' },
  { value: 'workforce',        label: 'Workforce (owner/approver)' },
];

const CONTEXT_STATUS_OPTIONS = [
  { value: 'draft',   label: 'Draft' },
  { value: 'alpha',   label: 'Alpha' },
  { value: 'applied', label: 'Applied' },
];

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Paragraph } = Typography;

interface BlueprintConfigProps {
  entityType: string;
  entitySchema: string;
}

interface BlueprintHistoryRecord {
  id: string;
  blueprint_id: string;
  data: any;
  description: string;
  created_at: string;
  created_by?: string;
}

const BlueprintConfig: React.FC<BlueprintConfigProps> = ({ entityType, entitySchema }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<Partial<EntityBlueprint>>({});
  const [history, setHistory] = useState<BlueprintHistoryRecord[]>([]);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<BlueprintHistoryRecord | null>(null);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [diffActiveKey, setDiffActiveKey] = useState<string>('full');
  const [form] = Form.useForm();

  // Track classification and registration_mode for cross-field validation
  const classification = Form.useWatch('classification', form) || 'transactional';
  const registrationMode = Form.useWatch('registration_mode', form) || 'none';
  const rlsTemplate = Form.useWatch(['rls_config', 'template'], form);

  const validRegModes = REGISTRATION_MODE_BY_CLASSIFICATION[classification] || REGISTRATION_MODE_BY_CLASSIFICATION.transactional;

  // When classification changes, reset registration_mode if current value is not valid
  useEffect(() => {
    const validValues = validRegModes.map(o => o.value);
    if (!validValues.includes(registrationMode)) {
      const defaultMode = (classification === 'master') ? 'anchor' : 'none';
      form.setFieldsValue({ registration_mode: defaultMode });
    }
    // configuration and analytical are always locked to none
    if (classification === 'configuration' || classification === 'analytical') {
      form.setFieldsValue({ registration_mode: 'none' });
    }
  }, [classification]);

  useEffect(() => {
    fetchBlueprint();
  }, [entityType, entitySchema]);

  const fetchBlueprint = async () => {
    try {
      const sanitizedEntityType = entityType.includes('.') ? entityType.split('.').pop() : entityType;
      console.log('Fetching blueprint for:', { entitySchema, entityType: sanitizedEntityType, original: entityType });
      const { data, error } = await supabase
        .schema('core')
        .from('entity_blueprints')
        .select('*')
        .eq('entity_type', sanitizedEntityType)
        .eq('entity_schema', entitySchema)
        .maybeSingle();

      if (error) {
        console.error('Supabase error fetching blueprint:', error);
        throw error;
      };
      
      console.log('Blueprint fetch result:', data);

      if (data) {
        setBlueprint(data);
        form.setFieldsValue({
          ...data,
          registration_mode: data.registration_mode || 'none',
          form_type: data.form_type || 'simple',
          ai_resolution: data.ai_resolution || 'direct',
          rls_config: data.rls_config || { template: 'standard' },
          extra_objects: data.extra_objects || {},
          ui_config: data.ui_config || {},
          ui_general: data.ui_general || {},
          ui_details_overview: data.ui_details_overview || {},
          ui_dashboard: data.ui_dashboard || {},
          semantics: data.semantics || {},
          rules: data.rules || {},
          ai_metadata: data.ai_metadata || { embedding_model: 'text-embedding-3-large' },
          jsonb_schema: data.jsonb_schema || {},
          display_format: data.display_format || {},
          sub_panels: data.sub_panels || [],
          dependencies: data.dependencies || [],
        });
        fetchHistory(data.id);
      } else {
        const sanitizedEntityType = entityType.includes('.') ? entityType.split('.').pop() : entityType;
        const defaults: Partial<EntityBlueprint> = {
          entity_type: sanitizedEntityType,
          entity_schema: entitySchema,
          classification: 'transactional',
          registration_mode: 'none',
          form_type: 'simple',
          ai_resolution: 'direct',
          rls_config: { template: 'standard' },
          ai_metadata: { embedding_model: 'text-embedding-3-large' },
          extra_objects: {},
          ui_config: {},
          ui_general: {},
          ui_details_overview: {},
          ui_dashboard: {},
          semantics: {},
          rules: {},
          sub_panels: [],
          jsonb_schema: {},
          display_format: {},
        };
        setBlueprint(defaults);
        form.setFieldsValue(defaults);
        setHistory([]);
      }
    } catch (error: any) {
      console.error('Error fetching blueprint:', error);
      message.error('Failed to load blueprint configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (blueprintId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('entity_blueprint_history')
        .select('*')
        .eq('blueprint_id', blueprintId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      // Don't show error message as history might not exist yet
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      setSaving(true);
      const sanitizedEntityType = entityType.includes('.') ? entityType.split('.').pop() : entityType;

      // Auto-derive ai_resolution from form_type if not explicitly overridden
      const formType = values.form_type || 'simple';
      const derivedAiResolution = AI_RESOLUTION_BY_FORM_TYPE[formType] || values.ai_resolution || 'direct';

      // workforce RLS requires owner_col
      if (values.rls_config?.template === 'workforce' && !values.rls_config?.owner_col) {
        message.error('Workforce RLS template requires an owner column to be set');
        setSaving(false);
        return;
      }

      // anchor registration requires core.unified_objects in dependencies
      if (values.registration_mode === 'anchor') {
        const deps: string[] = values.dependencies || [];
        if (!deps.includes('core.unified_objects')) {
          message.warning('Anchor entities should declare "core.unified_objects" as a dependency');
        }
      }
      if (values.registration_mode === 'contact_anchor') {
        const deps: string[] = values.dependencies || [];
        if (!deps.includes('unified.contacts')) {
          message.warning('Contact anchor entities should declare "unified.contacts" as a dependency');
        }
      }

      // Build clean payload — only include known top-level columns
      const payload: any = {
        entity_type: sanitizedEntityType,
        entity_schema: entitySchema,
        ...values,
        ai_resolution: derivedAiResolution,
        updated_at: new Date().toISOString(),
      };

      // Remove non-existent columns that were legacy form fields
      delete payload.status;       // no standalone status column — lives in semantics.context.status
      delete payload.display_name; // not a DB column

      const { data, error } = await supabase
        .schema('core')
        .from('entity_blueprints')
        .upsert(payload, { 
          onConflict: 'entity_schema,entity_type' 
        })
        .select()
        .single();

      if (error) throw error;

      message.success('Blueprint saved successfully');
      
      if (data?.id) {
        fetchHistory(data.id);
      }

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
      const sanitizedEntityType = entityType.includes('.') ? entityType.split('.').pop() : entityType;
      const { error: error1 } = await supabase.schema('core').rpc('comp_util_ops_bootstrap_entity', {
        p_schema_name: entitySchema,
        p_entity_type: sanitizedEntityType,
        p_config: {},
        p_force_refresh: true,
        p_dry_run: false
      });
      if (error1) throw error1;

      // RPC 2: Auto Suggest Views
      const { error: error2 } = await supabase.schema('core').rpc('util_auto_suggest_views', {
        p_schema_name: entitySchema,
        p_entity_type: sanitizedEntityType,
        p_dry_run: false
      });
      if (error2) throw error2;

      message.success({ content: 'Entity bootstrapped and views suggested successfully!', key: 'bootstrap' });
    } catch (error: any) {
      console.error('Error during bootstrap:', error);
      message.error({ content: `Bootstrap failed: ${error.message}`, key: 'bootstrap' });
    }
  };

  const historyColumns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Author',
      dataIndex: 'created_by',
      key: 'created_by',
      render: (text: string) => text || 'System',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: BlueprintHistoryRecord) => (
        <Button size="small" onClick={() => handleViewHistory(record)}>View Diff</Button>
      )
    }
  ];

  const configFields = [
    { key: 'semantics', label: 'Semantics' },
    { key: 'rules', label: 'Rules' },
    { key: 'extra_objects', label: 'Extra Objects' },
    { key: 'ai_metadata', label: 'AI Metadata' },
    { key: 'ui_general', label: 'UI General' },
    { key: 'ui_config', label: 'UI Legacy Config' },
    { key: 'ui_details_overview', label: 'Details Overview' },
    { key: 'ui_dashboard', label: 'Dashboard Config' },
    { key: 'jsonb_schema', label: 'JSONB Schema' },
    { key: 'display_format', label: 'Display Format' },
    { key: 'sub_panels', label: 'Sub Panels' },
    { key: 'dependencies', label: 'Dependencies' },
    { key: 'physical_ddl', label: 'Physical DDL' },
    { key: 'custom_view_sql', label: 'Custom View SQL' },
  ];

  const handleViewHistory = (record: BlueprintHistoryRecord) => {
    setSelectedHistoryRecord(record);
    setIsHistoryModalVisible(true);
    setDiffActiveKey('full');
  };

  const handleRestore = () => {
    if (!selectedHistoryRecord) return;
    
    const data = selectedHistoryRecord.data;
    if (!data) return;

    // Populate form with historical values
    form.setFieldsValue({
      ...data,
      extra_objects: data.extra_objects || {},
      ui_config: data.ui_config || {},
      ui_general: data.ui_general || {},
      ui_details_overview: data.ui_details_overview || {},
      ui_dashboard: data.ui_dashboard || {},
      semantics: data.semantics || {},
      rules: data.rules || {},
      ai_metadata: data.ai_metadata || {},
      jsonb_schema: data.jsonb_schema || {},
      display_format: data.display_format || {},
      sub_panels: data.sub_panels || [],
      dependencies: data.dependencies || [],
    });

    message.success('Historical configuration loaded into form. Click Save to persist.');
  };

  const handleDeleteHistory = async () => {
    if (!selectedHistoryRecord) return;
    
    try {
      setDeleting(true);
      const { error } = await supabase
        .schema('core')
        .from('entity_blueprint_history')
        .delete()
        .eq('id', selectedHistoryRecord.id);

      if (error) throw error;

      message.success('Historical record deleted successfully');
      setIsHistoryModalVisible(false);
      
      // Refresh history list
      if (blueprint.id) {
        fetchHistory(blueprint.id);
      }
    } catch (error: any) {
      console.error('Error deleting history:', error);
      message.error(`Failed to delete history: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const normalizeData = (data: any) => {
    if (!data) return '';
    const clean = { ...data };
    const fieldsToRemove = [
      'id', 'idx', 'created_at', 'updated_at', 'blueprint_id', 
      'organization_id', 'created_by', 'updated_by', 'version', 
      'blueprint_hash'
    ];
    fieldsToRemove.forEach(f => delete clean[f]);
    return JSON.stringify(clean, null, 2);
  };

  const hasFieldChanged = (fieldName: string) => {
    if (!selectedHistoryRecord) return false;
    const historicalValue = selectedHistoryRecord.data?.[fieldName];
    const currentValue = (blueprint as any)?.[fieldName];
    
    // Simple comparison for JSON strings vs objects
    const histStr = typeof historicalValue === 'object' ? JSON.stringify(historicalValue) : String(historicalValue || '');
    const currStr = typeof currentValue === 'object' ? JSON.stringify(currentValue) : String(currentValue || '');
    
    return histStr !== currStr;
  };

  const getGranularOldValue = () => {
    if (!selectedHistoryRecord || !diffActiveKey) return '';
    if (diffActiveKey === 'full') return normalizeData(selectedHistoryRecord.data);
    
    const val = selectedHistoryRecord.data?.[diffActiveKey];
    return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '');
  };

  const getGranularNewValue = () => {
    if (!diffActiveKey) return '';
    if (diffActiveKey === 'full') return normalizeData(blueprint);
    
    const val = (blueprint as any)?.[diffActiveKey];
    return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '');
  };

  if (loading) return <div>Loading blueprint...</div>;

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        <Card
          title={
            <Space>
              <span>General Information</span>
              {blueprint.id && <Tag color="blue">{blueprint.id}</Tag>}
              {blueprint.is_active ? <Tag color="success">Active</Tag> : <Tag color="default">Inactive</Tag>}
              {blueprint.bootstrap_generation && blueprint.bootstrap_generation > 0
                ? <Tag color="green">Bootstrapped</Tag>
                : <Tag color="orange">Not Bootstrapped</Tag>}
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          {/* Bootstrap status banner */}
          {blueprint.bootstrap_error && (
            <Alert
              type="error"
              icon={<WarningOutlined />}
              showIcon
              message="Last bootstrap failed"
              description={blueprint.bootstrap_error}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Row 1: Classification + Registration Mode + Form Type + AI Resolution */}
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="classification" label="Classification" initialValue="transactional">
                <Select options={CLASSIFICATION_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="registration_mode"
                label="Registration Mode"
                tooltip="Master entities must use anchor/contact_anchor/graduated. Config & Analytical are locked to none."
                rules={[{ required: true }]}
              >
                <Select
                  options={validRegModes}
                  disabled={classification === 'configuration' || classification === 'analytical'}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="form_type" label="Form Type" rules={[{ required: true }]}>
                <Select
                  options={FORM_TYPE_OPTIONS}
                  onChange={(val) => {
                    const derived = AI_RESOLUTION_BY_FORM_TYPE[val];
                    if (derived) form.setFieldsValue({ ai_resolution: derived });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="ai_resolution"
                label="AI Resolution"
                tooltip="Auto-derived from form type. Override only if you have a custom flow."
              >
                <Select options={AI_RESOLUTION_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          {/* Dependency warnings */}
          {registrationMode === 'anchor' && (
            <Alert
              type="info"
              showIcon
              message='Anchor entities must include "core.unified_objects" in dependencies below.'
              style={{ marginBottom: 12 }}
            />
          )}
          {registrationMode === 'contact_anchor' && (
            <Alert
              type="info"
              showIcon
              message='Contact anchor entities must include "unified.contacts" in dependencies below.'
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Row 2: Base source + Partition filter */}
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="base_source"
                label="Base Source Table"
                rules={[{
                  pattern: /^[a-z_]+\.[a-z_]+$/,
                  message: 'Must follow schema.table format (e.g. unified.contacts)',
                }]}
              >
                <Input placeholder="e.g. unified.contacts" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="partition_filter"
                label="Partition Filter"
                tooltip="SQL WHERE fragment applied to the generated view. Use partition_filter_structured for the validated version."
              >
                <Input placeholder="e.g. intent_type = 'CRM_PROSPECT'" />
              </Form.Item>
            </Col>
          </Row>

          {/* Dependencies */}
          <Form.Item
            name="dependencies"
            label="Dependencies"
            tooltip="List all schema.table references this entity joins. Required for anchor/contact_anchor modes."
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Add table dependencies (e.g. core.unified_objects, unified.contacts)"
              size="small"
              tokenSeparators={[',']}
            />
          </Form.Item>

          {/* RLS Config */}
          <Card title="Security (RLS)" size="small" style={{ marginTop: 8 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name={['rls_config', 'template']} label="RLS Template">
                  <Select options={RLS_TEMPLATE_OPTIONS} />
                </Form.Item>
              </Col>
              {rlsTemplate === 'workforce' && (
                <>
                  <Col span={4}>
                    <Form.Item name={['rls_config', 'owner_col']} label="Owner Column" rules={[{ required: true, message: 'Required for workforce RLS' }]}>
                      <Input placeholder="e.g. user_id" size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item name={['rls_config', 'approver_col']} label="Approver Column">
                      <Input placeholder="e.g. approver_id" size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item name={['rls_config', 'status_col']} label="Status Column">
                      <Input placeholder="e.g. stage_id" size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item name={['rls_config', 'location_col']} label="Location Column">
                      <Input placeholder="e.g. location_id" size="small" />
                    </Form.Item>
                  </Col>
                </>
              )}
            </Row>
          </Card>
        </Card>

        <Tabs defaultActiveKey="sql" type="card">
          <TabPane tab={<span><DatabaseOutlined />SQL Definition</span>} key="sql">
            <Card>
              <Form.Item name="physical_ddl" label="Physical DDL">
                <TextArea rows={10} style={{ fontFamily: 'monospace' }} placeholder="CREATE TABLE ..." />
              </Form.Item>
              <Form.Item name="custom_view_sql" label="Custom View SQL">
                <TextArea rows={10} style={{ fontFamily: 'monospace' }} placeholder="CREATE OR REPLACE VIEW ..." />
              </Form.Item>
            </Card>
          </TabPane>
          <TabPane tab={<span><SettingOutlined />Main Configs</span>} key="json">
            <Card title="Semantics & Context" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name={['semantics', 'context', 'title']} label="Display Title">
                    <Input placeholder="e.g. Accounts" size="small" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={['semantics', 'context', 'module']} label="Module">
                    <Input placeholder="e.g. crm" size="small" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={['semantics', 'context', 'status']} label="Semantic Status">
                    <Select size="small" options={CONTEXT_STATUS_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name={['semantics', 'context', 'description']} label="Semantic Description">
                <TextArea rows={2} placeholder="Explain the purpose of this entity for AI context..." size="small" />
              </Form.Item>
              <Form.Item name={['semantics', 'context', 'keywords']} label="Search Keywords">
                <Select mode="tags" size="small" placeholder="Add keywords for AI discovery..." />
              </Form.Item>
            </Card>

            <Card title="Semantics Assignments" size="small" style={{ marginBottom: 16 }}>
              <Form.List name={['semantics', 'assignments']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'column']} rules={[{ required: true }]}>
                          <Input placeholder="column" size="small" style={{ width: 140 }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'sql']} rules={[{ required: true }]}>
                          <Input placeholder="SQL expression" size="small" style={{ width: 260 }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'on_insert']} valuePropName="checked">
                          <Switch size="small" checkedChildren="on_insert" unCheckedChildren="on_insert" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'overwrite']} valuePropName="checked">
                          <Switch size="small" checkedChildren="overwrite" unCheckedChildren="overwrite" />
                        </Form.Item>
                        <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                      Add Assignment
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Collapse ghost size="small">
              <Collapse.Panel header="Advanced Configuration (Raw JSON)" key="advanced">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="semantics" label="Raw Semantics">
                      <JsonEditor rows={6} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="rules" label="Raw Rules">
                      <JsonEditor rows={6} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="ai_metadata" label="AI Metadata">
                      <JsonEditor rows={6} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="extra_objects" label="Extra Objects">
                      <JsonEditor rows={6} />
                    </Form.Item>
                  </Col>
                </Row>
              </Collapse.Panel>
            </Collapse>
          </TabPane>
          <TabPane tab={<span><DesktopOutlined />UI Settings</span>} key="ui">
            <Card title="View Configuration" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['ui_general', 'available_views']}
                    label="Enabled Views"
                    tooltip="Select all views that should be available to users. Default view must be in this list."
                  >
                    <Select
                      mode="multiple"
                      size="small"
                      placeholder="Select views available to users"
                      options={[
                        { value: 'tableview',   label: 'Table View' },
                        { value: 'gridview',    label: 'Grid View' },
                        { value: 'kanbanview',  label: 'Kanban View' },
                        { value: 'detailview',  label: 'Detail View' },
                        { value: 'mapview',     label: 'Map View' },
                        { value: 'calendarview',label: 'Calendar View' },
                        { value: 'ganttview',   label: 'Gantt View' },
                        { value: 'metricsview', label: 'Metrics View' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['ui_general', 'default_view']}
                    label="Default View"
                    tooltip="Must be in the Enabled Views list above."
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          const available: string[] = form.getFieldValue(['ui_general', 'available_views']) || [];
                          if (available.length > 0 && !available.includes(value)) {
                            return Promise.reject(new Error('Default view must be in the enabled views list'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Select
                      size="small"
                      options={[
                        { value: 'tableview',   label: 'Table View' },
                        { value: 'gridview',    label: 'Grid View' },
                        { value: 'kanbanview',  label: 'Kanban View' },
                        { value: 'detailview',  label: 'Detail View' },
                        { value: 'mapview',     label: 'Map View' },
                        { value: 'calendarview',label: 'Calendar View' },
                        { value: 'ganttview',   label: 'Gantt View' },
                        { value: 'metricsview', label: 'Metrics View' },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Feature Flags" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                {['print', 'export', 'import', 'kanban', 'sorting', 'calendar', 'filtering', 'export_pdf', 'pagination', 'bulk_actions'].map(feature => (
                  <Col span={6} key={feature}>
                    <Form.Item 
                      name={['ui_general', 'features', feature]} 
                      label={feature.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} 
                      valuePropName="checked"
                      style={{ marginBottom: 0 }}
                    >
                      <Switch size="small" />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Card>

            <Card title="Details View Tabs" size="small">
              <Form.List name={['ui_details_overview', 'staticTabs']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'tab']}
                          rules={[{ required: true, message: 'Missing tab name' }]}
                        >
                          <Input placeholder="Tab ID" size="small" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'label']}
                          rules={[{ required: true, message: 'Missing label' }]}
                        >
                          <Input placeholder="Label" size="small" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'order']}
                        >
                          <Input placeholder="Order" type="number" size="small" />
                        </Form.Item>
                        <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                      Add Static Tab
                    </Button>
                  </>
                )}
              </Form.List>
              
              <Divider dashed style={{ margin: '16px 0' }} />
              
              <Form.List name={['ui_details_overview', 'dynamicTabs']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'label']}
                          rules={[{ required: true, message: 'Missing label' }]}
                        >
                          <Input placeholder="Label (e.g. Contacts)" size="small" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'props', 'entityType']}
                          rules={[{ required: true, message: 'Missing entity type' }]}
                        >
                          <Input placeholder="Entity (schema.table)" size="small" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'order']}
                        >
                          <Input placeholder="Order" type="number" size="small" />
                        </Form.Item>
                        <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                      Add Dynamic Panel
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Collapse ghost size="small" style={{ marginTop: 16 }}>
              <Collapse.Panel header="Advanced UI JSON" key="ui_advanced">
                 <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="ui_general" label="Raw UI General">
                      <JsonEditor rows={6} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="ui_details_overview" label="Raw Details Overview">
                      <JsonEditor rows={6} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="ui_dashboard" label="Raw Dashboard Config">
                      <JsonEditor rows={6} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="ui_config" label="Legacy Config">
                      <JsonEditor rows={6} />
                    </Form.Item>
                  </Col>
                </Row>
              </Collapse.Panel>
            </Collapse>
          </TabPane>
          <TabPane tab={<span><SettingOutlined />Schema & Format</span>} key="schema">
            <Card title="Display ID Format (Pre-Bootstrap)" size="small" style={{ marginBottom: 16 }}>
              {classification !== 'master' && (
                <Alert
                  type="warning"
                  showIcon
                  message="Display ID format is typically only used for master classification entities (e.g. projects, tickets, assets)."
                  style={{ marginBottom: 12 }}
                />
              )}
              <Alert
                type="info"
                showIcon
                message="Set the format here before bootstrapping. The bootstrap engine seeds display_id_states from this config. Counter status (post-bootstrap) is visible in the ID Config tab."
                style={{ marginBottom: 12 }}
              />
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['display_format', 'format']}
                    label={
                      <span>
                        ID Format Pattern&nbsp;
                        <Tooltip title="Tokens: {COUNTER}, {YEAR}, {MONTH}. Example: PRJ-{COUNTER}">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </span>
                    }
                  >
                    <Input placeholder="e.g. PRJ-{COUNTER} or TKT-{YEAR}-{COUNTER}" size="small" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name={['display_format', 'counter_padding']} label="Counter Padding">
                    <Select size="small" options={[
                      { value: 3, label: '3 digits (001)' },
                      { value: 4, label: '4 digits (0001)' },
                      { value: 5, label: '5 digits (00001)' },
                      { value: 6, label: '6 digits (000001)' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name={['display_format', 'counter_config', 'reset_period']} label="Reset Period">
                    <Select size="small" options={[
                      { value: 'NEVER',         label: 'Never' },
                      { value: 'CALENDAR_YEAR', label: 'Calendar Year (Jan 1)' },
                    ]} />
                  </Form.Item>
                </Col>
              </Row>
              {(blueprint.bootstrap_generation || 0) === 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message="This entity has not been bootstrapped yet. Save & Bootstrap to generate the view and seed the display_id_states counter."
                  style={{ marginTop: 8 }}
                />
              )}
            </Card>

            <Card title="JSONB Structure & Validation" size="small">
              <Form.Item 
                name="jsonb_schema" 
                label={
                  <span>
                    Constraint Schema (JSON Schema)&nbsp;
                    <Tooltip title="Validates the 'details' JSONB column structure">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </span>
                }
              >
                <JsonEditor rows={12} placeholder="Full JSONB schema definition..." />
              </Form.Item>
              
              <Collapse ghost size="small">
                <Collapse.Panel header="Advanced Format JSON" key="format_advanced">
                  <Form.Item name="display_format" label="Raw Display Format">
                    <JsonEditor rows={6} />
                  </Form.Item>
                </Collapse.Panel>
              </Collapse>
            </Card>
          </TabPane>
          {blueprint.id && (
            <TabPane tab={<span><HistoryOutlined />History</span>} key="history">
              <Card>
                <Title level={5}>Historical Versions</Title>
                <Table 
                  dataSource={history} 
                  columns={historyColumns} 
                  size="small" 
                  loading={historyLoading}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                />
              </Card>
            </TabPane>
          )}
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

      <Modal
        title={`Blueprint Version Comparison: ${selectedHistoryRecord ? new Date(selectedHistoryRecord.created_at).toLocaleString() : ''}`}
        open={isHistoryModalVisible}
        onCancel={() => setIsHistoryModalVisible(false)}
        width={1400}
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setIsHistoryModalVisible(false)}>
            Close
          </Button>,
          <Popconfirm
            key="delete-confirm"
            title="Delete this historical version?"
            description="This action cannot be undone."
            onConfirm={handleDeleteHistory}
            okText="Yes, Delete"
            cancelText="No"
            okButtonProps={{ danger: true, loading: deleting }}
          >
            <Button 
              key="delete" 
              danger 
              icon={<DeleteOutlined />}
              disabled={deleting}
            >
              Delete Version
            </Button>
          </Popconfirm>,
          <Button 
            key="restore" 
            type="primary" 
            icon={<HistoryOutlined />}
            onClick={handleRestore}
          >
            Restore to Form
          </Button>
        ]}
      >
        {selectedHistoryRecord && (
          <div style={{ display: 'flex', gap: '24px', height: '75vh' }}>
            {/* Sidebar for field selection */}
            <div style={{ width: '250px', borderRight: '1px solid #f0f0f0', overflowY: 'auto', paddingRight: '12px' }}>
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>Description:</Title>
                <Paragraph style={{ fontSize: '13px' }}>{selectedHistoryRecord.description || 'No description provided'}</Paragraph>
              </div>
              <Title level={5} style={{ marginBottom: 12 }}>Changed Fields:</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Button 
                  type={diffActiveKey === 'full' ? 'primary' : 'text'} 
                  block 
                  style={{ textAlign: 'left' }}
                  onClick={() => setDiffActiveKey('full')}
                >
                  Full Document JSON
                </Button>
                {configFields.map(field => {
                  const changed = hasFieldChanged(field.key);
                  return (
                    <Button 
                      key={field.key}
                      type={diffActiveKey === field.key ? 'primary' : 'text'} 
                      block 
                      style={{ 
                        textAlign: 'left', 
                        fontWeight: changed ? 'bold' : 'normal',
                        color: changed && diffActiveKey !== field.key ? '#cf1322' : undefined 
                      }}
                      onClick={() => setDiffActiveKey(field.key)}
                    >
                      {field.label} {changed && "•"}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Main Diff Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Title level={5}>
                Comparison: {diffActiveKey === 'full' ? 'Full Configuration' : configFields.find(f => f.key === diffActiveKey)?.label}
              </Title>
              <div style={{ border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                <ReactDiffViewer
                  oldValue={getGranularOldValue()}
                  newValue={getGranularNewValue()}
                  splitView={true}
                  leftTitle="Historical Version (Saved)"
                  rightTitle="Current Live Version"
                  styles={{
                    variables: {
                      diffViewerBackground: '#fff',
                      diffViewerColor: '#212529',
                      addedBackground: '#e6ffed',
                      addedColor: '#24292e',
                      removedBackground: '#ffeef0',
                      removedColor: '#24292e',
                      wordAddedBackground: '#acf2bd',
                      wordRemovedBackground: '#fdb8c0',
                      addedGutterBackground: '#cdffd8',
                      removedGutterBackground: '#ffdce0',
                      gutterColor: '#212529',
                      codeFoldGutterBackground: '#212529',
                      codeFoldBackground: '#212529',
                      emptyLineBackground: '#fff',
                      foldPlaceholderColor: '#212529',
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BlueprintConfig;
