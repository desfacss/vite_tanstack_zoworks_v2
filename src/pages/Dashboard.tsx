// // // // // // // import React, { useState, useEffect, useRef, useCallback } from 'react';
// // // // // // // import { Card, Row, Col, Table, Tag, Statistic, Spin, Typography, Alert, Select, Button } from 'antd';
// // // // // // // import {
// // // // // // //   BarChartOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, FileDoneOutlined,
// // // // // // //   ExclamationCircleOutlined, HourglassOutlined, CalendarOutlined, BuildOutlined,
// // // // // // //   FolderOpenOutlined, LineChartOutlined, PieChartOutlined, UsergroupAddOutlined, SyncOutlined
// // // // // // // import Plotly from 'plotly.js-dist-min';
// // // // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // // // import { supabase } from '../lib/supabase';
// // // // // // // import { groupBy, map, sumBy } from 'lodash';

// // // // // // // const { Title, Text } = Typography;
// // // // // // // const { Option } = Select;

// // // // // // // // ====================================================================
// // // // // // // // SECTION 1: API & Data Structures
// // // // // // // // ====================================================================

// // // // // // // /**
// // // // // // //  * Fetches metric data from the Supabase RPC function.
// // // // // // //  */
// // // // // // // const fetchMetricData = async (params: {
// // // // // // //   viewName: string;
// // // // // // //   organizationId: string;
// // // // // // //   locationId?: string | null;
// // // // // // //   forceRefresh?: boolean;
// // // // // // // }): Promise<any> => {
// // // // // // //   console.log(`%c[API Request] -> view: ${params.viewName}, forceRefresh: ${params.forceRefresh}`, 'color: blue; font-weight: bold;', params);
// // // // // // //   try {
// // // // // // //     const { data, error } = await supabase.rpc('fn_get_or_calc_metric_data', {
// // // // // // //       p_view_name: params.viewName,
// // // // // // //       p_org_id: params.organizationId,
// // // // // // //       p_loc_id: params.locationId,
// // // // // // //       p_force_refresh: params.forceRefresh || false
// // // // // // //     });
// // // // // // //     if (error) { throw new Error(error.message); }
// // // // // // //     console.log(`%c[API Response] <- view: ${params.viewName}`, 'color: green;', data);
// // // // // // //     return data || [];
// // // // // // //   } catch (err: any) {
// // // // // // //     console.error(`%c[API Error] !! view: ${params.viewName}`, 'color: red; font-weight: bold;', err);
// // // // // // //     throw err;
// // // // // // //   }
// // // // // // // };

// // // // // // // // --- TypeScript Interfaces for each view's data shape ---
// // // // // // // interface IOverallKpis { total_tickets: number; resolved_tickets_count: number; open_tickets_count: number; average_mttr_hours: number | null; first_time_fix_rate_pct: number; average_tasks_per_ticket: number; }
// // // // // // // interface IAssetHealthKpis { total_assets: number; }
// // // // // // // interface IAccountSummary { account_name: string; total_work_hours: number | null; open_tickets: number; }
// // // // // // // interface IAgentPerformance { agent_name: string; total_tickets_handled: number; average_mttr_hours: number; first_time_fix_rate_pct: number; }
// // // // // // // interface IStageSummary { stage_name: string; average_duration_hours: number; }
// // // // // // // interface IDailyAgentActivity { agent_name: string; work_date: string; tasks_completed: number; total_hours_worked: number; }
// // // // // // // interface IWeeklyTrend { week_start_date: string; total_tickets: number; completed_tickets: number; }
// // // // // // // // This single, powerful interface replaces multiple older ones.
// // // // // // // interface IAssetSummary { asset_id: string; asset_display_id: string; organization_id: string; location_id: string; account_id: string; account_name: string; asset_category_name: string; contract_id: string; contract_display_id: string; total_tickets: number; total_work_hours: number | null; }

// // // // // // // // Generic state shape for each widget.
// // // // // // // interface WidgetState<T> { data: T | null; loading: boolean; error: string | null; }

// // // // // // // // ====================================================================
// // // // // // // // SECTION 2: Dashboard Component
// // // // // // // // ====================================================================

// // // // // // // const Dashboard: React.FC = () => {
// // // // // // //   const { organization, location } = useAuthStore();

// // // // // // //   // --- STATE MANAGEMENT ---
// // // // // // //   const [overallKpis, setOverallKpis] = useState<WidgetState<IOverallKpis>>({ data: null, loading: true, error: null });
// // // // // // //   const [assetHealth, setAssetHealth] = useState<WidgetState<IAssetHealthKpis>>({ data: null, loading: true, error: null });
// // // // // // //   const [accountSummary, setAccountSummary] = useState<WidgetState<IAccountSummary[]>>({ data: null, loading: true, error: null });
// // // // // // //   const [agentLeaderboard, setAgentLeaderboard] = useState<WidgetState<IAgentPerformance[]>>({ data: null, loading: true, error: null });
// // // // // // //   const [processBottlenecks, setProcessBottlenecks] = useState<WidgetState<IStageSummary[]>>({ data: null, loading: true, error: null });
// // // // // // //   const [dailyAgentActivity, setDailyAgentActivity] = useState<WidgetState<IDailyAgentActivity[]>>({ data: null, loading: true, error: null });
// // // // // // //   const [weeklyPerformance, setWeeklyPerformance] = useState<WidgetState<IWeeklyTrend[]>>({ data: null, loading: true, error: null });
// // // // // // //   const [assetSummaryData, setAssetSummaryData] = useState<WidgetState<IAssetSummary[]>>({ data: null, loading: true, error: null });
// // // // // // //   const [assetGroup, setAssetGroup] = useState<'asset_category_name' | 'contract_display_id' | 'account_name'>('asset_category_name');
// // // // // // //   const [isRefreshing, setIsRefreshing] = useState(false);
// // // // // // //   const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

// // // // // // //   // --- PLOTLY CHART REFS ---
// // // // // // //   const accountsChartRef = useRef<HTMLDivElement>(null);
// // // // // // //   const assetTicketsChartRef = useRef<HTMLDivElement>(null);
// // // // // // //   const bottlenecksChartRef = useRef<HTMLDivElement>(null);
// // // // // // //   const weeklyTrendChartRef = useRef<HTMLDivElement>(null);
// // // // // // //   const assetGroupChartRef = useRef<HTMLDivElement>(null);

// // // // // // //   // --- DATA FETCHING (Refactored for Stability) ---
// // // // // // //   const fetchAllData = useCallback(async (forceRefresh = false) => {
// // // // // // //     if (!organization?.id) return;
// // // // // // //     setIsRefreshing(true);

// // // // // // //     // This helper function centralizes the logic for fetching and setting state for any widget.
// // // // // // //     const fetchDataForWidget = async <T,>(viewName: string, setState: React.Dispatch<React.SetStateAction<WidgetState<T>>>) => {
// // // // // // //         setState(s => ({ ...s, loading: true, error: null }));
// // // // // // //         try {
// // // // // // //             const result = await fetchMetricData({ viewName, organizationId: organization.id, locationId: location?.id, forceRefresh });
// // // // // // //             const finalData = Array.isArray(result) && result.length === 1 && viewName.startsWith('kpi_') ? result[0] : result;
// // // // // // //             setState({ data: finalData, loading: false, error: null });
// // // // // // //         } catch (err: any) {
// // // // // // //             setState({ data: null, loading: false, error: err.message });
// // // // // // //         }
// // // // // // //     };

// // // // // // //     // All standard widgets are fetched in parallel for performance.
// // // // // // //     await Promise.all([
// // // // // // //         fetchDataForWidget('kpi_overall_performance', setOverallKpis),
// // // // // // //         fetchDataForWidget('kpi_asset_health', setAssetHealth),
// // // // // // //         fetchDataForWidget('av_accounts_summary', setAccountSummary),
// // // // // // //         fetchDataForWidget('av_agents_performance_summary', setAgentLeaderboard),
// // // // // // //         fetchDataForWidget('av_stage_summary', setProcessBottlenecks),
// // // // // // //         fetchDataForWidget('av_agents_daily_summary', setDailyAgentActivity),
// // // // // // //         fetchDataForWidget('av_weekly_performance', setWeeklyPerformance),
// // // // // // //         fetchDataForWidget('av_assets_summary', setAssetSummaryData),
// // // // // // //     ]);

// // // // // // //     setIsRefreshing(false);
// // // // // // //     // Set the refresh time on the first load or on a manual refresh.
// // // // // // //     if (forceRefresh || !lastRefresh) {
// // // // // // //         setLastRefresh(new Date());
// // // // // // //     }
// // // // // // //   }, [organization, location]); // This function is stable and only changes when org/location changes.

// // // // // // //   // --- EFFECT TRIGGERS ---

// // // // // // //   // This effect handles the initial data load and re-fetches when the org/location changes.
// // // // // // //   useEffect(() => {
// // // // // // //     fetchAllData();
// // // // // // //   }, [fetchAllData]);

// // // // // // //   // The refresh button simply calls the main fetch function with the 'forceRefresh' flag.
// // // // // // //   const handleRefresh = () => {
// // // // // // //     fetchAllData(true);
// // // // // // //   };

// // // // // // //   // --- PLOTLY CHART RENDERING (All hooks implemented) ---

// // // // // // //   // Renders the "Top 5 Accounts by Work Hours" chart.
// // // // // // //   useEffect(() => {
// // // // // // //     if (accountSummary.data && accountsChartRef.current) {
// // // // // // //       const validData = accountSummary.data.filter(d => d.total_work_hours != null);
// // // // // // //       const sortedData = [...validData].sort((a,b) => (b.total_work_hours || 0) - (a.total_work_hours || 0));
// // // // // // //       Plotly.newPlot(accountsChartRef.current, [{
// // // // // // //           y: sortedData.map(d => d.account_name).slice(0, 5),
// // // // // // //           x: sortedData.map(d => d.total_work_hours).slice(0, 5),
// // // // // // //           type: 'bar', orientation: 'h', marker: { color: '#1890ff' },
// // // // // // //       }], { height: 300, margin: { l: 150, r: 20, t: 20, b: 40 }, xaxis: { title: 'Total Work Hours' }, yaxis: { automargin: true, autorange: 'reversed' } }, { displayModeBar: false, responsive: true });
// // // // // // //     }
// // // // // // //   }, [accountSummary.data]);

// // // // // // //   // Renders the "Tickets by Asset Category" pie chart by aggregating the detailed asset data.
// // // // // // //   useEffect(() => {
// // // // // // //     if (assetSummaryData.data && assetTicketsChartRef.current) {
// // // // // // //       const groupedData = groupBy(assetSummaryData.data, 'asset_category_name');
// // // // // // //       const aggregatedData = map(groupedData, (assets, category) => ({
// // // // // // //         asset_category_name: category,
// // // // // // //         number_of_tickets: sumBy(assets, 'total_tickets'),
// // // // // // //       })).sort((a, b) => b.number_of_tickets - a.number_of_tickets);

// // // // // // //       Plotly.newPlot(assetTicketsChartRef.current, [{
// // // // // // //           labels: aggregatedData.map(d => d.asset_category_name).slice(0, 5),
// // // // // // //           values: aggregatedData.map(d => d.number_of_tickets).slice(0, 5),
// // // // // // //           type: 'pie', hole: 0.4, textinfo: 'label+percent', automargin: true
// // // // // // //       }], { height: 300, showlegend: false, margin: { l: 10, r: 10, t: 10, b: 10 } }, { displayModeBar: false, responsive: true });
// // // // // // //     }
// // // // // // //   }, [assetSummaryData.data]);

// // // // // // //   // Renders the "Top Process Bottlenecks" chart.
// // // // // // //    useEffect(() => {
// // // // // // //     if (processBottlenecks.data && bottlenecksChartRef.current) {
// // // // // // //       const validData = processBottlenecks.data.filter(d => d.average_duration_hours != null);
// // // // // // //       const sortedData = [...validData].sort((a,b) => b.average_duration_hours - a.average_duration_hours);
// // // // // // //       Plotly.newPlot(bottlenecksChartRef.current, [{
// // // // // // //           y: sortedData.map(d => d.stage_name).slice(0, 5),
// // // // // // //           x: sortedData.map(d => d.average_duration_hours).slice(0, 5),
// // // // // // //           type: 'bar', orientation: 'h', marker: { color: '#faad14' },
// // // // // // //       }], { height: 300, margin: { l: 150, r: 20, t: 20, b: 40 }, xaxis: { title: 'Avg. Hours in Stage' }, yaxis: { automargin: true, autorange: 'reversed' } }, { displayModeBar: false, responsive: true });
// // // // // // //     }
// // // // // // //   }, [processBottlenecks.data]);

// // // // // // //   // Renders the "Weekly Performance Trends" chart.
// // // // // // //   useEffect(() => {
// // // // // // //     if (weeklyPerformance.data && weeklyTrendChartRef.current) {
// // // // // // //       const sortedData = [...weeklyPerformance.data].sort((a,b) => new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime());
// // // // // // //       Plotly.newPlot(weeklyTrendChartRef.current, [{ x: sortedData.map(d => d.week_start_date), y: sortedData.map(d => d.completed_tickets), type: 'scatter', mode: 'lines+markers', name: 'Tickets Resolved' }, { x: sortedData.map(d => d.week_start_date), y: sortedData.map(d => d.total_tickets), type: 'bar', name: 'Total Tickets Created' }], { height: 300, margin: { l: 50, r: 20, t: 30, b: 50 }, legend: { x: 0, y: 1.2, orientation: 'h' } }, { displayModeBar: false, responsive: true });
// // // // // // //     }
// // // // // // //   }, [weeklyPerformance.data]);

// // // // // // //   // Renders the "Asset Distribution" chart based on the dropdown selection.
// // // // // // //   useEffect(() => {
// // // // // // //     if (assetSummaryData.data && assetGroupChartRef.current) {
// // // // // // //       const groupedData = groupBy(assetSummaryData.data, assetGroup);
// // // // // // //       const aggregatedData = map(groupedData, (assets, groupName) => ({
// // // // // // //         group_name: groupName === 'null' ? 'N/A' : groupName, // Handle null group names
// // // // // // //         asset_count: assets.length,
// // // // // // //       })).sort((a, b) => b.asset_count - a.asset_count);

// // // // // // //       Plotly.newPlot(assetGroupChartRef.current, [{ y: aggregatedData.map(d => d.group_name).slice(0, 7), x: aggregatedData.map(d => d.asset_count).slice(0, 7), type: 'bar', orientation: 'h', marker: { color: '#52c41a' } }], { height: 300, margin: { l: 150, r: 20, t: 20, b: 40 }, xaxis: { title: 'Number of Assets' }, yaxis: { automargin: true, autorange: 'reversed' } }, { displayModeBar: false, responsive: true });
// // // // // // //     }
// // // // // // //   }, [assetSummaryData.data, assetGroup]);

// // // // // // //   // --- RENDER METHOD ---
// // // // // // //   if (!organization?.id) { return <Alert message="No Organization Selected" type="warning" showIcon />; }

// // // // // // //   const WidgetWrapper: React.FC<{ title: string; icon?: React.ReactNode; loading: boolean; error: string | null; children: React.ReactNode; extra?: React.ReactNode; }> = ({ title, icon, loading, error, children, extra }) => (
// // // // // // //     <Card title={<><span style={{ marginRight: 8 }}>{icon}</span>{title}</>} extra={extra} style={{ height: '100%' }}>
// // // // // // //       {loading ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}><Spin /></div>
// // // // // // //       : error ? <Alert message="Error" description={error} type="error" showIcon />
// // // // // // //       : children
// // // // // // //       }
// // // // // // //     </Card>
// // // // // // //   );

// // // // // // //   return (
// // // // // // //     <div className='p-4'>
// // // // // // //       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
// // // // // // //         <Title level={2}>Operations Dashboard</Title>
// // // // // // //         <div>
// // // // // // //           {lastRefresh && <Text type="secondary" style={{ marginRight: 16 }}>Last Refresh: {lastRefresh.toLocaleTimeString()}</Text>}
// // // // // // //           <Button icon={<SyncOutlined spin={isRefreshing} />} onClick={handleRefresh} disabled={isRefreshing}>Refresh Data</Button>
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       {/* ROW 1: KPIs */}
// // // // // // //       <Row gutter={[16, 16]}>
// // // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Total Tickets" loading={overallKpis.loading} error={overallKpis.error}><Statistic value={overallKpis.data?.total_tickets ?? 0} prefix={<FileDoneOutlined />} /></WidgetWrapper></Col>
// // // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Open Tickets" loading={overallKpis.loading} error={overallKpis.error}><Statistic value={overallKpis.data?.open_tickets_count ?? 0} prefix={<FolderOpenOutlined />} /></WidgetWrapper></Col>
// // // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Avg Resolution Time" loading={overallKpis.loading} error={overallKpis.error}><Statistic value={overallKpis.data?.average_mttr_hours ?? 0} precision={1} suffix=" hrs" prefix={<ClockCircleOutlined />} /></WidgetWrapper></Col>
// // // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="First-Time Fix Rate" loading={overallKpis.loading} error={overallKpis.error}><Statistic value={overallKpis.data?.first_time_fix_rate_pct ?? 0} precision={1} suffix="%" prefix={<CheckCircleOutlined />} /></WidgetWrapper></Col>
// // // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Avg Visits / Ticket" loading={overallKpis.loading} error={overallKpis.error}><Statistic value={overallKpis.data?.average_tasks_per_ticket ?? 0} precision={2} prefix={<UsergroupAddOutlined />} /></WidgetWrapper></Col>
// // // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Assets Under Mngmt" loading={assetHealth.loading} error={assetHealth.error}><Statistic value={assetHealth.data?.total_assets ?? 0} prefix={<BuildOutlined />} /></WidgetWrapper></Col>
// // // // // // //       </Row>

// // // // // // //       {/* ROW 2: Main Charts */}
// // // // // // //       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
// // // // // // //         <Col xs={24} lg={12}><WidgetWrapper title="Weekly Performance Trends" icon={<LineChartOutlined />} loading={weeklyPerformance.loading} error={weeklyPerformance.error}><div ref={weeklyTrendChartRef} style={{ width: '100%', height: '300px' }} /></WidgetWrapper></Col>
// // // // // // //         <Col xs={24} lg={12}>
// // // // // // //           <WidgetWrapper
// // // // // // //             title="Asset Distribution"
// // // // // // //             icon={<BarChartOutlined />}
// // // // // // //             loading={assetSummaryData.loading}
// // // // // // //             error={assetSummaryData.error}
// // // // // // //             extra={<Select value={assetGroup} size="small" onChange={(value) => setAssetGroup(value)}><Option value="asset_category_name">by Category</Option><Option value="contract_display_id">by Contract</Option><Option value="account_name">by Account</Option></Select>}
// // // // // // //           >
// // // // // // //             <div ref={assetGroupChartRef} style={{ width: '100%', height: '300px' }} />
// // // // // // //           </WidgetWrapper>
// // // // // // //         </Col>
// // // // // // //       </Row>

// // // // // // //       {/* ROW 3: More Charts */}
// // // // // // //       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
// // // // // // //         <Col xs={24} lg={8}><WidgetWrapper title="Top 5 Accounts by Work Hours" icon={<TeamOutlined />} loading={accountSummary.loading} error={accountSummary.error}><div ref={accountsChartRef} style={{ width: '100%', height: '300px' }} /></WidgetWrapper></Col>
// // // // // // //         <Col xs={24} lg={8}><WidgetWrapper title="Tickets by Asset Category" icon={<PieChartOutlined />} loading={assetSummaryData.loading} error={assetSummaryData.error}><div ref={assetTicketsChartRef} style={{ width: '100%', height: '300px' }} /></WidgetWrapper></Col>
// // // // // // //         <Col xs={24} lg={8}><WidgetWrapper title="Top Process Bottlenecks" icon={<HourglassOutlined />} loading={processBottlenecks.loading} error={processBottlenecks.error}><div ref={bottlenecksChartRef} style={{ width: '100%', height: '300px' }} /></WidgetWrapper></Col>
// // // // // // //       </Row>

// // // // // // //       {/* ROW 4: Tables */}
// // // // // // //       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
// // // // // // //         <Col xs={24} lg={16}><WidgetWrapper title="Agent Performance Leaderboard" icon={<TeamOutlined />} loading={agentLeaderboard.loading} error={agentLeaderboard.error}>
// // // // // // //             <Table
// // // // // // //               dataSource={agentLeaderboard.data ? [...agentLeaderboard.data].sort((a,b) => b.total_tickets_handled - a.total_tickets_handled) : []}
// // // // // // //               columns={[
// // // // // // //                 { title: 'Agent Name', dataIndex: 'agent_name', key: 'agent_name' },
// // // // // // //                 { title: 'Tickets Handled', dataIndex: 'total_tickets_handled', key: 'tickets', align: 'center' },
// // // // // // //                 { title: 'Avg. Resolution Time (Hrs)', dataIndex: 'average_mttr_hours', key: 'mttr', align: 'center', render: (val) => val?.toFixed(1) },
// // // // // // //                 { title: 'First-Time Fix Rate', dataIndex: 'first_time_fix_rate_pct', key: 'ftfr', align: 'center', render: (val) => val ? <Tag color={val > 85 ? 'green' : 'orange'}>{val.toFixed(1)}%</Tag> : 'N/A' },
// // // // // // //               ]}
// // // // // // //               pagination={{ pageSize: 5, hideOnSinglePage: true }} size="small" rowKey="agent_name"
// // // // // // //             />
// // // // // // //           </WidgetWrapper></Col>
// // // // // // //         <Col xs={24} lg={8}><WidgetWrapper title="Accounts Requiring Attention" icon={<ExclamationCircleOutlined />} loading={accountSummary.loading} error={accountSummary.error}>
// // // // // // //             <Table
// // // // // // //               dataSource={accountSummary.data ? [...accountSummary.data].sort((a,b) => b.open_tickets - a.open_tickets).slice(0, 5) : []}
// // // // // // //               columns={[
// // // // // // //                 { title: 'Account Name', dataIndex: 'account_name', key: 'account_name'},
// // // // // // //                 { title: 'Open Tickets', dataIndex: 'open_tickets', key: 'open_tickets', align: 'center', render: (val) => <Tag color="red">{val}</Tag> },
// // // // // // //               ]}
// // // // // // //               pagination={false} size="small" rowKey="account_name"
// // // // // // //             />
// // // // // // //           </WidgetWrapper></Col>
// // // // // // //       </Row>

// // // // // // //       {/* ROW 5: More Tables */}
// // // // // // //       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
// // // // // // //         <Col span={24}><WidgetWrapper title="Recent Agent Activity" icon={<CalendarOutlined />} loading={dailyAgentActivity.loading} error={dailyAgentActivity.error}>
// // // // // // //             <Table
// // // // // // //               dataSource={dailyAgentActivity.data ? [...dailyAgentActivity.data].sort((a, b) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime()) : []}
// // // // // // //               columns={[
// // // // // // //                 { title: 'Date', dataIndex: 'work_date', key: 'date', render: (date) => new Date(date).toLocaleDateString() },
// // // // // // //                 { title: 'Agent Name', dataIndex: 'agent_name', key: 'agent_name' },
// // // // // // //                 { title: 'Tasks Completed', dataIndex: 'tasks_completed', key: 'tasks', align: 'center' },
// // // // // // //                 { title: 'Hours Worked', dataIndex: 'total_hours_worked', key: 'hours', align: 'center', render: (val) => val?.toFixed(1) },
// // // // // // //               ]}
// // // // // // //               pagination={{ pageSize: 5, hideOnSinglePage: true }} size="small" rowKey={(record) => `${record.agent_name}-${record.work_date}`}
// // // // // // //             />
// // // // // // //           </WidgetWrapper></Col>
// // // // // // //       </Row>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };

// // // // // // // export default Dashboard;


// // // // // // import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
// // // // // // import { Card, Row, Col, Table, Tag, Statistic, Spin, Typography, Alert, Select, Button } from 'antd';
// // // // // // import {
// // // // // //   BarChartOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, FileDoneOutlined,
// // // // // //   ExclamationCircleOutlined, HourglassOutlined, CalendarOutlined, BuildOutlined,
// // // // // //   FolderOpenOutlined, LineChartOutlined, PieChartOutlined, UsergroupAddOutlined, SyncOutlined
// // // // // // import Plotly from 'plotly.js-dist-min';
// // // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // // import { supabase } from '../lib/supabase';
// // // // // // import { groupBy, map, sumBy } from 'lodash';
// // // // // // import { subscribeToPushNotifications } from '../components/utils/push-notifications';

// // // // // // const { Title, Text } = Typography;
// // // // // // const { Option } = Select;

// // // // // // // ====================================================================
// // // // // // // SECTION 1: API & Data Structures
// // // // // // // ====================================================================

// // // // // // const fetchMetricData = async (params: {
// // // // // //   viewName: string;
// // // // // //   organizationId: string;
// // // // // //   locationId?: string | null;
// // // // // //   forceRefresh?: boolean;
// // // // // // }): Promise<any> => {
// // // // // //   console.log(`%c[API Request] -> view: ${params.viewName}, forceRefresh: ${params.forceRefresh}`, 'color: blue; font-weight: bold;', params);
// // // // // //   try {
// // // // // //     // Change the RPC name to fn_get_or_calc_metric_data_v2
// // // // // //     const { data, error } = await supabase.rpc('fn_get_or_calc_metric_data_v2', {
// // // // // //       p_view_name: params.viewName,
// // // // // //       p_org_id: params.organizationId,
// // // // // //       p_loc_id: params.locationId,
// // // // // //       p_force_refresh: params.forceRefresh || false
// // // // // //     });
// // // // // //     if (error) { throw new Error(error.message); }

// // // // // //     // The RPC now returns { data, lastCalculatedAt }
// // // // // //     const { data: resultData, lastCalculatedAt } = data;

// // // // // //     console.log(`%c[API Response] <- view: ${params.viewName}, calculated at: ${lastCalculatedAt}`, 'color: green;', data);

// // // // // //     // Return an object containing both the data and the timestamp
// // // // // //     return { data: resultData || [], lastCalculatedAt };
// // // // // //   } catch (err: any) {
// // // // // //     console.error(`%c[API Error] !! view: ${params.viewName}`, 'color: red; font-weight: bold;', err);
// // // // // //     throw err;
// // // // // //   }
// // // // // // };

// // // // // // // --- TypeScript Interfaces ---
// // // // // // interface IOverallKpis { total_tickets: number; resolved_tickets_count: number; open_tickets_count: number; average_mttr_hours: number | null; first_time_fix_rate_pct: number; average_tasks_per_ticket: number; }
// // // // // // interface IAssetHealthKpis { total_assets: number; }
// // // // // // interface IAccountSummary { account_name: string; total_work_hours: number | null; open_tickets: number; }
// // // // // // interface IAssetSummary { asset_id: string; asset_display_id: string; organization_id: string; location_id: string; account_id: string; account_name: string; asset_category_name: string; contract_id: string; contract_display_id: string; total_tickets: number; total_work_hours: number | null; }
// // // // // // interface IAgentPerformance { agent_name: string; total_tickets_handled: number; average_mttr_hours: number; first_time_fix_rate_pct: number; }
// // // // // // interface IStageSummary { stage_name: string; average_duration_hours: number; }
// // // // // // interface IDailyAgentActivity { agent_name: string; work_date: string; tasks_completed: number; total_hours_worked: number; }
// // // // // // interface IWeeklyTrend { week_start_date: string; total_tickets: number; completed_tickets: number; }

// // // // // // // ====================================================================
// // // // // // // SECTION 2: State Management with useReducer
// // // // // // // ====================================================================

// // // // // // type DashboardState = {
// // // // // //   [key: string]: { data: any | null; loading: boolean; error: string | null };
// // // // // // };

// // // // // // const initialState: DashboardState = {
// // // // // //   overallKpis: { data: null, loading: true, error: null },
// // // // // //   assetHealth: { data: null, loading: true, error: null },
// // // // // //   accountSummary: { data: [], loading: true, error: null },
// // // // // //   agentLeaderboard: { data: [], loading: true, error: null },
// // // // // //   processBottlenecks: { data: [], loading: true, error: null },
// // // // // //   dailyAgentActivity: { data: [], loading: true, error: null },
// // // // // //   weeklyPerformance: { data: [], loading: true, error: null },
// // // // // //   assetSummaryData: { data: [], loading: true, error: null },
// // // // // // };

// // // // // // type Action =
// // // // // //   | { type: 'FETCH_INIT'; payload: { widget: string } }
// // // // // //   | { type: 'FETCH_SUCCESS'; payload: { widget: string; data: any } }
// // // // // //   | { type: 'FETCH_ERROR'; payload: { widget: string; error: string } };

// // // // // // function dashboardReducer(state: DashboardState, action: Action): DashboardState {
// // // // // //   switch (action.type) {
// // // // // //     case 'FETCH_INIT':
// // // // // //       return { ...state, [action.payload.widget]: { ...state[action.payload.widget], loading: true, error: null } };
// // // // // //     case 'FETCH_SUCCESS':
// // // // // //       return { ...state, [action.payload.widget]: { data: action.payload.data, loading: false, error: null } };
// // // // // //     case 'FETCH_ERROR':
// // // // // //       return { ...state, [action.payload.widget]: { ...state[action.payload.widget], loading: false, error: action.payload.error } };
// // // // // //     default:
// // // // // //       throw new Error();
// // // // // //   }
// // // // // // }

// // // // // // // ====================================================================
// // // // // // // SECTION 3: Dashboard Component
// // // // // // // ====================================================================

// // // // // // const Dashboard: React.FC = () => {
// // // // // //   const { organization, location } = useAuthStore();
// // // // // //   const [state, dispatch] = useReducer(dashboardReducer, initialState);
// // // // // //   const [assetGroup, setAssetGroup] = useState<'asset_category_name' | 'contract_display_id' | 'account_name'>('account_name');
// // // // // //   const [isRefreshing, setIsRefreshing] = useState(false);
// // // // // //   const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
// // // // // //   // Separate state for the install prompt
// // // // // //   const [installPromptEvent, setInstallPromptEvent] = useState<Event | null>(null);

// // // // // //   // --- NEW: A separate state for notification permission ---
// // // // // //   const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');

// // // // // //   // Check and update notification permission status on component mount
// // // // // //   useEffect(() => {
// // // // // //     if (!('Notification' in window)) {
// // // // // //       setNotificationStatus('unsupported');
// // // // // //     } else {
// // // // // //       setNotificationStatus(Notification.permission);
// // // // // //     }
// // // // // //   }, []);

// // // // // //   const handleSubscribeNotifications = async () => {
// // // // // //     // Call the subscription function
// // // // // //     await subscribeToPushNotifications();
// // // // // //     // Update the status after the attempt
// // // // // //     setNotificationStatus(Notification.permission);
// // // // // //   };

// // // // // //   // A2HS prompt listener (Unchanged, but now we only set the event)
// // // // // //   useEffect(() => {
// // // // // //     const handler = (e: any) => {
// // // // // //       e.preventDefault();
// // // // // //       setInstallPromptEvent(e);
// // // // // //       console.log('beforeinstallprompt event captured');
// // // // // //     };
// // // // // //     window.addEventListener('beforeinstallprompt', handler);

// // // // // //     return () => window.removeEventListener('beforeinstallprompt', handler);
// // // // // //   }, []);

// // // // // //   const handleInstallClick = () => {
// // // // // //     if (installPromptEvent) {
// // // // // //       // Use the stored event to show the prompt
// // // // // //       (installPromptEvent as any).prompt();
// // // // // //       (installPromptEvent as any).userChoice.then((choiceResult: any) => {
// // // // // //         if (choiceResult.outcome === 'accepted') {
// // // // // //           message.success('App installed successfully!');
// // // // // //         } else {
// // // // // //           message.info('App installation dismissed.');
// // // // // //         }
// // // // // //         setInstallPromptEvent(null);
// // // // // //       });
// // // // // //     }
// // // // // //   };

// // // // // //   // --- PLOTLY CHART REFS ---
// // // // // //   const accountsChartRef = useRef<HTMLDivElement>(null);
// // // // // //   const assetTicketsChartRef = useRef<HTMLDivElement>(null);
// // // // // //   const bottlenecksChartRef = useRef<HTMLDivElement>(null);
// // // // // //   const weeklyTrendChartRef = useRef<HTMLDivElement>(null);
// // // // // //   const assetGroupChartRef = useRef<HTMLDivElement>(null);

// // // // // //   // --- DATA FETCHING (Refactored to use dispatch) ---
// // // // // //   const lastRequestId = useRef(0); // Add this ref

// // // // // //   const fetchAllData = useCallback(async (forceRefresh = false) => {
// // // // // //     if (!organization?.id) return;

// // // // // //     const currentRequestId = ++lastRequestId.current;
// // // // // //     setIsRefreshing(true);
// // // // // //     setLastRefresh(null); 

// // // // // //     const widgetConfig = [
// // // // // //     { view: 'kpi_overall_performance', widget: 'overallKpis' },
// // // // // //     { view: 'kpi_asset_health', widget: 'assetHealth' },
// // // // // //     { view: 'av_accounts_summary', widget: 'accountSummary' },
// // // // // //     { view: 'av_agents_performance_summary', widget: 'agentLeaderboard' },
// // // // // //     { view: 'av_stage_summary', widget: 'processBottlenecks' },
// // // // // //     { view: 'av_agents_daily_summary', widget: 'dailyAgentActivity' },
// // // // // //     { view: 'av_weekly_performance', widget: 'weeklyPerformance' },
// // // // // //     { view: 'av_assets_summary', widget: 'assetSummaryData' },
// // // // // //   ];

// // // // // //     // Create a variable to hold the latest timestamp from the results
// // // // // //     let latestTimestamp: Date | null = null; 

// // // // // //     widgetConfig.forEach(item => dispatch({ type: 'FETCH_INIT', payload: { widget: item.widget } }));

// // // // // //     const promises = widgetConfig.map(item =>
// // // // // //         fetchMetricData({
// // // // // //             viewName: item.view,
// // // // // //             organizationId: organization.id,
// // // // // //             locationId: location?.id,
// // // // // //             forceRefresh
// // // // // //         }).then(result => {
// // // // // //             // Update latestTimestamp if this result is newer
// // // // // //             const resultDate = new Date(result.lastCalculatedAt);
// // // // // //             if (!latestTimestamp || resultDate > latestTimestamp) {
// // // // // //                 latestTimestamp = resultDate;
// // // // // //             }

// // // // // //             const finalData = Array.isArray(result.data) && result.data.length === 1 && item.view.startsWith('kpi_') ? result.data[0] : result.data;
// // // // // //             return { status: 'fulfilled', data: finalData, widget: item.widget };
// // // // // //         }).catch(error => {
// // // // // //             return { status: 'rejected', error: error.message, widget: item.widget };
// // // // // //         })
// // // // // //     );

// // // // // //     const results = await Promise.allSettled(promises);

// // // // // //     if (lastRequestId.current === currentRequestId) {
// // // // // //         results.forEach(result => {
// // // // // //       if (result.status === 'fulfilled') {
// // // // // //         dispatch({ type: 'FETCH_SUCCESS', payload: { widget: result.value.widget, data: result.value.data } });
// // // // // //       } else {
// // // // // //         dispatch({ type: 'FETCH_ERROR', payload: { widget: result.reason.widget, error: result.reason.error } });
// // // // // //       }
// // // // // //         });

// // // // // //         setIsRefreshing(false);

// // // // // //         // Update the lastRefresh state with the latest timestamp from the backend
// // // // // //         if (latestTimestamp) {
// // // // // //             setLastRefresh(latestTimestamp);
// // // // // //         }
// // // // // //     }
// // // // // // }, [organization, location]);

// // // // // //   // Effect for initial data load
// // // // // //   useEffect(() => {
// // // // // //     if (organization?.id) {
// // // // // //       fetchAllData();
// // // // // //     }
// // // // // //   }, [organization, location]); // Re-fetch all data when org or location changes.

// // // // // //   const handleRefresh = () => {
// // // // // //     if (organization?.id) {
// // // // // //       fetchAllData(true);
// // // // // //     }
// // // // // //   };

// // // // // //   // --- PLOTLY CHART RENDERING (Fully Implemented) ---
// // // // // //   useEffect(() => {
// // // // // //     if (state.accountSummary.data && accountsChartRef.current) {
// // // // // //       const validData = state.accountSummary.data.filter((d: IAccountSummary) => d.total_work_hours != null);
// // // // // //       const sortedData = [...validData].sort((a,b) => (b.total_work_hours || 0) - (a.total_work_hours || 0));
// // // // // //       Plotly.newPlot(accountsChartRef.current, [{ y: sortedData.map(d => d.account_name).slice(0, 5), x: sortedData.map(d => d.total_work_hours).slice(0, 5), type: 'bar', orientation: 'h', marker: { color: '#1890ff' }, }], { height: 300, margin: { l: 150, r: 20, t: 20, b: 40 }, xaxis: { title: 'Total Work Hours' }, yaxis: { automargin: true, autorange: 'reversed' } }, { displayModeBar: false, responsive: true });
// // // // // //     }
// // // // // //   }, [state.accountSummary.data]);

// // // // // //   useEffect(() => {
// // // // // //     if (state.assetSummaryData.data && assetTicketsChartRef.current) {
// // // // // //       const groupedData = groupBy(state.assetSummaryData.data, 'asset_category_name');
// // // // // //       const aggregatedData = map(groupedData, (assets: IAssetSummary[], category) => ({
// // // // // //         asset_category_name: category,
// // // // // //         number_of_tickets: sumBy(assets, 'total_tickets'),
// // // // // //       })).sort((a, b) => b.number_of_tickets - a.number_of_tickets);
// // // // // //       Plotly.newPlot(assetTicketsChartRef.current, [{ labels: aggregatedData.map(d => d.asset_category_name).slice(0, 5), values: aggregatedData.map(d => d.number_of_tickets).slice(0, 5), type: 'pie', hole: 0.4, textinfo: 'label+percent', automargin: true }], { height: 300, showlegend: false, margin: { l: 10, r: 10, t: 10, b: 10 } }, { displayModeBar: false, responsive: true });
// // // // // //     }
// // // // // //   }, [state.assetSummaryData.data]);

// // // // // //   useEffect(() => {
// // // // // //     if (state.processBottlenecks.data && bottlenecksChartRef.current) {
// // // // // //       const validData = state.processBottlenecks.data.filter((d: IStageSummary) => d.average_duration_hours != null);
// // // // // //       const sortedData = [...validData].sort((a,b) => b.average_duration_hours - a.average_duration_hours);
// // // // // //       Plotly.newPlot(bottlenecksChartRef.current, [{ y: sortedData.map(d => d.stage_name).slice(0, 5), x: sortedData.map(d => d.average_duration_hours).slice(0, 5), type: 'bar', orientation: 'h', marker: { color: '#faad14' }, }], { height: 300, margin: { l: 150, r: 20, t: 20, b: 40 }, xaxis: { title: 'Avg. Hours in Stage' }, yaxis: { automargin: true, autorange: 'reversed' } }, { displayModeBar: false, responsive: true });
// // // // // //     }
// // // // // //   }, [state.processBottlenecks.data]);

// // // // // //   useEffect(() => {
// // // // // //     if (state.weeklyPerformance.data && weeklyTrendChartRef.current) {
// // // // // //       const sortedData = [...state.weeklyPerformance.data].sort((a: IWeeklyTrend, b: IWeeklyTrend) => new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime());
// // // // // //       Plotly.newPlot(weeklyTrendChartRef.current, [{ x: sortedData.map(d => d.week_start_date), y: sortedData.map(d => d.completed_tickets), type: 'scatter', mode: 'lines+markers', name: 'Tickets Resolved' }, { x: sortedData.map(d => d.week_start_date), y: sortedData.map(d => d.total_tickets), type: 'bar', name: 'Total Tickets Created' }], { height: 300, margin: { l: 50, r: 20, t: 30, b: 50 }, legend: { x: 0, y: 1.2, orientation: 'h' } }, { displayModeBar: false, responsive: true });
// // // // // //     }
// // // // // //   }, [state.weeklyPerformance.data]);

// // // // // //   useEffect(() => {
// // // // // //     if (state.assetSummaryData.data && assetGroupChartRef.current) {
// // // // // //       const groupedData = groupBy(state.assetSummaryData.data, assetGroup);
// // // // // //       const aggregatedData = map(groupedData, (assets, groupName) => ({
// // // // // //         group_name: groupName === 'null' ? 'N/A' : groupName,
// // // // // //         asset_count: assets.length,
// // // // // //       })).sort((a, b) => b.asset_count - a.asset_count);
// // // // // //       Plotly.newPlot(assetGroupChartRef.current, [{ y: aggregatedData.map(d => d.group_name).slice(0, 7), x: aggregatedData.map(d => d.asset_count).slice(0, 7), type: 'bar', orientation: 'h', marker: { color: '#52c41a' } }], { height: 300, margin: { l: 150, r: 20, t: 20, b: 40 }, xaxis: { title: 'Number of Assets' }, yaxis: { automargin: true, autorange: 'reversed' } }, { displayModeBar: false, responsive: true });
// // // // // //     }
// // // // // //   }, [state.assetSummaryData.data, assetGroup]);

// // // // // //   // --- RENDER METHOD ---
// // // // // //   if (!organization?.id) { return <Alert message="No Organization Selected" type="warning" showIcon />; }

// // // // // //   const WidgetWrapper: React.FC<{ title: string; icon?: React.ReactNode; loading: boolean; error: string | null; children: React.ReactNode; extra?: React.ReactNode; }> = ({ title, icon, loading, error, children, extra }) => (
// // // // // //     <Card title={<><span style={{ marginRight: 8 }}>{icon}</span>{title}</>} extra={extra} style={{ height: '100%' }}>
// // // // // //       {loading ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}><Spin /></div>
// // // // // //       : error ? <Alert message="Error" description={error} type="error" showIcon />
// // // // // //       : children
// // // // // //       }
// // // // // //     </Card>
// // // // // //   );

// // // // // //   return (
// // // // // //     <div className='p-4'>
// // // // // //       {/* Conditionally render the install button */}
// // // // // //       {/* {installPromptEvent && (
// // // // // //         <Alert
// // // // // //           message="Install App for Full PWA Experience"
// // // // // //           description="Click the button to add this app to your home screen for quick access and offline functionality."
// // // // // //           type="info"
// // // // // //           showIcon
// // // // // //           action={
// // // // // //             <Button size="small" type="primary" onClick={handleInstallClick}>
// // // // // //               Install
// // // // // //             </Button>
// // // // // //           }
// // // // // //           closable
// // // // // //           style={{ marginBottom: 16 }}
// // // // // //         />
// // // // // //       )} */}

// // // // // //       {/* Conditionally render the notification button */}
// // // // // //       {/* {notificationStatus === 'default' && (
// // // // // //         <Alert
// // // // // //           message="Enable Push Notifications"
// // // // // //           description="Receive real-time alerts about new tickets and important updates."
// // // // // //           type="success"
// // // // // //           showIcon
// // // // // //           action={
// // // // // //             <Button size="small" type="primary" onClick={handleSubscribeNotifications}>
// // // // // //               Enable Notifications
// // // // // //             </Button>
// // // // // //           }
// // // // // //           closable
// // // // // //           style={{ marginBottom: 16 }}
// // // // // //         />
// // // // // //       )} */}
// // // // // //       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
// // // // // //         <Title level={2}></Title>
// // // // // //         <div>
// // // // // //           {lastRefresh && <Text type="secondary" style={{ marginRight: 16 }}>Last Refresh: {lastRefresh.toLocaleTimeString()}</Text>}
// // // // // //           <Button icon={<SyncOutlined spin={isRefreshing} />} onClick={handleRefresh} disabled={isRefreshing}>Refresh Data</Button>
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       {/* ROW 1: KPIs */}
// // // // // //       <Row gutter={[16, 16]}>
// // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Total Tickets" loading={state.overallKpis.loading} error={state.overallKpis.error}><Statistic value={state.overallKpis.data?.total_tickets ?? 0} prefix={<FileDoneOutlined />} /></WidgetWrapper></Col>
// // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Open Tickets" loading={state.overallKpis.loading} error={state.overallKpis.error}><Statistic value={state.overallKpis.data?.open_tickets_count ?? 0} prefix={<FolderOpenOutlined />} /></WidgetWrapper></Col>
// // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Avg Resolution Time" loading={state.overallKpis.loading} error={state.overallKpis.error}><Statistic value={state.overallKpis.data?.average_mttr_hours ?? 0} precision={1} suffix=" hrs" prefix={<ClockCircleOutlined />} /></WidgetWrapper></Col>
// // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="First-Time Fix Rate" loading={state.overallKpis.loading} error={state.overallKpis.error}><Statistic value={state.overallKpis.data?.first_time_fix_rate_pct ?? 0} precision={1} suffix="%" prefix={<CheckCircleOutlined />} /></WidgetWrapper></Col>
// // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Avg Visits / Ticket" loading={state.overallKpis.loading} error={state.overallKpis.error}><Statistic value={state.overallKpis.data?.average_tasks_per_ticket ?? 0} precision={2} prefix={<UsergroupAddOutlined />} /></WidgetWrapper></Col>
// // // // // //         <Col xs={12} sm={8} md={4}><WidgetWrapper title="Assets Under Mngmt" loading={state.assetHealth.loading} error={state.assetHealth.error}><Statistic value={state.assetHealth.data?.total_assets ?? 0} prefix={<BuildOutlined />} /></WidgetWrapper></Col>
// // // // // //       </Row>

// // // // // //       {/* ROW 2: Main Charts */}
// // // // // //       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
// // // // // //         <Col xs={24} lg={12}><WidgetWrapper title="Weekly Performance Trends" icon={<LineChartOutlined />} loading={state.weeklyPerformance.loading} error={state.weeklyPerformance.error}><div ref={weeklyTrendChartRef} style={{ width: '100%', height: '300px' }} /></WidgetWrapper></Col>
// // // // // //         <Col xs={24} lg={12}>
// // // // // //           <WidgetWrapper
// // // // // //             title="Asset Distribution"
// // // // // //             icon={<BarChartOutlined />}
// // // // // //             loading={state.assetSummaryData.loading}
// // // // // //             error={state.assetSummaryData.error}
// // // // // //             // extra={<Select value={assetGroup} size="small" onChange={(value) => setAssetGroup(value)}><Option value="asset_category_name">by Category</Option><Option value="contract_display_id">by Contract</Option><Option value="account_name">by Account</Option></Select>}
// // // // // //           >
// // // // // //             <div ref={assetGroupChartRef} style={{ width: '100%', height: '300px' }} />
// // // // // //           </WidgetWrapper>
// // // // // //         </Col>
// // // // // //       </Row>

// // // // // //       {/* ROW 3: More Charts */}
// // // // // //       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
// // // // // //         <Col xs={24} lg={8}><WidgetWrapper title="Top 5 Accounts by Work Hours" icon={<TeamOutlined />} loading={state.accountSummary.loading} error={state.accountSummary.error}><div ref={accountsChartRef} style={{ width: '100%', height: '300px' }} /></WidgetWrapper></Col>
// // // // // //         <Col xs={24} lg={8}><WidgetWrapper title="Tickets by Asset Category" icon={<PieChartOutlined />} loading={state.assetSummaryData.loading} error={state.assetSummaryData.error}><div ref={assetTicketsChartRef} style={{ width: '100%', height: '300px' }} /></WidgetWrapper></Col>
// // // // // //         <Col xs={24} lg={8}><WidgetWrapper title="Top Process Bottlenecks" icon={<HourglassOutlined />} loading={state.processBottlenecks.loading} error={state.processBottlenecks.error}><div ref={bottlenecksChartRef} style={{ width: '100%', height: '300px' }} /></WidgetWrapper></Col>
// // // // // //       </Row>

// // // // // //       {/* ROW 4: Tables */}
// // // // // //       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
// // // // // //         <Col xs={24} lg={16}><WidgetWrapper title="Agent Performance Leaderboard" icon={<TeamOutlined />} loading={state.agentLeaderboard.loading} error={state.agentLeaderboard.error}>
// // // // // //             <Table
// // // // // //               dataSource={state.agentLeaderboard.data ? [...state.agentLeaderboard.data].sort((a:IAgentPerformance,b:IAgentPerformance) => b.total_tickets_handled - a.total_tickets_handled) : []}
// // // // // //               columns={[
// // // // // //                 { title: 'Agent Name', dataIndex: 'agent_name', key: 'agent_name' },
// // // // // //                 { title: 'Tickets Handled', dataIndex: 'total_tickets_handled', key: 'tickets', align: 'center' },
// // // // // //                 { title: 'Avg. Resolution Time (Hrs)', dataIndex: 'average_mttr_hours', key: 'mttr', align: 'center', render: (val) => val?.toFixed(1) },
// // // // // //                 { title: 'First-Time Fix Rate', dataIndex: 'first_time_fix_rate_pct', key: 'ftfr', align: 'center', render: (val) => val ? <Tag color={val > 85 ? 'green' : 'orange'}>{val.toFixed(1)}%</Tag> : 'N/A' },
// // // // // //               ]}
// // // // // //               pagination={{ pageSize: 5, hideOnSinglePage: true }} size="small" rowKey="agent_name"
// // // // // //             />
// // // // // //           </WidgetWrapper></Col>
// // // // // //         <Col xs={24} lg={8}><WidgetWrapper title="Accounts Requiring Attention" icon={<ExclamationCircleOutlined />} loading={state.accountSummary.loading} error={state.accountSummary.error}>
// // // // // //             <Table
// // // // // //               dataSource={state.accountSummary.data ? [...state.accountSummary.data].sort((a:IAccountSummary,b:IAccountSummary) => b.open_tickets - a.open_tickets).slice(0, 5) : []}
// // // // // //               columns={[
// // // // // //                 { title: 'Account Name', dataIndex: 'account_name', key: 'account_name'},
// // // // // //                 { title: 'Open Tickets', dataIndex: 'open_tickets', key: 'open_tickets', align: 'center', render: (val) => <Tag color="red">{val}</Tag> },
// // // // // //               ]}
// // // // // //               pagination={false} size="small" rowKey="account_name"
// // // // // //             />
// // // // // //           </WidgetWrapper></Col>
// // // // // //       </Row>

// // // // // //       {/* ROW 5: More Tables */}
// // // // // //       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
// // // // // //         <Col span={24}><WidgetWrapper title="Recent Agent Activity" icon={<CalendarOutlined />} loading={state.dailyAgentActivity.loading} error={state.dailyAgentActivity.error}>
// // // // // //             <Table
// // // // // //               dataSource={state.dailyAgentActivity.data ? [...state.dailyAgentActivity.data].sort((a: IDailyAgentActivity, b: IDailyAgentActivity) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime()) : []}
// // // // // //               columns={[
// // // // // //                 { title: 'Date', dataIndex: 'work_date', key: 'date', render: (date) => new Date(date).toLocaleDateString() },
// // // // // //                 { title: 'Agent Name', dataIndex: 'agent_name', key: 'agent_name' },
// // // // // //                 { title: 'Tasks Completed', dataIndex: 'tasks_completed', key: 'tasks', align: 'center' },
// // // // // //                 { title: 'Hours Worked', dataIndex: 'total_hours_worked', key: 'hours', align: 'center', render: (val) => val?.toFixed(1) },
// // // // // //               ]}
// // // // // //               pagination={{ pageSize: 5, hideOnSinglePage: true }} size="small" rowKey={(record) => `${record.agent_name}-${record.work_date}`}
// // // // // //             />
// // // // // //           </WidgetWrapper></Col>
// // // // // //       </Row>
// // // // // //     </div>
// // // // // //   );
// // // // // // };

// // // // // // export default Dashboard;

// // // // // // THE ABOVE DASHBOARD WORKS WITH HARD CODED VIEWS FROM PUBLIC< MOVED TO ANALYTICS _ NEED TO TEST< NOW WE ARE MOVING TO DYNAMIC DASHBOARD FROM CORE>USER_DASHBOARDS

// // // // // // export default Dashboard;


// // // // // import React, { useState, useEffect, useRef, useCallback } from 'react';
// // // // // import { Card, Row, Col, Table, Tag, Statistic, Spin, Typography, Alert, Button } from 'antd';
// // // // // import Plotly from 'plotly.js-dist-min';
// // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // import { supabase } from '../lib/supabase';
// // // // // import { groupBy, map, sumBy } from 'lodash';

// // // // // const { Title, Text } = Typography;

// // // // // // Types for our dynamic dashboard
// // // // // interface WidgetDefinition {
// // // // //   id: string;
// // // // //   name: string;
// // // // //   entity_type: string;
// // // // //   widget_type: string;
// // // // //   config_template: any;
// // // // // }

// // // // // interface DashboardWidget {
// // // // //   id: string;
// // // // //   definitionId: string;
// // // // //   title: string;
// // // // //   position: { x: number; y: number; w: number; h: number };
// // // // //   config: any;
// // // // // }

// // // // // interface DashboardData {
// // // // //   id: string;
// // // // //   name: string;
// // // // //   widgets: DashboardWidget[];
// // // // //   layout_config: any;
// // // // // }

// // // // // interface WidgetData {
// // // // //   [widgetId: string]: {
// // // // //     data: any;
// // // // //     loading: boolean;
// // // // //     error: string | null;
// // // // //   };
// // // // // }

// // // // // // Chart Component to fix hook order issue
// // // // // const LineChart: React.FC<{
// // // // //   widgetId: string;
// // // // //   data: any;
// // // // //   definition: WidgetDefinition;
// // // // // }> = ({ widgetId, data, definition }) => {
// // // // //   const chartRef = useRef<HTMLDivElement>(null);

// // // // //   useEffect(() => {
// // // // //     if (data && chartRef.current) {
// // // // //       const xAxis = definition.config_template?.xAxis;
// // // // //       const yAxis = definition.config_template?.yAxis;

// // // // //       if (Array.isArray(yAxis)) {
// // // // //         // Multiple series
// // // // //         const traces = yAxis.map((yKey, index) => ({
// // // // //           x: data.map((d: any) => d[xAxis]),
// // // // //           y: data.map((d: any) => d[yKey]),
// // // // //           type: 'scatter',
// // // // //           mode: 'lines+markers',
// // // // //           name: yKey
// // // // //         }));

// // // // //         Plotly.newPlot(chartRef.current, traces, {
// // // // //           height: 300,
// // // // //           margin: { l: 50, r: 20, t: 30, b: 50 }
// // // // //         }, { displayModeBar: false });
// // // // //       }
// // // // //     }

// // // // //     // Cleanup function
// // // // //     return () => {
// // // // //       if (chartRef.current) {
// // // // //         Plotly.purge(chartRef.current);
// // // // //       }
// // // // //     };
// // // // //   }, [data, widgetId, definition]);

// // // // //   return (
// // // // //     <div 
// // // // //       ref={chartRef}
// // // // //       style={{ width: '100%', height: '300px' }}
// // // // //     />
// // // // //   );
// // // // // };

// // // // // const BarChart: React.FC<{
// // // // //   widgetId: string;
// // // // //   data: any;
// // // // //   definition: WidgetDefinition;
// // // // // }> = ({ widgetId, data, definition }) => {
// // // // //   const chartRef = useRef<HTMLDivElement>(null);

// // // // //   useEffect(() => {
// // // // //     if (data && chartRef.current) {
// // // // //       // Implement bar chart rendering logic
// // // // //       const xAxis = definition.config_template?.xAxis;
// // // // //       const yAxis = definition.config_template?.yAxis;

// // // // //       if (Array.isArray(yAxis)) {
// // // // //         const traces = yAxis.map((yKey, index) => ({
// // // // //           x: data.map((d: any) => d[xAxis]),
// // // // //           y: data.map((d: any) => d[yKey]),
// // // // //           type: 'bar',
// // // // //           name: yKey
// // // // //         }));

// // // // //         Plotly.newPlot(chartRef.current, traces, {
// // // // //           height: 300,
// // // // //           margin: { l: 50, r: 20, t: 30, b: 50 },
// // // // //           barmode: definition.config_template?.barmode || 'group'
// // // // //         }, { displayModeBar: false });
// // // // //       }
// // // // //     }

// // // // //     return () => {
// // // // //       if (chartRef.current) {
// // // // //         Plotly.purge(chartRef.current);
// // // // //       }
// // // // //     };
// // // // //   }, [data, widgetId, definition]);

// // // // //   return (
// // // // //     <div 
// // // // //       ref={chartRef}
// // // // //       style={{ width: '100%', height: '300px' }}
// // // // //     />
// // // // //   );
// // // // // };

// // // // // const PieChart: React.FC<{
// // // // //   widgetId: string;
// // // // //   data: any;
// // // // //   definition: WidgetDefinition;
// // // // // }> = ({ widgetId, data, definition }) => {
// // // // //   const chartRef = useRef<HTMLDivElement>(null);

// // // // //   useEffect(() => {
// // // // //     if (data && chartRef.current) {
// // // // //       const labels = definition.config_template?.labels;
// // // // //       const values = definition.config_template?.values;

// // // // //       if (labels && values && data[0]) {
// // // // //         const trace = {
// // // // //           labels: data.map((d: any) => d[labels]),
// // // // //           values: data.map((d: any) => d[values]),
// // // // //           type: 'pie'
// // // // //         };

// // // // //         Plotly.newPlot(chartRef.current, [trace], {
// // // // //           height: 300,
// // // // //           margin: { l: 20, r: 20, t: 30, b: 20 }
// // // // //         }, { displayModeBar: false });
// // // // //       }
// // // // //     }

// // // // //     return () => {
// // // // //       if (chartRef.current) {
// // // // //         Plotly.purge(chartRef.current);
// // // // //       }
// // // // //     };
// // // // //   }, [data, widgetId, definition]);

// // // // //   return (
// // // // //     <div 
// // // // //       ref={chartRef}
// // // // //       style={{ width: '100%', height: '300px' }}
// // // // //     />
// // // // //   );
// // // // // };

// // // // // // Main dashboard component
// // // // // const Dashboard: React.FC = () => {
// // // // //   const { organization, location } = useAuthStore();
// // // // //   const [dashboard, setDashboard] = useState<DashboardData | null>(null);
// // // // //   const [widgetDefinitions, setWidgetDefinitions] = useState<{ [key: string]: WidgetDefinition }>({});
// // // // //   const [widgetData, setWidgetData] = useState<WidgetData>({});
// // // // //   const [isRefreshing, setIsRefreshing] = useState(false);
// // // // //   const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

// // // // //   // Load dashboard configuration
// // // // //   useEffect(() => {
// // // // //     const loadDashboard = async () => {
// // // // //       if (!organization?.id) return;

// // // // //       try {
// // // // //         // Load the Operations Command Center dashboard
// // // // //         const { data: dashboardData, error } = await supabase
// // // // //           .schema('core').from('user_dashboards')
// // // // //           .select('*')
// // // // //           .eq('name', 'Operations Command Center')
// // // // //           .eq('dashboard_type', 'system')
// // // // //           .single();

// // // // //         if (error) throw error;
// // // // //         setDashboard(dashboardData);

// // // // //         // Load all widget definitions
// // // // //         const { data: definitions, error: defError } = await supabase
// // // // //           .schema('core').from('widget_definitions')
// // // // //           .select('*')
// // // // //           .eq('is_active', true);

// // // // //         if (defError) throw defError;

// // // // //         // Create a lookup map
// // // // //         const defMap: { [key: string]: WidgetDefinition } = {};
// // // // //         definitions?.forEach(def => {
// // // // //           defMap[def.id] = def;
// // // // //         });
// // // // //         setWidgetDefinitions(defMap);

// // // // //       } catch (error) {
// // // // //         console.error('Error loading dashboard:', error);
// // // // //       }
// // // // //     };

// // // // //     loadDashboard();
// // // // //   }, [organization]);

// // // // //   // Fetch data for all widgets
// // // // //   const fetchWidgetData = useCallback(async (forceRefresh = false) => {
// // // // //     if (!dashboard || !organization?.id) return;

// // // // //     setIsRefreshing(true);
// // // // //     setLastRefresh(null);

// // // // //     // Initialize loading states
// // // // //     const initialWidgetData: WidgetData = {};
// // // // //     dashboard.widgets.forEach(widget => {
// // // // //       initialWidgetData[widget.id] = { data: null, loading: true, error: null };
// // // // //     });
// // // // //     setWidgetData(initialWidgetData);

// // // // //     // Fetch data for each widget
// // // // //     const promises = dashboard.widgets.map(async (widget) => {
// // // // //       const definition = widgetDefinitions[widget.definitionId];
// // // // //       if (!definition) return;

// // // // //       try {
// // // // //         const { data, error } = await supabase.schema('analytics').rpc('fn_get_or_calc_metric_data_v3', {
// // // // //           p_view_name: definition.entity_type,
// // // // //           p_org_id: organization.id,
// // // // //           p_loc_id: location?.id,
// // // // //           p_force_refresh: forceRefresh
// // // // //         });

// // // // //         if (error) throw error;

// // // // //         setWidgetData(prev => ({
// // // // //           ...prev,
// // // // //           [widget.id]: { 
// // // // //             data: data?.data || [], 
// // // // //             loading: false, 
// // // // //             error: null 
// // // // //           }
// // // // //         }));

// // // // //       } catch (error: any) {
// // // // //         setWidgetData(prev => ({
// // // // //           ...prev,
// // // // //           [widget.id]: { 
// // // // //             data: null, 
// // // // //             loading: false, 
// // // // //             error: error.message 
// // // // //           }
// // // // //         }));
// // // // //       }
// // // // //     });

// // // // //     await Promise.allSettled(promises);
// // // // //     setIsRefreshing(false);
// // // // //     setLastRefresh(new Date());
// // // // //   }, [dashboard, widgetDefinitions, organization, location]);

// // // // //   // Load data when dashboard is ready
// // // // //   useEffect(() => {
// // // // //     if (dashboard && Object.keys(widgetDefinitions).length > 0) {
// // // // //       fetchWidgetData();
// // // // //     }
// // // // //   }, [dashboard, widgetDefinitions, fetchWidgetData]);

// // // // //   const handleRefresh = () => {
// // // // //     fetchWidgetData(true);
// // // // //   };

// // // // //   // Render individual widgets based on type
// // // // //   const renderWidget = (widget: DashboardWidget) => {
// // // // //     const definition = widgetDefinitions[widget.definitionId];
// // // // //     const data = widgetData[widget.id];

// // // // //     if (!definition || !data) return null;

// // // // //     const WidgetWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
// // // // //       <Card 
// // // // //         title={widget.title} 
// // // // //         style={{ height: '100%' }}
// // // // //         loading={data.loading}
// // // // //       >
// // // // //         {data.error ? (
// // // // //           <Alert message="Error" description={data.error} type="error" showIcon />
// // // // //         ) : (
// // // // //           children
// // // // //         )}
// // // // //       </Card>
// // // // //     );

// // // // //     switch (definition.widget_type) {
// // // // //       case 'kpi':
// // // // //         return renderKPIWidget(widget, definition, data.data, WidgetWrapper);
// // // // //       case 'line_chart':
// // // // //         return renderLineChartWidget(widget, definition, data.data, WidgetWrapper);
// // // // //       case 'bar_chart':
// // // // //         return renderBarChartWidget(widget, definition, data.data, WidgetWrapper);
// // // // //       case 'pie_chart':
// // // // //         return renderPieChartWidget(widget, definition, data.data, WidgetWrapper);
// // // // //       case 'table':
// // // // //         return renderTableWidget(widget, definition, data.data, WidgetWrapper);
// // // // //       default:
// // // // //         return <WidgetWrapper><div>Unknown widget type: {definition.widget_type}</div></WidgetWrapper>;
// // // // //     }
// // // // //   };

// // // // //   // KPI Widget Renderer
// // // // //   const renderKPIWidget = (widget: DashboardWidget, definition: WidgetDefinition, data: any, Wrapper: React.FC<{ children: React.ReactNode }>) => {
// // // // //     const metricKey = definition.config_template?.metricKey;
// // // // //     const value = data?.[0]?.[metricKey] || 0;

// // // // //     return (
// // // // //       <Wrapper>
// // // // //         <Statistic 
// // // // //           value={value} 
// // // // //           precision={definition.config_template?.precision || 0}
// // // // //           suffix={definition.config_template?.format === 'percent' ? '%' : ''}
// // // // //           style={{ textAlign: 'center' }}
// // // // //         />
// // // // //       </Wrapper>
// // // // //     );
// // // // //   };

// // // // //   // Line Chart Renderer - Fixed: No hooks inside
// // // // //   const renderLineChartWidget = (widget: DashboardWidget, definition: WidgetDefinition, data: any, Wrapper: React.FC<{ children: React.ReactNode }>) => {
// // // // //     return (
// // // // //       <Wrapper>
// // // // //         <LineChart widgetId={widget.id} data={data} definition={definition} />
// // // // //       </Wrapper>
// // // // //     );
// // // // //   };

// // // // //   // Bar Chart Renderer - Fixed: No hooks inside
// // // // //   const renderBarChartWidget = (widget: DashboardWidget, definition: WidgetDefinition, data: any, Wrapper: React.FC<{ children: React.ReactNode }>) => {
// // // // //     return (
// // // // //       <Wrapper>
// // // // //         <BarChart widgetId={widget.id} data={data} definition={definition} />
// // // // //       </Wrapper>
// // // // //     );
// // // // //   };

// // // // //   // Pie Chart Renderer - Fixed: No hooks inside
// // // // //   const renderPieChartWidget = (widget: DashboardWidget, definition: WidgetDefinition, data: any, Wrapper: React.FC<{ children: React.ReactNode }>) => {
// // // // //     return (
// // // // //       <Wrapper>
// // // // //         <PieChart widgetId={widget.id} data={data} definition={definition} />
// // // // //       </Wrapper>
// // // // //     );
// // // // //   };

// // // // //   // Table Widget Renderer
// // // // //   const renderTableWidget = (widget: DashboardWidget, definition: WidgetDefinition, data: any, Wrapper: React.FC<{ children: React.ReactNode }>) => {
// // // // //     const columns = definition.config_template?.columns || [];

// // // // //     const tableColumns = columns.map((col: string) => ({
// // // // //       title: col.replace(/_/g, ' ').toUpperCase(),
// // // // //       dataIndex: col,
// // // // //       key: col,
// // // // //     }));

// // // // //     return (
// // // // //       <Wrapper>
// // // // //         <Table
// // // // //           dataSource={data || []}
// // // // //           columns={tableColumns}
// // // // //           pagination={{ pageSize: definition.config_template?.pageSize || 5 }}
// // // // //           size="small"
// // // // //           rowKey={(record: any) => record.id || JSON.stringify(record)}
// // // // //         />
// // // // //       </Wrapper>
// // // // //     );
// // // // //   };

// // // // //   if (!organization?.id) {
// // // // //     return <Alert message="No Organization Selected" type="warning" showIcon />;
// // // // //   }

// // // // //   if (!dashboard) {
// // // // //     return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Spin size="large" /></div>;
// // // // //   }

// // // // //   return (
// // // // //     <div className='p-4'>
// // // // //       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
// // // // //         <Title level={2}>{dashboard.name}</Title>
// // // // //         <div>
// // // // //           {lastRefresh && <Text type="secondary" style={{ marginRight: 16 }}>Last Refresh: {lastRefresh.toLocaleTimeString()}</Text>}
// // // // //           <Button icon={<SyncOutlined spin={isRefreshing} />} onClick={handleRefresh} disabled={isRefreshing}>
// // // // //             Refresh Data
// // // // //           </Button>
// // // // //         </div>
// // // // //       </div>

// // // // //       {/* Render widgets in a grid */}
// // // // //       <Row gutter={[16, 16]}>
// // // // //         {dashboard.widgets
// // // // //           .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
// // // // //           .map(widget => (
// // // // //             <Col 
// // // // //               key={widget.id}
// // // // //               xs={24}
// // // // //               sm={widget.position.w * 2} // Adjust for responsive design
// // // // //               lg={widget.position.w} 
// // // // //               style={{ marginBottom: 16 }}
// // // // //             >
// // // // //               {renderWidget(widget)}
// // // // //             </Col>
// // // // //           ))}
// // // // //       </Row>
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // export default Dashboard;


// // // // import React, { useState, useEffect, useRef, useCallback } from 'react';
// // // // import { Card, Row, Col, Table, Tag, Statistic, Spin, Typography, Alert, Button } from 'antd';
// // // // import Plotly from 'plotly.js-dist-min';
// // // // import { useAuthStore } from '@/core/lib/store';
// // // // import { supabase } from '../lib/supabase';
// // // // import { groupBy, map, sumBy } from 'lodash';

// // // // const { Title, Text } = Typography;

// // // // // Types for our dynamic dashboard
// // // // interface WidgetDefinition {
// // // //   id: string;
// // // //   name: string;
// // // //   entity_type: string;
// // // //   widget_type: string;
// // // //   config_template: any;
// // // // }

// // // // interface DashboardWidget {
// // // //   id: string;
// // // //   definitionId: string;
// // // //   title: string;
// // // //   position: { x: number; y: number; w: number; h: number };
// // // //   config: any;
// // // // }

// // // // interface DashboardData {
// // // //   id: string;
// // // //   name: string;
// // // //   widgets: DashboardWidget[];
// // // //   layout_config: any;
// // // // }

// // // // interface WidgetData {
// // // //   [widgetId: string]: {
// // // //     data: any;
// // // //     loading: boolean;
// // // //     error: string | null;
// // // //   };
// // // // }

// // // // // =============================================================================
// // // // // CHART COMPONENTS WITH DEBUGGING AND ERROR HANDLING
// // // // // =============================================================================

// // // // /**
// // // //  * Line Chart Component with debugging and error handling
// // // //  * DEV NOTES:
// // // //  * - Handles single or multiple Y-axis series
// // // //  * - Validates data and configuration before rendering
// // // //  * - Adds proper cleanup to prevent memory leaks
// // // //  */
// // // // const LineChart: React.FC<{
// // // //   widgetId: string;
// // // //   data: any;
// // // //   definition: WidgetDefinition;
// // // // }> = ({ widgetId, data, definition }) => {
// // // //   const chartRef = useRef<HTMLDivElement>(null);

// // // //   useEffect(() => {
// // // //     console.log(`[LineChart] Rendering ${widgetId}:`, {
// // // //       dataLength: data?.length,
// // // //       config: definition.config_template,
// // // //       sampleData: data?.[0]
// // // //     });

// // // //     if (!data || !chartRef.current || data.length === 0) {
// // // //       console.log(`[LineChart] No data to render for ${widgetId}`);
// // // //       return;
// // // //     }

// // // //     const xAxis = definition.config_template?.xAxis;
// // // //     const yAxis = definition.config_template?.yAxis;

// // // //     // Validate configuration
// // // //     if (!xAxis || !yAxis) {
// // // //       console.error(`[LineChart] Missing xAxis or yAxis configuration for ${widgetId}`);
// // // //       return;
// // // //     }

// // // //     // Validate data columns exist
// // // //     const availableColumns = Object.keys(data[0]);
// // // //     if (!availableColumns.includes(xAxis)) {
// // // //       console.error(`[LineChart] xAxis column '${xAxis}' not found in data. Available:`, availableColumns);
// // // //       return;
// // // //     }

// // // //     const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis];
// // // //     const missingYColumns = yAxes.filter(col => !availableColumns.includes(col));
// // // //     if (missingYColumns.length > 0) {
// // // //       console.error(`[LineChart] yAxis columns ${missingYColumns} not found in data. Available:`, availableColumns);
// // // //       return;
// // // //     }

// // // //     try {
// // // //       const traces = yAxes.map((yKey, index) => ({
// // // //         x: data.map((d: any) => d[xAxis]),
// // // //         y: data.map((d: any) => d[yKey] || 0), // Handle null values
// // // //         type: 'scatter',
// // // //         mode: 'lines+markers',
// // // //         name: yKey
// // // //       }));

// // // //       Plotly.newPlot(chartRef.current, traces, {
// // // //         height: 300,
// // // //         margin: { l: 50, r: 20, t: 30, b: 50 },
// // // //         title: definition.config_template?.title || '',
// // // //         xaxis: {
// // // //           tickangle: -45
// // // //         }
// // // //       }, { 
// // // //         displayModeBar: false,
// // // //         responsive: true
// // // //       });

// // // //       console.log(`[LineChart] Successfully rendered ${widgetId} with ${data.length} data points`);
// // // //     } catch (error) {
// // // //       console.error(`[LineChart] Plotly error for ${widgetId}:`, error);
// // // //     }

// // // //     // Cleanup function
// // // //     return () => {
// // // //       if (chartRef.current) {
// // // //         Plotly.purge(chartRef.current);
// // // //       }
// // // //     };
// // // //   }, [data, widgetId, definition]);

// // // //   return (
// // // //     <div 
// // // //       ref={chartRef}
// // // //       style={{ width: '100%', height: '300px' }}
// // // //     />
// // // //   );
// // // // };

// // // // /**
// // // //  * Bar Chart Component with debugging and error handling
// // // //  * DEV NOTES:
// // // //  * - Supports grouped or stacked bars via barmode
// // // //  * - Handles null values gracefully
// // // //  * - Validates data structure before rendering
// // // //  */
// // // // const BarChart: React.FC<{
// // // //   widgetId: string;
// // // //   data: any;
// // // //   definition: WidgetDefinition;
// // // // }> = ({ widgetId, data, definition }) => {
// // // //   const chartRef = useRef<HTMLDivElement>(null);

// // // //   useEffect(() => {
// // // //     console.log(`[BarChart] Rendering ${widgetId}:`, {
// // // //       dataLength: data?.length,
// // // //       config: definition.config_template,
// // // //       sampleData: data?.[0]
// // // //     });

// // // //     if (!data || !chartRef.current || data.length === 0) {
// // // //       console.log(`[BarChart] No data to render for ${widgetId}`);
// // // //       return;
// // // //     }

// // // //     const xAxis = definition.config_template?.xAxis;
// // // //     const yAxis = definition.config_template?.yAxis;

// // // //     // Validate configuration
// // // //     if (!xAxis || !yAxis) {
// // // //       console.error(`[BarChart] Missing xAxis or yAxis configuration for ${widgetId}`);
// // // //       return;
// // // //     }

// // // //     // Validate data columns exist
// // // //     const availableColumns = Object.keys(data[0]);
// // // //     if (!availableColumns.includes(xAxis)) {
// // // //       console.error(`[BarChart] xAxis column '${xAxis}' not found in data. Available:`, availableColumns);
// // // //       return;
// // // //     }

// // // //     const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis];
// // // //     const missingYColumns = yAxes.filter(col => !availableColumns.includes(col));
// // // //     if (missingYColumns.length > 0) {
// // // //       console.error(`[BarChart] yAxis columns ${missingYColumns} not found in data. Available:`, availableColumns);
// // // //       return;
// // // //     }

// // // //     try {
// // // //       const traces = yAxes.map((yKey, index) => ({
// // // //         x: data.map((d: any) => d[xAxis]),
// // // //         y: data.map((d: any) => d[yKey] || 0), // Handle null values
// // // //         type: 'bar',
// // // //         name: yKey
// // // //       }));

// // // //       Plotly.newPlot(chartRef.current, traces, {
// // // //         height: 300,
// // // //         margin: { l: 50, r: 20, t: 30, b: 100 }, // Extra bottom margin for labels
// // // //         title: definition.config_template?.title || '',
// // // //         xaxis: {
// // // //           tickangle: -45 // Rotate labels for better readability
// // // //         },
// // // //         barmode: definition.config_template?.barmode || 'group'
// // // //       }, { 
// // // //         displayModeBar: false,
// // // //         responsive: true
// // // //       });

// // // //       console.log(`[BarChart] Successfully rendered ${widgetId} with ${data.length} data points`);
// // // //     } catch (error) {
// // // //       console.error(`[BarChart] Plotly error for ${widgetId}:`, error);
// // // //     }

// // // //     return () => {
// // // //       if (chartRef.current) {
// // // //         Plotly.purge(chartRef.current);
// // // //       }
// // // //     };
// // // //   }, [data, widgetId, definition]);

// // // //   return (
// // // //     <div 
// // // //       ref={chartRef}
// // // //       style={{ width: '100%', height: '300px' }}
// // // //     />
// // // //   );
// // // // };

// // // // /**
// // // //  * Pie Chart Component with debugging and error handling
// // // //  * DEV NOTES:
// // // //  * - Validates labels and values columns exist
// // // //  * - Handles empty or null data gracefully
// // // //  * - Adds proper cleanup to prevent memory leaks
// // // //  */
// // // // const PieChart: React.FC<{
// // // //   widgetId: string;
// // // //   data: any;
// // // //   definition: WidgetDefinition;
// // // // }> = ({ widgetId, data, definition }) => {
// // // //   const chartRef = useRef<HTMLDivElement>(null);

// // // //   useEffect(() => {
// // // //     console.log(`[PieChart] Rendering ${widgetId}:`, {
// // // //       dataLength: data?.length,
// // // //       config: definition.config_template,
// // // //       sampleData: data?.[0]
// // // //     });

// // // //     if (!data || !chartRef.current || data.length === 0) {
// // // //       console.log(`[PieChart] No data to render for ${widgetId}`);
// // // //       return;
// // // //     }

// // // //     const labels = definition.config_template?.labels;
// // // //     const values = definition.config_template?.values;

// // // //     // Validate configuration
// // // //     if (!labels || !values) {
// // // //       console.error(`[PieChart] Missing labels or values configuration for ${widgetId}`);
// // // //       return;
// // // //     }

// // // //     // Validate data columns exist
// // // //     const availableColumns = Object.keys(data[0]);
// // // //     if (!availableColumns.includes(labels)) {
// // // //       console.error(`[PieChart] Labels column '${labels}' not found in data. Available:`, availableColumns);
// // // //       return;
// // // //     }
// // // //     if (!availableColumns.includes(values)) {
// // // //       console.error(`[PieChart] Values column '${values}' not found in data. Available:`, availableColumns);
// // // //       return;
// // // //     }

// // // //     try {
// // // //       const trace = {
// // // //         labels: data.map((d: any) => d[labels]),
// // // //         values: data.map((d: any) => d[values] || 0), // Handle null values
// // // //         type: 'pie',
// // // //         textinfo: 'label+percent',
// // // //         textposition: 'outside',
// // // //         hoverinfo: 'label+percent+value'
// // // //       };

// // // //       Plotly.newPlot(chartRef.current, [trace], {
// // // //         height: 300,
// // // //         margin: { l: 20, r: 20, t: 30, b: 20 },
// // // //         title: definition.config_template?.title || '',
// // // //         showlegend: true
// // // //       }, { 
// // // //         displayModeBar: false,
// // // //         responsive: true
// // // //       });

// // // //       console.log(`[PieChart] Successfully rendered ${widgetId} with ${data.length} data points`);
// // // //     } catch (error) {
// // // //       console.error(`[PieChart] Plotly error for ${widgetId}:`, error);
// // // //     }

// // // //     return () => {
// // // //       if (chartRef.current) {
// // // //         Plotly.purge(chartRef.current);
// // // //       }
// // // //     };
// // // //   }, [data, widgetId, definition]);

// // // //   return (
// // // //     <div 
// // // //       ref={chartRef}
// // // //       style={{ width: '100%', height: '300px' }}
// // // //     />
// // // //   );
// // // // };

// // // // // =============================================================================
// // // // // MAIN DASHBOARD COMPONENT
// // // // // =============================================================================

// // // // /**
// // // //  * Main Dashboard Component
// // // //  * DEV NOTES:
// // // //  * - Uses proper hook order and dependencies
// // // //  * - Implements comprehensive error handling
// // // //  * - Includes detailed debugging logs
// // // //  * - Handles loading states gracefully
// // // //  * - Supports dynamic widget rendering based on configuration
// // // //  */
// // // // const Dashboard: React.FC = () => {
// // // //   const { organization, location } = useAuthStore();
// // // //   const [dashboard, setDashboard] = useState<DashboardData | null>(null);
// // // //   const [widgetDefinitions, setWidgetDefinitions] = useState<{ [key: string]: WidgetDefinition }>({});
// // // //   const [widgetData, setWidgetData] = useState<WidgetData>({});
// // // //   const [isRefreshing, setIsRefreshing] = useState(false);
// // // //   const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

// // // //   // Load dashboard configuration
// // // //   useEffect(() => {
// // // //     const loadDashboard = async () => {
// // // //       if (!organization?.id) {
// // // //         console.log('[Dashboard] No organization ID available');
// // // //         return;
// // // //       }

// // // //       try {
// // // //         console.log('[Dashboard] Loading dashboard configuration...');

// // // //         // Load the Operations Command Center dashboard
// // // //         const { data: dashboardData, error } = await supabase
// // // //           .schema('core')
// // // //           .from('user_dashboards')
// // // //           .select('*')
// // // //           .eq('name', 'Operations Command Center')
// // // //           .eq('dashboard_type', 'system')
// // // //           .single();

// // // //         if (error) throw error;

// // // //         console.log('[Dashboard] Loaded dashboard:', dashboardData?.name);
// // // //         setDashboard(dashboardData);

// // // //         // Load all widget definitions
// // // //         const { data: definitions, error: defError } = await supabase
// // // //           .schema('core')
// // // //           .from('widget_definitions')
// // // //           .select('*')
// // // //           .eq('is_active', true);

// // // //         if (defError) throw defError;

// // // //         // Create a lookup map
// // // //         const defMap: { [key: string]: WidgetDefinition } = {};
// // // //         definitions?.forEach(def => {
// // // //           defMap[def.id] = def;
// // // //         });

// // // //         console.log(`[Dashboard] Loaded ${Object.keys(defMap).length} widget definitions`);
// // // //         setWidgetDefinitions(defMap);

// // // //       } catch (error: any) {
// // // //         console.error('[Dashboard] Error loading dashboard:', error);
// // // //       }
// // // //     };

// // // //     loadDashboard();
// // // //   }, [organization]);

// // // //   // Fetch data for all widgets
// // // //   const fetchWidgetData = useCallback(async (forceRefresh = false) => {
// // // //     if (!dashboard || !organization?.id) {
// // // //       console.log('[Dashboard] Cannot fetch data: missing dashboard or organization');
// // // //       return;
// // // //     }

// // // //     console.log(`[Dashboard] Fetching widget data (forceRefresh: ${forceRefresh})...`);
// // // //     setIsRefreshing(true);
// // // //     setLastRefresh(null);

// // // //     // Initialize loading states
// // // //     const initialWidgetData: WidgetData = {};
// // // //     dashboard.widgets.forEach(widget => {
// // // //       initialWidgetData[widget.id] = { data: null, loading: true, error: null };
// // // //     });
// // // //     setWidgetData(initialWidgetData);

// // // //     // Fetch data for each widget
// // // //     const promises = dashboard.widgets.map(async (widget) => {
// // // //       const definition = widgetDefinitions[widget.definitionId];
// // // //       if (!definition) {
// // // //         console.warn(`[Dashboard] No definition found for widget ${widget.id}`);
// // // //         return;
// // // //       }

// // // //       try {
// // // //         console.log(`[Dashboard] Fetching data for widget: ${widget.title}`, {
// // // //           definitionId: widget.definitionId,
// // // //           entityType: definition.entity_type,
// // // //           widgetType: definition.widget_type
// // // //         });

// // // //         const { data: result, error } = await supabase
// // // //           .schema('analytics')
// // // //           .rpc('fn_get_or_calc_metric_data_v3', {
// // // //             p_view_name: definition.entity_type,
// // // //             p_org_id: organization.id,
// // // //             p_loc_id: location?.id,
// // // //             p_force_refresh: forceRefresh
// // // //           });

// // // //         if (error) {
// // // //           console.error(`[Dashboard] RPC error for ${widget.title}:`, error);
// // // //           throw error;
// // // //         }

// // // //         const widgetResult = result as { data: any[]; lastCalculatedAt: string; error?: string };

// // // //         console.log(`[Dashboard] Widget ${widget.title} result:`, {
// // // //           dataLength: widgetResult.data?.length,
// // // //           sampleData: widgetResult.data?.[0],
// // // //           source: widgetResult.error ? 'error' : 'success'
// // // //         });

// // // //         setWidgetData(prev => ({
// // // //           ...prev,
// // // //           [widget.id]: { 
// // // //             data: widgetResult.data || [], 
// // // //             loading: false, 
// // // //             error: widgetResult.error || null 
// // // //           }
// // // //         }));

// // // //       } catch (error: any) {
// // // //         console.error(`[Dashboard] Error fetching data for widget ${widget.title}:`, error);
// // // //         setWidgetData(prev => ({
// // // //           ...prev,
// // // //           [widget.id]: { 
// // // //             data: null, 
// // // //             loading: false, 
// // // //             error: error.message 
// // // //           }
// // // //         }));
// // // //       }
// // // //     });

// // // //     await Promise.allSettled(promises);
// // // //     setIsRefreshing(false);
// // // //     setLastRefresh(new Date());
// // // //     console.log('[Dashboard] Data fetch completed');
// // // //   }, [dashboard, widgetDefinitions, organization, location]);

// // // //   // Load data when dashboard is ready
// // // //   useEffect(() => {
// // // //     if (dashboard && Object.keys(widgetDefinitions).length > 0) {
// // // //       console.log('[Dashboard] Dashboard and definitions ready, fetching data...');
// // // //       fetchWidgetData();
// // // //     }
// // // //   }, [dashboard, widgetDefinitions, fetchWidgetData]);

// // // //   const handleRefresh = () => {
// // // //     console.log('[Dashboard] Manual refresh triggered');
// // // //     fetchWidgetData(true);
// // // //   };

// // // //   // =============================================================================
// // // //   // WIDGET RENDERERS
// // // //   // =============================================================================

// // // //   /**
// // // //    * KPI Widget Renderer
// // // //    * DEV NOTES:
// // // //    * - Falls back to first numeric value if metricKey not found
// // // //    * - Handles percent formatting
// // // //    * - Provides detailed debugging
// // // //    */
// // // //   const renderKPIWidget = (widget: DashboardWidget, definition: WidgetDefinition, data: any, Wrapper: React.FC<{ children: React.ReactNode }>) => {
// // // //     const metricKey = definition.config_template?.metricKey;

// // // //     // If no specific metricKey, try to use the first numeric value
// // // //     let value = 0;
// // // //     let displayValue = value;

// // // //     if (metricKey && data?.[0]?.[metricKey] !== undefined) {
// // // //       value = data[0][metricKey];
// // // //       displayValue = value;
// // // //     } else if (data?.[0]) {
// // // //       // Find first numeric value in the data
// // // //       const firstRow = data[0];
// // // //       const numericKey = Object.keys(firstRow).find(key => 
// // // //         typeof firstRow[key] === 'number'
// // // //       );
// // // //       if (numericKey) {
// // // //         value = firstRow[numericKey];
// // // //         displayValue = value;
// // // //         console.log(`[KPI Widget] Using auto-detected metric key: ${numericKey} for widget ${widget.title}`);
// // // //       }
// // // //     }

// // // //     // Handle percent formatting
// // // //     if (definition.config_template?.format === 'percent' && typeof value === 'number') {
// // // //       displayValue = value * 100; // Convert decimal to percentage
// // // //     }

// // // //     console.log(`[KPI Widget] ${widget.title}:`, {
// // // //       metricKey,
// // // //       value,
// // // //       displayValue,
// // // //       dataSample: data?.[0]
// // // //     });

// // // //     return (
// // // //       <Wrapper>
// // // //         <Statistic 
// // // //           value={displayValue} 
// // // //           precision={definition.config_template?.precision || 0}
// // // //           suffix={definition.config_template?.format === 'percent' ? '%' : ''}
// // // //           style={{ textAlign: 'center' }}
// // // //         />
// // // //       </Wrapper>
// // // //     );
// // // //   };

// // // //   /**
// // // //    * Table Widget Renderer
// // // //    * DEV NOTES:
// // // //    * - Uses config_template.columns or falls back to all columns
// // // //    * - Handles missing row keys gracefully
// // // //    * - Provides reasonable default pagination
// // // //    */
// // // //   const renderTableWidget = (widget: DashboardWidget, definition: WidgetDefinition, data: any, Wrapper: React.FC<{ children: React.ReactNode }>) => {
// // // //     // Use configured columns or fall back to all available columns from first data row
// // // //     const columns = definition.config_template?.columns || 
// // // //                    (data?.[0] ? Object.keys(data[0]) : []);

// // // //     console.log(`[Table Widget] ${widget.title}:`, {
// // // //       columnCount: columns.length,
// // // //       dataLength: data?.length,
// // // //       columns
// // // //     });

// // // //     const tableColumns = columns.map((col: string) => ({
// // // //       title: col.replace(/_/g, ' ').toUpperCase(),
// // // //       dataIndex: col,
// // // //       key: col,
// // // //       render: (value: any) => {
// // // //         if (value === null || value === undefined) return '-';
// // // //         if (typeof value === 'number') return value.toLocaleString();
// // // //         return String(value);
// // // //       }
// // // //     }));

// // // //     return (
// // // //       <Wrapper>
// // // //         <Table
// // // //           dataSource={data || []}
// // // //           columns={tableColumns}
// // // //           pagination={{ 
// // // //             pageSize: definition.config_template?.pageSize || 5,
// // // //             showSizeChanger: true,
// // // //             showQuickJumper: true 
// // // //           }}
// // // //           size="small"
// // // //           scroll={{ x: true }}
// // // //           rowKey={(record: any) => record.id || record.key || JSON.stringify(record)}
// // // //         />
// // // //       </Wrapper>
// // // //     );
// // // //   };

// // // //   // Main widget renderer function
// // // //   const renderWidget = (widget: DashboardWidget) => {
// // // //     const definition = widgetDefinitions[widget.definitionId];
// // // //     const data = widgetData[widget.id];

// // // //     if (!definition) {
// // // //       console.warn(`[Dashboard] No definition found for widget ${widget.id}`);
// // // //       return (
// // // //         <Card title={widget.title} style={{ height: '100%' }}>
// // // //           <Alert message="Widget configuration error" description="Definition not found" type="error" showIcon />
// // // //         </Card>
// // // //       );
// // // //     }

// // // //     if (!data) {
// // // //       return (
// // // //         <Card title={widget.title} style={{ height: '100%' }}>
// // // //           <Spin tip="Loading..." />
// // // //         </Card>
// // // //       );
// // // //     }

// // // //     const WidgetWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
// // // //       <Card 
// // // //         title={widget.title} 
// // // //         style={{ height: '100%' }}
// // // //         loading={data.loading}
// // // //         extra={<Text type="secondary">{data.loading ? 'Loading...' : `${data.data?.length || 0} records`}</Text>}
// // // //       >
// // // //         {data.error ? (
// // // //           <Alert 
// // // //             message="Data Loading Error" 
// // // //             description={data.error} 
// // // //             type="error" 
// // // //             showIcon 
// // // //             action={
// // // //               <Button size="small" onClick={handleRefresh}>
// // // //                 Retry
// // // //               </Button>
// // // //             }
// // // //           />
// // // //         ) : data.data?.length === 0 ? (
// // // //           <Alert 
// // // //             message="No Data Available" 
// // // //             description="The query returned no results for the current filters." 
// // // //             type="info" 
// // // //             showIcon 
// // // //           />
// // // //         ) : (
// // // //           children
// // // //         )}
// // // //       </Card>
// // // //     );

// // // //     console.log(`[Dashboard] Rendering widget: ${widget.title}`, {
// // // //       type: definition.widget_type,
// // // //       dataLength: data.data?.length,
// // // //       loading: data.loading,
// // // //       error: data.error
// // // //     });

// // // //     switch (definition.widget_type) {
// // // //       case 'kpi':
// // // //         return renderKPIWidget(widget, definition, data.data, WidgetWrapper);
// // // //       case 'line_chart':
// // // //         return (
// // // //           <WidgetWrapper>
// // // //             <LineChart widgetId={widget.id} data={data.data} definition={definition} />
// // // //           </WidgetWrapper>
// // // //         );
// // // //       case 'bar_chart':
// // // //         return (
// // // //           <WidgetWrapper>
// // // //             <BarChart widgetId={widget.id} data={data.data} definition={definition} />
// // // //           </WidgetWrapper>
// // // //         );
// // // //       case 'pie_chart':
// // // //         return (
// // // //           <WidgetWrapper>
// // // //             <PieChart widgetId={widget.id} data={data.data} definition={definition} />
// // // //           </WidgetWrapper>
// // // //         );
// // // //       case 'table':
// // // //         return renderTableWidget(widget, definition, data.data, WidgetWrapper);
// // // //       default:
// // // //         return (
// // // //           <WidgetWrapper>
// // // //             <Alert 
// // // //               message="Unsupported Widget Type" 
// // // //               description={`Widget type '${definition.widget_type}' is not supported.`} 
// // // //               type="warning" 
// // // //               showIcon 
// // // //             />
// // // //           </WidgetWrapper>
// // // //         );
// // // //     }
// // // //   };

// // // //   // =============================================================================
// // // //   // MAIN RENDER
// // // //   // =============================================================================

// // // //   if (!organization?.id) {
// // // //     return (
// // // //       <div className="p-4">
// // // //         <Alert message="No Organization Selected" description="Please select an organization to view the dashboard." type="warning" showIcon />
// // // //       </div>
// // // //     );
// // // //   }

// // // //   if (!dashboard) {
// // // //     return (
// // // //       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
// // // //         <Spin size="large" tip="Loading Dashboard..." />
// // // //       </div>
// // // //     );
// // // //   }

// // // //   console.log('[Dashboard] Rendering main dashboard view', {
// // // //     widgetCount: dashboard.widgets?.length,
// // // //     organization: organization?.id,
// // // //     location: location?.id
// // // //   });

// // // //   return (
// // // //     <div className='p-4'>
// // // //       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
// // // //         <Title level={2}>{dashboard.name}</Title>
// // // //         <div>
// // // //           {lastRefresh && (
// // // //             <Text type="secondary" style={{ marginRight: 16 }}>
// // // //               Last Refresh: {lastRefresh.toLocaleTimeString()}
// // // //             </Text>
// // // //           )}
// // // //           <Button 
// // // //             icon={<SyncOutlined spin={isRefreshing} />} 
// // // //             onClick={handleRefresh} 
// // // //             disabled={isRefreshing}
// // // //             type="primary"
// // // //           >
// // // //             {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
// // // //           </Button>
// // // //         </div>
// // // //       </div>

// // // //       {/* Render widgets in a grid */}
// // // //       <Row gutter={[16, 16]}>
// // // //         {dashboard.widgets
// // // //           ?.sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
// // // //           .map(widget => (
// // // //             <Col 
// // // //               key={widget.id}
// // // //               xs={24}
// // // //               sm={Math.min(widget.position.w * 12, 24)} // Responsive column calculation
// // // //               lg={widget.position.w * 6} // 6-col base system (24/6=4, so w=1 = 6 cols, w=2 = 12 cols, etc.)
// // // //               style={{ marginBottom: 16 }}
// // // //             >
// // // //               {renderWidget(widget)}
// // // //             </Col>
// // // //           ))}
// // // //       </Row>

// // // //       {/* Debug information panel (only in development) */}
// // // //       {/* {process.env.NODE_ENV === 'development' && (
// // // //         <Card title="Debug Information" size="small" style={{ marginTop: 20 }}>
// // // //           <Text type="secondary">
// // // //             Organization: {organization?.id} | Location: {location?.id} | 
// // // //             Widgets: {dashboard.widgets?.length} | 
// // // //             Definitions: {Object.keys(widgetDefinitions).length}
// // // //           </Text>
// // // //         </Card>
// // // //       )} */}
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Dashboard;


// ONLY ANTD 
// // // // // pages/Dashboard.tsx
// // // // import React, { useState } from 'react';
// // // // import { Tabs, Button, Space } from 'antd';
// // // // import DashboardDesigner from './DashboardDesigner';
// // // // import DashboardRenderer from './DashboardRenderer';

// // // // const Dashboard: React.FC = () => {
// // // //   const [activeTab, setActiveTab] = useState('view');
// // // //   const [previewData, setPreviewData] = useState(null);

// // // //   const handlePreview = (dashboardData: any) => {
// // // //     setPreviewData(dashboardData);
// // // //     setActiveTab('preview');
// // // //   };

// // // //   const handleSave = (savedDashboard: any) => {
// // // //     console.log('Dashboard saved:', savedDashboard);
// // // //     // You might want to switch to view mode or show a success message
// // // //   };

// // // //   return (
// // // //     <div className="p-4">
// // // //       <Tabs
// // // //         activeKey={activeTab}
// // // //         onChange={setActiveTab}
// // // //         tabBarExtraContent={
// // // //           <Space>
// // // //             <Button 
// // // //               icon={<EditOutlined />} 
// // // //               onClick={() => setActiveTab('design')}
// // // //             >
// // // //               Design Mode
// // // //             </Button>
// // // //             <Button 
// // // //               icon={<EyeOutlined />} 
// // // //               onClick={() => setActiveTab('view')}
// // // //             >
// // // //               View Mode
// // // //             </Button>
// // // //           </Space>
// // // //         }
// // // //         items={[
// // // //           {
// // // //             key: 'view',
// // // //             label: 'View Dashboard',
// // // //             children: <DashboardRenderer dashboardData={previewData || {/* load from API */}} />
// // // //           },
// // // //           {
// // // //             key: 'design',
// // // //             label: 'Design Dashboard',
// // // //             children: (
// // // //               <DashboardDesigner
// // // //                 onSave={handleSave}
// // // //                 onPreview={handlePreview}
// // // //               />
// // // //             )
// // // //           },
// // // //           {
// // // //             key: 'preview',
// // // //             label: 'Preview',
// // // //             children: previewData ? (
// // // //               <DashboardRenderer dashboardData={previewData} />
// // // //             ) : (
// // // //               <div>No preview available</div>
// // // //             )
// // // //           }
// // // //         ]}
// // // //       />
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Dashboard;

// // // // ABOVE ONLY ANTD DESIGN

// // // import React, { useState, useEffect, useCallback } from 'react';
// // // import { Layout, Select, Button, Space, message, Drawer, Spin, Empty } from 'antd';
// // // import { Save, Plus, Pencil, Eye, RefreshCw } from 'lucide-react';
// // // import { useAuthStore } from '@/core/lib/store'; // Your store
// // // import { supabase } from '../lib/supabase'; // Your supabase client
// // // import DashboardCanvas from './DashboardCanvas';
// // // import _ from 'lodash';

// // // const { Header, Sider, Content } = Layout;
// // // const { Option } = Select;

// // // // --- Types ---
// // // interface Dashboard {
// // //   id: string;
// // //   name: string;
// // //   widgets: any[];
// // //   layout_config?: any;
// // // }

// // // const DashboardPage: React.FC = () => {
// // //   const { organization, location } = useAuthStore();

// // //   // --- State ---
// // //   const [dashboards, setDashboards] = useState<Dashboard[]>([]);
// // //   const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
// // //   const [widgetDefinitions, setWidgetDefinitions] = useState<any>({});

// // //   // Data State
// // //   const [widgetData, setWidgetData] = useState<any>({});
// // //   const [loadingData, setLoadingData] = useState(false);

// // //   // UI State
// // //   const [isEditMode, setIsEditMode] = useState(false);
// // //   const [isLibraryOpen, setIsLibraryOpen] = useState(false);
// // //   const [isDirty, setIsDirty] = useState(false);
// // //   const [saving, setSaving] = useState(false);

// // //   // --- 1. Initial Load ---
// // //   useEffect(() => {
// // //     if (!organization?.id) return;
// // //     loadDashboardsAndDefinitions();
// // //   }, [organization?.id]);

// // //   const loadDashboardsAndDefinitions = async () => {
// // //     try {
// // //       // Load Definitions
// // //       const { data: defs } = await supabase.schema('core').from('widget_definitions').select('*').eq('is_active', true);
// // //       const defMap = _.keyBy(defs, 'id');
// // //       setWidgetDefinitions(defMap);

// // //       // Load Dashboards
// // //       const { data: dashData } = await supabase.schema('core').from('user_dashboards').select('*');

// // //       if (dashData) {
// // //         setDashboards(dashData);
// // //         // Auto-select "Operations Command Center" or first available
// // //         const defaultDash = dashData.find(d => d.name === 'Operations Command Center') || dashData[0];
// // //         if (defaultDash) {
// // //             setCurrentDashboard(defaultDash);
// // //             // If widgets are missing properties, normalize them
// // //             setCurrentDashboard(prev => ({
// // //                 ...prev!,
// // //                 widgets: prev?.widgets?.map(w => ({...w, position: w.position || {x:0, y:0, w:4, h:4}})) || []
// // //             }));
// // //         }
// // //       }
// // //     } catch (error) {
// // //       console.error("Init Error", error);
// // //     }
// // //   };

// // //   // --- 2. Data Fetching (The Engine) ---
// // //   const fetchMetricData = useCallback(async (widgets: any[]) => {
// // //     if (!organization?.id) return;
// // //     setLoadingData(true);

// // //     const promises = widgets.map(async (widget) => {
// // //       const def = widgetDefinitions[widget.definitionId];
// // //       if (!def) return;

// // //       // Avoid refetching if we have valid data and not force refreshing
// // //       // (Add cache logic here if desired)

// // //       try {
// // //         const { data, error } = await supabase
// // //           .schema('analytics')
// // //           .rpc('fn_get_or_calc_metric_data_v3', {
// // //             p_view_name: def.entity_type,
// // //             p_org_id: organization.id,
// // //             p_loc_id: location?.id,
// // //             p_force_refresh: false
// // //           });

// // //         setWidgetData((prev: any) => ({
// // //           ...prev,
// // //           [widget.id]: { data: data?.data || [], loading: false, error: error?.message }
// // //         }));
// // //       } catch (e: any) {
// // //         setWidgetData((prev: any) => ({
// // //           ...prev,
// // //           [widget.id]: { loading: false, error: e.message }
// // //         }));
// // //       }
// // //     });

// // //     await Promise.all(promises);
// // //     setLoadingData(false);
// // //   }, [organization, location, widgetDefinitions]);

// // //   // Trigger fetch when dashboard changes
// // //   useEffect(() => {
// // //     if (currentDashboard?.widgets && !_.isEmpty(widgetDefinitions)) {
// // //       fetchMetricData(currentDashboard.widgets);
// // //     }
// // //   }, [currentDashboard?.id, widgetDefinitions]); // Only re-fetch on ID change, not layout change

// // //   // --- 3. Edit Mode Handlers ---

// // //   const handleLayoutChange = (layout: any[]) => {
// // //     if (!currentDashboard) return;

// // //     // Map RGL layout back to our schema
// // //     const updatedWidgets = currentDashboard.widgets.map(w => {
// // //       const layoutItem = layout.find(l => l.i === w.id);
// // //       if (layoutItem) {
// // //         return {
// // //           ...w,
// // //           position: {
// // //             x: layoutItem.x,
// // //             y: layoutItem.y,
// // //             w: layoutItem.w,
// // //             h: layoutItem.h
// // //           }
// // //         };
// // //       }
// // //       return w;
// // //     });

// // //     // Only update if changed to prevent loops
// // //     if (!_.isEqual(updatedWidgets, currentDashboard.widgets)) {
// // //         setCurrentDashboard({ ...currentDashboard, widgets: updatedWidgets });
// // //         setIsDirty(true);
// // //     }
// // //   };

// // //   const handleSave = async () => {
// // //     if (!currentDashboard) return;
// // //     setSaving(true);
// // //     try {
// // //       const { error } = await supabase
// // //         .schema('core')
// // //         .from('user_dashboards')
// // //         .update({ widgets: currentDashboard.widgets })
// // //         .eq('id', currentDashboard.id);

// // //       if (error) throw error;
// // //       message.success('Dashboard saved');
// // //       setIsDirty(false);
// // //       setIsEditMode(false);
// // //     } catch (e) {
// // //       message.error('Save failed');
// // //     } finally {
// // //       setSaving(false);
// // //     }
// // //   };

// // //   // --- 4. Drag & Drop from Library ---

// // //   // This requires the "onDrop" HTML5 event on the container, or handling it via RGL
// // //   const addWidget = (defId: string) => {
// // //       const def = widgetDefinitions[defId];
// // //       if (!currentDashboard || !def) return;

// // //       const newWidget = {
// // //           id: `w-${Date.now()}`,
// // //           definitionId: defId,
// // //           title: def.name,
// // //           position: { x: 0, y: Infinity, w: 4, h: 6 }, // Infinity places it at bottom
// // //           config: {} 
// // //       };

// // //       const newWidgets = [...currentDashboard.widgets, newWidget];
// // //       setCurrentDashboard({ ...currentDashboard, widgets: newWidgets });
// // //       setIsDirty(true);

// // //       // Fetch data for new widget immediately
// // //       fetchMetricData([newWidget]);
// // //       message.success('Widget added');
// // //   };

// // //   return (
// // //     <Layout className="min-h-screen bg-white">
// // //       {/* Top Bar */}
// // //       <Header className="bg-white border-b px-4 flex justify-between items-center h-16">
// // //         <div className="flex items-center gap-4">
// // //           <Select 
// // //             value={currentDashboard?.id}
// // //             style={{ width: 250 }}
// // //             onChange={(id) => {
// // //                 const d = dashboards.find(x => x.id === id);
// // //                 if(d) setCurrentDashboard(d);
// // //             }}
// // //           >
// // //             {dashboards.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
// // //           </Select>
// // //           {isDirty && <span className="text-amber-500 text-xs">● Unsaved changes</span>}
// // //         </div>

// // //         <Space>
// // //           {!isEditMode ? (
// // //             <>
// // //                 <Button icon={<ReloadOutlined />} onClick={() => fetchMetricData(currentDashboard?.widgets || [])}>Refresh</Button>
// // //                 <Button type="primary" icon={<EditOutlined />} onClick={() => { setIsEditMode(true); setIsLibraryOpen(true); }}>Edit Dashboard</Button>
// // //             </>
// // //           ) : (
// // //             <>
// // //                <Button icon={<EyeOutlined />} onClick={() => setIsEditMode(false)}>Cancel</Button>
// // //                <Button icon={<PlusOutlined />} onClick={() => setIsLibraryOpen(true)}>Add Widget</Button>
// // //                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>Save Changes</Button>
// // //             </>
// // //           )}
// // //         </Space>
// // //       </Header>

// // //       <Layout>
// // //         <Content className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
// // //             {currentDashboard ? (
// // //                  <DashboardCanvas 
// // //                     widgets={currentDashboard.widgets}
// // //                     widgetData={widgetData}
// // //                     widgetDefinitions={widgetDefinitions}
// // //                     isEditMode={isEditMode}
// // //                     onLayoutChange={handleLayoutChange}
// // //                     onRemoveWidget={(id) => {
// // //                         const nw = currentDashboard.widgets.filter(w => w.id !== id);
// // //                         setCurrentDashboard({...currentDashboard, widgets: nw});
// // //                         setIsDirty(true);
// // //                     }}
// // //                     onEditWidget={(w) => console.log("Implement Config Modal Here", w)}
// // //                  />
// // //             ) : (
// // //                 <Empty description="Select a dashboard" />
// // //             )}
// // //         </Content>

// // //         {/* Widget Library Drawer */}
// // //         <Drawer
// // //           title="Widget Library"
// // //           placement="right"
// // //           open={isEditMode && isLibraryOpen}
// // //           onClose={() => setIsLibraryOpen(false)}
// // //           mask={false} // Allow interacting with canvas while open
// // //           width={320}
// // //         >
// // //           <div className="flex flex-col gap-3">
// // //              {_.map(widgetDefinitions, (def) => (
// // //                  <div 
// // //                     key={def.id} 
// // //                     className="p-3 border rounded hover:shadow-md cursor-pointer bg-white flex items-center justify-between group"
// // //                     onClick={() => addWidget(def.id)}
// // //                  >
// // //                     <div>
// // //                         <div className="font-medium">{def.name}</div>
// // //                         <div className="text-xs text-gray-400">{def.widget_type}</div>
// // //                     </div>
// // //                     <PlusOutlined className="opacity-0 group-hover:opacity-100 text-blue-500"/>
// // //                  </div>
// // //              ))}
// // //           </div>
// // //         </Drawer>
// // //       </Layout>
// // //     </Layout>
// // //   );
// // // };

// // // export default DashboardPage;



// // import React, { useState, useEffect, useCallback } from 'react';
// // import { Layout, Select, Button, Space, message, Drawer, Empty, Spin, Card } from 'antd';
// // import { Save, Plus, Pencil, Eye, RefreshCw } from 'lucide-react';
// // import { useAuthStore } from '@/core/lib/store';
// // import { supabase } from '../lib/supabase';
// // import DashboardCanvas from './DashboardCanvas';
// // import _ from 'lodash';

// // const { Header, Content } = Layout;
// // const { Option } = Select;

// // const DashboardPage: React.FC = () => {
// //   const { organization, location } = useAuthStore();

// //   const [dashboards, setDashboards] = useState<any[]>([]);
// //   const [currentDashboard, setCurrentDashboard] = useState<any | null>(null);
// //   const [widgetDefinitions, setWidgetDefinitions] = useState<any>({});

// //   const [widgetData, setWidgetData] = useState<any>({});
// //   const [loading, setLoading] = useState(true);

// //   const [isEditMode, setIsEditMode] = useState(false);
// //   const [isLibraryOpen, setIsLibraryOpen] = useState(false);
// //   const [isDirty, setIsDirty] = useState(false);
// //   const [saving, setSaving] = useState(false);

// //   // 1. Load Definitions & Dashboards
// //   useEffect(() => {
// //     if (!organization?.id) return;

// //     const init = async () => {
// //       setLoading(true);
// //       try {
// //         // Load Widget Defs
// //         const { data: defs } = await supabase.schema('core').from('widget_definitions').select('*').eq('is_active', true);
// //         setWidgetDefinitions(_.keyBy(defs, 'id'));

// //         // Load User Dashboards
// //         const { data: dashData } = await supabase.schema('core').from('user_dashboards').select('*');

// //         if (dashData && dashData.length > 0) {
// //           setDashboards(dashData);
// //           // Select Operations Command Center by default, or the first one
// //           const defaultDash = dashData.find(d => d.name === 'Operations Command Center') || dashData[0];
// //           setCurrentDashboard(defaultDash);
// //         }
// //       } catch (e) {
// //         console.error(e);
// //         message.error("Failed to load dashboard configuration");
// //       } finally {
// //         setLoading(false);
// //       }
// //     };
// //     init();
// //   }, [organization?.id]);

// //   // 2. Fetch Data for active dashboard
// //   const fetchMetricData = useCallback(async (widgets: any[], forceRefresh = false) => {
// //     if (!organization?.id || !widgets.length) return;

// //     // Only show loading spinner on initial load or explicit refresh, not during drag/drop
// //     if (forceRefresh) setLoading(true);

// //     const promises = widgets.map(async (widget) => {
// //       const def = widgetDefinitions[widget.definitionId];
// //       if (!def) return;

// //       try {
// //         // Using your existing RPC function
// //         const { data, error } = await supabase
// //           .schema('analytics')
// //           .rpc('fn_get_or_calc_metric_data_v3', {
// //             p_view_name: def.entity_type,
// //             p_org_id: organization.id,
// //             p_loc_id: location?.id,
// //             p_force_refresh: forceRefresh
// //           });

// //         setWidgetData((prev: any) => ({
// //           ...prev,
// //           [widget.id]: { data: data?.data || [], loading: false, error: error?.message }
// //         }));
// //       } catch (e: any) {
// //         console.error(`Error fetching ${widget.title}`, e);
// //       }
// //     });

// //     await Promise.all(promises);
// //     if (forceRefresh) setLoading(false);
// //   }, [organization, location, widgetDefinitions]);

// //   // Trigger fetch when dashboard switches
// //   useEffect(() => {
// //     if (currentDashboard?.widgets && !_.isEmpty(widgetDefinitions)) {
// //       // We don't await this so UI renders immediately
// //       fetchMetricData(currentDashboard.widgets);
// //     }
// //   }, [currentDashboard?.id, widgetDefinitions]);

// //   // 3. Handle Layout Changes (The Fix)
// //   const handleLayoutChange = (newLayout: any[]) => {
// //     if (!currentDashboard || !isEditMode) return;

// //     setCurrentDashboard((prev: any) => {
// //       const updatedWidgets = prev.widgets.map((widget: any) => {
// //         // Find the layout item for this widget
// //         // RGL uses string IDs, make sure we compare safely
// //         const layoutItem = newLayout.find((l: any) => String(l.i) === String(widget.id));

// //         if (layoutItem) {
// //           return {
// //             ...widget,
// //             position: {
// //               x: layoutItem.x,
// //               y: layoutItem.y,
// //               w: layoutItem.w,
// //               h: layoutItem.h
// //             }
// //           };
// //         }
// //         return widget;
// //       });

// //       // Only mark dirty if something actually changed
// //       if (!_.isEqual(prev.widgets, updatedWidgets)) {
// //         setIsDirty(true);
// //         return { ...prev, widgets: updatedWidgets };
// //       }
// //       return prev;
// //     });
// //   };

// //   // 4. Add Widget
// //   const addWidget = (defId: string) => {
// //     const def = widgetDefinitions[defId];
// //     if (!currentDashboard || !def) return;

// //     // Calculate a safe position (bottom of the dashboard)
// //     const maxY = Math.max(0, ...currentDashboard.widgets.map((w: any) => (w.position?.y || 0) + (w.position?.h || 0)));

// //     const newWidget = {
// //         id: `w-${Date.now()}`, // Generate unique ID
// //         definitionId: defId,
// //         title: def.name,
// //         position: { x: 0, y: maxY, w: 4, h: 4 }, // Default size
// //         config: {} 
// //     };

// //     const newWidgets = [...currentDashboard.widgets, newWidget];
// //     setCurrentDashboard({ ...currentDashboard, widgets: newWidgets });
// //     setIsDirty(true);
// //     fetchMetricData([newWidget]);
// //     message.success('Widget added');
// //   };

// //   // 5. Remove Widget
// //   const removeWidget = (widgetId: string) => {
// //     const newWidgets = currentDashboard.widgets.filter((w: any) => w.id !== widgetId);
// //     setCurrentDashboard({ ...currentDashboard, widgets: newWidgets });
// //     setIsDirty(true);
// //   };

// //   // 6. Save to Supabase
// //   const handleSave = async () => {
// //     if (!currentDashboard) return;
// //     setSaving(true);
// //     try {
// //       const { error } = await supabase
// //         .schema('core')
// //         .from('user_dashboards')
// //         .update({ 
// //           widgets: currentDashboard.widgets,
// //           updated_at: new Date() 
// //         })
// //         .eq('id', currentDashboard.id);

// //       if (error) throw error;
// //       message.success('Dashboard layout saved successfully');
// //       setIsDirty(false);
// //       setIsEditMode(false);
// //     } catch (e: any) {
// //       console.error(e);
// //       message.error(`Save failed: ${e.message}`);
// //     } finally {
// //       setSaving(false);
// //     }
// //   };

// //   if (loading && !currentDashboard) {
// //     return <div className="flex h-screen items-center justify-center"><Spin size="large" tip="Loading Dashboard..." /></div>;
// //   }

// //   return (
// //     <Layout className="min-h-screen bg-gray-50">
// //       {/* Header */}
// //       <Header className="bg-white border-b px-6 flex justify-between items-center h-16 sticky top-0 z-20 shadow-sm">
// //         <div className="flex items-center gap-4">
// //           <Select 
// //             value={currentDashboard?.id}
// //             style={{ width: 280 }}
// //             onChange={(id) => {
// //               const d = dashboards.find(x => x.id === id);
// //               if(d) setCurrentDashboard(d);
// //             }}
// //             disabled={isEditMode}
// //           >
// //             {dashboards.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
// //           </Select>
// //           {isDirty && <Space><span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="text-amber-600 text-sm font-medium">Unsaved Changes</span></Space>}
// //         </div>

// //         <Space>
// //           {!isEditMode ? (
// //             <>
// //               <Button icon={<ReloadOutlined />} onClick={() => fetchMetricData(currentDashboard?.widgets || [], true)}>Refresh Data</Button>
// //               <Button type="primary" icon={<EditOutlined />} onClick={() => { setIsEditMode(true); setIsLibraryOpen(true); }}>Design Dashboard</Button>
// //             </>
// //           ) : (
// //             <>
// //                <Button icon={<EyeOutlined />} onClick={() => { 
// //                  // Cancel logic: reload the dashboard from original list to revert changes
// //                  const original = dashboards.find(d => d.id === currentDashboard.id);
// //                  setCurrentDashboard(original);
// //                  setIsEditMode(false); 
// //                  setIsDirty(false);
// //                }}>Cancel</Button>
// //                <Button icon={<PlusOutlined />} onClick={() => setIsLibraryOpen(true)}>Add Widget</Button>
// //                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>Save Changes</Button>
// //             </>
// //           )}
// //         </Space>
// //       </Header>

// //       <Content className="p-6 overflow-y-auto h-[calc(100vh-64px)]">
// //         {currentDashboard ? (
// //              <DashboardCanvas 
// //                 widgets={currentDashboard.widgets || []}
// //                 widgetData={widgetData}
// //                 widgetDefinitions={widgetDefinitions}
// //                 isEditMode={isEditMode}
// //                 onLayoutChange={handleLayoutChange}
// //                 onRemoveWidget={removeWidget}
// //                 onEditWidget={(w) => message.info("Configure widget logic here")}
// //              />
// //         ) : (
// //             <Empty description="No dashboard selected" className="mt-20" />
// //         )}
// //       </Content>

// //       {/* Widget Library Drawer */}
// //       <Drawer
// //         title="Add Widget"
// //         placement="right"
// //         open={isEditMode && isLibraryOpen}
// //         onClose={() => setIsLibraryOpen(false)}
// //         mask={false}
// //         width={320}
// //         styles={{ body: { padding: 0 } }}
// //       >
// //         <div className="p-4 grid gap-3">
// //            {_.map(widgetDefinitions, (def) => (
// //                <Card 
// //                   key={def.id} 
// //                   size="small"
// //                   hoverable
// //                   className="cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500 transition-all"
// //                   onClick={() => addWidget(def.id)}
// //                >
// //                   <div className="flex justify-between items-center">
// //                     <div>
// //                       <div className="font-semibold">{def.name}</div>
// //                       <div className="text-xs text-gray-400 uppercase mt-1">{def.widget_type.replace('_', ' ')}</div>
// //                     </div>
// //                     <PlusOutlined className="text-blue-500"/>
// //                   </div>
// //                </Card>
// //            ))}
// //         </div>
// //       </Drawer>
// //     </Layout>
// //   );
// // };

// // export default DashboardPage;



// import React, { useState, useEffect, useCallback } from 'react';
// import { Layout, Select, Button, Space, message, Drawer, Empty, Spin, Card } from 'antd';
// import { Save, Plus, Pencil, Eye, RefreshCw } from 'lucide-react';
// import { useAuthStore } from '@/core/lib/store';
// import { supabase } from '../lib/supabase';
// import DashboardCanvas from './DashboardCanvas';
// import _ from 'lodash';

// const { Header, Content } = Layout;
// const { Option } = Select;

// const DashboardPage: React.FC = () => {
//   // FIX 3: Safe Store Access
//   const organization = useAuthStore((state) => state.organization);
//   const location = useAuthStore((state) => state.location);

//   // If your store is defined differently, you might need:
//   // const { organization, location } = useAuthStore(); 
//   // But ensure 'setOrganization' isn't being destructured if not used here.

//   const [dashboards, setDashboards] = useState<any[]>([]);
//   const [currentDashboard, setCurrentDashboard] = useState<any | null>(null);
//   const [widgetDefinitions, setWidgetDefinitions] = useState<any>({});

//   const [widgetData, setWidgetData] = useState<any>({});
//   const [loading, setLoading] = useState(true);

//   const [isEditMode, setIsEditMode] = useState(false);
//   const [isLibraryOpen, setIsLibraryOpen] = useState(false);
//   const [isDirty, setIsDirty] = useState(false);
//   const [saving, setSaving] = useState(false);

//   // 1. Init Loading
//   useEffect(() => {
//     if (!organization?.id) return;

//     const init = async () => {
//       setLoading(true);
//       try {
//         const { data: defs } = await supabase.schema('core').from('widget_definitions').select('*').eq('is_active', true);
//         setWidgetDefinitions(_.keyBy(defs, 'id'));

//         const { data: dashData } = await supabase.schema('core').from('user_dashboards').select('*');

//         if (dashData && dashData.length > 0) {
//           setDashboards(dashData);
//           const defaultDash = dashData.find(d => d.name === 'Operations Command Center') || dashData[0];
//           setCurrentDashboard(defaultDash);
//         }
//       } catch (e) {
//         console.error(e);
//         message.error("Failed to load dashboard configuration");
//       } finally {
//         setLoading(false);
//       }
//     };
//     init();
//   }, [organization?.id]);

//   // 2. Data Fetching
//   const fetchMetricData = useCallback(async (widgets: any[], forceRefresh = false) => {
//     if (!organization?.id || !widgets?.length) return;
//     if (forceRefresh) setLoading(true);

//     const promises = widgets.map(async (widget) => {
//       const def = widgetDefinitions[widget.definitionId];
//       if (!def) return;

//       try {
//         const { data, error } = await supabase
//           .schema('analytics')
//           .rpc('fn_get_or_calc_metric_data_v3', {
//             p_view_name: def.entity_type,
//             p_org_id: organization.id,
//             p_loc_id: location?.id,
//             p_force_refresh: forceRefresh
//           });

//         setWidgetData((prev: any) => ({
//           ...prev,
//           [widget.id]: { data: data?.data || [], loading: false, error: error?.message }
//         }));
//       } catch (e: any) {
//         console.error(`Error fetching ${widget.title}`, e);
//       }
//     });

//     await Promise.all(promises);
//     if (forceRefresh) setLoading(false);
//   }, [organization, location, widgetDefinitions]);

//   useEffect(() => {
//     if (currentDashboard?.widgets && !_.isEmpty(widgetDefinitions)) {
//       fetchMetricData(currentDashboard.widgets);
//     }
//   }, [currentDashboard?.id, widgetDefinitions]);

//   // 3. Layout Handler
//   const handleLayoutChange = (newLayout: any[]) => {
//     if (!currentDashboard || !isEditMode) return;

//     setCurrentDashboard((prev: any) => {
//       const updatedWidgets = prev.widgets.map((widget: any) => {
//         const layoutItem = newLayout.find((l: any) => String(l.i) === String(widget.id));
//         if (layoutItem) {
//           return { ...widget, position: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h } };
//         }
//         return widget;
//       });

//       if (!_.isEqual(prev.widgets, updatedWidgets)) {
//         setIsDirty(true);
//         return { ...prev, widgets: updatedWidgets };
//       }
//       return prev;
//     });
//   };

//   // 4. Save Handler - FIXED
//   const handleSave = async () => {
//     if (!currentDashboard) return;
//     setSaving(true);
//     try {
//       const { error } = await supabase
//         .schema('core')
//         .from('user_dashboards')
//         .update({ 
//           widgets: currentDashboard.widgets,
//           updated_at: new Date() 
//         })
//         .eq('id', currentDashboard.id);

//       if (error) throw error;

//       // FIX: Update the main dashboards list locally so switching works immediately
//       setDashboards(prev => prev.map(d => 
//         d.id === currentDashboard.id 
//           ? { ...d, widgets: currentDashboard.widgets } 
//           : d
//       ));

//       message.success('Dashboard saved successfully');
//       setIsDirty(false);
//       setIsEditMode(false);
//     } catch (e: any) {
//       message.error(`Save failed: ${e.message}`);
//     } finally {
//       setSaving(false);
//     }
//   };

//   // Widget Actions
//   const addWidget = (defId: string) => {
//     const def = widgetDefinitions[defId];
//     if (!currentDashboard || !def) return;
//     const maxY = Math.max(0, ...currentDashboard.widgets.map((w: any) => (w.position?.y || 0) + (w.position?.h || 0)));

//     const newWidget = {
//         id: `w-${Date.now()}`,
//         definitionId: defId,
//         title: def.name,
//         position: { x: 0, y: maxY, w: 4, h: 4 },
//         config: {} 
//     };

//     const newWidgets = [...currentDashboard.widgets, newWidget];
//     setCurrentDashboard({ ...currentDashboard, widgets: newWidgets });
//     setIsDirty(true);
//     fetchMetricData([newWidget]);
//     message.success('Widget added');
//   };

//   const removeWidget = (widgetId: string) => {
//     setCurrentDashboard((prev: any) => ({
//       ...prev,
//       widgets: prev.widgets.filter((w: any) => w.id !== widgetId)
//     }));
//     setIsDirty(true);
//   };

//   // Loading View
//   if (loading && !currentDashboard) {
//     // FIX: Spin tip wrapper issue solved by using valid container
//     return (
//       <div className="flex h-screen items-center justify-center bg-gray-50">
//         <Spin size="large" tip="Loading Dashboard..." />
//       </div>
//     );
//   }

//   return (
//     <Layout className="min-h-screen bg-gray-50">
//       <Header className="bg-white border-b px-4 sm:px-6 flex justify-between items-center h-16 sticky top-0 z-20 shadow-sm">
//         <div className="flex items-center gap-4">
//           <Select 
//             value={currentDashboard?.id}
//             style={{ width: 240 }}
//             onChange={(id) => {
//               // Safe switching using the FRESH dashboards state
//               const d = dashboards.find(x => x.id === id);
//               if(d) setCurrentDashboard(d);
//             }}
//             disabled={isEditMode}
//           >
//             {dashboards.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
//           </Select>
//           {isDirty && <span className="hidden sm:inline-block text-amber-600 text-xs font-bold">● Unsaved Changes</span>}
//         </div>

//         <Space>
//           {!isEditMode ? (
//             <>
//               <Button icon={<ReloadOutlined />} onClick={() => fetchMetricData(currentDashboard?.widgets || [], true)}>Refresh</Button>
//               <Button type="primary" icon={<EditOutlined />} onClick={() => { setIsEditMode(true); setIsLibraryOpen(true); }}>Design</Button>
//             </>
//           ) : (
//             <>
//                <Button icon={<EyeOutlined />} onClick={() => { 
//                  // Revert changes from local list
//                  const original = dashboards.find(d => d.id === currentDashboard.id);
//                  setCurrentDashboard(original);
//                  setIsEditMode(false); 
//                  setIsDirty(false);
//                }}>Cancel</Button>
//                <Button icon={<PlusOutlined />} onClick={() => setIsLibraryOpen(true)}>Add Widget</Button>
//                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>Save</Button>
//             </>
//           )}
//         </Space>
//       </Header>

//       <Content className="p-2 sm:p-6 overflow-y-auto h-[calc(100vh-64px)]">
//         {currentDashboard ? (
//              <DashboardCanvas 
//                 widgets={currentDashboard.widgets || []}
//                 widgetData={widgetData}
//                 widgetDefinitions={widgetDefinitions}
//                 isEditMode={isEditMode}
//                 onLayoutChange={handleLayoutChange}
//                 onRemoveWidget={removeWidget}
//                 onEditWidget={(w) => console.log(w)}
//              />
//         ) : (
//             <Empty description="No dashboard selected" className="mt-20" />
//         )}
//       </Content>

//       <Drawer
//         title="Widget Library"
//         placement="right"
//         open={isEditMode && isLibraryOpen}
//         onClose={() => setIsLibraryOpen(false)}
//         mask={false}
//         width={320}
//       >
//         <div className="space-y-3">
//            {_.map(widgetDefinitions, (def) => (
//                <Card 
//                   key={def.id} 
//                   size="small"
//                   hoverable
//                   className="cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
//                   onClick={() => addWidget(def.id)}
//                >
//                   <div className="flex justify-between items-center">
//                     <div>
//                       <div className="font-semibold">{def.name}</div>
//                       <div className="text-xs text-gray-400">{def.widget_type}</div>
//                     </div>
//                     <PlusOutlined className="text-blue-500"/>
//                   </div>
//                </Card>
//            ))}
//         </div>
//       </Drawer>
//     </Layout>
//   );
// };

// export default DashboardPage;

// GOLD STANDARD - configs for LG< MD< SM
import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Select, Button, Space, message, Drawer, Empty, Spin, Card } from 'antd';
import { Save, Plus, Pencil, Eye, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/core/lib/store';
import { supabase } from '../lib/supabase';
import DashboardCanvas from './DashboardCanvas';
import _ from 'lodash';

const { Header, Content } = Layout;
const { Option } = Select;

const DashboardPage: React.FC = () => {
  const organization = useAuthStore((state) => state.organization);
  const location = useAuthStore((state) => state.location);

  const [dashboards, setDashboards] = useState<any[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<any | null>(null);
  const [widgetDefinitions, setWidgetDefinitions] = useState<any>({});
  const [widgetData, setWidgetData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Init
  useEffect(() => {
    if (!organization?.id) return;
    const init = async () => {
      setLoading(true);
      try {
        const { data: defs } = await supabase.schema('core').from('widget_definitions').select('*').eq('is_active', true);
        setWidgetDefinitions(_.keyBy(defs, 'id'));

        const { data: dashData } = await supabase.schema('core').from('user_dashboards').select('*');
        if (dashData && dashData.length > 0) {
          setDashboards(dashData);
          const defaultDash = dashData.find(d => d.name === 'Operations Command Center') || dashData[0];
          setCurrentDashboard(defaultDash);
        }
      } catch (e) {
        message.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [organization?.id]);

  // 2. Data Fetching
  const fetchMetricData = useCallback(async (widgets: any[], forceRefresh = false) => {
    if (!organization?.id || !widgets?.length) return;
    if (forceRefresh) setLoading(true);

    const promises = widgets.map(async (widget) => {
      const def = widgetDefinitions[widget.definitionId];
      if (!def) return;
      try {
        const { data, error } = await supabase
          .schema('analytics')
          // .rpc('fn_get_or_calc_metric_data_v3', {
          .rpc('fn_get_or_calc_metric_data_v4', {
            p_view_name: def.entity_type,
            p_org_id: organization.id,
            p_loc_id: location?.id,
            p_force_refresh: forceRefresh
          });
        setWidgetData((prev: any) => ({
          ...prev,
          [widget.id]: { data: data?.data || [], loading: false, error: error?.message }
        }));
      } catch (e: any) { console.error(e); }
    });

    await Promise.all(promises);
    if (forceRefresh) setLoading(false);
  }, [organization, location, widgetDefinitions]);

  useEffect(() => {
    if (currentDashboard?.widgets && !_.isEmpty(widgetDefinitions)) {
      fetchMetricData(currentDashboard.widgets);
    }
  }, [currentDashboard?.id, widgetDefinitions, location]);

  // 3. Layout Handler - NOW SUPPORTS MULTI-BREAKPOINT
  // 'allLayouts' comes from RGL as: { lg: [...], md: [...], sm: [...] }
  const handleLayoutChange = (allLayouts: any) => {
    if (!currentDashboard || !isEditMode) return;

    setCurrentDashboard((prev: any) => {
      const updatedWidgets = prev.widgets.map((widget: any) => {
        // We create a new 'layouts' object in the widget structure
        // We iterate through the RGL keys (lg, md, sm) and match by ID
        const newLayouts: any = { ...(widget.layouts || {}) };

        Object.keys(allLayouts).forEach(breakpoint => {
          const item = allLayouts[breakpoint].find((l: any) => String(l.i) === String(widget.id));
          if (item) {
            newLayouts[breakpoint] = {
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h
            };
          }
        });

        // Backward compatibility: Keep 'position' synced with 'lg' for simpler queries if needed
        const lgItem = allLayouts.lg?.find((l: any) => String(l.i) === String(widget.id));
        const basePos = lgItem ? { x: lgItem.x, y: lgItem.y, w: lgItem.w, h: lgItem.h } : widget.position;

        return {
          ...widget,
          position: basePos, // Legacy support
          layouts: newLayouts // The new Gold Standard source of truth
        };
      });

      if (!_.isEqual(prev.widgets, updatedWidgets)) {
        setIsDirty(true);
        return { ...prev, widgets: updatedWidgets };
      }
      return prev;
    });
  };

  // 4. Save Handler
  const handleSave = async () => {
    if (!currentDashboard) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .schema('core')
        .from('user_dashboards')
        .update({
          widgets: currentDashboard.widgets,
          updated_at: new Date()
        })
        .eq('id', currentDashboard.id);

      if (error) throw error;

      setDashboards(prev => prev.map(d => d.id === currentDashboard.id ? { ...d, widgets: currentDashboard.widgets } : d));
      message.success('Dashboard layout saved successfully');
      setIsDirty(false);
      setIsEditMode(false);
    } catch (e: any) {
      message.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Widget Actions
  const addWidget = (defId: string) => {
    const def = widgetDefinitions[defId];
    if (!currentDashboard || !def) return;

    // Find bottom of dashboard
    const maxY = Math.max(0, ...currentDashboard.widgets.map((w: any) => (w.position?.y || 0) + (w.position?.h || 0)));

    const newWidget = {
      id: `w-${Date.now()}`,
      definitionId: defId,
      title: def.name,
      // Default position
      position: { x: 0, y: maxY, w: 4, h: 4 },
      // Initialize layouts
      layouts: {
        lg: { x: 0, y: maxY, w: 4, h: 4 },
        md: { x: 0, y: maxY, w: 4, h: 4 },
        sm: { x: 0, y: maxY, w: 12, h: 4 }
      },
      config: {}
    };

    const newWidgets = [...currentDashboard.widgets, newWidget];
    setCurrentDashboard({ ...currentDashboard, widgets: newWidgets });
    setIsDirty(true);
    fetchMetricData([newWidget]);
    message.success('Widget added');
  };

  const removeWidget = (widgetId: string) => {
    setCurrentDashboard((prev: any) => ({
      ...prev,
      widgets: prev.widgets.filter((w: any) => w.id !== widgetId)
    }));
    setIsDirty(true);
  };

  if (loading && !currentDashboard) return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>;

  return (
    <Layout className="min-h-screen">
      <Header className="border-b px-4 sm:px-6 flex justify-between items-center h-16 sticky top-0 z-20 shadow-sm bg-[var(--color-bg-primary)]">
        <div className="flex items-center gap-4">
          <Select
            value={currentDashboard?.id}
            style={{ width: 240 }}
            onChange={(id) => {
              const d = dashboards.find(x => x.id === id);
              if (d) setCurrentDashboard(d);
            }}
            disabled={isEditMode}
          >
            {dashboards.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
          </Select>
          {isDirty && <span className="hidden sm:inline-block text-amber-600 text-xs font-bold">● Unsaved Changes</span>}
        </div>

        <Space>
          {!isEditMode ? (
            <>
              <Button icon={<RefreshCw size={16} />} onClick={() => fetchMetricData(currentDashboard?.widgets || [], true)}>Refresh</Button>
              <Button type="primary" icon={<Pencil size={16} />} onClick={() => { setIsEditMode(true); setIsLibraryOpen(true); }}>Design</Button>
            </>
          ) : (
            <>
              <Button icon={<Eye size={16} />} onClick={() => {
                const original = dashboards.find(d => d.id === currentDashboard.id);
                setCurrentDashboard(original);
                setIsEditMode(false);
                setIsDirty(false);
              }}>Cancel</Button>
              <Button icon={<Plus size={16} />} onClick={() => setIsLibraryOpen(true)}>Add Widget</Button>
              <Button type="primary" icon={<Save size={16} />} loading={saving} onClick={handleSave}>Save</Button>
            </>
          )}
        </Space>
      </Header>

      <Content className="p-2 sm:p-6 overflow-y-auto h-[calc(100vh-64px)]">
        {currentDashboard ? (
          <DashboardCanvas
            widgets={currentDashboard.widgets || []}
            widgetData={widgetData}
            widgetDefinitions={widgetDefinitions}
            isEditMode={isEditMode}
            onLayoutChange={handleLayoutChange}
            onRemoveWidget={removeWidget}
            onEditWidget={(w) => console.log(w)}
          />
        ) : (
          <Empty description="No dashboard selected" className="mt-20" />
        )}
      </Content>

      <Drawer
        title="Add Widget"
        placement="right"
        open={isEditMode && isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        mask={false}
        width={320}
      >
        <div className="space-y-3">
          {_.map(widgetDefinitions, (def) => (
            <Card
              key={def.id}
              size="small"
              hoverable
              className="cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
              onClick={() => addWidget(def.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">{def.name}</div>
                  <div className="text-xs text-gray-400">{def.widget_type}</div>
                </div>
                <Plus size={16} className="text-blue-500" />
              </div>
            </Card>
          ))}
        </div>
      </Drawer>
    </Layout>
  );
};

export default DashboardPage;