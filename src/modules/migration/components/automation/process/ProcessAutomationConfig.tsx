import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Tag, Empty, Drawer, Row, Col, Alert, Spin } from 'antd';
import { PlusOutlined, ThunderboltOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { WorkflowWizard } from '../WorkflowWizard';
import type { WorkflowDefinition, ViewConfig, WorkflowRule } from '../types';

const { Title, Paragraph } = Typography;

interface ProcessAutomationConfigProps {
  definition: Partial<WorkflowDefinition>;
  onUpdate: (definition: Partial<WorkflowDefinition>) => void;
  availableTables: ViewConfig[];
}

export function ProcessAutomationConfig({ definition, onUpdate, availableTables }: ProcessAutomationConfigProps) {
  const { user } = useAuthStore();
  const [hooks, setHooks] = useState<WorkflowRule[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (definition.id) loadHooks();
  }, [definition.id]);

  const loadHooks = async () => {
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    if (!orgId || !definition.id) return;
    setLoading(true);
    try {
      const { data } = await supabase.schema('workflow' as any).from('wf_workflows').select('*').eq('workflow_definition_id', definition.id);
      setHooks(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggle = async (id: string, active: boolean) => {
    try {
      await supabase.schema('workflow' as any).from('wf_workflows').update({ is_active: !active }).eq('id', id);
      loadHooks();
    } catch (err) { console.error(err); }
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="m-0">Automation Hooks</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(undefined); setDrawerOpen(true); }}>Add Hook</Button>
      </div>

      <Alert message="Automated actions triggered on stage change or record updates." type="info" showIcon />

      {loading ? <Spin /> : hooks.length === 0 ? <Empty description="No hooks" /> : (
        <Row gutter={[16, 16]}>
          {hooks.map(h => (
            <Col span={24} key={h.id}>
              <Card size="small" actions={[
                <Button type="text" icon={h.is_active ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={() => toggle(h.id!, !!h.is_active)} />,
                <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingId(h.id); setDrawerOpen(true); }} />,
                <Button type="text" danger icon={<DeleteOutlined />} onClick={async () => { await supabase.schema('workflow' as any).from('wf_workflows').delete().eq('id', h.id); loadHooks(); }} />
              ]}>
                <Card.Meta title={<Space>{h.name}<Tag color={h.is_active ? 'green' : 'default'}>{h.is_active ? 'Active' : 'Paused'}</Tag></Space>} description={h.description} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Drawer title="Hook Editor" width="80%" open={drawerOpen} onClose={() => setDrawerOpen(false)} destroyOnClose>
         <WorkflowWizard onClose={() => setDrawerOpen(false)} workflowId={editingId} onSave={loadHooks} />
      </Drawer>
    </Space>
  );
}
