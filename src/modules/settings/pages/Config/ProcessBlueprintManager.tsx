import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Tag, Modal, Typography, Input, Tooltip, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { ProcessBlueprint } from './types/entityTypes';
import ProcessBlueprintConfig from './ProcessBlueprintConfig';

const { Title } = Typography;

const ProcessBlueprintManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [blueprints, setBlueprints] = useState<ProcessBlueprint[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchBlueprints();
  }, []);

  const fetchBlueprints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('automation')
        .from('bp_process_blueprints')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setBlueprints(data || []);
    } catch (error: any) {
      console.error('Error fetching process blueprints:', error);
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
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ProcessBlueprint) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{text}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Typography.Text>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'blueprint_type',
      key: 'blueprint_type',
      render: (type: string) => (
        <Tag color={
          type === 'lifecycle' ? 'blue' : 
          type === 'approval' ? 'green' : 
          type === 'orchestration' ? 'purple' : 
          'orange'
        }>
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Entity',
      key: 'entity',
      render: (_: any, record: ProcessBlueprint) => (
        <Typography.Text code>{record.entity_schema}.{record.entity_type}</Typography.Text>
      )
    },
    {
      title: 'Intent',
      dataIndex: 'intent',
      key: 'intent',
      render: (intent: string) => intent || '-'
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (v: number) => <Tag color="cyan">v{v}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      )
    },
    {
      title: 'Last Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text: string) => new Date(text).toLocaleString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ProcessBlueprint) => (
        <Space>
          <Tooltip title="Edit Blueprint">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record.id)} 
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Process Blueprint Manager</Title>
          <Typography.Text type="secondary">Manage automation lifecycles, approvals, and orchestrations</Typography.Text>
        </Col>
        <Col>
          <Space>
            <Input
              placeholder="Search blueprints..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={fetchBlueprints} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Blueprint
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        dataSource={filteredBlueprints}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 12 }}
        onRow={(record) => ({
          onDoubleClick: () => handleEdit(record.id),
        })}
      />

      <Modal
        title={selectedBlueprintId ? "Edit Process Blueprint" : "Create New Process Blueprint"}
        open={isConfigVisible}
        onCancel={() => setIsConfigVisible(false)}
        width="90%"
        footer={null}
        destroyOnClose
        style={{ top: 20 }}
      >
        <ProcessBlueprintConfig 
          blueprintId={selectedBlueprintId} 
          onSaveSuccess={handleConfigSuccess} 
        />
      </Modal>
    </Card>
  );
};

export default ProcessBlueprintManager;
