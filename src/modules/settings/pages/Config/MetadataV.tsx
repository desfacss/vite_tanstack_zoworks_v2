import React, { useState, useEffect, useRef } from 'react';
import { Select, Button, Form, Table, message, Input, Popconfirm, Checkbox, Card, Typography, Dropdown, Space } from 'antd';
import { DeleteOutlined, DownOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase'; // Adjust path as needed
import _ from 'lodash';

const { Option } = Select;
const { Title, Paragraph } = Typography;

// --- INTERFACES ---

/** Defines the structure for foreign key information */
interface ForeignKey {
  source_table?: string;
  source_column?: string;
  display_column?: string;
}

/** Defines the structure for semantic type information */
interface SemanticType {
  role: string;
  sub_type: string;
  default_aggregation: string;
  order: string[];
}

/**
 * Defines the complete structure of a metadata item as fetched from the DB function
 * and intended to be stored in the database.
 */
interface MetadataItem {
  key: string;
  type: string;
  display_name: string;
  foreign_key?: ForeignKey | null;
  potential_fk?: ForeignKey;
  semantic_type: SemanticType;
  is_searchable: boolean;
  is_displayable: boolean;
  is_mandatory: boolean;
  is_template: boolean;
  is_virtual: boolean; // <--- ADDED FIELD
  format?: 'array';
}

/**
 * Represents a column shown in the UI table.
 * Merges schema info with saved metadata and adds UI status.
 */
interface DisplayColumn extends MetadataItem {
  status: 'current' | 'new' | 'orphaned';
}

/** Props for the ViewMetadata component */
interface MetadataProps {
  entityType: string;
  entitySchema: string;
  fetchConfigs: () => void; // Callback to refresh parent component list
}

// --- HELPER FUNCTION ---
/** Converts snake_case or camelCase to Sentence case */
const toSentenceCase = (str: string) => {
  if (!str) return '';
  const result = str.replace(/_/g, ' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
};


// --- MAIN COMPONENT ---
const ViewMetadata: React.FC<MetadataProps> = ({ entityType, entitySchema, fetchConfigs }) => {
  const [displayColumns, setDisplayColumns] = useState<DisplayColumn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<any>({});
  const [entityRecord, setEntityRecord] = useState<any>(null);

  /**
   * DEV NOTE: This ref is crucial. It stores the metadata of the BASE entity (e.g., 'expense_sheets').
   * It's used in the 'onFinish' handler as the "ground truth" to compare against,
   * so we only save view-specific overrides.
   */
  const baseEntityMetadataRef = useRef<Map<string, MetadataItem>>(new Map());

  /** State to manage which table columns are visible in the UI */
  const [visibleKeys, setVisibleKeys] = useState<string[]>([
    'key', 'display_name', 'type', 'semantic_type_sub_type', 'is_searchable', 'is_displayable', 'is_virtual', 'action' // <--- ADDED 'is_virtual'
  ]);

  // --- Static Options for Select dropdowns ---
  const fieldOptions = {
     data_type_options: [
        'bigint', 'integer', 'smallint', 'numeric', 'real', 'double precision',
        'text', 'varchar', 'char', 'date', 'timestamp', 'timestamp with time zone',
        'boolean', 'uuid', 'json', 'jsonb', 'array', 'USER-DEFINED',
        'object', 'array_of_objects', 'list_string', 'list_integer', 'list_float', 'list_uuid'
    ].sort(),
    semantic_type_sub_type_options: ['quantitative', 'temporal', 'nominal', 'ordinal', 'geojson'].sort(),
    semantic_type_default_aggregation_options: ['sum', 'avg', 'min', 'max', 'count', 'count_distinct'].sort(),
  };

  // --- Data Fetching Effect ---
  useEffect(() => {
    /** Fetches base config, saved view config, and current view schema, then merges them */
    async function fetchData() {
      if (!entityType || !entitySchema) {
        setDisplayColumns([]);
        return;
      }
      setLoading(true);
      baseEntityMetadataRef.current.clear();

      try {
        // 1. Fetch the full entity record, which contains both base 'metadata' and 'v_metadata'
        const { data: savedEntityConfig, error: configError } = await supabase
          .schema('core').from('entities').select('id, metadata, v_metadata').eq('entity_type', entityType).eq('entity_schema', entitySchema).single();
        if (configError && configError.code !== 'PGRST116') throw configError;

        setEntityRecord(savedEntityConfig);
        const baseMetadata: MetadataItem[] = savedEntityConfig?.v_metadata || [];
        const savedViewOverrides: MetadataItem[] = savedEntityConfig?.v_metadata || [];

        // Store the base metadata in the ref for later comparison
        baseMetadata.forEach(item => baseEntityMetadataRef.current.set(item.key, item));

        // 2. Fetch the current schema for the VIEW (`v_...`)
        const { data: viewSchemaResult, error: rpcError } = await supabase.schema('core').rpc('met_scan_schema_columns', {
          p_tablename: `v_${entityType}`, p_schema_name: entitySchema,
        });
        if (rpcError) throw rpcError;
        // Ensure schema columns have is_virtual, defaulting to false if the DB function didn't return it
        const viewSchema: MetadataItem[] = (viewSchemaResult || []).map((item: any) => ({...item, is_virtual: item.is_virtual ?? false}));

        // 3. Merge all three sources to create the final display columns
        const mergedColumns: DisplayColumn[] = [];
        const viewSchemaMap = new Map(viewSchema.map(item => [item.key, item]));

        // Process columns currently in the view schema
        for (const viewCol of viewSchema) {
          const baseConfig = baseEntityMetadataRef.current.get(viewCol.key);
          const viewOverride = savedViewOverrides.find(item => item.key === viewCol.key);

          // The final configuration is the view schema, overridden by base config, then view-specific config
          const finalConfig = { 
            ...(baseConfig || {}), // Start with Base config
            ...(viewCol as MetadataItem), // Override with current view schema (type, potential_fk)
            ...(viewOverride || {}) // Apply view-specific overrides last
          };

          mergedColumns.push({
            ...(finalConfig as MetadataItem), // Apply the merged config
            status: viewOverride ? 'current' : 'new', // 'current' if an override exists, 'new' if it's just inheriting
          } as DisplayColumn);
        }

        // Process orphaned columns
        for (const savedViewCol of savedViewOverrides) {
          if (!viewSchemaMap.has(savedViewCol.key)) {
            mergedColumns.push({
              ...(savedViewCol as MetadataItem),
              status: 'orphaned',
            } as DisplayColumn);
          }
        }
        setDisplayColumns(mergedColumns);

        // 4. Set initial form values based on the fully merged data
        const initialValues = mergedColumns.reduce((acc: any, col) => {
          const hasSavedFkDecision = col.hasOwnProperty('foreign_key');
          const fkToShow = hasSavedFkDecision ? col.foreign_key : (col.foreign_key || col.potential_fk);

          acc[col.key] = {
            display_name: col.display_name || toSentenceCase(col.key),
            type: col.type,
            source_table: fkToShow?.source_table || '',
            source_column: fkToShow?.source_column || '',
            display_column: fkToShow?.display_column || '',
            semantic_type_sub_type: col.semantic_type?.sub_type,
            semantic_type_default_aggregation: col.semantic_type?.default_aggregation,
            order: col.semantic_type?.order?.join(', ') || '',
            is_searchable: col.is_searchable,
            is_displayable: col.is_displayable,
            is_mandatory: col.is_mandatory,
            is_template: col.is_template,
            is_virtual: col.is_virtual, // <--- INITIALIZE NEW FIELD
          };
          return acc;
        }, {});
        form.setFieldsValue(initialValues);
        setFormValues(initialValues);
      } catch (error: any) {
        console.error("Error fetching view data:", error);
        message.error(`Failed to load view data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [entityType, entitySchema, form]);

  /**
   * DEV NOTE: This is the core override logic.
   * It constructs the full configuration for each field based on form values,
   * then compares it to the base entity's configuration.
   * Only if there's a difference is the configuration saved as a view-specific override.
   */
  const onFinish = async (values: any) => {
    try {
        const viewMetadataOverrides: Partial<MetadataItem>[] = []; // We only need to save the override fields
        const activeKeys = new Set(displayColumns.filter(c => c.status !== 'orphaned').map(c => c.key));

        for (const key of activeKeys) {
            const formField = values[key];
            if (!formField) continue;

            const baseConfig = baseEntityMetadataRef.current.get(key);
            const originalDisplayCol = displayColumns.find(c => c.key === key);
            if (!originalDisplayCol) continue;

            // 1. Construct the complete, final state of the column from the form
            const currentConfig = {
                key,
                type: formField.type,
                display_name: formField.display_name,
                is_searchable: formField.is_searchable,
                is_displayable: formField.is_displayable,
                is_mandatory: originalDisplayCol.is_mandatory, // Preserve non-editable fields
                is_template: originalDisplayCol.is_template, // Preserve non-editable fields
                is_virtual: formField.is_virtual,
                semantic_type: {
                    role: ['numeric', 'integer', 'bigint'].includes(formField.type) ? 'measure' : 'dimension',
                    sub_type: formField.semantic_type_sub_type,
                    default_aggregation: formField.semantic_type_default_aggregation,
                    order: formField.semantic_type_sub_type === 'ordinal' && formField.order ? formField.order.split(',').map((item: string) => item.trim()).filter(Boolean) : [],
                },
            } as MetadataItem;
            
            // Handle FK separately to allow for omission
            const hasFkInput = formField.source_table?.trim() || formField.source_column?.trim();
            if(hasFkInput) {
                currentConfig.foreign_key = {
                    source_table: formField.source_table?.trim() || undefined,
                    source_column: formField.source_column?.trim() || undefined,
                    display_column: formField.display_column?.trim() || undefined,
                };
            }
            // If !hasFkInput, the foreign_key property is omitted

            // 2. If there's no base config, this is a view-only column, so we must save its config.
            if (!baseConfig) {
                viewMetadataOverrides.push(currentConfig);
                continue; // Move to next item
            }

            // 3. Compare the current config with the base config to see if an override is needed.
            // We create a "canonical" version of the base config to ensure a fair comparison.
            const canonicalBase = {
                key: baseConfig.key,
                type: baseConfig.type,
                display_name: baseConfig.display_name,
                is_searchable: baseConfig.is_searchable,
                is_displayable: baseConfig.is_displayable,
                is_mandatory: baseConfig.is_mandatory,
                is_template: baseConfig.is_template,
                is_virtual: baseConfig.is_virtual,
                semantic_type: {
                    role: baseConfig.semantic_type.role,
                    sub_type: baseConfig.semantic_type.sub_type,
                    default_aggregation: baseConfig.semantic_type.default_aggregation,
                    order: baseConfig.semantic_type.order,
                },
                // Only include foreign_key in comparison if it exists
                ...(baseConfig.foreign_key && { foreign_key: baseConfig.foreign_key }),
            };
            
            // If the current state is different from the base state, add it to the overrides.
            if (!_.isEqual(currentConfig, canonicalBase)) {
                viewMetadataOverrides.push(currentConfig);
            }
        }
        
        // 4. Upsert the payload, updating only the v_metadata field
        // Note: This relies on entityRecord.id being present from the fetch.
        // if (!entityRecord || !entityRecord.id) {
        //   throw new Error("Cannot save view overrides: Base entity record ID is missing.");
        // }
        
        const upsertPayload = {
            id: entityRecord.id, // Must have the ID to update the correct row
            v_metadata: viewMetadataOverrides,
        };

        const { error } = await supabase.schema('core').from('entities').update(upsertPayload).eq('id', entityRecord.id);
        if (error) throw error;

        // message.success('View metadata overrides saved successfully!');
        
        // --- 4. Execute Save RPC for View Overrides ---
                const { data: savedData, error: saveError } = await supabase
                  .schema('core').rpc('entity_metadata_save', {
                    p_entity_schema: entitySchema,
                    p_entity_type: entityType,
                    p_metadata: viewMetadataOverrides,
                    p_is_view: true // <--- CRUCIAL CHANGE: Set to true for views (v_metadata)
                  });
        
                if (saveError) throw saveError;
                
                // --- 5. Execute Optimize RPC (if required for view dependencies) ---
                // const { error: optimizeError } = await supabase
                //   .schema('core').rpc('entity_optimize', {
                //     p_entity_schema: entitySchema,
                //     p_entity_type: entityType
                //   });
        
                // if (optimizeError) {
                //   console.warn("Optimization failed:", optimizeError);
                //   message.warning('View overrides saved, but optimization failed. Check logs.');
                // } else {
                  message.success('View metadata overrides saved successfully!');
                // }
        
                // --- 6. Update State ---
                // savedData here should contain the new v_metadata list
                const dataForRef = Array.isArray(savedData) ? savedData : viewMetadataOverrides;
                // Since we only saved overrides, we don't fully update the baseEntityMetadataRef, 
                // we just rely on the next fetchData to pull the new v_metadata.
                
                fetchConfigs(); // Refresh parent component
    } catch (error: any) {
        console.error("Error saving view metadata:", error);
        message.error(`Failed to save view metadata: ${error.message || error.details}`);
    }
  };

  const handleDelete = (keyToDelete: string) => {
      setDisplayColumns(prev => prev.filter(col => col.key !== keyToDelete));
      // Remove from form state to ensure it's not saved
      const newValues = { ...formValues };
      delete newValues[keyToDelete];
      form.setFieldsValue(newValues);
      setFormValues(newValues);
      message.info(`Field override '${keyToDelete}' removed from configuration. Save to persist changes.`);
    };
  const handleValuesChange = (_: any, allValues: any) => setFormValues(allValues);

  const allColumnsDef = [
    { title: 'Field Name (Type)', key: 'key', dataIndex: 'key', width: 250, fixed: 'left' as 'left', render: (text: string, record: DisplayColumn) => <span>{text} <span style={{opacity: 0.7}}>({record.type})</span></span> },
    { title: 'Display Name', key: 'display_name', width: 180, render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'display_name']} noStyle><Input /></Form.Item>) },
    { title: 'Data Type', key: 'type', width: 180, render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'type']} noStyle><Select style={{ width: '100%' }} options={fieldOptions.data_type_options.map(o => ({label: o, value: o}))} /></Form.Item>) },
    { title: 'Sub Type', key: 'semantic_type_sub_type', width: 130, render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'semantic_type_sub_type']} noStyle><Select style={{ width: '100%' }} options={fieldOptions.semantic_type_sub_type_options.map(o => ({label: o, value: o}))} /></Form.Item>) },
    { title: 'Aggregation', key: 'semantic_type_default_aggregation', width: 130, render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'semantic_type_default_aggregation']} noStyle><Select style={{ width: '100%' }} options={fieldOptions.semantic_type_default_aggregation_options.map(o => ({label: o, value: o}))} /></Form.Item>) },
    { title: 'Filterable', key: 'is_searchable', width: 90, align: 'center' as 'center', render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_searchable']} valuePropName="checked" noStyle><Checkbox /></Form.Item>) },
    { title: 'Displayable', key: 'is_displayable', width: 100, align: 'center' as 'center', render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_displayable']} valuePropName="checked" noStyle><Checkbox /></Form.Item>) },
    { title: 'Virtual', key: 'is_virtual', width: 90, align: 'center' as 'center', render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_virtual']} valuePropName="checked" noStyle><Checkbox /></Form.Item>) }, // <--- NEW COLUMN
    { title: 'Mandatory', key: 'is_mandatory', width: 100, align: 'center' as 'center', render: (text: boolean) => (<Checkbox checked={text} disabled />)}, // Base-only, non-editable here
    { title: 'Template', key: 'is_template', width: 90, align: 'center' as 'center', render: (text: boolean) => (<Checkbox checked={text} disabled />)}, // Base-only, non-editable here    
    { title: 'Order', key: 'order', width: 150, render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'order']} noStyle><Input placeholder="a,b,c" disabled={formValues[record.key]?.semantic_type_sub_type !== 'ordinal'} /></Form.Item>) },
    { title: 'FK Table', key: 'source_table', width: 200, render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'source_table']} noStyle><Input placeholder="schema.table_name" /></Form.Item>) },
    { title: 'FK Column', key: 'source_column', width: 150, render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'source_column']} noStyle><Input placeholder="column_name" /></Form.Item>) },
    { title: 'FK Display', key: 'display_column', width: 150, render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'display_column']} noStyle><Input placeholder="display_column" /></Form.Item>) },
    { title: 'Actions', key: 'action', width: 80, align: 'center' as 'center', fixed: 'right' as 'right', render: (_: any, record: DisplayColumn) => (<Popconfirm title="Remove override?" onConfirm={() => handleDelete(record.key)} okText="Yes" cancelText="No"><Button icon={<DeleteOutlined />} danger size="small" /></Popconfirm>), },
  ];

  // --- UI Render ---
  const columnMenu = ( <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #d9d9d9', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}><Paragraph strong style={{ marginBottom: '8px' }}>Show/Hide Columns:</Paragraph><Checkbox.Group style={{ display: 'flex', flexDirection: 'column' }} options={allColumnsDef.filter(c => !['key', 'action'].includes(c.key)).map(c => ({ label: c.title, value: c.key }))} value={visibleKeys.filter(k => k !== 'key' && k !== 'action')} onChange={(keys) => setVisibleKeys(['key', ...keys as string[], 'action'])} /></div>);
  if (loading) return <div>Loading view configuration...</div>;
  if (!entityType || !entitySchema) return <Card>Please select an entity and schema to begin.</Card>;
  const filteredColumnsDef = allColumnsDef.filter(colDef => visibleKeys.includes(colDef.key));
  const synchedColumns = displayColumns.filter(c => c.status === 'current');
  const newColumns = displayColumns.filter(c => c.status === 'new');
  const orphanedColumns = displayColumns.filter(c => c.status === 'orphaned');
  
  return (
    <Form form={form} onFinish={onFinish} onValuesChange={handleValuesChange} autoComplete="off">
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}><Dropdown overlay={columnMenu} trigger={['click']}><Button><Space>Configure Columns <DownOutlined /></Space></Button></Dropdown></div>
        {synchedColumns.length > 0 && (<div style={{ marginBottom: '2rem' }}><Title level={4}>Overridden View Fields ✅</Title><Paragraph type="secondary">Fields with saved configurations specific to this view.</Paragraph><Table columns={filteredColumnsDef} dataSource={synchedColumns} pagination={false} bordered rowKey="key" scroll={{ x: 1500 }} size="small" /></div>)}
        {newColumns.length > 0 && (<div style={{ marginBottom: '2rem' }}><Title level={4}>New & Inherited View Fields ✨</Title><Paragraph type="secondary">New joined fields or fields inheriting all settings from the base entity.</Paragraph><Table columns={filteredColumnsDef} dataSource={newColumns} pagination={false} bordered rowKey="key" rowClassName={() => 'row-new'} scroll={{ x: 1500 }} size="small"/></div>)}
        {orphanedColumns.length > 0 && (<div style={{ marginBottom: '2rem' }}><Title level={4}>Orphaned View Fields 🗑️</Title><Paragraph type="secondary">Fields previously configured for this view that are no longer present.</Paragraph><Table columns={filteredColumnsDef} dataSource={orphanedColumns} pagination={false} bordered rowKey="key" rowClassName={() => 'row-orphaned'} scroll={{ x: 1500 }} size="small" /></div>)}
        {displayColumns.length > 0 && (<Button type="primary" htmlType="submit" style={{ marginTop: '10px' }}>Save View Overrides</Button>)}
    </Form>
  );
};

export default ViewMetadata;
