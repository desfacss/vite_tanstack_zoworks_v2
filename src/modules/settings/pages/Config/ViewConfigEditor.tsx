import { useState, useEffect } from 'react';
import { supabase } from '@/core/lib/supabase';
import { Form, Input, Select, Button, Checkbox, Space, message } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const ViewConfigEditor = ({ entityType, metadata, entitySchema }: any) => {
  console.log("yq",entityType, metadata, entitySchema);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [entityId, setEntityId] = useState(null);
  const [viewConfigId, setViewConfigId] = useState(null);

  const featureOptions = [
    { label: 'Print', value: 'print' },
    { label: 'Import', value: 'import' },
    { label: 'Export', value: 'export' },
    { label: 'Kanban', value: 'kanban' },
    { label: 'Sorting', value: 'sorting' },
    { label: 'Calendar', value: 'calendar' },
    { label: 'Filtering', value: 'filtering' },
    { label: 'Export PDF', value: 'export_pdf' },
    { label: 'Pagination', value: 'pagination' },
    { label: 'Bulk Actions', value: 'bulk_actions' },
  ];

  const filterableFields = [
    { value: 'search', label: 'Global Search' },
    ...(metadata?.map((field: any) => ({
      value: field.key,
      label: field.display_name,
    })) || [])
  ];

  useEffect(() => {
    const fetchData = async () => {
        try {
            setLoading(true);
            const schema = entitySchema || 'public';
            // Construct p_entities parameter
            const p_entity = `${schema}.${entityType}`; 

            // --- RPC Call to get capabilities (filters) ---
            const { data: capabilitiesData, error: capabilitiesError } = await supabase
                .schema('core').rpc('met_entity_get_capabilities', { p_entity });
                

            if (capabilitiesError) {
                console.error('Error fetching entity capabilities:', capabilitiesError);
                message.error('Error fetching entity capabilities.');
            } else {
                // LOG THE RPC RESPONSE AS REQUESTED
                console.log('met_entity_get_capabilities response:', capabilitiesData);
            }

            // Step 1: Find the entity_id from core.entities
            const { data: entityData, error: entityError } = await supabase
                .schema('core')
                .from('entities')
                .select('id')
                .eq('entity_type', entityType?.split('.')?.pop())
                .eq('entity_schema', schema)
                .maybeSingle();

            if (entityError) throw entityError;

            if (!entityData) {
                message.warning('No entity found. Cannot load view configuration.');
                setEntityId(null);
                setViewConfigId(null);
                form.resetFields();
                return;
            }

            setEntityId(entityData.id);

            // Step 2: Fetch the view_config using the found entity_id
            const { data: fetchedConfig, error: configError } = await supabase
                .schema('core')
                .from('view_configs')
                .select('*')
                .eq('entity_id', entityData.id)
                .maybeSingle();

            if (configError) throw configError;

            if (fetchedConfig) {
                setViewConfigId(fetchedConfig.id);
                
                // Destructure 'general' and 'details' objects from fetchedConfig
                const { general, details } = fetchedConfig;

                // Safely access properties, defaulting to empty values if they don't exist
                const availableViews = general?.available_views || [];
                const defaultView = general?.default_view || '';
                const filters = general?.filters || [];
                const globalActions = Array.isArray(general?.global_actions)
                    ? general.global_actions
                    : [];
                const featuresObject = general?.features || {};
                const featuresArray = Object.keys(featuresObject).filter(key => featuresObject[key]);

                const detailsName = details?.name || '';
                const detailsDescription = details?.description || '';
                const includeRelatedTable = !!details?.related_table;
                const relatedTable = {
                    key: details?.related_table?.key || '',
                    name: details?.related_table?.name || '',
                    unique_keys: details?.related_table?.unique_keys || [],
                };

                form.setFieldsValue({
                    available_views: availableViews,
                    default_view: defaultView,
                    filters: filters,
                    global_actions: globalActions,
                    features: featuresArray,
                    details: {
                        name: detailsName,
                        description: detailsDescription,
                        includeRelatedTable: includeRelatedTable,
                        related_table: relatedTable,
                    },
                });
            } else {
                message.warning('No configuration found for this entity. Initializing new configuration.');
                setViewConfigId(null);
                form.resetFields();
            }
        } catch (error) {
            message.error('Error fetching data');
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (entityType) {
        fetchData();
    }
}, [entityType, entitySchema, form]);

  const handleFilterNameChange = (value: any, index: any) => {
    const selectedField = metadata.find((field: any) => field.key === value);
    if (selectedField) {
      const currentFilters = form.getFieldValue('filters');
      const updatedFilter = {
        ...currentFilters[index],
        label: value === 'search' ? 'Search' : selectedField.display_name,
        placeholder: value === 'search' ? 'Search...' : selectedField.display_name,
        type: value === 'search' ? 'text' : (selectedField.foreign_key ? 'select' : 'text'),
      };
      form.setFieldsValue({
        filters: {
          [index]: updatedFilter,
        },
      });
    }
  };

  const onFinish = async (values: any) => {
    if (!entityId) {
      message.error('Cannot save. Entity ID not found.');
      return;
    }

    try {
      setLoading(true);

      const featuresObject: any = featureOptions.reduce((acc: any, option) => {
        acc[option.value] = values.features?.includes(option.value);
        return acc;
      }, {});

      const updatedFilters = values.filters?.map((filter: any) => {
        const metaField = metadata.find((field: any) => field.key === filter.name);
        const updatedFilter = {
          ...filter,
          isServerSide: !!filter.isServerSide,
          join_table: filter.join_table || undefined,
          search_columns: filter.search_columns || undefined,
        };

        if (filter.type === 'select' && metaField?.foreign_key) {
          updatedFilter.options = metaField.foreign_key;
        }
        return updatedFilter;
      }) || [];

      const details = {
        name: values.details?.name,
        description: values.details?.description,
        related_table: values.details?.includeRelatedTable
          ? values.details.related_table
          : null,
      };

      const upsertPayload = {
        entity_id: entityId,
        general:{
          available_views: values.available_views,
          default_view: values.default_view,
          filters: updatedFilters,
          global_actions: values.global_actions,
          features: featuresObject,
          details
        }
      };

      let query: any = supabase.schema('core').from('view_configs');

      if (viewConfigId) {
        // Update existing record
        query = query.update(upsertPayload).eq('id', viewConfigId);
      } else {
        // Insert new record
        query = query.insert(upsertPayload);
      }

      const { data: savedRecord, error } = await query.select('*');

      if (error) throw error;
      
      // Perform synchronization write to core.entity_blueprints
      if (entityType) {
        const { error: blueprintError } = await supabase
          .schema('core')
          .from('entity_blueprints')
          .update({ ui_general: upsertPayload.general })
          .eq('base_source', entityType);
        
        if (blueprintError) {
          console.error('Error syncing ViewConfig to entity_blueprints:', blueprintError);
          message.warning('View Config saved, but failed to sync to blueprints');
        }
      }

      message.success('Configuration saved successfully!');
      if (savedRecord && savedRecord.length > 0) {
        setViewConfigId(savedRecord[0].id);
      }
    } catch (error) {
      message.error('Error saving data');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const views=[
              { label: 'Table View', value: 'tableview' },
              { label: 'Grid View', value: 'gridview' },
              { label: 'Kanban View', value: 'kanbanview' },
              { label: 'Calendar View', value: 'calendarview' },
              { label: 'Gantt View', value: 'ganttview' },
              { label: 'Map View', value: 'mapview' },
              { label: 'Dashboard View', value: 'dashboardview' },
            ]

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Edit View Configuration for {entityType}</h2>
      <Form form={form} onFinish={onFinish} layout="vertical">
        {/* Details Section */}
        <Form.Item label="Details">
          <Form.Item
            name={['details', 'name']}
            label="Name"
            style={{ display: 'inline-block', width: 'calc(50% - 8px)', marginRight: '16px' }}
          >
            <Input placeholder="Enter name" />
          </Form.Item>
          <Form.Item
            name={['details', 'description']}
            label="Description"
            style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
          >
            <Input.TextArea placeholder="Enter description" rows={3} />
          </Form.Item>
          <Form.Item
            name={['details', 'includeRelatedTable']}
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Checkbox>Include Related Table</Checkbox>
          </Form.Item>
          <Form.Item
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.details?.includeRelatedTable !== currentValues.details?.includeRelatedTable
            }
          >
            {({ getFieldValue }) =>
              getFieldValue(['details', 'includeRelatedTable']) ? (
                <div style={{ border: '1px solid #d9d9d9', padding: '16px', borderRadius: '4px' }}>
                  <h4>Related Table</h4>
                  <Form.Item
                    name={['details', 'related_table', 'key']}
                    label="Key"
                    rules={[{ required: true, message: 'Key is required' }]}
                  >
                    <Input placeholder="Enter key" />
                  </Form.Item>
                  <Form.Item
                    name={['details', 'related_table', 'name']}
                    label="Name"
                    rules={[{ required: true, message: 'Name is required' }]}
                  >
                    <Input placeholder="Enter name" />
                  </Form.Item>
                  <Form.Item
                    name={['details', 'related_table', 'unique_keys']}
                    label="Unique Keys"
                  >
                    <Select
                      mode="tags"
                      placeholder="Enter unique keys"
                      tokenSeparators={[',']}
                    />
                  </Form.Item>
                </div>
              ) : null
            }
          </Form.Item>
        </Form.Item>

        {/* Available Views */}
        <Form.Item
          label="Available Views"
          name="available_views"
          rules={[{ required: true, message: 'Please select at least one view' }]}
        >
          <Checkbox.Group
            options={views}
          />
        </Form.Item>

        {/* Default View */}
        <Form.Item
          label="Default View"
          name="default_view"
          rules={[{ required: true, message: 'Please select a default view' }]}
          dependencies={['available_views']}
        >
          <Select placeholder="Select default view">
            {(views)?.map((view) => (
              <Select.Option key={view.value} value={view.value}>
                {view.value}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Features */}
        <Form.Item label="Features" name="features">
          <Checkbox.Group options={featureOptions} />
        </Form.Item>

        {/* Filters */}
        <Form.List name="filters">
          {(fields, { add, remove }) => (
            <>
              <Form.Item label="Filters">
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Filter
                </Button>
              </Form.Item>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'type']}
                    rules={[{ required: true, message: 'Filter type is required' }]}
                  >
                    <Select 
                      placeholder="Filter type" 
                      onChange={() => {
                        // Reset the field name when type changes
                        const currentFilters = form.getFieldValue('filters');
                        currentFilters[name].name = undefined;
                        form.setFieldsValue({ filters: currentFilters });
                      }}
                    >
                      <Select.Option value="text">Text</Select.Option>
                      <Select.Option value="date-range">Date Range</Select.Option>
                      <Select.Option value="select">Select</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item 
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => {
                      const prevType = prevValues.filters?.[name]?.type;
                      const currentType = currentValues.filters?.[name]?.type;
                      return prevType !== currentType;
                    }}
                  >
                    {({ getFieldValue }) => {
                      const filterType = getFieldValue(['filters', name, 'type']);
                      
                      let filteredOptions = [];
                      if (filterType === 'text') {
                        filteredOptions = filterableFields.filter((f: any) => {
                          if (f.value === 'search') return true;
                          const meta = metadata.find((m: any) => m.key === f.value);
                          if (!meta) return false;
                          // Include searchable fields or virtual text fields explicitly mentioned
                          return meta.is_searchable || (meta.type === 'text');
                        });
                      } else if (filterType === 'date-range') {
                        filteredOptions = filterableFields.filter((f: any) => {
                          const meta = metadata.find((m: any) => m.key === f.value);
                          if (!meta) return false;
                          // Match temporal subtype or database timestamp/date types
                          const isTemporal = meta.semantic_type?.sub_type === 'temporal' || 
                                           meta.type?.includes('timestamp') || 
                                           meta.type?.includes('date');
                          return isTemporal && !meta.is_virtual;
                        });
                      } else if (filterType === 'select') {
                        filteredOptions = filterableFields.filter((f: any) => {
                          const meta = metadata.find((m: any) => m.key === f.value);
                          if (!meta) return false;
                          // Decision Matrix: foreign_key, bool, array, or categorical subtypes
                          const isSelect = meta.foreign_key || 
                                          ['bool', 'boolean', 'text[]'].includes(meta.type) || 
                                          ['nominal', 'discrete', 'boolean'].includes(meta.semantic_type?.sub_type);
                          
                          // Allow virtual booleans (like results from JSONB) but exclude other virtuals
                          if (meta.is_virtual && meta.type !== 'boolean' && meta.type !== 'bool') return false;
                          
                          return isSelect;
                        });
                      }

                      return (
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          rules={[{ required: true, message: 'Filter field is required' }]}
                        >
                          <Select
                            placeholder="Select field"
                            style={{ minWidth: '150px' }}
                            options={filteredOptions}
                            onChange={(value) => handleFilterNameChange(value, name)}
                            disabled={!filterType}
                          />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'label']}
                    rules={[{ required: true, message: 'Label is required' }]}
                    style={{ minWidth: '120px' }}
                  >
                    <Input placeholder="Label" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'placeholder']} style={{ minWidth: '120px' }}>
                    <Input placeholder="Placeholder" />
                  </Form.Item>
                  
                  <Form.Item 
                    {...restField} 
                    name={[name, 'isServerSide']} 
                    valuePropName="checked" 
                    tooltip="If checked, search/filters will only apply when Search button is clicked"
                  >
                    <Checkbox>Server-Side</Checkbox>
                  </Form.Item>

                  <Form.Item 
                    {...restField} 
                    name={[name, 'join_table']}
                    tooltip="Optional: join table name for complex filters"
                  >
                    <Input placeholder="Join Table" style={{ width: '120px' }} />
                  </Form.Item>

                  <Form.Item 
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => {
                      const prevName = prevValues.filters?.[name]?.name;
                      const currentName = currentValues.filters?.[name]?.name;
                      return prevName !== currentName;
                    }}
                  >
                    {({ getFieldValue }) => {
                      const filterName = getFieldValue(['filters', name, 'name']);
                      if (filterName === 'search') {
                        return (
                          <Form.Item 
                            {...restField} 
                            name={[name, 'search_columns']}
                            tooltip="Columns to include in global search"
                          >
                            <Select 
                              mode="multiple" 
                              placeholder="Search Columns" 
                              style={{ minWidth: '200px' }}
                              options={filterableFields.filter(f => f.value !== 'search')}
                            />
                          </Form.Item>
                        );
                      }
                      return null;
                    }}
                  </Form.Item>

                  <Button danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginLeft: 'auto' }} />
                </Space>
              ))}
            </>
          )}
        </Form.List>

        {/* Global Actions */}
        <Form.List name="global_actions">
          {(fields, { add, remove }) => (
            <>
              <Form.Item label="Global Actions">
                <Button
                  type="dashed"
                  onClick={() => add({ form: '', label: '' })}
                  block
                  icon={<PlusOutlined />}
                >
                  Add Global Action
                </Button>
              </Form.Item>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'form']}
                    rules={[{ required: true, message: 'Form name is required' }]}
                  >
                    <Input placeholder="Form name" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'label']}
                    rules={[{ required: true, message: 'Label is required' }]}
                  >
                    <Input placeholder="Action label" />
                  </Form.Item>
                  <Button danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                </Space>
              ))}
            </>
          )}
        </Form.List>

        {/* Submit Button */}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
            Save Configuration
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ViewConfigEditor;
