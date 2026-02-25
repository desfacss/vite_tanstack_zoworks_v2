import React, { useCallback, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    Panel,
    ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Layout, Button, Drawer, App, Space, Card, Tabs,
    Popconfirm, Typography, Tag, Empty, theme, Dropdown
} from 'antd';
import { useResponsive } from '../hooks';
import { useSetPageHeader } from '../contexts/PageHeaderContext';
import {
    SaveOutlined, PlusOutlined, DeleteOutlined, SettingOutlined,
    CopyOutlined, HolderOutlined, MenuOutlined, TeamOutlined, MoreOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
    useDripCampaign,
    useUpdateDripSteps,
    useUpdateDripCampaign,
    useDeleteDripCampaign,
    useDeleteDripStep,
    DripStep
} from '../hooks/useDripCampaigns';
import { StepEditorForm, StepData } from '../components/drip/StepEditorForm';
import { CampaignSettingsForm } from '../components/drip/CampaignSettingsForm';
import { EnrollmentPanel } from '../components/drip/EnrollmentPanel';

const { Content } = Layout;
const { Text } = Typography;

// Step card for list view
const StepCard: React.FC<{
    step: StepData;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ step, index, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
    const getStepLabel = () => {
        if (step.stepType === 'message') {
            const rawLabel = step.content.template_name || step.content.text || 'Message';
            // Clean up ugly template names like 'name_copy_2_copy_402'
            return typeof rawLabel === 'string' ? rawLabel.replace(/(_copy_\d+)+/g, '').replace(/(_copy_.*)+/g, '') : rawLabel;
        } else if (step.stepType === 'delay') {
            const hours = step.content.delay_hours || 0;
            if (hours < 1 && hours > 0) {
                return `Wait ${Math.round(hours * 60)}m`;
            }
            return `Wait ${hours}h`;
        } else if (step.stepType === 'action') {
            return step.content.action_type === 'assign_agent' ? 'Assign Agent' : `Set Status: ${step.content.action_value}`;
        }
        return step.stepType;
    };

    return (
        <Card
            size="small"
            style={{
                marginBottom: 8,
                borderLeft: step.content.trigger_payload ? `4px solid ${theme.useToken().token.colorSuccess}` : undefined
            }}
            hoverable
            onClick={onEdit}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Text type="secondary">#{index + 1}</Text>
                    <Tag color={step.stepType === 'message' ? 'blue' : (step.stepType === 'delay' ? 'orange' : 'purple')}>
                        {step.stepType}
                    </Tag>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong={!!step.content.trigger_payload} ellipsis style={{ maxWidth: 300 }}>
                            {getStepLabel()}
                        </Text>
                        {step.content.trigger_payload && (
                            <Text type="success" style={{ fontSize: 11 }}>
                                Trigger: "{step.content.trigger_payload}"
                            </Text>
                        )}
                    </div>
                </div>
                <Space onClick={(e) => e.stopPropagation()}>
                    <Button
                        type="text"
                        icon={<HolderOutlined />}
                        disabled={isFirst}
                        onClick={onMoveUp}
                        title="Move Up"
                        className="btn-touch"
                    />
                    <Button
                        type="text"
                        icon={<HolderOutlined style={{ transform: 'rotate(180deg)' }} />}
                        disabled={isLast}
                        onClick={onMoveDown}
                        title="Move Down"
                        className="btn-touch"
                    />
                    <Popconfirm title="Delete this step?" onConfirm={onDelete}>
                        <Button type="text" danger icon={<DeleteOutlined />} className="btn-touch" />
                    </Popconfirm>
                </Space>
            </div>
        </Card>
    );
};

const DripCampaignBuilder: React.FC = () => {
    const { token } = theme.useToken();
    const { id: campaignId } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const { isMobile, drawerWidth } = useResponsive();

    const { data: campaign, isLoading, refetch } = useDripCampaign(campaignId || null);
    const updateSteps = useUpdateDripSteps();
    const updateCampaign = useUpdateDripCampaign();
    const deleteCampaign = useDeleteDripCampaign();
    const deleteStepMutation = useDeleteDripStep();

    // View state - default to list on mobile, flow on desktop
    const [activeTab, setActiveTab] = useState<'flow' | 'list' | 'enrollments'>(isMobile ? 'list' : 'list'); // Always default to list for simplicity
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [stepEditorOpen, setStepEditorOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<StepData | null>(null);
    const [editingStepIndex, setEditingStepIndex] = useState<number>(-1);

    // Steps state (unified for both views)
    const [steps, setSteps] = useState<StepData[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // React Flow state
    const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

    // Convert DB steps to local format or load from template
    React.useEffect(() => {
        if (campaign?.steps && campaign.steps.length > 0) {
            const localSteps: StepData[] = campaign.steps.map((s: DripStep, idx: number) => ({
                id: s.id,
                stepType: s.step_type as 'message' | 'delay',
                content: s.content || {},
                parent_step_id: s.parent_step_id,
                position: s.position || { x: 250, y: idx * 150 },
                sequence_order: s.sequence_order || idx
            }));
            setSteps(localSteps);
            setHasChanges(false);
        } else if (campaign?.description?.startsWith('TEMPLATE:')) {
            // Hacky way to pass template ID via description for now, or we can use a URL param
            // For now, let's assume the parent component handles the creation with steps
        }
    }, [campaign]);

    // Sync steps to React Flow nodes with improved branching layout
    React.useEffect(() => {
        // Simple layout algorithm:
        // 1. Identify layers based on distance from root
        // 2. Spread nodes in the same layer horizontally

        const nodesWithDepth: (StepData & { depth: number; siblingIdx: number; siblingCount: number })[] = [];
        const processNode = (nodeId: string | null, depth: number) => {
            const children = steps.filter(s => s.parent_step_id === nodeId);
            children.forEach((child, idx) => {
                nodesWithDepth.push({ ...child, depth, siblingIdx: idx, siblingCount: children.length });
                processNode(child.id, depth + 1);
            });
        };

        const roots = steps.filter(s => !s.parent_step_id);
        roots.forEach((root, idx) => {
            nodesWithDepth.push({ ...root, depth: 0, siblingIdx: idx, siblingCount: roots.length });
            processNode(root.id, 1);
        });

        const newNodes: Node[] = steps.map((step) => {
            const depthInfo = nodesWithDepth.find(n => n.id === step.id);
            const depth = depthInfo?.depth || 0;
            const siblingIdx = depthInfo?.siblingIdx || 0;
            const siblingCount = depthInfo?.siblingCount || 1;

            // Calculate auto-position if not already set or if it's the default vertical one
            const isDefaultVertical = step.position?.x === 250 && step.position?.y % 150 === 0;

            let pos = step.position;
            if (!pos || isDefaultVertical) {
                // Center the branches
                const horizontalSpacing = 280;
                const verticalSpacing = 160;
                const xOffset = (siblingIdx - (siblingCount - 1) / 2) * horizontalSpacing;
                pos = {
                    x: 400 + xOffset, // Shifted to right to give more room
                    y: depth * verticalSpacing + 50
                };
            }

            let label: string = step.stepType;
            if (step.stepType === 'message') {
                const rawLabel = step.content.template_name || step.content.text || 'Message';
                label = typeof rawLabel === 'string' ? rawLabel.replace(/(_copy_\d+)+/g, '').replace(/(_copy_.*)+/g, '') : rawLabel;
            } else if (step.stepType === 'delay') {
                const hours = step.content.delay_hours || 0;
                if (hours < 1 && hours > 0) {
                    label = `Wait ${Math.round(hours * 60)}m`;
                } else {
                    label = `Wait ${hours}h`;
                }
            } else if (step.stepType === 'action') {
                label = step.content.action_type === 'assign_agent' ? 'Assign Agent' : `Set Status: ${step.content.action_value}`;
            }

            return {
                id: step.id,
                type: 'default',
                data: { label, stepType: step.stepType, content: step.content },
                position: pos,
            };
        });

        // Create edges based on parent_step_id
        const newEdges: Edge[] = [];
        steps.forEach(step => {
            if (step.parent_step_id) {
                newEdges.push({
                    id: `e-${step.parent_step_id}-${step.id}`,
                    source: step.parent_step_id,
                    target: step.id,
                    type: 'smoothstep',
                    animated: true,
                    label: step.content.trigger_payload || '',
                    labelStyle: { fill: '#00a884', fontWeight: 700, fontSize: 10 },
                    labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
                });
            }
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [steps, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => {
            if (params.source && params.target) {
                // STRICTNESS CHECK: Calculate relationship
                const updatedSteps = [...steps];
                const targetIdx = updatedSteps.findIndex(s => s.id === params.target);
                const parentIdx = updatedSteps.findIndex(s => s.id === params.source);

                if (targetIdx >= 0 && parentIdx >= 0) {
                    const parent = updatedSteps[parentIdx];
                    const target = updatedSteps[targetIdx];

                    // Rule: One parent can only have ONE linear (auto) child
                    const existingChildren = updatedSteps.filter(s => s.parent_step_id === parent.id);
                    const hasLinearChild = existingChildren.some(s => !s.content.trigger_payload);

                    if (!target.content.trigger_payload && hasLinearChild) {
                        message.warning('This parent already has an automatic next step. This new connection will be treated as the NEW automatic step.');
                        // Decouple the old linear child
                        const oldLinearIdx = updatedSteps.findIndex(s => s.parent_step_id === parent.id && !s.content.trigger_payload);
                        if (oldLinearIdx >= 0) updatedSteps[oldLinearIdx].parent_step_id = null;
                    }

                    updatedSteps[targetIdx].parent_step_id = params.source;
                    setSteps(updatedSteps);
                    setHasChanges(true);
                }
            }
            setEdges((eds: Edge[]) => addEdge(params, eds));
        },
        [steps, setEdges, message],
    );

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        const idx = steps.findIndex(s => s.id === node.id);
        if (idx >= 0) {
            setEditingStep(steps[idx]);
            setEditingStepIndex(idx);
            setStepEditorOpen(true);
        }
    };

    // Step management
    const handleAddStep = (stepType: 'message' | 'delay' | 'action') => {
        const newStep: StepData = {
            id: `temp_${Date.now()}`,
            stepType,
            content: stepType === 'delay' ? { delay_hours: 24 } : (stepType === 'action' ? { action_type: 'assign_agent' } : {}),
            position: { x: 250, y: steps.length * 150 }
        };
        setSteps([...steps, newStep]);
        setHasChanges(true);

        // Open editor for new step
        setEditingStep(newStep);
        setEditingStepIndex(steps.length);
        setStepEditorOpen(true);
    };

    const handleUpdateStep = (values: { stepType: 'message' | 'delay' | 'action'; content: any }) => {
        if (editingStepIndex < 0) return;

        const updatedSteps = [...steps];
        updatedSteps[editingStepIndex] = {
            ...updatedSteps[editingStepIndex],
            stepType: values.stepType,
            content: values.content
        };
        setSteps(updatedSteps);
        setHasChanges(true);
        setStepEditorOpen(false);
        setEditingStep(null);
        message.success('Step updated');
    };

    const handleDeleteStep = (index: number) => {
        const step = steps[index];
        const deletedStepId = step.id;
        const parentId = step.parent_step_id;

        // If it's a saved step, delete from DB
        if (deletedStepId && !deletedStepId.startsWith('temp_') && campaignId) {
            deleteStepMutation.mutate({ stepId: deletedStepId, campaignId });
        }

        // Bridge the gap: Find all steps that had this step as a parent and point them to the deleted step's parent
        let updatedSteps = steps.map(s => {
            if (s.parent_step_id === deletedStepId) {
                return { ...s, parent_step_id: parentId };
            }
            return s;
        });

        updatedSteps = updatedSteps.filter((_, i) => i !== index);
        setSteps(updatedSteps);
        setHasChanges(true);
        setStepEditorOpen(false);
        message.success('Step removed');
    };

    const handleMoveStep = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= steps.length) return;

        const updatedSteps = [...steps];
        [updatedSteps[index], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[index]];

        // Update positions
        updatedSteps.forEach((step, idx) => {
            step.position = { x: 250, y: idx * 150 };
        });

        setSteps(updatedSteps);
        setHasChanges(true);
    };

    // Save all changes
    const handleSave = async () => {
        if (!campaignId) return;

        const stepsToSave: any[] = steps.map((step, idx) => ({
            id: step.id,
            campaign_id: campaignId,
            step_type: step.stepType,
            content: step.content,
            parent_step_id: step.parent_step_id || null,
            position: step.position || { x: 250, y: idx * 150 },
            sequence_order: idx
        }));

        console.log('[DripBuilder] Saving Workflow Tasks:', stepsToSave);

        try {
            await updateSteps.mutateAsync({ campaignId, steps: stepsToSave });
            setHasChanges(false);
            refetch();
            message.success('Workflow saved!');
        } catch (e) {
            message.error('Failed to save');
            console.error(e);
        }
    };

    // Campaign settings
    const handleSaveSettings = async (values: any) => {
        if (!campaignId) return;

        try {
            await updateCampaign.mutateAsync({ id: campaignId, ...values });
            setSettingsOpen(false);
            message.success('Settings saved');
        } catch (e) {
            message.error('Failed to save settings');
        }
    };

    // Delete campaign
    const handleDeleteCampaign = async () => {
        if (!campaignId) return;

        try {
            await deleteCampaign.mutateAsync(campaignId);
            message.success('Sequence deleted');
            navigate('/sequences');
        } catch (e) {
            message.error('Failed to delete sequence');
        }
    };

    // Set page header with back button and actions
    useSetPageHeader({
        title: campaign?.name || 'Sequence Builder',
        subtitle: campaign?.is_active ? 'Active' : 'Draft',
        backButton: {
            label: 'Sequences',
            onClick: () => navigate('/sequences'),
        },
        actions: isMobile ? (
            <Dropdown
                menu={{
                    items: [
                        {
                            key: 'settings',
                            icon: <SettingOutlined />,
                            label: 'Settings',
                            onClick: () => setSettingsOpen(true)
                        },
                        {
                            key: 'delete',
                            icon: <DeleteOutlined />,
                            label: 'Delete',
                            danger: true,
                            onClick: handleDeleteCampaign,
                        }
                    ]
                }}
                trigger={['click']}
            >
                <Button icon={<MoreOutlined />} size="small" />
            </Dropdown>
        ) : (
            <Space>
                <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} size="small">
                    Settings
                </Button>
                <Popconfirm
                    title="Delete Sequence"
                    description="Are you sure you want to delete this sequence?"
                    onConfirm={handleDeleteCampaign}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                >
                    <Button danger icon={<DeleteOutlined />} size="small">
                        Delete
                    </Button>
                </Popconfirm>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={updateSteps.isPending}
                    disabled={!hasChanges}
                    size="small"
                >
                    {hasChanges ? 'Save' : 'Saved'}
                </Button>
            </Space>
        ),
    }, [campaign?.name, campaign?.is_active, isMobile, updateSteps.isPending, hasChanges]);

    if (isLoading) return <div style={{ padding: 24 }}>Loading...</div>;

    return (
        <Layout style={{ height: '100%', background: token.colorBgContainer }}>
            {/* Toolbar */}
            <div style={{
                padding: isMobile ? '8px 12px' : '8px 24px',
                background: token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
            }}>
                <Space wrap size="small">
                    <Tag>{campaign?.trigger_type}</Tag>
                    {campaign?.is_active ? <Tag color="green">Active</Tag> : <Tag>Draft</Tag>}
                </Space>
                <Space wrap size="small">
                    <Button icon={<PlusOutlined />} size="small" onClick={() => handleAddStep('message')}>
                        {isMobile ? 'Message' : 'Add Message'}
                    </Button>
                    <Button icon={<PlusOutlined />} size="small" onClick={() => handleAddStep('delay')}>
                        {isMobile ? 'Delay' : 'Add Delay'}
                    </Button>
                    <Button icon={<PlusOutlined />} size="small" onClick={() => handleAddStep('action')}>
                        {isMobile ? 'Action' : 'Add Action'}
                    </Button>
                    {isMobile && (
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            size="small"
                            onClick={handleSave}
                            loading={updateSteps.isPending}
                            disabled={!hasChanges}
                        >
                            {hasChanges ? 'Save' : 'Saved'}
                        </Button>
                    )}
                </Space>
            </div>

            {/* Main Content with Tabs */}
            <Content style={{ height: '100%', overflow: 'hidden' }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={(k) => setActiveTab(k as 'flow' | 'list' | 'enrollments')}
                    style={{ height: '100%' }}
                    tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
                    items={[
                        {
                            key: 'list',
                            label: <span><MenuOutlined /> List View</span>,
                            children: (
                                <div style={{ padding: 24, height: 'calc(100% - 46px)', overflow: 'auto' }}>
                                    {steps.length === 0 ? (
                                        <Empty description="No steps yet. Add a message or delay to get started." />
                                    ) : (
                                        <div style={{ maxWidth: 600 }}>
                                            {steps.map((step, idx) => (
                                                <StepCard
                                                    key={step.id}
                                                    step={step}
                                                    index={idx}
                                                    onEdit={() => {
                                                        setEditingStep(step);
                                                        setEditingStepIndex(idx);
                                                        setStepEditorOpen(true);
                                                    }}
                                                    onDelete={() => handleDeleteStep(idx)}
                                                    onMoveUp={() => handleMoveStep(idx, 'up')}
                                                    onMoveDown={() => handleMoveStep(idx, 'down')}
                                                    isFirst={idx === 0}
                                                    isLast={idx === steps.length - 1}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        },
                        {
                            key: 'flow',
                            label: <span><CopyOutlined /> Visual Flow</span>,
                            children: (
                                <div style={{ height: 'calc(100vh - 200px)', width: '100%' }}>
                                    <ReactFlowProvider>
                                        <ReactFlow
                                            nodes={nodes}
                                            edges={edges}
                                            onNodesChange={onNodesChange}
                                            onEdgesChange={onEdgesChange}
                                            onConnect={onConnect}
                                            onNodeClick={onNodeClick}
                                            fitView
                                            style={{ width: '100%', height: '100%' }}
                                        >
                                            <Controls />
                                            <MiniMap />
                                            <Background gap={12} size={1} />
                                            <Panel position="top-left">
                                                <Card size="small" style={{ width: 180 }}>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        Click nodes to edit. Drag to reposition.
                                                    </Text>
                                                </Card>
                                            </Panel>
                                        </ReactFlow>
                                    </ReactFlowProvider>
                                </div>
                            )
                        },
                        {
                            key: 'enrollments',
                            label: <span><TeamOutlined /> Enrollments</span>,
                            children: campaignId ? (
                                <div style={{ height: '100%', overflow: 'auto', padding: 24 }}>
                                    <EnrollmentPanel campaignId={campaignId} />
                                </div>
                            ) : null
                        }
                    ]}
                />
            </Content>

            {/* Step Editor Drawer */}
            <Drawer
                title={editingStep?.id.startsWith('temp_') ? 'Add Step' : 'Edit Step'}
                placement="right"
                open={stepEditorOpen}
                onClose={() => { setStepEditorOpen(false); setEditingStep(null); }}
                width={drawerWidth}
            >
                <StepEditorForm
                    step={editingStep}
                    parentStep={editingStep?.parent_step_id ? steps.find(s => s.id === editingStep.parent_step_id) : null}
                    onSave={handleUpdateStep}
                    onDelete={editingStepIndex >= 0 ? () => handleDeleteStep(editingStepIndex) : undefined}
                    onCancel={() => { setStepEditorOpen(false); setEditingStep(null); }}
                />
            </Drawer>

            {/* Settings Drawer */}
            <Drawer
                title="Sequence Settings"
                placement="right"
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                width={drawerWidth}
            >
                <CampaignSettingsForm
                    campaign={campaign}
                    onSave={handleSaveSettings}
                    loading={updateCampaign.isPending}
                />
            </Drawer>
        </Layout >
    );
};

export default DripCampaignBuilder;
