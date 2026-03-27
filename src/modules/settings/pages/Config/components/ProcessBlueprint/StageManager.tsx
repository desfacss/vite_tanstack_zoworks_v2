import React from 'react';
import { Table, Button, Input, Select, Popconfirm, ColorPicker } from 'antd';
import { Plus, Trash2 } from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  category: string;
  color?: string;
}

interface StageManagerProps {
  stages: Stage[];
  onChange: (stages: Stage[]) => void;
  categories: string[];
}

const StageManager: React.FC<StageManagerProps> = ({ stages, onChange, categories }) => {
  const handleFieldChange = (id: string, field: keyof Stage, value: any) => {
    const newStages = stages.map(s => s.id === id ? { ...s, [field]: value } : s);
    onChange(newStages);
  };

  const handleAdd = () => {
    const newId = `stage_${stages.length + 1}`;
    const newStage: Stage = {
      id: newId,
      name: 'New Stage',
      category: categories[0] || 'NEW',
      color: '#1677ff'
    };
    onChange([...stages, newStage]);
  };

  const handleDelete = (id: string) => {
    onChange(stages.filter(s => s.id !== id));
  };

  const columns = [
    {
      title: 'ID / Key',
      dataIndex: 'id',
      key: 'id',
      render: (text: string, record: Stage) => (
        <Input 
          value={text} 
          onChange={(e) => handleFieldChange(record.id, 'id', e.target.value)} 
          placeholder="e.g. new_lead"
          disabled={record.id === 'new'}
        />
      )
    },
    {
      title: 'Display Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Stage) => (
        <Input 
          value={text} 
          onChange={(e) => handleFieldChange(record.id, 'name', e.target.value)} 
          placeholder="e.g. New Lead"
        />
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text: string, record: Stage) => (
        <Select 
          value={text} 
          style={{ width: '100%' }}
          onChange={(value) => handleFieldChange(record.id, 'category', value)}
        >
          {categories.map(cat => (
            <Select.Option key={cat} value={cat}>{cat}</Select.Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (text: string, record: Stage) => (
        <ColorPicker 
          value={text || '#1677ff'} 
          onChange={(color) => handleFieldChange(record.id, 'color', color.toHexString())} 
        />
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Stage) => (
        <Popconfirm 
          title="Delete this stage?" 
          onConfirm={() => handleDelete(record.id)}
          disabled={record.id === 'new'}
        >
          <Button 
            type="text" 
            danger 
            icon={<Trash2 size={16} />} 
            disabled={record.id === 'new'}
          />
        </Popconfirm>
      )
    }
  ];

  return (
    <div className="stage-manager">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
          Add Stage
        </Button>
      </div>
      <Table 
        dataSource={stages} 
        columns={columns} 
        rowKey="id" 
        pagination={false} 
        size="small"
      />
    </div>
  );
};

export default StageManager;
