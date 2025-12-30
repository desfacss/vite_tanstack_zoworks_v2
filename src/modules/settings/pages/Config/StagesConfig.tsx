import React, { useState, useEffect } from 'react';
import { Button, Table, Space, Input, InputNumber, message } from 'antd';
import { PlusOutlined, UpOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons';

interface Stage {
  ordinal: number;
  stage_name: string;
  sla_hours: number | null;
  first_response_hours: number | null;
  [key: string]: any; // Allow dynamic fields
}

interface StagesConfigProps {
  configData: Stage[];
  onSave?: (data: Stage[]) => void;
}

const StagesConfig: React.FC<StagesConfigProps> = ({ configData, onSave }) => {
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    // Handle configData being an object, array, or undefined
    let stagesArray: Stage[] = [];
    if (Array.isArray(configData)) {
      stagesArray = configData;
    } else if (configData && typeof configData === 'object') {
      // If it's an object with a stages property
      stagesArray = Array.isArray((configData as any).stages) ? (configData as any).stages : [];
    }
    // Sort stages by ordinal when loading
    const sortedStages = [...stagesArray].sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0));
    setStages(sortedStages);
  }, [configData]);

  const handleAddStage = () => {
    setStages([
      ...stages,
      {
        ordinal: stages.length,
        stage_name: '',
        sla_hours: null,
        first_response_hours: null,
      },
    ]);
  };

  const handleStageChange = (index: number, key: keyof Stage, value: any) => {
    const updatedStages = [...stages];
    updatedStages[index][key] = value;
    setStages(updatedStages);
  };

  const handleRemoveStage = (index: number) => {
    const updatedStages = stages.filter((_, i) => i !== index);
    setStages(updatedStages.map((stage, i) => ({ ...stage, ordinal: i })));
  };

  const moveStage = (index: number, direction: number) => {
    const newStages = [...stages];
    const [movedStage] = newStages.splice(index, 1);
    newStages.splice(index + direction, 0, movedStage);
    setStages(newStages.map((stage, i) => ({ ...stage, ordinal: i })));
  };

  const handleSaveConfig = () => {
    if (onSave) {
      onSave(stages);
    }
    message.success('Stages configuration saved successfully!');
  };

  const columns = [
    {
      title: 'Ordinal',
      dataIndex: 'ordinal',
      key: 'ordinal',
    },
    {
      title: 'Stage Name',
      dataIndex: 'stage_name',
      key: 'stage_name',
      render: (_: any, record: Stage, index: number) => (
        <Space>
          <Input
            value={record.stage_name}
            onChange={(e) => handleStageChange(index, 'stage_name', e.target.value)}
            placeholder="Stage Name"
            style={{ width: '200px' }}
          />
          <Button
            icon={<UpOutlined />}
            onClick={() => moveStage(index, -1)}
            disabled={index === 0}
          />
          <Button
            icon={<DownOutlined />}
            onClick={() => moveStage(index, 1)}
            disabled={index === stages.length - 1}
          />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRemoveStage(index)}
          />
        </Space>
      ),
    },
    {
      title: 'SLA Hours',
      dataIndex: 'sla_hours',
      key: 'sla_hours',
      render: (_: any, record: Stage, index: number) => (
        <InputNumber
          value={record.sla_hours}
          onChange={(value) => handleStageChange(index, 'sla_hours', value)}
          placeholder="SLA Hours"
          min={0}
          style={{ width: '100px' }}
        />
      ),
    },
    {
      title: 'First Response Hours',
      dataIndex: 'first_response_hours',
      key: 'first_response_hours',
      render: (_: any, record: Stage, index: number) => (
        <InputNumber
          value={record.first_response_hours}
          onChange={(value) => handleStageChange(index, 'first_response_hours', value)}
          placeholder="First Response Hours"
          min={0}
          style={{ width: '150px' }}
        />
      ),
    },
  ];

  return (
    <div>
      <h2>Stages Configuration</h2>
      <Table
        dataSource={stages}
        columns={columns}
        rowKey="ordinal"
        pagination={false}
        style={{ marginBottom: '20px' }}
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddStage}
        style={{ marginBottom: '20px' }}
      >
        Add Stage
      </Button>
      <Button
        type="primary"
        onClick={handleSaveConfig}
        style={{ marginTop: '20px' }}
      >
        Save Configuration
      </Button>
    </div>
  );
};

export default StagesConfig;
