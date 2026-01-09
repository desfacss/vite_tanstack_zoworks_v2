import React, { useState, useEffect } from 'react';
import { Tabs, Button, message, Select, Input, Modal, Space, Tooltip, Checkbox, Tag } from 'antd';
import Form from '@rjsf/antd';
import { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { supabase } from '@/core/lib/supabase';
import TableViewConfig from './TableViewConfig';
import CrudTableConfig from './CrudTableConfig';
// import MasterObject from './MasterObject';
// import QueryBuilderComponent from './QueryBuilder';
import ConfigEditor from './Detailview';
import GridViewConfig from './GridViewConfig';
import DynamicViews from '@/core/components/DynamicViews';
import KanbanViewConfig from './KanbanViewConfig';
import OrganizationProfileSettings from './UserProfileSettingsEditor';
import DetailsOverviewConfig from './DetailsOverviewConfig';
import WorkflowConfigEditor from './WorkflowConfigEditor';
import { useAuthStore } from '@/core/lib/store';
import GlobalAccessConfig from './GlobalAccessConfig';
import ViewConfigEditor from './ViewConfigEditor';
import Metadata from './Metadata';
import MetadataV from './MetadataV';
import FormBuilder from './FormBuilder';
import StagesConfig from './StagesConfig';
import GanttViewConfig from './GanttViewConfig';
import CalendarViewConfig from './CalendarViewConfig';
import ViewSuggestionModal from './ViewSuggestionModal';
import DisplayIdConfig from './DisplayIdConfig';
import EntityRegistrationWizard from './EntityRegistrationWizard';
import { ThunderboltOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';

const { Option } = Select;

interface YViewConfig {
  id: string;
  entity_type: string;
  entity_schema?: string;
  // NEW: Logical-First entity fields
  base_source_name?: string | null;  // Physical table for variants (e.g., 'external.contacts')
  is_logical_variant?: boolean;      // true if this is a custom slice of another table
  rules?: {
    logic?: {
      partition_filter?: string;     // SQL WHERE clause fragment
    };
  };
  // Existing fields
  master_object?: any;
  master_data_schema?: RJSFSchema;
  ui_schema?: any;
  data_schema?: any;
  tableview?: any;
  gridview?: any;
  kanbanview?: any;
  detailview?: any;
  details_overview?: any;
  [key: string]: any;
}

interface WorkflowConfiguration {
  id: string;
  name: string;
  [key: string]: any;
}

const YViewConfigManager: React.FC = () => {
  const [configs, setConfigs] = useState<YViewConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<YViewConfig | null>(null);
  const [workflowConfigurations, setWorkflowConfigurations] = useState<WorkflowConfiguration[]>([]);
  const [selectedWorkflowConfiguration, setSelectedWorkflowConfiguration] = useState<WorkflowConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState<string>('viewConfig');
  // const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null); // New state for entity_schema
  const [schemaOptions, setSchemaOptions] = useState<string[]>([]); // New state for unique schemas
  // Entity Registration Wizard state (replaces old simple modal)
  const [wizardVisible, setWizardVisible] = useState<boolean>(false);
  
  // View generation state
  const [generateLoading, setGenerateLoading] = useState<boolean>(false);
  const [suggestedConfigs, setSuggestedConfigs] = useState<any>(null);
  const [suggestionModalVisible, setSuggestionModalVisible] = useState<boolean>(false);

  // Delete entity state
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteFromTables, setDeleteFromTables] = useState<{
    entities: boolean;
    view_configs: boolean;
    metrics: boolean;
  }>({ entities: true, view_configs: true, metrics: true });

  const { organization, setOrganization, user, setUser } = useAuthStore();

  // Open the Entity Registration Wizard
  const handleAddNew = () => {
    setWizardVisible(true);
  };

  // Delete entity handlers
  const handleDeleteEntity = () => {
    if (!selectedConfig?.id) {
      message.warning('Please select an entity first');
      return;
    }
    // Reset checkboxes to all selected before opening modal
    setDeleteFromTables({ entities: true, view_configs: true, metrics: true });
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedConfig?.id) return;
    
    const entityId = selectedConfig.id;
    const tablesToDelete = Object.entries(deleteFromTables)
      .filter(([_, selected]) => selected)
      .map(([table]) => table);
    
    if (tablesToDelete.length === 0) {
      message.warning('Please select at least one table to delete from');
      return;
    }
    
    setDeleteLoading(true);
    const errors: string[] = [];
    const successfulDeletes: string[] = [];
    
    try {
      // If entities is selected, just delete from entities 
      // The ON DELETE CASCADE will automatically handle view_configs and metrics
      if (deleteFromTables.entities) {
        const { error } = await supabase
          .schema('core')
          .from('entities')
          .delete()
          .eq('id', entityId);
        
        if (error) {
          errors.push(`entities: ${error.message}`);
        } else {
          // CASCADE will handle these automatically
          successfulDeletes.push('entities');
          if (deleteFromTables.view_configs) successfulDeletes.push('view_configs (cascade)');
          if (deleteFromTables.metrics) successfulDeletes.push('metrics (cascade)');
        }
      } else {
        // Only manually delete from child tables if entities is NOT being deleted
        if (deleteFromTables.view_configs) {
          const { error } = await supabase
            .schema('core')
            .from('view_configs')
            .delete()
            .eq('entity_id', entityId);
          if (error) {
            errors.push(`view_configs: ${error.message}`);
          } else {
            successfulDeletes.push('view_configs');
          }
        }
        
        if (deleteFromTables.metrics) {
          const { error } = await supabase
            .schema('core')
            .from('metrics')
            .delete()
            .eq('entity_id', entityId);
          if (error) {
            errors.push(`metrics: ${error.message}`);
          } else {
            successfulDeletes.push('metrics');
          }
        }
      }
      
      if (errors.length > 0) {
        message.error(`Deletion errors: ${errors.join(', ')}`);
      } else {
        message.success(`Successfully deleted from: ${successfulDeletes.join(', ')}`);
        // Reset selection
        setSelectedConfig(null);
        setSelectedRow(null);
        setSelectedWorkflowConfiguration(null);
      }
      
      setDeleteModalVisible(false);
      fetchConfigs(); // Refresh the list
    } catch (err) {
      console.error('Error deleting entity:', err);
      message.error('Failed to delete entity');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalVisible(false);
    setDeleteFromTables({ entities: true, view_configs: true, metrics: true });
  };

  // Generate view configurations using RPC
  const handleGenerateViews = async () => {
    if (!selectedConfig?.id) {
      message.warning('Please select an entity first');
      return;
    }
    
    setGenerateLoading(true);
    try {
      const { data, error } = await supabase.schema('core').rpc('view_suggest_configs', {
        p_entity_id: selectedConfig.id,
        p_dry_run: true
      });
      
      if (error) {
        console.error('Generate views error:', error);
        message.error(`Failed to generate views: ${error.message}`);
        return;
      }
      
      console.log('Generated configs:', data);
      setSuggestedConfigs(data);
      setSuggestionModalVisible(true);
    } catch (err: any) {
      console.error('Generate views exception:', err);
      message.error('Failed to generate view configurations');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Apply all generated configs (persist to database)
  const handleApplyAllSuggestions = async () => {
    if (!selectedConfig?.id) return;
    
    setGenerateLoading(true);
    try {
      const { data, error } = await supabase.schema('core').rpc('view_suggest_configs', {
        p_entity_id: selectedConfig.id,
        p_dry_run: false
      });
      
      if (error) {
        message.error(`Failed to apply views: ${error.message}`);
        return;
      }
      
      message.success('View configurations applied successfully!');
      setSuggestionModalVisible(false);
      setSuggestedConfigs(null);
      fetchConfigs(); // Refresh to show new configs
    } catch (err: any) {
      message.error('Failed to apply view configurations');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Apply selected views only
  const handleApplySelectedViews = async (selectedViews: string[]) => {
    if (!selectedConfig?.id || selectedViews.length === 0) {
      message.warning('Please select at least one view to apply');
      return;
    }
    
    try {
      // Build update object from selected views
      const updateData: Record<string, any> = {};
      selectedViews.forEach((viewName) => {
        if (suggestedConfigs?.[viewName]) {
          updateData[viewName] = suggestedConfigs[viewName];
        }
      });
      
      // Also update general if applying views
      if (suggestedConfigs?.general) {
        updateData.general = suggestedConfigs.general;
      }
      
      const { error } = await supabase
        .schema('core')
        .from('view_configs')
        .update(updateData)
        .eq('entity_id', selectedConfig.id);
      
      if (error) {
        message.error(`Failed to apply selected views: ${error.message}`);
        return;
      }
      
      message.success(`Applied ${selectedViews.length} view configuration(s)`);
      setSuggestionModalVisible(false);
      setSuggestedConfigs(null);
      fetchConfigs();
    } catch (err: any) {
      message.error('Failed to apply selected views');
    }
  };

  const fetchConfigs = async () => {
    try {
        const { data: entities, error: entitiesError } = await supabase.schema('core').from('entities').select('*');
        if (entitiesError) throw entitiesError;

        const { data: viewConfigs, error: viewConfigsError } = await supabase.schema('core').from('view_configs').select('*');
        if (viewConfigsError) throw viewConfigsError;

        const { data: metrics, error: metricsError } = await supabase.schema('core').from('metrics').select('*');
        if (metricsError) throw metricsError;

        // Create a map for quick lookups
        const viewConfigMap = new Map(viewConfigs.map(item => [item.entity_id, item]));
        const metricsMap = new Map(metrics.map(item => [item.entity_id, item]));

        // Consolidate the data into the old YViewConfig structure
        const consolidatedData = entities.map(entity => {
            const viewConfig = viewConfigMap.get(entity.id);
            const metricConfig = metricsMap.get(entity.id);

            // Manually recreate the old structure (include entities even without view_configs)
            return {
                id: entity.id, // Use the new entity ID
                entity_type: entity.entity_type,
                entity_schema: entity.entity_schema,
                // NEW: Logical-First entity fields
                base_source_name: entity.base_source_name || null,
                is_logical_variant: entity.is_logical_variant || false,
                rules: entity.rules || null,
                // Flag to indicate if this entity needs view_configs/metrics setup
                _needsSetup: !viewConfig,
                // Map fields from new tables to old YViewConfig structure (use defaults if missing)
                tableview: viewConfig?.tableview || {},
                gridview: viewConfig?.gridview || {},
                kanbanview: viewConfig?.kanbanview || {},
                detailview: viewConfig?.detailview || {},
                details_overview: viewConfig?.details_overview || {},
                // Add other views here
                metricsview: metricConfig?.metrics?.metrics_config || {},
                x_stages: metricConfig?.metrics?.stages_config || {},
                ...(viewConfig?.general || {}), // Unpack the 'general' JSONB column
                metadata: entity.metadata,
                v_metadata: entity.v_metadata,
                display_format: entity.display_format,
                max_counter: entity.max_counter,
                details: entity.semantics?.details,
                // ... other fields as needed
            };
        }); // No longer filtering out entities without view_configs
        console.log("cd", consolidatedData);
        setConfigs(consolidatedData);
        const uniqueSchemas = [...new Set(entities.map(item => item.entity_schema).filter(Boolean))].sort();
        setSchemaOptions(uniqueSchemas);

        if (selectedConfig) {
            setSelectedConfig(consolidatedData.find(item => item.id === selectedConfig.id) || null);
        }
    } catch (error) {
        message.error(`Failed to fetch configurations: ${error.message}`);
    }
};

  const fetchWorkflowConfigurations = async () => {
    const { data, error } = await supabase.from('workflow_configurations').select('*');
    if (error) {
      // message.error(error?.message || 'Failed to fetch Workflow Configurations');
    } else {
      console.log('WC', data);
      setWorkflowConfigurations(data);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchWorkflowConfigurations();
  }, []);

  // useEffect(() => {
  //   const fetchTables = async () => {
  //     const { data, error } = await supabase.rpc('get_public_tables');
  //     if (error) {
  //       message.error('Failed to fetch table names');
  //     } else {
  //       setDropdownOptions(data);
  //     }
  //   };
  //   fetchTables();
  // }, []);

  // useEffect(() => {
  //   const fetchColumns = async (tableName: string) => {
  //     try {
  //       if (!tableName) {
  //         console.warn('No table name provided.');
  //         return;
  //       }
  //       console.log('Fetching columns for table:', tableName);
  //       const { data, error } = await supabase.rpc('get_table_columns', { tablename: tableName });
  //       if (error) {
  //         console.error('Error Fetching Columns:', error);
  //         message.error(`Failed to fetch columns for ${tableName}`);
  //         throw error;
  //       }
  //       console.log('Fetched Columns:', data);
  //       setAvailableColumns(data || []);
  //     } catch (err) {
  //       console.error('Error Fetching Columns:', err);
  //       message.error('Failed to fetch table columns');
  //     }
  //   };
  //   fetchColumns(selectedConfig.entity_type);
  // } else {
  //     console.warn('No Entity Type found in selectedConfig');
  //   }
  // }, [selectedConfig]);

  useEffect(() => {
    handleFetchTable();
  }, [selectedRow]);

  useEffect(() => {
    console.log('Selected config t:', selectedConfig?.metadata);
  }, [selectedConfig]);

  const handleSave = async (viewName: string, formData: any) => {
    try {
        if (!selectedConfig?.id) {
            message.error('No configuration selected for saving.');
            return;
        }

        const entityId = selectedConfig.id;
        let updatePromise;

        // Handle updates for different views
        switch (viewName) {
            case 'metadata':
            case 'metadatav':
                updatePromise = supabase.schema('core').from('entities')
                    .update({ [viewName]: formData })
                    .eq('id', entityId);
                break;
            case 'stages':
                // stages is now part of the metrics JSONB column
                updatePromise = supabase.schema('core').from('metrics')
                    .update({ metrics: { stages_config: formData } })
                    .eq('entity_id', entityId);
                break;
            case 'viewConfig':
            case 'global_access':
                // 'viewConfig' and 'global_access' update the 'general' JSONB column
                const existingGeneral = selectedConfig.general || {};
                const updatedGeneral = {
                    ...existingGeneral,
                    ...formData,
                };
                updatePromise = supabase.schema('core').from('view_configs')
                    .update({ general: updatedGeneral })
                    .eq('entity_id', entityId);
                break;
            default:
                // All other views (tableview, gridview, etc.) update the respective JSONB column
                updatePromise = supabase.schema('core').from('view_configs')
                    .update({ [viewName]: formData })
                    .eq('entity_id', entityId);
                break;
        }

        const { error } = await updatePromise;
        if (error) throw error;

        message.success('Configuration updated successfully');
        fetchConfigs();
    } catch (error) {
        console.error('Error saving configuration:', error);
        message.error('Failed to save configuration');
    }
};

  const handleEdit = (config: YViewConfig) => {
    setSelectedConfig(config);
    setActiveTab('tableview');
  };

  const renderTabContent = (viewName: string) => {
  console.log("cz", selectedConfig);
  const schema: RJSFSchema = selectedConfig?.master_data_schema || {};
  const uiSchema = selectedConfig?.ui_schema || {};
  const formData = selectedConfig?.[viewName] || {};
  const configDataSchemaProperties = selectedConfig?.data_schema?.properties;
  const data = configDataSchemaProperties
    ? Object.entries(configDataSchemaProperties).map(([fieldName]) => ({
        columnname: fieldName,
      }))
    : [];

  if (viewName === 'tableview') {
    return (
      <TableViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.metadata}
        entitySchema={selectedSchema} // Pass entity_schema
      />
    );
  }
  if (viewName === 'viewConfig') {
    return (
      <ViewConfigEditor
        entityType={selectedConfig?.entity_type}
        metadata={selectedConfig?.metadata}
        entitySchema={selectedSchema} // Pass entity_schema
      />
    );
  }
  if (viewName === 'gridview') {
    return (
      <GridViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.metadata}
        entitySchema={selectedSchema} // Pass entity_schema
      />
    );
  }
  if (viewName === 'kanbanview') {
    return (
      <KanbanViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.metadata}
        entitySchema={selectedSchema} // Pass entity_schema
      />
    );
  }
  if (viewName === 'ganttview') {
    return (
      <GanttViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.metadata}
        entitySchema={selectedSchema} // Pass entity_schema
      />
    );
  }
  if (viewName === 'calendarview') {
    return (
      <CalendarViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.metadata}
        entitySchema={selectedSchema} // Pass entity_schema
      />
    );
  }
  if (viewName === 'detailview') {
    return (
      <ConfigEditor
        detailView={selectedConfig?.detailview}
        entityType={selectedConfig?.entity_type}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        entitySchema={selectedSchema} // Pass entity_schema
      />
    );
  }
  if (viewName === 'details_overview') {
    return (
      <DetailsOverviewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.metadata}
        entitySchema={selectedSchema} // Pass entity_schema
      />
    );
  }
  if (viewName === 'global_access') {
    return (
      <GlobalAccessConfig
        configData={{
          global: selectedConfig?.global || {
            search: { fields: [], placeholder: '' },
            showFeatures: [],
            filters: [],
          },
          access_config: selectedConfig?.access_config || {
            canEdit: [],
            canDelete: [],
          },
        }}
        onSave={(updatedData) => handleSave('global_access', updatedData)}
        entityType={selectedConfig?.entity_type}
        entitySchema={selectedSchema} // Pass entity_schema
      />
    );
  }

  return (
    <Form
      schema={schema}
      uiSchema={uiSchema}
      formData={formData}
      validator={validator}
      onSubmit={({ formData }) => handleSave(viewName, formData)}
    >
      <Button type="primary" htmlType="submit">
        Save
      </Button>
    </Form>
  );
};

  const handleFetchTable = async () => {
    try {
      const { data, error } = await supabase
        .schema('core').from('view_configs')
        .select('*')
        .eq('entity_type', selectedRow);
      if (error) {
        message.error(error?.message || 'Failed to fetch configurations');
      } else {
        if (data.length > 0) {
          setSelectedConfig(data[0]);
          setSelectedWorkflowConfiguration(
            workflowConfigurations.find(config => config.name === data[0].entity_type) || null
          );
        } else {
          // setSelectedConfig({ entity_type: selectedRow });
          setSelectedConfig(configs?.find((config) => config?.id === selectedRow) || null);
          setSelectedWorkflowConfiguration(null);
        }
      }
    } catch (err) {
      console.error('Error Fetching Config:', err);
      message.error('An error occurred while fetching the configuration');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* <h1>View Config Manager</h1> */}
      <div style={{ marginBottom: '20px' }}>
        {/* <Input
          placeholder="Enter table name"
          style={{ width: '60%', marginRight: '10px' }}
          value={selectedRow || ''}
          onChange={(e) => setSelectedRow(e.target.value)}
        /> */}
        {/* <Button type="primary" onClick={handleFetchTable}>
          Fetch
        </Button> */}
        <Space>
          <Button type="primary" onClick={handleAddNew}>
            Add New
          </Button>
          {selectedConfig && (
            <>
              <Tooltip title="Generate view configurations from metadata">
                <Button
                  type="primary"
                  ghost
                  icon={<ThunderboltOutlined />}
                  onClick={handleGenerateViews}
                  loading={generateLoading}
                >
                  Generate Views
                </Button>
              </Tooltip>
              {selectedConfig?.tableview?.fields?.length > 0 && (
                <Tooltip title="Regenerate and overwrite existing configurations">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleGenerateViews}
                    loading={generateLoading}
                  >
                    Regenerate
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="Delete entity and its configurations">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteEntity}
                >
                  Delete
                </Button>
              </Tooltip>
            </>
          )}
        </Space>
        <Select
          placeholder="Select Schema"
          showSearch
          optionFilterProp="children"
          style={{ width: '200px', marginLeft: '10px' }}
          onChange={(value: string) => {
            setSelectedSchema(value);
            setSelectedRow(null); // Reset entity_type selection when schema changes
            setSelectedConfig(null);
            setSelectedWorkflowConfiguration(null);
          }}
          value={selectedSchema}
        >
          {schemaOptions.map((schema) => (
            <Option key={schema} value={schema}>
              {schema}
            </Option>
          ))}
        </Select>
        <Select
          placeholder="Select Entity"
          showSearch
          optionFilterProp="children"
          style={{ width: '250px', marginLeft: '10px' }}
          onChange={async (value: string) => {
            console.log('Dropdown value selected:', value);
            const selectedConfig = configs?.find((config) => config?.id === value);
            const selectedWorkflowConfiguration = workflowConfigurations?.find(
              (config) => config?.name === selectedConfig?.entity_type
            );
            console.log('Selected Config Object:', selectedConfig, selectedWorkflowConfiguration);
            
            // Auto-create missing view_configs and metrics rows if entity needs setup
            if (selectedConfig?._needsSetup) {
              try {
                const entityId = selectedConfig.id;
                const entityType = `${selectedConfig.entity_schema}.${selectedConfig.entity_type}`;
                
                // Create view_configs row
                const { error: viewConfigError } = await supabase
                  .schema('core')
                  .from('view_configs')
                  .upsert([{
                    entity_id: entityId,
                    entity_type: entityType,
                    general: {},
                    tableview: {},
                    gridview: {},
                    kanbanview: {},
                    detailview: {},
                    details_overview: {},
                  }], { onConflict: 'entity_id' });
                
                if (viewConfigError) {
                  console.error('Error creating view_configs:', viewConfigError);
                }
                
                // Create metrics row
                const { error: metricsError } = await supabase
                  .schema('core')
                  .from('metrics')
                  .upsert([{
                    entity_id: entityId,
                    entity_type: entityType,
                    metrics: {},
                  }], { onConflict: 'entity_id' });
                
                if (metricsError) {
                  console.error('Error creating metrics:', metricsError);
                }
                
                if (!viewConfigError && !metricsError) {
                  message.success('Entity configuration initialized');
                  fetchConfigs(); // Refresh to get the new data
                }
              } catch (err) {
                console.error('Error auto-creating config rows:', err);
              }
            }
            
            setSelectedRow(value);
            setSelectedConfig(selectedConfig || null);
            setSelectedWorkflowConfiguration(selectedWorkflowConfiguration || null);
          }}
          value={selectedRow}
          optionLabelProp="label"
        >
          {configs
            .filter((config) => config.entity_schema === selectedSchema) // Filter by schema
            .map((config) => (
              <Option 
                key={config.id} 
                value={config.id}
                label={config.entity_type}
              >
                <Space>
                  <span>{config.entity_type}</span>
                  {config.is_logical_variant ? (
                    <Tag color="purple" style={{ marginLeft: 4, fontSize: 10 }}>Variant</Tag>
                  ) : (
                    <Tag color="green" style={{ marginLeft: 4, fontSize: 10 }}>Physical</Tag>
                  )}
                  {config.base_source_name && (
                    <span style={{ color: '#888', fontSize: 11 }}>
                      (from {config.base_source_name.split('.').pop()})
                    </span>
                  )}
                </Space>
              </Option>
            ))}
        </Select>
      </div>

      {selectedConfig ? (
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'viewConfig',
              label: 'View Config',
              children: renderTabContent('viewConfig'),
            },
            {
              key: 'metadata',
              label: 'Metadata',
              children: (
                <Metadata
                  entityType={selectedConfig?.entity_type}
                  entitySchema={selectedSchema}
                  entityMetadata={selectedConfig?.metadata || []}
                  fetchConfigs={fetchConfigs}
                  // NEW: Logical variant awareness
                  isLogicalVariant={selectedConfig?.is_logical_variant || false}
                  baseSourceName={selectedConfig?.base_source_name || undefined}
                  partitionFilter={selectedConfig?.rules?.logic?.partition_filter}
                />
              ),
            },
            {
              key: 'tableview',
              label: 'Table View',
              children: renderTabContent('tableview'),
            },
            {
              key: 'gridview',
              label: 'Grid View',
              children: renderTabContent('gridview'),
            },
            {
              key: 'view',
              label: 'View',
              children: (
                <DynamicViews
                  entityType={selectedConfig?.entity_type || ''}
                  entitySchema={selectedSchema || undefined}
                />
              ),
            },
            {
              key: 'detailview',
              label: 'Detail View',
              children: renderTabContent('detailview'),
            },
            {
              key: 'details_overview',
              label: 'Details Overview',
              children: renderTabContent('details_overview'),
            },
            {
              key: 'form_builder',
              label: 'Form Builder',
              children: (
                <FormBuilder
                  masterObjectInit={selectedConfig?.metadata}
                  entitySchema={selectedConfig?.entity_schema && selectedConfig?.entity_type 
                    ? `${selectedConfig.entity_schema}.${selectedConfig.entity_type}` 
                    : undefined}
                />
              ),
            },
            {
              key: 'kanbanview',
              label: 'Kanban View',
              children: renderTabContent('kanbanview'),
            },
            {
              key: 'ganttview',
              label: 'Gantt View',
              children: renderTabContent('ganttview'),
            },
            {
              key: 'calendarview',
              label: 'Calendar View',
              children: renderTabContent('calendarview'),
            },
            {
              key: 'organizationProfile',
              label: 'Profile Config',
              children: <OrganizationProfileSettings />,
            },
            {
              key: 'stages',
              label: 'Stages',
              children: (
                <StagesConfig
                  configData={selectedConfig?.x_stages}
                  onSave={(updatedData) => handleSave('stages', updatedData)}
                />
              ),
            },
            {
              key: 'workflowConfig',
              label: 'Workflow Config',
              children: (
                <WorkflowConfigEditor
                  workflowConfiguration={selectedWorkflowConfiguration}
                  entityType={selectedConfig?.entity_type}
                />
              ),
            },
            {
              key: 'global_access',
              label: 'Global Access',
              children: renderTabContent('global_access'),
            },
            {
              key: 'id_config',
              label: 'ID Config',
              children: (
                <DisplayIdConfig
                  entityType={selectedConfig?.entity_type || ''}
                  entitySchema={selectedSchema || ''}
                />
              ),
            },
          ]}
        />
      ) : (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '300px',
          color: '#888',
          fontSize: '16px'
        }}>
          Please select a schema and entity to configure
        </div>
      )}
      {/* Entity Registration Wizard */}
      <EntityRegistrationWizard
        visible={wizardVisible}
        onClose={() => setWizardVisible(false)}
        onSuccess={() => {
          setWizardVisible(false);
          fetchConfigs();
        }}
        existingSchemas={schemaOptions}
      />

      {/* Suggestion Modal */}
      <ViewSuggestionModal
         visible={suggestionModalVisible}
         onClose={() => setSuggestionModalVisible(false)}
         suggestedConfigs={suggestedConfigs}
         onApplyAll={handleApplyAllSuggestions}
         onApplySelected={handleApplySelectedViews}
      />
      
      {/* Delete Confirmation Modal */}
      <Modal
         title="Delete Entity Configuration"
         open={deleteModalVisible}
         onOk={handleDeleteConfirm}
         onCancel={handleDeleteCancel}
         okText="Yes, Delete"
         okType="danger"
         cancelText="Cancel"
         confirmLoading={deleteLoading}
      >
         <div style={{ marginBottom: 16 }}>
           <p>Are you sure you want to delete <strong>{selectedConfig?.entity_schema}.{selectedConfig?.entity_type}</strong>?</p>
           <p>This action cannot be undone. Please select which tables to delete from:</p>
         </div>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
           <Checkbox 
             checked={deleteFromTables.view_configs} 
             onChange={e => setDeleteFromTables({...deleteFromTables, view_configs: e.target.checked})}
           >
             Delete from <strong>view_configs</strong> (View layouts)
           </Checkbox>
           
           <Checkbox 
             checked={deleteFromTables.metrics} 
             onChange={e => setDeleteFromTables({...deleteFromTables, metrics: e.target.checked})}
           >
             Delete from <strong>metrics</strong> (Stages, metrics config)
           </Checkbox>
           
           <Checkbox 
             checked={deleteFromTables.entities} 
             onChange={e => setDeleteFromTables({...deleteFromTables, entities: e.target.checked})}
           >
             Delete from <strong>entities</strong> (Metadata, registry)
             <div style={{ marginLeft: 24, fontSize: 12, color: '#ff4d4f' }}>
               Warning: This requires other tables to be deleted first.
             </div>
           </Checkbox>
         </div>
      </Modal>
    </div>
  );
};

export default YViewConfigManager;
