import React from 'react';
import { Table, Tag, Button, Space, Tooltip, Typography, Statistic, Card, Row, Col, Empty } from 'antd';
import {
    PauseCircleOutlined,
    PlayCircleOutlined,
    CloseCircleOutlined,
    UserOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import {
    useCampaignEnrollments,
    useCampaignStats,
    usePauseEnrollment,
    useResumeEnrollment,
    useCancelEnrollment,
    DripEnrollment
} from '../../hooks/useDripCampaigns';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface EnrollmentPanelProps {
    campaignId: string;
}

export const EnrollmentPanel: React.FC<EnrollmentPanelProps> = ({ campaignId }) => {
    const { data: enrollments = [], isLoading } = useCampaignEnrollments(campaignId);
    const { data: stats } = useCampaignStats(campaignId);
    const pauseEnrollment = usePauseEnrollment();
    const resumeEnrollment = useResumeEnrollment();
    const cancelEnrollment = useCancelEnrollment();

    const handlePause = (enrollmentId: string) => {
        pauseEnrollment.mutate({ enrollmentId, campaignId });
    };

    const handleResume = (enrollmentId: string) => {
        resumeEnrollment.mutate({ enrollmentId, campaignId });
    };

    const handleCancel = (enrollmentId: string) => {
        cancelEnrollment.mutate({ enrollmentId, campaignId });
    };

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'active':
                return <Tag color="processing" icon={<ClockCircleOutlined />}>Active</Tag>;
            case 'completed':
                return <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>;
            case 'paused':
                return <Tag color="warning" icon={<PauseCircleOutlined />}>Paused</Tag>;
            case 'cancelled':
                return <Tag color="default" icon={<CloseCircleOutlined />}>Cancelled</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    const columns = [
        {
            title: 'Contact',
            key: 'contact',
            render: (_: any, record: DripEnrollment) => (
                <Space>
                    <UserOutlined />
                    <div>
                        <div>{record.contact?.name || 'Unknown'}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.contact?.wa_id}
                        </Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => getStatusTag(status)
        },
        {
            title: 'Current Step',
            key: 'current_step',
            render: (_: any, record: DripEnrollment) => {
                if (!record.current_step) return <Text type="secondary">—</Text>;
                const step = record.current_step;
                return (
                    <Tag color={step.step_type === 'message' ? 'blue' : 'orange'}>
                        {step.step_type === 'message'
                            ? (step.content?.template_name || step.content?.text || 'Message')
                            : `Wait ${step.content?.delay_hours || 0}h`
                        }
                    </Tag>
                );
            }
        },
        {
            title: 'Next Execution',
            dataIndex: 'next_execution_at',
            key: 'next_execution_at',
            render: (val: string) => val ? dayjs(val).fromNow() : '—'
        },
        {
            title: 'Enrolled',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (val: string) => dayjs(val).format('MMM D, h:mm A')
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: DripEnrollment) => (
                <Space>
                    {record.status === 'active' && (
                        <Tooltip title="Pause">
                            <Button
                                type="text"
                                icon={<PauseCircleOutlined />}
                                onClick={() => handlePause(record.id)}
                                loading={pauseEnrollment.isPending}
                            />
                        </Tooltip>
                    )}
                    {record.status === 'paused' && (
                        <Tooltip title="Resume">
                            <Button
                                type="text"
                                icon={<PlayCircleOutlined />}
                                onClick={() => handleResume(record.id)}
                                loading={resumeEnrollment.isPending}
                            />
                        </Tooltip>
                    )}
                    {(record.status === 'active' || record.status === 'paused') && (
                        <Tooltip title="Cancel">
                            <Button
                                type="text"
                                danger
                                icon={<CloseCircleOutlined />}
                                onClick={() => handleCancel(record.id)}
                                loading={cancelEnrollment.isPending}
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* Stats Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="Total Enrolled"
                            value={stats?.total_enrolled || 0}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="Active"
                            value={stats?.active_count || 0}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="Completed"
                            value={stats?.completed_count || 0}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="Paused"
                            value={stats?.paused_count || 0}
                            valueStyle={{ color: '#faad14' }}
                            prefix={<PauseCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Enrollments Table */}
            {enrollments.length === 0 ? (
                <Empty
                    description="No enrollments yet. Contacts will appear here when they enter this sequence."
                />
            ) : (
                <Table
                    dataSource={enrollments}
                    columns={columns}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                    size="small"
                />
            )}
        </div>
    );
};

export default EnrollmentPanel;
