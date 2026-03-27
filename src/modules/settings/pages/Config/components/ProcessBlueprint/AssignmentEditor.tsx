import React, { useState, useEffect } from 'react';
import { Select, Space, Button, Input, Tag, Row, Col, Typography, Empty, Divider, Badge, Alert } from 'antd';
import { User, Users, Shield, Code, Plus, Trash2, Settings, Info } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';

const { Option } = Select;
const { Text } = Typography;

export interface AssignmentSource {
  type: 'user' | 'role' | 'team' | 'expression';
  id?: string;
  name?: string;
  expression?: string;
}

export interface AssignmentConfig {
  method: 'direct' | 'round_robin' | 'least_busy' | 'random';
  sources: AssignmentSource[];
  pool_logic: 'OR' | 'AND';
}

interface AssignmentEditorProps {
  value?: AssignmentConfig;
  onChange: (value: AssignmentConfig) => void;
  label?: string;
}

const AssignmentEditor: React.FC<AssignmentEditorProps> = ({ value, onChange, label }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Default value if missing
  const config: AssignmentConfig = {
    method: 'direct',
    sources: [],
    pool_logic: 'OR',
    ...(value || {})
  };

  // Double check sources specifically (in case value was partial)
  if (!config.sources) config.sources = [];

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      // Fetch Roles
      const { data: rolesData } = await supabase
        .schema('identity').from('roles' as any)
        .select('id, name')
        .eq('is_active', true);
      
      // Fetch Teams
      const { data: teamsData } = await supabase
        .schema('identity').from('teams' as any)
        .select('id, name');

      // Fetch Users (limited for dropdown performance)
      const { data: usersData } = await supabase
        .schema('identity').from('users' as any) // TODO: change to v_organization_users or organization_users
        .select('id, email')
        .limit(100);

      if (rolesData) setRoles(rolesData);
      if (teamsData) setTeams(teamsData);
      if (usersData) setUsers(usersData);
    } catch (error) {
      console.error('Error fetching assignment metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (updates: Partial<AssignmentConfig>) => {
    onChange({ ...config, ...updates });
  };

  const addSource = () => {
    const newSources = [...config.sources, { type: 'user' as const }];
    handleUpdate({ sources: newSources });
  };

  const removeSource = (index: number) => {
    const newSources = config.sources.filter((_, i) => i !== index);
    handleUpdate({ sources: newSources });
  };

  const updateSource = (index: number, updates: Partial<AssignmentSource>) => {
    const newSources = config.sources.map((s, i) => i === index ? { ...s, ...updates } : s);
    handleUpdate({ sources: newSources });
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'user': return <User size={14} />;
      case 'team': return <Users size={14} />;
      case 'role': return <Shield size={14} />;
      case 'expression': return <Code size={14} />;
      default: return null;
    }
  };

  return (
    <div className="assignment-editor" style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
      {label && <div style={{ marginBottom: 12 }}><Text strong>{label}</Text></div>}
      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div style={{ marginBottom: 4 }}><Text type="secondary" size="small">Assignment Method</Text></div>
          <Select 
            value={config.method} 
            style={{ width: '100%' }}
            onChange={(val) => handleUpdate({ method: val })}
          >
            <Option value="direct">Direct Assignment</Option>
            <Option value="round_robin">Round Robin</Option>
            <Option value="least_busy">Least Busy</Option>
            <Option value="random">Random</Option>
          </Select>
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: 4 }}><Text type="secondary" size="small">Pool Logic</Text></div>
          <Select 
            value={config.pool_logic} 
            style={{ width: '100%' }}
            onChange={(val) => handleUpdate({ pool_logic: val })}
          >
            <Option value="OR">Match Any (OR)</Option>
            <Option value="AND">Match All (AND)</Option>
          </Select>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong size="small">Assignment Sources</Text>
        <Button size="small" type="dashed" icon={<Plus size={14} />} onClick={addSource}>
          Add Source
        </Button>
      </div>

      {config.sources.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sources defined" style={{ margin: '12px 0' }} />
      ) : (
        <div className="sources-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {config.sources.map((source, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #f0f0f0' }}>
              <Select 
                value={source.type} 
                size="small"
                style={{ width: '100px' }}
                onChange={(type) => updateSource(index, { type, id: undefined, expression: undefined })}
              >
                <Option value="user">User</Option>
                <Option value="role">Role</Option>
                <Option value="team">Team</Option>
                <Option value="expression">Expression</Option>
              </Select>

              <div style={{ flex: 1 }}>
                {source.type === 'expression' ? (
                  <Input 
                    size="small"
                    placeholder="{{entity.owner_id}}"
                    value={source.expression}
                    onChange={(e) => updateSource(index, { expression: e.target.value })}
                  />
                ) : (
                  <Select
                    size="small"
                    showSearch
                    style={{ width: '100%' }}
                    placeholder={`Select ${source.type}...`}
                    value={source.id}
                    onChange={(val) => {
                      const name = source.type === 'role' 
                        ? roles.find(r => r.id === val)?.name 
                        : source.type === 'team'
                        ? teams.find(t => t.id === val)?.name
                        : users.find(u => u.id === val)?.email;
                      updateSource(index, { id: val, name });
                    }}
                    filterOption={(input, option) =>
                      (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {source.type === 'user' && users.map(u => (
                      <Option key={u.id} value={u.id}>{u.email}</Option>
                    ))}
                    {source.type === 'role' && roles.map(r => (
                      <Option key={r.id} value={r.id}>{r.name}</Option>
                    ))}
                    {source.type === 'team' && teams.map(t => (
                      <Option key={t.id} value={t.id}>{t.name}</Option>
                    ))}
                  </Select>
                )}
              </div>

              <Button 
                size="small" 
                type="text" 
                danger 
                icon={<Trash2 size={14} />} 
                onClick={() => removeSource(index)} 
              />
            </div>
          ))}
        </div>
      )}

      {config.method === 'round_robin' && config.sources.length > 0 && (
        <Alert
          style={{ marginTop: 12 }}
          message="Round Robin will cycle through members of the selected teams/roles."
          type="info"
          showIcon
          icon={<Info size={14} />}
        />
      )}
    </div>
  );
};

export default AssignmentEditor;
