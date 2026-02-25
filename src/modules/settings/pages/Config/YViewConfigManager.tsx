import React, { useState, useEffect } from 'react';
import { Tabs, Button, message, Modal, Space, Tooltip, Checkbox, Tag, Layout, Menu } from 'antd';
import Form from '@rjsf/antd';
import { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { supabase } from '@/core/lib/supabase';
import TableViewConfig from './TableViewConfig';
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
import FormBuilder from './FormBuilder';
import StagesConfig from './StagesConfig';
import GanttViewConfig from './GanttViewConfig';
import CalendarViewConfig from './CalendarViewConfig';
import MapViewConfig from './MapViewConfig';
import ViewSuggestionModal from './ViewSuggestionModal';
import DisplayIdConfig from './DisplayIdConfig';
import EntityRegistrationWizard from './EntityRegistrationWizard';
import BlueprintConfig from './BlueprintConfig';
import { ThunderboltOutlined, ReloadOutlined, DeleteOutlined, DatabaseOutlined, TableOutlined, PlusOutlined, ExperimentOutlined } from '@ant-design/icons';

const { Sider, Content } = Layout;

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
  details_overview?: any;
  detailview?: any;
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

  const { organization } = useAuthStore();

  // Open the Entity Registration Wizard
  const handleAddNew = () => {
    setWizardVisible(true);
  };

  const fetchConfigs = async () => {
    try {
      // 1. Fetch configs from crm.entities
      const { data: entityData, error: entityError } = await supabase
        .schema('core')
        .from('entities')
        .select('*')
        .order('entity_schema', { ascending: true })
        .order('entity_type', { ascending: true });

      if (entityError) throw entityError;

      // 2. Fetch view_configs
      const { data: viewData, error: viewError } = await supabase
        .schema('core')
        .from('view_configs')
        .select('*');

      if (viewError) throw viewError;

      // 3. Merge
      const mergedConfigs = entityData.map(entity => {
        const viewConfig = viewData.find(v => v.entity_id === entity.id) || {};
        return {
          ...entity,
          ...viewConfig,
          id: entity.id, // Ensure we use entities.id
          _needsSetup: !viewConfig.entity_id // Flag for auto-setup logic
        };
      });

      setConfigs(mergedConfigs);
      
      // Update schema options
      const schemas = Array.from(new Set(entityData.map(e => e.entity_schema))).filter(Boolean) as string[];
      setSchemaOptions(schemas);

      // Restore selection if exists
      if (selectedRow) {
        const updated = mergedConfigs.find(c => c.id === selectedRow);
        if (updated) setSelectedConfig(updated);
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      message.error('Failed to fetch configurations');
    }
  };

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .schema('crm')
        .from('workflows')
        .select('*');
      if (error) throw error;
      setWorkflowConfigurations(data || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchWorkflows();
  }, []);

  const handleGenerateViews = async () => {
    if (!selectedConfig) return;
    setGenerateLoading(true);
    try {
      const { data, error } = await supabase.rpc('suggest_view_configs', {
        p_entity_id: selectedConfig.id
      });
      
      if (error) throw error;
      
      setSuggestedConfigs(data);
      setSuggestionModalVisible(true);
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      message.error(error.message || 'Failed to generate suggestions');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleApplyAllSuggestions = async () => {
    if (!selectedConfig || !suggestedConfigs) return;
    try {
      const { error } = await supabase.schema('core').from('view_configs').update({
        tableview: suggestedConfigs.tableview,
        gridview: suggestedConfigs.gridview,
        kanbanview: suggestedConfigs.kanbanview,
        details_overview: suggestedConfigs.details_overview,
        detailview: suggestedConfigs.detailview,
      }).eq('entity_id', selectedConfig.id);

      if (error) throw error;
      message.success('All suggested views applied!');
      setSuggestionModalVisible(false);
      fetchConfigs();
    } catch (error) {
      console.error('Error applying suggestions:', error);
    }
  };

  const handleApplySelectedViews = async (selectedViews: string[]) => {
    if (!selectedConfig || !suggestedConfigs) return;
    const updatePayload: any = {};
    selectedViews.forEach(v => {
      updatePayload[v] = suggestedConfigs[v];
    });

    try {
      const { error } = await supabase.schema('core').from('view_configs').update(updatePayload).eq('entity_id', selectedConfig.id);
      if (error) throw error;
      message.success(`Applied ${selectedViews.length} views`);
      setSuggestionModalVisible(false);
      fetchConfigs();
    } catch (error) {
      console.error('Error applying selected views:', error);
    }
  };

  const handleDeleteEntity = () => {
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedConfig) return;
    setDeleteLoading(true);
    try {
      const entityId = selectedConfig.id;

      // 1. Delete from view_configs if checked
      if (deleteFromTables.view_configs) {
        const { error } = await supabase.schema('core').from('view_configs').delete().eq('entity_id', entityId);
        if (error) throw error;
      }

      // 2. Delete from metrics if checked
      if (deleteFromTables.metrics) {
        const { error } = await supabase.schema('core').from('metrics').delete().eq('entity_id', entityId);
        if (error) throw error;
      }

      // 3. Delete from entities if checked
      if (deleteFromTables.entities) {
        const { error } = await supabase.schema('core').from('entities').delete().eq('id', entityId);
        if (error) throw error;
      }

      message.success('Entity deleted successfully');
      setDeleteModalVisible(false);
      setSelectedRow(null);
      setSelectedConfig(null);
      fetchConfigs();
    } catch (error: any) {
      console.error('Error deleting entity:', error);
      message.error(error.message || 'Failed to delete entity');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalVisible(false);
  };

  const handleSave = async (viewName: string, formData: any) => {
    if (!selectedConfig) return;
    const entityId = selectedConfig.id;

    try {
        let updatePromise;
        switch (viewName) {
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

  const renderTabContent = (viewName: string) => {
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
        metadata={selectedConfig?.v_metadata}
        entitySchema={selectedSchema || undefined} // Pass entity_schema
        availableColumns={data}
      />
    );
  }
  if (viewName === 'viewConfig') {
    return (
      <ViewConfigEditor
        entityType={selectedConfig?.entity_type}
        metadata={selectedConfig?.v_metadata}
        entitySchema={selectedSchema || undefined} // Pass entity_schema
      />
    );
  }
  if (viewName === 'gridview') {
    return (
      <GridViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.v_metadata}
        availableColumns={data}
      />
    );
  }
  if (viewName === 'kanbanview') {
    return (
      <KanbanViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.v_metadata}
        availableColumns={data}
      />
    );
  }
  if (viewName === 'ganttview') {
    return (
      <GanttViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.v_metadata}
        availableColumns={data}
      />
    );
  }
  if (viewName === 'calendarview') {
    return (
      <CalendarViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.v_metadata}
        availableColumns={data}
      />
    );
  }
  if (viewName === 'mapview') {
    return (
      <MapViewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.v_metadata}
        entityType={selectedConfig?.entity_type}
      />
    );
  }
  if (viewName === 'details_overview') {
    return (
      <ConfigEditor
        detailView={selectedConfig?.details_overview}
        entityType={selectedConfig?.entity_type || ''}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        entitySchema={selectedSchema || undefined} // Pass entity_schema
      />
    );
  }
  if (viewName === 'detailview') {
    return (
      <DetailsOverviewConfig
        configData={formData}
        onSave={(updatedData) => handleSave(viewName, updatedData)}
        metadata={selectedConfig?.v_metadata}
        availableColumns={data}
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
        availableColumns={data.map(d => d.columnname)}
      />
    );
  }
  if (viewName === 'blueprint') {
    return (
      <BlueprintConfig
        entityType={selectedConfig?.entity_type || ''}
        entitySchema={selectedSchema || ''}
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

  // Construct Menu items from schemas and configs
  const menuItems = schemaOptions?.map(schema => ({
    key: `schema:${schema}`,
    label: schema,
    icon: <DatabaseOutlined />,
    children: configs
      .filter(config => config.entity_schema === schema)
      .map(config => ({
        key: config.id,
        label: (
          <Space>
            {config.entity_type}
            {config.is_logical_variant ? (
              <Tag color="purple" style={{ fontSize: 10 }}>V</Tag>
            ) : (
              <Tag color="green" style={{ fontSize: 10 }}>P</Tag>
            )}
          </Space>
        ),
        icon: <TableOutlined />,
      }))
  }));

  const handleMenuSelect = ({ key }: { key: string }) => {
    if (key.startsWith('schema:')) return; // Ignore schema parent clicks

    const value = key;
    console.log('Menu item selected:', value);
    const selectedConfig = configs?.find((config) => config?.id === value);
    const selectedWorkflowConfiguration = workflowConfigurations?.find(
      (config) => config?.name === selectedConfig?.entity_type
    );
    
    // Auto-setup logic (same as dropdown)
    if (selectedConfig?._needsSetup) {
      handleAutoSetup(selectedConfig);
    }
    
    setSelectedRow(value);
    setSelectedSchema(selectedConfig?.entity_schema || null); // Update selectedSchema
    setSelectedConfig(selectedConfig || null);
    setSelectedWorkflowConfiguration(selectedWorkflowConfiguration || null);
  };

  const handleAutoSetup = async (config: YViewConfig) => {
    try {
      const entityId = config.id;
      const entityType = `${config.entity_schema}.${config.entity_type}`;
      
      await supabase.schema('core').from('view_configs').upsert([{
        entity_id: entityId,
        entity_type: entityType,
        general: {},
        tableview: {},
        gridview: {},
        kanbanview: {},
        details_overview: {},
        detailview: {},
      }], { onConflict: 'entity_id' });
      
      await supabase.schema('core').from('metrics').upsert([{
        entity_id: entityId,
        entity_type: entityType,
        metrics: {},
      }], { onConflict: 'entity_id' });
      
      message.success('Entity configuration initialized');
      fetchConfigs();
    } catch (err) {
      console.error('Error auto-creating config rows:', err);
    }
  };

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)', background: 'transparent' }}>
      <Sider 
        width={300} 
        theme="light" 
        style={{ 
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
          height: 'calc(100vh - 100px)',
          position: 'sticky',
          top: 0
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddNew}
            block
          >
            Register Entity
          </Button>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedRow ? [selectedRow] : []}
          style={{ borderRight: 0 }}
          items={menuItems}
          onSelect={handleMenuSelect}
          defaultOpenKeys={schemaOptions.map(s => `schema:${s}`)}
        />
      </Sider>
      
      <Content style={{ padding: '0 24px 24px' }}>
        <div style={{ padding: '20px 0', borderBottom: '1px solid #f0f0f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space align="center">
            <h2 style={{ margin: 0 }}>
              {selectedConfig ? (
                <>
                  {selectedConfig.entity_schema}.{selectedConfig.entity_type}
                  {selectedConfig.is_logical_variant && <Tag color="purple" style={{ marginLeft: 8 }}>Variant</Tag>}
                </>
              ) : 'Select a configuration'}
            </h2>
          </Space>

          {selectedConfig && (
            <Space>
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
            </Space>
          )}
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
              key: 'blueprint',
              label: (
                <span>
                  <ExperimentOutlined />
                  Blueprint
                </span>
              ),
              children: renderTabContent('blueprint'),
            },
            {
              key: 'metadata',
              label: 'Metadata',
              children: (
                <Metadata
                  entityType={selectedConfig?.entity_type}
                  entitySchema={selectedSchema || undefined}
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
              key: 'details_overview',
              label: 'Details Overview',
              children: renderTabContent('details_overview'),
            },
            {
              key: 'detailview',
              label: 'Detail View',
              children: renderTabContent('detailview'),
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
              key: 'mapview',
              label: 'Map View',
              children: renderTabContent('mapview'),
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
                  entityType={selectedConfig?.entity_type || ''}
                  organizationId={organization?.id || ''}
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
                  organizationId={organization?.id || ''}
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
      </Content>
    </Layout>
  );
};

export default YViewConfigManager;
