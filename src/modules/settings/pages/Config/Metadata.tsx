import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Select, Button, Form, Table, message, Input, Popconfirm, Checkbox, Card, Typography, Dropdown, Space, Tag, Alert } from 'antd';
import { DeleteOutlined, DownOutlined, ApartmentOutlined, SyncOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import _ from 'lodash'; 
import EntityVersionManager from './EntityVersionManager';

const { Title, Paragraph } = Typography;

// --- INTERFACES ---

/** Defines the structure for foreign key information */
interface ForeignKey {
  source_table?: string;
  source_column?: string;
  display_column?: string;
  reason?: string;
  confidence?: string;
}

/** Defines the structure for semantic type information */
interface SemanticType {
  role: string;
  sub_type: string;
  default_aggregation: string;
  order: string[];
  keyword?: boolean; 
}

/** Defines the structure for polymorphic targets */
interface PolymorphicTarget {
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
  is_virtual: boolean;
}

/** Defines the structure for polymorphic column */
interface Polymorphic {
  targets: PolymorphicTarget[];
  id_column: string;
  type_column: string;
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
  polymorphic?: Polymorphic; 
  is_searchable: boolean;
  is_displayable: boolean;
  is_mandatory: boolean;
  is_template: boolean;
  is_virtual: boolean;
  format?: 'array'; 
  tier?: number;
  is_phys_generated?: boolean;
  is_visible?: boolean;
  is_read_only?: boolean;
  jsonb_path?: string | null;
  jsonb_column?: string | null;
  source_table?: string | null; // Host table
}

/**
 * Represents a column shown in the UI table.
 */
interface DisplayColumn extends MetadataItem {
  status: 'current' | 'new' | 'orphaned';
  is_polymorphic_parent?: boolean;
  is_polymorphic_target?: boolean;
  parent_key?: string; 
  target_key?: string; 
}

/** Props for the Metadata component */
interface MetadataProps {
  entityType: string;
  entitySchema: string;
  fetchConfigs: () => void; // Callback to refresh parent component list
  // NEW: Logical variant awareness
  isLogicalVariant?: boolean;
  baseSourceName?: string;
  partitionFilter?: string;
}

// --- HELPER FUNCTION ---
/** Converts snake_case or camelCase to Sentence case */
const toSentenceCase = (str: string) => {
  if (!str) return '';
  const parts = str.split('.');
  const lastPart = parts[parts.length - 1];
  const result = lastPart
    .replace(/_/g, ' ') 
    .replace(/([A-Z])/g, ' $1'); 
  return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
};

// --- MAIN COMPONENT ---
const Metadata: React.FC<MetadataProps> = ({ 
  entityType, 
  entitySchema, 
  fetchConfigs,
  isLogicalVariant = false,
  baseSourceName,
  partitionFilter,
}) => {
  const shortEntityType = entityType.includes('.') ? entityType.split('.').pop()! : entityType;

  // State for columns displayed in the UI tables
  const [displayColumns, setDisplayColumns] = useState<DisplayColumn[]>([]);
  // Loading state
  const [loading, setLoading] = useState<boolean>(true);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<any>({});

  const originalMetadataRef = useRef<Map<string, MetadataItem>>(new Map());

  const [visibleKeys, setVisibleKeys] = useState<string[]>([
    'key', 'display_name', 'type', 'tier', 'is_phys_generated', 'is_read_only', 'is_visible', 'semantic_type_sub_type',
    'source_table', 'source_column', 'display_column', 'action',
    'semantic_type_default_aggregation','is_searchable','is_displayable','is_mandatory','is_virtual','is_template','order'
  ]);

  // --- Static Options for Select dropdowns ---
  const fieldOptions = {
    data_type_options: [
      'bigint', 'integer', 'smallint', 'numeric', 'real', 'double precision',
      'text', 'varchar', 'char', 'date', 'timestamp', 'timestamp with time zone',
      'boolean', 'uuid', 'json', 'jsonb', 'array', 'USER-DEFINED',
      'object', 'array_of_objects',
      'list_string', 'list_integer', 'list_float', 'list_uuid' 
    ].sort(),
    semantic_type_sub_type_options: ['quantitative', 'temporal', 'nominal', 'ordinal', 'geojson', 'discrete'].sort(),
    semantic_type_default_aggregation_options: ['sum', 'avg', 'min', 'max', 'count', 'count_distinct'].sort(),
  };

  // --- DATA FETCHING FUNCTION (MOVED OUTSIDE useEffect) ---
  /** Fetches saved entity config and current DB schema, then merges them */
  const fetchData = useCallback(async () => {
    if (!entityType || !entitySchema) {
      setDisplayColumns([]);
      originalMetadataRef.current.clear();
      return;
    }
    setLoading(true);
    originalMetadataRef.current.clear(); 

    try {
      // 1. Fetch metadata directly from 'core.entities'
      const { data: entityData, error: configError } = await supabase
        .schema('core')
        .from('entities')
        .select('id, v_metadata')
        .eq('entity_type', shortEntityType)
        .eq('entity_schema', entitySchema)
        .single();

      if (configError && configError.code !== 'PGRST116') throw configError;
      
      // Use v_metadata if available, fallback to empty array
      const currentMetadata: MetadataItem[] = entityData?.v_metadata || [];

      const mergedColumns: DisplayColumn[] = [];
      
      // Store complete items in the ref
      currentMetadata.forEach(item => {
          originalMetadataRef.current.set(item.key, _.cloneDeep(item));
      });

      // Process columns from current metadata
      for (const item of currentMetadata) {
        // Add the Main Column
        mergedColumns.push({
          ...item,
          status: 'current',
          is_polymorphic_parent: !!item.polymorphic,
        });

        // Extract and add Polymorphic Targets
        if (item.polymorphic) {
          item.polymorphic.targets.forEach(target => {
            const targetRowKey = `${item.key}:${target.key}`;
            mergedColumns.push({
              ...target,
              key: targetRowKey,
              status: 'current',
              is_polymorphic_target: true,
              parent_key: item.key,
              target_key: target.key,
              is_searchable: target.is_searchable ?? false, 
              is_displayable: target.is_displayable ?? false,
              is_mandatory: target.is_mandatory ?? true,
              is_template: target.is_template ?? true,
              is_virtual: target.is_virtual ?? false,
              is_phys_generated: (target as any).is_phys_generated,
              is_read_only: (target as any).is_read_only,
              jsonb_path: (target as any).jsonb_path,
              jsonb_column: (target as any).jsonb_column,
              source_table: (target as any).source_table,
              tier: (target as any).tier,
            });
          });
        }
      }
      
      setDisplayColumns(mergedColumns);

      // 4. Set initial form values based on the data
      const initialValues = mergedColumns.reduce((acc: any, col) => {
        const key = col.key;
        
        const hasSavedFkDecision = col.hasOwnProperty('foreign_key');
        const fkToShow = hasSavedFkDecision
            ? col.foreign_key 
            : (col.foreign_key || col.potential_fk); 

        acc[key] = {
          display_name: col.display_name || toSentenceCase(col.key),
          type: col.type,
          source_table: fkToShow?.source_table || '',
          source_column: fkToShow?.source_column || '',
          display_column: fkToShow?.display_column || '',
          semantic_type_sub_type: col.semantic_type?.sub_type,
          semantic_type_default_aggregation: col.semantic_type?.default_aggregation,
          order: col.semantic_type?.order?.join(', ') || '',
          is_searchable: col.is_searchable ?? false, 
          is_displayable: col.is_displayable ?? false,
          is_mandatory: col.is_mandatory ?? false,
          is_template: col.is_template ?? false,
          is_virtual: col.is_virtual ?? false,
          tier: col.tier,
          is_phys_generated: col.is_phys_generated ?? false,
          is_visible: (col as any).is_visible ?? true,
          is_read_only: col.is_read_only ?? false,
        };
        return acc;
      }, {});
      form.setFieldsValue(initialValues);
      setFormValues(initialValues); 

    } catch (error: any) {
      console.error("Error fetching data:", error);
      message.error(`Failed to load data: ${error.message}`);
      setDisplayColumns([]);
      originalMetadataRef.current.clear();
    } finally {
      setLoading(false);
    }
  }, [entityType, entitySchema, form]); // fetchData depends on these states/props


  // --- Data Fetching Effect ---
  // Now simply calls the defined fetchData function
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Event Handlers ---

  const handleValuesChange = (_: any, allValues: any) => {
    setFormValues(allValues);
  };

  /** Handle form submission: Construct and save the metadata array via RPC */
  const onFinish = async (values: any) => {
    try {
      const metadataToSave: MetadataItem[] = [];
      const polymorphicTargetValues = new Map<string, MetadataItem[]>(); 
      
      const activeDisplayColumns = displayColumns.filter(c => c.status !== 'orphaned');
      
      // 1. Separate Form Values into Top-Level and Polymorphic Targets
      for (const col of activeDisplayColumns) {
        const formFieldValues = values[col.key];

        if (formFieldValues === undefined) continue; 

        // a. Prepare Foreign Key object
        const hasFkInput = formFieldValues.source_table?.trim() || formFieldValues.source_column?.trim();
        let fkValueToSend: ForeignKey | null = null;
        if (hasFkInput) {
            fkValueToSend = {
              source_table: formFieldValues.source_table?.trim() || undefined,
              source_column: formFieldValues.source_column?.trim() || undefined,
              display_column: formFieldValues.display_column?.trim() || undefined,
            };
        }

        // b. Get Original Item (if exists) or create a base
        const originalItem = originalMetadataRef.current.get(col.is_polymorphic_target ? col.parent_key! : col.key) || originalMetadataRef.current.get(col.key);
        const baseOriginal: Partial<MetadataItem> = originalItem || {
            key: col.is_polymorphic_target ? col.target_key! : col.key,
            type: formFieldValues.type || 'unknown',
            display_name: formFieldValues.display_name || col.key,
            semantic_type: { role: 'dimension', sub_type: 'nominal', default_aggregation: 'count', order: [], keyword: false },
            is_searchable: false, is_displayable: true, is_mandatory: true, is_template: true, is_virtual: false
        };

        const isNumeric = ['numeric', 'integer', 'bigint', 'smallint', 'real', 'double precision'].includes(formFieldValues.type || baseOriginal.type!);

        // c. Construct the Saved Item
        const savedItem: MetadataItem = {
          ...(_.omit(baseOriginal, ['potential_fk', 'polymorphic']) as MetadataItem),
          key: col.is_polymorphic_target ? col.target_key! : col.key, // Use target key for targets, main key for others
          type: formFieldValues.type,
          display_name: formFieldValues.display_name,
          semantic_type: {
            ...(baseOriginal.semantic_type || {} as SemanticType),
            role: isNumeric ? 'measure' : 'dimension',
            sub_type: formFieldValues.semantic_type_sub_type,
            default_aggregation: formFieldValues.semantic_type_default_aggregation,
            order: formFieldValues.semantic_type_sub_type === 'ordinal' && formFieldValues.order
              ? formFieldValues.order.split(',').map((item: string) => item.trim()).filter(Boolean)
              : (baseOriginal.semantic_type?.order || []),
            keyword: baseOriginal.semantic_type?.keyword || false,
          },
          is_searchable: formFieldValues.is_searchable,
          is_displayable: formFieldValues.is_displayable,
          is_mandatory: formFieldValues.is_mandatory,
          is_template: formFieldValues.is_template,
          is_virtual: formFieldValues.is_virtual,
          tier: formFieldValues.tier,
          is_phys_generated: formFieldValues.is_phys_generated, 
          is_visible: formFieldValues.is_visible,
          is_read_only: formFieldValues.is_read_only,
          jsonb_path: baseOriginal.jsonb_path,
          jsonb_column: baseOriginal.jsonb_column,
          source_table: baseOriginal.source_table,
        };

        if (fkValueToSend) {
            savedItem.foreign_key = fkValueToSend;
        } else if (col.foreign_key === null || hasFkInput === false) { 
            savedItem.foreign_key = null;
        } else {
            delete savedItem.foreign_key;
        }

        // d. Group or Store the Item
        if (col.is_polymorphic_target) {
            const parentKey = col.parent_key!;
            if (!polymorphicTargetValues.has(parentKey)) {
                polymorphicTargetValues.set(parentKey, []);
            }
            polymorphicTargetValues.get(parentKey)!.push(savedItem);
        } else {
            metadataToSave.push(savedItem);
        }
      }

      // 2. Reconstruct Polymorphic Structure
      for (const item of metadataToSave) {
          const originalParent = originalMetadataRef.current.get(item.key);
          const targets = polymorphicTargetValues.get(item.key);

          if (originalParent?.polymorphic && targets) {
              item.polymorphic = {
                  ...originalParent.polymorphic, // Preserve id_column and type_column
                  targets: targets as PolymorphicTarget[] // Add the saved targets
              };
          }
      }

      // --- 3. Execute Unified Save ---
      message.loading({ content: 'Saving configuration...', key: 'save' });
      const { error: saveError } = await supabase
        .schema('core')
        .rpc('api_new_save_entity_config', {
          p_schema_name: entitySchema,
          p_entity_type: shortEntityType,
          p_config: { metadata: metadataToSave }
        });
        
      if (saveError) throw saveError;

      message.loading({ content: 'Provisioning entity structure...', key: 'save' });
      
      // --- 4. Complete Provisioning (Bootstrap RPC) ---
      const { error: bootstrapError } = await supabase
        .schema('core')
        .rpc('comp_util_ops_bootstrap_entity', {
          p_schema_name: entitySchema,
          p_entity_type: shortEntityType,
          p_config: null,
          p_force_refresh: false
        });

      if (bootstrapError) throw bootstrapError;

      message.success({ content: 'Metadata configuration saved and provisioned successfully!', key: 'save' });
      
      // --- 5. Update State & Refs ---
      await fetchData(); 
      fetchConfigs(); 

    } catch (error: any) {
      console.error("Error saving metadata:", error);
      message.error(`Failed to save metadata: ${error.message || error.details}`);
    }
  };

  /** Syncs logical metadata from registry without overwriting manual edits */
  const handleSyncRegistry = async () => {
    try {
      message.loading({ content: 'Syncing registry metadata...', key: 'sync' });
      const { error } = await supabase
        .schema('core')
        .rpc('util_ops_metadata_sync', {
          p_schema_name: entitySchema,
          p_entity_type: shortEntityType,
          p_overwrite_manual: true
        });

      if (error) throw error;
      
      message.success({ content: 'Registry sync completed successfully!', key: 'sync' });
      await fetchData();
    } catch (error: any) {
      console.error("Error syncing registry:", error);
      message.error({ content: `Sync failed: ${error.message}`, key: 'sync' });
    }
  };

  /** Drops view, cleans up generated columns, and clears registry */
  const handleCleanup = async () => {
    try {
      message.loading({ content: 'Performing cleanup/reset...', key: 'cleanup' });
      const { error } = await supabase
        .schema('core')
        .rpc('comp_util_ops_cleanup_entity', {
          p_schema_name: entitySchema,
          p_entity_type: shortEntityType,
          p_drop_phys_cols: true,
          p_clear_registry: true
        });

      if (error) throw error;
      
      message.success({ content: 'Entity reset successfully!', key: 'cleanup' });
      await fetchData();
      fetchConfigs();
    } catch (error: any) {
      console.error("Error during cleanup:", error);
      message.error({ content: `Cleanup failed: ${error.message}`, key: 'cleanup' });
    }
  };

  /** Automatically suggests views based on metadata */
  const handleAutoSuggestViews = async () => {
    try {
      message.loading({ content: 'Auto suggesting views...', key: 'suggest' });
      const { error } = await supabase
        .schema('core')
        .rpc('util_auto_suggest_views', {
          p_schema_name: entitySchema,
          p_entity_type: shortEntityType,
          p_dry_run: false
        });

      if (error) throw error;
      
      message.success({ content: 'Views suggested successfully! Check the Registry Versions to review.', key: 'suggest' });
      fetchConfigs();
    } catch (error: any) {
      console.error("Error suggesting views:", error);
      message.error({ content: `Suggestion failed: ${error.message}`, key: 'suggest' });
    }
  };

  /** Handle deleting a column from the UI configuration */
  const handleDelete = (keyToDelete: string) => {
    const columnToDelete = displayColumns.find(col => col.key === keyToDelete);

    const keysToRemove = new Set<string>();
    
    if (columnToDelete?.is_polymorphic_parent) {
        keysToRemove.add(keyToDelete);
        displayColumns
          .filter(c => c.parent_key === keyToDelete)
          .forEach(c => keysToRemove.add(c.key));
    } else if (columnToDelete) {
        keysToRemove.add(keyToDelete);
    }
    
    if (keysToRemove.size === 0) return;

    // Remove from the UI display list
    setDisplayColumns(prev => prev.filter(col => !keysToRemove.has(col.key)));

    // Update form state
    const newValues = { ...formValues };
    keysToRemove.forEach(key => delete newValues[key]);
    form.setFieldsValue(newValues);
    setFormValues(newValues); 

    // Remove from ref
    if (!columnToDelete?.is_polymorphic_target) {
        originalMetadataRef.current.delete(keyToDelete);
    }

    message.info(`Field(s) removed from configuration. Save to persist changes.`);
  };


  // --- Column Definitions for AntD Table ---
  const allColumnsDef = [
    // Key and Type (Fixed Left)
    { title: 'Field Name (Type)', key: 'key', dataIndex: 'key', width: 250, fixed: 'left' as 'left', // Cast to fit AntD types
      render: (text: string, record: DisplayColumn) => {
        let display = (
          <span title={record.type}>
            {record.is_polymorphic_target && <Tag icon={<ApartmentOutlined />} color="blue">Target</Tag>}
            {text.split(':').pop()} <span style={{ opacity: 0.6 }}>({record.type})</span>
          </span>
        );
        if (record.is_polymorphic_target) {
            display = <div style={{ paddingLeft: '20px', fontStyle: 'italic' }}>{display}</div>;
        }
        return display;
      }
    },
    // Editable Fields (from Form Items)
    { title: 'Display Name', key: 'display_name', width: 180,
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'display_name']} noStyle><Input /></Form.Item>)
    },
    { title: 'Data Type', key: 'type', width: 180,
      render: (_: any, record: DisplayColumn) => {
          const isDisabled = record.is_polymorphic_target === true;
          return (
              <Form.Item name={[record.key, 'type']} noStyle>
                  <Select style={{ width: '100%' }} options={fieldOptions.data_type_options.map(o => ({label: o, value: o}))} disabled={isDisabled} />
              </Form.Item>
          );
      }
    },
    { title: 'Tier', key: 'tier', width: 100,
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'tier']} noStyle><Input type="number" placeholder="Tier" /></Form.Item>)
    },
    { title: 'Phys Gen', key: 'is_phys_generated', width: 90, align: 'center' as 'center',
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_phys_generated']} valuePropName="checked" noStyle><Checkbox /></Form.Item>)
    },
    { title: 'Read Only', key: 'is_read_only', width: 90, align: 'center' as 'center',
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_read_only']} valuePropName="checked" noStyle><Checkbox /></Form.Item>)
    },
    { title: 'Sub Type', key: 'semantic_type_sub_type', width: 130,
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'semantic_type_sub_type']} noStyle><Select style={{ width: '100%' }} options={fieldOptions.semantic_type_sub_type_options.map(o => ({label: o, value: o}))} /></Form.Item>)
    },
    { title: 'Aggregation', key: 'semantic_type_default_aggregation', width: 130,
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'semantic_type_default_aggregation']} noStyle><Select style={{ width: '100%' }} options={fieldOptions.semantic_type_default_aggregation_options.map(o => ({label: o, value: o}))} /></Form.Item>)
    },
    { title: 'Searchable', key: 'is_searchable', width: 90, align: 'center' as 'center',
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_searchable']} valuePropName="checked" noStyle><Checkbox /></Form.Item>)
    },
    { title: 'Displayable', key: 'is_displayable', width: 100, align: 'center' as 'center',
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_displayable']} valuePropName="checked" noStyle><Checkbox /></Form.Item>)
    },
    { title: 'Mandatory', key: 'is_mandatory', width: 100, align: 'center' as 'center',
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_mandatory']} valuePropName="checked" noStyle><Checkbox /></Form.Item>)
    },
    { title: 'Virtual', key: 'is_virtual', width: 90, align: 'center' as 'center',
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_virtual']} valuePropName="checked" noStyle><Checkbox /></Form.Item>)
    },
    { title: 'Template', key: 'is_template', width: 90, align: 'center' as 'center',
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'is_template']} valuePropName="checked" noStyle><Checkbox /></Form.Item>)
    },
    // NEW: is_visible column for logical variants - controls if column appears in the view
    { title: 'Visible', key: 'is_visible', width: 80, align: 'center' as 'center',
      render: (_: any, record: DisplayColumn) => (
        <Form.Item name={[record.key, 'is_visible']} valuePropName="checked" noStyle>
          <Checkbox defaultChecked />
        </Form.Item>
      )
    },
    { title: 'Order', key: 'order', width: 150,
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'order']} noStyle><Input placeholder="a,b,c" disabled={formValues[record.key]?.semantic_type_sub_type !== 'ordinal'} /></Form.Item>)
    },
    { title: 'FK Table', key: 'source_table', width: 200,
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'source_table']} noStyle><Input placeholder="schema.table_name" /></Form.Item>)
    },
    { title: 'FK Column', key: 'source_column', width: 150,
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'source_column']} noStyle><Input placeholder="column_name" /></Form.Item>)
    },
    { title: 'FK Display', key: 'display_column', width: 150,
      render: (_: any, record: DisplayColumn) => (<Form.Item name={[record.key, 'display_column']} noStyle><Input placeholder="display_column" /></Form.Item>)
    },
    // Action Column (Fixed Right)
    { title: 'Actions', key: 'action', width: 80, align: 'center' as 'center', fixed: 'right' as 'right',
      render: (_: any, record: DisplayColumn) => (
        <Popconfirm title={`Remove ${record.is_polymorphic_parent ? 'field and its targets' : 'field'} from config?`} onConfirm={() => handleDelete(record.key)} okText="Yes" cancelText="No">
          <Button icon={<DeleteOutlined />} danger size="small" />
        </Popconfirm>
      ),
    },
  ];

  // --- Column Visibility Dropdown Menu ---
  const columnMenu = (
    <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #d9d9d9', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)', maxHeight: '400px', overflowY: 'auto' }}>
      <Paragraph strong style={{ marginBottom: '8px' }}>Show/Hide Columns:</Paragraph>
      <Checkbox.Group
        style={{ display: 'flex', flexDirection: 'column' }}
        options={allColumnsDef
            .filter(c => !['key', 'action'].includes(c.key))
            .map(c => ({ label: c.title || c.key, value: c.key }))}
        value={visibleKeys.filter(k => k !== 'key' && k !== 'action')} 
        onChange={(keys) => setVisibleKeys(['key', ...keys as string[], 'action'])}
      />
    </div>
  );

  // --- Scroll and Sticky Configuration ---
  const scrollConfig = { 
    x: 1500, // Horizontal scroll
    y: 'calc(100vh - 400px)', // Vertical scroll max height (adjust 400px as needed)
  };

  const stickyConfig = {
    offsetHeader: 0, // Sticks header to the top of the viewport
  };

  // --- Render Logic ---
  if (loading) return <div>Loading configuration...</div>;
  if (!entityType || !entitySchema) return <Card>Please select an entity and schema to begin.</Card>;

  const sortedDisplayColumns = _.sortBy(displayColumns, ['tier', 'key']);
  const filteredColumnsDef = allColumnsDef.filter(colDef => visibleKeys.includes(colDef.key));

  const synchedColumns = sortedDisplayColumns.filter(c => c.status === 'current');
  const newColumns = sortedDisplayColumns.filter(c => c.status === 'new');
  const orphanedColumns = sortedDisplayColumns.filter(c => c.status === 'orphaned');

  return (
    <Form form={form} onFinish={onFinish} onValuesChange={handleValuesChange} autoComplete="off">
    <EntityVersionManager 
        entity_schema={entitySchema} 
        entity_type={entityType} 
      />
      
      {/* Logical Variant Info Banner */}
      {isLogicalVariant && (
        <Alert
          message={`Logical Variant of ${baseSourceName || 'base table'}`}
          description={
            <div>
              <div><strong>Base Table:</strong> {baseSourceName}</div>
              {partitionFilter && (
                <div><strong>Partition Filter:</strong> <Tag color="blue">{partitionFilter}</Tag></div>
              )}
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                Use the "Visible" checkbox to control which columns appear in this variant's view.
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Popconfirm 
                title="Are you sure you want to reset this entity? This will drop the logical view, remove generated columns, and clear the registry." 
                onConfirm={handleCleanup} 
                okText="Yes, Reset" 
                cancelText="No"
                okButtonProps={{ danger: true }}
            >
                <Button danger type="dashed" icon={<DeleteOutlined />}>
                    Reset Entity
                </Button>
            </Popconfirm>
            <Button 
                icon={<SyncOutlined />} 
                onClick={handleSyncRegistry}
                title="Sync from Registry (won't overwrite manual edits)"
            >
                Sync Registry
            </Button>
            <Dropdown overlay={columnMenu} trigger={['click']}>
                <Button>
                    <Space>Configure Columns <DownOutlined /></Space>
                </Button>
            </Dropdown>
        </div>

      {/* Synched Fields Table */}
      {synchedColumns.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <Title level={4}>Synched Fields ✅</Title>
          <Paragraph type="secondary">Fields existing in both the database and saved configuration (including polymorphic targets).</Paragraph>
          <Table 
            columns={filteredColumnsDef} 
            dataSource={synchedColumns} 
            pagination={false} 
            bordered 
            rowKey="key" 
            scroll={scrollConfig}
            sticky={stickyConfig}
            size="small" 
          />
        </div>
      )}

      {/* New Fields Table */}
      {newColumns.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <Title level={4}>New Fields ✨</Title>
          <Paragraph type="secondary">New fields found in the database. Configure to add them.</Paragraph>
          <Table 
            columns={filteredColumnsDef} 
            dataSource={newColumns} 
            pagination={false} 
            bordered 
            rowKey="key" 
            rowClassName={() => 'row-new'} 
            scroll={scrollConfig}
            sticky={stickyConfig}
            size="small"
          />
        </div>
      )}

      {/* Orphaned Fields Table */}
      {orphanedColumns.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <Title level={4}>Orphaned Fields 🗑️</Title>
          <Paragraph type="secondary">Fields from saved configuration no longer in the database. You can remove them if desired.</Paragraph>
          <Table 
            columns={filteredColumnsDef} 
            dataSource={orphanedColumns} 
            pagination={false} 
            bordered 
            rowKey="key" 
            rowClassName={() => 'row-orphaned'} 
            scroll={scrollConfig} 
            sticky={stickyConfig}
            size="small" 
          />
        </div>
      )}

      {/* No Columns Message */}
      {displayColumns.length === 0 && !loading && ( 
        <Card>
            <p>No columns were found for the entity <strong>{entitySchema}.{entityType}</strong>. This could be due to permissions, the table/view being empty, or it not existing.</p>
        </Card>
      )}

      {/* Action Buttons */}
      {displayColumns.length > 0 && (
        <Space style={{ marginTop: '10px' }}>
          <Button type="primary" htmlType="submit">Save Configuration</Button>
          <Button 
            icon={<ApartmentOutlined />} 
            onClick={handleAutoSuggestViews}
            title="Auto-suggest view configurations based on metadata"
          >
            Auto Suggest Views
          </Button>
        </Space>
      )}
    </Form>
  );
};

export default Metadata;
