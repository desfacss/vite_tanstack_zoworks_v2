import React, { useState, useEffect } from 'react';
import { Button, Card, Space, Typography, Tag, Spin, Alert, Empty, Row, Col, Tooltip, Drawer } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  BranchesOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { WorkflowDefinitionWizard } from './WorkflowDefinitionWizard';
import { WorkflowDefinitionDetails } from './WorkflowDefinitionDetails';
import type { WorkflowDefinition } from './types';

const { Title, Paragraph } = Typography;

export function WorkflowDefinitionsView() {
  const { user } = useAuthStore();
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState<WorkflowDefinition | null>(null);
  const [editingDefinitionId, setEditingDefinitionId] = useState<string | undefined>();

  useEffect(() => {
    loadDefinitions();
  }, [user]);
  
  const loadDefinitions = async () => {
    // In v2, use user.organization?.id if pref_organization_id is not available
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    if (!orgId) return;

    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .schema('workflow' as any)
        .from('dynamic_workflow_definitions')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDefinitions(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow definitions');
    } finally {
      setLoading(false);
    }
  };

  const deleteDefinition = async (definitionId: string) => {
    try {
      const { error } = await supabase
        .schema('workflow' as any).from('dynamic_workflow_definitions')
        .delete()
        .eq('id', definitionId);

      if (error) throw error;
      await loadDefinitions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete workflow definition');
    }
  };

  const openEditWizard = (definitionId: string) => {
    setEditingDefinitionId(definitionId);
    setEditDrawerOpen(true);
  };

  const openCreateWizard = () => {
    setEditingDefinitionId(undefined);
    setEditDrawerOpen(true);
  };

  const openDetailsView = (definition: WorkflowDefinition) => {
    setSelectedDefinition(definition);
    setDetailsDrawerOpen(true);
  };

  const handleDefinitionSaved = () => {
    loadDefinitions();
    setEditDrawerOpen(false);
    setEditingDefinitionId(undefined);
  };

  const getStageCount = (definition: WorkflowDefinition) => {
    try {
      const stages = definition.definitions?.stages;
      if (Array.isArray(stages)) return stages.length;
      if (typeof definition.definitions === 'string') {
        const parsed = JSON.parse(definition.definitions);
        return parsed.stages?.length || 0;
      }
      return 0;
    } catch { return 0; }
  };

  const getTransitionCount = (definition: WorkflowDefinition) => {
    try {
      const transitions = definition.definitions?.transitions;
      if (Array.isArray(transitions)) return transitions.length;
      if (typeof definition.definitions === 'string') {
        const parsed = JSON.parse(definition.definitions);
        return parsed.transitions?.length || 0;
      }
      return 0;
    } catch { return 0; }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Workflow Definitions</Title>
          <Paragraph type="secondary">
            Manage state-driven workflow processes
          </Paragraph>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateWizard}
          >
            Create Process
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert
          message={error}
          type="error"
          style={{ marginBottom: 24 }}
          closable
          onClose={() => setError('')}
        />
      )}

      {definitions.length === 0 ? (
        <Empty
          description="No Workflow Definitions Found"
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateWizard}>
            Create First Process
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {definitions.map((definition) => (
            <Col xs={24} key={definition.id}>
              <Card size="small">
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space>
                            <span className="font-semibold">{definition.name}</span>
                            <Tag color="purple">{definition.entity_type}</Tag>
                            <Tag color={definition.is_active ? 'success' : 'default'}>
                                {definition.is_active ? 'Active' : 'Inactive'}
                            </Tag>
                        </Space>
                    </Col>
                    <Col>
                        <Space size="small">
                            <Button type="text" icon={<EyeOutlined />} onClick={() => openDetailsView(definition)} size="small" />
                            <Button type="text" icon={<EditOutlined />} onClick={() => openEditWizard(definition.id)} size="small" />
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteDefinition(definition.id)} size="small" />
                        </Space>
                    </Col>
                </Row>
                <div className="mt-2 text-gray-500">
                    {definition.description || 'No description'}
                </div>
                <Row gutter={16} className="mt-4 text-xs text-gray-400">
                    <Col><BranchesOutlined /> {getStageCount(definition)} Stages</Col>
                    <Col><ThunderboltOutlined /> {getTransitionCount(definition)} Transitions</Col>
                    <Col><SettingOutlined /> v{definition.version}</Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Drawer
        title={editingDefinitionId ? 'Edit Process' : 'Create Process'}
        width="90%"
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        destroyOnClose
      >
        <WorkflowDefinitionWizard
          isOpen={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          definitionId={editingDefinitionId}
          onSave={handleDefinitionSaved}
        />
      </Drawer>

      <Drawer
        title="Process Details"
        width="80%"
        open={detailsDrawerOpen}
        onClose={() => setDetailsDrawerOpen(false)}
        destroyOnClose
      >
        {selectedDefinition && (
          <WorkflowDefinitionDetails
            definition={selectedDefinition}
            onBack={() => setDetailsDrawerOpen(false)}
            onEdit={() => {
              setDetailsDrawerOpen(false);
              openEditWizard(selectedDefinition.id);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
