import React, { useState } from 'react';
import { Card, Button, Tag, Typography, Space, Modal, Form, Input, Select, Empty, message, Dropdown, theme, Alert } from 'antd';
import {
    PlusOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    EditOutlined,
    MoreOutlined,
    CopyOutlined,
    DeleteOutlined,
    QuestionCircleOutlined,
    GlobalOutlined,
    UserOutlined,
    TagOutlined,
    RobotOutlined
} from '@ant-design/icons';
import {
    useDripCampaigns,
    useCreateDripCampaign,
    useUpdateDripCampaign,
    useDeleteDripCampaign,
    useCloneDripCampaign,
    useUpdateDripSteps
} from '../hooks';
import { SEQUENCE_TEMPLATES } from '../data/sequenceTemplates';
import type { DripCampaign } from '../hooks/useDripCampaigns';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/lib/store';
import { useResponsive } from '../hooks';
import { ActionBar } from '../components/common/ActionBar';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const SequenceCard: React.FC<{
    sequence: DripCampaign;
    onSelect: () => void;
    onToggleStatus: () => void;
    onClone: () => void;
    onDelete: () => void;
    isCommunity?: boolean;
}> = ({ sequence, onSelect, onToggleStatus, onClone, onDelete, isCommunity }) => {
    return (
        <Card
            hoverable
            onClick={isCommunity ? onClone : onSelect}
            size="small"
            styles={{ body: { padding: 12 } }}
        >
            {/* Header: Title + Status + More */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sequence.name}
                    </div>
                </div>
                {!isCommunity && (
                    <>
                        <Tag color={sequence.is_active ? 'green' : 'default'} style={{ margin: 0, fontSize: 11 }}>
                            {sequence.is_active ? 'Active' : 'Draft'}
                        </Tag>
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: 'toggle',
                                        icon: sequence.is_active ? <PauseCircleOutlined /> : <PlayCircleOutlined />,
                                        label: sequence.is_active ? 'Pause' : 'Activate',
                                        onClick: (e) => {
                                            e.domEvent.stopPropagation();
                                            onToggleStatus();
                                        }
                                    },
                                    {
                                        key: 'edit',
                                        icon: <EditOutlined />,
                                        label: 'Edit Workflow',
                                        onClick: (e) => {
                                            e.domEvent.stopPropagation();
                                            onSelect();
                                        }
                                    },
                                    {
                                        key: 'clone',
                                        icon: <CopyOutlined />,
                                        label: 'Clone',
                                        onClick: (e) => {
                                            e.domEvent.stopPropagation();
                                            onClone();
                                        }
                                    },
                                    { type: 'divider' },
                                    {
                                        key: 'delete',
                                        icon: <DeleteOutlined />,
                                        label: 'Delete',
                                        danger: true,
                                        onClick: (e) => {
                                            e.domEvent.stopPropagation();
                                            onDelete();
                                        }
                                    },
                                ]
                            }}
                            trigger={['click']}
                        >
                            <Button
                                type="text"
                                icon={<MoreOutlined />}
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </Dropdown>
                    </>
                )}
                {isCommunity && (
                    <Button
                        type="primary"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClone();
                        }}
                    >
                        Clone
                    </Button>
                )}
            </div>

            {/* Description */}
            {sequence.description && (
                <Paragraph
                    type="secondary"
                    style={{ marginBottom: 8, fontSize: 12, lineHeight: 1.4 }}
                    ellipsis={{ rows: 2 }}
                >
                    {sequence.description}
                </Paragraph>
            )}

            {/* Trigger info */}
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                <span style={{ color: '#888' }}>Trigger:</span>
                <Text strong style={{ fontSize: 12 }}>
                    {sequence.trigger_type === 'new_lead' ? 'New Contact' :
                        sequence.trigger_type === 'tag_added' ? 'Tag Added' :
                            (sequence.trigger_type === 'keyword' || sequence.trigger_type === 'message_received') ? 'Keyword' :
                                sequence.trigger_type === 'inactive' ? 'Inactive' :
                                    sequence.trigger_type === 'manual' ? 'Manual' :
                                        sequence.trigger_type}
                </Text>
                {sequence.trigger_type === 'tag_added' && sequence.trigger_config?.tag_name && (
                    <Tag icon={<TagOutlined />} color="blue" style={{ margin: 0, fontSize: 10 }}>{sequence.trigger_config.tag_name}</Tag>
                )}
                {(sequence.trigger_type === 'keyword' || sequence.trigger_type === 'message_received') && (
                    <>
                        {sequence.trigger_config?.keyword && (
                            <Tag icon={<RobotOutlined />} color="purple" style={{ margin: 0, fontSize: 10 }}>{sequence.trigger_config.keyword}</Tag>
                        )}
                        {sequence.trigger_config?.keywords && (
                            typeof sequence.trigger_config.keywords === 'string'
                                ? sequence.trigger_config.keywords.split(',').map((k: string, i: number) => (
                                    <Tag key={`s-${i}`} icon={<RobotOutlined />} color="purple" style={{ margin: 0, fontSize: 10 }}>{k.trim()}</Tag>
                                ))
                                : Array.isArray(sequence.trigger_config.keywords) && sequence.trigger_config.keywords.map((k: string, i: number) => (
                                    <Tag key={`a-${i}`} icon={<RobotOutlined />} color="purple" style={{ margin: 0, fontSize: 10 }}>{k}</Tag>
                                ))
                        )}
                    </>
                )}
                {sequence.trigger_type === 'inactive' && sequence.trigger_config?.days_inactive && (
                    <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>{sequence.trigger_config.days_inactive} days</Tag>
                )}
            </div>
        </Card>
    );
};

// Main Sequences Page Component
const SequencesPage: React.FC = () => {
    const { token } = theme.useToken();
    const { isMobile } = useResponsive();
    const [viewMode, setViewMode] = useState<string>('my-sequences');
    const { data: mySequences = [], isLoading: isLoadingMy } = useDripCampaigns();
    const { data: communitySequences = [], isLoading: isLoadingCommunity } = useDripCampaigns({ allTenants: true, enabled: viewMode === 'community' });

    // Current view data
    const sequences = viewMode === 'my-sequences' ? mySequences : communitySequences;
    const isLoading = viewMode === 'my-sequences' ? isLoadingMy : isLoadingCommunity;

    const createCampaign = useCreateDripCampaign();
    const updateSteps = useUpdateDripSteps();
    const updateCampaign = useUpdateDripCampaign();
    const deleteCampaign = useDeleteDripCampaign();
    const cloneCampaign = useCloneDripCampaign();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const handleCreateSequence = () => {
        form.validateFields().then(async (values) => {
            try {
                // Build trigger_config based on trigger type
                let trigger_config: Record<string, any> = {};

                if (values.trigger === 'tag_added' && values.tag_name) {
                    trigger_config = {
                        tag_name: values.tag_name.trim()
                    };
                } else if (values.trigger === 'keyword' && values.keyword) {
                    const keywords = values.keyword.split(',').map((k: string) => k.trim()).filter(Boolean);
                    trigger_config = {
                        keywords: keywords,
                        match_mode: 'any'
                    };
                }

                const newCampaign = await createCampaign.mutateAsync({
                    name: values.name,
                    description: values.template ? `TEMPLATE:${values.template}` : values.description,
                    trigger_type: values.trigger,
                    trigger_config,
                    is_active: false,
                    organization_id: useAuthStore.getState().organization?.id
                });

                // If template selected, add steps immediately
                if (values.template && newCampaign?.id) {
                    const template = SEQUENCE_TEMPLATES.find(t => t.id === values.template);
                    if (template) {
                        // Map node IDs to real UUIDs to maintain connections
                        const idMap: Record<string, string> = {};
                        const realNodes = template.nodes.filter(n => n.type !== 'trigger');

                        realNodes.forEach(node => {
                            idMap[node.id] = crypto.randomUUID();
                        });

                        const steps = realNodes.map((node, idx) => {
                            // Find parent from edges
                            const edge = template.edges.find(e => e.target === node.id);
                            // If parent is a 'trigger' node, then this step is actually the root (parent = null)
                            const parentNode = edge ? template.nodes.find(n => n.id === edge.source) : null;
                            const parentId = (edge && parentNode && parentNode.type !== 'trigger') ? idMap[edge.source] : null;

                            return {
                                id: idMap[node.id],
                                campaign_id: newCampaign.id,
                                step_type: (node.type === 'message' ? 'message' : (node.type === 'delay' ? 'delay' : 'action')),
                                content: node.data.content || (node.type === 'delay' ? { delay_hours: node.data.delayHours } : {}),
                                parent_step_id: parentId,
                                position: node.position,
                                sequence_order: idx
                            };
                        });
                        // @ts-ignore
                        await updateSteps.mutateAsync({ campaignId: newCampaign.id, steps });
                    }
                }

                message.success(`Sequence "${values.name}" created!`);
                setShowCreateModal(false);
                form.resetFields();
                if (newCampaign && newCampaign.id) {
                    navigate(`/sequences/${newCampaign.id}`);
                }
            } catch (e) {
                message.error("Failed to create campaign");
            }
        });
    };

    const handleToggleStatus = async (sequence: DripCampaign) => {
        try {
            await updateCampaign.mutateAsync({
                id: sequence.id,
                is_active: !sequence.is_active
            });
            message.success(`Sequence ${sequence.is_active ? 'paused' : 'activated'}!`);
        } catch (e) {
            message.error("Failed to update status");
        }
    };

    const handleClone = async (id: string) => {
        try {
            const cloned = await cloneCampaign.mutateAsync(id);
            message.success("Sequence cloned!");
            if (cloned?.id) {
                navigate(`/sequences/${cloned.id}`);
            }
        } catch (e) {
            message.error("Failed to clone sequence");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCampaign.mutateAsync(id);
            message.success("Sequence deleted");
            setDeleteConfirmId(null);
        } catch (e) {
            message.error("Failed to delete sequence");
        }
    };

    // Page header is handled by AuthedLayout

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    // Filter sequences based on search term
    const filterBySearch = (items: DripCampaign[]) => {
        if (!searchTerm.trim()) return items;
        const lowerSearch = searchTerm.toLowerCase();
        return items.filter((s) =>
            s.name?.toLowerCase().includes(lowerSearch) ||
            s.description?.toLowerCase().includes(lowerSearch) ||
            s.trigger_type?.toLowerCase().includes(lowerSearch)
        );
    };

    const filteredSequences = filterBySearch(sequences);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Action Bar with dropdown and search */}
            <ActionBar
                viewModeFilter={{
                    value: viewMode,
                    onChange: setViewMode,
                    options: [
                        { value: 'my-sequences', label: <Space><UserOutlined />My Sequences</Space> },
                        { value: 'community', label: <Space><GlobalOutlined />Community</Space> },
                    ],
                }}
                search={{
                    placeholder: 'Search sequences...',
                    value: searchTerm,
                    onChange: setSearchTerm,
                }}
                primaryAction={{
                    label: 'Create Sequence',
                    icon: <PlusOutlined />,
                    onClick: () => setShowCreateModal(true),
                }}
            />

            {/* Content */}
            <div style={{ padding: isMobile ? 12 : 24, flex: 1, overflow: 'auto' }}>
                {viewMode === 'community' && (
                    <Alert
                        message="Community Sequences"
                        description="Click on a sequence to clone it to your account."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <div className={isMobile ? 'flex flex-col gap-4' : ''} style={!isMobile ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24, maxWidth: '100%' } : {}}>
                    {isLoading ? (
                        <Card loading />
                    ) : filteredSequences.length === 0 ? (
                        <Empty description={searchTerm ? 'No matching sequences' : (viewMode === 'community' ? 'No community sequences yet' : 'No sequences yet')} />
                    ) : (
                        filteredSequences.map((sequence: DripCampaign) => (
                            <SequenceCard
                                key={sequence.id}
                                sequence={sequence}
                                onSelect={() => viewMode === 'my-sequences' ? navigate(`/sequences/${sequence.id}`) : handleClone(sequence.id)}
                                onToggleStatus={() => handleToggleStatus(sequence)}
                                onClone={() => handleClone(sequence.id)}
                                onDelete={() => setDeleteConfirmId(sequence.id)}
                                isCommunity={viewMode === 'community'}
                            />
                        ))
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                <Modal
                    title="Delete Sequence"
                    open={!!deleteConfirmId}
                    onOk={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                    onCancel={() => setDeleteConfirmId(null)}
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                    confirmLoading={deleteCampaign.isPending}
                    width={isMobile ? '95%' : 416}
                >
                    <p>Are you sure you want to delete this sequence? This action cannot be undone.</p>
                </Modal>

                {/* Create Sequence Modal with Trigger Config */}
                <Modal
                    title="Create Drip Sequence"
                    open={showCreateModal}
                    onOk={handleCreateSequence}
                    onCancel={() => setShowCreateModal(false)}
                    okText="Create & Build"
                    confirmLoading={createCampaign.isPending}
                    width={isMobile ? '95%' : 600}
                >
                    <Form form={form} layout="vertical">
                        <Form.Item name="name" label="Sequence Name" rules={[{ required: true }]}>
                            <Input placeholder="e.g., Welcome Series" className="input-mobile" />
                        </Form.Item>
                        <Form.Item name="description" label="Description">
                            <TextArea placeholder="Describe the purpose of this sequence..." rows={2} />
                        </Form.Item>

                        <Form.Item name="template" label="Start from Template (Optional)">
                            <Select placeholder="Select a template or leave blank" allowClear onChange={(val) => {
                                const t = SEQUENCE_TEMPLATES.find(temp => temp.id === val);
                                if (t) {
                                    form.setFieldsValue({
                                        name: t.name,
                                        description: t.description
                                    });
                                }
                            }}>
                                {SEQUENCE_TEMPLATES.map(t => (
                                    <Select.Option key={t.id} value={t.id}>
                                        <Space>
                                            <Tag>{t.category}</Tag>
                                            {t.name}
                                        </Space>
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="trigger" label="Trigger Type" rules={[{ required: true }]}>
                            <Select placeholder="When should this start?">
                                <Select.Option value="new_lead">
                                    <Space>
                                        <Tag color="green">Auto</Tag>
                                        New contact added
                                    </Space>
                                </Select.Option>
                                <Select.Option value="tag_added">
                                    <Space>
                                        <Tag color="blue">Auto</Tag>
                                        Tag added to contact
                                    </Space>
                                </Select.Option>
                                <Select.Option value="manual">
                                    <Space>
                                        <Tag color="default">Manual</Tag>
                                        Manual enrollment only
                                    </Space>
                                </Select.Option>
                                <Select.Option value="keyword">
                                    <Space>
                                        <Tag color="purple">Auto</Tag>
                                        Keyword/Message trigger
                                    </Space>
                                </Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.trigger !== curr.trigger}>
                            {({ getFieldValue }) => {
                                const trigger = getFieldValue('trigger');

                                if (trigger === 'tag_added') {
                                    return (
                                        <Form.Item
                                            name="tag_name"
                                            label="Tag Name to Watch"
                                            rules={[{ required: true, message: 'Enter the tag name' }]}
                                            extra="Sequence starts when this tag is added to a contact"
                                        >
                                            <Input placeholder="e.g., Interested, VIP, Hot Lead" className="input-mobile" />
                                        </Form.Item>
                                    );
                                }

                                if (trigger === 'keyword') {
                                    return (
                                        <Form.Item
                                            name="keyword"
                                            label="Trigger Keyword"
                                            rules={[{ required: true, message: 'Enter the keyword' }]}
                                            extra="Sequence starts when a contact sends this exact word or phrase"
                                        >
                                            <Input placeholder="e.g., START, HELP, ORDER" className="input-mobile" />
                                        </Form.Item>
                                    );
                                }

                                if (trigger === 'new_lead') {
                                    return (
                                        <div style={{ padding: 12, background: token.colorSuccessBg, borderRadius: 8, marginBottom: 16 }}>
                                            <Text type="success">
                                                ✓ This sequence will automatically start for every new contact added.
                                            </Text>
                                        </div>
                                    );
                                }

                                if (trigger === 'manual') {
                                    return (
                                        <div style={{ padding: 12, background: token.colorInfoBg, borderRadius: 8, marginBottom: 16 }}>
                                            <Text>
                                                ℹ️ You'll manually enroll contacts from their profile page.
                                            </Text>
                                        </div>
                                    );
                                }

                                return null;
                            }}
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </div>
    );
};

export default SequencesPage;