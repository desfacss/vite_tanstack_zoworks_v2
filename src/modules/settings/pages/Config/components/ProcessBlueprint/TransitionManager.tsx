import React from 'react';
import { Button, Select, Popconfirm, Card, Typography } from 'antd';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { QueryBuilder, RuleGroupType } from 'react-querybuilder';

const { Text } = Typography;

interface Transition {
  from: string;
  to: string;
  condition?: RuleGroupType;
}

interface TransitionManagerProps {
  transitions: Transition[];
  onChange: (transitions: Transition[]) => void;
  stages: { id: string; name: string }[];
  fields: any[]; // Entity metadata fields
}

const TransitionManager: React.FC<TransitionManagerProps> = ({ transitions, onChange, stages, fields }) => {
  
  const handleAdd = () => {
    const stageList = Array.isArray(stages) ? stages : [];
    const newTransition: Transition = {
      from: stageList[0]?.id || '',
      to: stageList[1]?.id || stageList[0]?.id || '',
      condition: { combinator: 'and', rules: [] }
    };
    onChange([...(Array.isArray(transitions) ? transitions : []), newTransition]);
  };

  const handleFieldChange = (index: number, field: keyof Transition, value: any) => {
    const list = [...(Array.isArray(transitions) ? transitions : [])];
    list[index] = { ...list[index], [field]: value };
    onChange(list);
  };

  const handleDelete = (index: number) => {
    onChange((Array.isArray(transitions) ? transitions : []).filter((_, i) => i !== index));
  };

  // Convert entity metadata to QueryBuilder fields
  const qbFields = (Array.isArray(fields) ? fields : []).map(f => ({
    name: f.key,
    label: f.display_name || f.key,
    type: f.type === 'integer' || f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string',
    // Add more type mapping as needed
  }));

  const data = Array.isArray(transitions) ? transitions : [];
  const stageList = Array.isArray(stages) ? stages : [];

  return (
    <div className="transition-manager">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
          Add Transition
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.map((t, index) => {
          // Ensure condition has rules array and combinator for QueryBuilder
          const condition = { 
            combinator: 'and', 
            rules: [], 
            ...(typeof t.condition === 'object' ? t.condition : {}) 
          };

          return (
            <Card key={index} size="small" className="transition-card shadow-sm">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Select 
                  value={t.from} 
                  style={{ width: 150 }} 
                  onChange={(v) => handleFieldChange(index, 'from', v)}
                  placeholder="From Stage"
                >
                  {stageList.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                </Select>
                
                <ArrowRight size={20} className="text-gray-400" />
                
                <Select 
                  value={t.to} 
                  style={{ width: 150 }} 
                  onChange={(v) => handleFieldChange(index, 'to', v)}
                  placeholder="To Stage"
                >
                  {stageList.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                </Select>

                <div style={{ flex: 1 }} />

                <Popconfirm title="Remove this transition?" onConfirm={() => handleDelete(index)}>
                  <Button type="text" danger icon={<Trash2 size={16} />} />
                </Popconfirm>
              </div>

              <div className="condition-builder-wrapper" style={{ padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Conditions for this transition:</Text>
                <QueryBuilder 
                  fields={qbFields}
                  query={condition}
                  onQueryChange={(q) => handleFieldChange(index, 'condition', q)}
                />
              </div>
            </Card>
          );
        })}
        {data.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
            <Text type="secondary">No transitions defined. Start by adding one above.</Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransitionManager;
