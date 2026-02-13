import React, { useState } from 'react';
import {
    Card,
    Table,
    Button,
    Tag,
    Space,
    Modal,
    Form,
    Input,
    Select,
    Typography,
    Badge,
    Tooltip,
    Empty,
    Spin,
    message
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    TagsOutlined,
    FilterOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useResponsive } from '../hooks';
import RuleBuilder, { SegmentRule } from '../components/common/RuleBuilder';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Segment {
    id: string;
    name: string;
    short_code: string;
    description: string | null;
    segment_type: 'static' | 'dynamic' | 'hybrid';
    rules: any[];
    contact_count: number;
    is_active: boolean;
    created_at: string;
}

const SegmentsPage: React.FC = () => {
    const organizationId = useAuthStore((state) => state.organization?.id);
    const { isMobile } = useResponsive();
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
    const [segmentType, setSegmentType] = useState<string>('static');
    const [rules, setRules] = useState<SegmentRule[]>([]);
    const [form] = Form.useForm();

    // Page header is handled by AuthedLayout

    // Fetch segments
    const { data: segments, isLoading } = useQuery({
        queryKey: ['segments', organizationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('identity')
                .from('wa_contact_segments')
                .select('*')
                .eq('organization_id', organizationId)
                .order('name');

            if (error) throw error;
            return data as Segment[];
        },
        enabled: !!organizationId
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (values: Partial<Segment>) => {
            if (editingSegment) {
                const { error } = await supabase
                    .schema('identity')
                    .from('wa_contact_segments')
                    .update({
                        name: values.name,
                        short_code: values.short_code,
                        description: values.description,
                        segment_type: values.segment_type || 'static',
                        rules: values.rules || []
                    })
                    .eq('id', editingSegment.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .schema('identity')
                    .from('wa_contact_segments')
                    .insert({
                        name: values.name,
                        short_code: values.short_code,
                        description: values.description,
                        organization_id: organizationId,
                        segment_type: values.segment_type || 'static',
                        rules: values.rules || []
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['segments'] });
            message.success(editingSegment ? 'Segment updated' : 'Segment created');
            handleCloseModal();
        },
        onError: (error: Error) => {
            message.error(error.message);
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .schema('identity')
                .from('wa_contact_segments')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['segments'] });
            message.success('Segment deleted');
        }
    });

    const handleOpenModal = (segment?: Segment) => {
        setEditingSegment(segment || null);
        setSegmentType(segment?.segment_type || 'static');
        setRules(segment?.rules || []);
        form.setFieldsValue(segment || {
            name: '',
            short_code: '',
            description: '',
            segment_type: 'static'
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSegment(null);
        setSegmentType('static');
        setRules([]);
        form.resetFields();
    };

    const handleSave = () => {
        form.validateFields().then(values => {
            saveMutation.mutate({
                ...values,
                rules: segmentType !== 'static' ? rules : []
            });
        });
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Delete Segment',
            content: 'Are you sure? This will remove all contacts from this segment.',
            okText: 'Delete',
            okType: 'danger',
            onOk: () => deleteMutation.mutate(id)
        });
    };

    const getSegmentTypeTag = (type: string) => {
        switch (type) {
            case 'static':
                return <Tag icon={<TagsOutlined />} color="blue">Static</Tag>;
            case 'dynamic':
                return <Tag icon={<ThunderboltOutlined />} color="green">Dynamic</Tag>;
            case 'hybrid':
                return <Tag icon={<FilterOutlined />} color="purple">Hybrid</Tag>;
            default:
                return <Tag>{type}</Tag>;
        }
    };

    const columns = [
        {
            title: 'Segment',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: Segment) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    {record.description && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.description}
                        </Text>
                    )}
                </Space>
            )
        },
        {
            title: 'Code',
            dataIndex: 'short_code',
            key: 'short_code',
            width: 100,
            render: (code: string) => <Tag>{code}</Tag>
        },
        {
            title: 'Type',
            dataIndex: 'segment_type',
            key: 'segment_type',
            width: 120,
            render: getSegmentTypeTag
        },
        {
            title: 'Contacts',
            dataIndex: 'contact_count',
            key: 'contact_count',
            width: 100,
            render: (count: number) => (
                <Badge count={count || 0} showZero color={count > 0 ? '#52c41a' : '#d9d9d9'} />
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_: any, record: Segment) => (
                <Space>
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenModal(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record.id)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    // Mobile card view
    const renderMobileCard = (segment: Segment) => (
        <Card
            key={segment.id}
            size="small"
            style={{ marginBottom: 12 }}
            actions={[
                <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(segment)}>
                    Edit
                </Button>,
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(segment.id)}>
                    Delete
                </Button>
            ]}
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                    <Text strong>{segment.name}</Text>
                    <Tag>{segment.short_code}</Tag>
                </Space>
                {segment.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{segment.description}</Text>
                )}
                <Space>
                    {getSegmentTypeTag(segment.segment_type || 'static')}
                    <Badge count={segment.contact_count || 0} showZero color="#52c41a" />
                    <Text type="secondary" style={{ fontSize: 12 }}>contacts</Text>
                </Space>
            </Space>
        </Card>
    );

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? 16 : 24, height: '100%', overflow: 'auto' }}>
            {/* Header Actions */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
            }}>
                <Title level={4} style={{ margin: 0 }}>
                    {segments?.length || 0} Segments
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenModal()}
                >
                    {isMobile ? '' : 'New Segment'}
                </Button>
            </div>

            {/* Content */}
            {!segments?.length ? (
                <Empty
                    description="No segments yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                    <Button type="primary" onClick={() => handleOpenModal()}>
                        Create First Segment
                    </Button>
                </Empty>
            ) : isMobile ? (
                segments.map(renderMobileCard)
            ) : (
                <Card>
                    <Table
                        dataSource={segments}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                    />
                </Card>
            )}

            {/* Create/Edit Modal */}
            <Modal
                title={editingSegment ? 'Edit Segment' : 'New Segment'}
                open={isModalOpen}
                onCancel={handleCloseModal}
                onOk={handleSave}
                confirmLoading={saveMutation.isPending}
                width={500}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Please enter a name' }]}
                    >
                        <Input placeholder="e.g. VIP Customers" />
                    </Form.Item>

                    <Form.Item
                        name="short_code"
                        label="Short Code"
                        rules={[{ required: true, message: 'Please enter a code' }]}
                    >
                        <Input
                            placeholder="e.g. VIP"
                            style={{ textTransform: 'uppercase' }}
                            onChange={e => form.setFieldValue('short_code', e.target.value.toUpperCase())}
                        />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <TextArea rows={2} placeholder="Optional description" />
                    </Form.Item>

                    <Form.Item name="segment_type" label="Type">
                        <Select onChange={(val) => setSegmentType(val)}>
                            <Select.Option value="static">
                                <Space>
                                    <TagsOutlined />
                                    Static - Manual assignment only
                                </Space>
                            </Select.Option>
                            <Select.Option value="dynamic">
                                <Space>
                                    <ThunderboltOutlined />
                                    Dynamic - Auto-evaluated by rules
                                </Space>
                            </Select.Option>
                            <Select.Option value="hybrid">
                                <Space>
                                    <FilterOutlined />
                                    Hybrid - Rules + manual override
                                </Space>
                            </Select.Option>
                        </Select>
                    </Form.Item>

                    {/* Rule Builder - shown for dynamic/hybrid segments */}
                    {(segmentType === 'dynamic' || segmentType === 'hybrid') && (
                        <RuleBuilder
                            rules={rules}
                            onChange={setRules}
                        />
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default SegmentsPage;
