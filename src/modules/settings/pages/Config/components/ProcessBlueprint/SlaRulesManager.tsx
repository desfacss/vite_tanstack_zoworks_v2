import React, { useState } from 'react';
import { Button, Select, Popconfirm, Card, Typography, Drawer, Form, Input, Space, Row, Col, Divider, Tag, Badge, Empty, InputNumber } from 'antd';
import { Plus, Trash2, Clock } from 'lucide-react';
import ActionConfigForm from './ActionConfigForm';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

interface Action {
  action_type: string;
  name?: string;
  config: any;
  priority?: number;
  retry_policy?: { max_retries: number; delay_seconds: number } | null;
  abort_on_failure?: boolean;
}

interface SlaEscalation {
  level: number;
  after_hours: number;
  action: Action;
}

interface SlaRule {
  id: string;
  name: string;
  description?: string;
  time_threshold_hours: number;
  check_frequency?: string;
  monitored_stages: string[];
  action: Action;
  escalation_actions?: SlaEscalation[];
}

interface SlaRulesManagerProps {
  slaRules: SlaRule[];
  onChange: (rules: SlaRule[]) => void;
  stages: { id: string; name: string }[];
}

const ACTION_TYPES = [
  { label: 'Send Email', value: 'send_email' },
  { label: 'Send Notification', value: 'send_notification' },
  { label: 'Update Entity', value: 'update_entity' },
  { label: 'Create Entity', value: 'create_entity' },
  { label: 'Remote Call (RPC)', value: 'rpc' },
];

const SlaRulesManager: React.FC<SlaRulesManagerProps> = ({ slaRules, onChange, stages }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    const newRule: SlaRule = {
      id: `SLA_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      name: 'New SLA Rule',
      time_threshold_hours: 24,
      check_frequency: '0 * * * *',
      monitored_stages: [],
      action: { action_type: 'send_notification', name: 'Primary SLA Breach Notice', config: {}, priority: 10 },
      escalation_actions: []
    };
    const newList = [...(Array.isArray(slaRules) ? slaRules : []), newRule];
    onChange(newList);
    openEditor(newList.length - 1, newRule);
  };

  const openEditor = (index: number, rule: SlaRule) => {
    setEditingIndex(index);
    form.setFieldsValue({
      ...rule,
      action: {
        action_type: rule.action?.action_type || 'send_notification',
        name: rule.action?.name || 'SLA Breach Action',
        config: rule.action?.config || {},
        priority: rule.action?.priority || 10,
        retry_policy: rule.action?.retry_policy,
        abort_on_failure: rule.action?.abort_on_failure
      },
      escalation_actions: (rule.escalation_actions || []).map(e => ({
         ...e,
         action: {
            action_type: e.action?.action_type || 'send_notification',
            name: e.action?.name || `Escalation L${e.level}`,
            config: e.action?.config || {},
            priority: e.action?.priority || 20,
            retry_policy: e.action?.retry_policy,
            abort_on_failure: e.action?.abort_on_failure
         }
      }))
    });
    setDrawerVisible(true);
  };

  const saveDetails = () => {
    form.validateFields().then(values => {
      const newList = [...(Array.isArray(slaRules) ? slaRules : [])];
      
      // Ensure escalation levels are sequential
      if (values.escalation_actions) {
         values.escalation_actions = values.escalation_actions.map((e: any, idx: number) => ({
             ...e,
             level: idx + 1
         }));
      }

      if (editingIndex !== null) {
        newList[editingIndex] = { ...newList[editingIndex], ...values };
        onChange(newList);
      }
      setDrawerVisible(false);
    });
  };

  const handleDelete = (index: number) => {
    onChange((Array.isArray(slaRules) ? slaRules : []).filter((_, i) => i !== index));
  };

  const data = Array.isArray(slaRules) ? slaRules : [];
  const stageList = Array.isArray(stages) ? stages : [];

  return (
    <div className="sla-rules-manager">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size="large">
            <Title level={5} style={{ margin: 0 }}>SLA & Service Rules</Title>
        </Space>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
          Add SLA Rule
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((rule, index) => (
          <Card 
            key={rule.id} 
            size="small" 
            hoverable
            onClick={() => openEditor(index, rule)}
            style={{ borderRadius: '8px', borderLeft: `4px solid #faad14` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                  <Space align="center" style={{ marginBottom: 4 }}>
                     <Clock size={16} color="#faad14" />
                     <Text strong>{rule.name}</Text>
                     <Tag color="orange">{rule.time_threshold_hours}h Threshold</Tag>
                  </Space>
                  <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, marginBottom: 8 }}>
                     {rule.description || 'No description provided.'}
                  </Paragraph>
                  <Space split={<Divider type="vertical" />} style={{ fontSize: 12 }}>
                     <Text><strong>Stages:</strong> {rule.monitored_stages?.length || 0} monitored</Text>
                     <Text><strong>Escalations:</strong> {rule.escalation_actions?.length || 0} levels</Text>
                  </Space>
               </div>
               <Popconfirm 
                  title="Remove this SLA Rule?" 
                  onConfirm={(e) => { e?.stopPropagation(); handleDelete(index); }}
                  onCancel={(e) => e?.stopPropagation()}
               >
                  <Button type="text" danger icon={<Trash2 size={16} />} onClick={(e) => e.stopPropagation()} />
               </Popconfirm>
            </div>
          </Card>
        ))}

        {data.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', background: '#fafafa', borderRadius: '12px', border: '1px dashed #d9d9d9' }}>
            <Empty description="No SLA rules defined. Add one to ensure timely processing of records." />
          </div>
        )}
      </div>

      <Drawer
        title={<Space><Clock size={18} /> Edit SLA Rule: {data[editingIndex ?? -1]?.name}</Space>}
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
                <Form.Item label="Rule ID (Code)" name="id" rules={[{ required: true }]}>
                  <Input placeholder="e.g. SLA_APPROVAL_48H" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Rule Name" name="name" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Approval Response SLA (48h)" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Description" name="description">
               <Input.TextArea rows={2} placeholder="Briefly describe what this SLA manages..." />
            </Form.Item>

            <Row gutter={16}>
               <Col span={8}>
                  <Form.Item label="Threshold (Hours)" name="time_threshold_hours" rules={[{ required: true }]}>
                     <InputNumber style={{ width: '100%' }} min={1} />
                  </Form.Item>
               </Col>
               <Col span={16}>
                  <Form.Item label="Monitored Stages" name="monitored_stages" rules={[{ required: true }]}>
                     <Select mode="multiple" placeholder="Select stages to monitor">
                        {stageList.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                     </Select>
                  </Form.Item>
               </Col>
            </Row>
            <Row gutter={16}>
               <Col span={12}>
                  <Form.Item label="Check Frequency (Cron Engine)" name="check_frequency">
                     <Input placeholder="e.g. 0 * * * * (Hourly check)" />
                  </Form.Item>
               </Col>
            </Row>
          </Card>

          <Divider orientation="left">Primary Breach Action (At {data[editingIndex ?? -1]?.time_threshold_hours || '...'}h)</Divider>
          
          <Card size="small" style={{ marginBottom: 24, border: '1px solid #ffccc7' }}>
             <Form.Item label="Action Type" name={['action', 'action_type']}>
                <Select options={ACTION_TYPES} style={{ width: 200 }} />
             </Form.Item>
             <Form.Item 
                 noStyle 
                 shouldUpdate={(prev, curr) => prev?.action?.action_type !== curr?.action?.action_type}
             >
                 {({ getFieldValue }) => (
                     <ActionConfigForm 
                        type={getFieldValue(['action', 'action_type'])} 
                        namePrefix={['action']} 
                     />
                 )}
             </Form.Item>
          </Card>

          <Divider orientation="left">Escalation Chain</Divider>
          <Form.List name="escalation_actions">
            {(fields, { add, remove }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {fields.map((field, index) => (
                  <Badge.Ribbon key={field.key} text={`Level ${index + 1}`} color="red">
                     <Card size="small" style={{ border: '1px solid #ffa39e' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -20 }}>
                           <Button type="text" danger size="small" icon={<Trash2 size={14} />} onClick={() => remove(field.name)} style={{ zIndex: 10, position: 'relative' }} />
                        </div>
                        <Row gutter={16} style={{ marginTop: 12 }}>
                           <Col span={8}>
                              <Form.Item label="Escalate After (Hours)" name={[field.name, 'after_hours']} rules={[{ required: true }]}>
                                 <InputNumber style={{ width: '100%' }} min={1} placeholder="e.g. 72" />
                              </Form.Item>
                           </Col>
                           <Col span={16}>
                              <Form.Item label="Action Type" name={[field.name, 'action', 'action_type']}>
                                 <Select options={ACTION_TYPES} />
                              </Form.Item>
                           </Col>
                        </Row>
                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev?.escalation_actions?.[field.name]?.action?.action_type !== curr?.escalation_actions?.[field.name]?.action?.action_type}>
                            {({ getFieldValue }) => (
                                <ActionConfigForm 
                                   type={getFieldValue(['escalation_actions', field.name, 'action', 'action_type'])} 
                                   namePrefix={['escalation_actions', field.name, 'action']} 
                                />
                            )}
                        </Form.Item>
                     </Card>
                  </Badge.Ribbon>
                ))}
                
                <Button 
                   type="dashed" 
                   block 
                   icon={<Plus size={16} />} 
                   onClick={() => add({ after_hours: 48, action: { action_type: 'send_notification', name: 'Escalation Action', config: {}, priority: 20 } })}
                   style={{ marginTop: '8px', borderColor: '#ffa39e', color: '#cf1322' }}
                >
                   Add Escalation Level
                </Button>
              </div>
            )}
          </Form.List>

        </Form>
      </Drawer>
    </div>
  );
};

export default SlaRulesManager;
