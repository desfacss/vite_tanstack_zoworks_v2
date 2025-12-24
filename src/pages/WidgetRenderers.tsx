import { useEffect, useRef, useState } from 'react';
import { Statistic, Table, Alert, Spin, Tag } from 'antd';
import { ArrowUp, ArrowDown } from 'lucide-react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/core/lib/store';

// --- Types ---
export type ChartType =
  | 'line' | 'area' | 'bar' | 'stacked_bar' | 'combo'
  | 'pie' | 'donut'
  | 'funnel' | 'gauge'
  | 'radar' | 'treemap' | 'sunburst';

// --- Generic Wrapper for Loading/Error States ---
export const WidgetWrapper: React.FC<any> = ({ data, loading, error, children }) => {
  const { t } = useTranslation();
  if (loading) return (
    <div className="h-full w-full flex items-center justify-center">
      <Spin tip={t('common.label.loading')} />
    </div>
  );

  if (error) return (
    <div className="h-full w-full p-4">
      <Alert message={t('common.label.data_error')} description={error} type="error" showIcon />
    </div>
  );

  if (!data || (Array.isArray(data) && data.length === 0)) return (
    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
      <div className="text-2xl mb-2">∅</div>
      <div>{t('common.label.no_data')}</div>
    </div>
  );

  return <div className="h-full w-full overflow-hidden relative">{children}</div>;
};

// ============================================================================
// UNIVERSAL CHART COMPONENT
// ============================================================================

export const BaseChart: React.FC<{
  type: ChartType;
  data: any[];
  config: any;
  layoutOverride?: any;
}> = ({ type, data, config, layoutOverride }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const plotlyInstance = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const renderChart = async () => {
      if (!chartRef.current) return;
      const Plotly = (await import('plotly.js-dist-min')).default;

      resizeObserver.current = new ResizeObserver(() => {
        if (chartRef.current && plotlyInstance.current) {
          Plotly.Plots.resize(chartRef.current);
        }
      });

      resizeObserver.current.observe(chartRef.current);
    };
    renderChart();

    return () => {
      if (resizeObserver.current) resizeObserver.current.disconnect();
      // We don't have Plotly here easily without re-importing, or we can store it in a ref.
      // But purge is mostly to clean up DOM.
    };
  }, []);

  useEffect(() => {
    const updateChart = async () => {
      if (!chartRef.current || !data.length || !isMounted) return;
      const Plotly = (await import('plotly.js-dist-min')).default;

      let chartData = [...data];

      if (config.sort) {
        const sortKey = config.sortBy || (Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis) || 'value';
        chartData.sort((a, b) => {
          const valA = a[sortKey] || 0;
          const valB = b[sortKey] || 0;
          return config.sort === 'asc' ? valA - valB : valB - valA;
        });
      }

      if (config.limit && typeof config.limit === 'number') {
        chartData = chartData.slice(0, config.limit);
      }

      const xAxis = config.xAxis || config.labels || config.group_by || 'name';
      const yAxis = config.yAxis || config.values || 'value';
      const groupBy = config.groupBy;

      let traces: any[] = [];

      const isDarkMode = document.documentElement.classList.contains('dark');
      const textColor = isDarkMode ? '#e9edef' : '#1f1f1f';
      const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

      let layout: any = {
        margin: { l: 40, r: 20, t: 30, b: 40 },
        showlegend: true,
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        legend: { orientation: 'h', y: -0.2, font: { color: textColor } },
        xaxis: {
          tickangle: -45,
          automargin: true,
          tickfont: { color: textColor },
          gridcolor: gridColor,
          linecolor: gridColor
        },
        yaxis: {
          automargin: true,
          tickfont: { color: textColor },
          gridcolor: gridColor,
          linecolor: gridColor
        },
        font: {
          family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
          color: textColor
        },
        ...layoutOverride
      };

      if (type === 'pie' || type === 'donut') {
        traces = [{
          labels: chartData.map(d => d[xAxis]),
          values: chartData.map(d => d[yAxis]),
          type: 'pie',
          hole: type === 'donut' ? 0.4 : 0,
          textinfo: 'label+percent',
          textposition: 'outside',
          automargin: true,
          marker: { colors: config.colors || ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1'] }
        }];
      }
      else if (type === 'gauge') {
        const val = chartData[0]?.[yAxis] || 0;
        const min = config.min || 0;
        const max = config.max || 100;

        traces = [{
          type: "indicator",
          mode: "gauge+number+delta",
          value: val,
          gauge: {
            axis: { range: [min, max], tickcolor: textColor },
            bar: { color: "#1890ff" },
            steps: [
              { range: [min, max * 0.6], color: isDarkMode ? 'rgba(255,255,255,0.05)' : "#f0f5ff" },
              { range: [max * 0.6, max * 0.9], color: isDarkMode ? 'rgba(255,255,255,0.1)' : "#d6e4ff" }
            ]
          }
        }];
        layout.margin = { t: 30, b: 30, l: 30, r: 30 };
      }
      else {
        const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis];

        if (groupBy) {
          const groupedData = _.groupBy(chartData, groupBy);
          traces = Object.keys(groupedData).map(groupName => {
            const groupRows = groupedData[groupName];
            return {
              x: groupRows.map(d => d[xAxis]),
              y: groupRows.map(d => d[yAxes[0]]),
              type: type === 'stacked_bar' ? 'bar' : (type === 'area' ? 'scatter' : 'bar'),
              name: groupName,
              stackgroup: type === 'area' ? 'one' : undefined
            };
          });
        } else {
          traces = yAxes.map((yKey, i) => {
            let traceType = 'scatter';
            let mode: string | undefined = 'lines+markers';
            let fill = undefined;

            if (type === 'bar' || type === 'stacked_bar') {
              traceType = 'bar';
              mode = undefined;
            } else if (type === 'area') {
              fill = 'tozeroy';
            } else if (type === 'combo') {
              const specificType = config.seriesTypes?.[yKey] || (i === 0 ? 'bar' : 'scatter');
              traceType = specificType === 'line' ? 'scatter' : specificType;
              if (traceType === 'bar') mode = undefined;
            }

            const trace: any = {
              x: chartData.map(d => d[xAxis]),
              y: chartData.map(d => d[yKey]),
              type: traceType,
              fill: fill,
              name: yKey.replace(/_/g, ' ').toUpperCase(),
              marker: { color: config.colors?.[yKey] || undefined },
              line: traceType === 'scatter' ? { shape: 'spline' } : undefined
            };

            if (mode) trace.mode = mode;

            return trace;
          });
        }

        if (type === 'stacked_bar') {
          layout.barmode = 'stack';
        }
      }

      if (chartRef.current) {
        Plotly.react(chartRef.current, traces, layout, {
          displayModeBar: false,
          responsive: true,
          displaylogo: false,
          scrollZoom: false
        }).then((instance: any) => {
          plotlyInstance.current = instance;
        }).catch((err: any) => {
          console.warn("Plotly Render Warning:", err);
        });
      }
    };
    updateChart();
  }, [data, config, type, isMounted, layoutOverride]);

  return (
    <div
      ref={chartRef}
      className="absolute inset-0 w-full h-full"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  );
};

// ============================================================================
// KPI WIDGET
// ============================================================================

export const KPIWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
  const { isDarkMode } = useThemeStore();
  const { t } = useTranslation();
  const metricKey = config.metricKey || Object.keys(data[0] || {}).find(k => typeof data[0][k] === 'number');
  const value = data[0]?.[metricKey!] || 0;

  const trend = data[0]?.['trend'] || data[0]?.['change_pct'];
  const isPositive = trend > 0;

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 relative">
      <Statistic
        title={<span className="text-gray-400 text-xs uppercase tracking-wider">{config.subtitle || config.title || ''}</span>}
        value={value}
        precision={config.precision !== undefined ? config.precision : (Number.isInteger(value) ? 0 : 2)}
        prefix={config.prefix}
        suffix={config.format === 'percent' ? '%' : config.suffix}
        valueStyle={{
          fontSize: config.fontSize || '2.2rem',
          fontWeight: 700,
          color: config.color || (isDarkMode ? '#e9edef' : '#1f1f1f'),
          lineHeight: 1.2
        }}
      />

      {trend !== undefined && trend !== null && (
        <div
          className="mt-3 text-xs font-bold flex items-center px-2 py-1 rounded-full"
          style={{
            color: isPositive ? '#22c55e' : '#ef4444',
            backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
          }}
        >
          {isPositive ? <ArrowUp size={14} className="mr-1" /> : <ArrowDown size={14} className="mr-1" />}
          <span>{Math.abs(trend)}% {config.trendLabel || t('common.label.vs_last_period')}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TABLE WIDGET
// ============================================================================

export const TableWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
  let processedData = [...data];

  if (config.sort && config.sortBy) {
    processedData.sort((a, b) => {
      const valA = a[config.sortBy] || 0;
      const valB = b[config.sortBy] || 0;
      return config.sort === 'asc' ? valA - valB : valB - valA;
    });
  }

  if (config.limit && typeof config.limit === 'number') {
    processedData = processedData.slice(0, config.limit);
  }

  const columns = (config.columns || Object.keys(data[0] || {})).map((col: string) => ({
    title: col.replace(/_/g, ' ').toUpperCase(),
    dataIndex: col,
    key: col,
    ellipsis: true,
    sorter: (a: any, b: any) => {
      const valA = a[col] || 0;
      const valB = b[col] || 0;
      if (typeof valA === 'string') return valA.localeCompare(valB);
      return valA - valB;
    },
    render: (val: any) => {
      if (val === null || val === undefined) return <span className="text-gray-300">-</span>;

      if (typeof val === 'number') {
        if (col.toLowerCase().includes('price') || col.toLowerCase().includes('cost') || col.toLowerCase().includes('revenue')) {
          return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        }
        if (col.toLowerCase().includes('percent') || col.toLowerCase().includes('rate')) {
          const isRatio = val <= 1 && val > -1 && val !== 0;
          return isRatio ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(1)}%`;
        }
        if (Number.isInteger(val)) return val.toLocaleString();
        return val.toFixed(2);
      }

      if (typeof val === 'string' && ['status', 'priority', 'state'].some(k => col.toLowerCase().includes(k))) {
        let color = 'default';
        const lowerVal = val.toLowerCase();
        if (['high', 'critical', 'error', 'failed', 'rejected'].includes(lowerVal)) color = 'red';
        else if (['medium', 'warning', 'pending', 'in progress'].includes(lowerVal)) color = 'orange';
        else if (['low', 'success', 'completed', 'active', 'approved'].includes(lowerVal)) color = 'green';
        else if (['open', 'new'].includes(lowerVal)) color = 'blue';
        return <Tag color={color}>{val.toUpperCase()}</Tag>;
      }

      return val;
    }
  }));

  return (
    <div className="h-full w-full overflow-hidden rounded-[var(--tenant-border-radius,12px)] bg-[var(--color-bg-secondary)]">
      <Table
        dataSource={processedData}
        columns={columns}
        pagination={config.pagination === false ? false : { pageSize: config.pageSize || 5, size: 'small', hideOnSinglePage: true }}
        size="middle"
        rowKey={(r) => r.id || JSON.stringify(r)}
        scroll={{ x: 'max-content', y: config.height || 300 }}
        className="h-full"
      />
    </div>
  );
};