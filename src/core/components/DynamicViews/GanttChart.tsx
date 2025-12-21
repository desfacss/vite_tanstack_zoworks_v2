import React, { useState, useMemo } from 'react';
import { Gantt, ViewMode, Task } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Button, Dropdown, Menu, message, List } from 'antd';
import { motion } from 'framer-motion';
import { DownloadOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
import RowActions from './RowActions';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import dayjs from 'dayjs';

interface GanttViewConfig {
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
  const isMobile = window.innerWidth <= 768;
  const ganttview = viewConfig?.ganttview || viewConfig?.tableview || defaultViewConfig;

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);

  // Helper function to safely access nested object properties
  const getNestedField = (obj: any, path: string) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? '';
  };

  // const tasks: Task[] = data.map((event) => ({
  //   id: event.id || 'default-id',
  //   name: getNestedField(event, ganttview.fields?.name || 'name') || 'Unnamed Task',
  //   start: getNestedField(event, ganttview.fields?.start_date || 'start_date')
  //     ? new Date(getNestedField(event, ganttview.fields.start_date))
  //     : new Date(),
  //   end: getNestedField(event, ganttview.fields?.due_date || 'due_date')
  //     ? new Date(getNestedField(event, ganttview.fields.due_date))
  //     : new Date(),
  //   progress: Number(getNestedField(event, ganttview.fields?.progress || 'progress')) || 0,
  //   type: 'task',
  //   isDisabled: false,
  // }));

  const tasks: Task[] = data.map((event) => {
    const name = getNestedField(event, ganttview.fields?.name || 'name') || 'Unnamed Task';
    const startDateField = getNestedField(event, ganttview.fields?.start_date || 'start_date');
    const dueDateField = getNestedField(event, ganttview.fields?.due_date || 'due_date');

    let start;
    let end;

    if (startDateField && !dueDateField) {
      // If only a start time is available, assume end time is end of the day (11:59:59)
      const startDay = dayjs(startDateField);
      start = startDay.toDate();
      end = startDay.endOf('day').toDate();
    } else if (!startDateField && dueDateField) {
      // If only a due/end date is available, assume the start is 24 hours before
      const endDay = dayjs(dueDateField);
      end = endDay.toDate();
      start = endDay.subtract(1, 'day').toDate();
    } else {
      // Default case: use available dates or current date if both are missing
      start = startDateField ? new Date(startDateField) : new Date();
      end = dueDateField ? new Date(dueDateField) : new Date();
    }

    return {
      id: event.id || `default-id-${Math.random()}`, // Use a unique ID if event.id is missing
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
      const { error } = await supabase
        .from(entityType)
        .update({
          ...updatedData,
          updated_by: organization?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);
      if (error) throw error;
      message.success(`${entityType} updated successfully`);
    } catch (error: any) {
      message.error(`Failed to update ${entityType}: ${error.message}`);
    }
  };

  const editTask = (task: Task) => {
    const event = data.find((event) => event.id === task.id);
    if (event) {
      console.log('Edit task:', event);
      // Open drawer for editing (implement in parent component or pass as prop)
    }
  };

  // 👇️ Memoize actionButtons to prevent re-creation on every render
  const actionButtons = useMemo(() => {
    return ganttview?.actions?.bulk?.map((action) => ({
      name: action.name,
      label: action.name === 'add_' ? 'Add Item' : action.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      type: 'primary' as const,
      icon: undefined,
      onClick: () => console.log(`Bulk action triggered: ${action.name}`),
    })) || [];
  }, [ganttview?.actions?.bulk]); // Dependency on the bulk actions array

  React.useEffect(() => {
    setConfig((prev) => ({ ...prev, actionButtons }));
  }, [setConfig, actionButtons]);

  if (!ganttview) {
    return <div>No gantt view configuration found for {entityType}</div>;
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
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
                {ganttview.actions?.bulk?.map((action) => (
                  <Button
                    key={action.name}
                    type="primary"
                    style={{ marginRight: 8 }}
                    onClick={() => console.log(`Bulk action: ${action.name}`)}
                  >
                    {action.name
                      .split('_')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </Button>
                ))}
                {ganttview.showFeatures?.includes('export') && ganttview.exportOptions?.length > 0 && (
                  <Dropdown
                    menu={{
                      items: ganttview?.exportOptions?.map((option) => ({
                        key: option,
                        label: `Export to ${option.toUpperCase()}`,
                        onClick: () => console.log(`Export to ${option} triggered`),
                      })),
                    }}
                    trigger={['click']}
                  >
                    <Button icon={<DownloadOutlined />} style={{ marginLeft: 8 }} />
                  </Dropdown>
                )}
              </div>
            </div>
            {isLoading ? (
              <div>Loading...</div>
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
            <List>
              {data.map((record) => (
                <List.Item
                  key={record.id}
                  prefix={<UserOutlined style={{ fontSize: 24 }} />}
                  description={getNestedField(record, 'details.email') || '-'}
                  arrow={false}
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
                  {getNestedField(record, ganttview.fields?.name || 'name') || 'Unnamed Task'}
                  <div className="text-xs text-gray-500">
                    {record.created_at ? dayjs(record.created_at).format('MMM D, YYYY') : '-'}
                  </div>
                </List.Item>
              ))}
            </List>
          )
        )}
      </motion.div>
    </div>
  );
};

export default GanttChart;