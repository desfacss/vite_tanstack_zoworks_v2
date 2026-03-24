// src/modules/archive/components/Scheduler/GanttChart.tsx
import React from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    project_id: string;
    project_name: string;
    resource_names: string[];
  };
}

interface GanttChartProps {
  events: Event[];
  viewMode: 'resource' | 'project';
  resourceColorMap: { [key: string]: string };
  projectColorMap: { [key: string]: string };
}

const GanttChart: React.FC<GanttChartProps> = ({ events, viewMode, resourceColorMap, projectColorMap }) => {
  // Group tasks by resource or project
  let groups: { id: string; name: string }[] = [];
  if (viewMode === 'resource') {
    const uniqueResources = Array.from(
      new Set(
        events.flatMap((event) =>
          event.extendedProps.resource_names.length > 0 ? event.extendedProps.resource_names : ['Unassigned']
        )
      )
    );
    groups = uniqueResources.map((resource, index) => ({
      id: `${index + 1}`,
      name: resource,
    }));
  } else {
    const uniqueProjects = Array.from(new Set(events.map((event) => event.extendedProps.project_name)));
    groups = uniqueProjects.map((project, index) => ({
      id: `${index + 1}`,
      name: project,
    }));
  }

  // Map events to Gantt tasks
  const formattedTasks: GanttTask[] = events.map((event) => {
    let groupId: string;
    let color: string;

    if (viewMode === 'resource') {
      const resource = event.extendedProps.resource_names.length > 0 ? event.extendedProps.resource_names[0] : 'Unassigned';
      groupId = groups.find((group) => group.name === resource)?.id || '1';
      color = resourceColorMap[resource] || '#1890ff';
    } else {
      groupId = groups.find((group) => group.name === event.extendedProps.project_name)?.id || '1';
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
      project: groupId,
      styles: {
        backgroundColor: color,
        progressColor: color,
      },
    };
  });

  return (
    <div style={{ margin: '20px 0' }}>
      {formattedTasks.length > 0 ? (
        <Gantt
          tasks={formattedTasks}
          viewMode={ViewMode.Day}
          columnWidth={65}
          listCellWidth="200px"
          fontSize="12px"
          barBackgroundColor="#f0f2f5"
          barBackgroundSelectedColor="#e6f7ff"
        />
      ) : (
        <p>No valid tasks available to display.</p>
      )}
    </div>
  );
};

export default GanttChart;
