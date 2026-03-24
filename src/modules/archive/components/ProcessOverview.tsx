// src/modules/archive/components/ProcessOverview.tsx
import React, { useState } from 'react';
import { Table, Button, Drawer, Space, Select, InputNumber, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';

interface PERTValues {
  optimistic: number;
  likely: number;
  pessimistic: number;
  aspirational?: number;
}

interface Role {
  roleId: string;
  name: string;
  skillLevel: string;
  skill: string[];
  maxConcurrentTasks: number;
  costVariability: PERTValues;
  cost_overrun: string[];
}

interface Material {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  costVariability: PERTValues;
}

interface Blueprint {
  roles: Role[];
  materials: Material[];
}

interface ProcessOverviewProps {
  initialData: {
    blueprint: Blueprint;
  };
}

const PERTInput: React.FC<{
  optimistic: number;
  likely: number;
  pessimistic: number;
  aspirational?: number;
  onChange: (field: string, value: number | null) => void;
}> = ({ optimistic, likely, pessimistic, aspirational, onChange }) => {
  return (
    <Space direction="vertical" size="small">
      <Space>
        <InputNumber size="small" value={optimistic} onChange={(val) => onChange('optimistic', val)} placeholder="Opt" />
        <InputNumber size="small" value={likely} onChange={(val) => onChange('likely', val)} placeholder="Lik" />
      </Space>
      <Space>
        <InputNumber size="small" value={pessimistic} onChange={(val) => onChange('pessimistic', val)} placeholder="Pes" />
        <InputNumber size="small" value={aspirational} onChange={(val) => onChange('aspirational', val)} placeholder="Asp" />
      </Space>
    </Space>
  );
};

const ProcessOverview: React.FC<ProcessOverviewProps> = ({ initialData }) => {
  const [localData, setLocalData] = useState(initialData);
  const [jsonVisible, setJsonVisible] = useState(false);

  const handleChange = (key: string, value: any, index: number, dataType: 'roles' | 'materials') => {
    setLocalData((prevData) => {
      const data = [...prevData.blueprint[dataType]];
      data[index] = { ...data[index], [key]: value };
      return {
        ...prevData,
        blueprint: {
          ...prevData.blueprint,
          [dataType]: data,
        },
      };
    });
  };

  const handlePERTChange = (field: string, value: number | null, index: number, dataType: 'roles' | 'materials') => {
    setLocalData((prevData) => {
      const data = [...prevData.blueprint[dataType]];
      data[index] = {
        ...data[index],
        costVariability: {
          ...data[index].costVariability,
          [field]: value
        }
      };
      return {
        ...prevData,
        blueprint: {
          ...prevData.blueprint,
          [dataType]: data,
        },
      };
    });
  };

  const addRow = (dataType: 'roles' | 'materials') => {
    setLocalData((prevData) => {
      const newRow = dataType === 'roles' ? {
        roleId: `role_${Date.now()}`,
        name: '',
        skillLevel: 'Intermediate',
        skill: [],
        maxConcurrentTasks: 2,
        costVariability: { optimistic: 0, likely: 0, pessimistic: 0 },
        cost_overrun: [],
      } : {
        id: `mat_${Date.now()}`,
        name: '',
        unit: '',
        costPerUnit: 0,
        costVariability: { optimistic: 0, likely: 0, pessimistic: 0 },
      };

      return {
        ...prevData,
        blueprint: {
          ...prevData.blueprint,
          [dataType]: [...prevData.blueprint[dataType], newRow as any],
        },
      };
    });
  };

  const roleColumns = [
    { title: 'Role ID', dataIndex: 'roleId', key: 'roleId' },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (text: string, _record: any, index: number) => (
        <Input value={text} onChange={(e) => handleChange('name', e.target.value, index, 'roles')} />
      ),
    },
    {
      title: 'Skill Level',
      dataIndex: 'skillLevel',
      render: (text: string, _record: any, index: number) => (
        <Select value={text} style={{ width: 120 }} onChange={(val) => handleChange('skillLevel', val, index, 'roles')}>
          <Select.Option value="Junior">Junior</Select.Option>
          <Select.Option value="Intermediate">Intermediate</Select.Option>
          <Select.Option value="Senior">Senior</Select.Option>
        </Select>
      ),
    },
    {
      title: 'Cost Variability',
      dataIndex: 'costVariability',
      render: (text: PERTValues, _record: any, index: number) => (
        <PERTInput
          optimistic={text.optimistic}
          likely={text.likely}
          pessimistic={text.pessimistic}
          aspirational={text.aspirational}
          onChange={(field, val) => handlePERTChange(field, val, index, 'roles')}
        />
      ),
    },
  ];

  const materialColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (text: string, _record: any, index: number) => (
        <Input value={text} onChange={(e) => handleChange('name', e.target.value, index, 'materials')} />
      ),
    },
    {
      title: 'Cost per Unit',
      dataIndex: 'costPerUnit',
      render: (text: number, _record: any, index: number) => (
        <InputNumber value={text} onChange={(val) => handleChange('costPerUnit', val, index, 'materials')} />
      ),
    },
    {
      title: 'Cost Variability',
      dataIndex: 'costVariability',
      render: (text: PERTValues, _record: any, index: number) => (
        <PERTInput
          optimistic={text.optimistic}
          likely={text.likely}
          pessimistic={text.pessimistic}
          aspirational={text.aspirational}
          onChange={(field, val) => handlePERTChange(field, val, index, 'materials')}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      <Space style={{ marginBottom: 16 }}>
        <h2>Process Blueprint Configuration</h2>
        <Button onClick={() => setJsonVisible(true)} type="dashed">View Source JSON</Button>
      </Space>

      <h3>Human Resources / Roles</h3>
      <Table columns={roleColumns} dataSource={localData.blueprint.roles} rowKey="roleId" pagination={false} size="small" />
      <Button onClick={() => addRow('roles')} icon={<PlusOutlined />} style={{ marginTop: 8 }}>Add Role</Button>

      <h3 style={{ marginTop: 24 }}>Materials / Resources</h3>
      <Table columns={materialColumns} dataSource={localData.blueprint.materials} rowKey="id" pagination={false} size="small" />
      <Button onClick={() => addRow('materials')} icon={<PlusOutlined />} style={{ marginTop: 8 }}>Add Material</Button>

      <Drawer title="Blueprint JSON" width="60%" onClose={() => setJsonVisible(false)} open={jsonVisible}>
        <AceEditor
          mode="json"
          theme="monokai"
          value={JSON.stringify(localData, null, 2)}
          readOnly
          width="100%"
          height="100%"
          setOptions={{ useWorker: false }}
        />
      </Drawer>
    </div>
  );
};

export default ProcessOverview;
