/**
 * EntityVersionManager Component
 * 
 * Enhanced version manager with full approval workflow support:
 * - Draft versions (metadata changes)
 * - Pending versions (logical variants awaiting approval)
 * - Approve/Reject actions for admins
 * - Optimize view functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { 
  Table, 
  Button, 
  Space, 
  message, 
  Popconfirm, 
  Typography, 
  Tag, 
  Drawer, 
  Tabs, 
  Badge,
  Input,
  Modal,
  Descriptions,
  Divider,
  Alert,
} from 'antd';
import { 
  CheckCircleOutlined, 
  ThunderboltOutlined, 
  ClockCircleOutlined, 
  EyeOutlined, 
  SettingOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import type { EntityVersion, EntityVersionStatus } from './types';

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * Maps the entity_type prop to the corresponding entity_table for the core.entity_versions table.
 */
const resolveEntityTypeToTable = (entityType: string) => entityType;

interface EntityVersionManagerProps {
  entity_schema: string;
  entity_type: string;
}

/**
 * Component to manage and publish entity versions, including approval workflow for logical variants.
 */
const EntityVersionManager: React.FC<EntityVersionManagerProps> = ({ entity_schema, entity_type }) => {
  // Draft versions (metadata changes)
  const [draftVersions, setDraftVersions] = useState<any[]>([]);
  // Pending versions (logical variants awaiting approval)
  const [pendingVersions, setPendingVersions] = useState<any[]>([]);
  // All versions for history
  const [allVersions, setAllVersions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('drafts');
  
  // Rejection modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingVersionId, setRejectingVersionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Detail view modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);

  const entityTable = resolveEntityTypeToTable(entity_type);

  // --- Drawer Handlers ---
  const showDrawer = () => {
    setDrawerVisible(true);
    fetchAllVersions();
  };

  const onClose = () => {
    setDrawerVisible(false);
  };

  /**
   * Fetches all versions for the specified entity, grouped by status.
   */
  const fetchAllVersions = useCallback(async () => {
    if (!entity_schema || !entityTable) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('entity_versions')
        .select('*')
        .eq('entity_schema', entity_schema)
        .eq('entity_table', entityTable)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const versions = data || [];
      setAllVersions(versions);
      setDraftVersions(versions.filter(v => v.status === 'draft'));
      setPendingVersions(versions.filter(v => v.status === 'pending'));
    } catch (error: any) {
      console.error('Error fetching entity versions:', error.message);
      message.error(`Failed to load versions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [entity_schema, entityTable]);

  // Also fetch pending versions globally (for logical variants from any entity)
  const fetchPendingLogicalVariants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('entity_versions')
        .select('*')
        .eq('status', 'pending')
        .not('base_source_name', 'is', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Filter to show only variants based on current entity if in variant tab
        const relevantVariants = data.filter(v => 
          v.base_source_name === `${entity_schema}.${entity_type}`
        );
        if (relevantVariants.length > 0) {
          setPendingVersions(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = relevantVariants.filter(v => !existingIds.has(v.id));
            return [...prev, ...newItems];
          });
        }
      }
    } catch (err) {
      console.error('Error fetching pending variants:', err);
    }
  }, [entity_schema, entity_type]);

  /**
   * Publishes a draft version (metadata update).
   */
  const handlePublish = async (versionId: string) => {
    setPublishing(true);
    try {
      const { error } = await supabase
        .schema('core')
        .rpc('met_publish_schema_version', { p_version_id: versionId });

      if (error) throw error;

      message.success('Version published successfully!');
      await fetchAllVersions();
    } catch (error: any) {
      console.error('Error publishing version:', error.message);
      message.error(`Publish failed: ${error.message}`);
    } finally {
      setPublishing(false);
    }
  };

  /**
   * Approves a pending logical variant version.
   */
  const handleApprove = async (versionId: string) => {
    setApproving(true);
    try {
      const { error } = await supabase
        .schema('core')
        .rpc('approve_entity_version', { p_version_id: versionId });

      if (error) throw error;

      message.success('Logical variant approved and published!');
      await fetchAllVersions();
    } catch (error: any) {
      console.error('Error approving version:', error.message);
      message.error(`Approval failed: ${error.message}`);
    } finally {
      setApproving(false);
    }
  };

  /**
   * Opens the rejection modal for a pending version.
   */
  const openRejectModal = (versionId: string) => {
    setRejectingVersionId(versionId);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  /**
   * Rejects a pending logical variant version.
   */
  const handleReject = async () => {
    if (!rejectingVersionId) return;
    
    try {
      const { error } = await supabase
        .schema('core')
        .from('entity_versions')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason || 'Rejected by administrator',
        })
        .eq('id', rejectingVersionId);

      if (error) throw error;

      message.success('Version rejected');
      setRejectModalVisible(false);
      setRejectingVersionId(null);
      setRejectionReason('');
      await fetchAllVersions();
    } catch (error: any) {
      console.error('Error rejecting version:', error.message);
      message.error(`Rejection failed: ${error.message}`);
    }
  };

  /**
   * Opens detail view for a version.
   */
  const handleViewDetail = (record: any) => {
    setSelectedVersion(record);
    setDetailModalVisible(true);
  };

  /**
   * Optimizes the dynamic view.
   */
  const handleOptimizeView = async () => {
    if (optimizing) return;
    setOptimizing(true);
    try {
      const { error } = await supabase
        .schema('core')
        .rpc('met_provision_entity', {
          p_schema_name: entity_schema,
          p_table_name: entity_type,
          p_dry_run: false,
        });

      if (error) throw error;

      message.success(`View optimized for ${entity_schema}.${entity_type}!`);
    } catch (error: any) {
      console.error('Error optimizing view:', error.message);
      message.error(`Optimization failed: ${error.message}`);
    } finally {
      setOptimizing(false);
    }
  };

  // Status tag renderer
  const renderStatusTag = (status: EntityVersionStatus) => {
    const statusConfig: Record<EntityVersionStatus, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'blue', icon: <ClockCircleOutlined /> },
      pending: { color: 'orange', icon: <ExclamationCircleOutlined /> },
      approved: { color: 'green', icon: <CheckCircleOutlined /> },
      rejected: { color: 'red', icon: <CloseCircleOutlined /> },
    };
    const config = statusConfig[status] || { color: 'default', icon: null };
    return (
      <Tag icon={config.icon} color={config.color}>
        {status.toUpperCase()}
      </Tag>
    );
  };

  // Column definitions for draft versions table
  const draftColumns = [
    {
      title: 'Version',
      dataIndex: 'version_number',
      key: 'version_number',
      sorter: (a: any, b: any) => (a.version_number || 0) - (b.version_number || 0),
      render: (text: any) => <Text strong>v{text || 'N/A'}</Text>,
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag,
      width: 120,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)}>
            View
          </Button>
          <Popconfirm
            title="Are you sure you want to publish this version?"
            onConfirm={() => handlePublish(record.id)}
            okText="Yes, Publish"
            cancelText="No"
            disabled={publishing || record.status !== 'draft'}
          >
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="small"
              loading={publishing}
              disabled={record.status !== 'draft'}
            >
              Publish
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Column definitions for pending approvals table
  const pendingColumns = [
    {
      title: 'Entity Name',
      dataIndex: 'entity_type',
      key: 'entity_type',
      render: (text: string, record: any) => (
        <Space>
          <BranchesOutlined style={{ color: '#722ed1' }} />
          <Text strong>{text}</Text>
          {record.base_source_name && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              (from {record.base_source_name})
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag,
      width: 120,
    },
    {
      title: 'Partition Filter',
      key: 'partition_filter',
      render: (_: any, record: any) => {
        const filter = record.rules?.logic?.partition_filter;
        return filter ? (
          <Tag color="blue" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {filter}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
      width: 160,
    },
    {
      title: 'Action',
      key: 'action',
      width: 220,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)}>
            View
          </Button>
          <Popconfirm
            title="Approve this logical variant? This will create the entity and view."
            onConfirm={() => handleApprove(record.id)}
            okText="Yes, Approve"
            cancelText="No"
            disabled={approving || record.status !== 'pending'}
          >
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="small"
              loading={approving}
              disabled={record.status !== 'pending'}
            >
              Approve
            </Button>
          </Popconfirm>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            size="small"
            onClick={() => openRejectModal(record.id)}
            disabled={record.status !== 'pending'}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  // Column definitions for history table
  const historyColumns = [
    {
      title: 'Entity',
      dataIndex: 'entity_type',
      key: 'entity_type',
      render: (text: string) => <Text>{text}</Text>,
    },
    {
      title: 'Version',
      dataIndex: 'version_number',
      key: 'version_number',
      render: (text: any) => text ? <Text>v{text}</Text> : '-',
      width: 80,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag,
      width: 120,
    },
    {
      title: 'Type',
      key: 'type',
      render: (_: any, record: any) => (
        record.base_source_name ? (
          <Tag color="purple">Variant</Tag>
        ) : (
          <Tag color="green">Metadata</Tag>
        )
      ),
      width: 100,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <> 
      <Button 
        type="default"
        icon={<SettingOutlined />} 
        onClick={showDrawer}
      >
        Review & Optimize
        {pendingVersions.length > 0 && (
          <Badge count={pendingVersions.length} style={{ marginLeft: 8 }} />
        )}
      </Button>

      <Drawer
        title={
          <Title level={4} style={{ marginBottom: 0 }}>
            Version Manager: <Text code>{entity_schema}.{entity_type}</Text>
          </Title>
        }
        placement="right"
        closable={true}
        onClose={onClose}
        open={drawerVisible}
        width={850}
      >
        <div style={{ padding: '0px' }}>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="default"
              icon={<ThunderboltOutlined />}
              onClick={handleOptimizeView}
              loading={optimizing}
            >
              Optimize Dynamic View
            </Button>
          </Space>

          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
              {
                key: 'drafts',
                label: (
                  <span>
                    Draft Versions
                    {draftVersions.length > 0 && (
                      <Badge count={draftVersions.length} style={{ marginLeft: 8 }} />
                    )}
                  </span>
                ),
                children: (
                  <>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                      Metadata changes saved as drafts. Publish to apply changes.
                    </Text>
                    <Table
                      columns={draftColumns}
                      dataSource={draftVersions}
                      rowKey="id"
                      loading={loading}
                      pagination={{ pageSize: 5 }}
                      size="small"
                    />
                  </>
                ),
              },
              {
                key: 'pending',
                label: (
                  <span>
                    Pending Approval
                    {pendingVersions.length > 0 && (
                      <Badge count={pendingVersions.length} style={{ marginLeft: 8 }} color="orange" />
                    )}
                  </span>
                ),
                children: (
                  <>
                    <Alert
                      message="Logical Variant Approvals"
                      description="These are new logical entities derived from base tables. Approving will create the entity and its partitioned view."
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Table
                      columns={pendingColumns}
                      dataSource={pendingVersions}
                      rowKey="id"
                      loading={loading}
                      pagination={{ pageSize: 5 }}
                      size="small"
                    />
                  </>
                ),
              },
              {
                key: 'history',
                label: 'All History',
                children: (
                  <>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                      Complete version history including approved and rejected items.
                    </Text>
                    <Table
                      columns={historyColumns}
                      dataSource={allVersions}
                      rowKey="id"
                      loading={loading}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </>
                ),
              },
            ]}
          />
        </div>
      </Drawer>

      {/* Rejection Reason Modal */}
      <Modal
        title="Reject Version"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectingVersionId(null);
          setRejectionReason('');
        }}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <Text>Please provide a reason for rejection (optional):</Text>
        <TextArea
          rows={4}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Enter rejection reason..."
          style={{ marginTop: 12 }}
        />
      </Modal>

      {/* Version Detail Modal */}
      <Modal
        title="Version Details"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedVersion(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedVersion && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Entity Name">{selectedVersion.entity_type}</Descriptions.Item>
              <Descriptions.Item label="Schema">{selectedVersion.entity_schema}</Descriptions.Item>
              <Descriptions.Item label="Status">{renderStatusTag(selectedVersion.status)}</Descriptions.Item>
              <Descriptions.Item label="Version">{selectedVersion.version_number || 'N/A'}</Descriptions.Item>
              {selectedVersion.base_source_name && (
                <Descriptions.Item label="Base Table" span={2}>
                  <Tag color="blue">{selectedVersion.base_source_name}</Tag>
                </Descriptions.Item>
              )}
              {selectedVersion.rules?.logic?.partition_filter && (
                <Descriptions.Item label="Partition Filter" span={2}>
                  <Tag color="geekblue">{selectedVersion.rules.logic.partition_filter}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Created At">
                {new Date(selectedVersion.created_at).toLocaleString()}
              </Descriptions.Item>
              {selectedVersion.approved_at && (
                <Descriptions.Item label="Approved At">
                  {new Date(selectedVersion.approved_at).toLocaleString()}
                </Descriptions.Item>
              )}
              {selectedVersion.rejection_reason && (
                <Descriptions.Item label="Rejection Reason" span={2}>
                  <Text type="danger">{selectedVersion.rejection_reason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
            
            {selectedVersion.metadata && selectedVersion.metadata.length > 0 && (
              <>
                <Divider>Metadata Fields ({selectedVersion.metadata.length})</Divider>
                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                  <Space wrap>
                    {selectedVersion.metadata.map((field: any, idx: number) => (
                      <Tag key={idx}>{field.key} ({field.type})</Tag>
                    ))}
                  </Space>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default EntityVersionManager;
