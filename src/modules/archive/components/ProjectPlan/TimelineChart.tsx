// src/modules/archive/components/ProjectPlan/TimelineChart.tsx
import React from 'react';
import Timeline from 'react-calendar-timeline';
import 'react-calendar-timeline/dist/style.css';
import dayjs from 'dayjs';
import { TaskDate } from '../../utils/taskScheduler';

interface Task {
  id: string;
  name: string;
}

interface TimelineChartProps {
  tasks: Task[];
  taskDates: TaskDate[];
}

const TimelineChart: React.FC<TimelineChartProps> = ({ tasks, taskDates }) => {
  if (!tasks || tasks.length === 0 || !taskDates || taskDates.length === 0) {
    return <div>No tasks to display.</div>;
  }

  const groups = tasks.map((task) => ({ id: task.id, title: task.name }));
  const items = taskDates.map((td) => {
    const task = tasks.find(t => t.id === td.id);
    return {
      id: td.id,
      group: td.id,
      title: task?.name || 'Unknown',
      start_time: dayjs(td.start).valueOf(),
      end_time: dayjs(td.end).valueOf(),
    };
  });

  const minStart = Math.min(...taskDates.map(td => dayjs(td.start).valueOf()));
  const maxEnd = Math.max(...taskDates.map(td => dayjs(td.end).valueOf()));

  return (
    <Timeline
      groups={groups}
      items={items}
      defaultTimeStart={dayjs(minStart).subtract(1, 'day').valueOf()}
      defaultTimeEnd={dayjs(maxEnd).add(1, 'day').valueOf()}
      lineHeight={40}
      itemHeightRatio={0.7}
      canMove={false}
      canResize={false}
    />
  );
};

export default TimelineChart;
