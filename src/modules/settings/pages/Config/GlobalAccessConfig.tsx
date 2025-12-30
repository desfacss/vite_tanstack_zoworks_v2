import React, { useState, useEffect } from 'react';
import { Button, Select, Table, Space, Checkbox, Row, Col, Input, message, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
const { Title } = Typography;
const { Option } = Select;

interface Filter {
  type: string;
  name: string;
  label: string;
  placeholder: string | string[];
  options?: { value: string; label: string }[];
}

interface AccessRule {
  a: string;
  b: string;
  op: string;
}

interface GlobalConfig {
  search?: {
    fields: string[];
    placeholder: string;
  };
  showFeatures?: string[];
  filters?: Filter[];
}

interface AccessConfig {
  canEdit?: AccessRule[];
  canDelete?: AccessRule[];
}

interface GlobalAccessConfigProps {
  configData: {
    global?: GlobalConfig;
    access_config?: AccessConfig;
  };
  onSave?: (data: { global: GlobalConfig; access_config: AccessConfig }) => void;
  availableColumns: string[];
  entityType?: string;
}

const GlobalAccessConfig: React.FC<GlobalAccessConfigProps> = ({
  configData,
  onSave,
  availableColumns,
  entityType,
}) => {
  const [global, setGlobal] = useState<GlobalConfig>(
    configData?.global || {
      search: { fields: [], placeholder: '' },
      showFeatures: [],
      filters: [],
    }
  );
  const [accessConfig, setAccessConfig] = useState<AccessConfig>(
    configData?.access_config || {
      canEdit: [],
      canDelete: [],
    }
  );

  // Sync state with configData changes
  useEffect(() => {
    setGlobal(
      configData?.global || {
        search: { fields: [], placeholder: '' },
        showFeatures: [],
        filters: [],
      }
    );
    setAccessConfig(
      configData?.access_config || {
        canEdit: [],
        canDelete: [],
      }
    );
  }, [configData]);

  const handleGlobalChange = (key: keyof GlobalConfig, value: any) => {
    setGlobal(prev => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (key: 'fields' | 'placeholder', value: any) => {
    setGlobal(prev => ({
      ...prev,
      search: { ...prev.search!, [key]: value },
    }));
  };

  const handleAddFilter = () => {
    setGlobal(prev => ({
      ...prev,
      filters: [...(prev.filters || []), { type: 'text', name: '', label: '', placeholder: '' }],
    }));
  };

  const handleFilterChange = (index: number, key: keyof Filter, value: any) => {
    const updatedFilters = [...(global.filters || [])];
    updatedFilters[index] = { ...updatedFilters[index], [key]: value };
    setGlobal(prev => ({ ...prev, filters: updatedFilters }));
  };

  const handleRemoveFilter = (index: number) => {
    const updatedFilters = (global.filters || []).filter((_, i) => i !== index);
    setGlobal(prev => ({ ...prev, filters: updatedFilters }));
  };

  const handleAddFilterOption = (filterIndex: number) => {
    const updatedFilters = [...(global.filters || [])];
    updatedFilters[filterIndex].options = [...(updatedFilters[filterIndex].options || []), { value: '', label: '' }];
    setGlobal(prev => ({ ...prev, filters: updatedFilters }));
  };

  const handleFilterOptionChange = (filterIndex: number, optionIndex: number, key: 'value' | 'label', value: string) => {
    const updatedFilters = [...(global.filters || [])];
    updatedFilters[filterIndex].options![optionIndex] = {
      ...updatedFilters[filterIndex].options![optionIndex],
      [key]: value,
    };
    setGlobal(prev => ({ ...prev, filters: updatedFilters }));
  };

  const handleRemoveFilterOption = (filterIndex: number, optionIndex: number) => {
    const updatedFilters = [...(global.filters || [])];
    updatedFilters[filterIndex].options = updatedFilters[filterIndex].options!.filter((_, i) => i !== optionIndex);
    setGlobal(prev => ({ ...prev, filters: updatedFilters }));
  };

  const handleAccessRuleChange = (type: 'canEdit' | 'canDelete', index: number, key: keyof AccessRule, value: string) => {
    const updatedRules = [...(accessConfig[type] || [])];
    updatedRules[index] = { ...updatedRules[index], [key]: value };
    setAccessConfig(prev => ({ ...prev, [type]: updatedRules }));
  };

  const handleAddAccessRule = (type: 'canEdit' | 'canDelete') => {
    setAccessConfig(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), { a: '', b: '', op: '' }],
    }));
  };

  const handleRemoveAccessRule = (type: 'canEdit' | 'canDelete', index: number) => {
    const updatedRules = (accessConfig[type] || []).filter((_, i) => i !== index);
    setAccessConfig(prev => ({ ...prev, [type]: updatedRules }));
  };

  const handleSaveConfig = async () => {
    try {
      const updatedConfig = { global, access_config: accessConfig };
      if (onSave) {
        onSave(updatedConfig);
      }
      message.success('Global and Access Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      message.error('Failed to save Global and Access Configuration');
    }
  };

  const filterColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (text: string, record: Filter, index: number) => (
        <Select
          value={text}
          onChange={(value) => handleFilterChange(index, 'type', value)}
          style={{ width: '100%' }}
        >
          <Option value="text">Text</Option>
          <Option value="select">Select</Option>
          <Option value="date-range">Date Range</Option>
        </Select>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Filter, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleFilterChange(index, 'name', e.target.value)}
          placeholder="Filter Name"
        />
      ),
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: Filter, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleFilterChange(index, 'label', e.target.value)}
          placeholder="Filter Label"
        />
      ),
    },
    {
      title: 'Placeholder',
      dataIndex: 'placeholder',
      key: 'placeholder',
      render: (text: string | string[], record: Filter, index: number) => (
        <Input
          value={Array.isArray(text) ? text.join(', ') : text}
          onChange={(e) => handleFilterChange(index, 'placeholder', record.type === 'date-range' ? e.target.value.split(', ') : e.target.value)}
          placeholder="Placeholder"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Filter, index: number) => (
        <Space>
          {record.type === 'select' && (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => handleAddFilterOption(index)}
            >
              Add Option
            </Button>
          )}
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRemoveFilter(index)}
          />
        </Space>
      ),
    },
  ];

  const optionColumns = (filterIndex: number) => [
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: { value: string; label: string }, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleFilterOptionChange(filterIndex, index, 'value', e.target.value)}
          placeholder="Option Value"
        />
      ),
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: { value: string; label: string }, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleFilterOptionChange(filterIndex, index, 'label', e.target.value)}
          placeholder="Option Label"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, __: any, index: number) => (
        <Button
          icon={<DeleteOutlined />}
          danger
          onClick={() => handleRemoveFilterOption(filterIndex, index)}
        />
      ),
    },
  ];

  const accessRuleColumns = (type: 'canEdit' | 'canDelete') => [
    {
      title: 'Field A',
      dataIndex: 'a',
      key: 'a',
      render: (text: string, record: AccessRule, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleAccessRuleChange(type, index, 'a', e.target.value)}
          placeholder="Field A"
        />
      ),
    },
    {
      title: 'Field B',
      dataIndex: 'b',
      key: 'b',
      render: (text: string, record: AccessRule, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleAccessRuleChange(type, index, 'b', e.target.value)}
          placeholder="Field B"
        />
      ),
    },
    {
      title: 'Operator',
      dataIndex: 'op',
      key: 'op',
      render: (text: string, record: AccessRule, index: number) => (
        <Select
          value={text}
          onChange={(value) => handleAccessRuleChange(type, index, 'op', value)}
          style={{ width: '100%' }}
        >
          <Option value="eq">Equal</Option>
          <Option value="neq">Not Equal</Option>
        </Select>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, __: any, index: number) => (
        <Button
          icon={<DeleteOutlined />}
          danger
          onClick={() => handleRemoveAccessRule(type, index)}
        />
      ),
    },
  ];

  return (
    <div>
      <h2>Global and Access Configuration</h2>

       <Title level={4}>Global Search </Title>
      <Row gutter={16}>
        <Col span={12}>
          <Select
            mode="tags"
            value={global.search?.fields}
            onChange={(value) => handleSearchChange('fields', value)}
            style={{ width: '100%' }}
            placeholder="Select search fields"
          >
            {availableColumns?.map(col => (
              <Option key={col} value={col}>{col}</Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <Input
            value={global.search?.placeholder}
            onChange={(e) => handleSearchChange('placeholder', e.target.value)}
            placeholder="Search placeholder"
          />
        </Col>
      </Row>

       <Title level={4}>Show Features </Title>
      <Checkbox.Group
        options={[
          { label: 'Search', value: 'search' },
          { label: 'Full Screen View', value: 'fullScreenView' },
        ]}
        value={global.showFeatures}
        onChange={(value) => handleGlobalChange('showFeatures', value)}
      />

       <Title level={4}>Filters </Title>
      <Table
        columns={filterColumns}
        dataSource={global.filters}
        rowKey={(record, index) => index?.toString() || ''}
        pagination={false}
        expandable={{
          expandedRowRender: (record, index) =>
            record.type === 'select' && (
              <Table
                columns={optionColumns(index)}
                dataSource={record.options}
                rowKey={(rec, idx) => idx?.toString() || ''}
                pagination={false}
              />
            ),
        }}
        style={{ marginBottom: '20px' }}
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddFilter}
        style={{ marginBottom: '20px' }}
      >
        Add Filter
      </Button>

       <Title level={4}>Access Configuration </Title>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <h4>Can Edit Rules</h4>
          <Table
            columns={accessRuleColumns('canEdit')}
            dataSource={accessConfig.canEdit}
            rowKey={(record, index) => index?.toString() || ''}
            pagination={false}
          />
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => handleAddAccessRule('canEdit')}
            style={{ marginTop: '10px' }}
          >
            Add Edit Rule
          </Button>
        </Col>
        <Col span={12}>
          <h4>Can Delete Rules</h4>
          <Table
            columns={accessRuleColumns('canDelete')}
            dataSource={accessConfig.canDelete}
            rowKey={(record, index) => index?.toString() || ''}
            pagination={false}
          />
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => handleAddAccessRule('canDelete')}
            style={{ marginTop: '10px' }}
          >
            Add Delete Rule
          </Button>
        </Col>
      </Row>

      <Button type="primary" onClick={handleSaveConfig} style={{ marginTop: '20px' }}>
        Save Configuration
      </Button>
    </div>
  );
};

export default GlobalAccessConfig;
