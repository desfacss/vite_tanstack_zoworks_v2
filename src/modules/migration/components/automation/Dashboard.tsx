import { useState, useEffect } from 'react';
import { Button, Card, Space, Typography, Tag, Spin, Alert, Empty, Row, Col, Tooltip, Dropdown, Badge, Drawer } from 'antd';
import { PlusOutlined, PlayCircleOutlined, PauseCircleOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined, MoreOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { WorkflowWizard } from './WorkflowWizard';
import type { WorkflowRule } from './types';

const { Title } = Typography;

interface AutomationDashboardProps {
  onViewLogs?: (workflowId: string, workflowName: string) => void;
}

export function AutomationDashboard({ onViewLogs }: AutomationDashboardProps) {
  const { user } = useAuthStore();
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [workflowLogCounts, setWorkflowLogCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | undefined>();

  useEffect(() => {
    loadWorkflows();
  }, [user]);

  useEffect(() => {
    if (workflows.length > 0) loadWorkflowLogCounts();
  }, [workflows]);

  const loadWorkflows = async () => {
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    if (!orgId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.schema('workflow' as any).from('wf_workflows').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
      if (error) throw error;
      setWorkflows(data || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const loadWorkflowLogCounts = async () => {
    const workflowIds = workflows.map(w => w.id).filter(Boolean);
    if (!workflowIds.length) return;
    try {
      const { data } = await supabase.schema('workflow' as any).from('wf_logs').select('workflow_id').in('workflow_id', workflowIds);
      const counts: Record<string, number> = {};
      data?.forEach(log => { counts[log.workflow_id] = (counts[log.workflow_id] || 0) + 1; });
      setWorkflowLogCounts(counts);
    } catch (err) { console.error(err); }
  };

  const toggle = async (id: string, active: boolean) => {
    try {
      await supabase.schema('workflow' as any).from('wf_workflows').update({ is_active: !active }).eq('id', id);
      loadWorkflows();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <Title level={4} className="m-0">Workflows</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingWorkflowId(undefined); setEditDrawerOpen(true); }}>New Workflow</Button>
      </div>

      {error && <Alert message={error} type="error" className="mb-4" closable />}

      {loading ? <Spin /> : workflows.length === 0 ? <Empty description="No Workflows Found" /> : (
        <Row gutter={[16, 16]}>
          {workflows.map(w => (
            <Col span={24} key={w.id}>
              <Card size="small" actions={[
                  <Tooltip title="View Logs" key="logs"><Button type="text" size="small" icon={<Badge count={workflowLogCounts[w.id!] || 0} size="small"><ClockCircleOutlined /></Badge>} onClick={() => onViewLogs?.(w.id!, w.name)} /></Tooltip>,
                  <Tooltip title={w.is_active ? 'Pause' : 'Activate'} key="toggle"><Button type="text" size="small" icon={w.is_active ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={() => toggle(w.id!, !!w.is_active)} /></Tooltip>,
                  <Dropdown key="more" menu={{ items: [
                      { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => { setEditingWorkflowId(w.id); setEditDrawerOpen(true); } },
                      { key: 'delete', label: 'Delete', danger: true, icon: <DeleteOutlined />, onClick: async () => { await supabase.schema('workflow' as any).from('wf_workflows').delete().eq('id', w.id); loadWorkflows(); } }
                  ] }} trigger={['click']}><Button type="text" size="small" icon={<MoreOutlined />} /></Dropdown>
              ]}>
                <Card.Meta title={<Space>{w.name}<Tag color="blue">{w.trigger_type}</Tag></Space>} description={w.description} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Drawer title={editingWorkflowId ? 'Edit Workflow' : 'Create Workflow'} width="80%" open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} destroyOnClose>
        <WorkflowWizard onClose={() => setEditDrawerOpen(false)} workflowId={editingWorkflowId} onSave={loadWorkflows} />
      </Drawer>
    </div>
  );
}
