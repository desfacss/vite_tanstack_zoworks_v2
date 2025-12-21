// // // // // import React, { useEffect, useRef } from 'react';
// // // // // import { Statistic, Table, Alert, Spin } from 'antd';
// // // // // import Plotly from 'plotly.js-dist-min';
// // // // // import _ from 'lodash';

// // // // // // --- Generic Wrapper for Loading/Error States ---
// // // // // export const WidgetWrapper: React.FC<any> = ({ data, loading, error, children }) => {
// // // // //   if (loading) return <div className="h-full flex items-center justify-center"><Spin /></div>;
// // // // //   if (error) return <Alert message="Error" description={error} type="error" showIcon />;
// // // // //   if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400">No Data</div>;
// // // // //   return <div className="h-full w-full overflow-hidden">{children}</div>;
// // // // // };

// // // // // // --- Chart Components ---

// // // // // export const BaseChart: React.FC<{
// // // // //   type: 'line' | 'area' | 'bar' | 'stacked_bar' | 'pie' | 'donut' | 'funnel' | 'gauge' | 'combo';
// // // // //   data: any[];
// // // // //   config: any;
// // // // //   layoutOverride?: any;
// // // // // }> = ({ type, data, config, layoutOverride }) => {
// // // // //   const chartRef = useRef<HTMLDivElement>(null);
// // // // //   const resizeObserver = useRef<ResizeObserver | null>(null);

// // // // //   // 1. LIFECYCLE: Handle ResizeObserver Only Once
// // // // //   useEffect(() => {
// // // // //     if (!chartRef.current) return;

// // // // //     // Initialize Observer
// // // // //     resizeObserver.current = new ResizeObserver(() => {
// // // // //        if (chartRef.current) {
// // // // //          Plotly.Plots.resize(chartRef.current);
// // // // //        }
// // // // //     });
    
// // // // //     resizeObserver.current.observe(chartRef.current);

// // // // //     // Cleanup on Unmount
// // // // //     return () => {
// // // // //       if (resizeObserver.current) resizeObserver.current.disconnect();
// // // // //       if (chartRef.current) Plotly.purge(chartRef.current);
// // // // //     };
// // // // //   }, []); // Empty dependency array = Run once on mount

// // // // //   // 2. DATA UPDATE: Handle Plotly Drawing efficiently
// // // // //   useEffect(() => {
// // // // //     if (!chartRef.current || !data.length) return;

// // // // //     const xAxis = config.xAxis || config.labels || config.group_by;
// // // // //     const yAxis = config.yAxis || config.values; // Can be string or array of strings

// // // // //     let traces: any[] = [];
// // // // //     let layout: any = {
// // // // //       margin: { l: 40, r: 20, t: 30, b: 40 },
// // // // //       showlegend: true,
// // // // //       autosize: true,
// // // // //       xaxis: { tickangle: -45, automargin: true },
// // // // //       yaxis: { automargin: true },
// // // // //       ...layoutOverride
// // // // //     };

// // // // //     // --- TRACE GENERATION LOGIC ---

// // // // //     // A. PIE & DONUT
// // // // //     if (type === 'pie' || type === 'donut') {
// // // // //       traces = [{
// // // // //         labels: data.map(d => d[xAxis]),
// // // // //         values: data.map(d => d[yAxis]),
// // // // //         type: 'pie',
// // // // //         hole: type === 'donut' ? 0.4 : 0,
// // // // //         textinfo: 'label+percent',
// // // // //         marker: { colors: ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1'] }
// // // // //       }];
// // // // //     } 
    
// // // // //     // B. GAUGE (Single Value Indicator)
// // // // //     else if (type === 'gauge') {
// // // // //       const val = data[0]?.[yAxis] || 0;
// // // // //       traces = [{
// // // // //         type: "indicator",
// // // // //         mode: "gauge+number",
// // // // //         value: val,
// // // // //         gauge: {
// // // // //           axis: { range: [config.min || 0, config.max || 100] },
// // // // //           bar: { color: "#1890ff" },
// // // // //           steps: [
// // // // //             { range: [0, (config.max || 100) * 0.5], color: "#f0f5ff" },
// // // // //             { range: [(config.max || 100) * 0.5, config.max || 100], color: "#d6e4ff" }
// // // // //           ],
// // // // //         }
// // // // //       }];
// // // // //       layout.margin = { t: 25, b: 25, l: 25, r: 25 };
// // // // //     }

// // // // //     // C. FUNNEL
// // // // //     else if (type === 'funnel') {
// // // // //         traces = [{
// // // // //             type: 'funnel',
// // // // //             y: data.map(d => d[xAxis]),
// // // // //             x: data.map(d => d[yAxis]),
// // // // //             textinfo: "value+percent initial"
// // // // //         }];
// // // // //     }

// // // // //     // D. CARTESIAN (Line, Area, Bar, Combo)
// // // // //     else {
// // // // //       const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis];
      
// // // // //       traces = yAxes.map(yKey => {
// // // // //         // Determine specific trace type
// // // // //         let traceType = 'scatter'; // Default line
// // // // //         let mode = 'lines+markers';
// // // // //         let fill = undefined;

// // // // //         if (type === 'bar' || type === 'stacked_bar') {
// // // // //              traceType = 'bar';
// // // // //              mode = undefined;
// // // // //         } else if (type === 'area') {
// // // // //              fill = 'tozeroy';
// // // // //         } else if (type === 'combo') {
// // // // //             // Look for overrides in config: { seriesTypes: { "tickets": "bar", "time": "line" } }
// // // // //             const specificType = config.seriesTypes?.[yKey] || 'scatter';
// // // // //             traceType = specificType === 'line' ? 'scatter' : specificType;
// // // // //             if (traceType === 'bar') mode = undefined;
// // // // //         }

// // // // //         return {
// // // // //           x: data.map(d => d[xAxis]),
// // // // //           y: data.map(d => d[yKey]),
// // // // //           type: traceType,
// // // // //           mode: mode,
// // // // //           fill: fill,
// // // // //           name: yKey.replace(/_/g, ' ').toUpperCase(),
// // // // //           marker: { 
// // // // //             // Auto-assign colors or use config
// // // // //             color: config.colors?.[yKey] 
// // // // //           }
// // // // //         };
// // // // //       });

// // // // //       if (type === 'stacked_bar') {
// // // // //           layout.barmode = 'stack';
// // // // //       }
// // // // //     }

// // // // //     // Use Plotly.react (faster updates) instead of newPlot
// // // // //     Plotly.react(chartRef.current, traces, layout, { 
// // // // //         displayModeBar: false, 
// // // // //         responsive: true 
// // // // //     });

// // // // //   }, [data, config, type]); // Re-run only if data/config changes

// // // // //   return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
// // // // // };

// // // // // export const KPIWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
// // // // //   const metricKey = config.metricKey || Object.keys(data[0] || {}).find(k => typeof data[0][k] === 'number');
// // // // //   const value = data[0]?.[metricKey!] || 0;
  
// // // // //   return (
// // // // //     <div className="h-full flex items-center justify-center">
// // // // //       <Statistic 
// // // // //         value={value} 
// // // // //         precision={config.precision || 0}
// // // // //         suffix={config.format === 'percent' ? '%' : ''}
// // // // //         valueStyle={{ fontSize: '2rem', fontWeight: 600 }}
// // // // //       />
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // export const TableWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
// // // // //   // Auto-generate columns if not provided
// // // // //   const columns = (config.columns || Object.keys(data[0] || {})).map((col: string) => ({
// // // // //     title: col.replace(/_/g, ' ').toUpperCase(),
// // // // //     dataIndex: col,
// // // // //     key: col,
// // // // //     ellipsis: true,
// // // // //     // Simple renderer for cleaner data
// // // // //     render: (val: any) => {
// // // // //         if (typeof val === 'number' && !Number.isInteger(val)) return val.toFixed(2);
// // // // //         return val;
// // // // //     }
// // // // //   }));

// // // // //   return (
// // // // //     <div className="h-full overflow-auto">
// // // // //       <Table
// // // // //         dataSource={data}
// // // // //         columns={columns}
// // // // //         pagination={false}
// // // // //         size="small"
// // // // //         rowKey={(r, i) => i.toString()} // Fallback key
// // // // //         sticky
// // // // //       />
// // // // //     </div>
// // // // //   );
// // // // // };


// // // // /**
// // // //  * WidgetRenderers.tsx
// // // //  * * SENIOR ARCHITECT DEV NOTES:
// // // //  * ---------------------------
// // // //  * 1. PERFORMANCE: We use `Plotly.react` instead of `Plotly.newPlot` for updates. 
// // // //  * This performs a highly efficient diff of the data/layout and updates the DOM 
// // // //  * in-place, preserving interaction state (zoom, pan) and preventing memory leaks.
// // // //  * * 2. LIFECYCLE: The ResizeObserver is instantiated ONCE per component mount. 
// // // //  * It decouples the resizing logic from the data rendering logic.
// // // //  * * 3. EXTENSIBILITY: The `BaseChart` is a "Poly-morphic" renderer. It changes its 
// // // //  * trace generation strategy based on `config.widget_type`.
// // // //  * * 4. CONFIGURATION: The `config` object is passed directly from the database JSON.
// // // //  * Standard keys expected: xAxis, yAxis, groupBy, label, value.
// // // //  */

// // // // import React, { useEffect, useRef } from 'react';
// // // // import { Statistic, Table, Alert, Spin, Tag } from 'antd';
// // // // import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
// // // // import Plotly from 'plotly.js-dist-min';
// // // // import _ from 'lodash';

// // // // // --- Types ---
// // // // export type ChartType = 
// // // //   | 'line' | 'area' | 'bar' | 'stacked_bar' | 'combo'
// // // //   | 'pie' | 'donut' 
// // // //   | 'funnel' | 'gauge' 
// // // //   | 'radar' | 'treemap' | 'sunburst';

// // // // // --- Helper: Value Formatter ---
// // // // const formatValue = (val: any, type: 'number' | 'currency' | 'percent' = 'number') => {
// // // //   if (typeof val !== 'number') return val;
// // // //   if (type === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
// // // //   if (type === 'percent') return `${(val * 100).toFixed(1)}%`;
// // // //   return val.toLocaleString();
// // // // };

// // // // // --- Generic Wrapper for Loading/Error States ---
// // // // export const WidgetWrapper: React.FC<any> = ({ data, loading, error, children }) => {
// // // //   if (loading) return (
// // // //     <div className="h-full w-full flex items-center justify-center">
// // // //       <Spin tip="Loading Data..." />
// // // //     </div>
// // // //   );
  
// // // //   if (error) return (
// // // //     <div className="h-full w-full p-4">
// // // //       <Alert message="Data Error" description={error} type="error" showIcon />
// // // //     </div>
// // // //   );
  
// // // //   if (!data || (Array.isArray(data) && data.length === 0)) return (
// // // //     <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
// // // //       <div className="text-2xl mb-2">∅</div>
// // // //       <div>No Data Available</div>
// // // //     </div>
// // // //   );
  
// // // //   return <div className="h-full w-full overflow-hidden relative">{children}</div>;
// // // // };

// // // // // ============================================================================
// // // // // UNIVERSAL CHART COMPONENT
// // // // // ============================================================================

// // // // export const BaseChart: React.FC<{
// // // //   type: ChartType;
// // // //   data: any[];
// // // //   config: any;
// // // //   layoutOverride?: any;
// // // // }> = ({ type, data, config, layoutOverride }) => {
// // // //   const chartRef = useRef<HTMLDivElement>(null);
// // // //   const resizeObserver = useRef<ResizeObserver | null>(null);
// // // //   const plotlyInstance = useRef<any>(null);

// // // //   // 1. LIFECYCLE: Handle ResizeObserver Only Once
// // // //   useEffect(() => {
// // // //     if (!chartRef.current) return;

// // // //     // Initialize Observer
// // // //     resizeObserver.current = new ResizeObserver(() => {
// // // //        if (chartRef.current) {
// // // //          Plotly.Plots.resize(chartRef.current);
// // // //        }
// // // //     });
    
// // // //     resizeObserver.current.observe(chartRef.current);

// // // //     // Cleanup on Unmount
// // // //     return () => {
// // // //       if (resizeObserver.current) resizeObserver.current.disconnect();
// // // //       if (chartRef.current) Plotly.purge(chartRef.current);
// // // //     };
// // // //   }, []);

// // // //   // 2. DATA RENDERER
// // // //   useEffect(() => {
// // // //     if (!chartRef.current || !data.length) return;

// // // //     // -- 1. CONFIGURATION EXTRACTION --
// // // //     // Fallback keys allow for flexible configuration
// // // //     const xAxis = config.xAxis || config.labels || config.group_by || 'name';
// // // //     const yAxis = config.yAxis || config.values || 'value';
// // // //     const groupBy = config.groupBy; // For stacked/grouped charts

// // // //     let traces: any[] = [];
    
// // // //     // Default Layout
// // // //     let layout: any = {
// // // //       margin: { l: 40, r: 20, t: 30, b: 40 },
// // // //       showlegend: true,
// // // //       autosize: true,
// // // //       legend: { orientation: 'h', y: -0.2 }, // Horizontal legend below chart
// // // //       xaxis: { tickangle: -45, automargin: true },
// // // //       yaxis: { automargin: true },
// // // //       font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" },
// // // //       ...layoutOverride
// // // //     };

// // // //     // -- 2. TRACE GENERATION STRATEGY --

// // // //     // STRATEGY A: PIE & DONUT
// // // //     if (type === 'pie' || type === 'donut') {
// // // //       traces = [{
// // // //         labels: data.map(d => d[xAxis]),
// // // //         values: data.map(d => d[yAxis]),
// // // //         type: 'pie',
// // // //         hole: type === 'donut' ? 0.4 : 0,
// // // //         textinfo: 'label+percent',
// // // //         textposition: 'outside',
// // // //         automargin: true,
// // // //         marker: { colors: config.colors || ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1'] }
// // // //       }];
// // // //     } 
    
// // // //     // STRATEGY B: GAUGE (Single Value KPI)
// // // //     else if (type === 'gauge') {
// // // //       const val = data[0]?.[yAxis] || 0;
// // // //       const min = config.min || 0;
// // // //       const max = config.max || 100;
      
// // // //       traces = [{
// // // //         type: "indicator",
// // // //         mode: "gauge+number+delta",
// // // //         value: val,
// // // //         gauge: {
// // // //           axis: { range: [min, max] },
// // // //           bar: { color: "#1890ff" },
// // // //           steps: [
// // // //             { range: [min, max * 0.6], color: "#f0f5ff" },
// // // //             { range: [max * 0.6, max * 0.9], color: "#d6e4ff" },
// // // //             { range: [max * 0.9, max], color: "#adc6ff" }
// // // //           ],
// // // //           threshold: {
// // // //             line: { color: "red", width: 4 },
// // // //             thickness: 0.75,
// // // //             value: config.threshold || max * 0.9
// // // //           }
// // // //         }
// // // //       }];
// // // //       layout.margin = { t: 30, b: 30, l: 30, r: 30 };
// // // //     }

// // // //     // STRATEGY C: RADAR (Spider Chart)
// // // //     else if (type === 'radar') {
// // // //        // Expects: categories (xAxis), value (yAxis)
// // // //        traces = [{
// // // //         type: 'scatterpolar',
// // // //         r: data.map(d => d[yAxis]),
// // // //         theta: data.map(d => d[xAxis]),
// // // //         fill: 'toself',
// // // //         name: config.title || 'Data',
// // // //         fillcolor: 'rgba(24, 144, 255, 0.2)',
// // // //         line: { color: '#1890ff' }
// // // //       }];
      
// // // //       layout.polar = {
// // // //         radialaxis: { visible: true, showline: true }, 
// // // //         angularaxis: { direction: 'clockwise' }
// // // //       };
// // // //     }

// // // //     // STRATEGY D: TREEMAP (Hierarchical)
// // // //     else if (type === 'treemap') {
// // // //       // Expects: labels, parents, values
// // // //       traces = [{
// // // //         type: 'treemap',
// // // //         labels: data.map(d => d[config.labels || xAxis]),
// // // //         parents: data.map(d => d[config.parents || 'parent_id'] || ''), // Root nodes must have empty parent
// // // //         values: data.map(d => d[config.values || yAxis]),
// // // //         textinfo: "label+value+percent parent",
// // // //         branchvalues: "total",
// // // //         marker: { colorscale: 'Blues' }
// // // //       }];
// // // //       layout.margin = { t: 0, l: 0, r: 0, b: 0 };
// // // //     }

// // // //     // STRATEGY E: SUNBURST
// // // //     else if (type === 'sunburst') {
// // // //       traces = [{
// // // //         type: 'sunburst',
// // // //         labels: data.map(d => d[config.labels || xAxis]),
// // // //         parents: data.map(d => d[config.parents || 'parent_id'] || ''),
// // // //         values: data.map(d => d[config.values || yAxis]),
// // // //         textinfo: "label+value",
// // // //         outsidetextfont: { size: 14, color: "#377eb8" },
// // // //         leaf: { opacity: 0.4 },
// // // //         marker: { line: { width: 2 }, colorscale: 'Viridis' },
// // // //       }];
// // // //       layout.margin = { t: 0, l: 0, r: 0, b: 0 };
// // // //     }

// // // //     // STRATEGY F: FUNNEL
// // // //     else if (type === 'funnel') {
// // // //         traces = [{
// // // //             type: 'funnel',
// // // //             y: data.map(d => d[xAxis]), // Stages usually on Y
// // // //             x: data.map(d => d[yAxis]), // Values on X
// // // //             textinfo: "value+percent initial",
// // // //             hoverinfo: "x+percent previous+percent initial",
// // // //             marker: { color: ["#1890ff", "#40a9ff", "#69c0ff", "#91d5ff", "#bae7ff"] }
// // // //         }];
// // // //     }

// // // //     // STRATEGY G: CARTESIAN (Line, Bar, Area, Combo)
// // // //     else {
// // // //       // Handle multiple series (e.g. ["sales", "profit"])
// // // //       const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis];
      
// // // //       // If grouping is enabled (e.g., Stacked Bars by 'Category')
// // // //       if (groupBy) {
// // // //         // Group data by the grouping column
// // // //         const groupedData = _.groupBy(data, groupBy);
        
// // // //         traces = Object.keys(groupedData).map(groupName => {
// // // //            const groupRows = groupedData[groupName];
// // // //            return {
// // // //              x: groupRows.map(d => d[xAxis]),
// // // //              y: groupRows.map(d => d[yAxes[0]]), // Currently support single metric for grouped
// // // //              type: type === 'stacked_bar' ? 'bar' : (type === 'area' ? 'scatter' : 'bar'),
// // // //              name: groupName,
// // // //              stackgroup: type === 'area' ? 'one' : undefined // For stacked areas
// // // //            };
// // // //         });
// // // //       } else {
// // // //         // Standard Multi-Series
// // // //         traces = yAxes.map((yKey, i) => {
// // // //           let traceType = 'scatter'; // Default
// // // //           let mode = 'lines+markers';
// // // //           let fill = undefined;

// // // //           // Determine specific trace type
// // // //           if (type === 'bar' || type === 'stacked_bar') {
// // // //                traceType = 'bar';
// // // //                mode = undefined;
// // // //           } else if (type === 'area') {
// // // //                fill = 'tozeroy';
// // // //           } else if (type === 'combo') {
// // // //               // COMBO LOGIC: Check config for overrides
// // // //               // Config Example: { "seriesTypes": { "tickets": "bar", "time": "line" } }
// // // //               const specificType = config.seriesTypes?.[yKey] || (i === 0 ? 'bar' : 'scatter'); // Default: 1st bar, rest lines
// // // //               traceType = specificType === 'line' ? 'scatter' : specificType;
// // // //               if (traceType === 'bar') mode = undefined;
// // // //           }

// // // //           return {
// // // //             x: data.map(d => d[xAxis]),
// // // //             y: data.map(d => d[yKey]),
// // // //             type: traceType,
// // // //             mode: mode,
// // // //             fill: fill,
// // // //             name: yKey.replace(/_/g, ' ').toUpperCase(),
// // // //             marker: { color: config.colors?.[yKey] } // Allow custom colors per series
// // // //           };
// // // //         });
// // // //       }

// // // //       if (type === 'stacked_bar') {
// // // //           layout.barmode = 'stack';
// // // //       }
// // // //     }

// // // //     // -- 3. BASELINES & THRESHOLDS (Gold Standard Feature) --
// // // //     if (config.baseline?.enabled) {
// // // //       const baseline = config.baseline;
// // // //       layout.shapes = layout.shapes || [];
// // // //       layout.shapes.push({
// // // //         type: 'line',
// // // //         xref: 'paper', x0: 0, x1: 1, // Full width
// // // //         y0: baseline.value,
// // // //         y1: baseline.value,
// // // //         line: { color: baseline.color || '#ff4d4f', width: 2, dash: 'dash' },
// // // //       });

// // // //       if (baseline.label) {
// // // //         layout.annotations = layout.annotations || [];
// // // //         layout.annotations.push({
// // // //           xref: 'paper', x: 1, y: baseline.value,
// // // //           xanchor: 'right', yanchor: 'bottom',
// // // //           text: baseline.label,
// // // //           showarrow: false,
// // // //           font: { color: baseline.color || '#ff4d4f', size: 10 },
// // // //         });
// // // //       }
// // // //     }

// // // //     // -- 4. RENDER --
// // // //     // Use Plotly.react for high-performance diffing updates
// // // //     Plotly.react(chartRef.current, traces, layout, { 
// // // //         displayModeBar: false, 
// // // //         responsive: true,
// // // //         displaylogo: false
// // // //     }).then((instance) => {
// // // //         plotlyInstance.current = instance;
// // // //     });

// // // //   }, [data, config, type]);

// // // //   return <div ref={chartRef} className="w-full h-full" style={{ minHeight: '100%' }} />;
// // // // };

// // // // // ============================================================================
// // // // // KPI WIDGET
// // // // // ============================================================================

// // // // export const KPIWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
// // // //   // Auto-detect metric key if not provided
// // // //   const metricKey = config.metricKey || Object.keys(data[0] || {}).find(k => typeof data[0][k] === 'number');
// // // //   const value = data[0]?.[metricKey!] || 0;
  
// // // //   // Handle trend indicators if present in data
// // // //   // Expects data to have 'trend' or 'change_pct' columns, or config to define them
// // // //   const trend = data[0]?.['trend'] || data[0]?.['change_pct'];
// // // //   const isPositive = trend > 0;

// // // //   return (
// // // //     <div className="h-full flex flex-col items-center justify-center p-4">
// // // //       <Statistic 
// // // //         title={<span className="text-gray-500">{config.subtitle || ''}</span>}
// // // //         value={value} 
// // // //         precision={config.precision || 0}
// // // //         prefix={config.prefix}
// // // //         suffix={config.format === 'percent' ? '%' : config.suffix}
// // // //         valueStyle={{ 
// // // //             fontSize: config.fontSize || '2.5rem', 
// // // //             fontWeight: 600, 
// // // //             color: config.color || '#1f1f1f' 
// // // //         }}
// // // //       />
      
// // // //       {/* Trend Indicator */}
// // // //       {trend !== undefined && (
// // // //           <div className={`mt-2 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
// // // //               {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
// // // //               <span className="ml-1">{Math.abs(trend)}% vs last period</span>
// // // //           </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // };

// // // // // ============================================================================
// // // // // TABLE WIDGET
// // // // // ============================================================================

// // // // export const TableWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
// // // //   // Auto-generate columns if not provided
// // // //   const columns = (config.columns || Object.keys(data[0] || {})).map((col: string) => ({
// // // //     title: col.replace(/_/g, ' ').toUpperCase(),
// // // //     dataIndex: col,
// // // //     key: col,
// // // //     ellipsis: true,
// // // //     sorter: (a: any, b: any) => (a[col] > b[col] ? 1 : -1),
// // // //     render: (val: any) => {
// // // //         // Smart Rendering logic
// // // //         if (val === null || val === undefined) return <span className="text-gray-300">-</span>;
        
// // // //         // Currency check (simple heuristic)
// // // //         if (typeof val === 'number') {
// // // //             if (col.toLowerCase().includes('price') || col.toLowerCase().includes('cost') || col.toLowerCase().includes('revenue')) {
// // // //                  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
// // // //             }
// // // //             // Percent check
// // // //             if (col.toLowerCase().includes('percent') || col.toLowerCase().includes('rate')) {
// // // //                 const isRatio = val <= 1 && val > -1 && val !== 0; // Heuristic for 0.5 vs 50
// // // //                 return isRatio ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(1)}%`;
// // // //             }
// // // //             // Integer check
// // // //             if (Number.isInteger(val)) return val.toLocaleString();
// // // //             return val.toFixed(2);
// // // //         }

// // // //         // Status Tags (Heuristic)
// // // //         if (typeof val === 'string' && ['status', 'priority', 'state'].some(k => col.toLowerCase().includes(k))) {
// // // //             let color = 'default';
// // // //             if (['high', 'critical', 'error', 'failed'].includes(val.toLowerCase())) color = 'red';
// // // //             if (['medium', 'warning', 'pending'].includes(val.toLowerCase())) color = 'orange';
// // // //             if (['low', 'success', 'completed', 'active'].includes(val.toLowerCase())) color = 'green';
// // // //             return <Tag color={color}>{val.toUpperCase()}</Tag>;
// // // //         }

// // // //         return val;
// // // //     }
// // // //   }));

// // // //   return (
// // // //     <div className="h-full overflow-auto custom-scrollbar">
// // // //       <Table
// // // //         dataSource={data}
// // // //         columns={columns}
// // // //         pagination={config.pagination === false ? false : { pageSize: config.pageSize || 5, size: 'small' }}
// // // //         size="small"
// // // //         rowKey={(r, i) => r.id || i.toString()} 
// // // //         sticky
// // // //         scroll={{ x: 'max-content' }}
// // // //       />
// // // //     </div>
// // // //   );
// // // // };

// // // // INCLUDING LIMIT !) AND DESC>> 

// // // /**
// // //  * WidgetRenderers.tsx
// // //  * * SENIOR ARCHITECT DEV NOTES:
// // //  * ---------------------------
// // //  * 1. PERFORMANCE: Uses `Plotly.react` for high-performance diffing updates.
// // //  * 2. LIFECYCLE: Single ResizeObserver instance per chart to prevent memory leaks.
// // //  * 3. DATA PROCESSING: CLIENT-SIDE SORTING & LIMITING is now implemented in Phase 1.
// // //  * This allows JSON configs like { "limit": 10, "sort": "desc" } to work on any dataset.
// // //  * 4. VERSATILITY: Supports standard charts + Gauge, Funnel, Radar, Treemap, Sunburst.
// // //  */

// // // import React, { useEffect, useRef } from 'react';
// // // import { Statistic, Table, Alert, Spin, Tag } from 'antd';
// // // import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
// // // import Plotly from 'plotly.js-dist-min';
// // // import _ from 'lodash';

// // // // --- Types ---
// // // export type ChartType = 
// // //   | 'line' | 'area' | 'bar' | 'stacked_bar' | 'combo'
// // //   | 'pie' | 'donut' 
// // //   | 'funnel' | 'gauge' 
// // //   | 'radar' | 'treemap' | 'sunburst';

// // // // --- Helper: Value Formatter ---
// // // const formatValue = (val: any, type: 'number' | 'currency' | 'percent' = 'number') => {
// // //   if (typeof val !== 'number') return val;
// // //   if (type === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
// // //   if (type === 'percent') return `${(val * 100).toFixed(1)}%`;
// // //   return val.toLocaleString();
// // // };

// // // // --- Generic Wrapper for Loading/Error States ---
// // // export const WidgetWrapper: React.FC<any> = ({ data, loading, error, children }) => {
// // //   if (loading) return (
// // //     <div className="h-full w-full flex items-center justify-center">
// // //       <Spin tip="Loading Data..." />
// // //     </div>
// // //   );
  
// // //   if (error) return (
// // //     <div className="h-full w-full p-4">
// // //       <Alert message="Data Error" description={error} type="error" showIcon />
// // //     </div>
// // //   );
  
// // //   if (!data || (Array.isArray(data) && data.length === 0)) return (
// // //     <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
// // //       <div className="text-2xl mb-2">∅</div>
// // //       <div>No Data Available</div>
// // //     </div>
// // //   );
  
// // //   return <div className="h-full w-full overflow-hidden relative">{children}</div>;
// // // };

// // // // ============================================================================
// // // // UNIVERSAL CHART COMPONENT
// // // // ============================================================================

// // // export const BaseChart: React.FC<{
// // //   type: ChartType;
// // //   data: any[];
// // //   config: any;
// // //   layoutOverride?: any;
// // // }> = ({ type, data, config, layoutOverride }) => {
// // //   const chartRef = useRef<HTMLDivElement>(null);
// // //   const resizeObserver = useRef<ResizeObserver | null>(null);
// // //   const plotlyInstance = useRef<any>(null);

// // //   // 1. LIFECYCLE: Handle ResizeObserver Only Once
// // //   useEffect(() => {
// // //     if (!chartRef.current) return;

// // //     // Initialize Observer
// // //     resizeObserver.current = new ResizeObserver(() => {
// // //        if (chartRef.current) {
// // //          Plotly.Plots.resize(chartRef.current);
// // //        }
// // //     });
    
// // //     resizeObserver.current.observe(chartRef.current);

// // //     // Cleanup on Unmount
// // //     return () => {
// // //       if (resizeObserver.current) resizeObserver.current.disconnect();
// // //       if (chartRef.current) Plotly.purge(chartRef.current);
// // //     };
// // //   }, []);

// // //   // 2. DATA RENDERER
// // //   useEffect(() => {
// // //     if (!chartRef.current || !data.length) return;

// // //     // ---------------------------------------------------------
// // //     // PHASE 1: CLIENT-SIDE DATA PROCESSING (Sort & Limit)
// // //     // ---------------------------------------------------------
// // //     let chartData = [...data];

// // //     // A. Handle Sorting
// // //     // If config.sort is present (e.g., "desc"), we sort by the Value axis
// // //     if (config.sort) {
// // //        // Determine which key to sort by (sortBy > first yAxis > value)
// // //        const sortKey = config.sortBy || (Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis) || 'value';
       
// // //        chartData.sort((a, b) => {
// // //            const valA = a[sortKey] || 0;
// // //            const valB = b[sortKey] || 0;
// // //            // If desc, B - A. If asc, A - B.
// // //            return config.sort === 'asc' ? valA - valB : valB - valA;
// // //        });
// // //     }

// // //     // B. Handle Limiting (Top N)
// // //     // Slices the array after sorting
// // //     if (config.limit && typeof config.limit === 'number') {
// // //         chartData = chartData.slice(0, config.limit);
// // //     }

// // //     // ---------------------------------------------------------
// // //     // PHASE 2: CONFIGURATION & LAYOUT
// // //     // ---------------------------------------------------------
    
// // //     const xAxis = config.xAxis || config.labels || config.group_by || 'name';
// // //     const yAxis = config.yAxis || config.values || 'value';
// // //     const groupBy = config.groupBy; // For stacked/grouped charts

// // //     let traces: any[] = [];
    
// // //     let layout: any = {
// // //       margin: { l: 40, r: 20, t: 30, b: 40 },
// // //       showlegend: true,
// // //       autosize: true,
// // //       legend: { orientation: 'h', y: -0.2 }, // Legend below
// // //       xaxis: { tickangle: -45, automargin: true },
// // //       yaxis: { automargin: true },
// // //       font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" },
// // //       ...layoutOverride
// // //     };

// // //     // ---------------------------------------------------------
// // //     // PHASE 3: TRACE GENERATION STRATEGY
// // //     // ---------------------------------------------------------

// // //     // STRATEGY: PIE & DONUT
// // //     if (type === 'pie' || type === 'donut') {
// // //       traces = [{
// // //         labels: chartData.map(d => d[xAxis]),
// // //         values: chartData.map(d => d[yAxis]),
// // //         type: 'pie',
// // //         hole: type === 'donut' ? 0.4 : 0,
// // //         textinfo: 'label+percent',
// // //         textposition: 'outside',
// // //         automargin: true,
// // //         marker: { colors: config.colors || ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1'] }
// // //       }];
// // //     } 
    
// // //     // STRATEGY: GAUGE (Single Value KPI)
// // //     else if (type === 'gauge') {
// // //       const val = chartData[0]?.[yAxis] || 0;
// // //       const min = config.min || 0;
// // //       const max = config.max || 100;
      
// // //       traces = [{
// // //         type: "indicator",
// // //         mode: "gauge+number+delta",
// // //         value: val,
// // //         gauge: {
// // //           axis: { range: [min, max] },
// // //           bar: { color: "#1890ff" },
// // //           steps: [
// // //             { range: [min, max * 0.6], color: "#f0f5ff" },
// // //             { range: [max * 0.6, max * 0.9], color: "#d6e4ff" },
// // //             { range: [max * 0.9, max], color: "#adc6ff" }
// // //           ],
// // //           threshold: config.threshold ? {
// // //             line: { color: "red", width: 4 },
// // //             thickness: 0.75,
// // //             value: config.threshold
// // //           } : undefined
// // //         }
// // //       }];
// // //       layout.margin = { t: 30, b: 30, l: 30, r: 30 };
// // //     }

// // //     // STRATEGY: RADAR (Spider Chart)
// // //     else if (type === 'radar') {
// // //        traces = [{
// // //         type: 'scatterpolar',
// // //         r: chartData.map(d => d[yAxis]),
// // //         theta: chartData.map(d => d[xAxis]),
// // //         fill: 'toself',
// // //         name: config.title || 'Data',
// // //         fillcolor: 'rgba(24, 144, 255, 0.2)',
// // //         line: { color: '#1890ff' }
// // //       }];
      
// // //       layout.polar = {
// // //         radialaxis: { visible: true, showline: true }, 
// // //         angularaxis: { direction: 'clockwise' }
// // //       };
// // //     }

// // //     // STRATEGY: TREEMAP
// // //     else if (type === 'treemap') {
// // //       traces = [{
// // //         type: 'treemap',
// // //         labels: chartData.map(d => d[config.labels || xAxis]),
// // //         parents: chartData.map(d => d[config.parents || 'parent_id'] || ''), // Root nodes must have empty parent string
// // //         values: chartData.map(d => d[config.values || yAxis]),
// // //         textinfo: "label+value+percent parent",
// // //         branchvalues: "total",
// // //         marker: { colorscale: 'Blues' }
// // //       }];
// // //       layout.margin = { t: 0, l: 0, r: 0, b: 0 };
// // //     }

// // //     // STRATEGY: SUNBURST
// // //     else if (type === 'sunburst') {
// // //       traces = [{
// // //         type: 'sunburst',
// // //         labels: chartData.map(d => d[config.labels || xAxis]),
// // //         parents: chartData.map(d => d[config.parents || 'parent_id'] || ''),
// // //         values: chartData.map(d => d[config.values || yAxis]),
// // //         textinfo: "label+value",
// // //         outsidetextfont: { size: 14, color: "#377eb8" },
// // //         leaf: { opacity: 0.4 },
// // //         marker: { line: { width: 2 }, colorscale: 'Viridis' },
// // //       }];
// // //       layout.margin = { t: 0, l: 0, r: 0, b: 0 };
// // //     }

// // //     // STRATEGY: FUNNEL
// // //     else if (type === 'funnel') {
// // //         traces = [{
// // //             type: 'funnel',
// // //             y: chartData.map(d => d[xAxis]), // Stages usually on Y
// // //             x: chartData.map(d => d[yAxis]), // Values on X
// // //             textinfo: "value+percent initial",
// // //             hoverinfo: "x+percent previous+percent initial",
// // //             marker: { color: ["#1890ff", "#40a9ff", "#69c0ff", "#91d5ff", "#bae7ff"] }
// // //         }];
// // //     }

// // //     // STRATEGY: CARTESIAN (Line, Bar, Area, Combo)
// // //     else {
// // //       const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis];
      
// // //       // Grouping Logic (Stacked/Grouped Bars)
// // //       if (groupBy) {
// // //         const groupedData = _.groupBy(chartData, groupBy);
        
// // //         traces = Object.keys(groupedData).map(groupName => {
// // //            const groupRows = groupedData[groupName];
// // //            return {
// // //              x: groupRows.map(d => d[xAxis]),
// // //              y: groupRows.map(d => d[yAxes[0]]), // Currently support single metric for grouped
// // //              type: type === 'stacked_bar' ? 'bar' : (type === 'area' ? 'scatter' : 'bar'),
// // //              name: groupName,
// // //              stackgroup: type === 'area' ? 'one' : undefined
// // //            };
// // //         });
// // //       } else {
// // //         // Standard Multi-Series
// // //         traces = yAxes.map((yKey, i) => {
// // //           let traceType = 'scatter'; // Default
// // //           let mode = 'lines+markers';
// // //           let fill = undefined;

// // //           // Logic for Combo Charts or specific types
// // //           if (type === 'bar' || type === 'stacked_bar') {
// // //                traceType = 'bar';
// // //                mode = undefined;
// // //           } else if (type === 'area') {
// // //                fill = 'tozeroy';
// // //           } else if (type === 'combo') {
// // //               // COMBO LOGIC: Check config for overrides
// // //               const specificType = config.seriesTypes?.[yKey] || (i === 0 ? 'bar' : 'scatter'); 
// // //               traceType = specificType === 'line' ? 'scatter' : specificType;
// // //               if (traceType === 'bar') mode = undefined;
// // //           }

// // //           return {
// // //             x: chartData.map(d => d[xAxis]),
// // //             y: chartData.map(d => d[yKey]),
// // //             type: traceType,
// // //             mode: mode,
// // //             fill: fill,
// // //             name: yKey.replace(/_/g, ' ').toUpperCase(),
// // //             marker: { color: config.colors?.[yKey] } 
// // //           };
// // //         });
// // //       }

// // //       if (type === 'stacked_bar') {
// // //           layout.barmode = 'stack';
// // //       }
// // //     }

// // //     // ---------------------------------------------------------
// // //     // PHASE 4: SMART FEATURES (Baselines)
// // //     // ---------------------------------------------------------
// // //     if (config.baseline?.enabled) {
// // //       const baseline = config.baseline;
// // //       layout.shapes = layout.shapes || [];
// // //       layout.shapes.push({
// // //         type: 'line',
// // //         xref: 'paper', x0: 0, x1: 1, // Full width
// // //         y0: baseline.value,
// // //         y1: baseline.value,
// // //         line: { color: baseline.color || '#ff4d4f', width: 2, dash: 'dash' },
// // //       });

// // //       if (baseline.label) {
// // //         layout.annotations = layout.annotations || [];
// // //         layout.annotations.push({
// // //           xref: 'paper', x: 1, y: baseline.value,
// // //           xanchor: 'right', yanchor: 'bottom',
// // //           text: baseline.label,
// // //           showarrow: false,
// // //           font: { color: baseline.color || '#ff4d4f', size: 10 },
// // //         });
// // //       }
// // //     }

// // //     // ---------------------------------------------------------
// // //     // PHASE 5: RENDER
// // //     // ---------------------------------------------------------
// // //     Plotly.react(chartRef.current, traces, layout, { 
// // //         displayModeBar: false, 
// // //         responsive: true,
// // //         displaylogo: false
// // //     }).then((instance) => {
// // //         plotlyInstance.current = instance;
// // //     });

// // //   }, [data, config, type]);

// // //   return <div ref={chartRef} className="w-full h-full" style={{ minHeight: '100%' }} />;
// // // };

// // // // ============================================================================
// // // // KPI WIDGET
// // // // ============================================================================

// // // export const KPIWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
// // //   const metricKey = config.metricKey || Object.keys(data[0] || {}).find(k => typeof data[0][k] === 'number');
// // //   const value = data[0]?.[metricKey!] || 0;
  
// // //   const trend = data[0]?.['trend'] || data[0]?.['change_pct'];
// // //   const isPositive = trend > 0;

// // //   return (
// // //     <div className="h-full flex flex-col items-center justify-center p-4">
// // //       <Statistic 
// // //         title={<span className="text-gray-500">{config.subtitle || ''}</span>}
// // //         value={value} 
// // //         precision={config.precision || 0}
// // //         prefix={config.prefix}
// // //         suffix={config.format === 'percent' ? '%' : config.suffix}
// // //         valueStyle={{ 
// // //             fontSize: config.fontSize || '2.5rem', 
// // //             fontWeight: 600, 
// // //             color: config.color || '#1f1f1f' 
// // //         }}
// // //       />
      
// // //       {trend !== undefined && (
// // //           <div className={`mt-2 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
// // //               {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
// // //               <span className="ml-1">{Math.abs(trend)}% vs last period</span>
// // //           </div>
// // //       )}
// // //     </div>
// // //   );
// // // };

// // // // ============================================================================
// // // // TABLE WIDGET
// // // // ============================================================================

// // // export const TableWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
// // //   // 1. Pre-process data for Sort/Limit if defined in config
// // //   // This mirrors the logic in BaseChart for consistency
// // //   let processedData = [...data];
  
// // //   // Sort
// // //   if (config.sort && config.sortBy) {
// // //      processedData.sort((a, b) => {
// // //        const valA = a[config.sortBy] || 0;
// // //        const valB = b[config.sortBy] || 0;
// // //        return config.sort === 'asc' ? valA - valB : valB - valA;
// // //      });
// // //   }
  
// // //   // Limit (Top N)
// // //   if (config.limit && typeof config.limit === 'number') {
// // //      processedData = processedData.slice(0, config.limit);
// // //   }

// // //   // 2. Column Generation
// // //   const columns = (config.columns || Object.keys(data[0] || {})).map((col: string) => ({
// // //     title: col.replace(/_/g, ' ').toUpperCase(),
// // //     dataIndex: col,
// // //     key: col,
// // //     ellipsis: true,
// // //     sorter: (a: any, b: any) => (a[col] > b[col] ? 1 : -1),
// // //     render: (val: any) => {
// // //         if (val === null || val === undefined) return <span className="text-gray-300">-</span>;
        
// // //         // Number Formatting
// // //         if (typeof val === 'number') {
// // //             if (col.toLowerCase().includes('price') || col.toLowerCase().includes('cost') || col.toLowerCase().includes('revenue')) {
// // //                  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
// // //             }
// // //             if (col.toLowerCase().includes('percent') || col.toLowerCase().includes('rate')) {
// // //                 const isRatio = val <= 1 && val > -1 && val !== 0; 
// // //                 return isRatio ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(1)}%`;
// // //             }
// // //             if (Number.isInteger(val)) return val.toLocaleString();
// // //             return val.toFixed(2);
// // //         }

// // //         // Status Tags (Heuristic)
// // //         if (typeof val === 'string' && ['status', 'priority', 'state'].some(k => col.toLowerCase().includes(k))) {
// // //             let color = 'default';
// // //             if (['high', 'critical', 'error', 'failed'].includes(val.toLowerCase())) color = 'red';
// // //             if (['medium', 'warning', 'pending'].includes(val.toLowerCase())) color = 'orange';
// // //             if (['low', 'success', 'completed', 'active'].includes(val.toLowerCase())) color = 'green';
// // //             return <Tag color={color}>{val.toUpperCase()}</Tag>;
// // //         }

// // //         return val;
// // //     }
// // //   }));

// // //   return (
// // //     <div className="h-full overflow-auto custom-scrollbar">
// // //       <Table
// // //         dataSource={processedData} // Use the processed (sorted/limited) data
// // //         columns={columns}
// // //         pagination={config.pagination === false ? false : { pageSize: config.pageSize || 5, size: 'small' }}
// // //         size="small"
// // //         rowKey={(r, i) => r.id || i.toString()} 
// // //         sticky
// // //         scroll={{ x: 'max-content' }}
// // //       />
// // //     </div>
// // //   );
// // // };


// // /**
// //  * WidgetRenderers.tsx
// //  * * SENIOR ARCHITECT DEV NOTES:
// //  * ---------------------------
// //  * 1. PERFORMANCE: Uses `Plotly.react` for high-performance diffing updates.
// //  * 2. LIFECYCLE: Single ResizeObserver instance per chart, throttled via rAF to prevent UI thrashing.
// //  * 3. STABILITY: Explicitly sets chart width/height to prevent Plotly's "Auto-margin redraw" loops.
// //  * 4. TABLE KEYS: Uses content-based hashing (JSON.stringify) for Row Keys to satisfy AntD strict mode and fix warnings.
// //  * 5. DATA PROCESSING: Handles client-side sorting and limiting (Top N) before rendering.
// //  */

// // import React, { useEffect, useRef } from 'react';
// // import { Statistic, Table, Alert, Spin, Tag } from 'antd';
// // import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
// // import Plotly from 'plotly.js-dist-min';
// // import _ from 'lodash';

// // // --- Types ---
// // export type ChartType = 
// //   | 'line' | 'area' | 'bar' | 'stacked_bar' | 'combo'
// //   | 'pie' | 'donut' 
// //   | 'funnel' | 'gauge' 
// //   | 'radar' | 'treemap' | 'sunburst';

// // // --- Generic Wrapper for Loading/Error States ---
// // export const WidgetWrapper: React.FC<any> = ({ data, loading, error, children }) => {
// //   if (loading) return (
// //     <div className="h-full w-full flex items-center justify-center">
// //       <Spin tip="Loading Data..." />
// //     </div>
// //   );
  
// //   if (error) return (
// //     <div className="h-full w-full p-4">
// //       <Alert message="Data Error" description={error} type="error" showIcon />
// //     </div>
// //   );
  
// //   if (!data || (Array.isArray(data) && data.length === 0)) return (
// //     <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
// //       <div className="text-2xl mb-2">∅</div>
// //       <div>No Data Available</div>
// //     </div>
// //   );
  
// //   return <div className="h-full w-full overflow-hidden relative">{children}</div>;
// // };

// // // ============================================================================
// // // UNIVERSAL CHART COMPONENT
// // // ============================================================================

// // export const BaseChart: React.FC<{
// //   type: ChartType;
// //   data: any[];
// //   config: any;
// //   layoutOverride?: any;
// // }> = ({ type, data, config, layoutOverride }) => {
// //   const chartRef = useRef<HTMLDivElement>(null);
// //   const resizeObserver = useRef<ResizeObserver | null>(null);
// //   const plotlyInstance = useRef<any>(null);

// //   // 1. LIFECYCLE: Handle ResizeObserver Only Once
// //   useEffect(() => {
// //     if (!chartRef.current) return;

// //     // Initialize Observer
// //     // FIX: Use requestAnimationFrame to throttle rapid resize events
// //     resizeObserver.current = new ResizeObserver(() => {
// //         window.requestAnimationFrame(() => {
// //             if (chartRef.current) {
// //              Plotly.Plots.resize(chartRef.current);
// //            }
// //         });
// //     });
    
// //     resizeObserver.current.observe(chartRef.current);

// //     // Cleanup on Unmount
// //     return () => {
// //       if (resizeObserver.current) resizeObserver.current.disconnect();
// //       if (chartRef.current) Plotly.purge(chartRef.current);
// //     };
// //   }, []);

// //   // 2. DATA RENDERER
// //   useEffect(() => {
// //     if (!chartRef.current || !data.length) return;

// //     // ---------------------------------------------------------
// //     // PHASE 1: CLIENT-SIDE DATA PROCESSING (Sort & Limit)
// //     // ---------------------------------------------------------
// //     let chartData = [...data];

// //     // A. Handle Sorting
// //     if (config.sort) {
// //        const sortKey = config.sortBy || (Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis) || 'value';
// //        chartData.sort((a, b) => {
// //            const valA = a[sortKey] || 0;
// //            const valB = b[sortKey] || 0;
// //            return config.sort === 'asc' ? valA - valB : valB - valA;
// //        });
// //     }

// //     // B. Handle Limiting (Top N)
// //     if (config.limit && typeof config.limit === 'number') {
// //         chartData = chartData.slice(0, config.limit);
// //     }

// //     // ---------------------------------------------------------
// //     // PHASE 2: CONFIGURATION & LAYOUT
// //     // ---------------------------------------------------------
    
// //     const xAxis = config.xAxis || config.labels || config.group_by || 'name';
// //     const yAxis = config.yAxis || config.values || 'value';
// //     const groupBy = config.groupBy; 

// //     let traces: any[] = [];

// //     // FIX: Get Explicit Dimensions to prevent "Auto-margin redraw" loop
// //     const { clientWidth, clientHeight } = chartRef.current;
    
// //     let layout: any = {
// //       width: clientWidth,   // <--- EXPLICIT WIDTH
// //       height: clientHeight, // <--- EXPLICIT HEIGHT
// //       autosize: false,      // <--- DISABLE AUTOSIZE (We handle it via container dimensions)
// //       margin: { l: 40, r: 20, t: 30, b: 40 },
// //       showlegend: true,
// //       legend: { orientation: 'h', y: -0.2 }, 
// //       xaxis: { tickangle: -45, automargin: true },
// //       yaxis: { automargin: true },
// //       font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" },
// //       ...layoutOverride
// //     };

// //     // ---------------------------------------------------------
// //     // PHASE 3: TRACE GENERATION STRATEGY
// //     // ---------------------------------------------------------

// //     // STRATEGY: PIE & DONUT
// //     if (type === 'pie' || type === 'donut') {
// //       traces = [{
// //         labels: chartData.map(d => d[xAxis]),
// //         values: chartData.map(d => d[yAxis]),
// //         type: 'pie',
// //         hole: type === 'donut' ? 0.4 : 0,
// //         textinfo: 'label+percent',
// //         textposition: 'outside',
// //         automargin: true,
// //         marker: { colors: config.colors || ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1'] }
// //       }];
// //     } 
    
// //     // STRATEGY: GAUGE (Single Value KPI)
// //     else if (type === 'gauge') {
// //       const val = chartData[0]?.[yAxis] || 0;
// //       const min = config.min || 0;
// //       const max = config.max || 100;
      
// //       traces = [{
// //         type: "indicator",
// //         mode: "gauge+number+delta",
// //         value: val,
// //         gauge: {
// //           axis: { range: [min, max] },
// //           bar: { color: "#1890ff" },
// //           steps: [
// //             { range: [min, max * 0.6], color: "#f0f5ff" },
// //             { range: [max * 0.6, max * 0.9], color: "#d6e4ff" },
// //             { range: [max * 0.9, max], color: "#adc6ff" }
// //           ],
// //           threshold: config.threshold ? {
// //             line: { color: "red", width: 4 },
// //             thickness: 0.75,
// //             value: config.threshold
// //           } : undefined
// //         }
// //       }];
// //       layout.margin = { t: 30, b: 30, l: 30, r: 30 };
// //     }

// //     // STRATEGY: RADAR (Spider Chart)
// //     else if (type === 'radar') {
// //        traces = [{
// //         type: 'scatterpolar',
// //         r: chartData.map(d => d[yAxis]),
// //         theta: chartData.map(d => d[xAxis]),
// //         fill: 'toself',
// //         name: config.title || 'Data',
// //         fillcolor: 'rgba(24, 144, 255, 0.2)',
// //         line: { color: '#1890ff' }
// //       }];
      
// //       layout.polar = {
// //         radialaxis: { visible: true, showline: true }, 
// //         angularaxis: { direction: 'clockwise' }
// //       };
// //     }

// //     // STRATEGY: TREEMAP
// //     else if (type === 'treemap') {
// //       traces = [{
// //         type: 'treemap',
// //         labels: chartData.map(d => d[config.labels || xAxis]),
// //         parents: chartData.map(d => d[config.parents || 'parent_id'] || ''), 
// //         values: chartData.map(d => d[config.values || yAxis]),
// //         textinfo: "label+value+percent parent",
// //         branchvalues: "total",
// //         marker: { colorscale: 'Blues' }
// //       }];
// //       layout.margin = { t: 0, l: 0, r: 0, b: 0 };
// //     }

// //     // STRATEGY: SUNBURST
// //     else if (type === 'sunburst') {
// //       traces = [{
// //         type: 'sunburst',
// //         labels: chartData.map(d => d[config.labels || xAxis]),
// //         parents: chartData.map(d => d[config.parents || 'parent_id'] || ''),
// //         values: chartData.map(d => d[config.values || yAxis]),
// //         textinfo: "label+value",
// //         outsidetextfont: { size: 14, color: "#377eb8" },
// //         leaf: { opacity: 0.4 },
// //         marker: { line: { width: 2 }, colorscale: 'Viridis' },
// //       }];
// //       layout.margin = { t: 0, l: 0, r: 0, b: 0 };
// //     }

// //     // STRATEGY: FUNNEL
// //     else if (type === 'funnel') {
// //         traces = [{
// //             type: 'funnel',
// //             y: chartData.map(d => d[xAxis]), 
// //             x: chartData.map(d => d[yAxis]), 
// //             textinfo: "value+percent initial",
// //             hoverinfo: "x+percent previous+percent initial",
// //             marker: { color: ["#1890ff", "#40a9ff", "#69c0ff", "#91d5ff", "#bae7ff"] }
// //         }];
// //     }

// //     // STRATEGY: CARTESIAN (Line, Bar, Area, Combo)
// //     else {
// //       const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis];
      
// //       // Grouping Logic (Stacked/Grouped Bars)
// //       if (groupBy) {
// //         const groupedData = _.groupBy(chartData, groupBy);
        
// //         traces = Object.keys(groupedData).map(groupName => {
// //            const groupRows = groupedData[groupName];
// //            return {
// //              x: groupRows.map(d => d[xAxis]),
// //              y: groupRows.map(d => d[yAxes[0]]), 
// //              type: type === 'stacked_bar' ? 'bar' : (type === 'area' ? 'scatter' : 'bar'),
// //              name: groupName,
// //              stackgroup: type === 'area' ? 'one' : undefined
// //            };
// //         });
// //       } else {
// //         // Standard Multi-Series
// //         traces = yAxes.map((yKey, i) => {
// //           let traceType = 'scatter'; 
// //           let mode = 'lines+markers';
// //           let fill = undefined;

// //           if (type === 'bar' || type === 'stacked_bar') {
// //                traceType = 'bar';
// //                mode = undefined;
// //           } else if (type === 'area') {
// //                fill = 'tozeroy';
// //           } else if (type === 'combo') {
// //               const specificType = config.seriesTypes?.[yKey] || (i === 0 ? 'bar' : 'scatter'); 
// //               traceType = specificType === 'line' ? 'scatter' : specificType;
// //               if (traceType === 'bar') mode = undefined;
// //           }

// //           return {
// //             x: chartData.map(d => d[xAxis]),
// //             y: chartData.map(d => d[yKey]),
// //             type: traceType,
// //             mode: mode,
// //             fill: fill,
// //             name: yKey.replace(/_/g, ' ').toUpperCase(),
// //             marker: { color: config.colors?.[yKey] } 
// //           };
// //         });
// //       }

// //       if (type === 'stacked_bar') {
// //           layout.barmode = 'stack';
// //       }
// //     }

// //     // ---------------------------------------------------------
// //     // PHASE 4: SMART FEATURES (Baselines)
// //     // ---------------------------------------------------------
// //     if (config.baseline?.enabled) {
// //       const baseline = config.baseline;
// //       layout.shapes = layout.shapes || [];
// //       layout.shapes.push({
// //         type: 'line',
// //         xref: 'paper', x0: 0, x1: 1, 
// //         y0: baseline.value,
// //         y1: baseline.value,
// //         line: { color: baseline.color || '#ff4d4f', width: 2, dash: 'dash' },
// //       });

// //       if (baseline.label) {
// //         layout.annotations = layout.annotations || [];
// //         layout.annotations.push({
// //           xref: 'paper', x: 1, y: baseline.value,
// //           xanchor: 'right', yanchor: 'bottom',
// //           text: baseline.label,
// //           showarrow: false,
// //           font: { color: baseline.color || '#ff4d4f', size: 10 },
// //         });
// //       }
// //     }

// //     // ---------------------------------------------------------
// //     // PHASE 5: RENDER
// //     // ---------------------------------------------------------
// //     Plotly.react(chartRef.current, traces, layout, { 
// //         displayModeBar: false, 
// //         responsive: true,
// //         displaylogo: false
// //     }).then((instance) => {
// //         plotlyInstance.current = instance;
// //     });

// //   }, [data, config, type]);

// //   return <div ref={chartRef} className="w-full h-full" style={{ minHeight: '100%' }} />;
// // };

// // // ============================================================================
// // // KPI WIDGET
// // // ============================================================================

// // export const KPIWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
// //   const metricKey = config.metricKey || Object.keys(data[0] || {}).find(k => typeof data[0][k] === 'number');
// //   const value = data[0]?.[metricKey!] || 0;
  
// //   const trend = data[0]?.['trend'] || data[0]?.['change_pct'];
// //   const isPositive = trend > 0;

// //   return (
// //     <div className="h-full flex flex-col items-center justify-center p-4">
// //       <Statistic 
// //         title={<span className="text-gray-500">{config.subtitle || ''}</span>}
// //         value={value} 
// //         precision={config.precision || 0}
// //         prefix={config.prefix}
// //         suffix={config.format === 'percent' ? '%' : config.suffix}
// //         valueStyle={{ 
// //             fontSize: config.fontSize || '2.5rem', 
// //             fontWeight: 600, 
// //             color: config.color || '#1f1f1f' 
// //         }}
// //       />
      
// //       {trend !== undefined && (
// //           <div className={`mt-2 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
// //               {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
// //               <span className="ml-1">{Math.abs(trend)}% vs last period</span>
// //           </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ============================================================================
// // // TABLE WIDGET
// // // ============================================================================

// // export const TableWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
// //   // 1. Pre-process data for Sort/Limit
// //   let processedData = [...data];
  
// //   if (config.sort && config.sortBy) {
// //      processedData.sort((a, b) => {
// //        const valA = a[config.sortBy] || 0;
// //        const valB = b[config.sortBy] || 0;
// //        return config.sort === 'asc' ? valA - valB : valB - valA;
// //      });
// //   }
  
// //   if (config.limit && typeof config.limit === 'number') {
// //      processedData = processedData.slice(0, config.limit);
// //   }

// //   // 2. Column Generation
// //   const columns = (config.columns || Object.keys(data[0] || {})).map((col: string) => ({
// //     title: col.replace(/_/g, ' ').toUpperCase(),
// //     dataIndex: col,
// //     key: col,
// //     ellipsis: true,
// //     sorter: (a: any, b: any) => (a[col] > b[col] ? 1 : -1),
// //     render: (val: any) => {
// //         if (val === null || val === undefined) return <span className="text-gray-300">-</span>;
        
// //         if (typeof val === 'number') {
// //             if (col.toLowerCase().includes('price') || col.toLowerCase().includes('cost') || col.toLowerCase().includes('revenue')) {
// //                  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
// //             }
// //             if (col.toLowerCase().includes('percent') || col.toLowerCase().includes('rate')) {
// //                 const isRatio = val <= 1 && val > -1 && val !== 0; 
// //                 return isRatio ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(1)}%`;
// //             }
// //             if (Number.isInteger(val)) return val.toLocaleString();
// //             return val.toFixed(2);
// //         }

// //         if (typeof val === 'string' && ['status', 'priority', 'state'].some(k => col.toLowerCase().includes(k))) {
// //             let color = 'default';
// //             if (['high', 'critical', 'error', 'failed'].includes(val.toLowerCase())) color = 'red';
// //             if (['medium', 'warning', 'pending'].includes(val.toLowerCase())) color = 'orange';
// //             if (['low', 'success', 'completed', 'active'].includes(val.toLowerCase())) color = 'green';
// //             return <Tag color={color}>{val.toUpperCase()}</Tag>;
// //         }

// //         return val;
// //     }
// //   }));

// //   return (
// //     <div className="h-full overflow-auto custom-scrollbar">
// //       <Table
// //         dataSource={processedData}
// //         columns={columns}
// //         pagination={config.pagination === false ? false : { pageSize: config.pageSize || 5, size: 'small' }}
// //         size="small"
// //         // FIX: Safe Key Generation for AntD using content hashing instead of index
// //         rowKey={(r) => r.id || JSON.stringify(r)} 
// //         sticky
// //         scroll={{ x: 'max-content' }}
// //       />
// //     </div>
// //   );
// // };



// // previous has auto marging, and works too  below also has too many auto margins
// /**
//  * WidgetRenderers.tsx
//  * * SENIOR ARCHITECT DEV NOTES:
//  * ---------------------------
//  * CRITICAL FIX: "Too many auto-margin redraws"
//  * The previous attempt to read clientWidth/Height manually is unreliable in grid layouts.
//  * The definitive fix is to DISABLE Plotly's `automargin` feature on axes. 
//  * We now use sufficient static margins and let Plotly fill the container naturally.
//  * This stops the CPU-thrashing layout loop that causes the UI to freeze.
//  */

// import React, { useEffect, useRef } from 'react';
// import { Statistic, Table, Alert, Spin, Tag } from 'antd';
// import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
// import Plotly from 'plotly.js-dist-min';
// import _ from 'lodash';

// // --- Types ---
// export type ChartType = 
//   | 'line' | 'area' | 'bar' | 'stacked_bar' | 'combo'
//   | 'pie' | 'donut' 
//   | 'funnel' | 'gauge' 
//   | 'radar' | 'treemap' | 'sunburst';

// // --- Generic Wrapper for Loading/Error States ---
// export const WidgetWrapper: React.FC<any> = ({ data, loading, error, children }) => {
//   // Using a slightly larger spinner and centering to ensure visibility
//   if (loading) return (
//     <div className="h-full w-full flex items-center justify-center bg-white/50 z-10">
//       <Spin size="large" tip="Loading Data..." />
//     </div>
//   );
  
//   if (error) return (
//     <div className="h-full w-full p-4 flex items-center">
//       <Alert message="Error loading widget" description={error} type="error" showIcon className="w-full" />
//     </div>
//   );
  
//   if (!data || (Array.isArray(data) && data.length === 0)) return (
//     <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
//       <div className="text-3xl mb-2">∅</div>
//       <div className="font-medium">No Data Available</div>
//     </div>
//   );
  
//   // Ensure the container is rigid so Plotly doesn't overflow
//   return <div className="h-full w-full overflow-hidden relative">{children}</div>;
// };

// // ============================================================================
// // UNIVERSAL CHART COMPONENT
// // ============================================================================

// export const BaseChart: React.FC<{
//   type: ChartType;
//   data: any[];
//   config: any;
//   layoutOverride?: any;
// }> = ({ type, data, config, layoutOverride }) => {
//   const chartRef = useRef<HTMLDivElement>(null);
//   const resizeObserver = useRef<ResizeObserver | null>(null);
//   const plotlyInstance = useRef<any>(null);

//   // 1. LIFECYCLE: Handle ResizeObserver Only Once
//   useEffect(() => {
//     if (!chartRef.current) return;

//     // Initialize Observer with throttling
//     resizeObserver.current = new ResizeObserver(() => {
//         // throttle the resize call to prevent thrashing during drags
//         window.requestAnimationFrame(() => {
//             if (chartRef.current && plotlyInstance.current) {
//              Plotly.Plots.resize(chartRef.current);
//            }
//         });
//     });
    
//     resizeObserver.current.observe(chartRef.current);

//     // Cleanup on Unmount
//     return () => {
//       if (resizeObserver.current) resizeObserver.current.disconnect();
//       if (chartRef.current) Plotly.purge(chartRef.current);
//       plotlyInstance.current = null;
//     };
//   }, []);

//   // 2. DATA RENDERER
//   useEffect(() => {
//     if (!chartRef.current || !data.length) return;

//     // ---------------------------------------------------------
//     // PHASE 1: CLIENT-SIDE DATA PROCESSING (Sort & Limit)
//     // ---------------------------------------------------------
//     let chartData = [...data];

//     if (config.sort) {
//        const sortKey = config.sortBy || (Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis) || 'value';
//        chartData.sort((a, b) => {
//            const valA = a[sortKey] || 0;
//            const valB = b[sortKey] || 0;
//            return config.sort === 'asc' ? valA - valB : valB - valA;
//        });
//     }

//     if (config.limit && typeof config.limit === 'number') {
//         chartData = chartData.slice(0, config.limit);
//     }

//     // ---------------------------------------------------------
//     // PHASE 2: CONFIGURATION & LAYOUT
//     // ---------------------------------------------------------
    
//     const xAxis = config.xAxis || config.labels || config.group_by || 'name';
//     const yAxis = config.yAxis || config.values || 'value';
//     const groupBy = config.groupBy; 

//     let traces: any[] = [];

//     // --- CRITICAL FIX FOR AUTO-MARGIN BUG ---
//     // 1. We do NOT set explicit width/height here. We let CSS handle it.
//     // 2. We set explicit, safe static margins.
//     // 3. We DISABLE automargin on axes to stop the calculation loop.
//     let layout: any = {
//       autosize: true, 
//       // Use safe static margins that should fit most labels
//       margin: { l: 60, r: 25, t: 40, b: 60 }, 
//       showlegend: true,
//       legend: { orientation: 'h', y: -0.25, xanchor: 'center', x: 0.5 }, 
//       xaxis: { 
//           tickangle: -45, 
//           automargin: false, // <--- DISABLE THIS
//           fixedrange: true  // disable zooming on standard charts for stability
//       },
//       yaxis: { 
//           automargin: false, // <--- DISABLE THIS
//           fixedrange: true 
//       },
//       font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", size: 11 },
//       paper_bgcolor: 'transparent',
//       plot_bgcolor: 'transparent',
//       ...layoutOverride
//     };

//     // ---------------------------------------------------------
//     // PHASE 3: TRACE GENERATION STRATEGY
//     // ---------------------------------------------------------

//     if (type === 'pie' || type === 'donut') {
//       traces = [{
//         labels: chartData.map(d => d[xAxis]),
//         values: chartData.map(d => d[yAxis]),
//         type: 'pie',
//         hole: type === 'donut' ? 0.4 : 0,
//         textinfo: 'label+percent',
//         textposition: 'outside',
//         // Pie charts need automargin to fit outside labels, they are less prone to the bug
//         automargin: true, 
//         marker: { colors: config.colors || ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1'] }
//       }];
//       // Pie charts need different margin handling
//       layout.margin = { l: 40, r: 40, t: 40, b: 40 };
//       delete layout.xaxis;
//       delete layout.yaxis;
//     } 
    
//     else if (type === 'gauge') {
//       const val = chartData[0]?.[yAxis] || 0;
//       const min = config.min || 0;
//       const max = config.max || 100;
      
//       traces = [{
//         type: "indicator",
//         mode: "gauge+number+delta",
//         value: val,
//         gauge: {
//           axis: { range: [min, max] },
//           bar: { color: "#1890ff" },
//           steps: [
//             { range: [min, max * 0.6], color: "#f0f5ff" },
//             { range: [max * 0.6, max * 0.9], color: "#d6e4ff" },
//             { range: [max * 0.9, max], color: "#adc6ff" }
//           ],
//           threshold: config.threshold ? {
//             line: { color: "red", width: 4 },
//             thickness: 0.75,
//             value: config.threshold
//           } : undefined
//         }
//       }];
//       layout.margin = { t: 40, b: 40, l: 40, r: 40 };
//       delete layout.xaxis;
//       delete layout.yaxis;
//     }

//     else if (type === 'radar') {
//        traces = [{
//         type: 'scatterpolar',
//         r: chartData.map(d => d[yAxis]),
//         theta: chartData.map(d => d[xAxis]),
//         fill: 'toself',
//         name: config.title || 'Data',
//         fillcolor: 'rgba(24, 144, 255, 0.2)',
//         line: { color: '#1890ff' }
//       }];
      
//       layout.polar = {
//         radialaxis: { visible: true, showline: true }, 
//         angularaxis: { direction: 'clockwise' }
//       };
//       delete layout.xaxis;
//       delete layout.yaxis;
//     }

//     else if (type === 'treemap') {
//       traces = [{
//         type: 'treemap',
//         labels: chartData.map(d => d[config.labels || xAxis]),
//         parents: chartData.map(d => d[config.parents || 'parent_id'] || ''), 
//         values: chartData.map(d => d[config.values || yAxis]),
//         textinfo: "label+value+percent parent",
//         branchvalues: "total",
//         marker: { colorscale: 'Blues' },
//         hovertemplate: '<b>%{label}</b><br>Value: %{value}<br>Parent: %{parent}<extra></extra>'
//       }];
//       layout.margin = { t: 0, l: 0, r: 0, b: 0 };
//       delete layout.xaxis;
//       delete layout.yaxis;
//     }

//     else if (type === 'sunburst') {
//       traces = [{
//         type: 'sunburst',
//         labels: chartData.map(d => d[config.labels || xAxis]),
//         parents: chartData.map(d => d[config.parents || 'parent_id'] || ''),
//         values: chartData.map(d => d[config.values || yAxis]),
//         textinfo: "label+value",
//         outsidetextfont: { size: 14, color: "#377eb8" },
//         leaf: { opacity: 0.4 },
//         marker: { line: { width: 2 }, colorscale: 'Viridis' },
//       }];
//       layout.margin = { t: 0, l: 0, r: 0, b: 0 };
//       delete layout.xaxis;
//       delete layout.yaxis;
//     }

//     else if (type === 'funnel') {
//         traces = [{
//             type: 'funnel',
//             y: chartData.map(d => d[xAxis]), 
//             x: chartData.map(d => d[yAxis]), 
//             textinfo: "value+percent initial",
//             hoverinfo: "x+percent previous+percent initial",
//             marker: { color: ["#1890ff", "#40a9ff", "#69c0ff", "#91d5ff", "#bae7ff"] }
//         }];
//         layout.margin = { l: 100 }; // Funnels need more left margin for labels
//         delete layout.xaxis;
//         delete layout.yaxis;
//     }

//     // CARTESIAN (Line, Bar, Area, Combo)
//     else {
//       const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis];
      
//       if (groupBy) {
//         const groupedData = _.groupBy(chartData, groupBy);
//         traces = Object.keys(groupedData).map(groupName => {
//            const groupRows = groupedData[groupName];
//            return {
//              x: groupRows.map(d => d[xAxis]),
//              y: groupRows.map(d => d[yAxes[0]]), 
//              type: type === 'stacked_bar' ? 'bar' : (type === 'area' ? 'scatter' : 'bar'),
//              name: groupName,
//              stackgroup: type === 'area' ? 'one' : undefined,
//              marker: { color: config.colors?.[groupName] }
//            };
//         });
//       } else {
//         traces = yAxes.map((yKey, i) => {
//           let traceType = 'scatter'; 
//           let mode = 'lines+markers';
//           let fill = undefined;

//           if (type === 'bar' || type === 'stacked_bar') {
//                traceType = 'bar';
//                mode = undefined;
//           } else if (type === 'area') {
//                fill = 'tozeroy';
//           } else if (type === 'combo') {
//               const specificType = config.seriesTypes?.[yKey] || (i === 0 ? 'bar' : 'scatter'); 
//               traceType = specificType === 'line' ? 'scatter' : specificType;
//               if (traceType === 'bar') mode = undefined;
//           }

//           return {
//             x: chartData.map(d => d[xAxis]),
//             y: chartData.map(d => d[yKey]),
//             type: traceType,
//             mode: mode,
//             fill: fill,
//             name: yKey.replace(/_/g, ' ').toUpperCase(),
//             marker: { color: config.colors?.[yKey] },
//             line: traceType === 'scatter' ? { shape: 'spline' } : undefined // Smoothing lines
//           };
//         });
//       }

//       if (type === 'stacked_bar') {
//           layout.barmode = 'stack';
//       }
//     }

//     // ---------------------------------------------------------
//     // PHASE 4: SMART FEATURES (Baselines)
//     // ---------------------------------------------------------
//     if (config.baseline?.enabled) {
//       const baseline = config.baseline;
//       layout.shapes = layout.shapes || [];
//       layout.shapes.push({
//         type: 'line',
//         xref: 'paper', x0: 0, x1: 1, 
//         y0: baseline.value,
//         y1: baseline.value,
//         line: { color: baseline.color || '#ff4d4f', width: 2, dash: 'dash' },
//       });

//       if (baseline.label) {
//         layout.annotations = layout.annotations || [];
//         layout.annotations.push({
//           xref: 'paper', x: 1, y: baseline.value,
//           xanchor: 'right', yanchor: 'bottom',
//           text: baseline.label,
//           showarrow: false,
//           font: { color: baseline.color || '#ff4d4f', size: 10 },
//           bgcolor: 'rgba(255,255,255,0.8)'
//         });
//       }
//     }

//     // ---------------------------------------------------------
//     // PHASE 5: RENDER
//     // ---------------------------------------------------------
//     // Use Plotly.react for efficient diffing
//     Plotly.react(chartRef.current, traces, layout, { 
//         displayModeBar: false, 
//         responsive: true, // Rely on Plotly's internal responsive handler
//         displaylogo: false,
//         scrollZoom: false
//     }).then((instance) => {
//         plotlyInstance.current = instance;
//     });

//   }, [data, config, type]);

//   // Force container to take full space and hide overflow to prevent scrollbar jitter
//   return <div ref={chartRef} className="w-full h-full overflow-hidden" style={{ minHeight: '100%' }} />;
// };

// // ============================================================================
// // KPI WIDGET
// // ============================================================================

// export const KPIWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
//   const metricKey = config.metricKey || Object.keys(data[0] || {}).find(k => typeof data[0][k] === 'number');
//   const value = data[0]?.[metricKey!] || 0;
  
//   const trend = data[0]?.['trend'] || data[0]?.['change_pct'];
//   const isPositive = trend > 0;

//   return (
//     <div className="h-full flex flex-col items-center justify-center p-4 relative">
//       <Statistic 
//         title={<span className="text-gray-500 text-sm uppercase tracking-wide">{config.subtitle || config.title || ''}</span>}
//         value={value} 
//         precision={config.precision !== undefined ? config.precision : (Number.isInteger(value) ? 0 : 2)}
//         prefix={config.prefix}
//         suffix={config.format === 'percent' ? '%' : config.suffix}
//         valueStyle={{ 
//             fontSize: config.fontSize || '2.5rem', 
//             fontWeight: 700, 
//             color: config.color || '#1f1f1f',
//             lineHeight: 1.2
//         }}
//       />
      
//       {trend !== undefined && trend !== null && (
//           <div className={`mt-3 text-sm font-medium flex items-center px-2 py-1 rounded-full ${isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
//               {isPositive ? <ArrowUpOutlined className="mr-1"/> : <ArrowDownOutlined className="mr-1"/>}
//               <span>{Math.abs(trend)}% {config.trendLabel || 'vs last period'}</span>
//           </div>
//       )}
//     </div>
//   );
// };

// // ============================================================================
// // TABLE WIDGET
// // ============================================================================

// export const TableWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
//   // 1. Pre-process data for Sort/Limit
//   let processedData = [...data];
  
//   if (config.sort && config.sortBy) {
//      processedData.sort((a, b) => {
//        const valA = a[config.sortBy] || 0;
//        const valB = b[config.sortBy] || 0;
//        return config.sort === 'asc' ? valA - valB : valB - valA;
//      });
//   }
  
//   if (config.limit && typeof config.limit === 'number') {
//      processedData = processedData.slice(0, config.limit);
//   }

//   // 2. Column Generation
//   const columns = (config.columns || Object.keys(data[0] || {})).map((col: string) => ({
//     title: col.replace(/_/g, ' ').toUpperCase(),
//     dataIndex: col,
//     key: col,
//     ellipsis: true,
//     sorter: (a: any, b: any) => {
//         const valA = a[col] || 0;
//         const valB = b[col] || 0;
//         if(typeof valA === 'string') return valA.localeCompare(valB);
//         return valA - valB;
//     },
//     render: (val: any) => {
//         if (val === null || val === undefined) return <span className="text-gray-300">-</span>;
        
//         if (typeof val === 'number') {
//             if (col.toLowerCase().includes('price') || col.toLowerCase().includes('cost') || col.toLowerCase().includes('revenue')) {
//                  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
//             }
//             if (col.toLowerCase().includes('percent') || col.toLowerCase().includes('rate')) {
//                 const isRatio = val <= 1 && val > -1 && val !== 0; 
//                 return isRatio ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(1)}%`;
//             }
//             if (Number.isInteger(val)) return val.toLocaleString();
//             return val.toFixed(2);
//         }

//         if (typeof val === 'string' && ['status', 'priority', 'state'].some(k => col.toLowerCase().includes(k))) {
//             let color = 'default';
//             const lowerVal = val.toLowerCase();
//             if (['high', 'critical', 'error', 'failed', 'rejected'].includes(lowerVal)) color = 'red';
//             else if (['medium', 'warning', 'pending', 'in progress'].includes(lowerVal)) color = 'orange';
//             else if (['low', 'success', 'completed', 'active', 'approved'].includes(lowerVal)) color = 'green';
//             else if (['open', 'new'].includes(lowerVal)) color = 'blue';
//             return <Tag color={color}>{val.toUpperCase()}</Tag>;
//         }

//         return val;
//     }
//   }));

//   return (
//     <div className="h-full w-full overflow-hidden rounded-lg bg-white">
//       <Table
//         dataSource={processedData}
//         columns={columns}
//         pagination={config.pagination === false ? false : { pageSize: config.pageSize || 5, size: 'small', hideOnSinglePage: true }}
//         size="middle"
//         // Safe Key Generation for AntD using content hashing
//         rowKey={(r) => r.id || JSON.stringify(r)} 
//         scroll={{ x: 'max-content', y: config.height || 300 }}
//         className="h-full"
//       />
//     </div>
//   );
// };

/**
 * WidgetRenderers.tsx
 * * SENIOR ARCHITECT DEV NOTES:
 * ---------------------------
 * CRITICAL STABILITY FIX: "CSS ISOLATION STRATEGY"
 * 1. PROBLEM: React-Grid-Layout + Plotly creates a resize loop ("Too many auto-margin redraws").
 * 2. SOLUTION: We use an "Absolute/Relative" CSS lock. 
 * - The Parent is `relative`.
 * - The Chart div is `absolute inset-0`.
 * This physically prevents Plotly from affecting the parent's dimensions, breaking the loop.
 * 3. AUTOMARGINS: Strictly disabled (`automargin: false`) to prevent internal Plotly calc loops.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Statistic, Table, Alert, Spin, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import Plotly from 'plotly.js-dist-min';
import _ from 'lodash';

// --- Types ---
export type ChartType = 
  | 'line' | 'area' | 'bar' | 'stacked_bar' | 'combo'
  | 'pie' | 'donut' 
  | 'funnel' | 'gauge' 
  | 'radar' | 'treemap' | 'sunburst';

// --- Generic Wrapper for Loading/Error States ---
export const WidgetWrapper: React.FC<any> = ({ data, loading, error, children }) => {
  if (loading) return (
    <div className="h-full w-full flex items-center justify-center bg-white/50 z-10">
      <Spin size="large" tip="Loading Data..." />
    </div>
  );
  
  if (error) return (
    <div className="h-full w-full p-4 flex items-center">
      <Alert message="Error loading widget" description={error} type="error" showIcon className="w-full" />
    </div>
  );
  
  if (!data || (Array.isArray(data) && data.length === 0)) return (
    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
      <div className="text-3xl mb-2">∅</div>
      <div className="font-medium">No Data Available</div>
    </div>
  );
  
  // CSS ISOLATION: relative container allows children to be absolute
  return <div className="h-full w-full relative overflow-hidden">{children}</div>;
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
  const plotlyInstance = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  // 1. LIFECYCLE: Initialize & Observer
  useEffect(() => {
    setIsMounted(true);
    
    if (!chartRef.current) return;

    // Use a debounced resize observer to prevent rapid firing
    const resizeObserver = new ResizeObserver((entries) => {
       if (!Array.isArray(entries) || !entries.length) return;
       
       window.requestAnimationFrame(() => {
          // Check if element is still in DOM and has dimensions
          if (chartRef.current && chartRef.current.clientWidth > 0 && chartRef.current.clientHeight > 0) {
             Plotly.Plots.resize(chartRef.current);
          }
       });
    });
    
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) Plotly.purge(chartRef.current);
    };
  }, []);

  // 2. DATA RENDERER
  useEffect(() => {
    // Safety check: Ensure ref exists, data exists, and container has size (prevents 0-height crashes)
    if (!chartRef.current || !data.length) return;
    
    // Wait for mount to ensure DOM layout is settled
    if (!isMounted) return;

    // ---------------------------------------------------------
    // PHASE 1: CLIENT-SIDE DATA PROCESSING
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // PHASE 2: CONFIGURATION & LAYOUT
    // ---------------------------------------------------------
    const xAxis = config.xAxis || config.labels || config.group_by || 'name';
    const yAxis = config.yAxis || config.values || 'value';
    const groupBy = config.groupBy; 

    let traces: any[] = [];

    // GLOBAL LAYOUT CONFIG
    // STRICT: automargin disabled to prevent loops
    let layout: any = {
      autosize: true, 
      margin: { l: 50, r: 20, t: 30, b: 50, pad: 4 }, 
      showlegend: true,
      legend: { orientation: 'h', y: -0.2 }, 
      xaxis: { 
          tickangle: -45, 
          automargin: false, // STRICT DISABLE
          fixedrange: true 
      },
      yaxis: { 
          automargin: false, // STRICT DISABLE
          fixedrange: true 
      },
      font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", size: 11 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      ...layoutOverride
    };

    // ---------------------------------------------------------
    // PHASE 3: TRACE GENERATION
    // ---------------------------------------------------------

    if (type === 'pie' || type === 'donut') {
      traces = [{
        labels: chartData.map(d => d[xAxis]),
        values: chartData.map(d => d[yAxis]),
        type: 'pie',
        hole: type === 'donut' ? 0.4 : 0,
        textinfo: 'label+percent',
        textposition: 'outside',
        // Pie charts usually handle automargin safely, but we can be explicit
        automargin: true, 
        marker: { colors: config.colors || ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1'] }
      }];
      layout.margin = { l: 40, r: 40, t: 40, b: 40 }; // Even margins for circle
      delete layout.xaxis;
      delete layout.yaxis;
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
          axis: { range: [min, max] },
          bar: { color: "#1890ff" },
          steps: [
            { range: [min, max * 0.6], color: "#f0f5ff" },
            { range: [max * 0.6, max * 0.9], color: "#d6e4ff" },
            { range: [max * 0.9, max], color: "#adc6ff" }
          ],
          threshold: config.threshold ? {
            line: { color: "red", width: 4 },
            thickness: 0.75,
            value: config.threshold
          } : undefined
        }
      }];
      layout.margin = { t: 30, b: 30, l: 30, r: 30 };
      delete layout.xaxis;
      delete layout.yaxis;
    }

    else if (type === 'radar') {
       traces = [{
        type: 'scatterpolar',
        r: chartData.map(d => d[yAxis]),
        theta: chartData.map(d => d[xAxis]),
        fill: 'toself',
        name: config.title || 'Data',
        fillcolor: 'rgba(24, 144, 255, 0.2)',
        line: { color: '#1890ff' }
      }];
      layout.polar = {
        radialaxis: { visible: true, showline: true }, 
        angularaxis: { direction: 'clockwise' }
      };
      delete layout.xaxis;
      delete layout.yaxis;
    }

    else if (type === 'treemap') {
      traces = [{
        type: 'treemap',
        labels: chartData.map(d => d[config.labels || xAxis]),
        parents: chartData.map(d => d[config.parents || 'parent_id'] || ''), 
        values: chartData.map(d => d[config.values || yAxis]),
        textinfo: "label+value+percent parent",
        branchvalues: "total",
        marker: { colorscale: 'Blues' }
      }];
      layout.margin = { t: 0, l: 0, r: 0, b: 0 };
      delete layout.xaxis;
      delete layout.yaxis;
    }

    else if (type === 'sunburst') {
      traces = [{
        type: 'sunburst',
        labels: chartData.map(d => d[config.labels || xAxis]),
        parents: chartData.map(d => d[config.parents || 'parent_id'] || ''),
        values: chartData.map(d => d[config.values || yAxis]),
        textinfo: "label+value",
        outsidetextfont: { size: 14, color: "#377eb8" },
        leaf: { opacity: 0.4 },
        marker: { line: { width: 2 }, colorscale: 'Viridis' },
      }];
      layout.margin = { t: 0, l: 0, r: 0, b: 0 };
      delete layout.xaxis;
      delete layout.yaxis;
    }

    else if (type === 'funnel') {
        traces = [{
            type: 'funnel',
            y: chartData.map(d => d[xAxis]), 
            x: chartData.map(d => d[yAxis]), 
            textinfo: "value+percent initial",
            hoverinfo: "x+percent previous+percent initial",
            marker: { color: ["#1890ff", "#40a9ff", "#69c0ff", "#91d5ff", "#bae7ff"] }
        }];
        layout.margin = { l: 100 }; 
        delete layout.xaxis;
        delete layout.yaxis;
    }

    else {
      // CARTESIAN (Line, Bar, Area, Combo)
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
             stackgroup: type === 'area' ? 'one' : undefined,
             marker: { color: config.colors?.[groupName] }
           };
        });
      } else {
        traces = yAxes.map((yKey, i) => {
          let traceType = 'scatter'; 
          let mode = 'lines+markers';
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

          return {
            x: chartData.map(d => d[xAxis]),
            y: chartData.map(d => d[yKey]),
            type: traceType,
            mode: mode,
            fill: fill,
            name: yKey.replace(/_/g, ' ').toUpperCase(),
            marker: { color: config.colors?.[yKey] },
            line: traceType === 'scatter' ? { shape: 'spline' } : undefined
          };
        });
      }

      if (type === 'stacked_bar') {
          layout.barmode = 'stack';
      }
    }

    // ---------------------------------------------------------
    // PHASE 4: SMART FEATURES (Baselines)
    // ---------------------------------------------------------
    if (config.baseline?.enabled) {
      const baseline = config.baseline;
      layout.shapes = layout.shapes || [];
      layout.shapes.push({
        type: 'line',
        xref: 'paper', x0: 0, x1: 1, 
        y0: baseline.value,
        y1: baseline.value,
        line: { color: baseline.color || '#ff4d4f', width: 2, dash: 'dash' },
      });

      if (baseline.label) {
        layout.annotations = layout.annotations || [];
        layout.annotations.push({
          xref: 'paper', x: 1, y: baseline.value,
          xanchor: 'right', yanchor: 'bottom',
          text: baseline.label,
          showarrow: false,
          font: { color: baseline.color || '#ff4d4f', size: 10 },
          bgcolor: 'rgba(255,255,255,0.8)'
        });
      }
    }

    // ---------------------------------------------------------
    // PHASE 5: RENDER
    // ---------------------------------------------------------
    // Double check ref before calling React
    if(chartRef.current) {
        Plotly.react(chartRef.current, traces, layout, { 
            displayModeBar: false, 
            responsive: true,
            displaylogo: false,
            scrollZoom: false
        }).then((instance) => {
            plotlyInstance.current = instance;
        }).catch(err => {
            console.warn("Plotly Render Warning:", err);
        });
    }

  }, [data, config, type, isMounted]);

  // --- CSS ISOLATION ---
  // Absolute positioning ensures this div takes up space but doesn't push parent
  return (
    <div 
        ref={chartRef} 
        className="absolute inset-0 w-full h-full" 
        // Inline style fallback for safety
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
    />
  );
};

// ============================================================================
// KPI WIDGET (UNCHANGED - SAFE)
// ============================================================================

export const KPIWidget: React.FC<{ data: any[]; config: any }> = ({ data, config }) => {
  const metricKey = config.metricKey || Object.keys(data[0] || {}).find(k => typeof data[0][k] === 'number');
  const value = data[0]?.[metricKey!] || 0;
  
  const trend = data[0]?.['trend'] || data[0]?.['change_pct'];
  const isPositive = trend > 0;

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 relative">
      <Statistic 
        title={<span className="text-gray-500 text-sm uppercase tracking-wide">{config.subtitle || config.title || ''}</span>}
        value={value} 
        precision={config.precision !== undefined ? config.precision : (Number.isInteger(value) ? 0 : 2)}
        prefix={config.prefix}
        suffix={config.format === 'percent' ? '%' : config.suffix}
        valueStyle={{ 
            fontSize: config.fontSize || '2.5rem', 
            fontWeight: 700, 
            color: config.color || '#1f1f1f',
            lineHeight: 1.2
        }}
      />
      
      {trend !== undefined && trend !== null && (
          <div className={`mt-3 text-sm font-medium flex items-center px-2 py-1 rounded-full ${isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
              {isPositive ? <ArrowUpOutlined className="mr-1"/> : <ArrowDownOutlined className="mr-1"/>}
              <span>{Math.abs(trend)}% {config.trendLabel || 'vs last period'}</span>
          </div>
      )}
    </div>
  );
};

// ============================================================================
// TABLE WIDGET (UNCHANGED - SAFE)
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
        if(typeof valA === 'string') return valA.localeCompare(valB);
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
    <div className="h-full w-full overflow-hidden rounded-lg bg-white">
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