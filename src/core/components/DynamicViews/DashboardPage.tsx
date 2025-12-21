import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Select, Spin, Row, Col, Typography, message, Space, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import MetricChartWidget, { MetricWidgetConfig } from './MetricChartWidget'; 
import DashboardEditor from './DashboardEditor'; // Import the editor
import dayjs from 'dayjs';

interface Dashboard {
  id: string;
  name: string;
  entities: string[];
  widgets: MetricWidgetConfig[];
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

const DashboardPage: React.FC = () => {
  const { organization, user } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Use a state toggle to force a refresh in the widgets
  const [refreshKey, setRefreshKey] = useState(0); 

  useEffect(() => {
    const userRoles = user?.roles || [];
    const isAdmin = userRoles.includes('saasadmin') || userRoles.includes('systemadmin');
    setIsEditingMode(isAdmin);
  }, [user?.roles]);

  // Fetch all user dashboards
  const { data: dashboards, isLoading: isLoadingDashboards, refetch: refetchDashboards } = useQuery<Dashboard[]>({
    queryKey: ['userDashboards', user?.id, organization?.id],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return [];
      const { data, error } = await supabase
        .schema('core')
        .from('user_dashboards')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .order('name', { ascending: true });
      if (error) {
        console.error('Error fetching dashboards:', error.message);
        message.error(`Failed to load dashboards: ${error.message}`);
        throw error;
      }
      return data as Dashboard[];
    },
    enabled: !!user?.id && !!organization?.id,
  });

  const selectedDashboard = dashboards?.find(d => d.id === selectedDashboardId);
  const uniqueEntitiesInDashboard = Array.from(new Set(selectedDashboard?.widgets.map(w => `${w.entitySchema}.${w.entityType}`))) || [];

  const { data: viewConfigs, isLoading: isLoadingViewConfigs } = useQuery<Record<string, any>>({
    queryKey: ['dashboardViewConfigs', uniqueEntitiesInDashboard],
    queryFn: async () => {
      const configs: Record<string, any> = {};
      for (const entityFullName of uniqueEntitiesInDashboard) {
        const [schema, type] = entityFullName.split('.');
        if (schema && type) {
          try {
            const { data, error } = await supabase
              .from('y_view_config')
              .select('*')
              .eq('entity_schema', schema)
              .eq('entity_type', type)
              .single();
            if (data) {
              configs[entityFullName] = data;
            } else if (error) {
              console.warn(`No view config found for ${entityFullName}:`, error.message);
            }
          } catch (e) {
            console.error(`Error fetching view config for ${entityFullName}:`, e);
          }
        }
      }
      return configs;
    },
    enabled: !!selectedDashboard && uniqueEntitiesInDashboard.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (dashboards && !selectedDashboardId && dashboards.length > 0) {
      setSelectedDashboardId(dashboards[0].id);
    } else if (dashboards && dashboards.length === 0) {
      setSelectedDashboardId(null);
    }
  }, [dashboards, selectedDashboardId]);

  const handleCreateNew = () => {
    setEditingDashboard(null);
    setIsEditorVisible(true);
  };

  const handleEditDashboard = () => {
    if (selectedDashboard) {
      setEditingDashboard(selectedDashboard);
      setIsEditorVisible(true);
    }
  };

  const handleDeleteDashboard = async () => {
    if (!selectedDashboard || !user?.id) return;
    message.loading('Deleting dashboard...', 0);
    try {
      const { error } = await supabase
        .schema('core')
        .from('user_dashboards')
        .delete()
        .eq('id', selectedDashboard.id)
        .eq('user_id', user.id);
      if (error) throw error;
      message.destroy();
      message.success('Dashboard deleted successfully!');
      setSelectedDashboardId(null);
      refetchDashboards();
    } catch (error: any) {
      message.destroy();
      message.error(`Error deleting dashboard: ${error.message}`);
      console.error('Delete dashboard error:', error);
    }
  };

  const handleEditorClose = (saved: boolean) => {
    setIsEditorVisible(false);
    setEditingDashboard(null);
    if (saved) {
      refetchDashboards();
    }
  };

  const handleForceRefreshAllWidgets = useCallback(() => {
    // Increment the key to force a refresh on all widgets
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  if (isLoadingDashboards) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Loading dashboards..." />
      </div>
    );
  }

  const lastUpdated = selectedDashboard?.updated_at
    ? dayjs(selectedDashboard.updated_at).format('YYYY-MM-DD HH:mm:ss')
    : 'N/A';

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Space>
          <Typography.Title level={3} style={{ margin: 0 }}>My Dashboards</Typography.Title>
          <Select
            style={{ width: 300 }}
            placeholder="Select a Dashboard"
            value={selectedDashboardId}
            onChange={setSelectedDashboardId}
            loading={isLoadingDashboards}
            options={dashboards?.map(d => ({ value: d.id, label: d.name })) || []}
          />
          {selectedDashboardId && (
            <>
              {isEditingMode && (
                <>
                  <Button icon={<EditOutlined />} onClick={handleEditDashboard}>Edit</Button>
                  <Popconfirm
                    title="Delete Dashboard"
                    description={`Are you sure you want to delete "${selectedDashboard?.name}"?`}
                    onConfirm={handleDeleteDashboard}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button icon={<DeleteOutlined />} danger>Delete</Button>
                  </Popconfirm>
                </>
              )}
              <Button icon={<ReloadOutlined />} onClick={handleForceRefreshAllWidgets}>Refresh All Widgets</Button>
            </>
          )}
        </Space>
        {isEditingMode && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
            Create New Dashboard
          </Button>
        )}
      </div>
      
      {selectedDashboardId && (
        <Typography.Text type="secondary" style={{ fontSize: '0.8em' }}>
          Last Updated: {lastUpdated}
        </Typography.Text>
      )}

      {isEditorVisible && (
        <DashboardEditor
          dashboard={editingDashboard}
          onClose={handleEditorClose}
        />
      )}

      {!selectedDashboardId && dashboards?.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <Typography.Paragraph>You don't have any dashboards yet.</Typography.Paragraph>
          {isEditingMode && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
              Create Your First Dashboard
            </Button>
          )}
        </div>
      )}

      {selectedDashboard && (
        <div className="dashboard-grid">
          <Row gutter={[16, 16]}>
            {isLoadingViewConfigs ? (
              <Col span={24} className="text-center py-8">
                <Spin size="large" tip="Loading dashboard configurations..." />
              </Col>
            ) : (
              selectedDashboard.widgets.map((widgetConfig) => {
                const entityFullName = `${widgetConfig.entitySchema}.${widgetConfig.entityType}`;
                const widgetViewConfig = viewConfigs?.[entityFullName];
                if (!widgetViewConfig) {
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={widgetConfig.id}>
                      <Card bordered className="shadow-md h-full">
                        <Typography.Text type="danger">
                          Error: View config not found for {entityFullName}
                        </Typography.Text>
                      </Card>
                    </Col>
                  );
                }
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={widgetConfig.id}>
                    <MetricChartWidget
                      widgetConfig={widgetConfig}
                      viewConfig={widgetViewConfig}
                      // Pass the refresh key to force re-fetches
                      forceRefresh={!!refreshKey}
                    />
                  </Col>
                );
              })
            )}
          </Row>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;