import React from 'react';
import { Button, Select, Popconfirm, Card, Typography, Input } from 'antd';
import { Plus, Trash2, Zap } from 'lucide-react';
import { QueryBuilder, RuleGroupType } from 'react-querybuilder';

const { Text } = Typography;

interface Automation {
  event: 'on_enter' | 'on_exit' | 'on_update' | 'on_sla_breach' | 'on_cron';
  target_stage_id?: string;
  condition?: RuleGroupType;
  actions: { type: string; payload: any }[];
}

interface AutomationManagerProps {
  automations: Automation[];
  onChange: (automations: Automation[]) => void;
  stages: { id: string; name: string }[];
  fields: any[]; // Entity metadata fields
}

const AutomationManager: React.FC<AutomationManagerProps> = ({ automations, onChange, stages, fields }) => {
  
  const EVENT_TYPES = [
    { label: 'On Enter Stage', value: 'on_enter' },
    { label: 'On Exit Stage', value: 'on_exit' },
    { label: 'On Field Update', value: 'on_update' },
    { label: 'On SLA Breach', value: 'on_sla_breach' },
    { label: 'Scheduled (Cron)', value: 'on_cron' },
  ];

  const ACTION_TYPES = [
    { label: 'Update Field', value: 'update_field' },
    { label: 'Send Notification', value: 'send_notification' },
    { label: 'Trigger Webhook', value: 'trigger_webhook' },
    { label: 'Create Task', value: 'create_task' },
    { label: 'Move to Stage', value: 'move_to_stage' },
  ];

  const handleAdd = () => {
    const newAutomation: Automation = {
      event: 'on_enter',
      condition: { combinator: 'and', rules: [] },
      actions: [{ type: 'update_field', payload: {} }]
    };
    onChange([...(Array.isArray(automations) ? automations : []), newAutomation]);
  };

  const handleFieldChange = (index: number, field: keyof Automation, value: any) => {
    const newAutomations = [...(Array.isArray(automations) ? automations : [])];
    newAutomations[index] = { ...newAutomations[index], [field]: value };
    onChange(newAutomations);
  };

  const handleActionChange = (index: number, actionIndex: number, field: string, value: any) => {
    const newAutomations = [...(Array.isArray(automations) ? automations : [])];
    const newActions = [...(newAutomations[index].actions || [])];
    newActions[actionIndex] = { ...newActions[actionIndex], [field]: value };
    newAutomations[index] = { ...newAutomations[index], actions: newActions };
    onChange(newAutomations);
  };

  const handleDelete = (index: number) => {
    onChange((Array.isArray(automations) ? automations : []).filter((_, i) => i !== index));
  };

  const qbFields = (Array.isArray(fields) ? fields : []).map(f => ({
    name: f.key,
    label: f.display_name || f.key,
    type: f.type === 'integer' || f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string',
  }));

  const data = Array.isArray(automations) ? automations : [];

  return (
    <div className="automation-manager">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
          Add Automation
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.map((a, index) => {
          // Ensure condition has rules array and combinator for QueryBuilder
          const condition = { 
            combinator: 'and', 
            rules: [], 
            ...(typeof a.condition === 'object' ? a.condition : {}) 
          };
            
          return (
            <Card key={index} size="small" className="automation-card shadow-sm" style={{ borderLeft: '4px solid #1677ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Zap size={18} className="text-blue-500" />
                <Select 
                  value={a.event} 
                  style={{ width: 150 }} 
                  onChange={(v) => handleFieldChange(index, 'event', v)}
                  options={EVENT_TYPES}
                />
                
                {(a.event === 'on_enter' || a.event === 'on_exit') && (
                  <Select 
                    value={a.target_stage_id} 
                    style={{ width: 150 }} 
                    onChange={(v) => handleFieldChange(index, 'target_stage_id', v)}
                    placeholder="Select Stage..."
                    options={(Array.isArray(stages) ? stages : []).map(s => ({ label: s.name, value: s.id }))}
                  />
                )}

                <div style={{ flex: 1 }} />

                <Popconfirm title="Remove this automation?" onConfirm={() => handleDelete(index)}>
                  <Button type="text" danger icon={<Trash2 size={16} />} />
                </Popconfirm>
              </div>

              <div style={{ padding: '8px', background: '#f9f9f9', borderRadius: '4px', marginBottom: '12px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Conditions:</Text>
                <QueryBuilder 
                  fields={qbFields}
                  query={condition}
                  onQueryChange={(q) => handleFieldChange(index, 'condition', q)}
                />
              </div>

              <div style={{ padding: '8px', borderTop: '1px dashed #eee' }}>
                <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>Execute Actions:</Text>
                {(Array.isArray(a.actions) ? a.actions : []).map((action, actionIndex) => (
                  <div key={actionIndex} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <Select 
                      value={action.type} 
                      style={{ width: 150 }} 
                      options={ACTION_TYPES}
                      onChange={(v) => handleActionChange(index, actionIndex, 'type', v)}
                    />
                    <Input 
                      placeholder="Payload (JSON or Text)" 
                      value={typeof action.payload === 'object' ? JSON.stringify(action.payload) : action.payload} 
                      onChange={(e) => handleActionChange(index, actionIndex, 'payload', e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {data.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
            <Text type="secondary">No automations defined for this blueprint.</Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationManager;
