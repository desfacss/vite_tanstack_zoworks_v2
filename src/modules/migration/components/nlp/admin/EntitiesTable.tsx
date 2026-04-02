import { useState } from 'react';
import { Table, Button, Space, Input, Select, Popconfirm, Tooltip } from 'antd';
import { EyeOutlined, ThunderboltOutlined, HistoryOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useEntities, useGenerateSemantics } from '../hooks/useNlpAdmin';
import { formatTimestamp, getStatusColor, getStatusText } from './utils';
import { EntityStatus, type Entity } from './types';

const { Search } = Input;

export const EntitiesTable: React.FC<{ onReview: (id: string) => void; onHistory: (id: string) => void }> = ({ onReview, onHistory }) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<EntityStatus | 'all'>('all');
  const { data: entities, isLoading, refetch } = useEntities();
  const generateSemanticsMutation = useGenerateSemantics();

  const filtered = entities?.filter(e => {
    const matches = !searchText || e.entity_name.toLowerCase().includes(searchText.toLowerCase()) || e.source_table.toLowerCase().includes(searchText.toLowerCase());
    return matches && (statusFilter === 'all' || e.status === statusFilter);
  });

  const columns: ColumnsType<Entity> = [
    { title: 'Entity', dataIndex: 'entity_name', key: 'name', render: (t) => <strong>{t}</strong> },
    { title: 'Table', key: 'table', render: (_, r) => <code className="text-xs">{r.source_schema}.{r.source_table}</code> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: EntityStatus) => <span style={{ color: getStatusColor(s) }}>{getStatusText(s)}</span> },
    { title: 'Updated', dataIndex: 'updated_at', key: 'updated', render: formatTimestamp },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space size="small">
        <Button size="small" icon={<EyeOutlined />} onClick={() => onReview(r.id)}>Review</Button>
        <Popconfirm title="Generate Semantics?" onConfirm={() => generateSemanticsMutation.mutate({ entity_id: r.id })}>
          <Button size="small" icon={<ThunderboltOutlined />} loading={generateSemanticsMutation.isPending}>Generate</Button>
        </Popconfirm>
        <Button size="small" icon={<HistoryOutlined />} onClick={() => onHistory(r.id)}>History</Button>
      </Space>
    )}
  ];

  return (
    <div>
      <Space className="mb-4">
        <Search placeholder="Search..." onSearch={setSearchText} style={{ width: 250 }} />
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }} options={[
          { label: 'All', value: 'all' },
          { label: 'Published', value: EntityStatus.PUBLISHED },
          { label: 'Draft', value: EntityStatus.DRAFT },
          { label: 'Not Modeled', value: EntityStatus.NOT_MODELED }
        ]} />
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
      </Space>
      <Table columns={columns} dataSource={filtered} rowKey="id" loading={isLoading} size="small" />
    </div>
  );
};
