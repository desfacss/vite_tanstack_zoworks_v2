import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Table, 
  Card, 
  Space, 
  Typography, 
  Tag, 
  Alert, 
  Row, 
  Col, 
  Select, 
  DatePicker, 
  Spin,
  Drawer,
  Tooltip
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EyeOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ExclamationCircleOutlined, 
  FilterOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { EventDetailsModal } from './EventDetailsModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface WorkflowLog {
  id: string;
  workflow_id: string;
  action_id: string;
  event_id: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  execution_time: string;
  duration_ms: number | null;
  error_message: string | null;
  trigger_data: any;
  conditions_checked: any;
  actions_executed: any;
  context: any;
  retry_attempt: number;
  log_level: string;
  workflow_stage: string | null;
}

interface WorkflowLogsViewProps {
  workflowId?: string;
  workflowName?: string;
  onBack?: () => void;
  showAllLogs?: boolean;
}

export function WorkflowLogsView({ workflowId, workflowName, onBack, showAllLogs = false }: WorkflowLogsViewProps) {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<WorkflowLog | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('day'),
    dayjs().endOf('day')
  ]);
  const [includeUnknownActions, setIncludeUnknownActions] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [workflowId, statusFilter, dateRange, showAllLogs]);

  const filteredLogs = logs.filter(log => {
    if (includeUnknownActions) return true;
    const hasActionName = log.context?.action_name && log.context.action_name !== 'Unknown Action';
    const hasActionType = log.context?.action_type && log.context.action_type !== 'N/A';
    const hasWorkflowStage = log.workflow_stage && log.workflow_stage !== 'Unknown Action';
    return hasActionName || hasActionType || hasWorkflowStage;
  });

  const loadLogs = async () => {
    const orgId = (user as any)?.pref_organization_id || (user as any)?.organization?.id;
    if (!orgId) return;

    try {
      setLoading(true);
      setError('');

      let query = supabase
        .schema('workflow' as any).from('wf_logs')
        .select('*')
        .eq('organization_id', orgId);

      if (!showAllLogs && workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const startDate = dateRange[0].toISOString();
      const endDate = dateRange[1].toISOString();
      query = query
        .gte('execution_time', startDate)
        .lte('execution_time', endDate);

      query = query.order('execution_time', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow logs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'pending': return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'running': return <ExclamationCircleOutlined style={{ color: '#1890ff' }} />;
      default: return <ExclamationCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      case 'running': return 'processing';
      default: return 'default';
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const columns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Space>
          {getStatusIcon(status)}
          <Tag color={getStatusColor(status)}>
            {status.toUpperCase()}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Execution Time',
      dataIndex: 'execution_time',
      key: 'execution_time',
      width: 180,
      render: (time: string) => (
        <Text>{dayjs(time).format('MMM DD, HH:mm:ss')}</Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 200,
      render: (record: WorkflowLog) => (
        <Space direction="vertical" size="small">
          <Text strong>{record.context?.action_name || record.workflow_stage || 'Unknown Action'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.context?.action_type || record.log_level || 'N/A'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration_ms',
      key: 'duration_ms',
      width: 100,
      render: (duration: number | null) => (
        <Text>{formatDuration(duration)}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (record: WorkflowLog) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
              setSelectedLog(record);
              setDetailsDrawerOpen(true);
          }}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              {onBack && <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} />}
              <div>
                <Title level={4} style={{ margin: 0 }}>Execution Logs</Title>
                <Text type="secondary">{workflowName ? `History for ${workflowName}` : 'Global Execution History'}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={loadLogs} loading={loading}>Refresh</Button>
          </Col>
        </Row>

        <Card size="small">
          <Space wrap align="end">
             <Space direction="vertical" size={2}>
                <Text strong style={{ fontSize: '12px' }}>Date Range</Text>
                <RangePicker value={dateRange} onChange={d => d && setDateRange([d[0]!, d[1]!])} style={{ width: 300 }} />
             </Space>
             <Space direction="vertical" size={2}>
                <Text strong style={{ fontSize: '12px' }}>Status</Text>
                <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }}>
                   <Select.Option value="all">All Statuses</Select.Option>
                   <Select.Option value="success">Success</Select.Option>
                   <Select.Option value="failed">Failed</Select.Option>
                </Select>
             </Space>
             <Space direction="vertical" size={2}>
                <Button onClick={() => setStatusFilter('failed')} danger={statusFilter === 'failed'} size="small">Failed Only</Button>
             </Space>
          </Space>
        </Card>

        {error && <Alert message={error} type="error" closable />}

        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 50, showTotal: t => `Total ${t} logs` }}
          scroll={{ x: 1000 }}
        />
      </Space>

      <Drawer
        title="Log Details"
        width="80%"
        open={detailsDrawerOpen}
        onClose={() => setDetailsDrawerOpen(false)}
        destroyOnClose
      >
        {selectedLog && (
          <EventDetailsModal
            log={selectedLog}
            isOpen={detailsDrawerOpen}
            onClose={() => setDetailsDrawerOpen(false)}
          />
        )}
      </Drawer>
    </div>
  );
}
