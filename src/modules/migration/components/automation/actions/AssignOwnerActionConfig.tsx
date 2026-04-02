import React, { useEffect, useState } from 'react';
import { Form, Select, Radio, Card, Row, Col, Typography, Space, Button, Spin } from 'antd';
import { UserOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import type { WorkflowRule, ViewConfig, TableMetadata, Team } from '../types';

const { Text } = Typography;

interface Role { id: string; name: string; }
interface User { id: string; name: string; }

interface AssignOwnerActionConfigProps {
  configuration: any;
  onChange: (config: any) => void;
  workflow: Partial<WorkflowRule>;
  availableTables: ViewConfig[];
  teams: Team[];
}

export function AssignOwnerActionConfig({
  configuration,
  onChange,
  workflow,
  availableTables,
  teams,
}: AssignOwnerActionConfigProps) {
  const { user } = useAuthStore();
  const [tableMetadata, setTableMetadata] = useState<TableMetadata[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [assignmentSources, setAssignmentSources] = useState<any[]>(configuration.assignment?.sources || []);

  useEffect(() => {
    const table = availableTables.find(t => t.entity_type === workflow.trigger_table);
    if (table && table.metadata) setTableMetadata(table.metadata);
    loadIdentityData();
  }, [workflow.trigger_table, availableTables]);

  const loadIdentityData = async () => {
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    if (!orgId) return;
    setLoading(true);
    try {
      const [{ data: rData }, { data: uData }] = await Promise.all([
        supabase.schema('identity' as any).from('roles').select('id, name').eq('organization_id', orgId),
        supabase.schema('identity' as any).from('users').select('id, name').eq('organization_id', orgId)
      ]);
      setRoles(rData || []);
      setUsers(uData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const assignableFields = tableMetadata.filter(field =>
    field.key.includes('assignee') || field.key.includes('owner') || field.key.includes('user')
  );

  const handleSourceChange = (index: number, key: string, value: any) => {
    const newSources = [...assignmentSources];
    newSources[index] = { ...newSources[index], [key]: value };
    setAssignmentSources(newSources);
    onChange({ ...configuration, assignment: { ...configuration.assignment, sources: newSources } });
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Form layout="vertical" size="small">
        <Form.Item label="Target Field" required>
          <Select value={configuration.field} onChange={v => onChange({ ...configuration, field: v })} placeholder="Field to update">
             {assignableFields.map(f => <Select.Option key={f.key} value={f.key}>{f.display_name}</Select.Option>)}
          </Select>
        </Form.Item>

        <Form.Item label="Logic Rule">
           <Radio.Group value={configuration.assignment?.rule} onChange={e => onChange({ ...configuration, assignment: { ...configuration.assignment, rule: e.target.value } })}>
              <Radio.Button value="round_robin">Round Robin</Radio.Button>
              <Radio.Button value="random">Random</Radio.Button>
           </Radio.Group>
        </Form.Item>

        <Card title="Assignment Sources" size="small">
           {assignmentSources.map((source, idx) => (
             <div key={idx} className="mb-2 p-3 bg-gray-50 rounded border relative">
                <Row gutter={8}>
                   <Col span={8}>
                      <Select value={source.type} onChange={v => handleSourceChange(idx, 'type', v)} className="w-full">
                         <Select.Option value="team">Team</Select.Option>
                         <Select.Option value="role">Role</Select.Option>
                         <Select.Option value="user">Specific User</Select.Option>
                      </Select>
                   </Col>
                   <Col span={14}>
                      {source.type === 'team' && <Select mode="multiple" value={source.teamIds || []} onChange={v => handleSourceChange(idx, 'teamIds', v)} className="w-full" placeholder="Teams">{teams.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}</Select>}
                      {source.type === 'user' && <Select mode="multiple" value={source.userIds || []} onChange={v => handleSourceChange(idx, 'userIds', v)} className="w-full" placeholder="Users">{users.map(u => <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>)}</Select>}
                      {source.type === 'role' && <Select mode="multiple" value={source.roleIds || []} onChange={v => handleSourceChange(idx, 'roleIds', v)} className="w-full" placeholder="Roles">{roles.map(r => <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>)}</Select>}
                   </Col>
                   <Col span={2}>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => {
                        const next = assignmentSources.filter((_, i) => i !== idx);
                        setAssignmentSources(next);
                        onChange({ ...configuration, assignment: { ...configuration.assignment, sources: next } });
                      }} />
                   </Col>
                </Row>
             </div>
           ))}
           <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setAssignmentSources([...assignmentSources, { type: 'team' }])}>Add Source</Button>
        </Card>
      </Form>
    </Space>
  );
}
