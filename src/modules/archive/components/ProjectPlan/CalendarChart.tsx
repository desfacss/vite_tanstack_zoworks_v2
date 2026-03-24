// src/modules/archive/components/ProjectPlan/CalendarChart.tsx
import React from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { TaskDate } from '../../utils/taskScheduler';

interface Task {
  id: string;
  name: string;
}

interface CalendarChartProps {
  tasks: Task[];
  taskDates: TaskDate[];
}

const localizer = dayjsLocalizer(dayjs);

const CalendarChart: React.FC<CalendarChartProps> = ({ tasks, taskDates }) => {
  const events = taskDates.map((td) => {
    const task = tasks.find(t => t.id === td.id);
    return {
      title: task?.name || 'Unknown',
      start: td.start,
      end: td.end,
    };
  });

  return (
    <div style={{ height: 600 }}>
       <Calendar
         localizer={localizer}
         events={events}
         startAccessor="start"
         endAccessor="end"
         defaultView="month"
       />
    </div>
  );
};

export default CalendarChart;
