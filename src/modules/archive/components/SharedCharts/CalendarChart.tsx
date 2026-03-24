// src/modules/archive/components/SharedCharts/CalendarChart.tsx
import React from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dayjsLocalizer(dayjs);

interface UnifiedCalendarProps {
  // Option A: Simulation Data
  events?: any[];
  viewMode?: 'resource' | 'project';
  resourceColorMap?: Record<string, string>;
  projectColorMap?: Record<string, string>;

  // Option B: Blueprint Data
  tasks?: any[];
  taskDates?: any[];
}

const CalendarChart: React.FC<UnifiedCalendarProps> = (props) => {
  const { 
    events: simEvents, viewMode = 'project', resourceColorMap = {}, projectColorMap = {},
    tasks, taskDates 
  } = props;

  let formattedEvents: any[] = [];

  if (simEvents && simEvents.length > 0) {
    // Simulation Mapping
    formattedEvents = simEvents.map((event) => {
      let color = '#3788d8';
      if (viewMode === 'resource') {
        const resource = event.extendedProps.resource_names?.[0] || 'Unassigned';
        color = resourceColorMap[resource] || '#3788d8';
      } else {
        color = projectColorMap[event.extendedProps.project_name] || '#3788d8';
      }

      return {
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        resource: event.extendedProps,
        color: color // react-big-calendar needs custom styling for this
      };
    });
  } else if (tasks && taskDates) {
    // Blueprint Mapping
    formattedEvents = taskDates.map((td) => {
      const task = tasks.find(t => t.id === td.id);
      return {
        title: task?.name || 'Task',
        start: new Date(td.start),
        end: new Date(td.end),
        color: '#3788d8'
      };
    });
  }

  return (
    <div style={{ height: 600, margin: '20px 0' }}>
       <Calendar
         localizer={localizer}
         events={formattedEvents}
         startAccessor="start"
         endAccessor="end"
         defaultView="week"
         eventPropGetter={(event: any) => ({
           style: {
             backgroundColor: event.color,
             borderRadius: '4px',
             border: 'none',
             color: '#fff'
           }
         })}
       />
    </div>
  );
};

export default CalendarChart;
