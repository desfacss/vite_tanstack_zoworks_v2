import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Input, Popover, Select, Checkbox, Typography, message } from 'antd';
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
  const staticTabOptions = ['Overview', 'Files', 'Notes', 'Status', 'Activities', 'Logs'];
  const tabViewOptions = ['tableview', 'gridview', 'kanbanview', 'calendarview', 'timelineview', 'ganttview', 'dashboardview'];

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
          .select('id, detailview')
          .eq('entity_id', entityData.id)
          .single();

        if (viewConfigError && viewConfigError.code !== 'PGRST116') {
          throw viewConfigError;
        }

        const currentDetailView = viewConfigData?.detailview || detailView;
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
      const cleanedStaticTabs = values.staticTabs?.map(({ tabType, ...rest }, index) => {
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
        dynamicTabs: values.dynamicTabs,
      };

      const { data, error } = await supabase
        .schema('core')
        .from('view_configs')
        .update({ detailview: updatedDetailView })
        .eq('id', viewConfigId)
        .select();

      if (error) {
        throw error;
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

  const columnsStatic = [
    {
      title: 'Tab',
      dataIndex: 'tab',
      key: 'tab',
      render: (_: any, __: any, index: number) => (
        <Input.Group compact>
          <Form.Item name={[index, 'tabType']} noStyle initialValue="predefined">
            <Select showSearch style={{ width: '30%' }}>
              <Option value="predefined">Predefined</Option>
              <Option value="custom">Custom</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name={[index, 'tab']}
            rules={[{ required: true, message: 'Tab value is required!' }]}
            noStyle
          >
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) =>
                prev.staticTabs?.[index]?.tabType !== curr.staticTabs?.[index]?.tabType
              }
            >
              {({ getFieldValue }) => {
                const tabType = getFieldValue(['staticTabs', index, 'tabType']) || 'predefined';
                return tabType === 'predefined' ? (
                  <Select showSearch style={{ width: '70%' }} placeholder="Select tab">
                    {staticTabOptions.map((option) => (
                      <Option key={option} value={option}>
                        {option}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <Input style={{ width: '70%' }} placeholder="Custom component path" />
                );
              }}
            </Form.Item>
          </Form.Item>
        </Input.Group>
      ),
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (_: any, __: any, index: number) => (
        <Form.Item name={[index, 'label']} rules={[{ required: true, message: 'Please input the label!' }]}>
          <Input placeholder="Label" />
        </Form.Item>
      ),
    },
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      render: (_: any, __: any, index: number) => (
        <Form.Item name={[index, 'order']} normalize={(value) => Number(value)}>
          <Input type="number" placeholder="Order" />
        </Form.Item>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, __: any, index: number) => (
        <Button
          onClick={() => {
            const staticTabs = form.getFieldValue('staticTabs') || [];
            staticTabs.splice(index, 1);
            form.setFieldsValue({ staticTabs });
          }}
          icon={<DeleteOutlined />}
          danger
        />
      ),
    },
  ];

  const columnsDynamic = [
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (_: any, __: any, index: number) => (
        <Form.Item name={[index, 'label']} rules={[{ required: true, message: 'Please input the label!' }]}>
          <Input placeholder="Label" />
        </Form.Item>
      ),
    },
    {
      title: 'Entity Type',
      dataIndex: ['props', 'entityType'],
      key: 'entityType',
      render: (_: any, __: any, index: number) => (
        <Form.Item name={[index, 'props', 'entityType']} rules={[{ required: true, message: 'Please input the entity type!' }]}>
          <Input placeholder="Entity Type" />
        </Form.Item>
      ),
    },
    {
      title: 'Filters',
      key: 'filters',
      render: (_: any, __: any, index: number) => (
        <Form.Item shouldUpdate>
          {() => (
            <Popover
              content={
                <FilterEditor
                  filters={form.getFieldValue(['dynamicTabs', index, 'props', 'filters']) || []}
                  onChange={(newFilters) => {
                    const dynamicTabs = form.getFieldValue('dynamicTabs') || [];
                    dynamicTabs[index] = {
                      ...dynamicTabs[index],
                      props: {
                        ...dynamicTabs[index].props,
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
      dataIndex: ['props', 'tabs'],
      key: 'tabs',
      render: (_: any, __: any, index: number) => (
        <Form.Item name={[index, 'props', 'tabs']}>
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
      dataIndex: 'detailView',
      key: 'detailView',
      render: (_: any, __: any, index: number) => (
        <Form.Item name={[index, 'detailView']} valuePropName="checked" initialValue={false}>
          <Checkbox />
        </Form.Item>
      ),
    },
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      render: (_: any, __: any, index: number) => (
        <Form.Item name={[index, 'order']} normalize={(value) => Number(value)}>
          <Input type="number" placeholder="Order" />
        </Form.Item>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, __: any, index: number) => (
        <Button
          onClick={() => {
            const dynamicTabs = form.getFieldValue('dynamicTabs') || [];
            dynamicTabs.splice(index, 1);
            form.setFieldsValue({ dynamicTabs });
          }}
          icon={<DeleteOutlined />}
          danger
        />
      ),
    },
  ];

  const handleAddStatic = () => {
    const staticTabs = form.getFieldValue('staticTabs') || [];
    const dynamicTabs = form.getFieldValue('dynamicTabs') || [];
    const maxOrder = Math.max(
      ...staticTabs.map((tab: StaticTab) => tab.order || 0),
      ...dynamicTabs.map((tab: DynamicTab) => tab.order || 0),
      0
    );
    const newStaticTabs = [
      ...staticTabs,
      { tab: '', label: '', order: maxOrder + 1, tabType: 'predefined' },
    ];
    form.setFieldsValue({ staticTabs: newStaticTabs });
  };

  const handleAddDynamic = () => {
    const staticTabs = form.getFieldValue('staticTabs') || [];
    const dynamicTabs = form.getFieldValue('dynamicTabs') || [];
    const maxOrder = Math.max(
      ...staticTabs.map((tab: StaticTab) => tab.order || 0),
      ...dynamicTabs.map((tab: DynamicTab) => tab.order || 0),
      0
    );
    const newDynamicTabs = [
      ...dynamicTabs,
      {
        label: '',
        order: maxOrder + 1,
        detailView: false,
        props: { entityType: '', filters: [], tabs: [] },
      },
    ];
    form.setFieldsValue({ dynamicTabs: newDynamicTabs });
  };

  return (
    <Form form={form} onFinish={onFinish}>
      <Title level={4}>Static Tabs </Title>
      <Form.List name="staticTabs">
        {(fields) => (
          <>
            <Table
              columns={columnsStatic}
              dataSource={fields.map((field, index) => ({ ...field, key: `static-${index}` }))}
              pagination={false}
            />
            <Button onClick={handleAddStatic} icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
              Add Static Tab
            </Button>
          </>
        )}
      </Form.List>

      <Title level={4}>Dynamic Tabs </Title>
      <Form.List name="dynamicTabs">
        {(fields) => (
          <>
            <Table
              columns={columnsDynamic}
              dataSource={fields.map((field, index) => ({ ...field, key: `dynamic-${index}` }))}
              pagination={false}
            />
            <Button onClick={handleAddDynamic} icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
              Add Dynamic Tab
            </Button>
          </>
        )}
      </Form.List>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Save Configuration
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ConfigEditor;
