import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Select, Button, message } from 'antd';
import { MoreHorizontal, Plus, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import RowActions from './RowActions';
import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useQueryClient } from '@tanstack/react-query';

// Styled components - Updated to use CSS variables for tenant theming
const KanbanContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px); /* Adjust based on header height */
  overflow: hidden;
`;

const Header = styled.div`
  padding-bottom: 16px;
`;

const LanesContainer = styled.div`
  display: flex;
  gap: 16px;
  overflow-x: auto;
  flex: 1;
  padding-bottom: 16px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
`;

const Lane = styled.div<{ highlighted?: boolean }>`
  background-color: ${(props) => props.color || 'var(--color-bg-secondary)'};
  border-radius: var(--tenant-border-radius, 8px);
  padding: 16px;
  width: 300px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  height: calc(100vh - 300px);
  scroll-snap-align: start;
  &.collapsed {
    width: 60px !important;
    min-width: 60px !important;
  }
`;

const LaneContent = styled.div`
  flex: 1;
  min-height: 100px; /* Ensure empty lanes are droppable */
  overflow-y: auto;
`;

const CardWrapper = styled.div`
  margin-bottom: 1rem;
  .ant-card {
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--tenant-border-radius, 8px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
      border-color: rgba(var(--color-primary-rgb, 0, 0, 0), 0.3);
    }
  }
  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .card-description {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin-top: 0.5rem;
  }
  .card-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
`;


interface KanbanViewProps {
  entityType: string;
  viewConfig?: any;
  data: any[];
  isLoading?: boolean;
  config?: any;
  globalFilters?: React.ReactNode;
}

// Unified LaneConfig to cover both sources but interpret based on context
interface LaneConfigItem {
  id?: string; // Present if from workflow stages
  name: string; // Present in both, used as display name or ID depending on source
  color: string;
  sequence: number;
}

interface BoardLane {
  id: string;    // This will be the actual value used for grouping/filtering (stage.id or type.name)
  title: string; // This will be the display title (stage.name or type.name)
  color: string;
  cards: any[];
}

const KanbanView: React.FC<KanbanViewProps> = ({
  entityType,
  viewConfig,
  data = [],
  isLoading = false,
  config,
  globalFilters,
}) => {
  const { setConfig } = useAuthedLayoutConfig();
  const { organization, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [collapsedLanes, setCollapsed] = useState<Record<string, boolean>>({});

  // Initialize groupByType with a fallback to workflowDefinitions
  const [groupByType, setGroupBy] = useState<string>(() => {
    const types = viewConfig?.kanbanview?.types;
    if (types && Object.keys(types).length > 0) {
      return Object.keys(types)[0];
    }
    // Fallback to first workflow definition if available
    return '';
  });

  const [workflowDefinitions, setWorkflowDefinitions] = useState<any[]>([]);

  // Fetch workflow definitions
  useEffect(() => {
    const fetchWorkflowDefinitions = async () => {
      if (!organization?.id) return;
      try {
        const { data: workflows, error } = await supabase
          .schema('workflow')
          .from('dynamic_workflow_definitions')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('entity_type', entityType)
          .eq('is_active', true);

        if (error) {
          throw error;
        }
        setWorkflowDefinitions(workflows || []);
        // Set default groupByType to first workflow if no types are defined
        if (!groupByType && workflows?.length > 0) {
          setGroupBy(`workflow_${workflows[0].id}`);
        }
      } catch (error: any) {
        console.error('Error fetching workflow definitions:', error.message);
      }
    };
    fetchWorkflowDefinitions();
  }, [organization?.id, entityType, groupByType]);

  // Compute groupByOptions with workflow definitions
  const groupByOptions = useMemo(() => {
    const options = Object.entries(viewConfig?.kanbanview?.types || {}).map(([key, type]) => ({
      value: key,
      label: (type as any).name,
    }));

    // Add workflow-based groupBy options
    workflowDefinitions.forEach((workflow) => {
      options.push({
        value: `workflow_${workflow.id}`,
        label: workflow.name,
      });
    });

    return options;
  }, [viewConfig, workflowDefinitions]);

  // Initialize and update boardData
  const [boardData, setBoardData] = useState<Record<string, BoardLane>>({});

  // Effect to update boardData when data, viewConfig, groupByType, or workflowDefinitions change
  useEffect(() => {
    if (!groupByType || !viewConfig?.kanbanview) {
      setBoardData({}); // Clear board if no group type or config
      return;
    }

    let fieldPath: string | undefined;
    let processedLanes: BoardLane[] = [];

    if (groupByType?.startsWith('workflow_')) {
      // Logic for grouping by dynamic_workflow_definitions
      const workflowId = groupByType?.replace('workflow_', '');
      const workflow = workflowDefinitions?.find((w) => w.id === workflowId);
      if (workflow) {
        fieldPath = 'stage_id'; // Explicitly use 'stage_id' for tickets when grouping by workflow
        processedLanes = workflow.definitions?.stages?.map((stage: any, index: number) => ({
          id: stage.id,       // Internal ID for grouping/filtering (e.g., "NEW_TICKET")
          title: stage.name,   // Display title for the lane (e.g., "New Ticket")
          color: stage.color || '#f0f0f0',
          cards: [], // Cards will be filled below
        })).sort((a, b) => a.sequence - b.sequence) || []; // Ensure lanes are sorted
      }
    } else {
      // Logic for grouping by viewConfig.kanbanview.types (existing logic)
      const selectedType = viewConfig?.kanbanview?.types[groupByType];
      if (selectedType) {
        fieldPath = selectedType?.fieldPath;
        processedLanes = selectedType?.lanes?.sort((a: LaneConfigItem, b: LaneConfigItem) => a.sequence - b.sequence).map((laneConfig: LaneConfigItem) => ({
          id: laneConfig?.name,    // Use 'name' as ID for compatibility with old config
          title: laneConfig?.name, // Use 'name' as title for display
          color: laneConfig?.color,
          cards: [], // Cards will be filled below
        })) || [];
      }
    }

    if (!fieldPath || !processedLanes.length) {
      setBoardData({});
      return;
    }

    const newBoard: Record<string, BoardLane> = {};
    processedLanes.forEach((lane) => {
      newBoard[lane.id] = { // Key by the lane's determined 'id'
        ...lane,
        cards: data.filter((item) => item[fieldPath!] === lane.id), // Filter by lane.id
      };
    });

    setBoardData(newBoard);
  }, [data, viewConfig, groupByType, workflowDefinitions]);
  // Validate viewConfig - but note: we do the actual early return after all hooks
  const hasValidConfig = viewConfig?.kanbanview && (viewConfig.kanbanview.types || workflowDefinitions.length > 0 || groupByType);

  // Handle drag-and-drop with Supabase RPC
  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) {
        console.log('No destination for drag:', draggableId);
        return;
      }

      const sourceLaneId = source.droppableId; // This is the 'id' of the source lane (stage.id or type.name)
      const destLaneId = destination.droppableId; // This is the 'id' of the destination lane (stage.id or type.name)
      const sourceIndex = source.index;
      const destIndex = destination.index;

      // Guard against dragging to the same lane at the same position (no change needed)
      if (sourceLaneId === destLaneId && sourceIndex === destIndex) {
        return;
      }

      // Optimistic update
      setBoardData((prev) => {
        const newBoardData = { ...prev };
        const sourceLane = { ...newBoardData[sourceLaneId] };
        const destLane = { ...newBoardData[destLaneId] };

        const [movedCard] = sourceLane.cards.splice(sourceIndex, 1);

        // Determine the field path for the update based on groupByType
        let fieldPathForUpdate: string;
        if (groupByType.startsWith('workflow_')) {
          fieldPathForUpdate = 'stage_id'; // When using workflows, update 'stage_id' field
        } else {
          fieldPathForUpdate = viewConfig.kanbanview.types[groupByType]?.fieldPath || 'current_stage';
        }

        // Update the card's field to the *ID* of the destination lane
        // `destLane.id` holds the correct value for the target field (stage.id or type.name)
        movedCard[fieldPathForUpdate] = destLane.id;

        destLane.cards.splice(destIndex, 0, movedCard);

        newBoardData[sourceLaneId] = { ...sourceLane, cards: [...sourceLane.cards] };
        newBoardData[destLaneId] = { ...destLane, cards: [...destLane.cards] };

        return newBoardData;
      });

      // Prepare data for RPC call (for the actual database update)
      let fieldPathForRPC: string;
      if (groupByType.startsWith('workflow_')) {
        fieldPathForRPC = 'stage_id'; // When using workflows, update 'stage_id' field
      } else {
        fieldPathForRPC = viewConfig.kanbanview.types[groupByType]?.fieldPath || 'current_stage';
      }

      // The target value for the RPC call is the `id` of the destination lane
      // This will be 'NEW_TICKET' or 'open' if from workflow, or 'Lane Name' if from types.
      const targetValueForRPC = boardData[destLaneId]?.id;

      if (!targetValueForRPC) {
        message.error('Failed to get target group ID for update.');
        // Revert optimistic update by re-fetching if target value is not found (shouldn't happen often)
        queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
        return;
      }

      try {
        if (!organization?.id || !user?.id) {
          throw new Error('Authentication required');
        }
        if (!draggableId) {
          throw new Error('No record selected for update');
        }

        console.log('Update payload:', {
          table_name: (viewConfig?.entity_schema || "public") + "." + entityType,
          data: { [fieldPathForRPC]: targetValueForRPC }, // Use the correct fieldPath and target ID
          id: draggableId,
          related_table_name: null,
          related_data_key: null,
          related_unique_keys: null,
        });

        // const { data: rpcData, error } = await supabase.rpc('core_upsert_data_v7', {
        const { data: rpcData, error } = await supabase.schema('core').rpc('core_upsert_data_v8', {
          table_name: (viewConfig?.entity_schema || "public") + "." + entityType,
          data: { [fieldPathForRPC]: targetValueForRPC },
          id: draggableId,
          related_table_name: null,
          related_data_key: null,
          related_unique_keys: null,
        });

        if (error) {
          throw error;
        }

        queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
        message.success(`${entityType} updated successfully`);
      } catch (error: any) {
        message.error(error.message || `Failed to update ${entityType}`);
        // Rollback optimistic update on error by re-fetching
        queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
      }
    },
    // Added boardData to dependencies because `boardData[destLaneId]?.id` is used inside onDragEnd
    [viewConfig, groupByType, entityType, organization?.id, user?.id, queryClient, boardData]
  );

  // Toggle lane collapse
  const handleToggleLane = useCallback((laneId) => {
    setCollapsed((prev) => ({
      ...prev,
      [laneId]: !prev[laneId],
    }));
  }, []);

  // Handle groupBy change
  const handleGroupByChange = useCallback((value) => {
    setGroupBy(value);
  }, []);

  // Action buttons for bulk actions
  const actionButtons = useMemo(() => {
    return (
      viewConfig?.kanbanview?.actions?.bulk?.map((action: any) => ({
        name: action.name,
        label: action.name === 'add_' ? 'Add Item' : action.name,
        type: 'primary' as const,
        icon: undefined,
        onClick: () => {
          console.log(`Bulk action ${action.name} clicked`);
        },
      })) || []
    );
  }, [viewConfig]);

  React.useEffect(() => {
    setConfig((prev: any) => ({ ...prev, actionButtons }));
  }, [setConfig, actionButtons]);

  // Export handler
  const handleExport = useCallback(() => {
    if (viewConfig.kanbanview.showFeatures.includes('export') && viewConfig.kanbanview?.exportOptions.includes('csv')) {
      message.info('CSV export triggered');
    }
  }, [viewConfig]);

  // Get card field values
  const getFieldValue = (record: any, fieldPath: string) => {
    return record[fieldPath] || '-';
  };

  // Get the label for the selected groupByType
  const selectedGroupLabel = useMemo(() => {
    const selectedOption = groupByOptions.find((option) => option.value === groupByType);
    return selectedOption?.label || 'Select Group';
  }, [groupByType, groupByOptions]);

  // Early return for loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Early return for invalid config (after all hooks are called)
  if (!hasValidConfig) {
    return <div>No Kanban view configuration found for {entityType} or no active workflows.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4"
    >
      <style>
        {`
          .column-title-collapsed {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            white-space: nowrap;
          }
        `}
      </style>

      <KanbanContainer>
        <Header className="flex items-center gap-4 flex-wrap">
          {globalFilters && <div className="flex-1 min-w-[300px]">{globalFilters}</div>}
          <div className="flex items-center gap-2">
            {viewConfig.kanbanview.showFeatures.includes('groupBy') && (
              <>
                <span className="text-gray-700">Group by:</span>
                {groupByOptions.length > 1 ? (
                  <Select
                    value={groupByType}
                    onChange={handleGroupByChange}
                    style={{ width: 200 }}
                    options={groupByOptions}
                  />
                ) : (
                  <span className="text-gray-700 font-semibold">{selectedGroupLabel}</span>
                )}
              </>
            )}
            {/* {viewConfig.kanbanview.showFeatures.includes('export') && (
              <Button onClick={handleExport} type="default" className="ml-2">
                Export
              </Button>
            )} */}
          </div>
        </Header>

        <DragDropContext onDragEnd={onDragEnd}>
          <LanesContainer>
            {/* Iterate over Object.values(boardData) to get the constructed BoardLane objects */}
            {Object.values(boardData).map((lane) => (
              <Droppable droppableId={lane.id} key={lane.id}>
                {(provided, snapshot) => (
                  <Lane
                    color={lane.color}
                    className={collapsedLanes[lane.id] ? 'collapsed' : ''}
                    {...(snapshot.isDraggingOver && { highlighted: true })} //highlighted={snapshot.isDraggingOver}
                  >
                    <div
                      className={`flex items-center justify-between mb-4 cursor-pointer ${collapsedLanes[lane.id] ? 'column-title-collapsed' : ''
                        }`}
                      onClick={() => handleToggleLane(lane.id)}
                    >
                      <div className="flex items-center gap-2">
                        {collapsedLanes[lane.id] ? (
                          <ChevronRight size={20} />
                        ) : (
                          <ChevronLeft size={20} />
                        )}
                        {/* Display lane.title (which is stage.name or laneConfig.name) */}
                        <h3 className="text-h3 text-gray-700 !mb-0">{lane.title}</h3>
                      </div>
                      {!collapsedLanes[lane.id] && viewConfig.kanbanview?.actions?.bulk?.some((action: any) => action.name === 'add_') && (
                        <Button type="dashed" block icon={<Plus size={14} />}>
                          Add
                        </Button>
                      )}
                    </div>

                    {!collapsedLanes[lane.id] && (
                      <LaneContent {...provided.droppableProps} ref={provided.innerRef}>
                        {lane.cards.map((card, index) => (
                          <Draggable key={card.id} draggableId={card.id.toString()} index={index}>
                            {(provided) => (
                              <CardWrapper
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <Card>
                                  <div className="card-title">
                                    <GripVertical size={16} className="text-gray-400" />
                                    <span>{getFieldValue(card, viewConfig.kanbanview?.cardFields?.title)}</span>
                                  </div>
                                  <p className="card-description">
                                    {getFieldValue(card, viewConfig.kanbanview?.cardFields?.description)}
                                  </p>
                                  {viewConfig.kanbanview?.cardFields?.label && (
                                    <p className="text-xs text-gray-500">
                                      {getFieldValue(card, viewConfig.kanbanview?.cardFields?.label)}
                                    </p>
                                  )}
                                  {viewConfig.kanbanview?.actions?.row?.length > 0 && (
                                    <div className="card-actions">
                                      <RowActions
                                        entityType={entityType}
                                        record={card}
                                        actions={viewConfig.kanbanview?.actions?.row || []}
                                        accessConfig={viewConfig?.access_config}
                                        viewConfig={viewConfig}
                                        config={config}
                                        rawData={data}
                                      />
                                    </div>
                                  )}
                                </Card>
                              </CardWrapper>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </LaneContent>
                    )}
                  </Lane>
                )}
              </Droppable>
            ))}
          </LanesContainer>
        </DragDropContext>
      </KanbanContainer>
    </motion.div>
  );
};

export default KanbanView;