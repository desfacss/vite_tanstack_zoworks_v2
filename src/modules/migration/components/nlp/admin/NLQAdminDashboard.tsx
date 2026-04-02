import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs, Layout, Typography, Divider, Row, Col, Card, Statistic, Form, Space, Select, DatePicker, Input, Button } from 'antd';
import { DatabaseOutlined, BookOutlined, ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { EntitiesTable } from './EntitiesTable';
import { QueryLogsTable } from './QueryLogsTable';
import { useNlpLogs } from '../hooks/useNlpAdmin';
import { calculateSuccessRate, calculateAverageExecutionTime } from './utils';
import { QueryStatus, UserFeedback } from './types';

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const queryClient = new QueryClient();

const TrainingCenterTab = () => {
    const [filters, setFilters] = useState<any>({ status: null, userFeedback: null, dateRange: null, searchText: '' });
    const { data: logs } = useNlpLogs(filters);

    return (
        <Space direction="vertical" className="w-full" size="large">
            <div><Title level={4} className="m-0">Training Center</Title><Paragraph type="secondary">Review performance and corrections</Paragraph></div>
            <Divider className="m-0" />
            <Row gutter={16}>
                <Col span={6}><Card size="small"><Statistic title="Queries" value={logs?.length || 0} prefix={<ThunderboltOutlined />} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Success" value={calculateSuccessRate(logs || [])} suffix="%" prefix={<CheckCircleOutlined />} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Failed" value={logs?.filter(l => !l.was_successful).length || 0} prefix={<CloseCircleOutlined />} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Avg Time" value={calculateAverageExecutionTime(logs || [])} suffix="ms" /></Card></Col>
            </Row>
            <Card size="small" title="Filters">
                <Form layout="inline">
                    <Form.Item label="Status"><Select className="w-[150px]" allowClear value={filters.status} onChange={s => setFilters({...filters, status: s})} options={[{ label: 'Success', value: QueryStatus.SUCCESS }, { label: 'Failed', value: QueryStatus.FAILED }]} /></Form.Item>
                    <Form.Item label="Feedback"><Select className="w-[150px]" allowClear value={filters.userFeedback} onChange={f => setFilters({...filters, userFeedback: f})} options={[{ label: 'Helpful', value: UserFeedback.HELPFUL }, { label: 'Not Helpful', value: UserFeedback.NOT_HELPFUL }]} /></Form.Item>
                    <Form.Item label="Search"><Input prefix={<SearchOutlined />} placeholder="User input..." allowClear value={filters.searchText} onChange={e => setFilters({...filters, searchText: e.target.value})} /></Form.Item>
                    <Button icon={<ClearOutlined />} onClick={() => setFilters({ status: null, userFeedback: null, dateRange: null, searchText: '' })}>Clear</Button>
                </Form>
            </Card>
            <QueryLogsTable onCorrect={() => {}} />
        </Space>
    );
};

export const NLQAdminDashboard = () => {
    const tabs = [
        { label: <span><DatabaseOutlined /> Entities</span>, key: 'entities', children: (
            <Space direction="vertical" className="w-full" size="large">
                <div className="flex justify-between items-center">
                    <div><Title level={4} className="m-0">Entity Catalog</Title><Paragraph type="secondary">Manage queryable metadata</Paragraph></div>
                    <Button type="primary">Add Entity</Button>
                </div>
                <Divider className="m-0" />
                <EntitiesTable onReview={() => {}} onHistory={() => {}} />
            </Space>
        )},
        { label: <span><BookOutlined /> Training</span>, key: 'training', children: <TrainingCenterTab /> }
    ];

    return (
        <QueryClientProvider client={queryClient}>
            <div className="p-6 bg-white"><Tabs defaultActiveKey="entities" items={tabs} size="large" /></div>
        </QueryClientProvider>
    );
};
