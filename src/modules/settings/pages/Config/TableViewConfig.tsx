import React, { useState, useEffect } from 'react';
import { Button, Select, Table, Space, Checkbox, Row, Col, Input, message, Typography } from 'antd';
import { PlusOutlined, UpOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons';
const { Title } = Typography;
const { Option } = Select;

interface Field {
  order: number;
  fieldName: string;
  fieldPath: string;
}

interface Action {
  form: string;
  name: string;
}

interface ConfigData {
  fields?: Field[];
  actions?: { row: Action[]; bulk: Action[] };
  groupBy?: string[];
  exportOptions?: string[];
  showFeatures?: string[];
}

interface metadataItem {
  key: string;
  display_name: string;
}

interface TableViewConfigProps {
  configData: ConfigData;
  onSave?: (data: ConfigData) => void;
  availableColumns: any[];
  metadata?: metadataItem[];
}

const TableViewConfig: React.FC<TableViewConfigProps> = ({
  configData,
  onSave,
  availableColumns,
  metadata,
}) => {
  useEffect
  const [fields, setFields] = useState<Field[]>(configData?.fields || []);
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

  // Load configuration from localStorage on mount
  useEffect(() => {
    // const savedConfig = localStorage.getItem('tableViewConfig');
    // console.log("savedConfig",savedConfig);
    // if (savedConfig) {
    //   const parsedConfig = JSON.parse(savedConfig);
    //   setFields(parsedConfig.fields || configData?.fields || []);
    //   setActions(parsedConfig.actions || configData?.actions || { row: [], bulk: [] });
    //   setGroupBy(parsedConfig.groupBy || configData?.groupBy || []);
    //   setExportOptions(parsedConfig.exportOptions || configData?.exportOptions || ['pdf', 'csv']);
    //   setShowFeatures(parsedConfig.showFeatures || configData?.showFeatures || [
    //     'search',
    //     'enable_view',
    //     'columnVisibility',
    //     'pagination',
    //     'groupBy',
    //     'sorting',
    //   ]);
    // }
    setFields(configData?.fields || []);
    setActions(configData?.actions || { row: [], bulk: [] });
    setGroupBy(configData?.groupBy || []);
    setExportOptions(configData?.exportOptions || ['pdf', 'csv']);
    setShowFeatures(configData?.showFeatures || [
      'search',
      'enable_view',
      'columnVisibility',
      'pagination',
      'groupBy',
      'sorting',
    ]);
  }, [configData]);

  const transformedColumns = metadata?.map(col => col.key) || [];

  const handleAddField = () => {
    setFields([...fields, { order: fields.length + 1, fieldName: '', fieldPath: '' }]);
  };

  const handleFieldChange = (index: number, key: keyof Field, value: string) => {
  const updatedFields = [...fields];
  if (key === 'fieldPath') {
    const selectedColumn = metadata?.find(col => col?.key === value);
    if (selectedColumn) {
      updatedFields[index].fieldName = selectedColumn.display_name;
      // Check if the selected column has a foreign_key
      updatedFields[index].fieldPath = selectedColumn.foreign_key
        ? `${value}_name`
        : value;
    } else {
      updatedFields[index].fieldName = value;
      updatedFields[index].fieldPath = value;
    }
  } else {
    updatedFields[index][key] = value;
  }
  setFields(updatedFields);
};

  const handleRemoveField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
  };

  const moveField = (index: number, direction: number) => {
    const newFields = [...fields];
    const [movedField] = newFields.splice(index, 1);
    newFields.splice(index + direction, 0, movedField);
    setFields(newFields.map((field, i) => ({ ...field, order: i + 1 })));
  };

  const handleSaveConfig = () => {
    const updatedConfig = { fields, actions, groupBy, exportOptions, showFeatures };
    localStorage.setItem('tableViewConfig', JSON.stringify(updatedConfig));
    if (onSave) {
      onSave(updatedConfig);
    }
    message.success('Configuration saved successfully!');
  };

  const handleChangeActions = (actionType: 'row' | 'bulk', value: Action[]) => {
    setActions((prevActions) => ({
      ...prevActions,
      [actionType]: value,
    }));
  };

  const columns = [
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: 'Field',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
      render: (_: any, record: Field, index: number) => (
        <Select showSearch
          value={record?.fieldPath || ''}
          onChange={(value) => handleFieldChange(index, 'fieldPath', value)}
          style={{ width: '100%' }}
        >
          {transformedColumns?.map((col) => (
            <Option key={col} value={col}>
              {col}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'fieldName',
      key: 'fieldName',
      render: (_: any, record: Field, index: number) => (
        <Input
          value={record?.fieldName || ''}
          onChange={(e) => handleFieldChange(index, 'fieldName', e.target.value)}
          placeholder="Display Name"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, __: any, index: number) => (
        <Space>
          <Button
            icon={<UpOutlined />}
            onClick={() => moveField(index, -1)}
            disabled={index === 0}
          />
          <Button
            icon={<DownOutlined />}
            onClick={() => moveField(index, 1)}
            disabled={index === fields.length - 1}
          />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRemoveField(index)}
          />
        </Space>
      ),
    },
  ];

  const handleAddAction = (type: 'row' | 'bulk') => {
    const newAction: Action = { form: '', name: '' };
    setActions(prev => ({
      ...prev,
      [type]: [...prev[type], newAction],
    }));
  };

  const handleActionChange = (type: 'row' | 'bulk', index: number, key: keyof Action, value: string) => {
    const updatedActions = [...actions[type]];
    updatedActions[index][key] = value;
    setActions(prev => ({
      ...prev,
      [type]: updatedActions,
    }));
  };

  const handleRemoveAction = (type: 'row' | 'bulk', index: number) => {
    const updatedActions = actions[type]?.filter((_, i) => i !== index);
    setActions(prev => ({
      ...prev,
      [type]: updatedActions,
    }));
  };

  const renderActionRow = (action: Action, index: number, type: 'row' | 'bulk') => (
    <Row gutter={8} key={index}>
      <Col span={10}>
        <Input
          value={action?.form}
          onChange={(e) => handleActionChange(type, index, 'form', e.target.value)}
          placeholder="Form"
        />
      </Col>
      <Col span={10}>
        <Input
          value={action?.name}
          onChange={(e) => handleActionChange(type, index, 'name', e.target.value)}
          placeholder="Name"
        />
      </Col>
      <Col span={4}>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveAction(type, index)}
          danger
        />
      </Col>
    </Row>
  );

  return (
    <>
    {metadata?.length>0?(<div>
      <h2>Table View Configuration</h2>
       <Title level={4}>Fields </Title>
      <Table
        dataSource={fields}
        columns={columns}
        rowKey="order"
        pagination={false}
        style={{ marginBottom: '20px' }}
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddField}
        style={{ marginBottom: '20px' }}
      >
        Add Field
      </Button>

       <Title level={4}>Actions </Title>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <h4>Row Actions:</h4>
          {actions?.row?.map((action, index) => renderActionRow(action, index, 'row'))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => handleAddAction('row')}
            style={{ marginTop: '10px' }}
          >
            Add Row Action
          </Button>
        </Col>
        <Col span={12}>
          <h4>Bulk Actions:</h4>
          {actions?.bulk?.map((action, index) => renderActionRow(action, index, 'bulk'))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => handleAddAction('bulk')}
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
        onChange={(value) => setGroupBy(value)}
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
        onChange={(value) => setExportOptions(value)}
        style={{ width: '100%' }}
        placeholder="Select export options"
      >
        <Option value="pdf">PDF</Option>
        <Option value="csv">CSV</Option>
      </Select>

       <Title level={4}>Show Features </Title>
      <Checkbox.Group
        options={[
          { label: 'Column Visibility', value: 'columnVisibility' },
          { label: 'Pagination', value: 'pagination' },
          { label: 'Group By', value: 'groupBy' },
          { label: 'Basic Search', value: 'basicSearch' },
          { label: 'Sorting', value: 'sorting' },
          { label: 'ENABLE VIEW', value: 'enable_view' },
        ]}
        value={showFeatures}
        onChange={setShowFeatures}
      />

      <Button type="primary" onClick={handleSaveConfig} style={{ marginTop: '20px' }}>
        Save Configuration
      </Button>
    </div>):<>Add Metadata</>}
    </>
  );
};

export default TableViewConfig;
