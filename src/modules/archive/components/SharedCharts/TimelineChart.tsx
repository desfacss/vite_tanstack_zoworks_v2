// src/modules/archive/components/SharedCharts/TimelineChart.tsx
import React from 'react';
import Timeline from 'react-calendar-timeline';
import 'react-calendar-timeline/dist/style.css';
import dayjs from 'dayjs';

interface UnifiedTimelineProps {
  // Option A: Simulation Data
  events?: any[];
  viewMode?: 'resource' | 'project';
  resourceColorMap?: Record<string, string>;
  projectColorMap?: Record<string, string>;

  // Option B: Blueprint Data
  tasks?: any[];
  taskDates?: any[];
}

const TimelineChart: React.FC<UnifiedTimelineProps> = (props) => {
  const { 
    events, viewMode = 'project', resourceColorMap = {}, projectColorMap = {},
    tasks, taskDates 
  } = props;

  let groups: any[] = [];
  let items: any[] = [];

  if (events && events.length > 0) {
    // Simulation Mapping
    if (viewMode === 'resource') {
      const uniqueResources = Array.from(
        new Set(
          events.flatMap((event) =>
            event.extendedProps.resource_names?.length > 0 ? event.extendedProps.resource_names : ['Unassigned']
          )
        )
      );
      groups = uniqueResources.map((resource, index) => ({ id: index + 1, title: resource }));
    } else {
      const uniqueProjects = Array.from(new Set(events.map((event) => event.extendedProps.project_name)));
      groups = uniqueProjects.map((project, index) => ({ id: index + 1, title: project }));
    }

    items = events.map((event, index) => {
      let groupId: number;
      let color: string;
      if (viewMode === 'resource') {
        const resource = event.extendedProps.resource_names?.[0] || 'Unassigned';
        groupId = groups.find((group) => group.title === resource)?.id || 1;
        color = resourceColorMap[resource] || '#ddd';
      } else {
        groupId = groups.find((group) => group.title === event.extendedProps.project_name)?.id || 1;
        color = projectColorMap[event.extendedProps.project_name] || '#ddd';
      }

      return {
        id: index + 1,
        group: groupId,
        title: `${event.title}`,
        start_time: dayjs(event.start).valueOf(),
        end_time: dayjs(event.end).valueOf(),
        itemProps: { style: { background: color, color: '#fff', borderRadius: '4px' } }
      };
    });
  } else if (tasks && taskDates) {
    // Blueprint Mapping
    groups = tasks.map((task) => ({ id: task.id, title: task.name }));
    items = taskDates.map((td) => {
      const task = tasks.find(t => t.id === td.id);
      return {
        id: td.id,
        group: td.id, // Group by task id in blueprint mode
        title: task?.name || 'Task',
        start_time: dayjs(td.start).valueOf(),
        end_time: dayjs(td.end).valueOf(),
      };
    });
  }

  if (groups.length === 0) return <div>No data to display.</div>;

  const minStart = items.length > 0 ? Math.min(...items.map(i => i.start_time)) : Date.now();
  const maxEnd = items.length > 0 ? Math.max(...items.map(i => i.end_time)) : Date.now();

  return (
    <div style={{ margin: '20px 0' }}>
      <Timeline
        groups={groups}
        items={items}
        defaultTimeStart={dayjs(minStart).subtract(1, 'day').valueOf()}
        defaultTimeEnd={dayjs(maxEnd).add(1, 'day').valueOf()}
        sidebarWidth={150}
        lineHeight={45}
        canMove={false}
        canResize={false}
      />
    </div>
  );
};

export default TimelineChart;
