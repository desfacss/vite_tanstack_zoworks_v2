import React, { useMemo, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  Handle,
  Position,
  addEdge,
  Connection,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, Typography, Space, Badge, Tooltip, Button, Divider } from 'antd';
import { MousePointer, Plus, Trash2, X } from 'lucide-react';

const { Text } = Typography;

// --- Custom Node Component ---
const StageNode = ({ data, selected }: any) => {
  const { name, category, color, description, onDelete } = data;
  
  return (
    <Card 
      size="small" 
      style={{ 
        width: 180, 
        borderRadius: '12px',
        border: `2px solid ${selected ? '#1677ff' : '#f0f0f0'}`,
        boxShadow: selected ? '0 0 10px rgba(22, 119, 255, 0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease',
        background: '#fff',
        position: 'relative',
        overflow: 'visible'
      }}
      bodyStyle={{ padding: '8px 12px' }}
    >
      {/* Delete Button */}
      {selected && (
        <Button
          type="text"
          danger
          size="small"
          icon={<X size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            background: '#fff',
            border: '1px solid #ff4d4f',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        />
      )}

      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ 
            background: '#bfbfbf', 
            width: '40px', 
            height: '6px', 
            borderRadius: '3px',
            border: 'none',
            top: '-3px'
        }} 
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color || '#1677ff' }} />
          <Tooltip title={name} placement="top">
            <Text strong ellipsis style={{ flex: 1, fontSize: '13px' }}>{name}</Text>
          </Tooltip>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge 
            count={category} 
            style={{ 
              backgroundColor: '#f5f5f5', 
              color: '#8c8c8c', 
              fontSize: '9px',
              padding: '0 4px',
              height: '14px',
              lineHeight: '14px'
            }} 
          />
          {description && (
             <Tooltip title={description}>
               <Text type="secondary" style={{ fontSize: '10px' }}>ℹ️</Text>
             </Tooltip>
          )}
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ 
            background: '#1677ff', 
            width: '40px', 
            height: '6px', 
            borderRadius: '3px',
            border: 'none',
            bottom: '-3px'
        }} 
      />
    </Card>
  );
};

// --- Custom Edge Component with Delete Button ---
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  label
}: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: any) => {
    evt.stopPropagation();
    if (data?.onDelete) {
        data.onDelete(id);
    }
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {label && (
                <div style={{ 
                    background: 'rgba(255, 255, 255, 0.8)', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    fontWeight: 600,
                    color: style.stroke || '#8c8c8c',
                    fontSize: '10px'
                }}>
                    {label}
                </div>
            )}
            <Button
                type="text"
                danger
                size="small"
                icon={<X size={10} />}
                onClick={onEdgeClick}
                style={{
                    background: '#fff',
                    border: '1px solid #ff4d4f',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
            />
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = {
  stageNode: StageNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};

interface VisualFlowManagerProps {
  stages: any[];
  transitions: any[];
  onNodeClick: (stage: any) => void;
  onEdgeClick: (index: number, transition: any) => void;
  onPositionsChange?: (positions: Record<string, { x: number, y: number }>) => void;
  onStagesChange?: (stages: any[]) => void;
  onTransitionsChange?: (transitions: any[]) => void;
  metadata?: any;
}

const VisualFlowManager: React.FC<VisualFlowManagerProps> = ({ 
  stages, 
  transitions, 
  onNodeClick, 
  onEdgeClick,
  onPositionsChange,
  onStagesChange,
  onTransitionsChange,
  metadata 
}) => {
  const layout = metadata?.visual_layout?.positions || {};

  const onNodesDeleteInternal = useCallback((nodeId: string) => {
    if (onStagesChange) {
      onStagesChange(stages.filter(s => s.id !== nodeId));
    }
  }, [stages, onStagesChange]);

  const onEdgesDeleteInternal = useCallback((edgeId: string) => {
    if (onTransitionsChange) {
      // Edge ID is e-index
      const index = parseInt(edgeId.split('-')[1]);
      onTransitionsChange(transitions.filter((_, idx) => idx !== index));
    }
  }, [transitions, onTransitionsChange]);

  // Map stages to nodes
  const initialNodes: Node[] = useMemo(() => {
    return stages.map((s, idx) => {
      const pos = layout[s.id] || { x: idx * 250, y: 100 };
      return {
        id: s.id,
        type: 'stageNode',
        position: pos,
        data: { ...s, onDelete: () => onNodesDeleteInternal(s.id) },
      };
    });
  }, [stages, layout, onNodesDeleteInternal]);

  // Map transitions to edges
  const initialEdges: Edge[] = useMemo(() => {
    return transitions.map((t, idx) => {
      const isManual = t.trigger === 'manual' || t.is_manual;
      return {
        id: `e-${idx}`,
        source: t.from,
        target: t.to,
        type: 'customEdge',
        label: t.label || '',
        animated: !isManual,
        style: { stroke: isManual ? '#1890ff' : '#52c41a', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isManual ? '#1890ff' : '#52c41a',
        },
        data: { ...t, index: idx, onDelete: onEdgesDeleteInternal }
      };
    });
  }, [transitions, onEdgesDeleteInternal]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes from props only if count or IDs changed to avoid reset during drag
  useEffect(() => {
    const propNodeIds = stages.map(s => s.id).join(',');
    const stateNodeIds = nodes.map(n => n.id).join(',');
    
    if (propNodeIds !== stateNodeIds) {
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes]);

  // Sync edges from props
  useEffect(() => {
    const propEdgeIds = transitions.map((_, i) => `e-${i}`).join(',');
    const stateEdgeIds = edges.map(e => e.id).join(',');
    
    if (propEdgeIds !== stateEdgeIds) {
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges]);

  const onDragEnd = useCallback(() => {
    if (onPositionsChange) {
      const positions: Record<string, { x: number, y: number }> = {};
      nodes.forEach(node => {
        positions[node.id] = node.position;
      });
      onPositionsChange(positions);
    }
  }, [nodes, onPositionsChange]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeClick(node.data);
  }, [onNodeClick]);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    onEdgeClick(edge.data.index, edge.data);
  }, [onEdgeClick]);

  const onConnect = useCallback((params: Connection) => {
    const fromStage = stages.find(s => s.id === params.source);
    const toStage = stages.find(s => s.id === params.target);
    
    if (fromStage && toStage) {
        const newTransition: any = {
            id: `${params.source}_to_${params.target}`,
            from: params.source,
            to: params.target,
            label: `To ${toStage.name}`,
            trigger: 'manual',
            is_manual: true,
            ui: { icon: 'arrow-right', button_variant: 'primary', button_color: '#1677ff' },
            guard_rules: { allowed_roles: [], required_fields: [] },
            condition: { combinator: 'and', rules: [] }
        };
        
        if (onTransitionsChange) {
            onTransitionsChange([...transitions, newTransition]);
        }

        setEdges((eds) => addEdge({
            ...params,
            type: 'customEdge',
            label: newTransition.label,
            style: { stroke: '#1890ff', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#1890ff' },
            data: { ...newTransition, index: transitions.length, onDelete: onEdgesDeleteInternal }
        }, eds));
    }
  }, [stages, transitions, onTransitionsChange, setEdges, onEdgesDeleteInternal]);

  // Keyboard delete handlers for standard ReactFlow behavior
  const onNodesDelete = useCallback((deleted: Node[]) => {
    if (onStagesChange) {
      const deletedIds = new Set(deleted.map(n => n.id));
      onStagesChange(stages.filter(s => !deletedIds.has(s.id)));
    }
  }, [stages, onStagesChange]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    if (onTransitionsChange) {
      const deletedIndexes = new Set(deleted.map(e => e.data?.index));
      onTransitionsChange(transitions.filter((_, idx) => !deletedIndexes.has(idx)));
    }
  }, [transitions, onTransitionsChange]);

  const addNode = useCallback(() => {
    if (onStagesChange) {
        const nextId = `stage_${stages.length + 1}`;
        const newNode = {
            id: nextId,
            name: 'New Stage',
            category: 'NEW',
            color: '#1677ff',
            sequence: stages.length + 1,
            description: ''
        };
        onStagesChange([...stages, newNode]);
        onNodeClick(newNode);
    }
  }, [stages, onStagesChange, onNodeClick]);

  return (
    <div style={{ height: '700px', width: '100%', border: '1px solid #f0f0f0', borderRadius: '12px', background: '#fafafa', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeDragStop={onDragEnd}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background color="#eee" gap={20} size={1} />
        <Controls />
        
        <Panel position="top-left">
            <Button 
                type="primary" 
                icon={<Plus size={16} />} 
                onClick={addNode}
                style={{ borderRadius: '8px' }}
            >
                Add Stage
            </Button>
        </Panel>

        <Panel position="top-right">
          <Card size="small" style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Space direction="vertical" size={4}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 12, height: 2, background: '#1890ff' }} />
                <Text style={{ fontSize: '12px' }}>Manual Transition</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 12, height: 2, borderBottom: '2px dashed #52c41a' }} />
                <Text style={{ fontSize: '12px' }}>Auto Transition (Animated)</Text>
              </div>
              <Divider style={{ margin: '4px 0' }} />
              <Text type="secondary" style={{ fontSize: '10px' }}>
                <MousePointer size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Click node/edge to edit
              </Text>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                <X size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Click (X) to delete
              </Text>
            </Space>
          </Card>
        </Panel>
      </ReactFlow>

      <style>{`
        .react-flow__edge-path {
           stroke-opacity: 0.8;
           transition: stroke-opacity 0.2s;
        }
        .react-flow__edge:hover .react-flow__edge-path {
           stroke-opacity: 1;
           stroke-width: 3;
        }
      `}</style>
    </div>
  );
};

export default VisualFlowManager;
