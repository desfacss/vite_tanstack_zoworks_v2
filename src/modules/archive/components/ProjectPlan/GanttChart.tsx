// src/modules/archive/components/ProjectPlan/GanttChart.tsx
import React from 'react';
import { Gantt, Task as GanttTask } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { calculateTaskDates, Task as SchedulerTask } from '../../utils/taskScheduler';

interface GanttChartProps {
  processBlueprint: any;
  orderDetails: { orderId: string; startDateTime: Date };
  scenario: string;
}

const GanttChart: React.FC<GanttChartProps> = ({ processBlueprint, orderDetails, scenario }) => {
  const tasks: SchedulerTask[] = processBlueprint?.blueprint?.workflows[0]?.steps?.flatMap((step: any) =>
    step.tasks.map((task: any) => ({
      id: task?.id || `task-${Math.random()}`,
      name: task?.name || 'Unnamed Task',
      lead_time: task?.lead_time?.[scenario] ?? 0,
      dependencies: task?.dependencies || [],
    }))
  ) || [];

  const taskDates = calculateTaskDates(tasks, orderDetails?.startDateTime || new Date());

  const formattedTasks: GanttTask[] = taskDates.map((td) => {
    const task = tasks.find(t => t.id === td.id);
    return {
      id: td.id,
      name: task?.name || 'Unknown',
      start: td.start,
      end: td.end,
      progress: 0,
      type: 'task' as const,
      isDisabled: false,
    };
  });

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>
        Gantt Chart - {scenario?.charAt(0).toUpperCase() + scenario?.slice(1)}
      </h3>
      {formattedTasks.length > 0 ? (
        <Gantt 
          tasks={formattedTasks} 
          listCellWidth="200px"
          columnWidth={65}
          fontSize="12px"
        />
      ) : (
        <p>No valid tasks available to display.</p>
      )}
    </div>
  );
};

export default GanttChart;
