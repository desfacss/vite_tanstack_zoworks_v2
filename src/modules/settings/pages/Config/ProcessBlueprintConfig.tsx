import React, { useState, useEffect } from 'react';
import { Button, Input, Form, Select, Row, Col, Card, message, Tabs, Table, Typography, Modal, Switch, Space, Badge, Alert, Drawer, Divider, ColorPicker, InputNumber, Collapse, Tooltip } from 'antd';
import { 
  Save, 
  Play, 
  Zap, 
  Eye, 
  GitBranch, 
  Clock, 
  Activity, 
  AlertCircle, 
  CheckCircle2,
  FileCode,
  Layout,
  Settings as SettingsIcon,
  History as HistoryIcon,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  DollarSign,
  MousePointer,
  Shield
} from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { ProcessBlueprint, ProcessBlueprintHistory } from './types/entityTypes';
import JsonEditor from '@/modules/ai/components/JsonEditor';
import ReactDiffViewer from 'react-diff-viewer-continued';
import StageManager from './components/ProcessBlueprint/StageManager';
import TransitionManager from './components/ProcessBlueprint/TransitionManager';
import AutomationManager from './components/ProcessBlueprint/AutomationManager';
import VisualFlowManager from './components/ProcessBlueprint/VisualFlowManager';
import AssignmentEditor from './components/ProcessBlueprint/AssignmentEditor';
import { QueryBuilder } from 'react-querybuilder';

// Import Query Builder CSS if available, otherwise we use standard styles
import 'react-querybuilder/dist/query-builder.css';


const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

interface ProcessBlueprintConfigProps {
  blueprintId?: string;
  onSaveSuccess?: (blueprint: ProcessBlueprint) => void;
}

const CATEGORIES = ["NEW", "IN_PROGRESS", "CLOSED_WON", "CLOSED_LOST", "CANCELLED"];

// Helper to convert nested backend automations to a flat array for the UI
const flattenAutomations = (nested: any) => {
  if (!nested || typeof nested !== 'object') return [];
  const flat: any[] = [];
  
  Object.entries(nested).forEach(([event, targets]: [string, any]) => {
    if (targets && typeof targets === 'object') {
      Object.entries(targets).forEach(([target_id, config]: [string, any]) => {
        flat.push({
          event,
          target_id,
          name: config.name || `${event} ${target_id}`,
          actions: (config.actions || []).map((a: any) => ({
            ...a,
            type: a.type || a.action_type || 'unknown'
          })),
          is_active: config.is_active !== false,
          stop_on_failure: config.stop_on_failure || config.abort_on_failure || false,
          priority: config.priority || 1
        });
      });
    }
  });
  
  return flat;
};

// Helper to convert flat UI automations back to nested backend structure
const nestAutomations = (flat: any[]) => {
  if (!Array.isArray(flat)) return {};
  const nested: any = {};
  
  flat.forEach(a => {
    if (!a.event || !a.target_id) return;
    
    if (!nested[a.event]) nested[a.event] = {};
    nested[a.event][a.target_id] = {
      name: a.name,
      actions: (a.actions || []).map((act: any) => {
        const { type, ...rest } = act;
        return {
          ...rest,
          action_type: type, // Ensure backend gets 'action_type' back
        };
      }),
      is_active: a.is_active,
      stop_on_failure: a.stop_on_failure,
      priority: a.priority
    };
  });
  
  return nested;
};

const ProcessBlueprintConfig: React.FC<ProcessBlueprintConfigProps> = ({ blueprintId, onSaveSuccess }) => {
  const { organization } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<Partial<ProcessBlueprint>>({});
  const [history, setHistory] = useState<ProcessBlueprintHistory[]>([]);
  const [lastLog, setLastLog] = useState<any>(null);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<ProcessBlueprintHistory | null>(null);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [entityMetadata, setEntityMetadata] = useState<any[]>([]);
  
  const [form] = Form.useForm();
  const [stageForm] = Form.useForm();
  const [transitionForm] = Form.useForm();
  
  // Centralized editing states
  const [editingStage, setEditingStage] = useState<any>(null);
  const [isStageDrawerVisible, setIsStageDrawerVisible] = useState(false);
  const [editingTransitionIndex, setEditingTransitionIndex] = useState<number | null>(null);
  const [isTransitionDrawerVisible, setIsTransitionDrawerVisible] = useState(false);

  useEffect(() => {
    if (blueprintId) {
      fetchBlueprint();
    } else {
      resetForm();
    }
  }, [blueprintId]);

  const resetForm = () => {
    const defaults: Partial<ProcessBlueprint> = {
      name: '',
      description: '',
      entity_schema: '',
      entity_type: '',
      blueprint_type: 'lifecycle',
      is_active: false,
      definition: {
        name: "",
        entity_schema: "",
        entity_type: "",
        blueprint_type: "lifecycle",
        lifecycle: {
          startStateId: "new",
          stages: [
            { id: "new", name: "New", category: "NEW" }
          ],
          transitions: []
        },
        automations: [],
        sla_rules: []
      },
      metadata: {},
      intent: ''
    };
    setBlueprint(defaults);
    form.setFieldsValue({
      ...defaults,
      definitionStr: JSON.stringify(defaults.definition, null, 2),
      metadataStr: JSON.stringify(defaults.metadata, null, 2),
    });
    setHistory([]);
    setLastLog(null);
  };

  const fetchBlueprint = async () => {
    if (!blueprintId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('automation')
        .from('bp_process_blueprints')
        .select('*')
        .eq('id', blueprintId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Sanitize definition to ensure all required nested properties exist
        const rawDefinition = data.definition || {};
        const lifecycle = rawDefinition.lifecycle || {};
        const stages = (lifecycle.stages || []).map((s: any, idx: number) => ({
          ...s,
          sequence: s.sequence || idx + 1
        }));

        const sanitizedDefinition = {
          ...rawDefinition,
          lifecycle: {
            startStateId: lifecycle.startStateId || "new",
            stages,
            transitions: lifecycle.transitions || [],
            ...lifecycle
          },
          automations: flattenAutomations(rawDefinition.automations),
          sla_rules: rawDefinition.sla_rules || []
        };
        
        const sanitizedData = { ...data, definition: sanitizedDefinition };
        setBlueprint(sanitizedData);
        form.setFieldsValue({
          ...sanitizedData,
          definitionStr: JSON.stringify(sanitizedDefinition, null, 2),
          metadataStr: JSON.stringify(data.metadata || {}, null, 2),
        });
        
        fetchHistory(data.id);
        fetchLastLog(data.id);
      }
    } catch (error: any) {
      console.error('Error fetching process blueprint:', error);
      message.error('Failed to load blueprint configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (id: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .schema('automation')
        .from('bp_process_blueprints_history')
        .select('*')
        .eq('blueprint_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchLastLog = async (id: string) => {
    try {
      const { data, error } = await supabase
        .schema('automation')
        .from('comp_blueprint_compilation_logs')
        .select('*')
        .eq('blueprint_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLastLog(data);
    } catch (error) {
      console.error('Error fetching compilation logs:', error);
    }
  };

  const fetchEntityMetadata = async (schema: string, type: string) => {
    if (!schema || !type) return;
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('entities')
        .select('metadata')
        .eq('entity_schema', schema)
        .eq('entity_type', type)
        .maybeSingle();

      if (error) throw error;
      if (data?.metadata) {
        setEntityMetadata(data.metadata);
      }
    } catch (error: any) {
      console.error('Error fetching entity metadata:', error);
    }
  };

  useEffect(() => {
    if (blueprint.entity_schema && blueprint.entity_type) {
      fetchEntityMetadata(blueprint.entity_schema, blueprint.entity_type);
    }
  }, [blueprint.entity_schema, blueprint.entity_type]);

  const handleSave = async (values: any) => {
    try {
      setSaving(true);
      
      const definition = JSON.parse(values.definitionStr || '{}');
      const metadata = JSON.parse(values.metadataStr || '{}');
      
      const payload: any = {
        name: values.name,
        description: values.description,
        entity_schema: values.entity_schema,
        entity_type: values.entity_type,
        blueprint_type: values.blueprint_type,
        intent: values.intent,
        is_active: values.is_active,
        definition: {
          ...definition,
          automations: nestAutomations(definition.automations || [])
        },
        metadata,
        organization_id: organization?.id,
        updated_at: new Date().toISOString(),
      };

      if (blueprintId) {
        payload.id = blueprintId;
      }

      const { data, error } = await supabase
        .schema('automation')
        .from('bp_process_blueprints')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      message.success('Process blueprint saved successfully');
      setBlueprint(data);
      if (data?.id) {
        fetchHistory(data.id);
      }
      
      if (onSaveSuccess) {
        onSaveSuccess(data);
      }
      
    } catch (error: any) {
      console.error('Error in handleSave:', error);
      message.error(`Failed to save blueprint: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateDefinition = (field: string, value: any) => {
    const newDefinition = { ...blueprint.definition, [field]: value };
    setBlueprint(prev => ({ ...prev, definition: newDefinition }));
    form.setFieldsValue({
      definitionStr: JSON.stringify(newDefinition, null, 2)
    });
  };



  const handlePositionsChange = (positions: Record<string, { x: number, y: number }>) => {
    setBlueprint(prev => {
      const newMetadata = {
        ...(prev.metadata || {}),
        visual_layout: {
          ...(prev.metadata?.visual_layout || {}),
          positions
        }
      };
      return { ...prev, metadata: newMetadata };
    });
    
    // Also update form optionally or just rely on state
    form.setFieldsValue({
      metadataStr: JSON.stringify({
        ...(blueprint.metadata || {}),
        visual_layout: {
          ...(blueprint.metadata?.visual_layout || {}),
          positions
        }
      }, null, 2)
    });
  };

  // Stage Editing Logic
  const openStageEditor = (stage: any) => {
    setEditingStage(stage);
    stageForm.setFieldsValue(stage);
    setIsStageDrawerVisible(true);
  };

  const saveStageDetails = () => {
    stageForm.validateFields().then(values => {
      const stages = blueprint.definition?.lifecycle?.stages || [];
      const newStages = stages.map((s: any) => s.id === editingStage?.id ? { ...s, ...values } : s);
      handleLifecycleChange('stages', newStages);
      setIsStageDrawerVisible(false);
      setEditingStage(null);
    });
  };

  const calculatePERT = () => {
    const vals = stageForm.getFieldsValue();
    const o = vals.time_estimates?.optimistic_hours || 0;
    const m = vals.time_estimates?.most_likely_hours || 0;
    const p = vals.time_estimates?.pessimistic_hours || 0;
    const pert = (o + 4 * m + p) / 6;
    stageForm.setFieldValue(['time_estimates', 'pert_expected_hours'], parseFloat(pert.toFixed(2)));
  };

  // Transition Editing Logic
  const openTransitionEditor = (index: number, transition: any) => {
    setEditingTransitionIndex(index);
    transitionForm.setFieldsValue({
      ...transition,
      is_manual: transition.trigger === 'manual' || (transition as any).is_manual,
      icon: transition.ui?.icon,
      button_variant: transition.ui?.button_variant || 'primary',
      confirm_message: transition.ui?.confirm_message,
      button_color: transition.ui?.button_color || '#1677ff',
      allowed_roles: transition.guard_rules?.allowed_roles || [],
      validation_rpc: transition.guard_rules?.validation_rpc,
      required_fields: transition.guard_rules?.required_fields || []
    });
    setIsTransitionDrawerVisible(true);
  };

  const saveTransitionDetails = () => {
    transitionForm.validateFields().then(values => {
      const transitions = [...(blueprint.definition?.lifecycle?.transitions || [])];
      const stages = blueprint.definition?.lifecycle?.stages || [];
      
      if (editingTransitionIndex !== null) {
        const fromStage = stages.find((s: any) => s.id === values.from);
        const toStage = stages.find((s: any) => s.id === values.to);
        
        // Auto-derive type
        if (fromStage && toStage && !values.type_override) {
          if (toStage.category === 'CLOSED_LOST' || toStage.category === 'CANCELLED') {
            values.type = 'cancellation';
          } else if ((toStage.sequence || 0) > (fromStage.sequence || 0)) {
            values.type = 'forward';
          } else if ((toStage.sequence || 0) < (fromStage.sequence || 0)) {
            values.type = 'backward';
          }
        }

        // Reconstruct nested structures
        const updatedTransition: any = {
          ...transitions[editingTransitionIndex],
          ...values,
          trigger: values.is_manual ? 'manual' : 'auto',
          ui: {
            icon: values.icon,
            button_variant: values.button_variant,
            confirm_message: values.confirm_message,
            button_color: typeof values.button_color === 'string' ? values.button_color : values.button_color?.toHexString?.() || '#1677ff'
          },
          guard_rules: {
            allowed_roles: values.allowed_roles,
            validation_rpc: values.validation_rpc,
            required_fields: values.required_fields
          }
        };
        
        // Clean up flat fields
        ['icon', 'button_variant', 'confirm_message', 'button_color', 'allowed_roles', 'validation_rpc', 'required_fields', 'is_manual'].forEach(f => delete updatedTransition[f]);

        transitions[editingTransitionIndex] = updatedTransition;
        handleLifecycleChange('transitions', transitions);
      }
      setIsTransitionDrawerVisible(false);
    });
  };

  const handleCompile = async (activate = false) => {
    if (!blueprint.id) {
      message.warning('Save the blueprint before compiling.');
      return;
    }

    setCompiling(true);
    try {
      const rpcName = activate ? 'comp_core_compile_and_activate' : 'comp_core_compile';
      const { error } = await supabase
        .schema('automation')
        .rpc(rpcName, { p_blueprint_id: blueprint.id });

      if (error) throw error;
      
      message.success(`Compilation ${activate ? '& Activation ' : ''}triggered successfully!`);
      // Wait a bit for the back-end to finish and refresh log
      setTimeout(() => fetchLastLog(blueprint.id!), 3000);
      
    } catch (error: any) {
      console.error('Compilation failed:', error);
      message.error(`Compilation Failed: ${error.message}`);
    } finally {
      setCompiling(false);
    }
  };

  const syncBasicFieldsToDefinition = () => {
    const currentValues = form.getFieldsValue();
    setBlueprint(prev => {
      const updatedDef = {
        ...(prev.definition || {}),
        name: currentValues.name,
        entity_schema: currentValues.entity_schema,
        entity_type: currentValues.entity_type,
        blueprint_type: currentValues.blueprint_type,
      };
      
      // Update definition string in form only if it changed dramatically? 
      // Actually just sync it back
      form.setFieldsValue({ 
        definitionStr: JSON.stringify(updatedDef, null, 2) 
      });
      
      return { ...prev, ...currentValues, definition: updatedDef };
    });
  };

  const handleLifecycleChange = (key: string, value: any) => {
    setBlueprint(prev => {
      const currentLifecycle = prev.definition?.lifecycle || {};
      const newLifecycle = { ...currentLifecycle, [key]: value };
      
      const newDefinition = { 
        ...prev.definition, 
        lifecycle: newLifecycle 
      };
      
      form.setFieldsValue({
        definitionStr: JSON.stringify(newDefinition, null, 2)
      });
      
      return { ...prev, definition: newDefinition };
    });
  };



  const historyColumns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (v: number) => <Badge count={v} showZero color="#108ee9" />
    },
    {
      title: 'Intent',
      dataIndex: 'intent',
      key: 'intent',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: ProcessBlueprintHistory) => (
        <Button size="small" icon={<Eye size={14} />} onClick={() => handleViewHistory(record)}>Compare</Button>
      )
    }
  ];

  const handleViewHistory = (record: ProcessBlueprintHistory) => {
    setSelectedHistoryRecord(record);
    setIsHistoryModalVisible(true);
  };

  const handleViewLogDetails = () => {
    if (!lastLog) return;
    Modal.info({
      title: 'Last Compilation Log',
      width: 800,
      content: (
        <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', maxHeight: '500px', overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(lastLog, null, 2)}
        </pre>
      )
    });
  };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <Zap size={32} className="animate-spin" style={{ color: '#1890ff' }} />
      <div style={{ marginTop: '12px' }}>Loading blueprint...</div>
    </div>
  );

  return (
    <div style={{ padding: '0' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        onValuesChange={syncBasicFieldsToDefinition}
      >
        <Row gutter={24}>
          <Col span={17}>
            {/* --- METADATA HEADER --- */}
            <Card size="small" style={{ marginBottom: 20, borderRadius: '12px', border: '1px solid #f0f0f0' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="name" label="Blueprint Name" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                    <Input placeholder="Sales CRM Process" />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="blueprint_type" label="Type" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                    <Select>
                      <Option value="lifecycle">Lifecycle</Option>
                      <Option value="approval">Approval</Option>
                      <Option value="orchestration">Orchestration</Option>
                      <Option value="agentic">Agentic</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="entity_schema" label="Schema" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                    <Input placeholder="crm" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="entity_type" label="Entity Type" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                    <Input placeholder="leads" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={14}>
                  <Form.Item name="description" label="Description" style={{ marginBottom: 0 }}>
                    <Input placeholder="High-level purpose of this process" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="intent" label="Intent" style={{ marginBottom: 0 }}>
                    <Input placeholder="CRM_LIFECYCLE" />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="is_active" label="Active Status" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* --- MAIN TABS --- */}
            <Tabs defaultActiveKey="visual" type="card" className="blueprint-tabs" destroyInactiveTabPane={false}>
              <TabPane tab={<Space><Eye size={16} />Visual Flow</Space>} key="visual">
                <Card bordered={false} bodyStyle={{ padding: '12px' }}>
                  <VisualFlowManager 
                    stages={blueprint.definition?.lifecycle?.stages || []}
                    transitions={blueprint.definition?.lifecycle?.transitions || []}
                    metadata={blueprint.metadata}
                    onNodeClick={openStageEditor}
                    onEdgeClick={openTransitionEditor}
                    onPositionsChange={handlePositionsChange}
                    onStagesChange={(stages) => handleLifecycleChange('stages', stages)}
                    onTransitionsChange={(transitions) => handleLifecycleChange('transitions', transitions)}
                  />
                </Card>
              </TabPane>

              <TabPane tab={<Space><Layout size={16} />Stages</Space>} key="stages">
                <Card bordered={false}>
                  <StageManager 
                    stages={blueprint.definition?.lifecycle?.stages || []} 
                    categories={CATEGORIES}
                    onChange={(stages) => handleLifecycleChange('stages', stages)}
                    onEdit={openStageEditor}
                  />
                </Card>
              </TabPane>

              <TabPane tab={<Space><GitBranch size={16} />Transitions</Space>} key="transitions">
                <Card bordered={false}>
                  <TransitionManager 
                    transitions={blueprint.definition?.lifecycle?.transitions || []}
                    stages={blueprint.definition?.lifecycle?.stages || []}
                    fields={entityMetadata}
                    onChange={(transitions) => handleLifecycleChange('transitions', transitions)}
                    onEdit={openTransitionEditor}
                  />
                </Card>
              </TabPane>

              <TabPane tab={<Space><Zap size={16} />Automations</Space>} key="automations">
                <Card bordered={false}>
                  <AutomationManager 
                    automations={blueprint.definition?.automations || []}
                    stages={blueprint.definition?.lifecycle?.stages || []}
                    transitions={blueprint.definition?.lifecycle?.transitions || []}
                    fields={entityMetadata}
                    onChange={(automations) => updateDefinition('automations', automations)}
                  />
                </Card>
              </TabPane>

              <TabPane tab={<Space><FileCode size={16} />Advanced (JSON)</Space>} key="raw">
                <Card bordered={false}>
                  <Title level={5}>Raw Blueprint Definition</Title>
                  <Paragraph type="secondary">Directly modify the JSONB structure sent to the database.</Paragraph>
                  <Form.Item name="definitionStr" rules={[{ required: true }]}>
                    <JsonEditor 
                      rows={20} 
                      onChange={(val) => {
                        try {
                          const parsed = JSON.parse(val);
                          setBlueprint(prev => ({ ...prev, definition: parsed }));
                        } catch(e) {}
                      }}
                    />
                  </Form.Item>
                </Card>
              </TabPane>

              <TabPane tab={<Space><SettingsIcon size={16} />Metadata</Space>} key="metadata">
                <Card bordered={false}>
                  <Title level={5}>Extended Metadata</Title>
                  <Paragraph type="secondary">Custom UI configurations or technical parameters for the engine.</Paragraph>
                  <Form.Item name="metadataStr">
                    <JsonEditor rows={15} />
                  </Form.Item>
                </Card>
              </TabPane>

              <TabPane tab={<Space><HistoryIcon size={16} />Version History</Space>} key="history">
                <Card bordered={false}>
                  <Table 
                    dataSource={history} 
                    columns={historyColumns} 
                    size="small" 
                    loading={historyLoading}
                    rowKey="id"
                    pagination={{ pageSize: 8 }}
                  />
                </Card>
              </TabPane>
            </Tabs>
          </Col>

          {/* --- SIDEBAR ACTIONS --- */}
          <Col span={7}>
            <div style={{ position: 'sticky', top: 0 }}>
              <Card title={<Space><Activity size={18} /> Actions</Space>} style={{ borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Button 
                    type="primary" 
                    icon={<Save size={18} />} 
                    block 
                    size="large"
                    loading={saving}
                    onClick={() => form.submit()}
                    className="action-btn-save"
                    style={{ background: '#1890ff', borderRadius: '8px', height: '48px', fontWeight: 'bold' }}
                  >
                    Save Blueprint
                  </Button>

                  <div style={{ height: '1px', background: '#f0f0f0', margin: '8px 0' }} />

                  <Button 
                    icon={<Play size={18} />} 
                    block 
                    size="large"
                    loading={compiling}
                    onClick={() => handleCompile(false)}
                    style={{ borderRadius: '8px', height: '44px' }}
                    disabled={!blueprint.id || saving}
                  >
                    Compile Now
                  </Button>

                  <Button 
                    type="default"
                    icon={<Zap size={18} />} 
                    block 
                    size="large"
                    loading={compiling}
                    onClick={() => handleCompile(true)}
                    style={{ borderRadius: '8px', height: '44px', border: '1px solid #52c41a', color: '#52c41a' }}
                    disabled={!blueprint.id || saving}
                  >
                    Compile & Activate
                  </Button>

                  <div style={{ marginTop: 24 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>Compilation Status</Title>
                    {lastLog ? (
                      <div 
                        style={{ 
                          padding: '12px', 
                          borderRadius: '8px', 
                          background: lastLog.status === 'success' ? '#f6ffed' : '#fff1f0',
                          border: `1px solid ${lastLog.status === 'success' ? '#b7eb8f' : '#ffa39e'}`,
                          cursor: 'pointer'
                        }}
                        onClick={handleViewLogDetails}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Space>
                            {lastLog.status === 'success' ? <CheckCircle2 size={16} color="#52c41a" /> : <AlertCircle size={16} color="#f5222d" />}
                            <Text strong style={{ textTransform: 'uppercase', fontSize: '12px' }}>{lastLog.status}</Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: '11px' }}><Clock size={10} /> {new Date(lastLog.created_at).toLocaleTimeString()}</Text>
                        </div>
                        <div style={{ fontSize: '12px', color: '#555' }}>
                          {lastLog.details?.message || 'Details in compilation log...'}
                        </div>
                        <div style={{ marginTop: 8, fontSize: '11px', display: 'flex', gap: '8px' }}>
                          {lastLog.details?.artifacts?.rules_created !== undefined && (
                            <Badge count={`Rules: ${lastLog.details.artifacts.rules_created}`} style={{ backgroundColor: '#1890ff' }} />
                          )}
                          {lastLog.details?.artifacts?.actions_created !== undefined && (
                            <Badge count={`Actions: ${lastLog.details.artifacts.actions_created}`} style={{ backgroundColor: '#722ed1' }} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <Alert 
                        message="Not Compiled" 
                        description="This blueprint version has not been compiled yet." 
                        type="warning" 
                        showIcon 
                        icon={<ChevronRight size={16} />}
                      />
                    )}
                  </div>
                </div>
              </Card>

              <Card size="small" style={{ marginTop: 20, borderRadius: '12px', background: '#f9f9f9', border: '1px dashed #d9d9d9' }}>
                <Paragraph style={{ fontSize: '12px', color: '#8c8c8c', margin: 0 }}>
                  <Text strong>Compiler Tip:</Text> Compiling takes the Blueprint JSON and generates runtime artifacts in the `automation` schema tables. 
                  Activation makes the new version live for all new instances.
                </Paragraph>
              </Card>
            </div>
          </Col>
        </Row>
      </Form>

      {/* --- CENTRALIZED STAGE EDITOR --- */}
      <Drawer
        title={
          <Space>
            <Layout size={18} />
            Edit Stage: {editingStage?.name}
          </Space>
        }
        width={720}
        onClose={() => setIsStageDrawerVisible(false)}
        open={isStageDrawerVisible}
        extra={
          <Space>
            <Button onClick={() => setIsStageDrawerVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={saveStageDetails}>Save Changes</Button>
          </Space>
        }
      >
        <Form form={stageForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Stage ID (Key)" name="id" rules={[{ required: true }]}>
                <Input placeholder="e.g. drafting" disabled={editingStage?.id === 'new'} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Display Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Drafting Phase" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select>
                  {CATEGORIES.map(cat => (
                    <Option key={cat} value={cat}>{cat}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Color" name="color">
                <ColorPicker />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Briefly describe what happens in this stage..." />
          </Form.Item>

          <Divider orientation="left">Role Assignment (RACI)</Divider>
          
          <Collapse 
            defaultActiveKey={['responsible']} 
            ghost
            items={[
              {
                key: 'responsible',
                label: <Space><Users size={16} /> <Text strong>Responsible (The Doer)</Text></Space>,
                children: (
                  <Form.Item name={['raci', 'responsible']}>
                    <AssignmentEditor label="Who is responsible for completing this stage?" onChange={(val) => stageForm.setFieldValue(['raci', 'responsible'], val)} />
                  </Form.Item>
                )
              },
              {
                key: 'others',
                label: <Space><Shield size={16} /> <Text>Accountable, Consulted, Informed</Text></Space>,
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                        <Form.Item label="Accountable (The Owner)" name={['raci', 'accountable']}>
                          <AssignmentEditor label="Ultimately answerable for the correct completion" onChange={(val) => stageForm.setFieldValue(['raci', 'accountable'], val)} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Consulted" name={['raci', 'consulted']}>
                          <AssignmentEditor label="Opinion is sought before action" onChange={(val) => stageForm.setFieldValue(['raci', 'consulted'], val)} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Informed" name={['raci', 'informed']}>
                          <AssignmentEditor label="Kept up-to-date on progress" onChange={(val) => stageForm.setFieldValue(['raci', 'informed'], val)} />
                        </Form.Item>
                    </Col>
                  </Row>
                )
              }
            ]}
          />

          <Divider orientation="left">Performance & Cost</Divider>

          <Row gutter={16}>
            <Col span={16}>
              <Card size="small" title={<Space><Clock size={16} /> Time Estimates (Hours)</Space>}>
                <Row gutter={8}>
                  <Col span={8}>
                    <Form.Item label="Optimistic" name={['time_estimates', 'optimistic_hours']}>
                      <InputNumber style={{ width: '100%' }} min={0} onChange={calculatePERT} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Most Likely" name={['time_estimates', 'most_likely_hours']}>
                      <InputNumber style={{ width: '100%' }} min={0} onChange={calculatePERT} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Pessimistic" name={['time_estimates', 'pessimistic_hours']}>
                      <InputNumber style={{ width: '100%' }} min={0} onChange={calculatePERT} />
                    </Form.Item>
                  </Col>
                </Row>
                <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>PERT Expected Duration: </Text>
                  <Form.Item name={['time_estimates', 'pert_expected_hours']} noStyle shouldUpdate>
                    {() => (
                      <Text strong style={{ color: '#1677ff' }}>{stageForm.getFieldValue(['time_estimates', 'pert_expected_hours']) || 0}</Text>
                    )}
                  </Form.Item>
                  <Text type="secondary" style={{ fontSize: '12px' }}> hours</Text>
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title={<Space><DollarSign size={16} /> Cost Estimates</Space>}>
                <Form.Item label="Fixed Cost" name={['cost_estimates', 'fixed_cost']}>
                  <InputNumber style={{ width: '100%' }} min={0} prefix="$" />
                </Form.Item>
                <Form.Item label="Cost Center" name={['cost_estimates', 'cost_center']}>
                  <Input placeholder="e.g. OP-2024" />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Drawer>

      {/* --- CENTRALIZED TRANSITION EDITOR --- */}
      <Drawer
        title={
          <Space>
            <SettingsIcon size={18} />
            Edit Transition: {blueprint.definition?.lifecycle?.transitions?.[editingTransitionIndex ?? -1]?.label || blueprint.definition?.lifecycle?.transitions?. [editingTransitionIndex ?? -1]?.id}
          </Space>
        }
        width={720}
        onClose={() => setIsTransitionDrawerVisible(false)}
        open={isTransitionDrawerVisible}
        extra={
          <Space>
            <Button onClick={() => setIsTransitionDrawerVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={saveTransitionDetails}>Save Changes</Button>
          </Space>
        }
      >
        <Form form={transitionForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Transition ID (Key)" name="id" rules={[{ required: true }]}>
                <Input placeholder="e.g. T_TRIAGE" disabled={editingTransitionIndex !== null} />
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
                  {(blueprint.definition?.lifecycle?.stages || []).map((s: any) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="To Stage" name="to" rules={[{ required: true }]}>
                <Select placeholder="Select target stage">
                  {(blueprint.definition?.lifecycle?.stages || []).map((s: any) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Transition Type" name="type">
                <Select placeholder="Auto-derive or select">
                  <Option value="forward">Forward</Option>
                  <Option value="backward">Backward (Correction)</Option>
                  <Option value="cancellation">Cancellation</Option>
                  <Option value="other">Other / Parallel</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Trigger Mode" name="is_manual" valuePropName="checked">
                <Switch checkedChildren="Manual" unCheckedChildren="Auto" />
              </Form.Item>
            </Col>
            <Col span={8}>
               <Form.Item label="Button Variant" name="button_variant">
                  <Select>
                    <Option value="primary">Primary (Glow)</Option>
                    <Option value="secondary">Secondary (Soft)</Option>
                    <Option value="danger">Danger (Red)</Option>
                    <Option value="ghost">Ghost (Outline)</Option>
                  </Select>
               </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left"><Space><MousePointer size={16} />UI Customization @ Manual</Space></Divider>
          
          <Form.Item noStyle shouldUpdate={(prev: any, curr: any) => prev.is_manual !== curr.is_manual}>
            {() => {
              const isManual = transitionForm.getFieldValue('is_manual');
              if (!isManual) return null;
              
              const PRESET_COLORS = [
                { label: 'Primary', color: '#1677ff' },
                { label: 'Success', color: '#52c41a' },
                { label: 'Warning', color: '#faad14' },
                { label: 'Danger', color: '#ff4d4f' },
                { label: 'Info', color: '#722ed1' },
                { label: 'Neutral', color: '#8c8c8c' }
              ];

              return (
                <Card size="small" style={{ background: '#f9f9f9', marginBottom: '20px' }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="Button Text (UI)" name="label">
                        <Input placeholder="Next Stage" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="Icon" name="icon">
                        <Input placeholder="e.g. play, check" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                       <Form.Item label="Color" name="button_color">
                          <ColorPicker 
                            presets={[{ label: 'Presets', colors: PRESET_COLORS.map(c => c.color) }]} 
                          />
                       </Form.Item>
                    </Col>
                    <Col span={8}>
                       <Form.Item label="Confirm Msg" name="confirm_message">
                          <Input placeholder="Are you sure?" />
                       </Form.Item>
                    </Col>
                  </Row>
                </Card>
              );
            }}
          </Form.Item>

          <Divider orientation="left"><Space><Shield size={16} />Pre-requisites & Rules</Space></Divider>
          
          <Row gutter={16}>
            <Col span={12}>
                <Form.Item label="Allowed Roles (Guard Rules)" name="allowed_roles">
                    <Select mode="multiple" placeholder="ADMIN, DISPATCHER..." style={{ width: '100%' }}>
                        <Option value="ADMIN">ADMIN</Option>
                        <Option value="DISPATCHER">DISPATCHER</Option>
                        <Option value="TECHNICIAN">TECHNICIAN</Option>
                        <Option value="BRANCH_MANAGER">BRANCH_MANAGER</Option>
                        <Option value="CUSTOMER">CUSTOMER</Option>
                    </Select>
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item label="Validation RPC (Server-side)" name="validation_rpc">
                    <Input placeholder="schema.function_name" />
                </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Required Fields (Must be filled to enable transition)" name="required_fields">
            <Select mode="multiple" placeholder="Select fields" style={{ width: '100%' }}>
              {(entityMetadata).map(f => (
                <Option key={f.key} value={f.key}>{f.display_name || f.key}</Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ marginTop: '20px' }}>
            <Title level={5} style={{ fontSize: '14px', marginBottom: '12px' }}>Automation Rules (Conditions)</Title>
            <Form.Item name="condition">
              <QueryBuilder 
                fields={(entityMetadata).map(f => ({
                  name: f.key,
                  label: f.display_name || f.key,
                  type: f.type === 'integer' || f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string',
                }))}
                onQueryChange={(q: any) => transitionForm.setFieldValue('condition', q)}
                query={transitionForm.getFieldValue('condition')}
              />
            </Form.Item>
          </div>
        </Form>
      </Drawer>

      {/* --- HISTORY COMPARISON MODAL --- */}
      <Modal
        title={`Version Comparison: ${selectedHistoryRecord?.created_at ? new Date(selectedHistoryRecord.created_at).toLocaleString() : ''}`}
        open={isHistoryModalVisible}
        onCancel={() => setIsHistoryModalVisible(false)}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setIsHistoryModalVisible(false)}>Close</Button>,
          <Button key="restore" type="primary" icon={<HistoryIcon size={16} />} onClick={() => {
            if (selectedHistoryRecord) {
              const data = selectedHistoryRecord.data;
              form.setFieldsValue({
                ...data,
                definitionStr: JSON.stringify(data.definition || {}, null, 2),
                metadataStr: JSON.stringify(data.metadata || {}, null, 2),
              });
              message.success('Historical version loaded into form.');
            }
          }}>Restore to Form</Button>
        ]}
      >
        {selectedHistoryRecord && (
          <div style={{ height: '70vh', overflowY: 'auto' }}>
            <ReactDiffViewer
              oldValue={JSON.stringify(selectedHistoryRecord.data, null, 2)}
              newValue={JSON.stringify(blueprint, null, 2)}
              splitView={true}
              leftTitle="Historical Version"
              rightTitle="Current (Saved) Version"
            />
          </div>
        )}
      </Modal>

      <style>{`
        .blueprint-tabs .ant-tabs-nav {
          margin-bottom: 0 !important;
        }
        .blueprint-tabs .ant-tabs-content-holder {
          border: 1px solid #f0f0f0;
          border-top: none;
          background: #fff;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .stages-table .ant-table-thead > tr > th {
          background: #fafafa !important;
          font-weight: 600 !important;
        }
        .action-btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.35) !important;
        }
      `}</style>
    </div>
  );
};

export default ProcessBlueprintConfig;
