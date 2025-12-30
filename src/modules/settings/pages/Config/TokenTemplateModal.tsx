import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Table,
  Button,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Empty,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';

const { Option } = Select;

const META_CONFIG_KEY = 'display_id_tokens';

// Token template types
export interface LookupToken {
  name: string;
  label: string;
  entity_field: string;
  lookup_schema: string;
  lookup_table: string;
  lookup_value_field: string;
}

export interface DatePartToken {
  name: string;
  label: string;
  date_format: string;
}

export interface TokenTemplates {
  lookup: LookupToken[];
  date_part: DatePartToken[];
  prefixes: string[];
  separators: string[];
}

const DEFAULT_TEMPLATES: TokenTemplates = {
  lookup: [],
  date_part: [
    { name: 'YEAR', label: 'Year (YYYY)', date_format: 'YYYY' },
    { name: 'YY', label: 'Year Short (YY)', date_format: 'YY' },
    { name: 'DATE', label: 'Full Date', date_format: 'YYYYMMDD' },
    { name: 'MONTH', label: 'Month (MM)', date_format: 'MM' },
  ],
  prefixes: ['AST', 'CON', 'SRV', 'INV', 'ORD', 'TKT', 'REQ', 'DOC'],
  separators: ['-', '_', '/'],
};

interface TokenTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onTemplatesUpdated?: () => void;
  entityType?: string; // Add optional props to match usage in DisplayIdConfig
  entitySchema?: string;
  onSelect?: (token: string) => void; // Add onSelect prop for inserting tokens
}

const TokenTemplateModal: React.FC<TokenTemplateModalProps> = ({
  visible,
  onClose,
  onTemplatesUpdated,
  onSelect,
}) => {
  const [templates, setTemplates] = useState<TokenTemplates>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('lookup');
  
  // Lookup form
  const [lookupForm] = Form.useForm();
  const [editingLookup, setEditingLookup] = useState<LookupToken | null>(null);
  
  // Date part form
  const [datePartForm] = Form.useForm();
  const [editingDatePart, setEditingDatePart] = useState<DatePartToken | null>(null);
  
  // Prefix form
  const [newPrefix, setNewPrefix] = useState('');

  // Fetch templates from meta_config
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('meta_config')
        .select('config_value')
        .eq('config_key', META_CONFIG_KEY)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.config_value) {
        setTemplates({
          ...DEFAULT_TEMPLATES,
          ...data.config_value,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save templates to meta_config
  const saveTemplates = async (newTemplates: TokenTemplates) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .schema('core')
        .from('meta_config')
        .upsert({
          config_key: META_CONFIG_KEY,
          config_value: newTemplates,
          description: 'Display ID token templates for all entities',
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      setTemplates(newTemplates);
      message.success('Templates saved successfully');
      onTemplatesUpdated?.();
    } catch (err: any) {
      message.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchTemplates();
    }
  }, [visible]);

  // Lookup token handlers
  const handleSaveLookup = async (values: any) => {
    const newLookup: LookupToken = {
      name: values.name.toUpperCase().replace(/\s+/g, '_'),
      label: values.label,
      entity_field: values.entity_field,
      lookup_schema: values.lookup_schema,
      lookup_table: values.lookup_table,
      lookup_value_field: values.lookup_value_field,
    };

    let newLookups: LookupToken[];
    if (editingLookup) {
      newLookups = templates.lookup.map(l => 
        l.name === editingLookup.name ? newLookup : l
      );
    } else {
      if (templates.lookup.some(l => l.name === newLookup.name)) {
        message.error('Token name already exists');
        return;
      }
      newLookups = [...templates.lookup, newLookup];
    }

    await saveTemplates({ ...templates, lookup: newLookups });
    lookupForm.resetFields();
    setEditingLookup(null);
  };

  const handleDeleteLookup = async (name: string) => {
    const newLookups = templates.lookup.filter(l => l.name !== name);
    await saveTemplates({ ...templates, lookup: newLookups });
  };

  // Date part handlers
  const handleSaveDatePart = async (values: any) => {
    const newDatePart: DatePartToken = {
      name: values.name.toUpperCase().replace(/\s+/g, '_'),
      label: values.label,
      date_format: values.date_format,
    };

    let newDateParts: DatePartToken[];
    if (editingDatePart) {
      newDateParts = templates.date_part.map(d => 
        d.name === editingDatePart.name ? newDatePart : d
      );
    } else {
      if (templates.date_part.some(d => d.name === newDatePart.name)) {
        message.error('Token name already exists');
        return;
      }
      newDateParts = [...templates.date_part, newDatePart];
    }

    await saveTemplates({ ...templates, date_part: newDateParts });
    datePartForm.resetFields();
    setEditingDatePart(null);
  };

  const handleDeleteDatePart = async (name: string) => {
    const newDateParts = templates.date_part.filter(d => d.name !== name);
    await saveTemplates({ ...templates, date_part: newDateParts });
  };

  // Prefix handlers
  const handleAddPrefix = async () => {
    if (!newPrefix.trim()) return;
    const prefix = newPrefix.toUpperCase().trim();
    if (templates.prefixes.includes(prefix)) {
      message.error('Prefix already exists');
      return;
    }
    await saveTemplates({ 
      ...templates, 
      prefixes: [...templates.prefixes, prefix] 
    });
    setNewPrefix('');
  };

  const handleDeletePrefix = async (prefix: string) => {
    await saveTemplates({ 
      ...templates, 
      prefixes: templates.prefixes.filter(p => p !== prefix) 
    });
  };

  // Table columns for lookups
  const lookupColumns = [
    { title: 'Token', dataIndex: 'name', key: 'name', render: (t: string) => <Tag color="blue">{`{${t}}`}</Tag> },
    { title: 'Label', dataIndex: 'label', key: 'label' },
    { title: 'Entity Field', dataIndex: 'entity_field', key: 'entity_field', render: (t: string) => <code>{t}</code> },
    { title: 'Lookup', key: 'lookup', render: (_: any, r: LookupToken) => <code>{r.lookup_schema}.{r.lookup_table}</code> },
    { title: 'Value Field', dataIndex: 'lookup_value_field', key: 'lookup_value_field', render: (t: string) => <code>{t}</code> },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: LookupToken) => (
        <Space size="small">
          {onSelect && (
            <Button size="small" type="link" onClick={() => onSelect(`{${record.name}}`)}>Insert</Button>
          )}
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingLookup(record);
              lookupForm.setFieldsValue(record);
            }}
          />
          <Popconfirm title="Delete this token?" onConfirm={() => handleDeleteLookup(record.name)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Table columns for date parts
  const datePartColumns = [
    { title: 'Token', dataIndex: 'name', key: 'name', render: (t: string) => <Tag color="green">{`{${t}}`}</Tag> },
    { title: 'Label', dataIndex: 'label', key: 'label' },
    { title: 'Format', dataIndex: 'date_format', key: 'date_format', render: (t: string) => <code>{t}</code> },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: DatePartToken) => (
        <Space size="small">
          {onSelect && (
            <Button size="small" type="link" onClick={() => onSelect(`{${record.name}}`)}>Insert</Button>
          )}
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingDatePart(record);
              datePartForm.setFieldsValue(record);
            }}
          />
          <Popconfirm title="Delete this token?" onConfirm={() => handleDeleteDatePart(record.name)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="Manage Token Templates"
      open={visible}
      onCancel={onClose}
      width={950}
      footer={null}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'lookup',
            label: 'Lookup Tokens',
            children: (
              <>
                <Form
                  form={lookupForm}
                  layout="inline"
                  onFinish={handleSaveLookup}
                  style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                >
                  <Form.Item name="name" rules={[{ required: true }]} style={{ marginBottom: 0, width: 80 }}>
                    <Input placeholder="Name" size="small" />
                  </Form.Item>
                  <Form.Item name="label" rules={[{ required: true }]} style={{ marginBottom: 0, width: 100 }}>
                    <Input placeholder="Label" size="small" />
                  </Form.Item>
                  <Form.Item name="entity_field" rules={[{ required: true }]} style={{ marginBottom: 0, width: 110 }}>
                    <Input placeholder="entity_field" size="small" />
                  </Form.Item>
                  <Form.Item name="lookup_schema" style={{ marginBottom: 0, width: 80 }}>
                    <Input placeholder="schema" size="small" />
                  </Form.Item>
                  <Form.Item name="lookup_table" rules={[{ required: true }]} style={{ marginBottom: 0, width: 130 }}>
                    <Input placeholder="table" size="small" />
                  </Form.Item>
                  <Form.Item name="lookup_value_field" rules={[{ required: true }]} style={{ marginBottom: 0, width: 90 }}>
                    <Input placeholder="value_field" size="small" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="small">
                    {editingLookup ? 'Update' : 'Add'}
                  </Button>
                  {editingLookup && (
                    <Button size="small" onClick={() => { setEditingLookup(null); lookupForm.resetFields(); }}>
                      Cancel
                    </Button>
                  )}
                </Form>
                <Table
                  dataSource={templates.lookup}
                  columns={lookupColumns}
                  rowKey="name"
                  size="small"
                  loading={loading}
                  pagination={false}
                  scroll={{ x: true }}
                />
              </>
            ),
          },
          {
            key: 'date_part',
            label: 'Date Tokens',
            children: (
              <>
                <Form
                  form={datePartForm}
                  layout="inline"
                  onFinish={handleSaveDatePart}
                  style={{ marginBottom: 16, display: 'flex', gap: '8px' }}
                >
                  <Form.Item name="name" rules={[{ required: true }]} style={{ marginBottom: 0, width: 120 }}>
                    <Input placeholder="Token Name" size="small" />
                  </Form.Item>
                  <Form.Item name="label" rules={[{ required: true }]} style={{ marginBottom: 0, width: 150 }}>
                    <Input placeholder="Label" size="small" />
                  </Form.Item>
                  <Form.Item name="date_format" rules={[{ required: true }]} style={{ marginBottom: 0, width: 150 }}>
                    <Select placeholder="Date Format" size="small">
                      <Option value="YYYY">YYYY (2025)</Option>
                      <Option value="YY">YY (25)</Option>
                      <Option value="YYYYMM">YYYYMM (202512)</Option>
                      <Option value="YYYYMMDD">YYYYMMDD</Option>
                      <Option value="MM">MM (12)</Option>
                      <Option value="DD">DD (17)</Option>
                    </Select>
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="small">
                    {editingDatePart ? 'Update' : 'Add'}
                  </Button>
                  {editingDatePart && (
                    <Button size="small" onClick={() => { setEditingDatePart(null); datePartForm.resetFields(); }}>
                      Cancel
                    </Button>
                  )}
                </Form>
                <Table
                  dataSource={templates.date_part}
                  columns={datePartColumns}
                  rowKey="name"
                  size="small"
                  loading={loading}
                  pagination={false}
                />
              </>
            ),
          },
          {
            key: 'prefixes',
            label: 'Prefixes',
            children: (
              <>
                <Space style={{ marginBottom: 16 }}>
                  <Input
                    placeholder="New prefix (e.g., AST)"
                    value={newPrefix}
                    onChange={e => setNewPrefix(e.target.value.toUpperCase())}
                    style={{ width: 150 }}
                    onPressEnter={handleAddPrefix}
                  />
                  <Button type="primary" onClick={handleAddPrefix} loading={saving} icon={<PlusOutlined />}>
                    Add
                  </Button>
                </Space>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {templates.prefixes.map(prefix => (
                    <Tag
                      key={prefix}
                      closable
                      onClose={() => handleDeletePrefix(prefix)}
                      style={{ fontSize: 14, padding: '4px 8px' }}
                    >
                      {prefix}
                    </Tag>
                  ))}
                  {templates.prefixes.length === 0 && <Empty description="No prefixes" />}
                </div>
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default TokenTemplateModal;

// Export a hook to fetch templates
export const useTokenTemplates = (entityType?: string, entitySchema?: string) => {
  const [templates, setTemplates] = useState<TokenTemplates>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('meta_config')
        .select('config_value')
        .eq('config_key', META_CONFIG_KEY)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.config_value) {
        setTemplates({
          ...DEFAULT_TEMPLATES,
          ...data.config_value,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [entityType, entitySchema]);

  const availableTokens = [
      ...templates.lookup,
      ...templates.date_part.map(d => ({ ...d, token: d.name })) // Map to common structure if needed
  ].map(t => ({ token: t.name, name: t.label || t.name }));

  return { templates, availableTokens, loadingTokens: loading, fetchTokens: fetchTemplates };
};
