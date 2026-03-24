// src/modules/archive/components/Scheduler/CalendarChart.tsx
import React from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dayjsLocalizer(dayjs);

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

interface CalendarChartProps {
  events: Event[];
  viewMode: 'resource' | 'project';
  resourceColorMap: { [key: string]: string };
  projectColorMap: { [key: string]: string };
}

const CalendarChart: React.FC<CalendarChartProps> = ({ events, viewMode, resourceColorMap, projectColorMap }) => {
  const formattedEvents = events.map((event) => {
    let color: string;
    if (viewMode === 'resource') {
      const resource = event.extendedProps.resource_names.length > 0 ? event.extendedProps.resource_names[0] : 'Unassigned';
      color = resourceColorMap[resource] || '#1890ff';
    } else {
      color = projectColorMap[event.extendedProps.project_name] || '#1890ff';
    }

    return {
      id: event.id,
      title: `${event.title} (${viewMode === 'resource' ? event.extendedProps.project_name : event.extendedProps.resource_names.join(', ') || 'Unassigned'})`,
      start: dayjs(event.start).toDate(),
      end: dayjs(event.end).toDate(),
      resource: color, // Store color in resource field for styling
    };
  });

  const eventStyleGetter = (event: any) => {
    return {
      style: {
        backgroundColor: event.resource,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  return (
    <div style={{ height: '600px', padding: '20px 0' }}>
      <Calendar
        localizer={localizer}
        events={formattedEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        views={['month', 'week', 'day']}
        defaultView="month"
      />
    </div>
  );
};

export default CalendarChart;
