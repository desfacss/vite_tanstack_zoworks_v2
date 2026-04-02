import React from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Tag, 
  Collapse, 
  Button, 
  Alert,
  Descriptions
} from 'antd';
import { 
  CopyOutlined,
  BugOutlined,
  ThunderboltOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

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

interface EventDetailsModalProps {
  log: WorkflowLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailsModal({ log, isOpen }: EventDetailsModalProps) {
  if (!log || !isOpen) return null;

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const JsonViewer = ({ data, title }: { data: any; title: string }) => {
    if (!data) return <Text type="secondary" italic>No data available</Text>;
    const jsonString = JSON.stringify(data, null, 2);
    return (
      <Card 
        size="small" 
        title={
          <Space>
            <DatabaseOutlined />
            <span style={{ fontSize: '12px' }}>{title}</span>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(jsonString)}
            />
          </Space>
        }
      >
        <pre className="p-2 bg-gray-50 text-xs rounded overflow-auto max-h-60 mt-0">
          <code>{jsonString}</code>
        </pre>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 bg-slate-900 text-white">
        <Title level={4} style={{ color: 'white', margin: 0 }}>Log Detail</Title>
        <div className="mt-2 flex items-center gap-4">
            <Tag color={getStatusColor(log.status)}>{log.status.toUpperCase()}</Tag>
            <span className="text-xs text-gray-400">{new Date(log.execution_time).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Space direction="vertical" size="middle" className="w-full">
          <Card size="small" title="Execution Summary">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Duration">{formatDuration(log.duration_ms)}</Descriptions.Item>
              <Descriptions.Item label="Action">{log.context?.action_name || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Type">{log.context?.action_type || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Level">{log.log_level}</Descriptions.Item>
            </Descriptions>
          </Card>

          {log.error_message && (
            <Alert
              message="Error trace"
              description={<pre className="text-xs whitespace-pre-wrap">{log.error_message}</pre>}
              type="error"
              showIcon
              icon={<BugOutlined />}
            />
          )}

          <Collapse size="small" className="bg-transparent" ghost>
            <Panel header={<Space><ThunderboltOutlined /><span>Trigger Info</span></Space>} key="1">
              <JsonViewer data={log.trigger_data} title="Event Payload" />
            </Panel>
            <Panel header={<Space><DatabaseOutlined /><span>Execution Context</span></Space>} key="2">
              <JsonViewer data={log.context} title="Context" />
              <JsonViewer data={log.actions_executed} title="Action Params" className="mt-4" />
            </Panel>
            <Panel header={<Space><DatabaseOutlined /><span>Conditions</span></Space>} key="3">
              <JsonViewer data={log.conditions_checked} title="Results" />
            </Panel>
          </Collapse>
        </Space>
      </div>

      <div className="p-4 bg-gray-50 border-t text-xs text-gray-400">
        Log ID: {log.id}
      </div>
    </div>
  );
}
