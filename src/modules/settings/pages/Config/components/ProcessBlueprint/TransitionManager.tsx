import React, { useState } from 'react';
import { Button, Select, Popconfirm, Card, Typography, Drawer, Form, Input, Switch, Space, Row, Col, Divider, Tag, Badge, ColorPicker, Tooltip } from 'antd';
import { Plus, Trash2, ArrowRight, Settings, MousePointer, Zap, Shield } from 'lucide-react';
import { QueryBuilder, RuleGroupType } from 'react-querybuilder';

const { Text, Title } = Typography;
const { Option } = Select;

interface Transition {
  id?: string;
  label?: string; // Align with backend 'label'
  from: string;
  to: string;
  type?: 'forward' | 'backward' | 'cancellation' | 'other';
  trigger?: 'manual' | 'auto'; // Align with backend 'trigger'
  is_manual?: boolean; // Keep for internal UI toggle if needed, but primary is trigger
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
      label: `To ${stageList.find(s => s.id === toStage)?.name || 'Next'}`,
      from: fromStage,
      to: toStage,
      type: 'forward',
      trigger: 'manual',
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
      // Map 'trigger' to 'is_manual' for the UI switch
      is_manual: transition.trigger === 'manual' || transition.is_manual,
      // Ensure color picker gets a hex string
      button_color: transition.button_color || '#1677ff'
    });
    setDrawerVisible(true);
  };

  const saveDetails = () => {
    form.validateFields().then(values => {
      const newList = [...(Array.isArray(transitions) ? transitions : [])];
      
      // Auto-derive type if not explicitly overridden by user recently
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

        // Map UI switch back to 'trigger'
        values.trigger = values.is_manual ? 'manual' : 'auto';
        
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
                        <Tooltip title={`Button: ${t.button_text || 'Continue'}`}>
                            <Badge dot status="processing" style={{ color: t.button_color || '#1677ff' }} />
                        </Tooltip>
                    )}
                    {t.required_fields && t.required_fields.length > 0 && (
                        <Tooltip title={`${t.required_fields.length} required fields`}>
                            <Badge count={t.required_fields.length} size="small" style={{ backgroundColor: '#faad14' }} />
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

      <Drawer
        title={
          <Space>
            <Settings size={18} />
            Edit Transition: {data[editingIndex ?? -1]?.label || data[editingIndex ?? -1]?.id}
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
                <Input placeholder="e.g. T_TRIAGE" disabled={editingIndex !== null} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Display Name (Label)" name="label" rules={[{ required: true }]}>
                <Input placeholder="e.g. Move to Prospecting" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="From Stage" name="from" rules={[{ required: true }]}>
                <Select placeholder="Select source stage">
                  {stageList.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="To Stage" name="to" rules={[{ required: true }]}>
                <Select placeholder="Select target stage">
                  {stageList.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Transition Type" name="type">
                <Select placeholder="Auto-derive or select">
                  <Option value="forward">Forward</Option>
                  <Option value="backward">Backward (Correction)</Option>
                  <Option value="cancellation">Cancellation</Option>
                  <Option value="other">Other / Parallel</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Trigger Mode" name="is_manual" valuePropName="checked">
                <Switch checkedChildren="Manual" unCheckedChildren="Auto" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left"><Space><MousePointer size={16} />UI Customization @ Manual</Space></Divider>
          
          <Form.Item noStyle shouldUpdate={(prev: any, curr: any) => prev.is_manual !== curr.is_manual}>
            {() => {
              const isManual = form.getFieldValue('is_manual');
              if (!isManual) return null;
              
              return (
                <Card size="small" style={{ background: '#f9f9f9', marginBottom: '20px' }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="Button Text" name="button_text">
                        <Input placeholder="Next Stage" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                       <Form.Item label="Button Color" name="button_color">
                          <ColorPicker 
                            presets={[{ label: 'Presets', colors: PRESET_COLORS.map(c => c.color) }]} 
                            showText
                          />
                       </Form.Item>
                    </Col>
                    <Col span={10}>
                       <Form.Item label="Confirmation Required" name="confirmation_required" valuePropName="checked">
                          <Switch />
                       </Form.Item>
                       <Form.Item 
                         noStyle
                         shouldUpdate={(prev: any, curr: any) => prev.confirmation_required !== curr.confirmation_required}
                       >
                         {() => {
                           const confirmReq = form.getFieldValue('confirmation_required');
                           return confirmReq && (
                             <Input placeholder="Are you sure you want to move this forward?" style={{ marginTop: '30px' }} />
                           );
                         }}
                       </Form.Item>
                    </Col>
                  </Row>
                </Card>
              );
            }}
          </Form.Item>

          <Divider orientation="left"><Space><Shield size={16} />Pre-requisites & Rules</Space></Divider>
          
          <Form.Item label="Required Fields (Must be filled to enable transition)" name="required_fields">
            <Select mode="multiple" placeholder="Select fields" style={{ width: '100%' }}>
              {(Array.isArray(fields) ? fields : []).map(f => (
                <Option key={f.key} value={f.key}>{f.display_name || f.key}</Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ marginTop: '20px' }}>
            <Title level={5} style={{ fontSize: '14px', marginBottom: '12px' }}>Automation Rules (Conditions)</Title>
            <Form.Item name="condition">
              <QueryBuilder 
                fields={qbFields}
                onQueryChange={(q: any) => form.setFieldValue('condition', q)}
              />
            </Form.Item>
          </div>
        </Form>
      </Drawer>

      <style>{`
        .transition-card:hover {
          border-color: #1677ff !important;
          background: #fafafa;
        }
        .transition-manager .queryBuilder {
          padding: 0;
          border: none;
        }
        .transition-manager .ruleGroup {
          background: #f9f9f9;
          border: 1px solid #f0f0f0;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default TransitionManager;
