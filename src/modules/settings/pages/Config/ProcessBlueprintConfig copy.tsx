import React, { useState, useEffect } from 'react';
import { Button, Input, Form, Select, Row, Col, Card, message, Tabs, Table, Typography, Modal, Switch, Space, Badge, Alert, Drawer, Divider, ColorPicker, InputNumber, Collapse, Tooltip, Empty } from 'antd';
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
  Users,
  DollarSign,
  MousePointer,
  Shield,
  Mail,
  Edit,
  ArrowRight,
  GripVertical,
  Plus,
  Layout,
  XCircle,
  AlertTriangle,
  Trash2,
  History as HistoryIcon,
  Settings as SettingsIcon,
  ChevronRight,
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

const CATEGORIES = ["NEW", "OPEN", "IN_PROGRESS", "COMPLETE", "WON", "LOST"];

// --- REUSABLE MODERN COMPONENTS ---

const CardRadioGroup = ({ value, onChange, options }: any) => (
  <Row gutter={[12, 12]}>
    {options.map((opt: any) => {
      const isSelected = value === opt.value;
      return (
        <Col span={opt.span || 8} key={opt.value}>
          <div 
            onClick={() => onChange(opt.value)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `2px solid ${isSelected ? '#1677ff' : '#f0f0f0'}`,
              background: isSelected ? '#e6f4ff' : '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              height: '100%',
              boxShadow: isSelected ? '0 4px 12px rgba(22,119,255,0.15)' : 'none'
            }}
          >
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '6px', 
              background: isSelected ? '#1677ff' : '#f5f5f5',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              {React.cloneElement(opt.icon, { size: 16, color: isSelected ? '#fff' : '#8c8c8c' })}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#003eb3' : '#262626' }}>{opt.label}</div>
              <div style={{ fontSize: '11px', color: isSelected ? '#4096ff' : '#8c8c8c', lineHeight: 1.2, marginTop: 2 }}>{opt.description}</div>
            </div>
          </div>
        </Col>
      );
    })}
  </Row>
);

const ActionListEditor = ({ value = [], onChange }: any) => {
  const addAction = (type: string) => {
    const newAction = {
      id: `act_${Date.now()}`,
      type,
      name: `New ${type} Action`,
      config: {}
    };
    onChange([...value, newAction]);
  };

  const removeAction = (id: string) => {
    onChange(value.filter((a: any) => a.id !== id));
  };

  const updateAction = (id: string, updates: any) => {
    onChange(value.map((a: any) => a.id === id ? { ...a, ...updates } : a));
  };

  return (
    <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '12px', border: '1px dashed #d9d9d9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text strong>Workflow Actions</Text>
        <Space>
           <Button size="small" type="primary" onClick={() => addAction('send_email')} icon={<Mail size={14} />}>Add Email</Button>
           <Button size="small" onClick={() => addAction('update_record')} icon={<Edit size={14} />}>Update Field</Button>
           <Button size="small" onClick={() => addAction('webhook')} icon={<Activity size={14} />}>Webhook</Button>
        </Space>
      </div>
      
      {value.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No actions defined" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {value.map((action: any, idx: number) => (
            <Card key={action.id || idx} size="small" bodyStyle={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <GripVertical size={16} color="#bfbfbf" style={{ cursor: 'grab' }} />
                <Badge count={idx + 1} style={{ backgroundColor: '#f0f0f0', color: '#8c8c8c' }} />
                <div style={{ flex: 1 }}>
                  <Text strong>{action.name}</Text>
                  <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{action.type}</div>
                </div>
                <Space>
                  <Button size="small" type="text" icon={<Edit size={14} />} />
                  <Button size="small" type="text" danger icon={<Trash2 size={14} />} onClick={() => removeAction(action.id)} />
                </Space>
              </div>
            </Card>
          ))}
        </Space>
      )}
    </div>
  );
};

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
      trigger_type: transition.trigger || (transition.is_manual ? 'manual' : 'auto'),
      icon: transition.ui?.icon,
      button_variant: transition.ui?.button_variant || 'primary',
      confirm_message: transition.ui?.confirm_message,
      button_color: transition.ui?.button_color || '#1677ff',
      allowed_roles: transition.guard_rules?.allowed_roles || [],
      validation_rpc: transition.guard_rules?.validation_rpc,
      required_fields: transition.guard_rules?.required_fields || [],
      action_list: transition.actions || []
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
          trigger: values.trigger_type, // Map trigger_type to trigger field
          is_manual: values.trigger_type === 'manual',
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
          },
          // Map action_list back to actions
          actions: values.action_list || []
        };
        
        // Clean up flat fields
        ['icon', 'button_variant', 'confirm_message', 'button_color', 'allowed_roles', 'validation_rpc', 'required_fields', 'is_manual', 'trigger_type'].forEach(f => delete updatedTransition[f]);

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

      {/* --- MODERN STAGE EDITOR --- */}
      <Drawer
        title={
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Space style={{ fontSize: '18px', fontWeight: 700, color: '#1d1d1f' }}>
              <Layout size={20} color="#1677ff" />
              Edit Stage
            </Space>
            <Text type="secondary" style={{ fontSize: '12px', fontWeight: 400 }}>Configure stage properties and workflow behavior</Text>
          </div>
        }
        width={800}
        onClose={() => setIsStageDrawerVisible(false)}
        open={isStageDrawerVisible}
        headerStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', background: '#fff' }}
        bodyStyle={{ padding: '24px' }}
        footer={
          <div style={{ textAlign: 'right', padding: '12px 24px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
            <Space>
              <Button onClick={() => setIsStageDrawerVisible(false)}>Cancel</Button>
              <Button type="primary" size="large" onClick={saveStageDetails} style={{ borderRadius: '8px', padding: '0 32px' }}>Save Changes</Button>
            </Space>
          </div>
        }
      >
        <Form form={stageForm} layout="vertical">
          <Card size="small" title="Basic Information" style={{ marginBottom: 24, borderRadius: '12px' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Stage Name" name="name" rules={[{ required: true }]}>
                  <Input placeholder="Enter stage name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Display Label" name="display_label">
                  <Input placeholder="Enter display label" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Stage ID" name="id" rules={[{ required: true }]}>
                  <Input placeholder="draft" disabled={editingStage?.id !== 'new'} />
                </Form.Item>
                <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: -8 }}>Used internally to reference this stage</Text>
              </Col>
              <Col span={6}>
                <Form.Item label="Sequence" name="sequence">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                 <Form.Item label="Color" name="color">
                   <ColorPicker style={{ width: '100%' }} />
                 </Form.Item>
              </Col>
            </Row>
          </Card>

          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>System Status Category</Title>
            <Form.Item name="category" rules={[{ required: true }]}>
              <CardRadioGroup 
                options={[
                  { value: 'NEW', label: 'New', description: 'Initial state for new entities', icon: <Plus /> },
                  { value: 'OPEN', label: 'Open', description: 'Open and available for work', icon: <ArrowRight /> },
                  { value: 'IN_PROGRESS', label: 'In Progress', description: 'Currently being worked on', icon: <Activity /> },
                  { value: 'COMPLETE', label: 'Complete', description: 'Successfully completed', icon: <CheckCircle2 /> },
                  { value: 'WON', label: 'Closed Won', description: 'Process ended successfully', icon: <Zap /> },
                  { value: 'LOST', label: 'Closed Lost', description: 'Process ended unsuccessfully', icon: <XCircle /> },
                  { value: 'CANCELLED', label: 'Cancelled', description: 'Cancelled or abandoned', icon: <AlertTriangle /> }
                ]}
              />
            </Form.Item>
          </div>

          <Card size="small" title="Event Configuration (Optional)" style={{ marginBottom: 24, borderRadius: '12px' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="On Entry Event Name" name={['events', 'on_entry']}>
                  <Input placeholder="e.g. stage.entered" />
                </Form.Item>
                <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: -8 }}>Event triggered when entering this stage</Text>
              </Col>
              <Col span={12}>
                <Form.Item label="On Exit Event Name" name={['events', 'on_exit']}>
                  <Input placeholder="e.g. stage.exited" />
                </Form.Item>
                <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: -8 }}>Event triggered when exiting this stage</Text>
              </Col>
            </Row>
          </Card>

          <Card size="small" title="Role Assignment (RACI matrix)" style={{ marginBottom: 24, borderRadius: '12px' }}>
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>Define roles and responsibilities for this stage</Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item label="Responsible" name={['raci', 'responsible']}>
                   <AssignmentEditor label="Who does the work" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Accountable" name={['raci', 'accountable']}>
                   <AssignmentEditor label="Who is ultimately responsible" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Consulted" name={['raci', 'consulted']}>
                   <AssignmentEditor label="Who provides input" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Informed" name={['raci', 'informed']}>
                   <AssignmentEditor label="Who needs to be kept informed" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" title="SLA & Performance" style={{ borderRadius: '12px' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Optimistic (Hrs)" name={['time_estimates', 'optimistic_hours']}>
                  <InputNumber style={{ width: '100%' }} onChange={calculatePERT} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Most Likely (Hrs)" name={['time_estimates', 'most_likely_hours']}>
                  <InputNumber style={{ width: '100%' }} onChange={calculatePERT} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Pessimistic (Hrs)" name={['time_estimates', 'pessimistic_hours']}>
                  <InputNumber style={{ width: '100%' }} onChange={calculatePERT} />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <Text>Expected Duration (PERT):</Text>
               <Form.Item name={['time_estimates', 'pert_expected_hours']} noStyle>
                  <Text strong color="#1677ff">{stageForm.getFieldValue(['time_estimates', 'pert_expected_hours'])} hours</Text>
               </Form.Item>
            </div>
          </Card>
        </Form>
      </Drawer>

      {/* --- MODERN TRANSITION EDITOR --- */}
      <Drawer
        title={
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Space style={{ fontSize: '18px', fontWeight: 700, color: '#1d1d1f' }}>
              <ArrowRight size={20} color="#1677ff" />
              Edit Transition
            </Space>
            <Text type="secondary" style={{ fontSize: '12px', fontWeight: 400 }}>Configure how entities move between stages</Text>
          </div>
        }
        width={800}
        onClose={() => setIsTransitionDrawerVisible(false)}
        open={isTransitionDrawerVisible}
        headerStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', background: '#fff' }}
        bodyStyle={{ padding: '24px' }}
        footer={
          <div style={{ textAlign: 'right', padding: '12px 24px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
            <Space>
              <Button onClick={() => setIsTransitionDrawerVisible(false)}>Cancel</Button>
              <Button type="primary" size="large" onClick={saveTransitionDetails} style={{ borderRadius: '8px', padding: '0 32px' }}>Save Changes</Button>
            </Space>
          </div>
        }
      >
        <Form form={transitionForm} layout="vertical">
          <Card size="small" title="Basic Information" style={{ marginBottom: 24, borderRadius: '12px' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Transition Name" name="label" rules={[{ required: true }]}>
                  <Input placeholder="Enter transition name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Transition ID" name="id" rules={[{ required: true }]}>
                  <Input placeholder="T_SUBMIT" disabled={editingTransitionIndex !== null} />
                </Form.Item>
                <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: -8 }}>Used internally to reference this transition</Text>
              </Col>
              <Col span={12}>
                <Form.Item label="From Stage(s)" name="from" rules={[{ required: true }]}>
                   <Select mode="multiple" placeholder="Stages this transition can start from">
                      {(blueprint.definition?.lifecycle?.stages || []).map((s: any) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                   </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="To Stage" name="to" rules={[{ required: true }]}>
                   <Select placeholder="Stage this transition leads to">
                      {(blueprint.definition?.lifecycle?.stages || []).map((s: any) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                   </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>Trigger Configuration</Title>
            <Form.Item name="trigger_type" rules={[{ required: true }]}>
              <CardRadioGroup 
                options={[
                  { value: 'manual', label: 'Manual', description: 'User-initiated transition', icon: <MousePointer /> },
                  { value: 'auto', label: 'Automatic', description: 'Happens automatically when entry conditions met', icon: <Zap /> },
                  { value: 'event', label: 'Event-Based', description: 'Triggered by external events', icon: <Activity /> },
                  { value: 'time', label: 'Time-Based', description: 'Triggered after time threshold', icon: <Clock /> }
                ]}
              />
            </Form.Item>
          </div>

          <Card size="small" title="Condition (Optional)" style={{ marginBottom: 24, borderRadius: '12px' }}>
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>Optional condition that must be met for this transition to be available</Paragraph>
            <Form.Item label="Condition Rule" name="condition">
               <Input.TextArea placeholder="e.g. {{entity.assignee_id}} IS NOT NULL" rows={3} />
            </Form.Item>
          </Card>

          <Card size="small" title="Workflow Actions" style={{ marginBottom: 24, borderRadius: '12px' }}>
             <Paragraph type="secondary" style={{ fontSize: '12px' }}>Actions that execute when this transition completes</Paragraph>
             <Form.Item name="action_list">
                <ActionListEditor />
             </Form.Item>
          </Card>

          <Card size="small" title="UI Customization" style={{ borderRadius: '12px' }}>
             <Row gutter={16}>
               <Col span={8}>
                  <Form.Item label="Button Variant" name="button_variant">
                    <Select>
                      <Option value="primary">Primary (Glow)</Option>
                      <Option value="secondary">Secondary (Soft)</Option>
                      <Option value="danger">Danger (Red)</Option>
                    </Select>
                  </Form.Item>
               </Col>
               <Col span={8}>
                  <Form.Item label="Icon" name="icon">
                    <Input placeholder="check, play, arrow-right" />
                  </Form.Item>
               </Col>
               <Col span={8}>
                  <Form.Item label="Color" name="button_color">
                    <ColorPicker />
                  </Form.Item>
               </Col>
             </Row>
          </Card>
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
