import React, { useState, useMemo } from 'react';
import { Gantt, ViewMode, Task } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Button, Dropdown, Menu, message, List, Tooltip } from 'antd';
import { motion } from 'framer-motion';
import { Download, User, Plus } from 'lucide-react';
import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
import RowActions from './RowActions';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';

interface GanttViewConfig {
  ganttview?: any;
  tableview?: any;
  showFeatures?: string[];
  exportOptions?: string[];
  actions: {
    bulk?: Array<{ name: string; form?: string }>;
    row?: Array<{ name: string; form?: string }>;
  };
  fields?: {
    name?: string;
    start_date?: string;
    due_date?: string;
    progress?: string;
  };
  access_config?: any;
}

interface GanttViewProps {
  entityType: string;
  entitySchema?: string;
  viewConfig?: GanttViewConfig;
  data: any[];
  isLoading?: boolean;
  filterValues?: Record<string, any>;
  pagination?: { current: number; pageSize: number; total: number };
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
  globalFilters?: React.ReactNode;
}

const defaultViewConfig: GanttViewConfig = {
  actions: {
    bulk: [],
    row: [],
  },
  fields: {
    name: 'name',
    start_date: 'start_date',
    due_date: 'due_date',
    progress: 'progress',
  },
  showFeatures: ['search', 'enable_view', 'columnVisibility', 'pagination'],
  exportOptions: ['pdf', 'csv'],
};

const GanttChart: React.FC<GanttViewProps> = ({
  entityType,
  entitySchema = 'public',
  viewConfig = defaultViewConfig,
  data = [],
  isLoading = false,
  filterValues,
  pagination,
  onTableChange,
  globalFilters,
}) => {
  const { organization } = useAuthStore();
  const { setConfig } = useAuthedLayoutConfig();
  const queryClient = useQueryClient();
  const isMobile = window.innerWidth <= 768;
  const ganttview = viewConfig?.ganttview || viewConfig?.tableview || defaultViewConfig;

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);

  // Helper function to safely access nested object properties
  const getNestedField = (obj: any, path: string) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? '';
  };

  // Check if the dataset supports stage_id filtering
  const hasStageField = useMemo(() => {
    return data && data.some(item => 'stage_id' in item);
  }, [data]);

  // Find the first display field path from tableview fields
  const firstDisplayFieldPath = useMemo(() => {
    const tableFields = (viewConfig as any)?.tableview?.fields || [];
    const sortedFields = [...tableFields].sort((a, b) => a.order - b.order);
    return sortedFields[0]?.fieldPath || 'name';
  }, [viewConfig]);

  // Split data into assigned and unassigned
  const { assignedData, unassignedData } = useMemo(() => {
    if (!hasStageField) {
      return { assignedData: data || [], unassignedData: [] };
    }
    return {
      assignedData: data?.filter(e => e.stage_id === 'assigned') || [],
      unassignedData: data?.filter(e => e.stage_id !== 'assigned') || [],
    };
  }, [data, hasStageField]);

  const tasks: Task[] = assignedData.map((event) => {
    const name = getNestedField(event, ganttview.fields?.name || 'name') || 'Unnamed Task';
    const startDateField = getNestedField(event, ganttview.fields?.start_date || 'start_date');
    const dueDateField = getNestedField(event, ganttview.fields?.due_date || 'due_date');

    let start;
    let end;

    if (startDateField && !dueDateField) {
      const startDay = dayjs(startDateField);
      start = startDay.toDate();
      end = startDay.endOf('day').toDate();
    } else if (!startDateField && dueDateField) {
      const endDay = dayjs(dueDateField);
      end = endDay.toDate();
      start = endDay.subtract(1, 'day').toDate();
    } else {
      start = startDateField ? new Date(startDateField) : new Date();
      end = dueDateField ? new Date(dueDateField) : new Date();
    }

    return {
      id: event.id || `default-id-${Math.random()}`,
      name,
      start,
      end,
      progress: Number(getNestedField(event, ganttview.fields?.progress || 'progress')) || 0,
      type: 'task',
      isDisabled: false,
    };
  });

  const handleZoomChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleAssign = async (event: any) => {
    try {
      const parts = entityType.split('.');
      const schema = parts.length === 2 ? parts[0] : entitySchema;
      const table = parts.length === 2 ? parts[1] : entityType;
      const fullTableName = `${schema}.${table}`;

      const { error } = await supabase.schema('core').rpc('api_new_core_upsert_data', {
        table_name: fullTableName,
        data: {
          id: event.id,
          stage_id: 'assigned'
        }
      });

      if (error) throw error;
      message.success('Item assigned to Gantt successfully');
      queryClient.invalidateQueries({ queryKey: [entityType] });
    } catch (err: any) {
      message.error(`Failed to assign: ${err.message}`);
    }
  };

  const updateTask = async (task: Task) => {
    const updatedEvent = data.find((event) => event.id === task.id);
    if (!updatedEvent) {
      console.warn('Event not found:', task.id);
      return;
    }

    const updatedData = {
      ...updatedEvent,
      [ganttview?.fields?.start_date || 'start_date']: dayjs(task.start).format('YYYY-MM-DD HH:mm:ss'),
      [ganttview?.fields?.due_date || 'due_date']: dayjs(task.end).format('YYYY-MM-DD HH:mm:ss'),
      [ganttview?.fields?.progress || 'progress']: task.progress,
    };

    try {
      const parts = entityType.split('.');
      const schema = parts.length === 2 ? parts[0] : entitySchema;
      const table = parts.length === 2 ? parts[1] : entityType;

      const { error } = await supabase
        .schema(schema)
        .from(table)
        .update({
          ...updatedData,
          updated_by: organization?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);
      if (error) throw error;
      message.success(`${entityType} updated successfully`);
      queryClient.invalidateQueries({ queryKey: [entityType] });
    } catch (error: any) {
      message.error(`Failed to update ${entityType}: ${error.message}`);
    }
  };

  const editTask = (task: Task) => {
    const event = data.find((event) => event.id === task.id);
    if (event) {
      console.log('Edit task:', event);
    }
  };

  const actionButtons = useMemo(() => {
    return ganttview?.actions?.bulk?.map((action: any) => ({
      name: action.name,
      label: action.name === 'add_' ? 'Add Item' : action.name.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      type: 'primary' as const,
      icon: undefined,
      onClick: () => console.log(`Bulk action triggered: ${action.name}`),
    })) || [];
  }, [ganttview?.actions?.bulk]);

  React.useEffect(() => {
    const formattedButtons = actionButtons.map((btn: any) => ({
      icon: btn.icon,
      tooltip: btn.label,
      onClick: btn.onClick
    }));
    setConfig({ actionButtons: formattedButtons });
  }, [setConfig, actionButtons]);

  if (!ganttview) {
    return <div>No gantt view configuration found for {entityType}</div>;
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 w-full" style={{ height: '100%' }}>
      <div className="flex-1 flex flex-col min-h-0" style={{ height: '100%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-0 flex-1 flex flex-col min-h-0" style={{ height: '100%' }}>
          {globalFilters && <div className="flex-1 min-w-[300px] pb-4">{globalFilters}</div>}
          {!isMobile ? (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 8 }}>
                  {ganttview.showFeatures?.includes('zoom') && (
                    <>
                      <Button onClick={() => handleZoomChange(ViewMode.Hour)}>Hour</Button>
                      <Button onClick={() => handleZoomChange(ViewMode.Day)}>Day</Button>
                      <Button onClick={() => handleZoomChange(ViewMode.Week)}>Week</Button>
                      <Button onClick={() => handleZoomChange(ViewMode.Month)}>Month</Button>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {ganttview.actions?.bulk?.map((action: any) => (
                    <Button
                      key={action.name}
                      type="primary"
                      style={{ marginRight: 8 }}
                      onClick={() => console.log(`Bulk action: ${action.name}`)}
                    >
                      {action.name
                        .split('_')
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </Button>
                  ))}
                  {ganttview.showFeatures?.includes('export') && ganttview.exportOptions?.length > 0 && (
                    <Dropdown
                      menu={{
                        items: ganttview?.exportOptions?.map((option: any) => ({
                          key: option,
                          label: `Export to ${option.toUpperCase()}`,
                          onClick: () => console.log(`Export to ${option} triggered`),
                        })),
                      }}
                      trigger={['click']}
                    >
                      <Button icon={<Download size={16} />} style={{ marginLeft: 8 }} />
                    </Dropdown>
                  )}
                </div>
              </div>
              {isLoading ? (
                <div>Loading...</div>
              ) : assignedData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8 text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
                  No tasks assigned to Gantt.
                </div>
              ) : (
                <Gantt
                  tasks={tasks}
                  viewMode={viewMode}
                  columnWidth={viewMode === ViewMode.Month ? 300 : 65}
                  onDateChange={ganttview.showFeatures?.includes('edit') ? updateTask : undefined}
                  onProgressChange={(task) => console.log('Progress updated:', task)}
                  onDoubleClick={ganttview.showFeatures?.includes('edit') ? editTask : undefined}
                  onSelect={(task, isSelected) =>
                    console.log(`${task.name} ${isSelected ? 'selected' : 'deselected'}`)
                  }
                />
              )}
            </>
          ) : (
            isLoading ? (
              <div>Loading...</div>
            ) : (
              <List
                dataSource={assignedData}
                renderItem={(record) => (
                  <List.Item
                    key={record.id}
                    extra={
                      ganttview.showFeatures?.includes('rowActions') && (
                        <RowActions
                          entityType={entityType}
                          record={record}
                          actions={ganttview?.actions?.row || []}
                          accessConfig={viewConfig?.access_config}
                          viewConfig={viewConfig}
                          rawData={data}
                        />
                      )
                    }
                  >
                    <List.Item.Meta
                      avatar={<User size={24} />}
                      title={getNestedField(record, ganttview.fields?.name || 'name') || 'Unnamed Task'}
                      description={
                        <div>
                          <div>{getNestedField(record, 'details.email') || '-'}</div>
                          <div className="text-xs text-slate-500">
                            {record.created_at ? dayjs(record.created_at).format('MMM D, YYYY') : '-'}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )
          )}
        </motion.div>
      </div>

      {hasStageField && (
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col h-full ml-0 md:ml-4">
          <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-tertiary)]">
            <span className="font-semibold text-sm text-[var(--color-text-primary)]">Unassigned Pool</span>
            <span className="bg-[var(--color-primary)] text-black px-2 py-0.5 rounded-full text-xs font-semibold">
              {unassignedData.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {unassignedData.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-secondary)] text-xs">
                All items have been assigned.
              </div>
            ) : (
              unassignedData.map(event => {
                const name = getNestedField(event, firstDisplayFieldPath) || 'Unnamed Task';
                return (
                  <div key={event.id} className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-primary)] transition-all flex items-center justify-between gap-2">
                    <div className="font-medium text-sm text-[var(--color-text-primary)] truncate" title={name}>{name}</div>
                    <Tooltip title="Add to Gantt">
                      <Button 
                        type="primary" 
                        size="small" 
                        shape="circle"
                        icon={<Plus size={14} />}
                        onClick={() => handleAssign(event)}
                        style={{ flexShrink: 0 }}
                      />
                    </Tooltip>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;