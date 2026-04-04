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

const CATEGORIES = ["NEW", "IN_PROGRESS", "CLOSED_WON", "CLOSED_LOST", "CANCELLED"];

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
  const addAction = (action_type: string) => {
    onChange([...value, {
      name: `New ${action_type} action`,
      action_type,
      config: {},
      priority: (value.length + 1) * 10,
      retry_policy: { max_retries: 3, delay_seconds: 60 }
    }]);
  };
  const removeAction = (idx: number) => onChange(value.filter((_: any, i: number) => i !== idx));

  return (
    <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '12px', border: '1px dashed #d9d9d9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text strong>on_transition Actions</Text>
        <Space>
          <Button size="small" type="primary" onClick={() => addAction('send_email')} icon={<Mail size={14} />}>Email</Button>
          <Button size="small" onClick={() => addAction('send_notification')} icon={<Activity size={14} />}>Notify</Button>
          <Button size="small" onClick={() => addAction('update_entity')} icon={<Edit size={14} />}>Update</Button>
          <Button size="small" onClick={() => addAction('rpc')} icon={<Zap size={14} />}>RPC</Button>
        </Space>
      </div>
      {value.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transition actions defined" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {value.map((action: any, idx: number) => (
            <Card key={idx} size="small" bodyStyle={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <GripVertical size={16} color="#bfbfbf" style={{ cursor: 'grab' }} />
                <Badge count={idx + 1} style={{ backgroundColor: '#f0f0f0', color: '#8c8c8c' }} />
                <div style={{ flex: 1 }}>
                  <Text strong>{action.name}</Text>
                  <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{action.action_type}</div>
                </div>
                <Button size="small" type="text" danger icon={<Trash2 size={14} />} onClick={() => removeAction(idx)} />
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
        automations: { on_stage_entry: {}, on_stage_exit: {}, on_transition: {} },
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
          // Preserve automations: if flat array (from AutomationManager), nest it back; if already object, pass through
          automations: Array.isArray(definition.automations)
            ? nestAutomations(definition.automations)
            : (definition.automations || { on_stage_entry: {}, on_stage_exit: {}, on_transition: {} }),
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
      const newStages = stages.map((s: any) => {
        if (s.id !== editingStage?.id) return s;
        return {
          ...s, // preserve fields not in form: cancellation_rules, approval_rules, etc.
          id: values.id,
          name: values.name,
          category: values.category,
          sequence: values.sequence ?? s.sequence,
          description: values.description || '',
          raci: {
            responsible: values.raci?.responsible ?? (s.raci?.responsible || ''),
            accountable: values.raci?.accountable ?? (s.raci?.accountable || ''),
            consulted: Array.isArray(values.raci?.consulted) ? values.raci.consulted : (s.raci?.consulted || []),
            informed: Array.isArray(values.raci?.informed) ? values.raci.informed : (s.raci?.informed || []),
          },
          time_estimates: {
            optimistic_hours: values.time_estimates?.optimistic_hours ?? null,
            most_likely_hours: values.time_estimates?.most_likely_hours ?? null,
            pessimistic_hours: values.time_estimates?.pessimistic_hours ?? null,
            aspirational_hours: s.time_estimates?.aspirational_hours ?? null,
            pert_expected_hours: values.time_estimates?.pert_expected_hours ?? null,
          },
          cost_estimates: s.cost_estimates || {
            fixed_cost: 0,
            cost_center: '',
            labor_cost_per_hour: null,
            aspirational_total_cost: null,
          },
        };
      });
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
    // Load on_transition actions from automations, not from the transition object itself
    const automations = blueprint.definition?.automations;
    let onTransitionActions: any[] = [];
    if (automations && !Array.isArray(automations)) {
      onTransitionActions = automations.on_transition?.[transition.id]?.actions || [];
    } else if (Array.isArray(automations)) {
      const entry = automations.find((a: any) => a.event === 'on_transition' && a.target_id === transition.id);
      onTransitionActions = entry?.actions || [];
    }
    transitionForm.setFieldsValue({
      id: transition.id,
      label: transition.label,
      from: transition.from,   // single string
      to: transition.to,
      trigger: transition.trigger || 'manual',
      condition_type: transition.condition?.type || 'always',
      condition_expression: transition.condition?.expression || '',
      icon: transition.ui?.icon || '',
      button_variant: transition.ui?.button_variant || 'primary',
      confirm_message: transition.ui?.confirm_message || '',
      allowed_roles: transition.guard_rules?.allowed_roles || [],
      validation_rpc: transition.guard_rules?.validation_rpc || '',
      required_fields: transition.guard_rules?.required_fields || [],
      action_list: onTransitionActions,
    });
    setIsTransitionDrawerVisible(true);
  };

  const saveTransitionDetails = () => {
    transitionForm.validateFields().then(values => {
      if (editingTransitionIndex === null) return;
      const transitions = [...(blueprint.definition?.lifecycle?.transitions || [])];
      const existingTransition = transitions[editingTransitionIndex];

      // Build properly structured condition object
      const condition = values.condition_type === 'always'
        ? { type: 'always' }
        : { type: values.condition_type || 'field_check', expression: values.condition_expression || '' };

      // Schema-correct transition — NO is_manual, NO trigger_type, NO actions array
      const updatedTransition: any = {
        id: existingTransition.id,
        from: values.from,         // single string
        to: values.to,
        label: values.label,
        trigger: values.trigger || 'manual',  // 'manual' | 'automatic'
        condition,
        ui: {
          icon: values.icon || null,
          button_variant: values.button_variant || 'primary',
          confirm_message: values.confirm_message || null,
        },
        guard_rules: {
          allowed_roles: values.allowed_roles || [],
          validation_rpc: values.validation_rpc || null,
          required_fields: values.required_fields || [],
        },
      };
      transitions[editingTransitionIndex] = updatedTransition;

      // action_list belongs in automations.on_transition, NOT on the transition object
      setBlueprint(prev => {
        const newLifecycle = { ...prev.definition?.lifecycle, transitions };
        const existingAutomations = prev.definition?.automations;
        let updatedAutomations: any;
        if (Array.isArray(existingAutomations)) {
          // Flat format used by AutomationManager tab
          const filtered = existingAutomations.filter(
            (a: any) => !(a.event === 'on_transition' && a.target_id === updatedTransition.id)
          );
          if (values.action_list?.length > 0) {
            filtered.push({ event: 'on_transition', target_id: updatedTransition.id,
              name: `on_transition:${updatedTransition.id}`, actions: values.action_list, is_active: true });
          }
          updatedAutomations = filtered;
        } else {
          // Nested object format
          const nested = { ...(existingAutomations || {}) };
          const onTransition = { ...(nested.on_transition || {}) };
          if (values.action_list?.length > 0) {
            onTransition[updatedTransition.id] = { actions: values.action_list };
          } else {
            delete onTransition[updatedTransition.id];
          }
          updatedAutomations = { ...nested, on_transition: onTransition };
        }
        const newDefinition = { ...prev.definition, lifecycle: newLifecycle, automations: updatedAutomations };
        form.setFieldsValue({ definitionStr: JSON.stringify(newDefinition, null, 2) });
        return { ...prev, definition: newDefinition };
      });
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
                <Form.Item label="Stage ID" name="id" rules={[{ required: true }]}>
                  <Input placeholder="draft" disabled={!!editingStage?.id} />
                </Form.Item>
                <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: -8 }}>Used internally — cannot change after creation</Text>
              </Col>
              <Col span={24}>
                <Form.Item label="Description" name="description">
                  <Input.TextArea placeholder="Describe what happens in this stage and any important context for assignees" rows={2} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Sequence" name="sequence">
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item label="Color" name="color">
                   <ColorPicker style={{ width: '100%' }} />
                 </Form.Item>
              </Col>
            </Row>
          </Card>

          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 8 }}>System Status Category</Title>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 12 }}>
              Maps this stage to a system lifecycle category. The automation engine uses this to evaluate business rules.
            </Text>
            <Form.Item name="category" rules={[{ required: true, message: 'Category is required' }]}>
              <CardRadioGroup 
                options={[
                  { value: 'NEW', label: 'New', description: 'Initial state — entity just created', icon: <Plus />, span: 8 },
                  { value: 'IN_PROGRESS', label: 'In Progress', description: 'Actively being worked on', icon: <Activity />, span: 8 },
                  { value: 'CLOSED_WON', label: 'Closed Won', description: 'Successfully completed', icon: <CheckCircle2 />, span: 8 },
                  { value: 'CLOSED_LOST', label: 'Closed Lost', description: 'Rejected, lost or failed', icon: <XCircle />, span: 8 },
                  { value: 'CANCELLED', label: 'Cancelled', description: 'Cancelled or abandoned', icon: <AlertTriangle />, span: 8 },
                ]}
              />
            </Form.Item>
          </div>


          <Card size="small" title="RACI Matrix — Role Assignment" style={{ marginBottom: 24, borderRadius: '12px' }}>
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>
              Use role IDs (e.g. <code>SALES_REP</code>, <code>HR</code>) or dynamic values (e.g. <code>{"{{entity.user_id}}"}</code>).
              Consulted and Informed accept multiple values.
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item label="Responsible — does the work" name={['raci', 'responsible']}>
                  <Input placeholder="e.g. HR, {{entity.user_id}}" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Accountable — ultimate owner" name={['raci', 'accountable']}>
                  <Input placeholder="e.g. HIRING_MANAGER, {{entity.user_id}}.manager_id" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Consulted — provides input" name={['raci', 'consulted']}>
                  <Select mode="tags" placeholder="e.g. FINANCE, LEGAL" tokenSeparators={[',']} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Informed — kept in the loop" name={['raci', 'informed']}>
                  <Select mode="tags" placeholder="e.g. ACCOUNT_MANAGEMENT" tokenSeparators={[',']} />
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
                <Form.Item label="From Stage" name="from" rules={[{ required: true }]}>
                   <Select placeholder="Stage this transition starts from">
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
            <Title level={5} style={{ marginBottom: 8 }}>Trigger Type</Title>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 12 }}>
              How this transition is initiated. Use <code>automatic</code> for system-driven transitions (e.g. scheduled, date-based).
            </Text>
            <Form.Item name="trigger" rules={[{ required: true }]}>
              <CardRadioGroup 
                options={[
                  { value: 'manual', label: 'Manual', description: 'User clicks a button to trigger', icon: <MousePointer />, span: 12 },
                  { value: 'automatic', label: 'Automatic', description: 'System triggers when condition is met', icon: <Zap />, span: 12 },
                ]}
              />
            </Form.Item>
          </div>

          <Card size="small" title="Condition" style={{ marginBottom: 24, borderRadius: '12px' }}>
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>
              When must this transition be available? Use <code>always</code> for unconditional, or define an expression.
            </Paragraph>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Condition Type" name="condition_type">
                  <Select>
                    <Option value="always">Always</Option>
                    <Option value="field_check">Field Check</Option>
                    <Option value="expression">Expression</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, curr) => prev.condition_type !== curr.condition_type}
                >
                  {({ getFieldValue }) =>
                    getFieldValue('condition_type') !== 'always' ? (
                      <Form.Item label="Expression" name="condition_expression">
                        <Input.TextArea
                          placeholder="e.g. total_amount > 0 AND has_receipts = true"
                          rows={2}
                        />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" title="Guard Rails" style={{ marginBottom: 24, borderRadius: '12px' }}>
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>
              Control who can trigger this transition and what fields must be populated first.
            </Paragraph>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Allowed Roles" name="allowed_roles">
                  <Select
                    mode="tags"
                    placeholder="e.g. APPROVER, HR_MANAGER, OWNER"
                    tokenSeparators={[',']}
                  />
                </Form.Item>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: -8 }}>Use OWNER for entity owner, APPROVER for approval roles</Text>
              </Col>
              <Col span={12}>
                <Form.Item label="Required Fields" name="required_fields">
                  <Select
                    mode="tags"
                    placeholder="e.g. details.rejection_reason, total_amount"
                    tokenSeparators={[',']}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Validation RPC (optional)" name="validation_rpc">
                  <Input placeholder="e.g. workforce.util_check_leave_balance" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" title="on_transition Actions" style={{ marginBottom: 24, borderRadius: '12px' }}>
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>
              Actions that run when this transition fires. Stored in <code>automations.on_transition</code>.
            </Paragraph>
            <Form.Item name="action_list">
              <ActionListEditor />
            </Form.Item>
          </Card>

          <Card size="small" title="UI Customization" style={{ borderRadius: '12px' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Button Variant" name="button_variant">
                  <Select>
                    <Option value="primary">Primary</Option>
                    <Option value="secondary">Secondary</Option>
                    <Option value="danger">Danger (Red)</Option>
                    <Option value="warning">Warning (Orange)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Icon" name="icon">
                  <Input placeholder="check, send, x-circle, alert-triangle" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Confirm Message (optional)" name="confirm_message">
                  <Input placeholder="Are you sure?" />
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
