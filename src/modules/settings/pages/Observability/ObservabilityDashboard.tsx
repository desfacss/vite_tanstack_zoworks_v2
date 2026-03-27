import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Tabs, Button, Input, Table, Badge, Drawer, Tag, message } from 'antd';
import { 
  Activity, 
  RefreshCw, 
  Search, 
  List, 
  Play, 
  Database, 
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import JsonLogViewer from '@/core/components/JsonLogViewer';

const { Title, Text } = Typography;

// --- Sub-components ---

interface TabProps {
  loading: boolean;
  data: any[];
  onRefresh: () => void;
  onViewDetails: (item: any) => void;
}

const EventsTab: React.FC<TabProps> = ({ loading, data, onRefresh, onViewDetails }) => {
  return (
    <div style={{ padding: '16px 0' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: '20px' }}>
        <Col>
          <Text type="secondary">Latest automation triggers and queue status</Text>
        </Col>
        <Col>
          <Space>
            <Input 
              prefix={<Search size={14} color="#bfbfbf" />} 
              placeholder="Search by Entity ID..." 
              style={{ width: 250, borderRadius: '8px' }}
            />
            <Button 
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} 
              onClick={onRefresh}
              loading={loading}
              style={{ borderRadius: '8px' }}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>
      <Table 
        columns={[
          { 
            title: 'Event Time', 
            dataIndex: 'created_at', 
            key: 'created_at', 
            width: 180,
            render: (t) => (
              <Space size={4}>
                <Clock size={14} color="#8c8c8c" />
                <Text type="secondary">{new Date(t).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Text>
              </Space>
            )
          },
          { 
            title: 'Entity', 
            dataIndex: 'entity_type', 
            key: 'entity_type', 
            width: 140,
            render: (val) => <Tag color="blue">{val}</Tag>
          },
          { title: 'Event Name', dataIndex: 'event_name', key: 'event_name' },
          { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            render: (s) => {
              if (s === 'processed') return (
                <Space size={4}>
                  <CheckCircle2 size={14} color="#52c41a" />
                  <Text style={{ color: '#52c41a' }}>Processed</Text>
                </Space>
              );
              if (s === 'failed') return (
                <Space size={4}>
                  <XCircle size={14} color="#ff4d4f" />
                  <Text style={{ color: '#ff4d4f' }}>Failed</Text>
                </Space>
              );
              return (
                <Space size={4}>
                  <RefreshCw size={14} color="#1890ff" className="animate-spin" />
                  <Text style={{ color: '#1890ff' }}>Pending</Text>
                </Space>
              );
            }
          },
          { 
            title: 'Actions', 
            key: 'actions',
            width: 80,
            fixed: 'right',
            render: (_, record: any) => (
              <Button type="text" icon={<ChevronRight size={18} />} onClick={() => onViewDetails(record)} />
            )
          }
        ]} 
        dataSource={data} 
        rowKey="id"
        loading={loading}
        size="middle"
        pagination={{ pageSize: 15 }}
        locale={{ emptyText: 'No recent events recorded' }}
      />
    </div>
  );
};

interface LogsTabProps {
  onViewDetails: (item: any) => void;
}

const LogsTab: React.FC<LogsTabProps> = ({ onViewDetails }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('automation')
        .from('wf_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      message.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: '20px' }}>
        <Col>
          <Text type="secondary">Detailed execution trace for workflow actions</Text>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} 
              onClick={fetchLogs}
              loading={loading}
              style={{ borderRadius: '8px' }}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>
      <Table 
        columns={[
          { title: 'Time', dataIndex: 'created_at', key: 'created_at', width: 180, render: (t) => new Date(t).toLocaleString() },
          { title: 'Stage', dataIndex: 'stage_id', key: 'stage_id' },
          { title: 'Action', dataIndex: 'action_name', key: 'action_name' },
          { 
            title: 'Result', 
            key: 'result',
            render: (_, record: any) => (
              record.status === 'success' ? <Tag color="success">Success</Tag> : <Tag color="error">Error</Tag>
            )
          },
          { 
            title: 'Trace', 
            key: 'trace',
            width: 80,
            render: (_, record: any) => (
              <Button type="text" icon={<ChevronRight size={18} />} onClick={() => onViewDetails(record)} />
            )
          }
        ]} 
        dataSource={logs} 
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 15 }}
      />
    </div>
  );
};

const InstancesTab: React.FC = () => {
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('automation')
        .from('esm_instances')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setInstances(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: '20px' }}>
        <Col><Text type="secondary">Active Entity State Machines (ESM)</Text></Col>
        <Col><Button icon={<RefreshCw size={14} />} onClick={fetchInstances} loading={loading}>Refresh</Button></Col>
      </Row>
      <Table 
        columns={[
          { title: 'Entity Type', dataIndex: 'entity_type', key: 'entity_type' },
          { title: 'Current Stage', dataIndex: 'stage_id', key: 'stage_id' },
          { title: 'Entity ID', dataIndex: 'entity_id', key: 'entity_id' },
          { title: 'Last Updated', dataIndex: 'updated_at', key: 'updated_at', render: (t) => new Date(t).toLocaleString() }
        ]}
        dataSource={instances}
        rowKey="id"
        loading={loading}
        size="middle"
      />
    </div>
  );
};

const TelemetryTab: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTelemetry = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .schema('automation')
          .from('telemetry_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTelemetry();
  }, []);

  return (
    <div style={{ padding: '16px 0' }}>
      <Table 
        columns={[
          { title: 'Time', dataIndex: 'created_at', key: 'created_at', width: 180, render: (t) => new Date(t).toLocaleString() },
          { title: 'Level', dataIndex: 'level', key: 'level', render: (l) => <Tag color={l === 'error' ? 'red' : 'blue'}>{l?.toUpperCase()}</Tag> },
          { title: 'Message', dataIndex: 'message', key: 'message' },
          { title: 'Module', dataIndex: 'module', key: 'module' }
        ]}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        size="small"
      />
    </div>
  );
};

// --- Main Dashboard ---

const ObservabilityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    if (activeTab === '1') {
      fetchEvents();
    }
  }, [activeTab]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('automation')
        .from('wf_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      message.error(`Failed to load events: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showDetails = (item: any) => {
    setSelectedItem(item);
    setDrawerVisible(true);
  };

  const stats = [
    { title: 'Total Events (24h)', value: events.length.toString(), icon: <Activity size={20} color="#1890ff" />, color: '#e6f7ff' },
    { title: 'Failed Actions', value: events.filter(e => e.status === 'failed').length.toString(), icon: <AlertCircle size={20} color="#ff4d4f" />, color: '#fff1f0' },
    { title: 'Active ESM Instances', value: '45', icon: <Play size={20} color="#52c41a" />, color: '#f6ffed' },
    { title: 'Blueprints Live', value: '8', icon: <Database size={20} color="#722ed1" />, color: '#f9f0ff' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Space align="center" size={16}>
            <div style={{ background: '#1890ff', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)' }}>
              <Activity size={32} color="white" />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Observability Control Center</Title>
              <Text type="secondary">Real-time automation health & execution tracing</Text>
            </div>
          </Space>
        </Col>

        {stats.map((stat, i) => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <Space size={16} align="start">
                <div style={{ background: stat.color, padding: '10px', borderRadius: '10px' }}>
                  {stat.icon}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '13px' }}>{stat.title}</Text>
                  <Title level={3} style={{ margin: 0, marginTop: '4px' }}>{stat.value}</Title>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: '1',
              label: (
                <Space>
                  <List size={16} />
                  <span>Workflow Events</span>
                </Space>
              ),
              children: (
                <EventsTab 
                  loading={loading} 
                  data={events} 
                  onRefresh={fetchEvents} 
                  onViewDetails={showDetails} 
                />
              ),
            },
            {
              key: '2',
              label: (
                <Space>
                  <Activity size={16} />
                  <span>Execution Logs</span>
                </Space>
              ),
              children: (
                <LogsTab 
                  onViewDetails={showDetails} 
                />
              ),
            },
            {
              key: '3',
              label: (
                <Space>
                  <Play size={16} />
                  <span>Active Instances</span>
                </Space>
              ),
              children: <InstancesTab />,
            },
            {
              key: '4',
              label: (
                <Space>
                  <Database size={16} />
                  <span>System Telemetry</span>
                </Space>
              ),
              children: <TelemetryTab />,
            },
          ]}
        />
      </Card>

      <Drawer
        title="Event Details"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Close</Button>
          </Space>
        }
      >
        {selectedItem && (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Card size="small" title="General Information">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">Event ID</Text><br />
                  <Text copyable>{selectedItem.id}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Created At</Text><br />
                  <Text>{new Date(selectedItem.created_at).toLocaleString()}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Entity Type</Text><br />
                  <Tag color="blue">{selectedItem.entity_type}</Tag>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Event Name</Text><br />
                  <Text strong>{selectedItem.event_name}</Text>
                </Col>
                <Col span={24}>
                  <Text type="secondary">Status</Text><br />
                  <Badge 
                    status={selectedItem.status === 'processed' ? 'success' : (selectedItem.status === 'failed' ? 'error' : 'processing')} 
                    text={selectedItem.status?.toUpperCase() || 'PENDING'} 
                  />
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Payload / Context">
              <JsonLogViewer data={selectedItem.payload || selectedItem.config || selectedItem} />
            </Card>
            
            {selectedItem.error_message && (
              <Card size="small" title="Error Details" headStyle={{ color: '#ff4d4f' }}>
                <Text type="danger">{selectedItem.error_message}</Text>
              </Card>
            )}
          </Space>
        )}
      </Drawer>

      <style>{`
        .ant-tabs-nav::before {
          border-bottom: 2px solid #f0f0f0 !important;
        }
        .ant-tabs-tab {
          padding: 12px 16px !important;
          margin: 0 16px 0 0 !important;
          font-weight: 500;
        }
        .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #1890ff !important;
        }
        .ant-tabs-ink-bar {
          height: 3px !important;
          border-radius: 3px 3px 0 0;
        }
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ObservabilityDashboard;
