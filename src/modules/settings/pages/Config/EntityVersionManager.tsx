import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { Table, Button, Space, message, Popconfirm, Typography, Tag, Drawer } from 'antd';
import { CheckCircleOutlined, ThunderboltOutlined, ClockCircleOutlined, EyeOutlined, SettingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Maps the entity_type prop to the corresponding entity_table for the core.entity_versions table.
 */
const resolveEntityTypeToTable = (entityType: string) => entityType;

interface EntityVersionManagerProps {
  entity_schema: string;
  entity_type: string;
}

/**
 * Component to manage and publish entity versions, including its own trigger button and drawer.
 */
const EntityVersionManager: React.FC<EntityVersionManagerProps> = ({ entity_schema, entity_type }) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const entityTable = resolveEntityTypeToTable(entity_type);

  // --- Drawer Handlers ---
  const showDrawer = () => {
    setDrawerVisible(true);
    // Fetch data immediately when the drawer opens
    fetchDraftVersions();
  };

  const onClose = () => {
    setDrawerVisible(false);
  };
  // -----------------------


  /**
   * Fetches all 'draft' versions for the specified entity.
   */
  const fetchDraftVersions = useCallback(async () => {
    if (!entity_schema || !entityTable) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('entity_versions')
        .select('id, version_number, created_at, status, changed_by_user_id')
        .eq('entity_schema', entity_schema)
        .eq('entity_table', entityTable)
        .eq('status', 'draft')
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      console.error('Error fetching entity versions:', error.message);
      message.error(`Failed to load versions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [entity_schema, entityTable]);


  /**
   * Calls the PostgreSQL function to publish a specific version.
   * @param {string} versionId - The ID of the version to publish.
   */
  const handlePublish = async (versionId: string) => {
    setPublishing(true);
    try {
      // Call the core.met_publish_schema_version function
      const { error } = await supabase
        .schema('core')
        .rpc('met_publish_schema_version', { p_version_id: versionId });

      if (error) throw error;

      message.success(`Version v${versions.find(v => v.id === versionId)?.version_number || 'ID'} published successfully!`);
      // Re-fetch the draft versions
      await fetchDraftVersions();
    } catch (error: any) {
      console.error('Error publishing version:', error.message);
      message.error(`Publish failed: ${error.message}`);
    } finally {
      setPublishing(false);
    }
  };

  /**
   * Calls the PostgreSQL function to optimize the dynamic view.
   */
  const handleOptimizeView = async () => {
    if (optimizing) return;
    setOptimizing(true);
    try {
      // Call the core.met_provision_entity function
      const { error } = await supabase
        .schema('core')
        .rpc('met_provision_entity', {
          p_entity_schema: entity_schema,
          p_entity_type: entity_type,
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

  const columns = [
    {
      title: 'Version',
      dataIndex: 'version_number',
      key: 'version_number',
      sorter: (a: any, b: any) => a.version_number - b.version_number,
      render: (text: any) => <Text strong>v{text}</Text>,
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag icon={status === 'draft' ? <ClockCircleOutlined /> : null} color="blue">
          {status.toUpperCase()}
        </Tag>
      ),
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
          <Button icon={<EyeOutlined />} size="small" disabled>
            View Data
          </Button>
          <Popconfirm
            title="Are you sure you want to publish this version? This action is irreversible."
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

  return (
    <> 
      <Button 
        type="default"
        icon={<SettingOutlined />} 
        onClick={showDrawer}
      >
        Review & Optimize
      </Button>

      <Drawer
        title={<Title level={4} style={{ marginBottom: 0 }}>Version Manager: <Text code>{entity_schema}.{entity_type}</Text></Title>}
        placement="right"
        closable={true}
        onClose={onClose}
        open={drawerVisible}
        width={720}
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

          <Title level={5}>Draft Versions</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
            Below are versions with **'draft'** status for entity **{entityTable}**.
          </Text>
          <Table
            columns={columns}
            dataSource={versions}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </div>
      </Drawer>
    </>
  );
};

export default EntityVersionManager;
