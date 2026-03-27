import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Tag, Modal, Typography, Input, Tooltip, Row, Col, message, Badge } from 'antd';
import { 
  Plus, 
  Edit3, 
  RefreshCw, 
  Search, 
  Play, 
  Copy, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { ProcessBlueprint } from './types/entityTypes';
import ProcessBlueprintConfig from './ProcessBlueprintConfig';

const { Title, Text } = Typography;

const ProcessBlueprintManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchBlueprints();
  }, []);

  const fetchBlueprints = async () => {
    setLoading(true);
    try {
      // Fetch blueprints
      const { data: bpData, error: bpError } = await supabase
        .schema('automation')
        .from('bp_process_blueprints')
        .select('*')
        .order('updated_at', { ascending: false });

      if (bpError) throw bpError;

      // Fetch latest compilation log for each blueprint
      const { data: logData, error: logError } = await supabase
        .schema('automation')
        .from('comp_blueprint_compilation_logs')
        .select('blueprint_id, status, created_at, error_message')
        .order('created_at', { ascending: false });

      if (logError) throw logError;

      // Map logs to blueprints (taking the most recent for each)
      const latestLogs: Record<string, any> = {};
      logData?.forEach(log => {
        if (!latestLogs[log.blueprint_id]) {
          latestLogs[log.blueprint_id] = log;
        }
      });

      const enrichedBlueprints = (bpData || []).map(bp => ({
        ...bp,
        last_compilation: latestLogs[bp.id] || null
      }));

      setBlueprints(enrichedBlueprints);
    } catch (error: any) {
      console.error('Error fetching process blueprints:', error);
      message.error('Failed to load blueprints');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    setSelectedBlueprintId(id);
    setIsConfigVisible(true);
  };

  const handleAdd = () => {
    setSelectedBlueprintId(undefined);
    setIsConfigVisible(true);
  };

  const handleDuplicate = async (record: ProcessBlueprint) => {
    try {
      setLoading(true);
      const { id: _, created_at, updated_at, ...duplicateData } = record;
      const { error } = await supabase
        .schema('automation')
        .from('bp_process_blueprints')
        .insert([{
          ...duplicateData,
          name: `${record.name} (Copy)`,
          is_active: false // New copy should be inactive
        }])
        .select()
        .single();

      if (error) throw error;
      message.success('Blueprint duplicated successfully');
      fetchBlueprints();
    } catch (error: any) {
      console.error('Error duplicating blueprint:', error);
      message.error(`Duplication failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompile = async (id: string) => {
    try {
      message.loading({ content: 'Triggering compilation...', key: 'compile' });
      const { error } = await supabase
        .schema('automation')
        .rpc('comp_core_compile', { p_blueprint_id: id });

      if (error) throw error;
      message.success({ content: 'Compilation triggered!', key: 'compile' });
      
      // Refresh after a delay to get log status
      setTimeout(fetchBlueprints, 3000);
    } catch (error: any) {
      console.error('Compilation failed:', error);
      message.error({ content: `Compilation failed: ${error.message}`, key: 'compile' });
    }
  };

  const handleConfigSuccess = () => {
    setIsConfigVisible(false);
    fetchBlueprints();
  };

  const filteredBlueprints = blueprints.filter(bp => 
    bp.name.toLowerCase().includes(searchText.toLowerCase()) ||
    bp.entity_type.toLowerCase().includes(searchText.toLowerCase()) ||
    (bp.intent || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Blueprint',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '15px' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description || 'No description'}</Text>
        </Space>
      )
    },
    {
      title: 'Target Entity',
      key: 'entity',
      width: 180,
      render: (_: any, record: ProcessBlueprint) => (
        <Space direction="vertical" size={2}>
          <Tag color="geekblue" style={{ borderRadius: '4px', margin: 0 }}>
            {record.entity_schema}.{record.entity_type}
          </Tag>
          <Text type="secondary" style={{ fontSize: '11px' }}>{record.intent || '-'}</Text>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'blueprint_type',
      key: 'blueprint_type',
      width: 120,
      render: (type: string) => (
        <Tag color={
          type === 'lifecycle' ? 'blue' : 
          type === 'approval' ? 'green' : 
          type === 'orchestration' ? 'purple' : 
          'orange'
        } style={{ borderRadius: '12px', border: 'none', fontWeight: 500 }}>
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Comp. Status',
      key: 'last_compilation',
      width: 160,
      render: (_: any, record: any) => {
        const log = record.last_compilation;
        if (!log) return <Text type="secondary" style={{ fontSize: '12px' }}>Never Compiled</Text>;
        
        return (
          <Space direction="vertical" size={0}>
            <Space size={4}>
              {log.status === 'success' ? (
                <CheckCircle2 size={14} color="#52c41a" />
              ) : log.status === 'failed' ? (
                <AlertCircle size={14} color="#f5222d" />
              ) : (
                <RefreshCw size={14} className="animate-spin" color="#1890ff" />
              )}
              <Text strong style={{ fontSize: '12px', color: log.status === 'success' ? '#52c41a' : (log.status === 'failed' ? '#f5222d' : '#1890ff') }}>
                {log.status.toUpperCase()}
              </Text>
            </Space>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'V',
      dataIndex: 'version',
      key: 'version',
      width: 50,
      render: (v: number) => <Text style={{ color: '#8c8c8c' }}>v{v}</Text>
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Badge status={active ? "success" : "default"} text={active ? "LIVE" : "OFF"} />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Edit">
            <Button 
              type="text" 
              size="small"
              icon={<Edit3 size={16} />} 
              onClick={() => handleEdit(record.id)} 
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="Compile">
            <Button 
              type="text" 
              size="small"
              icon={<Play size={16} />} 
              onClick={() => handleCompile(record.id)} 
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="Duplicate">
            <Button 
              type="text" 
              size="small"
              icon={<Copy size={16} />} 
              onClick={() => handleDuplicate(record)} 
              style={{ color: '#faad14' }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 32 }}>
        <Col>
          <Space align="center" size={12}>
            <div style={{ background: '#e6f7ff', padding: '10px', borderRadius: '10px' }}>
              <Activity size={24} color="#1890ff" />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>Automation Blueprints</Title>
              <Text type="secondary">Lifecycle, Approval & Orchestration Compiler</Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Space size={12}>
            <Input
              placeholder="Search by name, entity, intent..."
              prefix={<Search size={16} color="#bfbfbf" />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 300, borderRadius: '8px' }}
              allowClear
            />
            <Button 
              icon={<RefreshCw size={16} />} 
              onClick={fetchBlueprints} 
              loading={loading}
              style={{ borderRadius: '8px' }}
            />
            <Button 
              type="primary" 
              icon={<Plus size={16} />} 
              onClick={handleAdd}
              style={{ borderRadius: '8px', background: '#1890ff', border: 'none', height: '36px', display: 'flex', alignItems: 'center' }}
            >
              New Blueprint
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        dataSource={filteredBlueprints}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 12, hideOnSinglePage: true }}
        onRow={(record) => ({
          onDoubleClick: () => handleEdit(record.id),
        })}
        className="blueprint-table"
      />

      <Modal
        title={
          <Space>
            <FileText size={18} />
            <span>{selectedBlueprintId ? "Process Blueprint Editor" : "Create New Blueprint"}</span>
          </Space>
        }
        open={isConfigVisible}
        onCancel={() => setIsConfigVisible(false)}
        width="95%"
        footer={null}
        destroyOnClose
        style={{ top: 20 }}
        bodyStyle={{ padding: '0 24px 24px 24px' }}
      >
        <ProcessBlueprintConfig 
          blueprintId={selectedBlueprintId} 
          onSaveSuccess={handleConfigSuccess} 
        />
      </Modal>

      <style>{`
        .blueprint-table .ant-table-thead > tr > th {
          background: #fafafa !important;
          border-bottom: 1px solid #f0f0f0;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }
        .blueprint-table .ant-table-row:hover {
          cursor: pointer;
        }
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default ProcessBlueprintManager;
