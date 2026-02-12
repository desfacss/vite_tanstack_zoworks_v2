import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Input, Popover, Select, Checkbox, Typography, message, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
const { Title } = Typography;
const { Option } = Select;

interface StaticTab {
  tab: string;
  label: string;
  order: number;
  tabType?: 'predefined' | 'custom';
}

interface DynamicTab {
  label: string;
  order: number;
  detailView?: boolean;
  props: {
    entityType: string;
    filters: { column: string; value: string }[];
    tabs: string[];
  };
}

interface DetailView {
  staticTabs?: StaticTab[];
  dynamicTabs?: DynamicTab[];
}

interface ConfigEditorProps {
  detailView?: DetailView;
  entityType: string;
  entitySchema?: string;
  onSave?: (data: DetailView) => void;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ detailView, entityType, entitySchema = 'public', onSave }) => {
  const [form] = Form.useForm();
  const [entityId, setEntityId] = useState<string | null>(null);
  const [viewConfigId, setViewConfigId] = useState<string | null>(null);
  const staticTabOptions = ['Overview', 'Files', 'Notes', 'Comments', 'Status', 'Activities', 'Logs'].sort();
  const tabViewOptions = ['tableview', 'gridview', 'kanbanview', 'calendarview', 'timelineview', 'ganttview', 'dashboardview', 'mapview'].sort();

  useEffect(() => {
    async function fetchViewConfig() {
      if (!entityType || !entitySchema) {
        form.resetFields();
        return;
      }

      try {
        const { data: entityData, error: entityError } = await supabase
          .schema('core')
          .from('entities')
          .select('id')
          .eq('entity_type', entityType)
          .eq('entity_schema', entitySchema)
          .single();

        if (entityError && entityError.code !== 'PGRST116') {
          throw entityError;
        }

        if (!entityData) {
          form.resetFields();
          return;
        }
        
        setEntityId(entityData.id);

        const { data: viewConfigData, error: viewConfigError } = await supabase
          .schema('core')
          .from('view_configs')
          .select('id, details_overview')
          .eq('entity_id', entityData.id)
          .single();

        if (viewConfigError && viewConfigError.code !== 'PGRST116') {
          throw viewConfigError;
        }

        const currentDetailView = viewConfigData?.details_overview || detailView;
        setViewConfigId(viewConfigData?.id || null);

        const normalizedDetailView = {
          staticTabs: (currentDetailView?.staticTabs || []).map((tab: StaticTab) => ({
            tab: tab.tab || '',
            label: tab.label || '',
            order: tab.order || 0,
            tabType: tab.tab && staticTabOptions.includes(tab.tab) ? 'predefined' : 'custom',
          })),
          dynamicTabs: (currentDetailView?.dynamicTabs || []).map((tab: DynamicTab) => ({
            label: tab.label || '',
            order: tab.order || 0,
            detailView: tab.detailView ?? false,
            props: {
              entityType: tab.props?.entityType || '',
              filters: tab.props?.filters || [],
              tabs: tab.props?.tabs || [],
            },
          })),
        };

        form.setFieldsValue(normalizedDetailView);
      } catch (error: any) {
        console.error('Error fetching view configuration:', error.message);
        message.error('Failed to load configuration: ' + error.message);
        form.resetFields();
        setEntityId(null);
        setViewConfigId(null);
      }
    }

    fetchViewConfig();
  }, [detailView, entityType, entitySchema, form]);

  const onFinish = async (values: DetailView) => {
    if (!viewConfigId || !entityId) {
      message.error('Entity and View Config ID are missing. Cannot save.');
      return;
    }

    try {
      const cleanedStaticTabs = (values.staticTabs || []).map(({ tabType, ...rest }, index) => {
        if (!rest.tab) {
          throw new Error(`Static tab value at index ${index} cannot be empty`);
        }
        if (tabType === 'predefined' && !staticTabOptions.includes(rest.tab)) {
          throw new Error(`Static tab value at index ${index} must be a predefined option: ${staticTabOptions.join(', ')}`);
        }
        return rest;
      });

      const updatedDetailView: DetailView = {
        staticTabs: cleanedStaticTabs,
        dynamicTabs: values.dynamicTabs || [],
      };

      // Save to core.view_configs
      const { error: viewConfigError } = await supabase
        .schema('core')
        .from('view_configs')
        .update({ details_overview: updatedDetailView })
        .eq('id', viewConfigId)
        .select();

      if (viewConfigError) {
        throw viewConfigError;
      }

      // Also save to core.entity_blueprints.ui_details_overview
      const { error: blueprintError } = await supabase
        .schema('core')
        .from('entity_blueprints')
        .update({ ui_details_overview: updatedDetailView })
        .eq('entity_type', entityType)
        .eq('entity_schema', entitySchema);

      if (blueprintError) {
        console.warn('Failed to update entity_blueprints:', blueprintError.message);
        // Don't throw - this is a secondary save, view_configs is primary
      }

      message.success('Configuration saved successfully!');
      onSave?.(updatedDetailView);
    } catch (error: any) {
      console.error('Error saving config:', error.message);
      message.error('Failed to save configuration: ' + error.message);
    }
  };

  const FilterEditor: React.FC<{
    filters: { column: string; value: string }[];
    onChange: (filters: { column: string; value: string }[]) => void;
  }> = ({ filters, onChange }) => {
    const [filterList, setFilterList] = useState<{ column: string; value: string }[]>(filters || []);

    useEffect(() => {
      setFilterList(filters || []);
    }, [filters]);

    const handleAddFilter = () => {
      const newFilters = [...filterList, { column: '', value: '' }];
      setFilterList(newFilters);
      onChange(newFilters);
    };

    const handleFilterChange = (index: number, field: 'column' | 'value', value: string) => {
      const updatedFilters = [...filterList];
      updatedFilters[index] = {
        ...updatedFilters[index],
        [field]: value,
      };
      setFilterList(updatedFilters);
      onChange(updatedFilters);
    };

    const handleDeleteFilter = (index: number) => {
      const updatedFilters = filterList.filter((_, i) => i !== index);
      setFilterList(updatedFilters);
      onChange(updatedFilters);
    };

    const filterColumns = [
      {
        title: 'Column',
        dataIndex: 'column',
        key: 'column',
        render: (_: any, __: any, index: number) => (
          <Input
            placeholder="Column"
            value={filterList[index]?.column || ''}
            onChange={(e) => handleFilterChange(index, 'column', e.target.value)}
          />
        ),
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (_: any, __: any, index: number) => (
          <Input
            placeholder="Value"
            value={filterList[index]?.value || ''}
            onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
          />
        ),
      },
      {
        title: 'Action',
        key: 'action',
        render: (_: any, __: any, index: number) => (
          <Button
            onClick={() => handleDeleteFilter(index)}
            icon={<DeleteOutlined />}
            danger
          />
        ),
      },
    ];

    return (
      <div>
        <Table
          columns={filterColumns}
          dataSource={filterList.map((filter, index) => ({ ...filter, key: `filter-${index}` }))}
          pagination={false}
        />
        <Button onClick={handleAddFilter} icon={<PlusOutlined />}>
          Add Filter
        </Button>
      </div>
    );
  };

  const getStaticColumns = (remove: (index: number) => void) => [
    {
      title: 'Tab',
      dataIndex: 'name',
      key: 'tab',
      render: (name: number) => (
        <Input.Group compact>
          <Form.Item name={[name, 'tabType']} noStyle initialValue="predefined">
            <Select showSearch style={{ width: '30%' }}>
              <Option value="predefined">Predefined</Option>
              <Option value="custom">Custom</Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) =>
              prev.staticTabs?.[name]?.tabType !== curr.staticTabs?.[name]?.tabType
            }
          >
            {({ getFieldValue }) => {
              const tabType = getFieldValue(['staticTabs', name, 'tabType']) || 'predefined';
              return (
                <Form.Item
                  name={[name, 'tab']}
                  rules={[{ required: true, message: 'Tab value is required!' }]}
                  noStyle
                >
                  {tabType === 'predefined' ? (
                    <Select showSearch style={{ width: '70%' }} placeholder="Select tab">
                      {staticTabOptions.map((option) => (
                        <Option key={option} value={option}>
                          {option}
                        </Option>
                      ))}
                    </Select>
                  ) : (
                    <Input style={{ width: '70%' }} placeholder="Custom component path" />
                  )}
                </Form.Item>
              );
            }}
          </Form.Item>
        </Input.Group>
      ),
    },
    {
      title: 'Label',
      dataIndex: 'name',
      key: 'label',
      render: (name: number) => (
        <Form.Item name={[name, 'label']} rules={[{ required: true, message: 'Please input the label!' }]}>
          <Input placeholder="Label" />
        </Form.Item>
      ),
    },
    {
      title: 'Order',
      dataIndex: 'name',
      key: 'order',
      render: (name: number) => (
        <Form.Item name={[name, 'order']} normalize={(value) => Number(value)}>
          <Input type="number" placeholder="Order" />
        </Form.Item>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'name',
      key: 'action',
      render: (name: number) => (
        <Button
          onClick={() => remove(name)}
          icon={<DeleteOutlined />}
          danger
        />
      ),
    },
  ];

  const getDynamicColumns = (remove: (index: number) => void) => [
    {
      title: 'Label',
      dataIndex: 'name',
      key: 'label',
      render: (name: number) => (
        <Form.Item name={[name, 'label']} rules={[{ required: true, message: 'Please input the label!' }]}>
          <Input placeholder="Label" />
        </Form.Item>
      ),
    },
    {
      title: 'Entity Type',
      dataIndex: 'name',
      key: 'entityType',
      render: (name: number) => (
        <Form.Item name={[name, 'props', 'entityType']} rules={[{ required: true, message: 'Please input the entity type!' }]}>
          <Input 
            placeholder="Entity Type" 
            suffix={
              <Tooltip title="Specify as 'schema.table' (e.g., 'hr.candidates') for custom schemas">
                <PlusOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
              </Tooltip>
            }
          />
        </Form.Item>
      ),
    },
    {
      title: 'Filters',
      dataIndex: 'name',
      key: 'filters',
      render: (name: number) => (
        <Form.Item shouldUpdate>
          {() => (
            <Popover
              content={
                <FilterEditor
                  filters={form.getFieldValue(['dynamicTabs', name, 'props', 'filters']) || []}
                  onChange={(newFilters) => {
                    const dynamicTabs = form.getFieldValue('dynamicTabs') || [];
                    dynamicTabs[name] = {
                      ...dynamicTabs[name],
                      props: {
                        ...dynamicTabs[name].props,
                        filters: newFilters,
                      },
                    };
                    form.setFieldsValue({ dynamicTabs });
                  }}
                />
              }
              title="Edit Filters"
              trigger="click"
            >
              <Button type="primary">Edit</Button>
            </Popover>
          )}
        </Form.Item>
      ),
    },
    {
      title: 'Tabs',
      dataIndex: 'name',
      key: 'tabs',
      render: (name: number) => (
        <Form.Item name={[name, 'props', 'tabs']}>
          <Select showSearch mode="multiple" placeholder="Select Tabs">
            {tabViewOptions.map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        </Form.Item>
      ),
    },
    {
      title: 'Detail View',
      dataIndex: 'name',
      key: 'detailView',
      render: (name: number) => (
        <Form.Item name={[name, 'detailView']} valuePropName="checked" initialValue={false}>
          <Checkbox />
        </Form.Item>
      ),
    },
    {
      title: 'Order',
      dataIndex: 'name',
      key: 'order',
      render: (name: number) => (
        <Form.Item name={[name, 'order']} normalize={(value) => Number(value)}>
          <Input type="number" placeholder="Order" />
        </Form.Item>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'name',
      key: 'action',
      render: (name: number) => (
        <Button
          onClick={() => remove(name)}
          icon={<DeleteOutlined />}
          danger
        />
      ),
    },
  ];

  const calculateMaxOrder = () => {
    const values = form.getFieldsValue();
    const staticTabs = values.staticTabs || [];
    const dynamicTabs = values.dynamicTabs || [];
    return Math.max(
      ...staticTabs.map((tab: any) => tab.order || 0),
      ...dynamicTabs.map((tab: any) => tab.order || 0),
      0
    );
  };

  return (
    <Form form={form} onFinish={onFinish}>
      <Title level={4}>Static Tabs </Title>
      <Form.List name="staticTabs">
        {(fields, { add, remove }) => (
          <>
            <Table
              columns={getStaticColumns(remove)}
              dataSource={fields}
              pagination={false}
              rowKey="key"
            />
            <Button 
              onClick={() => add({ tab: '', label: '', order: calculateMaxOrder() + 1, tabType: 'predefined' })} 
              icon={<PlusOutlined />} 
              style={{ margin: '16px 0' }}
            >
              Add Static Tab
            </Button>
          </>
        )}
      </Form.List>

      <Title level={4}>Dynamic Tabs </Title>
      <Form.List name="dynamicTabs">
        {(fields, { add, remove }) => (
          <>
            <Table
              columns={getDynamicColumns(remove)}
              dataSource={fields}
              pagination={false}
              rowKey="key"
            />
            <Button 
              onClick={() => add({
                label: '',
                order: calculateMaxOrder() + 1,
                detailView: false,
                props: { entityType: '', filters: [], tabs: [] },
              })} 
              icon={<PlusOutlined />} 
              style={{ margin: '16px 0' }}
            >
              Add Dynamic Tab
            </Button>
          </>
        )}
      </Form.List>

      <Form.Item style={{ marginTop: 24 }}>
        <Button type="primary" htmlType="submit">
          Save Configuration
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ConfigEditor;
