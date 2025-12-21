import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Row, Col, Select, message, Button, Typography, Space, Spin, Modal, Input } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { snakeToTitleCase } from '@/core/components/common/utils/casing';
import dayjs from 'dayjs';

import MetricChartWidget, { MetricWidgetConfig } from './MetricChartWidget';

interface DashboardViewProps {
  entityType: string;
  entitySchema: string;
  viewConfig: any; // The y_view_config for the entity
}

const CHART_TYPE_OPTIONS = [
  { value: 'statistic', label: 'Statistic' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'scatter', label: 'Scatter Plot' },
  { value: 'area', label: 'Area Chart' },
  { value: 'gauge', label: 'Gauge Chart' },
  { value: 'funnel', label: 'Funnel Chart' },
];

const DashboardView: React.FC<DashboardViewProps> = ({ entitySchema, entityType, viewConfig }) => {
  const { organization, user, location } = useAuthStore();
  const queryClient = useQueryClient();

  const [forceRefreshAllWidgets, setForceRefreshAllWidgets] = useState(false);
  const [widgetConfigs, setWidgetConfigs] = useState<MetricWidgetConfig[] | undefined>(undefined);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState<string>('');
  const [isEditingMode, setIsEditingMode] = useState(true);

  const fullEntityTableName = `${entitySchema}.${entityType}`;

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id || !organization?.id || !entitySchema || !entityType || !viewConfig?.metricsview?.stages_config?.measures) {
        setWidgetConfigs([]);
        setDashboardId(null);
        setDashboardName('');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('core_get_user_dashboard_v2', {
          p_user_id: user.id,
          p_organization_id: organization.id,
          p_entity_full_name: fullEntityTableName,
        });

        if (error) {
          console.error('Error loading user dashboard:', error.message);
          initializeDefaultWidgets();
          return;
        }

        if (data && data.length > 0) {
          const loadedDashboard = data[0];
          setDashboardId(loadedDashboard.id);
          setDashboardName(loadedDashboard.name);
          setWidgetConfigs(loadedDashboard.widgets || []);
          // message.success(`Loaded dashboard: "${loadedDashboard.name}"`);
        } else {
          initializeDefaultWidgets();
        }
      } catch (error: any) {
        console.error('Unexpected error loading dashboard:', error);
        initializeDefaultWidgets();
      }
    };

    const initializeDefaultWidgets = () => {
      const initialWidgets: MetricWidgetConfig[] = viewConfig?.metricsview?.stages_config?.measures?.map((measure: any) => {
        const defaultChartType: MetricWidgetConfig['chartType'] =
          (viewConfig.metricsview.supported_group_by?.length > 0 && measure.type !== 'calculated_field') ? 'bar' : 'statistic';
        return {
          id: `${measure.metric_key}-${entityType}-${dayjs().format('x')}`,
          entitySchema: entitySchema,
          entityType: entityType,
          metricKey: measure.metric_key,
          groupByColumns: [],
          chartType: defaultChartType,
          title: measure.display_name,
        };
      });
      setWidgetConfigs(initialWidgets);
      setDashboardId(null);
      setDashboardName('');
      message.info('No saved dashboard found. Displaying default metrics.');
    };

    loadDashboard();
    setForceRefreshAllWidgets(false);
  }, [entitySchema, entityType, viewConfig, user?.id, organization?.id, fullEntityTableName]);


  const handleRefreshAllWidgets = useCallback(() => {
    setForceRefreshAllWidgets(true);
    queryClient.invalidateQueries({ queryKey: ['metricWidgetData'] });
    setTimeout(() => setForceRefreshAllWidgets(false), 500);
  }, [queryClient]);


  const handleChartTypeChange = useCallback((widgetId: string, newChartType: MetricWidgetConfig['chartType']) => {
    setWidgetConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.id === widgetId ? { ...config, chartType: newChartType } : config
      )
    );
  }, []);

  const handleGroupByChange = useCallback((widgetId: string, newGroupBy: string[]) => {
    setWidgetConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.id === widgetId ? { ...config, groupByColumns: newGroupBy } : config
      )
    );
  }, []);

  const handleSaveDashboard = async () => {
    if (!user?.id || !organization?.id) {
      message.error('User or organization not found.');
      return;
    }

    let currentDashboardName = dashboardName;
    if (!currentDashboardName) {
      let tempName = '';
      await new Promise<void>((resolve) => {
        Modal.confirm({
          title: 'Enter Dashboard Name',
          content: <Input placeholder="e.g., My Entity Overview" onChange={(e) => tempName = e.target.value} />,
          okText: 'Save',
          cancelText: 'Cancel',
          onOk: () => {
            currentDashboardName = tempName;
            setDashboardName(currentDashboardName);
            resolve();
          },
          onCancel: () => {
            resolve();
          },
        });
      });
    }

    if (!currentDashboardName) {
      message.info('Dashboard save cancelled.');
      return;
    }

    const widgetsToSave = widgetConfigs || [];

    message.loading('Saving dashboard...', 0);
    try {
      const { data, error } = await supabase.rpc('core_save_user_dashboard_v2', {
        p_user_id: user.id,
        p_organization_id: organization.id,
        p_name: currentDashboardName,
        p_entities: [fullEntityTableName],
        p_widgets: widgetsToSave,
        p_dashboard_id: dashboardId,
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      message.destroy();
      message.success(`Dashboard "${currentDashboardName}" saved successfully!`);

      if (!dashboardId && data && data.length > 0) {
        setDashboardId(data[0].id);
      }

    } catch (error: any) {
      message.destroy();
      message.error(`Failed to save dashboard: ${error.message}`);
      console.error('Save dashboard error:', error);
    }
  };

  const isAnyWidgetLoading = widgetConfigs?.some(config => {
    const queryState = queryClient.getQueryState(['metricWidgetData', config.id, `${config.entitySchema}.${config.entityType}`, config.metricKey, config.groupByColumns?.join(',') || '', config.filterCondition || null, forceRefreshAllWidgets, organization?.id, location?.id]);
    return queryState?.status === 'pending';
  }) || false;

  // FIX: Corrected typo from 'widgets' to 'widgetConfigs'
  const firstWidgetData = widgetConfigs?.length > 0 ? queryClient.getQueryData<any[]>(['metricWidgetData', widgetConfigs[0].id, `${widgetConfigs[0].entitySchema}.${widgetConfigs[0].entityType}`, widgetConfigs[0].metricKey, widgetConfigs[0].groupByColumns?.join(',') || '', widgetConfigs[0].filterCondition || null, false, organization?.id, location?.id]) : null;

  const lastUpdated = firstWidgetData?.[0]?.last_calculated_at
    ? dayjs(firstWidgetData[0].last_calculated_at).format('YYYY-MM-DD HH:mm:ss')
    : 'N/A';

  const groupByOptions = viewConfig?.metricsview?.stages_config?.supported_group_by?.map((groupBy: string) => {
    const metadata = viewConfig?.metadata?.find((m: any) => m.key === groupBy);
    return {
      value: groupBy,
      label: metadata?.display_name || snakeToTitleCase(groupBy),
    };
  }) || [];

  return (
    <div className="space-y-4">
      <Space className="w-full justify-between items-center">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {dashboardName || `Dashboard for ${snakeToTitleCase(entityType)}`}
        </Typography.Title>
        <Space>
          {isEditingMode && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveDashboard}
              loading={isAnyWidgetLoading}
            >
              Save Dashboard
            </Button>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshAllWidgets}
            loading={isAnyWidgetLoading && forceRefreshAllWidgets}
            tooltip="Force Refresh All Metrics"
          >
            Refresh All
          </Button>
          <Typography.Text type="secondary" style={{ fontSize: '0.8em' }}>
            Last Updated: {lastUpdated}
          </Typography.Text>
        </Space>
      </Space>

      {widgetConfigs === undefined ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : widgetConfigs.length === 0 ? (
        <div className="text-center text-[var(--color-text-secondary)] py-8">
          No metrics defined for this entity in viewConfig.
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {widgetConfigs.map((widgetConfig) => (
            <Col xs={24} sm={12} lg={8} key={widgetConfig.id}>
              <Card
                variant="outlined"
                className="shadow-md transition-shadow duration-200 h-full flex flex-col"
                title={
                  <Space className="w-full justify-between">
                    <Typography.Text strong>{widgetConfig.title}</Typography.Text>
                    {isEditingMode && (
                      <Space>
                        <Select
                          value={widgetConfig.chartType}
                          onChange={(value) => handleChartTypeChange(widgetConfig.id, value)}
                          options={CHART_TYPE_OPTIONS}
                          size="small"
                          style={{ width: 100 }}
                          disabled={!isEditingMode}
                        />
                        {groupByOptions.length > 0 && (
                          <Select
                            mode="multiple"
                            placeholder="Group By"
                            value={widgetConfig.groupByColumns}
                            onChange={(values) => handleGroupByChange(widgetConfig.id, values)}
                            options={groupByOptions}
                            size="small"
                            style={{ width: 120 }}
                            allowClear
                            disabled={!isEditingMode}
                          />
                        )}
                      </Space>
                    )}
                  </Space>
                }
                styles={{ body: { flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px' } }}
              >
                <MetricChartWidget
                  widgetConfig={widgetConfig}
                  viewConfig={viewConfig}
                  forceRefresh={forceRefreshAllWidgets}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default DashboardView;