import React, { useState, useEffect } from 'react';
import { Button, Input, Form, Select, Row, Col, Card, message, Tabs, Table, Typography, Modal, Popconfirm, Switch, Checkbox } from 'antd';
import { SaveOutlined, HistoryOutlined, SettingOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { ProcessBlueprint, ProcessBlueprintHistory } from './types/entityTypes';
import JsonEditor from '@/modules/ai/components/JsonEditor';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { 
  BranchesOutlined, 
  NodeIndexOutlined, 
  ThunderboltOutlined, 
  CheckCircleOutlined,
  LayoutOutlined,
  PlusOutlined,
  CompassOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Steps } from 'antd';

const { Step } = Steps;

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Paragraph } = Typography;

interface ProcessBlueprintConfigProps {
  blueprintId?: string;
  onSaveSuccess?: (blueprint: ProcessBlueprint) => void;
}

const ProcessBlueprintConfig: React.FC<ProcessBlueprintConfigProps> = ({ blueprintId, onSaveSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<Partial<ProcessBlueprint>>({});
  const [history, setHistory] = useState<ProcessBlueprintHistory[]>([]);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<ProcessBlueprintHistory | null>(null);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [diffActiveKey, setDiffActiveKey] = useState<string>('full');
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(0);
  const [templates, setTemplates] = useState<any[]>([]);
  const [fragments, setFragments] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedFragments, setSelectedFragments] = useState<string[]>([]);
  const [wizardConfig, setWizardConfig] = useState<any>({
    stages: [],
    subProcesses: [],
    fragments: {}
  });

  const [form] = Form.useForm();

  useEffect(() => {
    fetchWizardData().then(() => {
      if (blueprintId) {
        fetchBlueprint();
        setCurrentStep(1); // Start at Sub-Processes for edits
      } else {
        resetForm();
        setCurrentStep(0);
      }
    });
  }, [blueprintId]);

  const fetchWizardData = async () => {
    try {
      const [tplRes, fragRes] = await Promise.all([
        supabase.schema('automation').from('bp_templates').select('*').eq('is_active', true),
        supabase.schema('automation').from('bp_fragments').select('*').eq('is_active', true)
      ]);

      if (tplRes.data) setTemplates(tplRes.data);
      if (fragRes.data) setFragments(fragRes.data);
    } catch (err) {
      console.error('Error fetching wizard data:', err);
    }
  };

  const resetForm = () => {
    const defaults: Partial<ProcessBlueprint> = {
      name: '',
      description: '',
      entity_schema: '',
      entity_type: '',
      blueprint_type: 'lifecycle',
      is_active: true,
      definition: {
        name: "",
        entity_schema: "",
        entity_type: "",
        blueprint_type: "lifecycle",
        lifecycle: {
          startStateId: "new",
          stages: [
            { id: "new", name: "New", category: "NEW" }
          ]
        }
      },
      metadata: {},
      intent: ''
    };
    setBlueprint(defaults);
    form.setFieldsValue({
      ...defaults,
      definition: JSON.stringify(defaults.definition, null, 2),
      metadata: JSON.stringify(defaults.metadata, null, 2),
    });
    setHistory([]);
  };

  const extractWizardStateFromDefinition = (def: any) => {
    if (!def) return;

    const stages = def.lifecycle?.stages || [];
    const subProcesses = def.sub_processes || [];
    
    setWizardConfig({
      stages: stages.map((s: any) => ({ ...s, id: s.id || `stage_${Date.now()}_${Math.random()}` })),
      subProcesses: subProcesses.map((sp: any) => ({ ...sp, id: sp.id || `sp_${Date.now()}_${Math.random()}` })),
      fragments: {}
    });

    // Try to match fragments
    if (fragments.length > 0) {
      const matchedKeys = fragments.filter(f => {
        const defStr = JSON.stringify(f.definition);
        const inAutomations = def.automations?.some((a: any) => JSON.stringify(a) === defStr);
        const inSla = def.sla_rules?.some((s: any) => JSON.stringify(s) === defStr);
        return inAutomations || inSla;
      }).map(f => f.key);
      setSelectedFragments(matchedKeys);
    }
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
        setBlueprint(data);
        form.setFieldsValue({
          ...data,
          definition: JSON.stringify(data.definition || {}, null, 2),
          metadata: JSON.stringify(data.metadata || {}, null, 2),
        });
        
        if (data.definition) {
          extractWizardStateFromDefinition(data.definition);
        }
        
        fetchHistory(data.id);
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
      console.error('Error fetching process blueprint history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const validateDefinition = (def: any) => {
    const required = ['name', 'entity_schema', 'entity_type', 'blueprint_type', 'lifecycle'];
    const missing = required.filter(f => !def[f]);
    if (missing.length > 0) return `Missing required fields in definition: ${missing.join(', ')}`;
    
    if (!def.lifecycle.startStateId || !Array.isArray(def.lifecycle.stages) || def.lifecycle.stages.length === 0) {
      return "Lifecycle must have a startStateId and at least one stage.";
    }

    const validCategories = ["NEW", "IN_PROGRESS", "CLOSED_WON", "CLOSED_LOST", "CANCELLED"];
    for (const stage of def.lifecycle.stages) {
      if (!stage.id || !stage.name || !stage.category) {
        return `Stage "${stage.name || stage.id || 'unnamed'}" is missing required fields (id, name, category).`;
      }
      if (!validCategories.includes(stage.category)) {
        return `Stage "${stage.name}" has invalid category "${stage.category}". Must be one of: ${validCategories.join(', ')}`;
      }
    }

    return null;
  };

  const handleSave = async (values: any) => {
    try {
      setSaving(true);
      
      const definition = JSON.parse(values.definition || '{}');
      const validationError = validateDefinition(definition);
      
      if (validationError) {
        if (currentStep > 0) {
          Modal.confirm({
            title: 'Definition Not Applied',
            content: 'The blueprint definition appears to be empty or invalid. Did you forget to click "Confirm & Apply" in the Finalize step of the Wizard?',
            okText: 'Apply Wizard & Save',
            cancelText: 'Cancel Save',
            onOk: async () => {
              const assembled = assembleBlueprint();
              form.setFieldsValue({ definition: JSON.stringify(assembled, null, 2) });
              const retryPayload = {
                ...values,
                definition: assembled,
                updated_at: new Date().toISOString(),
              };
              await executeSave(retryPayload);
            }
          });
          return;
        } else {
          message.error(validationError);
          return;
        }
      }

      const payload: any = {
        ...values,
        definition,
        metadata: JSON.parse(values.metadata || '{}'),
        updated_at: new Date().toISOString(),
      };

      if (blueprintId) {
        payload.id = blueprintId;
      }

      await executeSave(payload);
      
    } catch (error: any) {
      console.error('Error in handleSave:', error);
      message.error(`Failed to save blueprint: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const executeSave = async (payload: any) => {
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
  };

  const handleTemplateSelect = (tpl: any) => {
    setSelectedTemplate(tpl);
    const def = tpl.definition;
    setWizardConfig({
      stages: def.stages || [],
      subProcesses: def.sub_processes || [],
      fragments: {}
    });
    setSelectedFragments(def.suggested_fragments || []);
    
    // Auto-fill form basics
    form.setFieldsValue({
      name: tpl.name,
      description: def.description || tpl.description,
      blueprint_type: tpl.blueprint_type,
      entity_type: tpl.entity_type
    });
    
    setCurrentStep(1);
  };

  const renderStep0 = () => (
    <div style={{ padding: '20px 0' }}>
      <Title level={4}>Choose a Process Template</Title>
      <Paragraph>Select a pre-defined industry-standard template to get started instantly.</Paragraph>
      <Row gutter={[16, 16]}>
        {templates.map(tpl => (
          <Col span={8} key={tpl.id}>
            <Card 
              hoverable 
              className={selectedTemplate?.id === tpl.id ? 'border-primary' : ''}
              style={{ 
                height: '100%', 
                border: selectedTemplate?.id === tpl.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                borderRadius: '12px',
                overflow: 'hidden'
              }}
              onClick={() => handleTemplateSelect(tpl)}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ 
                  background: tpl.metadata?.color || '#f0f2f5', 
                  padding: '8px', 
                  borderRadius: '8px', 
                  marginRight: '12px',
                  color: '#fff'
                }}>
                  <LayoutOutlined />
                </div>
                <Title level={5} style={{ margin: 0 }}>{tpl.name}</Title>
              </div>
              <Paragraph style={{ fontSize: '12px', color: '#666', height: '40px', overflow: 'hidden' }}>
                {tpl.description}
              </Paragraph>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {tpl.metadata?.industry?.map((ind: string) => (
                  <span key={ind} style={{ 
                    fontSize: '10px', 
                    background: '#e6f7ff', 
                    color: '#1890ff', 
                    padding: '2px 8px', 
                    borderRadius: '10px' 
                  }}>
                    {ind.toUpperCase()}
                  </span>
                ))}
              </div>
            </Card>
          </Col>
        ))}
        <Col span={8}>
          <Card 
            hoverable 
            style={{ 
              height: '100%', 
              background: '#fafafa', 
              border: '1px dashed #d9d9d9',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '160px',
              borderRadius: '12px'
            }}
            onClick={() => {
              setSelectedTemplate({ id: 'custom', name: 'Blank Template', definition: { stages: [{ id: 'new', name: 'New', category: 'NEW' }] } });
              setCurrentStep(1);
            }}
          >
            <PlusOutlined style={{ fontSize: '24px', color: '#888', marginBottom: '8px' }} />
            <span style={{ color: '#888' }}>Start from Scratch</span>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderStep1 = () => (
    <div style={{ padding: '20px 0' }}>
      <Title level={4}>Configure Sub-Processes</Title>
      <Paragraph>Enable or disable components of your macro-process.</Paragraph>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {wizardConfig.subProcesses.length > 0 ? (
          wizardConfig.subProcesses.map((sp: any, idx: number) => (
            <Card size="small" key={sp.id} style={{ borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BranchesOutlined style={{ color: '#1890ff' }} />
                  <Input 
                    value={sp.name} 
                    onChange={e => {
                      const newSub = [...wizardConfig.subProcesses];
                      newSub[idx].name = e.target.value;
                      setWizardConfig({ ...wizardConfig, subProcesses: newSub });
                    }}
                    style={{ width: '300px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#999' }}>Target: {sp.entity_type}</span>
                </div>
                <Switch 
                  checked={!sp.disabled} 
                  onChange={val => {
                    const newSub = [...wizardConfig.subProcesses];
                    newSub[idx].disabled = !val;
                    setWizardConfig({ ...wizardConfig, subProcesses: newSub });
                  }}
                />
              </div>
            </Card>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '12px', border: '1px dashed #d9d9d9' }}>
            <NodeIndexOutlined style={{ fontSize: '32px', color: '#ccc', marginBottom: '12px' }} />
            <Paragraph style={{ color: '#999' }}>No sub-processes defined for this template.</Paragraph>
            <Button icon={<PlusOutlined />} onClick={() => {
              setWizardConfig({
                ...wizardConfig,
                subProcesses: [...wizardConfig.subProcesses, { id: `sp-${Date.now()}`, name: 'New Sub-Process', sequence: wizardConfig.subProcesses.length + 1 }]
              });
            }}>Add Custom Sub-Process</Button>
          </div>
        )}
      </div>
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setCurrentStep(0)}>Back</Button>
        <Button type="primary" onClick={() => setCurrentStep(2)}>Next: Logic & Automation</Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ padding: '20px 0' }}>
      <Title level={4}>Logic & Automation</Title>
      <Paragraph>Select reusable fragments to add logic (SLAs, Approvals, Notifications) to your process.</Paragraph>
      <Row gutter={[16, 16]}>
        {fragments.map(frag => {
          const isSelected = selectedFragments.includes(frag.key);
          return (
            <Col span={12} key={frag.id}>
              <Card 
                size="small"
                hoverable
                style={{ 
                  border: isSelected ? '1px solid #1890ff' : '1px solid #f0f0f0',
                  background: isSelected ? '#e6f7ff' : '#fff',
                  borderRadius: '8px'
                }}
                onClick={() => {
                  if (isSelected) {
                    setSelectedFragments(selectedFragments.filter(k => k !== frag.key));
                  } else {
                    setSelectedFragments([...selectedFragments, frag.key]);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Checkbox checked={isSelected} />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{frag.name}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{frag.category?.toUpperCase()}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{frag.definition?.description}</div>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setCurrentStep(1)}>Back</Button>
        <Button type="primary" onClick={() => setCurrentStep(3)}>Next: Stage & SLA Setup</Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={{ padding: '20px 0' }}>
      <Title level={4}>Stage & SLA Setup</Title>
      <Paragraph>Define the lifecycle stages and map them to categories (NEW, IN_PROGRESS, CLOSED).</Paragraph>
      <Table 
        dataSource={wizardConfig.stages}
        pagination={false}
        size="small"
        rowKey="id"
        columns={[
          {
            title: 'Sequence',
            dataIndex: 'sequence',
            width: 80,
            render: (val, _, idx) => (
              <Input type="number" value={val || idx + 1} onChange={e => {
                const newStages = [...wizardConfig.stages];
                newStages[idx].sequence = parseInt(e.target.value);
                setWizardConfig({ ...wizardConfig, stages: newStages });
              }} />
            )
          },
          {
            title: 'Stage Name',
            dataIndex: 'name',
            render: (val, _, idx) => (
              <Input value={val} onChange={e => {
                const newStages = [...wizardConfig.stages];
                newStages[idx].name = e.target.value;
                setWizardConfig({ ...wizardConfig, stages: newStages });
              }} />
            )
          },
          {
            title: 'Category',
            dataIndex: 'category',
            render: (val, _, idx) => (
              <Select value={val} style={{ width: '100%' }} onChange={v => {
                const newStages = [...wizardConfig.stages];
                newStages[idx].category = v;
                setWizardConfig({ ...wizardConfig, stages: newStages });
              }}>
                <Option value="NEW">New</Option>
                <Option value="IN_PROGRESS">In Progress</Option>
                <Option value="CLOSED_WON">Closed Won</Option>
                <Option value="CLOSED_LOST">Closed Lost</Option>
                <Option value="CANCELLED">Cancelled</Option>
              </Select>
            )
          },
          {
            title: '',
            key: 'actions',
            width: 50,
            render: (_, __, idx) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => {
                const newStages = wizardConfig.stages.filter((_: any, i: number) => i !== idx);
                setWizardConfig({ ...wizardConfig, stages: newStages });
              }} />
            )
          }
        ]}
      />
      <Button 
        type="dashed" 
        block 
        icon={<PlusOutlined />} 
        style={{ marginTop: 12 }}
        onClick={() => {
          setWizardConfig({
            ...wizardConfig,
            stages: [...wizardConfig.stages, { id: `stage_${Date.now()}`, name: 'New Stage', category: 'IN_PROGRESS', sequence: wizardConfig.stages.length + 1 }]
          });
        }}
      >
        Add Stage
      </Button>
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setCurrentStep(2)}>Back</Button>
        <Button type="primary" onClick={() => setCurrentStep(4)}>Next: Review & Assemble</Button>
      </div>
    </div>
  );

  const assembleBlueprint = () => {
    const finalDefinition: any = {
      name: form.getFieldValue('name'),
      description: form.getFieldValue('description'),
      blueprint_type: form.getFieldValue('blueprint_type'),
      entity_type: form.getFieldValue('entity_type'),
      entity_schema: form.getFieldValue('entity_schema') || 'crm',
      lifecycle: {
        stages: wizardConfig.stages,
        startStateId: wizardConfig.stages[0]?.id || 'new'
      },
      sub_processes: wizardConfig.subProcesses.filter((sp: any) => !sp.disabled),
      automations: [],
      sla_rules: []
    };

    // Integrate fragments
    selectedFragments.forEach(key => {
      const frag = fragments.find(f => f.key === key);
      if (frag) {
        if (frag.category === 'sla') {
          finalDefinition.sla_rules.push(frag.definition);
        } else if (frag.category === 'automation' || frag.category === 'approval') {
          finalDefinition.automations.push(frag.definition);
        }
      }
    });

    return finalDefinition;
  };

  const renderStep4 = () => {
    const assembly = assembleBlueprint();
    return (
      <div style={{ padding: '20px 0' }}>
        <Title level={4}>Review & Assemble</Title>
        <Paragraph>Verification of the generated process definition. You can still manually edit the JSON after this.</Paragraph>
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Process Summary" size="small">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Template:</strong> {selectedTemplate?.name}</div>
                <div><strong>Stages:</strong> {assembly.lifecycle.stages.length}</div>
                <div><strong>Sub-Processes:</strong> {assembly.sub_processes.length} active</div>
                <div><strong>Automations/SLAs:</strong> {selectedFragments.length} fragments</div>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="JSON Preview" size="small" bodyStyle={{ padding: 0 }}>
              <pre style={{ fontSize: '11px', maxHeight: '300px', overflow: 'auto', background: '#f5f5f5', padding: '12px', margin: 0 }}>
                {JSON.stringify(assembly, null, 2)}
              </pre>
            </Card>
          </Col>
        </Row>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setCurrentStep(3)}>Back</Button>
          <Button type="primary" size="large" onClick={() => {
            form.setFieldsValue({
              definition: JSON.stringify(assembly, null, 2)
            });
            message.success('Blueprint assembled! Check the "Definition" tab.');
          }}>Confirm & Apply to Editor</Button>
        </div>
      </div>
    );
  };

  const renderWizard = () => {
    const isEdit = !!blueprintId;
    const steps = [
      { title: 'Discovery', icon: <CompassOutlined />, hidden: isEdit },
      { title: 'Sub-Processes', icon: <BranchesOutlined /> },
      { title: 'Logic', icon: <ThunderboltOutlined /> },
      { title: 'Stages', icon: <NodeIndexOutlined /> },
      { title: 'Finalize', icon: <CheckCircleOutlined /> }
    ].filter(s => !s.hidden);

    // Adjust step index if Discovery is hidden
    const displayStep = isEdit ? currentStep - 1 : currentStep;

    return (
      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f0f0f0' }}>
          <Steps current={displayStep >= 0 ? displayStep : 0} size="small">
            {steps.map((s, i) => (
              <Step key={i} title={s.title} icon={s.icon} />
            ))}
          </Steps>
        </div>
        <div style={{ padding: '24px', minHeight: '400px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 0 && !isEdit && renderStep0()}
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {isEdit && currentStep === 0 && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Title level={4}>Editing Existing Blueprint</Title>
                  <Paragraph>Template selection is disabled for existing blueprints to prevent accidental overwrites. You can modify sub-processes, logic, and stages in the following steps.</Paragraph>
                  <Button type="primary" onClick={() => setCurrentStep(1)}>Go to Step 1: Sub-Processes</Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
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
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewHistory(record)}>Compare</Button>
      )
    }
  ];

  const configFields = [
    { key: 'definition', label: 'Definition' },
    { key: 'metadata', label: 'Metadata' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'blueprint_type', label: 'Type' },
    { key: 'intent', label: 'Intent' },
  ];

  const handleViewHistory = (record: ProcessBlueprintHistory) => {
    setSelectedHistoryRecord(record);
    setIsHistoryModalVisible(true);
    setDiffActiveKey('full');
  };

  const handleRestore = () => {
    if (!selectedHistoryRecord) return;
    
    const data = selectedHistoryRecord.data;
    if (!data) return;

    // The data in history is context dependent, but usually it's the full blueprint data
    form.setFieldsValue({
      ...data,
      definition: JSON.stringify(data.definition || data || {}, null, 2),
      metadata: JSON.stringify(data.metadata || {}, null, 2),
    });

    message.success('Historical configuration loaded into form. Click Save to persist.');
  };

  const handleDeleteHistory = async () => {
    if (!selectedHistoryRecord) return;
    
    try {
      setDeleting(true);
      const { error } = await supabase
        .schema('automation')
        .from('bp_process_blueprints_history')
        .delete()
        .eq('id', selectedHistoryRecord.id);

      if (error) throw error;

      message.success('Historical record deleted successfully');
      setIsHistoryModalVisible(false);
      
      if (blueprint.id) {
        fetchHistory(blueprint.id);
      }
    } catch (error: any) {
      console.error('Error deleting process blueprint history:', error);
      message.error(`Failed to delete history: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const normalizeData = (data: any) => {
    if (!data) return '';
    const clean = { ...data };
    const fieldsToRemove = [
      'id', 'created_at', 'updated_at', 'blueprint_id', 
      'organization_id', 'created_by', 'updated_by', 'version'
    ];
    fieldsToRemove.forEach(f => delete clean[f]);
    return JSON.stringify(clean, null, 2);
  };

  const hasFieldChanged = (fieldName: string) => {
    if (!selectedHistoryRecord) return false;
    
    // In bp_process_blueprints_history, 'data' contains the snapshot
    const historicalData = selectedHistoryRecord.data;
    const historicalValue = historicalData?.[fieldName];
    const currentValue = (blueprint as any)?.[fieldName];
    
    const histStr = typeof historicalValue === 'object' ? JSON.stringify(historicalValue) : String(historicalValue || '');
    const currStr = typeof currentValue === 'object' ? JSON.stringify(currentValue) : String(currentValue || '');
    
    return histStr !== currStr;
  };

  const getGranularOldValue = () => {
    if (!selectedHistoryRecord || !diffActiveKey) return '';
    const historicalData = selectedHistoryRecord.data;
    if (diffActiveKey === 'full') return normalizeData(historicalData);
    
    const val = historicalData?.[diffActiveKey];
    return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '');
  };

  const getGranularNewValue = () => {
    if (!diffActiveKey) return '';
    if (diffActiveKey === 'full') return normalizeData(blueprint);
    
    const val = (blueprint as any)?.[diffActiveKey];
    return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '');
  };

  if (loading) return <div>Loading blueprint...</div>;

  return (
    <div style={{ padding: '0' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{ is_active: true, blueprint_type: 'lifecycle' }}
      >
        <Row gutter={24}>
          <Col span={16}>
            <Card title="Blueprint Details" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item name="name" label="Blueprint Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Sales Lifecycle" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="blueprint_type" label="Type" rules={[{ required: true }]}>
                    <Select>
                      <Option value="lifecycle">Lifecycle</Option>
                      <Option value="approval">Approval</Option>
                      <Option value="orchestration">Orchestration</Option>
                      <Option value="agentic">Agentic</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} placeholder="Purpose of this blueprint" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="entity_schema" label="Entity Schema" rules={[{ required: true }]}>
                    <Input placeholder="e.g. crm" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="entity_type" label="Entity Type" rules={[{ required: true }]}>
                    <Input placeholder="e.g. deals" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="intent" label="Intent">
                    <Input placeholder="e.g. PROCESS_EXECUTION" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="is_active" label="Active" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Tabs defaultActiveKey="wizard" type="card">
              <TabPane tab={<span><CompassOutlined />Wizard</span>} key="wizard">
                <Card>
                  {renderWizard()}
                </Card>
              </TabPane>
              <TabPane tab={<span><SettingOutlined />Definition</span>} key="definition">
                <Card>
                  <Form.Item name="definition" label="Blueprint Definition (JSON)" rules={[{ required: true }]}>
                    <JsonEditor rows={15} placeholder="Full workflow definition..." />
                  </Form.Item>
                </Card>
              </TabPane>
              <TabPane tab={<span><SettingOutlined />Metadata</span>} key="metadata">
                <Card>
                  <Form.Item name="metadata" label="Extended Metadata (JSON)">
                    <JsonEditor rows={10} placeholder="Custom configuration parameters..." />
                  </Form.Item>
                </Card>
              </TabPane>
              {blueprint.id && (
                <TabPane tab={<span><HistoryOutlined />History</span>} key="history">
                  <Card>
                    <Table 
                      dataSource={history} 
                      columns={historyColumns} 
                      size="small" 
                      loading={historyLoading}
                      rowKey="id"
                      pagination={{ pageSize: 5 }}
                    />
                  </Card>
                </TabPane>
              )}
            </Tabs>
          </Col>

          <Col span={8}>
            <Card title="Blueprint Summary" style={{ height: '100%' }}>
              <Paragraph>
                Process blueprints define the lifecycle, approvals, and orchestrations for entities across the platform.
              </Paragraph>
              <div style={{ marginTop: 40 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={saving} 
                  icon={<SaveOutlined />}
                  block
                  size="large"
                >
                  Save Blueprint
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </Form>

      <Modal
        title={`Version Comparison: ${selectedHistoryRecord?.created_at ? new Date(selectedHistoryRecord.created_at).toLocaleString() : ''}`}
        open={isHistoryModalVisible}
        onCancel={() => setIsHistoryModalVisible(false)}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setIsHistoryModalVisible(false)}>
            Close
          </Button>,
          <Popconfirm
            key="delete-confirm"
            title="Delete this historical version?"
            onConfirm={handleDeleteHistory}
            okText="Yes, Delete"
            cancelText="No"
            okButtonProps={{ danger: true, loading: deleting }}
          >
            <Button 
              key="delete" 
              danger 
              icon={<DeleteOutlined />}
              disabled={deleting}
            >
              Delete Version
            </Button>
          </Popconfirm>,
          <Button 
            key="restore" 
            type="primary" 
            icon={<HistoryOutlined />}
            onClick={handleRestore}
          >
            Restore to Form
          </Button>
        ]}
      >
        {selectedHistoryRecord && (
          <div style={{ display: 'flex', gap: '24px', height: '75vh' }}>
            <div style={{ width: '250px', borderRight: '1px solid #f0f0f0', overflowY: 'auto', paddingRight: '12px' }}>
              <Title level={5}>Fields:</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Button 
                  type={diffActiveKey === 'full' ? 'primary' : 'text'} 
                  block 
                  style={{ textAlign: 'left' }}
                  onClick={() => setDiffActiveKey('full')}
                >
                  Full Snapshot
                </Button>
                {configFields.map(field => {
                  const changed = hasFieldChanged(field.key);
                  return (
                    <Button 
                      key={field.key}
                      type={diffActiveKey === field.key ? 'primary' : 'text'} 
                      block 
                      style={{ 
                        textAlign: 'left', 
                        fontWeight: changed ? 'bold' : 'normal',
                        color: changed && diffActiveKey !== field.key ? '#cf1322' : undefined 
                      }}
                      onClick={() => setDiffActiveKey(field.key)}
                    >
                      {field.label} {changed && "•"}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ReactDiffViewer
                oldValue={getGranularOldValue()}
                newValue={getGranularNewValue()}
                splitView={true}
                leftTitle="Historical Version"
                rightTitle="Current Version"
                styles={{
                  variables: {
                    light: {
                      diffViewerBackground: '#fff',
                      addedBackground: '#e6ffed',
                      removedBackground: '#ffeef0',
                    },
                  },
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProcessBlueprintConfig;
