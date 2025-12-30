import React, { useState, useEffect } from 'react';
import { Button, Select, Table, Space, Checkbox, Row, Col, Input, Modal, Form, Typography } from 'antd';
import { PlusOutlined, UpOutlined, DownOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
const { Title } = Typography;
const { Option } = Select;

interface Lane {
  name: string;
  color: string;
  sequence: number;
}

interface Type {
  name: string; // Added name field for type
  fieldPath: string;
  lanes: Lane[];
}

interface Field {
  order: number;
  fieldName: string;
  fieldPath: string;
}

interface Action {
  form?: string;
  name: string;
}

interface CardFields {
  tags?: string;
  label?: string;
  title?: string;
  description?: string;
}

interface ConfigData {
  types?: { [key: string]: Type };
  cardFields?: CardFields;
  actions?: { row: Action[]; bulk: Action[] };
  groupBy?: string;
  exportOptions?: string[];
  showFeatures?: string[];
}

interface MetadataItem {
  key: string;
  display_name: string;
  is_displayable?: boolean;
  foreign_key?: {
    source_table: string;
    source_column: string;
    display_column: string;
  };
}

interface KanbanViewConfigProps {
  configData: ConfigData;
  onSave: (data: ConfigData) => void;
  availableColumns: any[];
  metadata?: MetadataItem[];
}

const KanbanViewConfig: React.FC<KanbanViewConfigProps> = ({
  configData,
  onSave,
  availableColumns,
  metadata,
}) => {
  const [fields, setFields] = useState<Field[]>(configData?.cardFields ? [
    { order: 1, fieldName: configData.cardFields.title || '', fieldPath: configData.cardFields.title || '' },
    { order: 2, fieldName: configData.cardFields.description || '', fieldPath: configData.cardFields.description || '' },
    { order: 3, fieldName: configData.cardFields.label || '', fieldPath: configData.cardFields.label || '' },
    { order: 4, fieldName: configData.cardFields.tags || '', fieldPath: configData.cardFields.tags || '' },
  ] : []);
  const [actions, setActions] = useState<{
    row: Action[];
    bulk: Action[];
  }>({
    row: configData?.actions?.row || [],
    bulk: configData?.actions?.bulk || [],
  });
  const [groupBy, setGroupBy] = useState<string>(configData?.groupBy || '');
  const [exportOptions, setExportOptions] = useState<string[]>(configData?.exportOptions || ['csv']);
  const [showFeatures, setShowFeatures] = useState<string[]>(
    configData?.showFeatures || ['groupBy', 'export']
  );
  const [types, setTypes] = useState<{ [key: string]: Type }>(configData?.types || {});
  const [laneModalVisible, setLaneModalVisible] = useState<boolean>(false);
  const [currentTypeKey, setCurrentTypeKey] = useState<string | null>(null);
  const [currentLaneIndex, setCurrentLaneIndex] = useState<number | null>(null);
  const [form] = Form.useForm();

  const transformedColumns = metadata?.filter(col => col?.is_displayable === true)?.map(col => col.key) || [];

  useEffect(() => {
    if (configData) {
      setFields(configData?.cardFields ? [
        { order: 1, fieldName: configData.cardFields.title || '', fieldPath: configData.cardFields.title || '' },
        { order: 2, fieldName: configData.cardFields.description || '', fieldPath: configData.cardFields.description || '' },
        { order: 3, fieldName: configData.cardFields.label || '', fieldPath: configData.cardFields.label || '' },
        { order: 4, fieldName: configData.cardFields.tags || '', fieldPath: configData.cardFields.tags || '' },
      ] : []);
      setActions({
        row: configData?.actions?.row || [],
        bulk: configData?.actions?.bulk || [],
      });
      setGroupBy(configData?.groupBy || '');
      setExportOptions(configData?.exportOptions || ['csv']);
      setShowFeatures(configData?.showFeatures || ['groupBy', 'export']);
      setTypes(configData?.types || {});
    }
  }, [configData]);

  const handleAddField = () => {
    setFields([...fields, { order: fields.length + 1, fieldName: '', fieldPath: '' }]);
  };

  const handleFieldChange = (index: number, key: keyof Field, value: string) => {
    const updatedFields = [...fields];
    updatedFields[index][key] = value;
    if (key === 'fieldPath') {
      const selectedColumn = metadata?.find(col => col.key === value);
      if (selectedColumn) {
        updatedFields[index].fieldName = selectedColumn.display_name;
        updatedFields[index].fieldPath = selectedColumn.foreign_key ? `${value}_name` : value;
      }
    }
    setFields(updatedFields);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index).map((field, i) => ({ ...field, order: i + 1 })));
  };

  const moveField = (index: number, direction: number) => {
    const newFields = [...fields];
    const [movedField] = newFields.splice(index, 1);
    newFields.splice(index + direction, 0, movedField);
    setFields(newFields.map((field, i) => ({ ...field, order: i + 1 })));
  };

  const handleAddType = () => {
    const availableKeys = metadata?.filter(col => col.is_displayable && !Object.keys(types).includes(col.key))?.map(col => col.key) || [];
    if (availableKeys.length === 0) return;
    const newTypeKey = availableKeys[0];
    const selectedColumn = metadata?.find(col => col.key === newTypeKey);
    setTypes({
      ...types,
      [newTypeKey]: {
        name: selectedColumn?.display_name || newTypeKey,
        fieldPath: selectedColumn?.foreign_key ? `${newTypeKey}_name` : newTypeKey,
        lanes: [],
      },
    });
  };

  const handleTypeChange = (typeKey: string, key: keyof Type, value: any) => {
    const updatedTypes = { ...types };
    if (key === 'fieldPath') {
      const selectedColumn = metadata?.find(col => col.key === value);
      updatedTypes[typeKey] = {
        ...updatedTypes[typeKey],
        name: selectedColumn?.display_name || value,
        fieldPath: selectedColumn?.foreign_key ? `${value}_name` : value,
      };
    } else {
      updatedTypes[typeKey] = {
        ...updatedTypes[typeKey],
        [key]: value,
      };
    }
    setTypes(updatedTypes);
  };

  const handleRemoveType = (typeKey: string) => {
    const updatedTypes = { ...types };
    delete updatedTypes[typeKey];
    setTypes(updatedTypes);
  };

  const handleAddLane = (typeKey: string) => {
    const updatedTypes = { ...types };
    updatedTypes[typeKey].lanes = [
      ...updatedTypes[typeKey].lanes,
      { name: '', color: '#efefef', sequence: updatedTypes[typeKey].lanes.length + 1 },
    ];
    setTypes(updatedTypes);
  };

  const openLaneModal = (typeKey: string, laneIndex: number | null) => {
    setCurrentTypeKey(typeKey);
    setCurrentLaneIndex(laneIndex);
    if (laneIndex !== null) {
      form.setFieldsValue(types[typeKey].lanes[laneIndex]);
    } else {
      form.resetFields();
    }
    setLaneModalVisible(true);
  };

  const handleLaneOk = () => {
    if (currentTypeKey === null) return;
    const laneValues = form.getFieldsValue();
    const updatedTypes = { ...types };
    if (currentLaneIndex !== null) {
      updatedTypes[currentTypeKey].lanes[currentLaneIndex] = {
        ...laneValues,
        sequence: currentLaneIndex + 1,
      };
    } else {
      updatedTypes[currentTypeKey].lanes.push({
        ...laneValues,
        sequence: updatedTypes[currentTypeKey].lanes.length + 1,
      });
    }
    setTypes(updatedTypes);
    setLaneModalVisible(false);
    form.resetFields();
  };

  const handleRemoveLane = (typeKey: string, laneIndex: number) => {
    const updatedTypes = { ...types };
    updatedTypes[typeKey].lanes = updatedTypes[typeKey].lanes
      .filter((_, i) => i !== laneIndex)
      .map((lane, i) => ({ ...lane, sequence: i + 1 }));
    setTypes(updatedTypes);
  };

  const handleSaveConfig = () => {
    const cardFields: CardFields = {
      title: fields.find(f => f.order === 1)?.fieldPath || '',
      description: fields.find(f => f.order === 2)?.fieldPath || '',
      label: fields.find(f => f.order === 3)?.fieldPath || '',
      tags: fields.find(f => f.order === 4)?.fieldPath || '',
    };
    const updatedConfig: ConfigData = {
      types,
      cardFields,
      actions,
      groupBy,
      exportOptions,
      showFeatures,
    };
    onSave(updatedConfig);
  };

  const laneColumns = (typeKey: string) => [
    {
      title: 'Sequence',
      dataIndex: 'sequence',
      key: 'sequence',
      width: 80,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Lane, index: number) => (
        <Input
          value={text}
          onChange={(e) => {
            const updatedTypes = { ...types };
            updatedTypes[typeKey].lanes[index].name = e.target.value;
            setTypes(updatedTypes);
          }}
          placeholder="Lane Name"
        />
      ),
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (text: string, record: Lane, index: number) => (
        <Input
          type="color"
          value={text}
          onChange={(e) => {
            const updatedTypes = { ...types };
            updatedTypes[typeKey].lanes[index].color = e.target.value;
            setTypes(updatedTypes);
          }}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, __: any, index: number) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => openLaneModal(typeKey, index)}
          />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRemoveLane(typeKey, index)}
          />
        </Space>
      ),
    },
  ];

  const typeColumns = [
    {
      title: 'Type Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Field Path',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
      render: (text: string, record: any, index: number) => (
        <Select
          value={text}
          onChange={(value) => handleTypeChange(record.key, 'fieldPath', value)}
          style={{ width: '100%' }}
        >
          {transformedColumns.map(col => (
            <Option key={col} value={col}>{col}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => handleAddLane(record.key)}
          >
            Add Lane
          </Button>
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRemoveType(record.key)}
          />
        </Space>
      ),
    },
  ];

  const fieldColumns = [
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: 'Field Role',
      dataIndex: 'order',
      key: 'fieldRole',
      render: (order: number) => {
        const roles = ['title', 'description', 'label', 'tags'];
        return roles[order - 1] || 'Field';
      },
    },
    {
      title: 'Field Path',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
      render: (_: any, record: Field, index: number) => (
        <Select
          value={record.fieldPath}
          onChange={(value) => handleFieldChange(index, 'fieldPath', value)}
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
      render: (_: any, record: Field, index: number) => (
        <Input
          value={record.fieldName}
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
            disabled={fields.length <= 4}
          />
        </Space>
      ),
    },
  ];

  const renderActionRow = (action: Action, index: number, type: 'row' | 'bulk') => (
    <Row gutter={8} key={index}>
      <Col span={type === 'row' ? 10 : 20}>
        <Input
          value={action.form || action.name}
          onChange={(e) => handleActionChange(type, index, type === 'row' ? 'form' : 'name', e.target.value)}
          placeholder={type === 'row' ? 'Form' : 'Name'}
        />
      </Col>
      {type === 'row' && (
        <Col span={10}>
          <Input
            value={action.name}
            onChange={(e) => handleActionChange(type, index, 'name', e.target.value)}
            placeholder="Name"
          />
        </Col>
      )}
      <Col span={4}>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveAction(type, index)}
          danger
        />
      </Col>
    </Row>
  );

  const handleActionChange = (type: 'row' | 'bulk', index: number, key: keyof Action, value: string) => {
    const updatedActions = [...actions[type]];
    updatedActions[index][key] = value;
    setActions(prev => ({
      ...prev,
      [type]: updatedActions,
    }));
  };

  const handleAddAction = (type: 'row' | 'bulk') => {
    const newAction: Action = type === 'row' ? { form: '', name: '' } : { name: '' };
    setActions(prev => ({
      ...prev,
      [type]: [...prev[type], newAction],
    }));
  };

  const handleRemoveAction = (type: 'row' | 'bulk', index: number) => {
    const updatedActions = actions[type].filter((_, i) => i !== index);
    setActions(prev => ({
      ...prev,
      [type]: updatedActions,
    }));
  };

  return (
    <div>
      <h2>Kanban View Configuration</h2>

       <Title level={4}>Types and Lanes </Title>
      <Table
        dataSource={Object.entries(types).map(([key, value]) => ({ key, ...value }))}
        columns={typeColumns}
        rowKey="key"
        pagination={false}
        expandable={{
          expandedRowRender: (record) => (
            <Table
              columns={laneColumns(record.key)}
              dataSource={record.lanes}
              rowKey="sequence"
              pagination={false}
            />
          ),
        }}
        style={{ marginBottom: '20px' }}
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddType}
        style={{ marginBottom: '20px' }}
      >
        Add Type
      </Button>

       <Title level={4}>Card Fields </Title>
      <Table
        dataSource={fields}
        columns={fieldColumns}
        rowKey="order"
        pagination={false}
        style={{ marginBottom: '20px' }}
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddField}
        style={{ marginBottom: '20px' }}
        disabled={fields.length >= 4}
      >
        Add Field
      </Button>

       <Title level={4}>Actions </Title>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <h4>Row Actions:</h4>
          {actions.row.map((action, index) => renderActionRow(action, index, 'row'))}
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
          {actions.bulk.map((action, index) => renderActionRow(action, index, 'bulk'))}
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
      <Select
        value={groupBy}
        onChange={(value) => setGroupBy(value)}
        style={{ width: '100%' }}
        placeholder="Select groupBy option"
      >
        {Object.keys(types).map(typeKey => (
          <Option key={typeKey} value={typeKey}>{types[typeKey].name}</Option>
        ))}
      </Select>

       <Title level={4}>Export Options </Title>
      <Select
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
          { label: 'Group By', value: 'groupBy' },
          { label: 'Export', value: 'export' },
        ]}
        value={showFeatures}
        onChange={setShowFeatures}
      />

      <Button type="primary" onClick={handleSaveConfig} style={{ marginTop: '20px' }}>
        Save Configuration
      </Button>

      <Modal
        title={currentLaneIndex !== null ? 'Edit Lane' : 'Add Lane'}
        open={laneModalVisible}
        onOk={handleLaneOk}
        onCancel={() => setLaneModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Lane Name" rules={[{ required: true, message: 'Please input lane name' }]}>
            <Input placeholder="Lane Name" />
          </Form.Item>
          <Form.Item name="color" label="Color" rules={[{ required: true, message: 'Please select a color' }]}>
            <Input type="color" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KanbanViewConfig;
