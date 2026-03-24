// src/modules/archive/components/Scheduler/TimelineChart.tsx
import React from 'react';
import Timeline from 'react-calendar-timeline';
import dayjs from 'dayjs';
import 'react-calendar-timeline/dist/style.css';

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

interface TimelineChartProps {
  events: Event[];
  viewMode: 'resource' | 'project';
  resourceColorMap: { [key: string]: string };
  projectColorMap: { [key: string]: string };
}

const TimelineChart: React.FC<TimelineChartProps> = ({ events, viewMode, resourceColorMap, projectColorMap }) => {
  // Determine groups based on view mode
  let groups: { id: number; title: string }[] = [];
  if (viewMode === 'resource') {
    const uniqueResources = Array.from(
      new Set(
        events.flatMap((event) =>
          event.extendedProps.resource_names.length > 0 ? event.extendedProps.resource_names : ['Unassigned']
        )
      )
    );
    groups = uniqueResources.map((resource, index) => ({
      id: index + 1,
      title: resource,
    }));
  } else {
    const uniqueProjects = Array.from(new Set(events.map((event) => event.extendedProps.project_name)));
    groups = uniqueProjects.map((project, index) => ({
      id: index + 1,
      title: project,
    }));
  }

  // Map events to timeline items
  const items = events.map((event, index) => {
    let groupId: number;
    let color: string;

    if (viewMode === 'resource') {
      const resource = event.extendedProps.resource_names.length > 0 ? event.extendedProps.resource_names[0] : 'Unassigned';
      groupId = groups.find((group) => group.title === resource)?.id || 1;
      color = resourceColorMap[resource] || '#ddd';
    } else {
      groupId = groups.find((group) => group.title === event.extendedProps.project_name)?.id || 1;
      color = projectColorMap[event.extendedProps.project_name] || '#ddd';
    }

    return {
      id: index + 1,
      group: groupId,
      title: `${event.title} (${viewMode === 'resource' ? event.extendedProps.project_name : event.extendedProps.resource_names.join(', ') || 'Unassigned'})`,
      start_time: dayjs(event.start).valueOf(),
      end_time: dayjs(event.end).valueOf(),
      itemProps: {
        style: {
          background: color,
          borderColor: color,
          borderWidth: 1,
          color: '#fff',
          borderRadius: '4px'
        },
      },
    };
  });

  return (
    <div className="timeline-container" style={{ margin: '20px 0' }}>
      <Timeline
        groups={groups}
        items={items}
        defaultTimeStart={dayjs(events[0]?.start || new Date()).toDate().getTime()}
        defaultTimeEnd={dayjs(events[events.length - 1]?.end || new Date()).add(1, 'day').toDate().getTime()}
        sidebarWidth={150}
        lineHeight={45}
        itemHeightRatio={0.8}
        canMove={false}
        canResize={false}
      />
    </div>
  );
};

export default TimelineChart;
