import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Row, Col, Select, Statistic, message, Drawer, Button, Typography, Space } from 'antd';
import { DashboardOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { snakeToTitleCase } from '@/core/components/common/utils/casing';
import dayjs from 'dayjs';

interface MetricsViewProps {
  entityType: string;
  entitySchema: string;
  viewConfig: any;
}

const MetricsView: React.FC<MetricsViewProps> = ({ entitySchema, entityType, viewConfig }) => {
  const { organization, location, user } = useAuthStore();
  const queryClient = useQueryClient();

  const fullEntityTableName = `${entitySchema}.${entityType}`;

  // Step 1: Fetch the metrics configuration from the core.metrics table
  const { data: metricsConfigData, isLoading: isMetricsConfigLoading } = useQuery({
    queryKey: ['metricsConfig', fullEntityTableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('core').from('metrics')
        .select('metrics_config:metrics->metrics_config')
        .eq('entity_type', fullEntityTableName)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means "No row found"
        console.error("Error fetching metrics config:", error);
        return null;
      }
      return data ? data.metrics_config : null;
    },
    enabled: !!fullEntityTableName,
  });
  // console.log("hh",metricsConfigData);
  const metricsViewConfig = metricsConfigData;

  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedGroupBy, setSelectedGroupBy] = useState<string[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);

  useEffect(() => {
    // Reset state when metrics config changes
    if (metricsViewConfig) {
      setSelectedMetric(metricsViewConfig?.measures?.[0]?.metric_key || null);
      setSelectedGroupBy([]);
    }
    setForceRefresh(false);
  }, [fullEntityTableName, metricsViewConfig]);

  // Filter groupByOptions based on presence of organization.id and location.id
  const filteredGroupByOptions = useMemo(() => {
    let options = metricsViewConfig?.supported_group_by || [];

    if (organization?.id) {
      options = options.filter((col: string) => col !== 'organization_id');
    }
    if (location?.id) {
      options = options.filter((col: string) => col !== 'location_id');
    }

    return options.map((groupBy: string) => {
      const metadata = viewConfig?.metadata?.find((m: any) => m.key === groupBy);
      return {
        value: groupBy,
        label: metadata?.display_name || snakeToTitleCase(groupBy),
      };
    });
  }, [metricsViewConfig?.supported_group_by, viewConfig?.metadata, organization?.id, location?.id]);

  const getGroupByColumns = () => {
    if (selectedGroupBy.length > 0) {
      return selectedGroupBy.join(',');
    }
    return null;
  };

  const { data: metricData, isLoading: isMetricLoading } = useQuery({
    queryKey: ['metricData', fullEntityTableName, selectedMetric, selectedGroupBy, forceRefresh, location?.id, organization?.id],
    queryFn: async () => {
      if (!selectedMetric || !organization?.id || !entitySchema || !entityType) return [];

      const { data, error } = await supabase.rpc('core_calculate_entity_metricv9', {
        p_entity_table_name: fullEntityTableName,
        p_organization_id: organization?.id,
        p_location_id: location?.id,
        p_metric_key: selectedMetric,
        p_filter_condition: null,
        p_group_by_columns: getGroupByColumns(),
        p_filters_hash: null,
        p_force_refresh: forceRefresh,
      });

      if (error) {
        message.error(`Error fetching metric data: ${error.message}`);
        throw error;
      }

      if (forceRefresh) {
        setForceRefresh(false);
      }

      return data || [];
    },
    enabled: !!selectedMetric && !!metricsViewConfig?.measures?.length && !!entitySchema && !!entityType && (!!location?.id || !!organization?.id),
    staleTime: 5000,
    cacheTime: 10 * 60 * 1000,
  });

  const lastUpdated = metricData?.[0]?.last_calculated_at
    ? dayjs(metricData[0].last_calculated_at).format('YYYY-MM-DD HH:mm:ss')
    : 'N/A';

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const onClose = () => {
    setDrawerVisible(false);
  };

  const handleRefreshClick = () => {
    setForceRefresh(true);
  };

  // Step 3: Conditionally render the button based on metricsConfigData
  if (isMetricsConfigLoading) {
    return null; // Or a loading spinner if preferred
  }

  if (!metricsViewConfig || Object.keys(metricsViewConfig).length === 0) {
    return null;
  }

  return (
    <>
      <Button
        type="primary"
        icon={<DashboardOutlined />}
        onClick={showDrawer}
      />

      <Drawer
        title="Metrics"
        placement="right"
        onClose={onClose}
        open={drawerVisible}
        width={"50%"}
      >
        <div className="space-y-4">
          {metricsViewConfig?.measures?.length > 0 && (
            <div className="flex flex-wrap gap-4 items-center">
              <Select
                style={{ width: 300 }}
                value={selectedMetric}
                onChange={(value) => setSelectedMetric(value)}
                placeholder="Select a metric"
                loading={isMetricLoading}
              >
                {metricsViewConfig?.measures?.map((metric: any) => (
                  <Select.Option key={metric.metric_key} value={metric.metric_key}>
                    {metric.display_name}
                  </Select.Option>
                ))}
              </Select>
              <Select
                mode="multiple"
                style={{ width: 300 }}
                value={selectedGroupBy}
                onChange={(values) => setSelectedGroupBy(values)}
                placeholder="Select group by options"
                options={filteredGroupByOptions}
                allowClear
              />
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefreshClick}
                  loading={isMetricLoading && forceRefresh}
                  tooltip="Force Refresh Metrics"
                >
                  Refresh
                </Button>
                <Typography.Text type="secondary" style={{ fontSize: '0.8em' }}>
                  Last Updated: {lastUpdated}
                </Typography.Text>
              </Space>
            </div>
          )}

          {selectedMetric && (
            <Row gutter={[16, 16]}>
              {isMetricLoading && !forceRefresh ? (
                <Col span={24}>
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                  </div>
                </Col>
              ) : (
                metricData?.map((item: any, index: number) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={index}>
                    <Card
                      variant="outlined"
                      className="shadow-md hover:shadow-lg transition-shadow duration-200"
                      style={{
                        background: 'var(--color-background)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <Statistic
                        title={
                          <div className="text-lg font-semibold text-[var(--color-text)]">
                            {
                              selectedGroupBy.length > 0 &&
                              selectedGroupBy.map((col) => (
                                <span key={col} className="mr-2">
                                  {item[`display_${col}`] || item[col]}
                                </span>
                              ))
                            }
                            {selectedGroupBy.length === 0 &&
                              metricsViewConfig?.measures?.find(
                                (m: any) => m.metric_key === selectedMetric
                              )?.display_name
                            }
                          </div>
                        }
                        value={item.metric_value}
                        valueStyle={{
                          color: 'var(--color-primary)',
                          fontSize: '24px',
                          fontWeight: 'bold',
                        }}
                      />
                      {typeof item.excluded !== 'undefined' && item.excluded > 0 && (
                        <div className="mt-2 text-sm text-red-500">
                          ({item.excluded} excluded)
                        </div>
                      )}
                    </Card>
                  </Col>
                ))
              )}
              {!isMetricLoading && (!metricData || metricData.length === 0) && (
                <Col span={24} className="text-center text-[var(--color-text-secondary)] py-8">
                  No data available for the selected metric and filters.
                </Col>
              )}
            </Row>
          )}
        </div>
      </Drawer>
    </>
  );
};

export default MetricsView;