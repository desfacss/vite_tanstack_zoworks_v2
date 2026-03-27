import React, { useState, useEffect } from 'react';
import { Button, Select, Popconfirm, Card, Typography, Drawer, Form, Input, Switch, Space, Row, Col, Divider, Tag, Badge, ColorPicker, Tooltip } from 'antd';
import { Plus, Trash2, ArrowRight, Settings, MousePointer, Zap, Shield, Layout } from 'lucide-react';
import { QueryBuilder, RuleGroupType } from 'react-querybuilder';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

interface Transition {
  id?: string;
  name?: string;
  from: string;
  to: string;
  type?: 'forward' | 'backward' | 'cancellation' | 'other';
  is_manual?: boolean;
  button_text?: string;
  button_color?: string;
  confirmation_required?: boolean;
  confirmation_message?: string;
  required_fields?: string[];
  condition?: RuleGroupType;
}

interface TransitionManagerProps {
  transitions: Transition[];
  onChange: (transitions: Transition[]) => void;
  stages: { id: string; name: string; sequence?: number; category?: string }[];
  fields: any[]; // Entity metadata fields
}

const PRESET_COLORS = [
  { label: 'Primary', color: '#1677ff' },
  { label: 'Success', color: '#52c41a' },
  { label: 'Warning', color: '#faad14' },
  { label: 'Danger', color: '#ff4d4f' },
  { label: 'Info', color: '#722ed1' },
  { label: 'Neutral', color: '#8c8c8c' }
];

const TransitionManager: React.FC<TransitionManagerProps> = ({ transitions, onChange, stages, fields }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    const stageList = Array.isArray(stages) ? stages : [];
    const fromStage = stageList[0]?.id || '';
    const toStage = stageList[1]?.id || stageList[0]?.id || '';
    
    // Auto-derive ID
    const newId = `${fromStage}_to_${toStage}`;
    
    const newTransition: Transition = {
      id: newId,
      name: `To ${stageList.find(s => s.id === toStage)?.name || 'Next'}`,
      from: fromStage,
      to: toStage,
      type: 'forward',
      is_manual: true,
      button_text: 'Continue',
      condition: { combinator: 'and', rules: [] },
      required_fields: []
    };
    
    const newList = [...(Array.isArray(transitions) ? transitions : []), newTransition];
    onChange(newList);
    
    // Open editor for the new transition
    openEditor(newList.length - 1, newTransition);
  };

  const openEditor = (index: number, transition: Transition) => {
    setEditingIndex(index);
    form.setFieldsValue({
      ...transition,
      // Ensure color picker gets a hex string
      button_color: transition.button_color || '#1677ff'
    });
    setDrawerVisible(true);
  };

  const saveDetails = () => {
    form.validateFields().then(values => {
      const newList = [...(Array.isArray(transitions) ? transitions : [])];
      
      // Auto-derive type if not explicitly overridden by user recently
      // Logic: if TO sequence > FROM sequence then forward, etc.
      if (editingIndex !== null) {
        const fromStage = stages.find(s => s.id === values.from);
        const toStage = stages.find(s => s.id === values.to);
        
        if (fromStage && toStage && !values.type_override) {
          if (toStage.category === 'CLOSED_LOST' || toStage.category === 'CANCELLED') {
            values.type = 'cancellation';
          } else if ((toStage.sequence || 0) > (fromStage.sequence || 0)) {
            values.type = 'forward';
          } else if ((toStage.sequence || 0) < (fromStage.sequence || 0)) {
            values.type = 'backward';
          }
        }

        newList[editingIndex] = { ...newList[editingIndex], ...values };
        onChange(newList);
      }
      setDrawerVisible(false);
    });
  };

  const handleDelete = (index: number) => {
    onChange((Array.isArray(transitions) ? transitions : []).filter((_, i) => i !== index));
  };

  // Convert entity metadata to QueryBuilder fields
  const qbFields = (Array.isArray(fields) ? fields : []).map(f => ({
    name: f.key,
    label: f.display_name || f.key,
    type: f.type === 'integer' || f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string',
  }));

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
            onClick={() => openEditor(index, t)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: '8px', 
                background: t.is_manual ? '#e6f7ff' : '#f6ffed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.is_manual ? '#1890ff' : '#52c41a'
              }}>
                {t.is_manual ? <MousePointer size={16} /> : <Zap size={16} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong>{t.name || 'Untitled Transition'}</Text>
                  <Tag color={t.type === 'forward' ? 'blue' : t.type === 'backward' ? 'orange' : 'red'} size="small">
                    {t.type || 'forward'}
                  </Tag>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>{stageList.find(s => s.id === t.from)?.name || t.from}</Text>
                  <ArrowRight size={12} className="text-gray-300" />
                  <Text type="secondary" style={{ fontSize: '12px' }}>{stageList.find(s => s.id === t.to)?.name || t.to}</Text>
                </div>
              </div>

              <Space split={<Divider type="vertical" />}>
                {t.required_fields && t.required_fields.length > 0 && (
                  <Tooltip title={`${t.required_fields.length} required fields`}>
                    <Badge count={t.required_fields.length} size="small" style={{ backgroundColor: '#faad14' }}>
                      <Shield size={14} color="#8c8c8c" />
                    </Badge>
                  </Tooltip>
                )}
                {t.condition?.rules && t.condition.rules.length > 0 && (
                  <Badge dot color="#52c41a">
                    <Settings size={14} color="#8c8c8c" />
                  </Badge>
                )}
                <Popconfirm 
                  title="Remove this transition?" 
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
            <Text type="secondary">No transitions defined yet. Connect your stages to automate your process.</Text>
          </div>
        )}
      </div>

      <Drawer
        title={
          <Space>
            <Settings size={18} />
            Edit Transition: {data[editingIndex ?? -1]?.name}
          </Space>
        }
        width={720}
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Transition ID (Key)" name="id" rules={[{ required: true }]}>
                <Input placeholder="e.g. lead_to_prospect" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Display Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Move to Prospecting" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={10}>
              <Form.Item label="From Stage" name="from" rules={[{ required: true }]}>
                <Select placeholder="Select source">
                  {stageList.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '24px' }}>
              <ArrowRight size={24} color="#bfbfbf" />
            </Col>
            <Col span={10}>
              <Form.Item label="To Stage" name="to" rules={[{ required: true }]}>
                <Select placeholder="Select destination">
                  {stageList.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Transition Type" name="type">
                <Select>
                  <Option value="forward">Forward</Option>
                  <Option value="backward">Backward (Return)</Option>
                  <Option value="cancellation">Cancellation</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Trigger Mode" name="is_manual" valuePropName="checked">
                <Switch 
                  checkedChildren={<Space><MousePointer size={12} /> Manual</Space>} 
                  unCheckedChildren={<Space><Zap size={12} /> Auto</Space>} 
                  style={{ width: '100px' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            noStyle 
            shouldUpdate={(prev, curr) => prev.is_manual !== curr.is_manual}
          >
            {({ getFieldValue }) => getFieldValue('is_manual') && (
              <Card size="small" style={{ marginBottom: 20, background: '#f0faff', border: '1px solid #bae7ff' }}>
                <Title level={5} style={{ marginBottom: 16, fontSize: '14px' }}>Manual Button Settings</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Button Text" name="button_text">
                      <Input placeholder="Continue" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Button Color" name="button_color">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                         <ColorPicker />
                         <Divider type="vertical" />
                         <Space size={4} wrap>
                            {PRESET_COLORS.map(p => (
                              <Tooltip key={p.label} title={p.label}>
                                <div 
                                  onClick={() => form.setFieldValue('button_color', p.color)}
                                  style={{ 
                                    width: 20, 
                                    height: 20, 
                                    borderRadius: '4px', 
                                    background: p.color, 
                                    cursor: 'pointer',
                                    border: form.getFieldValue('button_color') === p.color ? '2px solid #333' : '1px solid #ddd'
                                  }} 
                                />
                              </Tooltip>
                            ))}
                         </Space>
                      </div>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Confirm Needed?" name="confirmation_required" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                     <Form.Item 
                       label="Confirmation Message" 
                       name="confirmation_message"
                       noStyle
                       shouldUpdate={(prev, curr) => prev.confirmation_required !== curr.confirmation_required}
                     >
                       {({ getFieldValue }) => getFieldValue('confirmation_required') && (
                         <Input placeholder="Are you sure you want to move this forward?" style={{ marginTop: '30px' }} />
                       )}
                     </Form.Item>
                  </Col>
                </Row>
              </Card>
            )}
          </Form.Item>

          <Divider orientation="left">Pre-requisites & Rules</Divider>
          
          <Form.Item label="Required Fields (Must be filled to enable transition)" name="required_fields">
            <Select mode="multiple" placeholder="Select fields" style={{ width: '100%' }} showSearch filterOption={(input, option) =>
                      (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }>
              {qbFields.map(f => (
                <Option key={f.name} value={f.name}>{f.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Automation Rules (Conditions)</Text>
            <Form.Item name="condition">
              <QueryBuilder 
                fields={qbFields}
                onQueryChange={(q) => form.setFieldValue('condition', q)}
              />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </div>
  );
};

export default TransitionManager;
