import React from 'react';
import { Button, Card, Typography, Popconfirm, Tag, Space, Divider, Badge, Tooltip } from 'antd';
import { Plus, Trash2, ArrowRight, MousePointer, Zap, Shield } from 'lucide-react';

const { Text, Title } = Typography;

interface Transition {
  id?: string;
  label?: string;
  from: string;
  to: string;
  type?: 'forward' | 'backward' | 'cancellation' | 'other';
  trigger?: 'manual' | 'auto';
  is_manual?: boolean;
  ui?: {
    icon?: string;
    button_variant?: string;
    confirm_message?: string;
    button_color?: string;
  };
  guard_rules?: {
    allowed_roles?: string[];
    validation_rpc?: string;
    required_fields?: string[];
  };
  condition?: any;
}

interface TransitionManagerProps {
  transitions: Transition[];
  onChange: (transitions: Transition[]) => void;
  stages: { id: string; name: string; sequence?: number; category?: string }[];
  fields: any[]; // Entity metadata fields
  onEdit: (index: number, transition: Transition) => void;
}

const TransitionManager: React.FC<TransitionManagerProps> = ({ transitions, onChange, stages, fields, onEdit }) => {
  const handleAdd = () => {
    const stageList = Array.isArray(stages) ? stages : [];
    const fromStage = stageList[0]?.id || '';
    const toStage = stageList[1]?.id || stageList[0]?.id || '';
    
    // Auto-derive ID
    const newId = `${fromStage}_to_${toStage}`;
    
    const newTransition: Transition = {
      id: newId,
      label: `To ${stageList.find(s => s.id === toStage)?.name || 'Next'}`,
      from: fromStage,
      to: toStage,
      type: 'forward',
      trigger: 'manual',
      is_manual: true,
      ui: {
        icon: 'arrow-right',
        button_variant: 'primary',
        button_color: '#1677ff'
      },
      guard_rules: {
        allowed_roles: [],
        required_fields: []
      },
      condition: { combinator: 'and', rules: [] }
    };
    
    const newList = [...(Array.isArray(transitions) ? transitions : []), newTransition];
    onChange(newList);
    
    // Open editor for the new transition
    onEdit(newList.length - 1, newTransition);
  };

  const handleDelete = (index: number) => {
    onChange((Array.isArray(transitions) ? transitions : []).filter((_, i) => i !== index));
  };

  const data = Array.isArray(transitions) ? transitions : [];
  const stageList = Array.isArray(stages) ? stages : [];

  return (
    <div className="transition-manager">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5} style={{ margin: 0 }}>Workflow Transitions</Title>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
          Add Transition
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((t, index) => (
          <Card 
            key={index} 
            size="small" 
            hoverable
            className="transition-card" 
            style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
            onClick={() => onEdit(index, t)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: '8px', 
                background: (t.trigger === 'manual' || t.is_manual) ? '#e6f7ff' : '#f6ffed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (t.trigger === 'manual' || t.is_manual) ? '#1890ff' : '#52c41a'
              }}>
                {(t.trigger === 'manual' || t.is_manual) ? <MousePointer size={16} /> : <Zap size={16} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong>{t.label || t.id || 'Untitled Transition'}</Text>
                  <Tag color={t.type === 'forward' ? 'blue' : t.type === 'backward' ? 'orange' : 'red'}>
                    {t.type || 'forward'}
                  </Tag>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>{stageList.find(s => s.id === t.from)?.name || t.from}</Text>
                  <ArrowRight size={12} color="#bfbfbf" />
                  <Text type="secondary" style={{ fontSize: '12px' }}>{stageList.find(s => s.id === t.to)?.name || t.to}</Text>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Space>
                    <Divider type="vertical" />
                    {(t.trigger === 'manual' || t.is_manual) && (
                        <Tooltip title={`Button: ${t.label || 'Continue'}`}>
                            <Badge dot status="processing" style={{ color: t.ui?.button_color || '#1677ff' }} />
                        </Tooltip>
                    )}
                    {t.guard_rules?.required_fields && t.guard_rules.required_fields.length > 0 && (
                        <Tooltip title={`${t.guard_rules.required_fields.length} required fields`}>
                            <Badge count={t.guard_rules.required_fields.length} size="small" style={{ backgroundColor: '#faad14' }} />
                        </Tooltip>
                    )}
                    {t.condition && (t.condition as any).rules?.length > 0 && (
                        <Tooltip title="Condition Rules Defined">
                            <Badge status="success" size="small" />
                            <Shield size={10} style={{ marginLeft: -4, color: '#52c41a' }} />
                        </Tooltip>
                    )}
                </Space>
                <div onClick={(e) => e.stopPropagation()}>
                    <Popconfirm
                        title="Delete Transition"
                        description="Are you sure you want to remove this transition?"
                        onConfirm={() => handleDelete(index)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="text" danger icon={<Trash2 size={16} />} />
                    </Popconfirm>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {data.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fafafa', borderRadius: '12px' }}>
            <div style={{ color: '#bfbfbf', marginBottom: '8px' }}><ArrowRight size={32} /></div>
            <Text type="secondary">No transitions defined yet. Connect your stages to automate your process.</Text>
          </div>
        )}
      </div>

      <style>{`
        .transition-card:hover {
          border-color: #1677ff !important;
          background: #fafafa;
        }
      `}</style>
    </div>
  );
};

export default TransitionManager;
