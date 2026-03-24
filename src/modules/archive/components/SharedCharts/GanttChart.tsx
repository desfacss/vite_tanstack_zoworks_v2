// src/modules/archive/components/SharedCharts/GanttChart.tsx
import React from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

interface UnifiedGanttProps {
  // Option A: Simulation Data
  events?: any[];
  viewMode?: 'resource' | 'project';
  resourceColorMap?: Record<string, string>;
  projectColorMap?: Record<string, string>;

  // Option B: Blueprint Data
  tasks?: any[];
  taskDates?: any[];
  processBlueprint?: any;
  scenario?: string;
}

const GanttChart: React.FC<UnifiedGanttProps> = (props) => {
  const { 
    events, viewMode = 'project', resourceColorMap = {}, projectColorMap = {},
    tasks, taskDates
  } = props;

  let formattedTasks: GanttTask[] = [];

  if (events && events.length > 0) {
    // Simulation Mapping
    formattedTasks = events.map((event) => {
      let color = '#1890ff';
      if (viewMode === 'resource') {
        const resource = event.extendedProps.resource_names?.[0] || 'Unassigned';
        color = resourceColorMap[resource] || '#1890ff';
      } else {
        color = projectColorMap[event.extendedProps.project_name] || '#1890ff';
      }

      return {
        id: event.id,
        name: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        progress: 0,
        type: 'task' as const,
        isDisabled: true,
        styles: { backgroundColor: color, progressColor: color },
      };
    });
  } else if (tasks && taskDates) {
    // Blueprint Mapping
    formattedTasks = taskDates.map((td) => {
      const task = tasks.find(t => t.id === td.id);
      return {
        id: td.id,
        name: task?.name || 'Task',
        start: new Date(td.start),
        end: new Date(td.end),
        progress: 0,
        type: 'task' as const,
        isDisabled: true,
        styles: { backgroundColor: '#1890ff', progressColor: '#1890ff' },
      };
    });
  }

  if (formattedTasks.length === 0) return <div>No tasks to display.</div>;

  return (
    <div style={{ margin: '20px 0' }}>
      <Gantt
        tasks={formattedTasks}
        viewMode={ViewMode.Day}
        columnWidth={65}
        listCellWidth="200px"
        fontSize="12px"
        barBackgroundColor="#f0f2f5"
        barBackgroundSelectedColor="#e6f7ff"
      />
    </div>
  );
};

export default GanttChart;
