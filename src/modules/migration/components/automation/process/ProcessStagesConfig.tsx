import React, { useState } from 'react';
import { Button, Space, Typography, Empty, Drawer, Card, Row, Col, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, BranchesOutlined, ArrowRightOutlined, ArrowUpOutlined, ArrowDownOutlined, StarOutlined } from '@ant-design/icons';
import { StageConfigModal } from './StageConfigModal';
import { TransitionConfigModal } from './TransitionConfigModal';
import type { WorkflowDefinition, WorkflowStage, WorkflowTransition } from '../types';

const { Title, Text, Paragraph } = Typography;

interface ProcessStagesConfigProps {
  definition: Partial<WorkflowDefinition>;
  onUpdate: (definition: Partial<WorkflowDefinition>) => void;
}

export function ProcessStagesConfig({ definition, onUpdate }: ProcessStagesConfigProps) {
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [editingTransition, setEditingTransition] = useState<WorkflowTransition | null>(null);

  const stages = definition.definitions?.stages || [];
  const transitions = definition.definitions?.transitions || [];

  const handleSaveStage = (stageData: WorkflowStage) => {
    const updated = stages.find((s:any) => s.id === stageData.id)
      ? stages.map((s:any) => s.id === stageData.id ? stageData : s)
      : [...stages, stageData];
    onUpdate({ ...definition, definitions: { ...definition.definitions!, stages: updated } });
    setStageModalOpen(false);
  };

  const handleSaveTransition = (transitionData: WorkflowTransition) => {
    const updated = transitions.find((t:any) => t.id === transitionData.id)
      ? transitions.map((t:any) => t.id === transitionData.id ? transitionData : t)
      : [...transitions, transitionData];
    onUpdate({ ...definition, definitions: { ...definition.definitions!, transitions: updated } });
    setTransitionModalOpen(false);
  };

  const move = (id: string, dir: 'up' | 'down') => {
    const next = [...stages];
    const idx = next.findIndex((s:any) => s.id === id);
    const nIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (nIdx < 0 || nIdx >= next.length) return;
    [next[idx], next[nIdx]] = [next[nIdx], next[idx]];
    onUpdate({ ...definition, definitions: { ...definition.definitions!, stages: next.map((s, i) => ({ ...s, sequence: i + 1 })) } });
  };

  return (
    <Space direction="vertical" className="w-full" size="large">
      <section>
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="m-0">Lifecycle Stages</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingStage(null); setStageModalOpen(true); }}>Add Stage</Button>
        </div>
        {stages.length === 0 ? <Empty description="No stages" /> : (
          <Space direction="vertical" className="w-full" size="small">
             {stages.map((s:any, idx:number) => (
               <Card key={s.id} size="small">
                  <Row align="middle" gutter={8}>
                     <Col span={1}>
                        <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => move(s.id, 'up')} />
                        <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={idx === stages.length - 1} onClick={() => move(s.id, 'down')} />
                     </Col>
                     <Col span={18}>
                        <Space><Text strong>{s.displayLabel}</Text><Tag>{s.systemStatusCategory}</Tag>{definition.definitions?.startStateId === s.id && <Tag color="green">Start</Tag>}</Space>
                     </Col>
                     <Col span={5} className="text-right">
                        <Button type="text" size="small" onClick={() => onUpdate({ ...definition, definitions: { ...definition.definitions!, startStateId: s.id } })}>Set Start</Button>
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingStage(s); setStageModalOpen(true); }} />
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onUpdate({ ...definition, definitions: { ...definition.definitions!, stages: stages.filter((curr:any) => curr.id !== s.id) } })} />
                     </Col>
                  </Row>
               </Card>
             ))}
          </Space>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="m-0">Transitions</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTransition(null); setTransitionModalOpen(true); }} disabled={stages.length < 2}>Add Transition</Button>
        </div>
        {transitions.length === 0 ? <Empty description="No transitions" /> : (
          <Space direction="vertical" className="w-full" size="small">
             {transitions.map((t:any) => (
               <Card key={t.id} size="small">
                  <Row align="middle">
                     <Col span={18}>
                        <Space><Text strong>{t.name}</Text><Tag color="blue">{t.trigger}</Tag><Text type="secondary">{t.from} → {t.to}</Text></Space>
                     </Col>
                     <Col span={6} className="text-right">
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingTransition(t); setTransitionModalOpen(true); }} />
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onUpdate({ ...definition, definitions: { ...definition.definitions!, transitions: transitions.filter((curr:any) => curr.id !== t.id) } })} />
                     </Col>
                  </Row>
               </Card>
             ))}
          </Space>
        )}
      </section>

      <Drawer title={editingStage ? 'Edit Stage' : 'New Stage'} width="50%" open={stageModalOpen} onClose={() => setStageModalOpen(false)} destroyOnClose>
        <StageConfigModal isOpen={stageModalOpen} onClose={() => setStageModalOpen(false)} onSave={handleSaveStage} stage={editingStage} existingStages={stages} />
      </Drawer>
      <Drawer title={editingTransition ? 'Edit Transition' : 'New Transition'} width="50%" open={transitionModalOpen} onClose={() => setTransitionModalOpen(false)} destroyOnClose>
        <TransitionConfigModal isOpen={transitionModalOpen} onClose={() => setTransitionModalOpen(false)} onSave={handleSaveTransition} transition={editingTransition} stages={stages} />
      </Drawer>
    </Space>
  );
}
