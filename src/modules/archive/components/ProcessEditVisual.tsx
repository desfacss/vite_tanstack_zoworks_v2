// src/modules/archive/components/ProcessEditVisual.tsx
import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Space, Typography, Drawer, 
  Form, Input, Select, Tag, Divider, Empty, Spin, message, Tabs
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  SaveOutlined 
} from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { ProcessData, Stage } from '../types/process';
import { 
  PERTInput, RACIInput, AutomationActionForm, 
  convertToUnit 
} from '../utils/formsAndUtils';
import ProjectPlan from './ProjectPlan/ProjectPlan';
import ProcessOverview from './ProcessOverview';
import ChannelTabs from './Networking/ChannelTabs';
import Scheduler from './Scheduler';
import processBlueprintData from '../utils/processv5.json';

import 'react-resizable/css/styles.css';

const { Text } = Typography;
const { Option } = Select;

interface ProcessEditVisualProps {
  processId?: string;
  onSave?: (data: ProcessData) => void;
}

const ProcessEditVisual: React.FC<ProcessEditVisualProps> = ({ processId, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProcessData | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [timeUnit, setTimeUnit] = useState<'days' | 'hours' | 'minutes'>('hours');
  
  const [form] = Form.useForm();

  useEffect(() => {
    if (processId) {
      fetchProcessData();
    } else {
      // Initialize new process
      setData({
        name: 'New Process',
        description: '',
        startStateId: 'start',
        version: '1.0.0',
        isActive: true,
        entityType: 'task',
        processType: 'flow',
        stages: [
          {
            id: 'start',
            name: 'Start',
            description: 'Starting point',
            sequence: 1,
            displayLabel: 'Start',
            pertTime: { optimisticHours: 1, mostLikelyHours: 2, pessimisticHours: 4 },
            automationOnEntry: [],
            systemStatusCategory: 'NEW',
            requiredSkills: []
          }
        ],
        transitions: [],
        automationRules: [],
        initialMetadata: {},
        contextVariables: {}
      });
    }
  }, [processId]);

  const fetchProcessData = async () => {
    setLoading(true);
    try {
      const { data: blueprint, error } = await supabase
        .schema('automation')
        .from('bp_process_blueprints')
        .select('*')
        .eq('id', processId)
        .maybeSingle();

      if (error) throw error;
      if (blueprint) {
        // Map backend schema to our frontend type
        const mappedData: ProcessData = {
          ...blueprint,
          stages: blueprint.definition?.lifecycle?.stages || [],
          transitions: blueprint.definition?.lifecycle?.transitions || []
        };
        setData(mappedData);
      }
    } catch (err: any) {
      console.error('Error fetching process:', err);
      message.error('Failed to load process data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        description: data.description,
        is_active: data.isActive,
        entity_type: data.entityType,
        definition: {
          ...data,
          lifecycle: {
            stages: data.stages,
            transitions: data.transitions,
            startStateId: data.startStateId
          }
        }
      };

      const { data: saved, error } = await supabase
        .schema('automation')
        .from('bp_process_blueprints')
        .upsert(processId ? { id: processId, ...payload } : payload)
        .select()
        .single();

      if (error) throw error;
      message.success('Process saved successfully');
      if (onSave) onSave(saved as any);
    } catch (err: any) {
      console.error('Error saving process:', err);
      message.error('Failed to save process');
    } finally {
      setSaving(false);
    }
  };

  const onStageClick = (stage: Stage) => {
    setSelectedStage(stage);
    form.setFieldsValue({
      ...stage,
      optimistic: convertToUnit(stage.pertTime.optimisticHours, 'hours', timeUnit),
      likely: convertToUnit(stage.pertTime.mostLikelyHours, 'hours', timeUnit),
      pessimistic: convertToUnit(stage.pertTime.pessimisticHours, 'hours', timeUnit),
      aspirational: convertToUnit(stage.pertTime.targetTimeHours, 'hours', timeUnit),
      reasons: stage.pertTime.reasons || []
    });
    setDrawerVisible(true);
  };

  const updateStage = (values: any) => {
    if (!selectedStage || !data) return;
    
    const updatedStages = data.stages.map(s => {
      if (s.id === selectedStage.id) {
        return {
          ...s,
          ...values,
          pertTime: {
            optimisticHours: convertToUnit(values.optimistic, timeUnit, 'hours') || 0,
            mostLikelyHours: convertToUnit(values.likely, timeUnit, 'hours') || 0,
            pessimisticHours: convertToUnit(values.pessimistic, timeUnit, 'hours') || 0,
            targetTimeHours: convertToUnit(values.aspirational, timeUnit, 'hours'),
            reasons: values.reasons
          }
        };
      }
      return s;
    });

    setData({ ...data, stages: updatedStages });
    setDrawerVisible(false);
    message.success('Stage updated locally');
  };

  const addStage = () => {
    if (!data) return;
    const newId = `stage_${Date.now()}`;
    const newStage: Stage = {
      id: newId,
      name: 'New Stage',
      description: '',
      sequence: data.stages.length + 1,
      displayLabel: 'New Stage',
      pertTime: { optimisticHours: 1, mostLikelyHours: 2, pessimisticHours: 4 },
      automationOnEntry: [],
      systemStatusCategory: 'IN_PROGRESS',
      requiredSkills: []
    };
    setData({ ...data, stages: [...data.stages, newStage] });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  if (!data) return <Empty description="No data available" />;

  const drawerTabs = [
    {
      key: 'basic',
      label: 'Basic Info',
      children: (
        <>
          <Form.Item name="name" label="Stage Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="displayLabel" label="Display Label">
            <Input />
          </Form.Item>
          <Form.Item name="systemStatusCategory" label="Status Category">
            <Select>
              <Option value="NEW">New</Option>
              <Option value="IN_PROGRESS">In Progress</Option>
              <Option value="PENDING">Pending</Option>
              <Option value="COMPLETED">Completed</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'pert',
      label: 'PERT (Estimation)',
      children: (
        <PERTInput 
          optimistic={form.getFieldValue('optimistic')}
          likely={form.getFieldValue('likely')}
          pessimistic={form.getFieldValue('pessimistic')}
          aspirational={form.getFieldValue('aspirational')}
          reasons={form.getFieldValue('reasons') || []}
          timeDisplay={timeUnit}
          onChange={(field, value) => form.setFieldsValue({ [field]: value })}
          onUnitChange={(unit) => setTimeUnit(unit)}
        />
      ),
    },
    {
      key: 'raci',
      label: 'RACI & Skills',
      children: (
        <>
           <Text strong>Required Skills</Text>
           <Form.Item name="requiredSkills">
             <Select mode="tags" style={{ width: '100%' }} placeholder="Add skills" />
           </Form.Item>
           <Divider />
           <Text strong>RACI Matrix</Text>
           <RACIInput 
              raci={form.getFieldValue('raci') || { responsible: [], accountable: [], consulted: [], informed: [] }}
              onChange={(val) => form.setFieldsValue({ raci: val })}
           />
        </>
      ),
    },
    {
      key: 'automation',
      label: 'Automation',
      children: <AutomationActionForm allStageIds={data?.stages.map(s => s.id) || []} />,
    },
  ];

  const mainTabs = [
    {
      key: 'editor',
      label: 'Visual Editor',
      children: (
        <Card title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{data.name} <Tag>{data.version}</Tag></span>
            <Space>
               <Button icon={<PlusOutlined />} onClick={addStage}>Add Stage</Button>
               <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>Save</Button>
            </Space>
          </div>
        }>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '10px' }}>
            {data.stages.sort((a, b) => a.sequence - b.sequence).map(stage => (
              <Card 
                key={stage.id} 
                size="small" 
                hoverable 
                style={{ width: 250, borderLeft: '4px solid #1890ff' }}
                onClick={() => onStageClick(stage)}
                actions={[
                  <EditOutlined key="edit" />,
                  <DeleteOutlined key="delete" onClick={(e) => {
                    e.stopPropagation();
                    setData({ ...data, stages: data.stages.filter(s => s.id !== stage.id) });
                  }} />
                ]}
              >
                <Card.Meta 
                  title={stage.displayLabel || stage.name} 
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: '11px' }}>{stage.systemStatusCategory}</Text>
                      <br />
                      <Tag color="blue">{stage.pertTime.mostLikelyHours}h</Tag>
                    </div>
                  } 
                />
              </Card>
            ))}
          </div>
        </Card>
      ),
    },
    {
      key: 'overview',
      label: 'Overview',
      children: <ProcessOverview initialData={processBlueprintData as any} />,
    },
    {
      key: 'plan',
      label: 'Project Plan',
      children: <ProjectPlan />,
    },
    {
      key: 'networking',
      label: 'Networking',
      children: <ChannelTabs />,
    },
    {
      key: 'scheduler',
      label: 'Scheduler (Simulation)',
      children: <Scheduler />,
    },
  ];

  return (
    <div className="process-edit-visual">
       <Tabs 
        defaultActiveKey="editor" 
        items={mainTabs} 
        type="card"
        style={{ background: '#fff', padding: '16px', borderRadius: '8px' }}
      />

      <Drawer
        title={`Edit Stage: ${selectedStage?.name}`}
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={() => form.submit()}>Apply</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={updateStage}>
          <Tabs defaultActiveKey="basic" items={drawerTabs} />
        </Form>
      </Drawer>
    </div>
  );
};

export default ProcessEditVisual;
