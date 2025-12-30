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
  form?: string;
  name: string;
}

interface GanttViewConfigData {
  fields?: {
    name?: string;
    start_date?: string;
    due_date?: string;
    progress?: string;
    [key: string]: string | undefined; // Allow additional fields
  };
  actions?: { row: Action[]; bulk: Action[] };
  showFeatures?: string[];
  exportOptions?: string[];
}

interface MetadataItem {
  key: string;
  display_name: string;
  is_displayable?: boolean;
  foreign_key?: boolean;
}

interface GanttViewConfigProps {
  configData: GanttViewConfigData;
  onSave: (data: GanttViewConfigData) => void;
  availableColumns: any[];
  metadata?: MetadataItem[];
}

const GanttViewConfig: React.FC<GanttViewConfigProps> = ({
  configData,
  onSave,
  availableColumns,
  metadata,
}) => {
  const [fields, setFields] = useState<Field[]>(() => {
    const initialFields: Field[] = [
      { order: 1, fieldName: configData?.fields?.name || '', fieldPath: configData?.fields?.name || '' },
      { order: 2, fieldName: configData?.fields?.start_date || '', fieldPath: configData?.fields?.start_date || '' },
      { order: 3, fieldName: configData?.fields?.due_date || '', fieldPath: configData?.fields?.due_date || '' },
      { order: 4, fieldName: configData?.fields?.progress || '', fieldPath: configData?.fields?.progress || '' },
    ];
    // Load additional fields from configData
    if (configData?.fields) {
      Object.entries(configData.fields).forEach(([key, value]) => {
        if (!['name', 'start_date', 'due_date', 'progress'].includes(key) && value) {
          initialFields.push({
            order: initialFields.length + 1,
            fieldName: key,
            fieldPath: value,
          });
        }
      });
    }
    return initialFields;
  });
  const [actions, setActions] = useState<{
    row: Action[];
    bulk: Action[];
  }>({
    row: configData?.actions?.row || [],
    bulk: configData?.actions?.bulk || [],
  });
  const [exportOptions, setExportOptions] = useState<string[]>(configData?.exportOptions || ['pdf', 'csv']);
  const [showFeatures, setShowFeatures] = useState<string[]>(
    configData?.showFeatures || ['search', 'enable_view', 'columnVisibility', 'pagination', 'export', 'rowActions', 'edit', 'zoom']
  );

  useEffect(() => {
    const newFields: Field[] = [
      { order: 1, fieldName: configData?.fields?.name || '', fieldPath: configData?.fields?.name || '' },
      { order: 2, fieldName: configData?.fields?.start_date || '', fieldPath: configData?.fields?.start_date || '' },
      { order: 3, fieldName: configData?.fields?.due_date || '', fieldPath: configData?.fields?.due_date || '' },
      { order: 4, fieldName: configData?.fields?.progress || '', fieldPath: configData?.fields?.progress || '' },
    ];
    if (configData?.fields) {
      Object.entries(configData.fields).forEach(([key, value]) => {
        if (!['name', 'start_date', 'due_date', 'progress'].includes(key) && value) {
          newFields.push({
            order: newFields.length + 1,
            fieldName: key,
            fieldPath: value,
          });
        }
      });
    }
    setFields(newFields);
    setActions({
      row: configData?.actions?.row || [],
      bulk: configData?.actions?.bulk || [],
    });
    setExportOptions(configData?.exportOptions || ['pdf', 'csv']);
    setShowFeatures(configData?.showFeatures || ['search', 'enable_view', 'columnVisibility', 'pagination', 'export', 'rowActions', 'edit', 'zoom']);
  }, [configData]);

  const transformedColumns = metadata?.filter(col => col?.is_displayable === true)?.map(col => col.key) || [];

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

  const handleAddField = () => {
    setFields([...fields, { order: fields.length + 1, fieldName: '', fieldPath: '' }]);
  };

  const handleRemoveField = (index: number) => {
    if (fields.length > 4) { // Ensure at least 4 fields remain
      setFields(fields.filter((_, i) => i !== index).map((field, i) => ({ ...field, order: i + 1 })));
    } else {
      message.warning('Cannot remove required fields (name, start_date, due_date, progress).');
    }
  };

  const moveField = (index: number, direction: number) => {
    const newFields = [...fields];
    const [movedField] = newFields.splice(index, 1);
    newFields.splice(index + direction, 0, movedField);
    setFields(newFields.map((field, i) => ({ ...field, order: i + 1 })));
  };

  const handleSaveConfig = () => {
    const updatedConfig: GanttViewConfigData = {
      fields: {
        name: fields.find(f => f.order === 1)?.fieldPath || '',
        start_date: fields.find(f => f.order === 2)?.fieldPath || '',
        due_date: fields.find(f => f.order === 3)?.fieldPath || '',
        progress: fields.find(f => f.order === 4)?.fieldPath || '',
      },
      actions,
      exportOptions,
      showFeatures,
    };
    // Add additional fields dynamically
    fields.slice(4).forEach(field => {
      updatedConfig.fields![`custom_${field.order}`] = field.fieldPath;
    });
    onSave(updatedConfig);
    message.success('Gantt configuration saved successfully!');
  };

  const handleAddAction = (type: 'row' | 'bulk') => {
    const newAction: Action = { name: '' };
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
    const updatedActions = actions[type].filter((_, i) => i !== index);
    setActions(prev => ({
      ...prev,
      [type]: updatedActions,
    }));
  };

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

  const fieldColumns = [
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      width: 80,
    },
    {
      title: 'Field Role',
      dataIndex: 'order',
      key: 'fieldRole',
      render: (order: number) => {
        const roles = ['name', 'start_date', 'due_date', 'progress'];
        return roles[order - 1] || `Custom ${order}`;
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
            onClick={() => handleRemoveField(index)}
            danger
            disabled={index < 4} // Prevent deleting required fields
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>Gantt View Configuration</h2>

       <Title level={4}>Fields </Title>
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
          { label: 'Search', value: 'search' },
          { label: 'Enable View', value: 'enable_view' },
          { label: 'Column Visibility', value: 'columnVisibility' },
          { label: 'Pagination', value: 'pagination' },
          { label: 'Export', value: 'export' },
          { label: 'Row Actions', value: 'rowActions' },
          { label: 'Edit', value: 'edit' },
          { label: 'Zoom', value: 'zoom' },
        ]}
        value={showFeatures}
        onChange={setShowFeatures}
      />

      <Button type="primary" onClick={handleSaveConfig} style={{ marginTop: '20px' }}>
        Save Configuration
      </Button>
    </div>
  );
};

export default GanttViewConfig;
