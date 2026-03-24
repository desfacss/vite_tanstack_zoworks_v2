// src/modules/archive/utils/taskScheduler.ts
export interface Task {
  id: string;
  name: string;
  lead_time: number;
  dependencies?: { taskId: string; type: 'FS' | 'SS'; lag?: number }[];
}

export interface TaskDate {
  id: string;
  start: Date;
  end: Date;
}

export const calculateTaskDates = (tasks: Task[], startDateTime: Date): TaskDate[] => {
  const taskDates: { [key: string]: { start: Date; end: Date } } = {};

  // Validate dependencies
  const taskIds = new Set(tasks.map((task) => task?.id));
  tasks.forEach((task) => {
    task?.dependencies?.forEach((dep) => {
      if (!taskIds.has(dep.taskId)) {
        console.error(`Invalid dependency: Task ${task?.id} depends on non-existent task ${dep.taskId}`);
      }
    });
  });

  // Topological sort to handle dependencies
  const sortedTasks = topologicalSort(tasks);

  sortedTasks.forEach((task) => {
    const leadTime = task?.lead_time || 0;

    // Default start date is the project start date
    let taskStart = new Date(startDateTime);

    // Adjust start date based on dependencies
    task?.dependencies?.forEach((dep) => {
      const depTaskId = dep.taskId;
      const depType = dep.type;
      const lag = dep.lag || 0;

      // Skip self-referencing dependencies
      if (depTaskId === task.id) {
        console.warn(`Self-referencing dependency detected for task ${task.id}. Skipping.`);
        return;
      }

      // Ensure the dependency has been calculated
      if (!taskDates[depTaskId]) {
        console.error(`Dependency ${depTaskId} for task ${task.id} has not been calculated yet.`);
        return;
      }

      if (depType === 'FS') {
        taskStart = new Date(
          Math.max(taskStart.getTime(), taskDates[depTaskId].end.getTime() + lag * 3600 * 1000)
        );
      } else if (depType === 'SS') {
        taskStart = new Date(
          Math.max(taskStart.getTime(), taskDates[depTaskId].start.getTime() + lag * 3600 * 1000)
        );
      }
    });

    // Calculate end date
    const taskEnd = new Date(taskStart.getTime() + leadTime * 3600 * 1000);

    // Store calculated dates
    taskDates[task?.id] = { start: taskStart, end: taskEnd };
  });

  return tasks.map(task => ({
     id: task.id,
     ...taskDates[task.id]
  })).filter(td => td.start && td.end);
};

const topologicalSort = (tasks: Task[]): Task[] => {
  const graph: { [key: string]: string[] } = {};
  const inDegree: { [key: string]: number } = {};

  // Initialize graph and in-degree map
  tasks.forEach((task) => {
    graph[task.id] = [];
    inDegree[task.id] = 0;
  });

  tasks.forEach((task) => {
    task.dependencies?.forEach((dep) => {
      if (graph[dep.taskId]) {
        graph[dep.taskId].push(task.id);
        inDegree[task.id]++;
      } else {
        console.error('Missing task ID in graph:', dep.taskId, 'for task:', task.id);
      }
    });
  });

  // Perform topological sort
  const queue: string[] = [];
  for (const taskId in inDegree) {
    if (inDegree[taskId] === 0) queue.push(taskId);
  }

  const sortedTasks: Task[] = [];
  while (queue.length > 0) {
    const taskId = queue.shift()!;
    const task = tasks.find((t) => t.id === taskId);
    if (task) sortedTasks.push(task);

    if (graph[taskId]) {
        graph[taskId].forEach((neighbor) => {
          inDegree[neighbor]--;
          if (inDegree[neighbor] === 0) queue.push(neighbor);
        });
    }
  }

  return sortedTasks;
};
