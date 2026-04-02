import React, { useState, useEffect } from 'react';
import { Form, Select, Button, Card, Row, Col, Typography, Space, Switch, Spin, Divider, Empty, Tooltip } from 'antd';
import { PlusOutlined, MailOutlined, TeamOutlined, UserOutlined, SafetyOutlined, FileTextOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import type { WorkflowRule, ViewConfig, EmailTemplate, Team, TableMetadata } from '../types';

const { Text } = Typography;

interface Role {
  id: string;
  name: string;
  organization_id: string;
}

interface EmailActionConfigProps {
  configuration: any;
  onChange: (config: any) => void;
  workflow: Partial<WorkflowRule>;
  availableTables: ViewConfig[];
  emailTemplates: EmailTemplate[];
  teams: Team[];
}

interface RecipientSource {
  type: 'direct' | 'team' | 'role' | 'lookup' | 'custom';
  expressions?: string[];
  teamIds?: string[];
  roleIds?: string[];
  source_table?: string;
  email_column?: string;
  id_expressions?: string[];
  customEmails?: string;
}

interface RecipientPool {
  pool_logic: 'AND' | 'OR';
  sources: RecipientSource[];
}

export function EmailActionConfig({
  configuration,
  onChange,
  workflow,
  availableTables,
  emailTemplates,
  teams,
}: EmailActionConfigProps) {
  const { user } = useAuthStore();
  const [tableMetadata, setTableMetadata] = useState<TableMetadata[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (workflow.trigger_table) {
      loadTableMetadata();
    }
    loadRoles();
  }, [workflow.trigger_table, availableTables]);

  const loadTableMetadata = async () => {
    setLoadingData(true);
    try {
      const table = availableTables.find(t => t.entity_type === workflow.trigger_table);
      if (table && table.metadata) {
        setTableMetadata(table.metadata);
      } else {
        const { data } = await supabase
          .from('y_view_config' as any)
          .select('metadata')
          .eq('entity_type', workflow.trigger_table)
          .maybeSingle();
        if (data?.metadata) setTableMetadata(data.metadata);
      }
    } catch (err) {
      console.error('Error loading metadata:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadRoles = async () => {
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    if (!orgId) return;
    try {
      const { data } = await supabase
        .schema('identity' as any)
        .from('roles')
        .select('id, name')
        .eq('organization_id', orgId);
      setRoles(data || []);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const emailFields = tableMetadata.filter(field =>
    field.key.includes('email') || field.type === 'text' && field.display_name.toLowerCase().includes('email')
  );

  const handleConfigChange = (field: string, value: any) => {
    onChange({ ...configuration, [field]: value });
  };

  const handleRecipientChange = (recipientType: 'to' | 'cc' | 'bcc', newPool: RecipientPool) => {
    onChange({
      ...configuration,
      recipients: {
        ...configuration.recipients,
        [recipientType]: newPool,
      }
    });
  };

  const addRecipientSource = (recipientType: 'to' | 'cc' | 'bcc') => {
    const currentPool = configuration.recipients?.[recipientType] || { pool_logic: 'OR', sources: [] };
    const newSource = { type: 'direct', expressions: [] };
    handleRecipientChange(recipientType, {
      ...currentPool,
      sources: [...currentPool.sources, newSource],
    });
  };

  const updateRecipientSource = (recipientType: 'to' | 'cc' | 'bcc', index: number, newSource: RecipientSource) => {
    const currentPool = configuration.recipients?.[recipientType];
    if (!currentPool) return;
    const updatedSources = [...currentPool.sources];
    updatedSources[index] = { ...updatedSources[index], ...newSource };
    handleRecipientChange(recipientType, { ...currentPool, sources: updatedSources });
  };

  const removeRecipientSource = (recipientType: 'to' | 'cc' | 'bcc', index: number) => {
    const currentPool = configuration.recipients?.[recipientType];
    if (!currentPool) return;
    const updatedSources = currentPool.sources.filter((_, i) => i !== index);
    handleRecipientChange(recipientType, { ...currentPool, sources: updatedSources });
  };

  const renderSourceConfig = (field: 'to' | 'cc' | 'bcc', source: RecipientSource, index: number) => {
    switch (source.type) {
      case 'direct':
        return (
          <Select
            mode="tags"
            value={source.expressions || []}
            onChange={(v) => updateRecipientSource(field, index, { expressions: v })}
            placeholder="Select email fields"
            className="w-full"
          >
            {emailFields.map((field) => (
              <Select.Option key={field.key} value={`{{new.${field.key}}}`}>
                {field.display_name}
              </Select.Option>
            ))}
          </Select>
        );
      case 'team':
        return (
          <Select
            mode="multiple"
            value={source.teamIds || []}
            onChange={(v) => updateRecipientSource(field, index, { teamIds: v })}
            placeholder="Select team(s)"
            className="w-full"
          >
            {teams.map((team) => (
              <Select.Option key={team.id} value={team.id}>{team.name}</Select.Option>
            ))}
          </Select>
        );
      case 'role':
        return (
          <Select
            mode="multiple"
            value={source.roleIds || []}
            onChange={(v) => updateRecipientSource(field, index, { roleIds: v })}
            placeholder="Select role(s)"
            className="w-full"
          >
            {roles.map((role) => (
              <Select.Option key={role.id} value={role.id}>{role.name}</Select.Option>
            ))}
          </Select>
        );
      case 'custom':
        return (
          <Select
            mode="tags"
            value={source.customEmails ? source.customEmails.split(',').filter(Boolean) : []}
            onChange={(v) => updateRecipientSource(field, index, { customEmails: v.join(',') })}
            placeholder="Enter custom email"
            className="w-full"
          />
        );
      default: return null;
    }
  };

  const renderRecipientGroup = (field: 'to' | 'cc' | 'bcc', label: string) => {
    const pool = configuration.recipients?.[field] || { pool_logic: 'OR', sources: [] };
    return (
      <Card size="small" title={<Space><MailOutlined /><span>{label}</span></Space>} className="mb-4">
        {pool.sources.map((source: any, idx: number) => (
          <div key={idx} className="mb-2 p-2 bg-gray-50 rounded border">
             <Row gutter={8} align="middle">
                <Col span={8}>
                   <Select value={source.type} onChange={v => updateRecipientSource(field, idx, { type: v as any })} className="w-full">
                      <Select.Option value="direct">Field</Select.Option>
                      <Select.Option value="team">Team</Select.Option>
                      <Select.Option value="role">Role</Select.Option>
                      <Select.Option value="custom">Manual</Select.Option>
                   </Select>
                </Col>
                <Col span={14}>
                   {renderSourceConfig(field, source, idx)}
                </Col>
                <Col span={2}>
                   <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeRecipientSource(field, idx)} />
                </Col>
             </Row>
          </div>
        ))}
        <Button type="dashed" onClick={() => addRecipientSource(field)} block icon={<PlusOutlined />}>Add Source</Button>
      </Card>
    );
  };

  return (
    <Spin spinning={loadingData}>
      <Form layout="vertical" size="small">
        <Form.Item label="Email Template" required>
          <Select
            value={configuration.templateId || ''}
            onChange={(v) => handleConfigChange('templateId', v)}
            placeholder="Select template"
          >
            {emailTemplates.map((t) => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
          </Select>
        </Form.Item>

        <Divider orientation="left">Recipients</Divider>
        {renderRecipientGroup('to', 'To')}
        {renderRecipientGroup('cc', 'CC')}

        <Card size="small" title="Options">
           <Space direction="vertical">
              <Space><Switch checked={configuration.sendImmediately !== false} onChange={v => handleConfigChange('sendImmediately', v)} /><span>Send Immediately</span></Space>
           </Space>
        </Card>
      </Form>
    </Spin>
  );
}
