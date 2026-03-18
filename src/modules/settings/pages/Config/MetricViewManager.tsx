import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Tag, Modal, Typography, Input, Tooltip, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, ReloadOutlined, SearchOutlined, BarChartOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import MetricViewConfig from './MetricViewConfig';

const { Title } = Typography;

interface MetricView {
  id: string;
  rule_name: string;
  description: string;
  dependencies: string[];
  definition: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  module: string;
}

const MetricViewManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [metricViews, setMetricViews] = useState<MetricView[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [selectedMetricViewId, setSelectedMetricViewId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchMetricViews();
  }, []);

  const fetchMetricViews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('metric_views')
        .select('*')
        .order('rule_name', { ascending: true });

      if (error) throw error;
      setMetricViews(data || []);
    } catch (error: any) {
      console.error('Error fetching metric views:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    setSelectedMetricViewId(id);
    setIsConfigVisible(true);
  };

  const handleAdd = () => {
    setSelectedMetricViewId(undefined);
    setIsConfigVisible(true);
  };

  const handleConfigSuccess = () => {
    setIsConfigVisible(false);
    fetchMetricViews();
  };

  const filteredViews = metricViews.filter(mv => 
    mv.rule_name.toLowerCase().includes(searchText.toLowerCase()) ||
    (mv.description || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (mv.module || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Rule Name',
      dataIndex: 'rule_name',
      key: 'rule_name',
      render: (text: string, record: MetricView) => (
        <Space size="middle">
          <BarChartOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{text}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Typography.Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      render: (module: string) => (
        <Tag color="cyan">{module?.toUpperCase() || 'GENERAL'}</Tag>
      )
    },
    {
      title: 'Dependencies',
      dataIndex: 'dependencies',
      key: 'dependencies',
      render: (deps: string[]) => (
        <Space wrap>
          {deps?.map(dep => (
            <Tag key={dep} style={{ fontSize: '10px' }}>{dep}</Tag>
          ))}
        </Space>
      )
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
      render: (text: string) => text ? new Date(text).toLocaleString() : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: MetricView) => (
        <Space>
          <Tooltip title="Edit Metric View">
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
          <Title level={3} style={{ margin: 0 }}>Metric View Manager</Title>
          <Typography.Text type="secondary">Manage analytical rules, KPIs, and data aggregation definitions</Typography.Text>
        </Col>
        <Col>
          <Space>
            <Input
              placeholder="Search metrics..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={fetchMetricViews} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Metric View
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        dataSource={filteredViews}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 12 }}
        onRow={(record) => ({
          onDoubleClick: () => handleEdit(record.id),
        })}
      />

      <Modal
        title={selectedMetricViewId ? "Edit Metric View" : "Create New Metric View"}
        open={isConfigVisible}
        onCancel={() => setIsConfigVisible(false)}
        width="90%"
        footer={null}
        destroyOnClose
        style={{ top: 20 }}
      >
        <MetricViewConfig 
          metricViewId={selectedMetricViewId} 
          onSaveSuccess={handleConfigSuccess} 
        />
      </Modal>
    </Card>
  );
};

export default MetricViewManager;
