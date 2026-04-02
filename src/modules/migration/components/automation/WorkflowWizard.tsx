import React, { useState, useEffect } from 'react';
import { Steps, Button, Space, Alert, Spin, Row, Col, Card, Typography } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, ArrowRightOutlined, SettingOutlined, ThunderboltOutlined, BranchesOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { WorkflowBasicInfo } from './WorkflowBasicInfo';
import { WorkflowConditions } from './WorkflowConditions';
import { WorkflowActions } from './WorkflowActions';
import type { WorkflowRule, WorkflowAction, ViewConfig, EmailTemplate, Team } from './types';

const { Title, Text } = Typography;

interface WorkflowWizardProps {
  onClose: () => void;
  workflowId?: string;
  onSave?: (workflow: WorkflowRule) => void;
}

export function WorkflowWizard({ onClose, workflowId, onSave }: WorkflowWizardProps) {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [workflow, setWorkflow] = useState<Partial<WorkflowRule>>({
    name: '',
    description: '',
    trigger_table: '',
    trigger_type: 'on_create',
    conditions: {},
    actions: [],
    is_active: true,
    priority: 0,
  });

  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [availableTables, setAvailableTables] = useState<ViewConfig[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const steps = [
    { title: 'Info', icon: <SettingOutlined /> },
    { title: 'Conditions', icon: <ThunderboltOutlined /> },
    { title: 'Actions', icon: <BranchesOutlined /> },
  ];

  useEffect(() => {
    loadInitialData();
    if (workflowId) loadWorkflow(workflowId);
  }, [workflowId]);

  const loadInitialData = async () => {
    setLoading(true);
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    try {
      const [{ data: vData }, { data: eData }, { data: tData }] = await Promise.all([
        supabase.from('y_view_config' as any).select('id, entity_type, entity_schema, metadata').eq('is_active', true),
        supabase.from('email_templates' as any).select('*').eq('is_active', true),
        supabase.schema('identity' as any).from('teams').select('*').eq('organization_id', orgId)
      ]);
      setAvailableTables(vData || []);
      setEmailTemplates(eData || []);
      setTeams(tData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflow = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.schema('workflow' as any).from('wf_workflows').select('*').eq('id', id).single();
      if (error) throw error;
      setWorkflow(data);
      if (data.actions?.length > 0) {
        const { data: aData } = await supabase.schema('workflow' as any).from('wf_actions').select('*').in('id', data.actions);
        setActions(aData || []);
      }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    try {
      const savedActionIds = [];
      for (const action of actions) {
        const actionPayload = { ...action, organization_id: orgId, id: action.id?.startsWith('temp-') ? undefined : action.id };
        const { data, error } = await supabase.schema('workflow' as any).from('wf_actions').upsert(actionPayload).select().single();
        if (error) throw error;
        savedActionIds.push(data.id);
      }

      const workflowPayload = { ...workflow, organization_id: orgId, actions: savedActionIds };
      const { data: savedWf, error: wfErr } = await supabase.schema('workflow' as any).from('wf_workflows').upsert(workflowPayload).select().single();
      if (wfErr) throw wfErr;

      onSave?.(savedWf);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center p-8"><Spin size="large" /></div>;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-6 bg-slate-900 border-b">
         <Steps current={currentStep} size="small" items={steps} className="ant-steps-light" />
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {error && <Alert message={error} type="error" className="mb-4" closable />}
        <Card className="shadow-sm">
          {currentStep === 0 && <WorkflowBasicInfo workflow={workflow} onUpdate={setWorkflow} availableTables={availableTables} />}
          {currentStep === 1 && <WorkflowConditions workflow={workflow} onUpdate={c => setWorkflow({...workflow, conditions: c})} availableTables={availableTables} />}
          {currentStep === 2 && <WorkflowActions actions={actions} onUpdate={setActions} workflow={workflow} availableTables={availableTables} emailTemplates={emailTemplates} teams={teams} />}
        </Card>
      </div>

      <div className="p-4 bg-white border-t flex justify-between items-center">
        <Button onClick={currentStep === 0 ? onClose : () => setCurrentStep(currentStep - 1)}>
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>
        <Space>
           {currentStep < steps.length - 1 ? (
             <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>Next <ArrowRightOutlined /></Button>
           ) : (
             <Button type="primary" loading={saving} onClick={handleSave}>Save <SaveOutlined /></Button>
           )}
        </Space>
      </div>
    </div>
  );
}
