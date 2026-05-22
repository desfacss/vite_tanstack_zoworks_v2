/**
 * EntityRegistrationWizard
 *
 * Creates a minimal entity_blueprints row (source of truth) + a stub core.entities row
 * (so the entity appears in the sidebar immediately). The user then fills in blueprint
 * details and clicks "Save & Bootstrap" to generate views, triggers, indexes, and RLS.
 *
 * Flow:
 *   Step 0 — Select schema + physical table
 *   Step 1 — Entity name + classification + registration mode + form type
 *   Step 2 — Review & create
 *   → onSuccess(newEntityId) → parent auto-selects entity and switches to Blueprint tab
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Button,
  Form,
  AutoComplete,
  Input,
  Select,
  Space,
  Typography,
  Alert,
  Divider,
  message,
  Spin,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  DatabaseOutlined,
  TagsOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';

const { Title, Text, Paragraph } = Typography;

// ─── Business rule constants ──────────────────────────────────────────────────
const CLASSIFICATION_OPTIONS = [
  { value: 'transactional', label: 'Transactional — operational records (timesheets, tickets, orders)' },
  { value: 'master',        label: 'Master — unified registered entities (contacts, projects, accounts)' },
  { value: 'configuration', label: 'Configuration — system config tables (lookup, settings)' },
  { value: 'analytical',    label: 'Analytical — reporting/analytics views' },
];

const REGISTRATION_MODE_BY_CLASSIFICATION: Record<string, { value: string; label: string }[]> = {
  master:        [
    { value: 'anchor',         label: 'Anchor — registers to core.unified_objects' },
    { value: 'contact_anchor', label: 'Contact Anchor — registers to unified.contacts' },
    { value: 'graduated',      label: 'Graduated — promoted from transactional' },
  ],
  transactional: [
    { value: 'none',      label: 'None — standalone operational record' },
    { value: 'graduated', label: 'Graduated — promoted to unified' },
  ],
  configuration: [{ value: 'none', label: 'None (locked for configuration entities)' }],
  analytical:    [{ value: 'none', label: 'None (locked for analytical entities)' }],
};

const FORM_TYPE_BY_REGISTRATION: Record<string, { value: string; label: string }[]> = {
  anchor:         [
    { value: 'simple',    label: 'Simple — single-table form' },
    { value: 'dependent', label: 'Dependent — resolves via unified parent' },
    { value: 'composite', label: 'Composite — multi-section form' },
  ],
  contact_anchor: [{ value: 'simple', label: 'Simple' }],
  graduated:      [
    { value: 'simple',    label: 'Simple' },
    { value: 'composite', label: 'Composite' },
  ],
  none: [
    { value: 'simple',   label: 'Simple — single-table form' },
    { value: 'nested',   label: 'Nested — JSONB children (e.g. line items)' },
    { value: 'junction', label: 'Junction — many-to-many mapping table' },
    { value: 'allocator',label: 'Allocator — allocation/distribution flow' },
  ],
};

const AI_RESOLUTION_BY_FORM_TYPE: Record<string, string> = {
  simple:    'direct',
  junction:  'direct',
  dependent: 'resolve_parent',
  composite: 'resolve_parent',
  nested:    'nested_create',
  allocator: 'allocator_flow',
};

const DEFAULT_DEPENDENCIES: Record<string, string[]> = {
  anchor:         ['core.unified_objects'],
  contact_anchor: ['unified.contacts', 'core.unified_objects'],
  graduated:      ['core.unified_objects'],
  none:           [],
};

// ─── Props ───────────────────────────────────────────────────────────────────
interface EntityRegistrationWizardProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the new entity id so parent can auto-select it */
  onSuccess: (newEntityId: string) => void;
  existingSchemas: string[];
}

interface TableInfo {
  table_name: string;
  column_count?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────
const EntityRegistrationWizard: React.FC<EntityRegistrationWizardProps> = ({
  visible,
  onClose,
  onSuccess,
  existingSchemas,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [tablesLoading, setTablesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [existingEntities, setExistingEntities] = useState<string[]>([]);

  // Watched values for reactive dropdown filtering
  const selectedSchema: string = Form.useWatch('schema', form) || '';
  const classification: string = Form.useWatch('classification', form) || 'transactional';
  const registrationMode: string = Form.useWatch('registration_mode', form) || 'none';
  const watchedEntityName: string = Form.useWatch('entity_name', form) || '';

  const validRegModes = REGISTRATION_MODE_BY_CLASSIFICATION[classification] || REGISTRATION_MODE_BY_CLASSIFICATION.transactional;
  const validFormTypes = FORM_TYPE_BY_REGISTRATION[registrationMode] || FORM_TYPE_BY_REGISTRATION.none;

  // Reset form on open
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      form.resetFields();
      form.setFieldsValue({ classification: 'transactional', registration_mode: 'none', form_type: 'simple' });
    }
  }, [visible, form]);

  // Load schemas
  useEffect(() => {
    const base = ['identity', 'unified', 'crm', 'procurement', 'workforce', 'esm', 'analytics', 'ai_mcp', 'construction', 'finance', 'hr', 'wa'];
    const all = [...new Set([...existingSchemas, ...base])].sort();
    setSchemas(all);
  }, [existingSchemas]);

  // Load tables when schema changes
  useEffect(() => {
    if (!selectedSchema) { setTables([]); return; }
    setTablesLoading(true);
    supabase
      .schema('core')
      .rpc('get_available_tables', { p_schema: selectedSchema })
      .then(({ data, error }) => {
        if (!error && data) setTables(data);
        else setTables([]);
        setTablesLoading(false);
      });
  }, [selectedSchema]);

  // Fetch existing entities for conflict check
  useEffect(() => {
    if (!visible) return;
    supabase.schema('core').from('entity_blueprints').select('entity_type,entity_schema')
      .then(({ data }) => {
        if (data) setExistingEntities(data.map(e => `${e.entity_schema}.${e.entity_type}`));
      });
  }, [visible]);

  // When classification changes — reset reg mode to valid default
  useEffect(() => {
    const validValues = validRegModes.map(o => o.value);
    const current = form.getFieldValue('registration_mode');
    if (!validValues.includes(current)) {
      const def = classification === 'master' ? 'anchor' : 'none';
      form.setFieldsValue({ registration_mode: def });
    }
    if (classification === 'configuration' || classification === 'analytical') {
      form.setFieldsValue({ registration_mode: 'none' });
    }
  }, [classification]);

  // When registration mode changes — reset form_type to valid default
  useEffect(() => {
    const validValues = validFormTypes.map(o => o.value);
    const current = form.getFieldValue('form_type');
    if (!validValues.includes(current)) {
      form.setFieldsValue({ form_type: validFormTypes[0]?.value || 'simple' });
    }
  }, [registrationMode]);

  // Auto-fill entity name from table on step 0
  const handleTableChange = (value: string) => {
    if (!form.getFieldValue('entity_name')) {
      form.setFieldsValue({ entity_name: value });
    }
  };

  const validateStep = async (): Promise<boolean> => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['schema', 'table']);
        return true;
      }
      if (currentStep === 1) {
        await form.validateFields(['entity_name', 'classification', 'registration_mode', 'form_type']);
        const schema = form.getFieldValue('schema');
        const name   = form.getFieldValue('entity_name');
        const full   = `${schema}.${name}`;
        if (existingEntities.includes(full)) {
          message.error(`"${name}" already exists in schema "${schema}"`);
          return false;
        }
        return true;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleNext = async () => {
    if (await validateStep()) setCurrentStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const values = form.getFieldsValue(true);
      const entityName     = values.entity_name;
      const schema         = values.schema;
      const table          = values.table;
      const classification = values.classification;
      const regMode        = values.registration_mode;
      const formType       = values.form_type;
      const aiResolution   = AI_RESOLUTION_BY_FORM_TYPE[formType] || 'direct';
      const baseDeps       = DEFAULT_DEPENDENCIES[regMode] || [];

      // ── 1. Insert into core.entity_blueprints (source of truth) ──────────
      const { data: bpData, error: bpError } = await supabase
        .schema('core')
        .from('entity_blueprints')
        .insert([{
          entity_type:       entityName,
          entity_schema:     schema,
          base_source:       `${schema}.${table}`,
          classification,
          registration_mode: regMode,
          form_type:         formType,
          ai_resolution:     aiResolution,
          dependencies:      baseDeps,
          rls_config:        { template: classification === 'analytical' ? 'analytical' : 'standard' },
          ai_metadata:       { embedding_model: 'text-embedding-3-large' },
          is_active:         true,
          bootstrap_generation: 0,
        }])
        .select('id')
        .single();

      if (bpError) throw bpError;
      const blueprintId = bpData.id;

      // ── 2. Insert a minimal stub into core.entities so it appears in sidebar ──
      // Bootstrap will enrich this row; we just need entity_type + entity_schema.
      const { data: entityData, error: entityError } = await supabase
        .schema('core')
        .from('entities')
        .insert([{
          entity_type:       entityName,
          entity_schema:     schema,
          is_logical_variant: false,
        }])
        .select('id')
        .maybeSingle();

      // entity_schema.entity_type unique conflict is non-fatal (entity already exists)
      const newEntityId = entityData?.id;

      if (entityError && !entityError.message.includes('duplicate')) {
        console.warn('entities stub insert warning:', entityError.message);
      }

      // ── 3. Create view_configs + metrics stubs (needed for tab rendering) ──
      if (newEntityId) {
        await supabase.schema('core').from('view_configs').upsert([{
          entity_id:   newEntityId,
          entity_type: `${schema}.${entityName}`,
          general:     {},
          tableview:   {},
          gridview:    {},
          kanbanview:  {},
          details_overview: {},
          detailview:  {},
        }], { onConflict: 'entity_id' });

        await supabase.schema('core').from('metrics').upsert([{
          entity_id:   newEntityId,
          entity_type: `${schema}.${entityName}`,
          metrics:     {},
        }], { onConflict: 'entity_id' });
      }

      message.success(
        `Blueprint created for ${schema}.${entityName}. Fill in details and click "Save & Bootstrap" to generate views and triggers.`,
        6
      );

      onSuccess(newEntityId || blueprintId);
    } catch (error: any) {
      console.error('Error creating entity blueprint:', error);
      message.error(`Failed to create entity: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Step renderers ───────────────────────────────────────────────────────
  const renderStep0 = () => (
    <div style={{ padding: '24px 0' }}>
      <Title level={5}>Select Physical Table</Title>
      <Paragraph type="secondary">
        Choose the database schema and table that will be the physical foundation for this entity.
        The Composer bootstrap engine will generate a view, triggers, and indexes on top of it.
      </Paragraph>

      <Form.Item name="schema" label="Schema" rules={[{ required: true }]}>
        <AutoComplete
          placeholder="Select or type schema (e.g. identity, unified)"
          options={schemas.map(s => ({ value: s }))}
          filterOption={(input, opt) => opt!.value.includes(input)}
        />
      </Form.Item>

      <Form.Item name="table" label="Physical Table" rules={[{ required: true }]}>
        <AutoComplete
          placeholder={tablesLoading ? 'Loading tables…' : 'Select or type table name'}
          disabled={!selectedSchema}
          onChange={handleTableChange}
          options={tables.map(t => ({
            value: t.table_name,
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.table_name}</span>
                {t.column_count && <Text type="secondary" style={{ fontSize: 12 }}>{t.column_count} cols</Text>}
              </div>
            ),
          }))}
          filterOption={(input, opt) => String(opt!.value).includes(input)}
        >
          {tablesLoading && <Spin size="small" />}
        </AutoComplete>
      </Form.Item>
    </div>
  );

  const renderStep1 = () => (
    <div style={{ padding: '24px 0' }}>
      <Title level={5}>Entity Identity & Classification</Title>
      <Paragraph type="secondary">
        Configure how this entity is identified and how it integrates with the Composer bootstrap engine.
        These settings drive which view, trigger, and registration flows are generated.
      </Paragraph>

      <Form.Item
        name="entity_name"
        label="Entity Name"
        rules={[
          { required: true },
          { pattern: /^[a-z][a-z0-9_]*$/, message: 'Lowercase, underscores only, start with letter' },
        ]}
        extra={`Will be registered as ${selectedSchema || '<schema>'}.${watchedEntityName || '<name>'}`}
      >
        <Input placeholder="e.g. location_type, purchase_orders" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="classification"
            label="Classification"
            rules={[{ required: true }]}
            tooltip="Drives registration mode options. Master entities register to unified_objects."
          >
            <Select options={CLASSIFICATION_OPTIONS} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="registration_mode"
            label="Registration Mode"
            rules={[{ required: true }]}
            tooltip="How this entity registers to the unified identity layer."
          >
            <Select
              options={validRegModes}
              disabled={classification === 'configuration' || classification === 'analytical'}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="form_type"
        label="Form Type"
        rules={[{ required: true }]}
        tooltip="Controls the create/edit form structure and trigger routing logic."
      >
        <Select options={validFormTypes} />
      </Form.Item>

      {(registrationMode === 'anchor' || registrationMode === 'contact_anchor') && (
        <Alert
          type="info"
          showIcon
          message={
            registrationMode === 'anchor'
              ? 'Anchor mode: "core.unified_objects" will be added to dependencies automatically.'
              : 'Contact anchor mode: "unified.contacts" and "core.unified_objects" will be added to dependencies automatically.'
          }
          style={{ marginBottom: 12 }}
        />
      )}

      <Alert
        type="info"
        showIcon
        message="After creation, open the Blueprint tab to configure semantics, RLS, display format, and partition filters — then click Save & Bootstrap."
      />
    </div>
  );

  const renderStep2 = () => {
    const values = form.getFieldsValue(true);
    const formType = values.form_type || 'simple';
    return (
      <div style={{ padding: '24px 0' }}>
        <Title level={5}>Review & Create Blueprint</Title>
        <Paragraph type="secondary">
          This will create a blueprint row and a sidebar stub. No DDL runs yet —
          bootstrap happens when you click <strong>Save &amp; Bootstrap</strong> in the Blueprint tab.
        </Paragraph>

        <div style={{ background: '#fafafa', padding: 20, borderRadius: 8, marginBottom: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div><Text strong>Entity: </Text><Tag color="green" style={{ fontSize: 14 }}>{values.schema}.{values.entity_name}</Tag></div>
            <div><Text strong>Base Table: </Text><Text code>{values.schema}.{values.table}</Text></div>
            <div><Text strong>Classification: </Text><Tag>{values.classification}</Tag></div>
            <div><Text strong>Registration Mode: </Text><Tag color="blue">{values.registration_mode}</Tag></div>
            <div><Text strong>Form Type: </Text><Tag>{formType}</Tag></div>
            <div><Text strong>AI Resolution: </Text><Tag>{AI_RESOLUTION_BY_FORM_TYPE[formType] || 'direct'}</Tag></div>
            {DEFAULT_DEPENDENCIES[values.registration_mode]?.length > 0 && (
              <div>
                <Text strong>Auto Dependencies: </Text>
                {DEFAULT_DEPENDENCIES[values.registration_mode].map(d => (
                  <Tag key={d} color="orange">{d}</Tag>
                ))}
              </div>
            )}
          </Space>
        </div>

        <Divider />

        <Title level={5} style={{ marginBottom: 8 }}>What happens next:</Title>
        <ol style={{ paddingLeft: 20, color: '#595959' }}>
          <li>Blueprint row created in <Text code>core.entity_blueprints</Text></li>
          <li>Entity stub created in <Text code>core.entities</Text> (appears in sidebar)</li>
          <li>View config and metrics stubs initialized</li>
          <li style={{ fontWeight: 600 }}>
            Open Blueprint tab → fill semantics, RLS, display format → click <strong>Save &amp; Bootstrap</strong>
            to generate view, INSTEAD OF triggers, indexes, and RLS policies
          </li>
        </ol>
      </div>
    );
  };

  const steps = [
    { title: 'Base Table',        description: 'Select the physical table', icon: <DatabaseOutlined /> },
    { title: 'Entity Identity',   description: 'Classification & form type', icon: <TagsOutlined /> },
    { title: 'Confirm',           description: 'Review and create blueprint', icon: <CheckCircleOutlined /> },
  ];

  return (
    <Modal
      title="Register New Entity"
      open={visible}
      onCancel={onClose}
      width={760}
      footer={null}
      destroyOnClose
    >
      <Steps
        current={currentStep}
        items={steps.map(s => ({ title: s.title, description: s.description, icon: s.icon }))}
        style={{ marginBottom: 28 }}
      />

      <Form form={form} layout="vertical" preserve={true}>
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          {renderStep0()}
        </div>
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          {renderStep1()}
        </div>
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          {renderStep2()}
        </div>
      </Form>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Space>
          {currentStep > 0 && <Button onClick={() => setCurrentStep(s => s - 1)}>Previous</Button>}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={handleNext}>Next</Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button type="primary" onClick={handleSubmit} loading={submitting}>
              Create Blueprint
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default EntityRegistrationWizard;
