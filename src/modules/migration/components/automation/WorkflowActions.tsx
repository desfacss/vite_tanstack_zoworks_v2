import React, { useState } from 'react';
import { Button, Card, Row, Col, Typography, Space, Tag, Empty, Drawer } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  MailOutlined, 
  UserSwitchOutlined, 
  EditOutlined as UpdateOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import ActionConfigModal from './ActionConfigModal';
import type { WorkflowAction, WorkflowRule, ViewConfig, EmailTemplate, Team } from './types';

const { Title, Text } = Typography;

interface WorkflowActionsProps {
  actions: WorkflowAction[];
  onUpdate: (actions: WorkflowAction[]) => void;
  workflow: Partial<WorkflowRule>;
  availableTables: ViewConfig[];
  emailTemplates: EmailTemplate[];
  teams: Team[];
}

export function WorkflowActions({ 
  actions, 
  onUpdate, 
  workflow, 
  availableTables, 
  emailTemplates, 
  teams 
}: WorkflowActionsProps) {
  const [editingAction, setEditingAction] = useState<WorkflowAction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const actionTypes = [
    { value: 'send_email', label: 'Send Email', icon: MailOutlined, color: 'blue' },
    { value: 'assign_owner', label: 'Assign Owner', icon: UserSwitchOutlined, color: 'green' },
    { value: 'update_fields', label: 'Update Fields', icon: UpdateOutlined, color: 'purple' },
  ];

  const getActionTypeInfo = (type: string) => actionTypes.find(at => at.value === type) || actionTypes[0];

  const handleSaveAction = (actionData: Partial<WorkflowAction>) => {
    const existingIdx = actions.findIndex(a => a.id === actionData.id);
    if (existingIdx !== -1) {
      const updated = [...actions];
      updated[existingIdx] = { ...updated[existingIdx], ...actionData };
      onUpdate(updated);
    } else {
      const newAction: WorkflowAction = {
        id: `temp-${Date.now()}`,
        action_type: actionData.action_type!,
        configuration: actionData.configuration || {},
        action_order: actions.length + 1,
        is_enabled: true,
        organization_id: workflow.organization_id!,
        name: actionData.name || `${getActionTypeInfo(actionData.action_type!).label} Action`,
        ...actionData,
      };
      onUpdate([...actions, newAction]);
    }
    setDrawerOpen(false);
    setEditingAction(null);
  };

  const move = (id: string, dir: 'up' | 'down') => {
    const next = [...actions];
    const idx = next.findIndex(a => a.id === id);
    if (idx === -1) return;
    const nIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (nIdx < 0 || nIdx >= next.length) return;
    [next[idx], next[nIdx]] = [next[nIdx], next[idx]];
    onUpdate(next.map((a, i) => ({ ...a, action_order: i + 1 })));
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Row justify="space-between" align="middle">
        <Col><Title level={4} style={{ margin: 0 }}>Workflow Actions</Title></Col>
        <Col><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingAction(null); setDrawerOpen(true); }}>Add Action</Button></Col>
      </Row>

      {actions.length === 0 ? (
        <Empty image={<ThunderboltOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />} description="No actions configured" />
      ) : (
        <Space direction="vertical" className="w-full" size="small">
          {actions.sort((a, b) => (a.action_order || 0) - (b.action_order || 0)).map((action, idx) => {
            const info = getActionTypeInfo(action.action_type);
            return (
              <Card key={action.id} size="small">
                <Row align="middle" gutter={8}>
                  <Col span={1} className="flex flex-col">
                    <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => move(action.id!, 'up')} />
                    <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={idx === actions.length - 1} onClick={() => move(action.id!, 'down')} />
                  </Col>
                  <Col span={1}><div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-bold text-gray-400">{idx+1}</div></Col>
                  <Col span={18}>
                    <Space direction="vertical" size={1}>
                      <Space><Text strong>{action.name}</Text><Tag color={info.color}>{info.label}</Tag></Space>
                      <Text type="secondary" style={{ fontSize: '11px' }}>{action.action_type.replace('_', ' ')}</Text>
                    </Space>
                  </Col>
                  <Col span={4} className="text-right">
                    <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingAction(action); setDrawerOpen(true); }} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onUpdate(actions.filter(a => a.id !== action.id))} />
                  </Col>
                </Row>
              </Card>
            );
          })}
        </Space>
      )}

      <Drawer
        title={editingAction ? 'Edit Action' : 'New Action'}
        width="60%"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingAction(null); }}
        destroyOnClose
      >
        <ActionConfigModal
          onClose={() => { setDrawerOpen(false); setEditingAction(null); }}
          onSave={handleSaveAction}
          action={editingAction}
          workflow={workflow}
          availableTables={availableTables}
          emailTemplates={emailTemplates}
          teams={teams}
        />
      </Drawer>
    </Space>
  );
}
