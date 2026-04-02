import React, { useState, useEffect } from 'react';
import { Steps, Button, Space, Alert, Spin, Card, Typography, Row, Col } from 'antd';
import { SaveOutlined, ArrowRightOutlined, SettingOutlined, BranchesOutlined, BarChartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { ProcessBasicInfo } from './process/ProcessBasicInfo';
import { ProcessStagesConfig } from './process/ProcessStagesConfig';
import { ProcessAutomationConfig } from './process/ProcessAutomationConfig';
import { ProcessMetricsConfig } from './process/ProcessMetricsConfig';
import type { WorkflowDefinition, ViewConfig, StageMetrics } from './types';

const { Title, Paragraph, Text } = Typography;

interface WorkflowDefinitionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  definitionId?: string;
  onSave?: (definition: WorkflowDefinition) => void;
}

export function WorkflowDefinitionWizard({ isOpen, onClose, definitionId, onSave }: WorkflowDefinitionWizardProps) {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [definition, setDefinition] = useState<Partial<WorkflowDefinition>>({
    name: '',
    entity_type: '',
    entity_schema: 'public',
    description: '',
    is_active: true,
    definitions: { stages: [], transitions: [], processType: 'STATE_DRIVEN' }
  });

  const [stageMetrics, setStageMetrics] = useState<Partial<StageMetrics>>({ metrics_data: [] });
  const [availableTables, setAvailableTables] = useState<ViewConfig[]>([]);

  const steps = [
    { title: 'Information', icon: <SettingOutlined /> },
    { title: 'Stages', icon: <BranchesOutlined /> },
    { title: 'Metrics', icon: <BarChartOutlined /> },
    { title: 'Automation', icon: <ThunderboltOutlined /> },
  ];

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (definitionId) loadDefinition(definitionId);
    }
  }, [isOpen, definitionId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('y_view_config' as any).select('*').eq('is_active', true);
      setAvailableTables(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadDefinition = async (id: string) => {
    setLoading(true);
    try {
      const { data } = await supabase.schema('workflow' as any).from('dynamic_workflow_definitions').select('*').eq('id', id).single();
      if (data) setDefinition(data);
      const { data: mData } = await supabase.schema('workflow' as any).from('dynamic_stage_metrics').select('*').eq('process_definition_id', id).maybeSingle();
      if (mData) setStageMetrics(mData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    try {
      const payload = { ...definition, organization_id: orgId };
      const { data: saved, error: sErr } = await supabase.schema('workflow' as any).from('dynamic_workflow_definitions').upsert(payload).select().single();
      if (sErr) throw sErr;

      if (stageMetrics.metrics_data?.length) {
         await supabase.schema('workflow' as any).from('dynamic_stage_metrics').upsert({
            ...stageMetrics,
            process_definition_id: saved.id,
            organization_id: orgId
         });
      }

      onSave?.(saved);
      onClose();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-6 bg-slate-900 border-b">
         <Steps current={currentStep} size="small" items={steps} className="ant-steps-light" />
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {error && <Alert message={error} type="error" className="mb-4" /> }
        {loading ? <Spin /> : (
          <Card size="small">
             {currentStep === 0 && <ProcessBasicInfo definition={definition} onUpdate={setDefinition} availableTables={availableTables} />}
             {currentStep === 1 && <ProcessStagesConfig definition={definition} onUpdate={setDefinition} />}
             {currentStep === 2 && <ProcessMetricsConfig definition={definition} stageMetrics={stageMetrics} onUpdate={setStageMetrics} />}
             {currentStep === 3 && <ProcessAutomationConfig definition={definition} onUpdate={setDefinition} availableTables={availableTables} />}
          </Card>
        )}
      </div>

      <div className="p-4 bg-white border-t flex justify-between">
        <Button onClick={currentStep === 0 ? onClose : () => setCurrentStep(currentStep - 1)}>{currentStep === 0 ? 'Cancel' : 'Back'}</Button>
        <Space>
           {currentStep < steps.length - 1 ? (
             <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>Next <ArrowRightOutlined /></Button>
           ) : (
             <Button type="primary" loading={saving} onClick={handleSave}>Save Process <SaveOutlined /></Button>
           )}
        </Space>
      </div>
    </div>
  );
}
