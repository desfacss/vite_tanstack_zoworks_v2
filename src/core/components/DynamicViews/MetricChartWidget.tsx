// import React, { useState, useEffect, useRef } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import { Card, Col, Select, Statistic, message, Spin, Typography } from 'antd';
// import Plotly from 'plotly.js-dist-min';
// import { supabase } from '@/lib/supabase';
// import { useAuthStore } from '@/core/lib/store';
// import { snakeToTitleCase } from '@/components/common/utils/casing';
// import dayjs from 'dayjs';

// // Define types for widget configuration
// export interface MetricWidgetConfig {
//   id: string; // Unique ID for the widget
//   entitySchema: string;
//   entityType: string;
//   metricKey: string;
//   groupByColumns?: string[]; // Array of strings for group by
//   // Expanded Supported chart types
//   chartType: 'statistic' | 'bar' | 'pie' | 'line' | 'scatter' | 'area' | 'gauge' | 'funnel';
//   filterCondition?: string; // Optional filter condition for this specific widget
//   title?: string; // Custom title for the widget
// }

// interface MetricChartWidgetProps {
//   widgetConfig: MetricWidgetConfig;
//   viewConfig: any; // The y_view_config for the widget's entityType
//   forceRefresh?: boolean; // Prop to trigger a force refresh for this specific widget
// }

// const MetricChartWidget: React.FC<MetricChartWidgetProps> = ({ widgetConfig, viewConfig, forceRefresh = false }) => {
//   const { organization, location } = useAuthStore();
//   const plotRef = useRef<HTMLDivElement>(null); // Ref for the Plotly div

//   const {
//     id: widgetId,
//     entitySchema,
//     entityType,
//     metricKey,
//     groupByColumns = [],
//     chartType,
//     filterCondition,
//     title: customTitle,
//   } = widgetConfig;

//   // Find the metric definition from viewConfig
//   const metricDefinition = viewConfig?.metricsview?.measures?.find(
//     (m: any) => m.metric_key === metricKey
//   );

//   const fullEntityTableName = `${entitySchema}.${entityType}`;
//   const groupByString = groupByColumns.join(',');

//   const { data: metricData, isLoading: isMetricLoading, error: metricError } = useQuery({
//     queryKey: ['metricWidgetData', widgetId, fullEntityTableName, metricKey, groupByString, filterCondition, forceRefresh, location?.id, organization?.id],
//     queryFn: async () => {
//       if (!metricDefinition || !organization?.id || !entitySchema || !entityType) return [];

//       const { data, error } = await supabase.rpc('core_calculate_entity_metricv9', {
//         p_entity_table_name: fullEntityTableName,
//         p_organization_id: organization.id,
//         p_location_id: location.id,
//         p_metric_key: metricKey,
//         p_filter_condition: filterCondition || null,
//         p_group_by_columns: groupByString || null,
//         p_filters_hash: null, // Let backend generate hash if not provided
//         p_force_refresh: forceRefresh,
//       });

//       if (error) {
//         console.error(`Error fetching metric data for widget ${widgetId}:`, error);
//         message.error(`Error fetching data for ${metricDefinition?.display_name}: ${error.message}`);
//         throw error;
//       }

//       return data || [];
//     },
//     enabled: !!metricDefinition && !!organization?.id && !!entitySchema && !!entityType,
//     staleTime: 5000, // 5 seconds
//     cacheTime: 10 * 60 * 1000, // 10 minutes
//   });

//   const lastUpdated = metricData?.[0]?.last_calculated_at
//     ? dayjs(metricData[0].last_calculated_at).format('YYYY-MM-DD HH:mm:ss')
//     : 'N/A';

//   const getDisplayValue = (item: any, key: string) => {
//     const metadata = viewConfig?.metadata?.find((m: any) => m.key === key);
//     return item[`display_${key}`] || item[key] || 'N/A';
//   };

//   // Effect to render Plotly chart
//   useEffect(() => {
//     if (plotRef.current && !isMetricLoading && !metricError && metricData && metricData.length > 0) {
//       if (chartType !== 'statistic' && (groupByColumns.length > 0 || chartType === 'gauge')) {
//         const metricDisplayName = metricDefinition?.display_name || snakeToTitleCase(metricKey);
//         const widgetTitle = customTitle || metricDisplayName;

//         const labels = metricData.map((item: any) =>
//           groupByColumns.map(col => getDisplayValue(item, col)).join(' - ')
//         );
//         const values = metricData.map((item: any) => item.metric_value);

//         let plotData: Plotly.Data[] = [];
//         let plotLayout: Partial<Plotly.Layout> = {
//           title: widgetTitle,
//           height: 300,
//           margin: { l: 50, r: 50, b: 80, t: 50, pad: 4 },
//           hovermode: 'closest',
//           font: { family: 'Inter, sans-serif' },
//           paper_bgcolor: 'transparent',
//           plot_bgcolor: 'transparent',
//           xaxis: { automargin: true, tickangle: -45, title: groupByColumns.map(snakeToTitleCase).join(' - ') },
//           yaxis: { automargin: true, title: metricDisplayName },
//         };

//         switch (chartType) {
//           case 'bar':
//             plotData = [{
//               x: labels,
//               y: values,
//               type: 'bar',
//               marker: { color: 'var(--color-primary)' },
//               hovertemplate: `<b>%{x}</b><br>${metricDisplayName}: %{y}<extra></extra>`,
//             }];
//             break;
//           case 'pie':
//             plotData = [{
//               labels: labels,
//               values: values,
//               type: 'pie',
//               hoverinfo: 'label+percent+value',
//               textinfo: 'percent',
//               automargin: true,
//               marker: {
//                 colors: [
//                   '#1890ff', '#2fc25b', '#facc14', '#eb2f96', '#722ed1', '#fa8c16', '#a0d911', '#597ef7', '#f759ab', '#9254de'
//                 ]
//               }
//             }];
//             plotLayout = {
//               title: widgetTitle,
//               height: 300,
//               margin: { l: 0, r: 0, b: 0, t: 50, pad: 0 },
//               font: { family: 'Inter, sans-serif' },
//               paper_bgcolor: 'transparent',
//               plot_bgcolor: 'transparent',
//               showlegend: true,
//               legend: { orientation: 'h', x: 0, y: -0.2 },
//             };
//             break;
//           case 'line':
//           case 'scatter': // Treat scatter similarly to line for now
//             plotData = [{
//               x: labels,
//               y: values,
//               type: 'scatter',
//               mode: chartType === 'line' ? 'lines+markers' : 'markers', // Differentiate line/scatter
//               marker: { color: 'var(--color-primary)' },
//               line: { color: 'var(--color-primary)' },
//               hovertemplate: `<b>%{x}</b><br>${metricDisplayName}: %{y}<extra></extra>`,
//             }];
//             break;
//           case 'area': // Basic area chart
//             plotData = [{
//               x: labels,
//               y: values,
//               type: 'scatter',
//               mode: 'lines',
//               fill: 'tozeroy',
//               marker: { color: 'var(--color-primary)' },
//               line: { color: 'var(--color-primary)' },
//               hovertemplate: `<b>%{x}</b><br>${metricDisplayName}: %{y}<extra></extra>`,
//             }];
//             break;
//           case 'gauge': // Gauge chart (requires a single value, typically no grouping)
//             plotData = [{
//               type: 'indicator',
//               mode: 'gauge+number',
//               value: values[0] || 0, // Use the first value for gauge
//               title: { text: metricDisplayName },
//               gauge: {
//                 axis: { range: [null, values[0] * 2 || 100] }, // Dynamic range, adjust as needed
//                 bar: { color: 'var(--color-primary)' },
//                 bgcolor: 'transparent',
//                 borderwidth: 0,
//                 steps: [
//                   { range: [0, (values[0] * 0.5) || 50], color: '#d9d9d9' },
//                   { range: [(values[0] * 0.5) || 50, (values[0] * 1.5) || 100], color: '#bfbfbf' }
//                 ],
//                 threshold: {
//                   line: { color: "red", width: 4 },
//                   thickness: 0.75,
//                   value: values[0] * 1.2 || 80 // Example threshold
//                 }
//               }
//             }];
//             plotLayout = {
//               title: widgetTitle,
//               height: 300,
//               margin: { l: 20, r: 20, b: 20, t: 50, pad: 4 },
//               font: { family: 'Inter, sans-serif' },
//               paper_bgcolor: 'transparent',
//               plot_bgcolor: 'transparent',
//             };
//             break;
//           case 'funnel': // Funnel chart (requires ordered data)
//             plotData = [{
//               x: values,
//               y: labels,
//               type: 'funnel',
//               marker: {
//                 color: [
//                   '#1890ff', '#2fc25b', '#facc14', '#eb2f96', '#722ed1', '#fa8c16', '#a0d911', '#597ef7', '#f759ab', '#9254de'
//                 ]
//               },
//               hovertemplate: `<b>%{y}</b><br>${metricDisplayName}: %{x}<extra></extra>`,
//             }];
//             plotLayout = {
//               title: widgetTitle,
//               height: 300,
//               margin: { l: 80, r: 50, b: 50, t: 50, pad: 4 },
//               font: { family: 'Inter, sans-serif' },
//               paper_bgcolor: 'transparent',
//               plot_bgcolor: 'transparent',
//             };
//             break;
//           default:
//             // Fallback for unsupported types, though handled by renderContent
//             break;
//         }

//         Plotly.newPlot(plotRef.current, plotData, plotLayout, { displayModeBar: false, responsive: true });

//         // Cleanup function for Plotly
//         return () => {
//           if (plotRef.current) {
//             Plotly.purge(plotRef.current);
//           }
//         };
//       }
//     }
//   }, [metricData, isMetricLoading, metricError, chartType, groupByColumns, metricKey, metricDefinition, customTitle]); // Dependencies

//   const renderContent = () => {
//     if (isMetricLoading) {
//       return (
//         <div className="flex justify-center items-center h-full min-h-[200px]">
//           <Spin size="large" />
//         </div>
//       );
//     }

//     if (metricError) {
//       return (
//         <div className="text-center text-red-500 p-4">
//           Error loading data: {metricError.message}
//         </div>
//       );
//     }

//     if (!metricData || metricData.length === 0) {
//       return (
//         <div className="text-center text-gray-500 p-4">
//           No data available for this metric.
//         </div>
//       );
//     }

//     const metricDisplayName = metricDefinition?.display_name || snakeToTitleCase(metricKey);
//     const widgetTitle = customTitle || metricDisplayName;

//     if (chartType === 'statistic' || groupByColumns.length === 0 || metricData.length === 1) {
//       const value = metricData[0]?.metric_value;
//       const excluded = metricData[0]?.excluded;
//       return (
//         <Statistic
//           title={widgetTitle}
//           value={value !== null && value !== undefined ? value.toLocaleString() : 'N/A'}
//           valueStyle={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold' }}
//           suffix={excluded > 0 ? ` (${excluded} excluded)` : ''}
//         />
//       );
//     }

//     return (
//       <div ref={plotRef} style={{ width: '100%', height: '100%', minHeight: '200px' }}>
//       </div>
//     );
//   };

//   return (
//     <Card
//       bordered
//       className="shadow-md hover:shadow-lg transition-shadow duration-200 h-full"
//       style={{
//         background: 'var(--color-background)',
//         borderRadius: '8px',
//         overflow: 'hidden',
//       }}
//     >
//       {renderContent()}
//       <Typography.Text type="secondary" style={{ fontSize: '0.75em', display: 'block', textAlign: 'right', marginTop: '8px' }}>
//         Last Updated: {lastUpdated}
//       </Typography.Text>
//     </Card>
//   );
// };

// export default MetricChartWidget;





// Debounce function
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Statistic, message, Spin, Typography, Select, Col } from 'antd';
import Plotly from 'plotly.js-dist-min';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { snakeToTitleCase } from '@/components/common/utils/casing';
import dayjs from 'dayjs';

export interface MetricWidgetConfig {
  id: string;
  entitySchema: string;
  entityType: string;
  metricKey: string;
  groupByColumns?: string[];
  chartType: 'statistic' | 'bar' | 'pie' | 'line' | 'scatter' | 'area' | 'gauge' | 'funnel';
  filterCondition?: string;
  title?: string;
}

interface MetricChartWidgetProps {
  widgetConfig: MetricWidgetConfig;
  viewConfig: any;
  forceRefresh?: boolean;
}

const MetricChartWidget: React.FC<MetricChartWidgetProps> = ({ widgetConfig, viewConfig, forceRefresh = false }) => {
  const { organization, location } = useAuthStore();
  const plotRef = useRef<HTMLDivElement>(null);
  const plotlyInstance = useRef<any>(null);

  const {
    id: widgetId,
    entitySchema,
    entityType,
    metricKey,
    groupByColumns = [],
    chartType,
    filterCondition,
    title: customTitle,
  } = widgetConfig;

  const metricDefinition = viewConfig?.metricsview?.measures?.find(
    (m: any) => m.metric_key === metricKey
  );

  const fullEntityTableName = `${entitySchema}.${entityType}`;
  const groupByString = groupByColumns.join(',');

  const { data: metricData, isLoading: isMetricLoading, error: metricError } = useQuery({
    queryKey: ['metricWidgetData', widgetId, fullEntityTableName, metricKey, groupByString, filterCondition, forceRefresh, location?.id, organization?.id],
    queryFn: async () => {
      if (!metricDefinition || !organization?.id || !entitySchema || !entityType) return [];

      const { data, error } = await supabase.rpc('core_calculate_entity_metricv9', {
        p_entity_table_name: fullEntityTableName,
        p_organization_id: organization.id,
        p_location_id: location?.id, // FIX: location.id can be null, pass it correctly
        p_metric_key: metricKey,
        p_filter_condition: filterCondition || null,
        p_group_by_columns: groupByString || null,
        p_filters_hash: null,
        p_force_refresh: forceRefresh,
      });

      if (error) {
        console.error(`Error fetching metric data for widget ${widgetId}:`, error);
        message.error(`Error fetching data for ${metricDefinition?.display_name}: ${error.message}`);
        throw error;
      }

      return data || [];
    },
    enabled: !!metricDefinition && !!organization?.id && !!entitySchema && !!entityType,
    staleTime: 5000,
    cacheTime: 10 * 60 * 1000,
  });

  const lastUpdated = metricData?.[0]?.last_calculated_at
    ? dayjs(metricData[0].last_calculated_at).format('YYYY-MM-DD HH:mm:ss')
    : 'N/A';

  const getDisplayValue = (item: any, key: string) => {
    const metadata = viewConfig?.metadata?.find((m: any) => m.key === key);
    return item[`display_${key}`] || item[key] || 'N/A';
  };

  useEffect(() => {
    // FIX: Simplified the useEffect condition
    if (plotRef.current && metricData && metricData.length > 0 && chartType !== 'statistic') {
      console.log(`Rendering Plotly chart for widget ${widgetId}. Data:`, metricData);
      
      const metricDisplayName = metricDefinition?.display_name || snakeToTitleCase(metricKey);
      const widgetTitle = customTitle || metricDisplayName;
      
      // Plotly requires either grouped data or a single value for gauges
      if (groupByColumns.length === 0 && chartType !== 'gauge') {
        console.warn(`Skipping Plotly for non-grouped chart type: ${chartType}.`);
        return;
      }

      const labels = metricData.map((item: any) =>
        groupByColumns.length > 0
          ? groupByColumns.map(col => getDisplayValue(item, col)).join(' - ')
          : 'Total' // Fallback label for single-value charts (like Gauge)
      );
      const values = metricData.map((item: any) => item.metric_value);

      let plotData: Plotly.Data[] = [];
      let plotLayout: Partial<Plotly.Layout> = {
        title: widgetTitle,
        height: 300,
        margin: { l: 50, r: 50, b: 80, t: 50, pad: 4 },
        hovermode: 'closest',
        font: { family: 'Inter, sans-serif' },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        xaxis: { automargin: true, tickangle: -45, title: groupByColumns.map(snakeToTitleCase).join(' - ') },
        yaxis: { automargin: true, title: metricDisplayName },
      };

      switch (chartType) {
        case 'bar':
          plotData = [{
            x: labels,
            y: values,
            type: 'bar',
            marker: { color: 'var(--color-primary)' },
            hovertemplate: `<b>%{x}</b><br>${metricDisplayName}: %{y}<extra></extra>`,
          }];
          break;
        case 'pie':
          plotData = [{
            labels: labels,
            values: values,
            type: 'pie',
            hoverinfo: 'label+percent+value',
            textinfo: 'percent',
            automargin: true,
            marker: {
              colors: [
                '#1890ff', '#2fc25b', '#facc14', '#eb2f96', '#722ed1', '#fa8c16', '#a0d911', '#597ef7', '#f759ab', '#9254de'
              ]
            }
          }];
          plotLayout = {
            title: widgetTitle,
            height: 300,
            margin: { l: 0, r: 0, b: 0, t: 50, pad: 0 },
            font: { family: 'Inter, sans-serif' },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            showlegend: true,
            legend: { orientation: 'h', x: 0, y: -0.2 },
          };
          break;
        case 'line':
        case 'scatter':
          plotData = [{
            x: labels,
            y: values,
            type: 'scatter',
            mode: chartType === 'line' ? 'lines+markers' : 'markers',
            marker: { color: 'var(--color-primary)' },
            line: { color: 'var(--color-primary)' },
            hovertemplate: `<b>%{x}</b><br>${metricDisplayName}: %{y}<extra></extra>`,
          }];
          break;
        case 'area':
          plotData = [{
            x: labels,
            y: values,
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            marker: { color: 'var(--color-primary)' },
            line: { color: 'var(--color-primary)' },
            hovertemplate: `<b>%{x}</b><br>${metricDisplayName}: %{y}<extra></extra>`,
          }];
          break;
        case 'gauge':
          plotData = [{
            type: 'indicator',
            mode: 'gauge+number',
            value: values[0] || 0,
            title: { text: metricDisplayName },
            gauge: {
              axis: { range: [null, values[0] * 2 || 100] },
              bar: { color: 'var(--color-primary)' },
              bgcolor: 'transparent',
              borderwidth: 0,
              steps: [
                { range: [0, (values[0] * 0.5) || 50], color: '#d9d9d9' },
                { range: [(values[0] * 0.5) || 50, (values[0] * 1.5) || 100], color: '#bfbfbf' }
              ],
              threshold: {
                line: { color: "red", width: 4 },
                thickness: 0.75,
                value: values[0] * 1.2 || 80
              }
            }
          }];
          plotLayout = {
            title: widgetTitle,
            height: 300,
            margin: { l: 20, r: 20, b: 20, t: 50, pad: 4 },
            font: { family: 'Inter, sans-serif' },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
          };
          break;
        case 'funnel':
          plotData = [{
            x: values,
            y: labels,
            type: 'funnel',
            marker: {
              color: [
                '#1890ff', '#2fc25b', '#facc14', '#eb2f96', '#722ed1', '#fa8c16', '#a0d911', '#597ef7', '#f759ab', '#9254de'
              ]
            },
            hovertemplate: `<b>%{y}</b><br>${metricDisplayName}: %{x}<extra></extra>`,
          }];
          plotLayout = {
            title: widgetTitle,
            height: 300,
            margin: { l: 80, r: 50, b: 50, t: 50, pad: 4 },
            font: { family: 'Inter, sans-serif' },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
          };
          break;
        default:
          break;
      }

      // Set explicit dimensions to prevent auto-margin redraws
      plotLayout.width = plotRef.current.clientWidth;
      plotLayout.height = plotRef.current.clientHeight;

      Plotly.newPlot(plotRef.current, plotData, plotLayout, { displayModeBar: false, responsive: true }).then((instance) => {
        plotlyInstance.current = instance;
      });

      const handleResize = debounce(() => {
        if (plotRef.current && plotlyInstance.current) {
          Plotly.Plots.resize(plotRef.current);
        }
      }, 200);

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (plotRef.current) {
          Plotly.purge(plotRef.current);
        }
      };
    }
  }, [plotRef, metricData, chartType, groupByColumns, metricKey, metricDefinition, customTitle, widgetId]);

  const renderContent = () => {
    if (isMetricLoading) {
      return (
        <div className="flex justify-center items-center h-full min-h-[200px]">
          <Spin size="large" />
        </div>
      );
    }

    if (metricError) {
      return (
        <div className="text-center text-red-500 p-4">
          Error loading data: {metricError.message}
        </div>
      );
    }

    if (!metricData || metricData.length === 0) {
      return (
        <div className="text-center text-gray-500 p-4">
          No data available for this metric.
        </div>
      );
    }

    const metricDisplayName = metricDefinition?.display_name || snakeToTitleCase(metricKey);
    const widgetTitle = customTitle || metricDisplayName;

    if (chartType === 'statistic' || (groupByColumns.length === 0 && chartType !== 'gauge')) {
      const value = metricData[0]?.metric_value;
      const excluded = metricData[0]?.excluded;
      return (
        <Statistic
          title={widgetTitle}
          value={value !== null && value !== undefined ? value.toLocaleString() : 'N/A'}
          valueStyle={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold' }}
          suffix={excluded > 0 ? ` (${excluded} excluded)` : ''}
        />
      );
    }

    return (
      <div ref={plotRef} style={{ width: '100%', height: '100%', minHeight: '200px' }}>
      </div>
    );
  };

  return (
    <Card
      bordered
      className="shadow-md hover:shadow-lg transition-shadow duration-200 h-full"
      style={{
        background: 'var(--color-background)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {renderContent()}
      <Typography.Text type="secondary" style={{ fontSize: '0.75em', display: 'block', textAlign: 'right', marginTop: '8px' }}>
        Last Updated: {lastUpdated}
      </Typography.Text>
    </Card>
  );
};

export default MetricChartWidget;