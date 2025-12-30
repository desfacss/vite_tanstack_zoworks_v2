import React, { useState, useEffect } from 'react';
import { Button, Select, Table, Space, Checkbox, Row, Col, Input, Modal, Form, message, Typography } from 'antd';
import { PlusOutlined, UpOutlined, DownOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
const { Title } = Typography;
const { Option } = Select;

interface Field {
  order: number;
  fieldName: string;
  fieldPath: string;
  icon: string;
  link: string;
  cardSection: string;
  style: { [key: string]: string };
  subFields: any[];
  linkParam: string;
  mode: 'navigate' | 'drawer';
}

interface Group {
  name: string;
  order: number;
  fields: Field[];
}

interface Action {
  form: string;
  name: string;
}

interface ConfigData {
  groups?: Group[];
  actions?: { row: Action[]; bulk: Action[] };
  groupBy?: string[];
  exportOptions?: string[];
  showFeatures?: string[];
  layout?: {
    size: string;
    spacing: number;
    maxWidth: string;
    cardStyle: { _boxShadow: string; _borderRadius: string };
    cardsPerRow: number;
  };
  viewLink?: string;
  viewName?: string;
}

interface metadataItem {
  key: string;
  display_name: string;
}

interface GridViewConfigProps {
  configData: ConfigData;
  onSave?: (data: ConfigData) => void;
  availableColumns: any[];
  metadata?: metadataItem[];
}

const GridViewConfig: React.FC<GridViewConfigProps> = ({
  configData,
  onSave,
  availableColumns,
  metadata,
}) => {
  console.log('GridViewConfig rendered with configData:', configData);
  const [groups, setGroups] = useState<Group[]>(configData?.groups || []);
  const [actions, setActions] = useState<{
    row: Action[];
    bulk: Action[];
  }>({
    row: configData?.actions?.row || [],
    bulk: configData?.actions?.bulk || [],
  });
  const [groupBy, setGroupBy] = useState<string[]>(configData?.groupBy || []);
  const [exportOptions, setExportOptions] = useState<string[]>(configData?.exportOptions || ['pdf', 'csv']);
  const [showFeatures, setShowFeatures] = useState<string[]>(
    configData?.showFeatures || ['search', 'enable_view', 'columnVisibility', 'pagination', 'groupBy', 'sorting']
  );
  const [layout, setLayout] = useState(configData?.layout || {
    size: 'small',
    spacing: 16,
    maxWidth: '100%',
    cardStyle: { _boxShadow: '0 1px 4px rgba(0,0,0,0.1)', _borderRadius: '20px' },
    cardsPerRow: 3,
  });
  const [viewLink, setViewLink] = useState<string>(configData?.viewLink || '/gridview/');
  const [viewName, setViewName] = useState<string>(configData?.viewName || 'GridView');
  const [styleModalVisible, setStyleModalVisible] = useState<boolean>(false);
  const [subFieldsModalVisible, setSubFieldsModalVisible] = useState<boolean>(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState<number | null>(null);
  const [currentFieldIndex, setCurrentFieldIndex] = useState<number | null>(null);
  const [form] = Form.useForm();

  // Sync state with configData changes
  useEffect(() => {
    // console.log('useEffect triggered with configData:', configData);
    // const savedConfig = localStorage.getItem('gridViewConfig');
    // if (savedConfig) {
    //   const parsedConfig = JSON.parse(savedConfig);
    //   console.log('Loading from localStorage:', parsedConfig);
    //   setGroups([...(parsedConfig.groups || configData?.groups || [])]);
    //   setActions({
    //     row: [...(parsedConfig.actions?.row || configData?.actions?.row || [])],
    //     bulk: [...(parsedConfig.actions?.bulk || configData?.actions?.bulk || [])],
    //   });
    //   setGroupBy([...(parsedConfig.groupBy || configData?.groupBy || [])]);
    //   setExportOptions([...(parsedConfig.exportOptions || configData?.exportOptions || ['pdf', 'csv'])]);
    //   setShowFeatures([...(parsedConfig.showFeatures || configData?.showFeatures || [
    //     'search',
    //     'enable_view',
    //     'columnVisibility',
    //     'pagination',
    //     'groupBy',
    //     'sorting',
    //   ])]);
    //   setLayout({
    //     ...(parsedConfig.layout || configData?.layout || {
    //       size: 'small',
    //       spacing: 16,
    //       maxWidth: '100%',
    //       cardStyle: { _boxShadow: '0 1px 4px rgba(0,0,0,0.1)', _borderRadius: '20px' },
    //       cardsPerRow: 3,
    //     }),
    //   });
    //   setViewLink(parsedConfig.viewLink || configData?.viewLink || '/gridview/');
    //   setViewName(parsedConfig.viewName || configData?.viewName || 'GridView');
    // } else {
      // Sync with configData if no saved config
      console.log('Syncing with configData:', configData);
      setGroups([...(configData?.groups || [])]);
      setActions({
        row: [...(configData?.actions?.row || [])],
        bulk: [...(configData?.actions?.bulk || [])],
      });
      setGroupBy([...(configData?.groupBy || [])]);
      setExportOptions([...(configData?.exportOptions || ['pdf', 'csv'])]);
      setShowFeatures([...(configData?.showFeatures || [
        'search',
        'enable_view',
        'columnVisibility',
        'pagination',
        'groupBy',
        'sorting',
      ])]);
      setLayout({
        ...(configData?.layout || {
          size: 'small',
          spacing: 16,
          maxWidth: '100%',
          cardStyle: { _boxShadow: '0 1px 4px rgba(0,0,0,0.1)', _borderRadius: '20px' },
          cardsPerRow: 3,
        }),
      });
      setViewLink(configData?.viewLink || '/gridview/');
      setViewName(configData?.viewName || 'GridView');
    // }
  }, [configData]);

  const transformedColumns = metadata?.filter(col=>col?.is_displayable===true)?.map(col => col.key) || [];

  const handleAddGroup = () => {
    setGroups([...groups, { name: `Group ${groups.length + 1}`, order: groups.length + 1, fields: [] }]);
  };

  const handleGroupChange = (index: number, key: keyof Group, value: any) => {
    const updatedGroups = [...groups];
    updatedGroups[index] = { ...updatedGroups[index], [key]: key === 'order' ? Number(value) : value };
    setGroups(updatedGroups);
  };

  const handleRemoveGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
  };

  const handleAddField = (groupIndex: number) => {
    const updatedGroups = [...groups];
    updatedGroups[groupIndex].fields = [
      ...updatedGroups[groupIndex].fields,
      {
        order: updatedGroups[groupIndex].fields.length + 1,
        fieldName: '',
        fieldPath: '',
        icon: '',
        link: '',
        cardSection: '',
        style: {},
        subFields: [],
        linkParam: '',
        mode: 'navigate',
      },
    ];
    setGroups(updatedGroups);
  };

  const handleFieldChange = (groupIndex: number, fieldIndex: number, key: keyof Field, value: any) => {
  const updatedGroups = [...groups];
  updatedGroups[groupIndex].fields[fieldIndex] = {
    ...updatedGroups[groupIndex].fields[fieldIndex],
    [key]: value,
  };
  if (key === 'fieldPath') {
    const selectedColumn = metadata?.find(col => col.key === value);
    if (selectedColumn) {
      updatedGroups[groupIndex].fields[fieldIndex].fieldName = selectedColumn.display_name;
      updatedGroups[groupIndex].fields[fieldIndex].fieldPath = selectedColumn.foreign_key
        ? `${value}_name`
        : value;
    }
  }
  setGroups(updatedGroups);
};

  const handleRemoveField = (groupIndex: number, fieldIndex: number) => {
    const updatedGroups = [...groups];
    updatedGroups[groupIndex].fields = updatedGroups[groupIndex].fields.filter((_, i) => i !== fieldIndex);
    setGroups(updatedGroups);
  };

  const moveField = (groupIndex: number, fieldIndex: number, direction: number) => {
    const updatedGroups = [...groups];
    const fields = [...updatedGroups[groupIndex].fields];
    const [movedField] = fields.splice(fieldIndex, 1);
    fields.splice(fieldIndex + direction, 0, movedField);
    updatedGroups[groupIndex].fields = fields.map((field, i) => ({ ...field, order: i + 1 }));
    setGroups(updatedGroups);
  };

  const openStyleModal = (groupIndex: number, fieldIndex: number) => {
    setCurrentGroupIndex(groupIndex);
    setCurrentFieldIndex(fieldIndex);
    form.setFieldsValue(groups[groupIndex].fields[fieldIndex].style || {});
    setStyleModalVisible(true);
  };

  const handleStyleOk = () => {
    if (currentGroupIndex === null || currentFieldIndex === null) return;
    const styleValues = form.getFieldsValue();
    const updatedGroups = [...groups];
    updatedGroups[currentGroupIndex].fields[currentFieldIndex].style = styleValues;
    setGroups(updatedGroups);
    setStyleModalVisible(false);
  };

  const handleAddStyle = () => {
    if (currentGroupIndex === null || currentFieldIndex === null) return;
    const updatedGroups = [...groups];
    if (!updatedGroups[currentGroupIndex].fields[currentFieldIndex].style) {
      updatedGroups[currentGroupIndex].fields[currentFieldIndex].style = {};
    }
    const styleArray = Object.entries(updatedGroups[currentGroupIndex].fields[currentFieldIndex].style || {}).map(([key, value]) => ({ key, value }));
    styleArray.push({ key: '', value: '' });
    updatedGroups[currentGroupIndex].fields[currentFieldIndex].style = Object.fromEntries(styleArray.map(item => [item.key, item.value]));
    setGroups(updatedGroups);
  };

  const handleStyleChange = (styleIndex: number, keyOrValue: 'key' | 'value', value: string) => {
    if (currentGroupIndex === null || currentFieldIndex === null) return;
    const updatedGroups = [...groups];
    const styleArray = Object.entries(updatedGroups[currentGroupIndex].fields[currentFieldIndex].style || {}).map(([key, val]) => ({ key, value: val }));
    styleArray[styleIndex][keyOrValue] = value;
    updatedGroups[currentGroupIndex].fields[currentFieldIndex].style = Object.fromEntries(styleArray.map(item => [item.key, item.value]));
    setGroups(updatedGroups);
  };

  const handleRemoveStyle = (styleIndex: number) => {
    if (currentGroupIndex === null || currentFieldIndex === null) return;
    const updatedGroups = [...groups];
    const styleArray = Object.entries(updatedGroups[currentGroupIndex].fields[currentFieldIndex].style).map(([key, value]) => ({ key, value }));
    styleArray.splice(styleIndex, 1);
    updatedGroups[currentGroupIndex].fields[currentFieldIndex].style = Object.fromEntries(styleArray.map(item => [item.key, item.value]));
    setGroups(updatedGroups);
  };

  const getStyleDataSource = () => {
    if (currentGroupIndex === null || currentFieldIndex === null || !groups[currentGroupIndex]?.fields[currentFieldIndex]?.style) return [];
    return Object.entries(groups[currentGroupIndex].fields[currentFieldIndex].style).map(([key, value]) => ({ key, value }));
  };

  const openSubFieldsModal = (groupIndex: number, fieldIndex: number) => {
    setCurrentGroupIndex(groupIndex);
    setCurrentFieldIndex(fieldIndex);
    setSubFieldsModalVisible(true);
  };

  const handleAddSubField = () => {
    if (currentGroupIndex === null || currentFieldIndex === null) return;
    const updatedGroups = [...groups];
    updatedGroups[currentGroupIndex].fields[currentFieldIndex].subFields = [
      ...updatedGroups[currentGroupIndex].fields[currentFieldIndex].subFields,
      { fieldName: '', fieldPath: '', icon: '', style: {}, webLink: false },
    ];
    setGroups(updatedGroups);
  };

  const handleSubFieldChange = (subIndex: number, key: string, value: any) => {
  if (currentGroupIndex === null || currentFieldIndex === null) return;
  const updatedGroups = [...groups];
  updatedGroups[currentGroupIndex].fields[currentFieldIndex].subFields[subIndex] = {
    ...updatedGroups[currentGroupIndex].fields[currentFieldIndex].subFields[subIndex],
    [key]: value,
  };
  if (key === 'fieldPath') {
    const selectedColumn = metadata?.find(col => col.key === value);
    if (selectedColumn) {
      updatedGroups[currentGroupIndex].fields[currentFieldIndex].subFields[subIndex].fieldName = selectedColumn.display_name;
      updatedGroups[currentGroupIndex].fields[currentFieldIndex].subFields[subIndex].fieldPath = selectedColumn.foreign_key
        ? `${value}_name`
        : value;
    }
  }
  setGroups(updatedGroups);
};

  const handleRemoveSubField = (subIndex: number) => {
    if (currentGroupIndex === null || currentFieldIndex === null) return;
    const updatedGroups = [...groups];
    updatedGroups[currentGroupIndex].fields[currentFieldIndex].subFields = updatedGroups[currentGroupIndex].fields[currentFieldIndex].subFields.filter((_, i) => i !== subIndex);
    setGroups(updatedGroups);
  };

  const handleSaveConfig = () => {
    const updatedGroups = groups.map(group => ({
      ...group,
      fields: group.fields.map(field => {
        if (field?.subFields && field?.subFields?.length > 0) {
          return { ...field, fieldPath: '', display: 'comma_separated' };
        }
        return field;
      }),
    }));
    const updatedConfig = { groups: updatedGroups, actions, groupBy, exportOptions, showFeatures, layout, viewLink, viewName };
    localStorage.setItem('gridViewConfig', JSON.stringify(updatedConfig));
    if (onSave) {
      onSave(updatedConfig);
    }
    message.success('Configuration saved successfully!');
  };

  const styleColumns = [
    {
      title: 'Style Key',
      dataIndex: 'key',
      key: 'key',
      render: (text: string, _: any, index: number) => (
        <Input value={text} onChange={(e) => handleStyleChange(index, 'key', e.target.value)} placeholder="e.g., fontSize" />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, _: any, index: number) => (
        <Input value={text} onChange={(e) => handleStyleChange(index, 'value', e.target.value)} placeholder="e.g., 16px" />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, __: any, index: number) => (
        <Button icon={<DeleteOutlined />} danger onClick={() => handleRemoveStyle(index)} />
      ),
    },
  ];

  const fieldColumns = (groupIndex: number) => [
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      width: 80,
    },
    {
      title: 'Field Path',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
      render: (text: string, record: Field, index: number) => (
        <Select showSearch
          value={record.fieldPath}
          onChange={(value) => handleFieldChange(groupIndex, index, 'fieldPath', value)}
          style={{ width: '100%' }}
        >
          {transformedColumns.map(col => (
            <Option key={col} value={col}>{col}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'fieldName',
      key: 'fieldName',
      render: (text: string, record: Field, index: number) => (
        <Input
          value={record.fieldName}
          onChange={(e) => handleFieldChange(groupIndex, index, 'fieldName', e.target.value)}
          placeholder="Field Name"
        />
      ),
    },
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
      render: (text: string, record: Field, index: number) => (
        <Input
          value={record.icon}
          onChange={(e) => handleFieldChange(groupIndex, index, 'icon', e.target.value)}
          placeholder="Icon Name"
        />
      ),
    },
    {
      title: 'Link',
      dataIndex: 'link',
      key: 'link',
      render: (text: string, record: Field, index: number) => (
        <Input
          value={record.link}
          onChange={(e) => handleFieldChange(groupIndex, index, 'link', e.target.value)}
          placeholder="Link URL"
        />
      ),
    },
    {
      title: 'Link Param',
      dataIndex: 'linkParam',
      key: 'linkParam',
      render: (text: string, record: Field, index: number) => (
        <Input
          value={record.linkParam}
          onChange={(e) => handleFieldChange(groupIndex, index, 'linkParam', e.target.value)}
          placeholder="Link Param"
        />
      ),
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      render: (text: string, record: Field, index: number) => (
        <Select
          value={record.mode}
          onChange={(value) => handleFieldChange(groupIndex, index, 'mode', value)}
          style={{ width: '100%' }}
        >
          <Option value="navigate">Navigate</Option>
          <Option value="drawer">Drawer</Option>
        </Select>
      ),
    },
    {
      title: 'Card Section',
      dataIndex: 'cardSection',
      key: 'cardSection',
      render: (text: string, record: Field, index: number) => (
        <Select
          value={record.cardSection}
          onChange={(value) => handleFieldChange(groupIndex, index, 'cardSection', value)}
          style={{ width: '100%' }}
        >
          <Option value="">None</Option>
          <Option value="title">Title</Option>
          <Option value="body">Body</Option>
          <Option value="footer">Footer</Option>
        </Select>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, __: any, index: number) => (
        <Space>
          <Button icon={<UpOutlined />} onClick={() => moveField(groupIndex, index, -1)} disabled={index === 0} />
          <Button
            icon={<DownOutlined />}
            onClick={() => moveField(groupIndex, index, 1)}
            disabled={index === groups[groupIndex].fields.length - 1}
          />
          <Button icon={<EditOutlined />} onClick={() => openStyleModal(groupIndex, index)} />
          <Button icon={<EditOutlined />} onClick={() => openSubFieldsModal(groupIndex, index)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleRemoveField(groupIndex, index)} />
        </Space>
      ),
    },
  ];

  const subFieldColumns = [
    {
      title: 'Field Path',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
      render: (text: string, record: any, index: number) => (
        <Select
          value={record.fieldPath}
          onChange={(value) => handleSubFieldChange(index, 'fieldPath', value)}
          style={{ width: '100%' }}
        >
          {transformedColumns.map(col => (
            <Option key={col} value={col}>{col}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'fieldName',
      key: 'fieldName',
      render: (text: string, record: any, index: number) => (
        <Input
          value={record.fieldName}
          onChange={(e) => handleSubFieldChange(index, 'fieldName', e.target.value)}
          placeholder="Field Name"
        />
      ),
    },
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
      render: (text: string, record: any, index: number) => (
        <Input
          value={record.icon}
          onChange={(e) => handleSubFieldChange(index, 'icon', e.target.value)}
          placeholder="Icon Name"
        />
      ),
    },
    {
      title: 'Web Link',
      dataIndex: 'webLink',
      key: 'webLink',
      render: (text: boolean, record: any, index: number) => (
        <Checkbox
          checked={record.webLink}
          onChange={(e) => handleSubFieldChange(index, 'webLink', e.target.checked)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, __: any, index: number) => (
        <Button icon={<DeleteOutlined />} danger onClick={() => handleRemoveSubField(index)} />
      ),
    },
  ];

  const groupColumns = [
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      width: 80,
    },
    {
      title: 'Group Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Group, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleGroupChange(index, 'name', e.target.value)}
          placeholder="Group Name"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, __: any, index: number) => (
        <Space>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => handleAddField(index)}
          >
            Add Field
          </Button>
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRemoveGroup(index)}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
    {metadata?.length>0?(<div>
      <h2>Grid View Configuration</h2>
       <Title level={4}>Groups </Title>
      <Table
        columns={groupColumns}
        dataSource={groups}
        rowKey="order"
        pagination={false}
        expandable={{
          expandedRowRender: (record, index) => (
            <Table
              columns={fieldColumns(index)}
              dataSource={record.fields}
              rowKey="order"
              pagination={false}
            />
          ),
          expandIcon: ({ expanded, onExpand, record }) => (
      <Button type={expanded ?'default':'primary'}
        onClick={e => onExpand(record, e)}
        // style={{
        //   color: expanded ? '#1890ff' : '#52c41a', // example: blue when expanded, green when collapsed
        //   marginRight: 8,
        // }}
      >
        {expanded ? 'Collapse' : 'Expand'}
      </Button>
    ),
        }}
        style={{ marginBottom: '20px' }}
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddGroup}
        style={{ marginBottom: '20px' }}
      >
        Add Group
      </Button>

       <Title level={4}>Actions </Title>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <h4>Row Actions:</h4>
          {actions?.row?.map((action, index) => (
            <Row gutter={8} key={index}>
              <Col span={10}>
                <Input
                  value={action.form}
                  onChange={(e) => {
                    const updatedActions = [...actions.row];
                    updatedActions[index] = { ...updatedActions[index], form: e.target.value };
                    setActions({ ...actions, row: updatedActions });
                  }}
                  placeholder="Form"
                />
              </Col>
              <Col span={10}>
                <Input
                  value={action.name}
                  onChange={(e) => {
                    const updatedActions = [...actions.row];
                    updatedActions[index] = { ...updatedActions[index], name: e.target.value };
                    setActions({ ...actions, row: updatedActions });
                  }}
                  placeholder="Name"
                />
              </Col>
              <Col span={4}>
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => {
                    const updatedActions = actions.row.filter((_, i) => i !== index);
                    setActions({ ...actions, row: updatedActions });
                  }}
                />
              </Col>
            </Row>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setActions({ ...actions, row: [...actions.row, { form: '', name: '' }] })}
            style={{ marginTop: '10px' }}
          >
            Add Row Action
          </Button>
        </Col>
        <Col span={12}>
          <h4>Bulk Actions:</h4>
          {actions?.bulk?.map((action, index) => (
            <Row gutter={8} key={index}>
              <Col span={10}>
                <Input
                  value={action.form}
                  onChange={(e) => {
                    const updatedActions = [...actions.bulk];
                    updatedActions[index] = { ...updatedActions[index], form: e.target.value };
                    setActions({ ...actions, bulk: updatedActions });
                  }}
                  placeholder="Form"
                />
              </Col>
              <Col span={10}>
                <Input
                  value={action.name}
                  onChange={(e) => {
                    const updatedActions = [...actions.bulk];
                    updatedActions[index] = { ...updatedActions[index], name: e.target.value };
                    setActions({ ...actions, bulk: updatedActions });
                  }}
                  placeholder="Name"
                />
              </Col>
              <Col span={4}>
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => {
                    const updatedActions = actions.bulk.filter((_, i) => i !== index);
                    setActions({ ...actions, bulk: updatedActions });
                  }}
                />
              </Col>
            </Row>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setActions({ ...actions, bulk: [...actions.bulk, { form: '', name: '' }] })}
            style={{ marginTop: '10px' }}
          >
            Add Bulk Action
          </Button>
        </Col>
      </Row>

       <Title level={4}>Group By </Title>
      <Select showSearch
        mode="tags"
        value={groupBy}
        onChange={setGroupBy}
        style={{ width: '100%' }}
        placeholder="Select groupBy options"
      >
        <Option value="state">State</Option>
        <Option value="priority">Priority</Option>
        <Option value="assignee">Assignee</Option>
      </Select>

       <Title level={4}>Export Options </Title>
      <Select showSearch
        mode="tags"
        value={exportOptions}
        onChange={setExportOptions}
        style={{ width: '100%' }}
        placeholder="Select export options"
      >
        <Option value="pdf">PDF</Option>
        <Option value="csv">CSV</Option>
      </Select>

       <Title level={4}>Show Features </Title>
      <Checkbox.Group
        options={[
          { label: 'Search', value: 'search' },
          { label: 'Enable View', value: 'enable_view' },
          { label: 'Column Visibility', value: 'columnVisibility' },
          { label: 'Pagination', value: 'pagination' },
          { label: 'Group By', value: 'groupBy' },
          { label: 'Sorting', value: 'sorting' },
        ]}
        value={showFeatures}
        onChange={setShowFeatures}
      />

       <Title level={4}>Layout </Title>
      <Row gutter={16}>
        <Col span={8}>
          <Input
            addonBefore="Size"
            value={layout.size}
            onChange={(e) => setLayout({ ...layout, size: e.target.value })}
            placeholder="e.g., small"
          />
        </Col>
        <Col span={8}>
          <Input
            addonBefore="Spacing"
            type="number"
            value={layout.spacing}
            onChange={(e) => setLayout({ ...layout, spacing: Number(e.target.value) })}
          />
        </Col>
        <Col span={8}>
          <Input
            addonBefore="Max Width"
            value={layout?.maxWidth}
            onChange={(e) => setLayout({ ...layout, maxWidth: e.target.value })}
            placeholder="e.g., 100%"
          />
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: '10px' }}>
        <Col span={8}>
          <Input
            addonBefore="Box Shadow"
            value={layout?.cardStyle?._boxShadow}
            onChange={(e) => setLayout({ ...layout, cardStyle: { ...layout.cardStyle, _boxShadow: e.target.value } })}
            placeholder="e.g., 0 1px 4px rgba(0,0,0,0.1)"
          />
        </Col>
        <Col span={8}>
          <Input
            addonBefore="Border Radius"
            value={layout?.cardStyle?._borderRadius}
            onChange={(e) => setLayout({ ...layout, cardStyle: { ...layout.cardStyle, _borderRadius: e.target.value } })}
            placeholder="e.g., 20px"
          />
        </Col>
        <Col span={8}>
          <Input
            addonBefore="Cards Per Row"
            type="number"
            value={layout.cardsPerRow}
            onChange={(e) => setLayout({ ...layout, cardsPerRow: Number(e.target.value) })}
          />
        </Col>
      </Row>

      <Modal
        title="Edit Style"
        open={styleModalVisible}
        onOk={handleStyleOk}
        onCancel={() => setStyleModalVisible(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <Button type="dashed" onClick={handleAddStyle} block icon={<PlusOutlined />}>
            Add Style
          </Button>
        </div>
        <Table
          dataSource={getStyleDataSource()}
          columns={styleColumns}
          pagination={false}
          rowKey="key"
        />
      </Modal>

      <Modal
        title="Edit Sub Fields"
        open={subFieldsModalVisible}
        onOk={() => setSubFieldsModalVisible(false)}
        onCancel={() => setSubFieldsModalVisible(false)}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Button type="dashed" onClick={handleAddSubField} block icon={<PlusOutlined />}>
            Add Sub Field
          </Button>
        </div>
        {currentGroupIndex !== null && currentFieldIndex !== null && (
          <Table
            dataSource={groups[currentGroupIndex].fields[currentFieldIndex].subFields || []}
            columns={subFieldColumns}
            pagination={false}
            rowKey={(record, index) => index?.toString()}
          />
        )}
      </Modal>

      <Button type="primary" onClick={handleSaveConfig} style={{ marginTop: '20px' }}>
        Save Configuration
      </Button>
    </div>):<>Add Metadata</>}
    </>
  );
};

export default GridViewConfig;
