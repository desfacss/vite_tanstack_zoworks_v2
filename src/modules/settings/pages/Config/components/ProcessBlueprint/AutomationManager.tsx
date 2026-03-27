import React, { useState } from 'react';
import { Button, Select, Popconfirm, Card, Typography, Drawer, Form, Input, Switch, Space, Row, Col, Divider, Tag, Badge, Tooltip, Empty } from 'antd';
import { Plus, Trash2, Zap, GripVertical, Activity, Bell, Globe, Database, PlusSquare, Code } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QueryBuilder, RuleGroupType } from 'react-querybuilder';
import ActionConfigForm from './ActionConfigForm';

const { Text, Title } = Typography;
const { Option } = Select;

interface Action {
  type: string;
  config: any;
}

interface Automation {
  id?: string;
  name?: string;
  event: 'on_enter' | 'on_exit' | 'on_transition' | 'on_field_change' | 'on_sla_breach' | 'on_cron';
  target_id?: string;
  condition?: RuleGroupType;
  actions: Action[];
  stop_on_failure?: boolean;
  is_active?: boolean;
  priority?: number;
}

interface AutomationManagerProps {
  automations: Automation[];
  onChange: (automations: Automation[]) => void;
  stages: { id: string; name: string }[];
  transitions: { id: string; label?: string; name?: string }[];
  fields: any[]; // Entity metadata fields
}

interface SortableActionItemProps {
  action: Action;
  index: number;
  onRemove: () => void;
  onUpdate: (updates: Partial<Action>) => void;
  fields: any[];
}

const SortableActionItem: React.FC<SortableActionItemProps> = ({ action, index, onRemove, onUpdate, fields }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `action-${index}` });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    marginBottom: '12px',
    zIndex: isDragging ? 10 : 1,
  };

  const ACTION_TYPES = [
    { label: 'Update Field', value: 'update_field', icon: Database },
    { label: 'Send Notification', value: 'send_notification', icon: Bell },
    { label: 'Trigger Webhook', value: 'trigger_webhook', icon: Globe },
    { label: 'Create Task', value: 'create_task', icon: PlusSquare },
    { label: 'Execute Script', value: 'execute_script', icon: Code },
  ];

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card 
        size="small" 
        style={{ border: '1px solid #f0f0f0', boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div {...listeners} style={{ cursor: 'grab', display: 'flex' }}><GripVertical size={14} color="#bfbfbf" /></div>
            <Badge count={index + 1} size="small" style={{ backgroundColor: '#1677ff' }} />
            <Select 
              size="small"
              value={action.type}
              style={{ width: 180 }}
              onChange={(val) => onUpdate({ type: val, config: {} })}
              options={ACTION_TYPES}
            />
          </div>
        }
        extra={
          <Button type="text" danger size="small" icon={<Trash2 size={14} />} onClick={onRemove} />
        }
      >
        <ActionConfigForm type={action.type} fields={fields} />
      </Card>
    </div>
  );
};

const AutomationManager: React.FC<AutomationManagerProps> = ({ automations, onChange, stages, transitions, fields }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    const newAutomation: Automation = {
      name: 'New Automation',
      event: 'on_enter',
      actions: [{ type: 'update_field', config: {} }],
      condition: { combinator: 'and', rules: [] },
      is_active: true,
      stop_on_failure: false,
      priority: 1
    };
    const newList = [...(Array.isArray(automations) ? automations : []), newAutomation];
    onChange(newList);
    openEditor(newList.length - 1, newAutomation);
  };

  const openEditor = (index: number, automation: Automation) => {
    setEditingIndex(index);
    form.setFieldsValue({
      ...automation,
      // Provide defaults for actions if they don't have the new nested config
      actions: (automation.actions || []).map(a => ({
        type: a.type,
        config: a.config || (a as any).payload || {} // Backwards compatibility for payload
      }))
    });
    setDrawerVisible(true);
  };

  const handleActionReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = parseInt((active.id as string).split('-')[1]);
      const newIndex = parseInt((over?.id as string).split('-')[1]);
      const currentActions = form.getFieldValue('actions') || [];
      const newActions = arrayMove(currentActions, oldIndex, newIndex);
      form.setFieldsValue({ actions: newActions });
    }
  };

  const saveDetails = () => {
    form.validateFields().then(values => {
      const newList = [...(Array.isArray(automations) ? automations : [])];
      if (editingIndex !== null) {
        newList[editingIndex] = { ...newList[editingIndex], ...values };
        onChange(newList);
      }
      setDrawerVisible(false);
    });
  };

  const handleDelete = (index: number) => {
    onChange((Array.isArray(automations) ? automations : []).filter((_, i) => i !== index));
  };

  const qbFields = (Array.isArray(fields) ? fields : []).map(f => ({
    name: f.key,
    label: f.display_name || f.key,
    type: f.type === 'integer' || f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string',
  }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const data = Array.isArray(automations) ? automations : [];
  const stageList = Array.isArray(stages) ? stages : [];
  const transitionList = Array.isArray(transitions) ? transitions : [];

  const getEventTagColor = (event: string) => {
    switch(event) {
      case 'on_enter': return 'blue';
      case 'on_exit': return 'cyan';
      case 'on_transition': return 'purple';
      case 'on_field_change': return 'orange';
      default: return 'default';
    }
  };

  return (
    <div className="automation-manager">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5} style={{ margin: 0 }}>Workflow Automations</Title>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
          Add Automation
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((a, index) => (
          <Card 
            key={index} 
            size="small" 
            hoverable
            className="automation-card" 
            style={{ 
              borderRadius: '8px', 
              borderLeft: `4px solid ${a.is_active ? '#1677ff' : '#d9d9d9'}`,
              opacity: a.is_active ? 1 : 0.7
            }}
            onClick={() => openEditor(index, a)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: '8px', 
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1677ff'
              }}>
                <Zap size={18} fill={a.is_active ? '#1677ff' : 'none'} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <Text strong>{a.name || 'Untitled Automation'}</Text>
                  <Tag color={getEventTagColor(a.event)}>
                    {a.event.toUpperCase().replace('_', ' ')}
                  </Tag>
                  {a.stop_on_failure && <Tooltip title="Stops if any step fails"><Tag color="error">Critical</Tag></Tooltip>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <Text type="secondary" style={{ fontSize: '11px' }}>
                      {a.event === 'on_enter' || a.event === 'on_exit' ? (
                        `Target: ${stageList.find(s => s.id === a.target_id)?.name || a.target_id || 'Any'}`
                      ) : a.event === 'on_transition' ? (
                        `Transition: ${transitionList.find(t => t.id === a.target_id)?.label || transitionList.find(t => t.id === a.target_id)?.name || a.target_id || 'Any'}`
                      ) : 'Trigger: Data change'}
                   </Text>
                   <Divider type="vertical" />
                   <div style={{ display: 'flex', gap: '4px' }}>
                     {(a.actions || []).map((act, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#f5f5f5', padding: '1px 6px', borderRadius: '4px' }}>
                          <Text type="secondary" style={{ fontSize: '10px' }}>{i + 1}. {act.type.split('_')[0]}</Text>
                        </div>
                     ))}
                   </div>
                </div>
              </div>

              <Space split={<Divider type="vertical" />}>
                {a.condition?.rules && a.condition.rules.length > 0 && (
                  <Badge dot color="#52c41a">
                    <Activity size={14} color="#8c8c8c" />
                  </Badge>
                )}
                <Popconfirm 
                  title="Remove this automation?" 
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDelete(index);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button 
                    type="text" 
                    danger 
                    icon={<Trash2 size={16} />} 
                    onClick={(e) => e.stopPropagation()} 
                  />
                </Popconfirm>
              </Space>
            </div>
          </Card>
        ))}

        {data.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', background: '#fafafa', borderRadius: '12px', border: '1px dashed #d9d9d9' }}>
            <Empty description="No automations defined yet. Automate background tasks to streamline your workflow." />
          </div>
        )}
      </div>

      <Drawer
        title={
          <Space>
            <Zap size={18} />
            Edit Automation: {data[editingIndex ?? -1]?.name}
          </Space>
        }
        width={780}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={saveDetails}>Save Changes</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Card size="small" style={{ marginBottom: 20 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Automation Name" name="name" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Notify sales on new entry" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', gap: '16px', paddingTop: '32px' }}>
                  <Form.Item name="is_active" valuePropName="checked" noStyle>
                    <Switch checkedChildren="Active" unCheckedChildren="Disabled" />
                  </Form.Item>
                  <Form.Item name="stop_on_failure" valuePropName="checked" noStyle>
                    <Switch checkedChildren="Stop on Failure" unCheckedChildren="Continue on Failure" />
                  </Form.Item>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Trigger Event" name="event" rules={[{ required: true }]}>
                  <Select onChange={() => form.setFieldValue('target_id', undefined)}>
                    <Option value="on_enter">On Enter Stage</Option>
                    <Option value="on_exit">On Exit Stage</Option>
                    <Option value="on_transition">On Transition</Option>
                    <Option value="on_field_change">On Field Change</Option>
                    <Option value="on_sla_breach">On SLA Breach</Option>
                    <Option value="on_cron">Scheduled (Cron)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  noStyle 
                  shouldUpdate={(prev, curr) => prev.event !== curr.event}
                >
                  {({ getFieldValue }) => {
                    const event = getFieldValue('event');
                    if (event === 'on_enter' || event === 'on_exit') {
                      return (
                        <Form.Item label="Target Stage" name="target_id">
                          <Select placeholder="Pick a stage">
                             {stageList.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                          </Select>
                        </Form.Item>
                      );
                    } else if (event === 'on_transition') {
                      return (
                        <Form.Item label="Target Transition" name="target_id">
                          <Select placeholder="Pick a transition">
                             {transitionList.map(t => (
                               <Option key={t.id} value={t.id}>{t.label || t.name || t.id}</Option>
                             ))}
                          </Select>
                        </Form.Item>
                      );
                    }
                    return null;
                  }}
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Divider orientation="left">Trigger Conditions</Divider>
          <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #f0f0f0', marginBottom: 24 }}>
            <Form.Item name="condition">
              <QueryBuilder fields={qbFields} onQueryChange={(q: any) => form.setFieldValue('condition', q)} />
            </Form.Item>
          </div>

          <Divider orientation="left">Execution Pipeline (Sequential Actions)</Divider>
          
          <Form.List name="actions">
            {(actions, { add, remove }) => (
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleActionReorder}
              >
                <SortableContext 
                  items={actions.map((_, index) => `action-${index}`)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ marginBottom: 16 }}>
                    {actions.map((field, index) => (
                      <SortableActionItem 
                        key={field.key} 
                        index={index}
                        action={form.getFieldValue(['actions', index])}
                        onRemove={() => remove(index)}
                        onUpdate={(updates) => {
                          const currentActions = form.getFieldValue('actions');
                          currentActions[index] = { ...currentActions[index], ...updates };
                          form.setFieldsValue({ actions: [...currentActions] });
                        }}
                        fields={fields}
                      />
                    ))}
                    {actions.length === 0 && <Empty description="No actions configured" style={{ padding: '20px' }} />}
                    <Button 
                      type="dashed" 
                      block 
                      icon={<Plus size={16} />} 
                      onClick={() => add({ type: 'update_field', config: {} })}
                      style={{ marginTop: '8px' }}
                    >
                      Add Step to Pipeline
                    </Button>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Form.List>

          <Divider />
          <Row gutter={16}>
             <Col span={12}>
                <Form.Item label="Execution Priority" name="priority" initialValue={1}>
                  <Select>
                    <Option value={1}>1 (Lowest)</Option>
                    <Option value={5}>5 (Normal)</Option>
                    <Option value={10}>10 (High)</Option>
                  </Select>
                </Form.Item>
             </Col>
          </Row>
        </Form>
      </Drawer>
    </div>
  );
};

export default AutomationManager;
