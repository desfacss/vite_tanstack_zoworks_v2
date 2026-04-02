import { Table, Tag, Button, Typography, Space, Tooltip } from 'antd';
import { EditOutlined, LikeOutlined, DislikeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNlpLogs } from '../hooks/useNlpAdmin';
import { formatTimestamp, getQueryStatusColor, getQueryStatusText, truncateText, formatSql } from './utils';
import { UserFeedback, type NlpLog } from './types';

const { Text } = Typography;

export const QueryLogsTable: React.FC<{ onCorrect: (id: string) => void }> = ({ onCorrect }) => {
  const { data: logs, isLoading } = useNlpLogs({});

  const columns: ColumnsType<NlpLog> = [
    { title: 'User Input', dataIndex: 'user_input', key: 'input', width: 300, render: (t) => <Tooltip title={t}><Text>{truncateText(t, 100)}</Text></Tooltip> },
    { title: 'SQL', dataIndex: 'generated_sql', key: 'sql', width: 300, render: (t) => <Tooltip title={<pre>{formatSql(t)}</pre>}><Text code className="text-xs">{truncateText(t, 80)}</Text></Tooltip> },
    { title: 'Status', dataIndex: 'was_successful', key: 'status', render: (s: boolean) => <Tag color={getQueryStatusColor(s)}>{getQueryStatusText(s)}</Tag> },
    { title: 'Feedback', dataIndex: 'user_feedback', key: 'feedback', render: (f: UserFeedback) => f === UserFeedback.HELPFUL ? <LikeOutlined style={{ color: '#52c41a' }} /> : f === UserFeedback.NOT_HELPFUL ? <DislikeOutlined style={{ color: '#ff4d4f' }} /> : '-' },
    { title: 'Time', dataIndex: 'execution_time_ms', key: 'time', render: (t) => t ? `${t}ms` : '-' },
    { title: 'Actions', key: 'actions', fixed: 'right' as const, render: (_, r) => (!r.was_successful || r.user_feedback === UserFeedback.NOT_HELPFUL) && (
      <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => onCorrect(r.id)}>Correct</Button>
    ) },
  ];

  return (
    <Table columns={columns} dataSource={logs} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 20 }} scroll={{ x: 1200 }} 
      expandable={{ expandedRowRender: (r) => (
        <Space direction="vertical" className="w-full">
          <div><Text strong>SQL:</Text><pre className="p-3 bg-gray-50 border rounded text-xs mt-2">{formatSql(r.generated_sql)}</pre></div>
          {r.error_message && <div><Text strong type="danger">Error:</Text><pre className="p-3 bg-red-50 border border-red-200 rounded text-xs mt-2">{r.error_message}</pre></div>}
        </Space>
      )}}
    />
  );
};
