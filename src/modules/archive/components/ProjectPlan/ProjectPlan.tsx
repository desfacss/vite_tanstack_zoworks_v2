// src/modules/archive/components/ProjectPlan/ProjectPlan.tsx
import React, { useState } from 'react';
import { Card, Input, Tabs, Radio, Typography, Space, Divider } from 'antd';
import GanttChart from '../SharedCharts/GanttChart';
import CalendarChart from '../SharedCharts/CalendarChart';
import TimelineChart from '../SharedCharts/TimelineChart';
import processBlueprint from '../../utils/processv5.json';
import { calculateTaskDates, Task as SchedulerTask } from '../../utils/taskScheduler';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ProjectPlan: React.FC = () => {
  const [scenario, setScenario] = useState<'optimistic' | 'likely' | 'pessimistic' | 'aspirational'>('likely');
  const [startDate, setStartDate] = useState<Date>(new Date());

  const orderDetails = {
    orderId: 'ORD-AUTO-789',
    startDateTime: startDate,
  };

  const tasks: SchedulerTask[] = processBlueprint?.blueprint?.workflows[0]?.steps?.flatMap((step: any) =>
    step.tasks.map((task: any) => ({
      id: task?.id,
      name: task?.name,
      lead_time: task?.lead_time?.[scenario] || 0,
      dependencies: task?.dependencies || [],
    }))
  ) || [];

  const taskDates = calculateTaskDates(tasks, orderDetails.startDateTime);

  const tabItems = [
    {
      key: 'gantt',
      label: 'Gantt Chart',
      children: <GanttChart tasks={tasks} taskDates={taskDates} />,
    },
    {
      key: 'calendar',
      label: 'Calendar',
      children: <CalendarChart tasks={tasks} taskDates={taskDates} />,
    },
    {
      key: 'timeline',
      label: 'Timeline',
      children: <TimelineChart tasks={tasks} taskDates={taskDates} />,
    },
  ];

  return (
    <Card bordered={false}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>Project Plan for {orderDetails.orderId}</Title>
        <Text type="secondary">Dynamic scheduling based on blueprint lead times and dependencies.</Text>
      </div>

      <Space size="large" align="start">
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Project Start Date</Text>
          <Input
            type="datetime-local"
            value={dayjs(startDate).format('YYYY-MM-DDTHH:mm')}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            style={{ width: 250 }}
          />
        </div>
        
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Planning Scenario</Text>
          <Radio.Group value={scenario} onChange={(e) => setScenario(e.target.value)} buttonStyle="solid">
            <Radio.Button value="optimistic">Optimistic</Radio.Button>
            <Radio.Button value="likely">Likely</Radio.Button>
            <Radio.Button value="pessimistic">Pessimistic</Radio.Button>
            <Radio.Button value="aspirational">Aspirational</Radio.Button>
          </Radio.Group>
        </div>
      </Space>

      <Divider />

      <Tabs defaultActiveKey="gantt" items={tabItems} />
    </Card>
  );
};

export default ProjectPlan;
