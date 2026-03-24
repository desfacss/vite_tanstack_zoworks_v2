// src/modules/archive/components/Scheduler/index.tsx
import React, { useState, useEffect } from 'react';
import { Select, Card, Typography, Tabs, Spin, Row, Col, Statistic, Tag, Space, Divider } from 'antd';
import TimelineChart from './TimelineChart';
import CalendarChart from './CalendarChart';
import GanttChart from './GanttChart';
import MermaidChart from './MermaidChart';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const colorPalette = [
  '#f5222d', '#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#fa8c16', '#13c2c2'
];

const getConsistentColor = (key: string, palette: string[]): string => {
  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

const resourceColorMap: { [key: string]: string } = {};
const projectColorMap: { [key: string]: string } = {};

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

interface Scenario {
  scenario: { name: string; id: string };
  events: Event[];
  summary: {
    status: string;
    notes: string;
    project_completion_date: string;
    total_project_duration_days: number;
    resource_utilization: {
      overall_worker_utilization_percent: number;
      overall_machine_utilization_percent: number;
    };
    milestone_adherence: { met: number; missed: number };
    unscheduled_tasks_count: number;
  };
}

const Scheduler: React.FC = () => {
  const scenarios = ['baseline.json', 'scenario1.json', 'scenario2.json', 'scenario3.json'];
  const [selectedScenario, setSelectedScenario] = useState<string>(scenarios[0]);
  const [viewMode, setViewMode] = useState<'resource' | 'project'>('resource');
  const [scenarioData, setScenarioData] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('timeline');

  useEffect(() => {
    const fetchScenarioData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/data/tasks/${selectedScenario}`);
        if (!response.ok) throw new Error('Failed to load scenario data');
        const data: Scenario = await response.json();

        // Update color mappings
        data.events.forEach((event) => {
          const projectName = event.extendedProps.project_name;
          if (!projectColorMap[projectName]) {
            projectColorMap[projectName] = getConsistentColor(projectName, colorPalette);
          }
          event.extendedProps.resource_names.forEach((resource) => {
            if (!resourceColorMap[resource]) {
              resourceColorMap[resource] = getConsistentColor(resource, colorPalette);
            }
          });
          if (event.extendedProps.resource_names.length === 0) {
            if (!resourceColorMap['Unassigned']) {
              resourceColorMap['Unassigned'] = '#999';
            }
          }
        });

        setScenarioData(data);
      } catch (error) {
        console.error('Error fetching scenario data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchScenarioData();
  }, [selectedScenario]);

  if (loading || !scenarioData) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  const tabItems = [
    {
      key: 'timeline',
      label: 'Timeline',
      children: (
        <TimelineChart
          events={scenarioData.events}
          viewMode={viewMode}
          resourceColorMap={resourceColorMap}
          projectColorMap={projectColorMap}
        />
      ),
    },
    {
      key: 'calendar',
      label: 'Calendar',
      children: (
        <CalendarChart
          events={scenarioData.events}
          viewMode={viewMode}
          resourceColorMap={resourceColorMap}
          projectColorMap={projectColorMap}
        />
      ),
    },
    {
      key: 'gantt',
      label: 'Gantt',
      children: (
        <GanttChart
          events={scenarioData.events}
          viewMode={viewMode}
          resourceColorMap={resourceColorMap}
          projectColorMap={projectColorMap}
          scenarioName={scenarioData.scenario.name}
        />
      ),
    },
    {
      key: 'mermaid',
      label: 'Flow Diagram',
      children: <MermaidChart scenarioName={scenarioData.scenario.name} />,
    },
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>{scenarioData.scenario.name}</Title>
        <Space>
          <Text strong>Scenario:</Text>
          <Select
            style={{ width: 180 }}
            value={selectedScenario}
            onChange={setSelectedScenario}
          >
            {scenarios.map((s) => (
              <Option key={s} value={s}>{s.replace('.json', '').toUpperCase()}</Option>
            ))}
          </Select>
          <Divider type="vertical" />
          <Text strong>Group By:</Text>
          <Select
            style={{ width: 160 }}
            value={viewMode}
            onChange={setViewMode}
          >
            <Option value="resource">Resource</Option>
            <Option value="project">Project</Option>
          </Select>
        </Space>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        items={tabItems} 
        type="line"
      />

      <Card size="small" style={{ marginTop: 24, background: '#fafafa', borderRadius: '8px' }}>
        <Title level={5}>Simulation Summary</Title>
        <Row gutter={[24, 24]}>
          <Col span={6}>
            <Statistic title="Status" value={scenarioData.summary.status} valueStyle={{ color: '#3f8600', fontSize: '16px' }} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Completion Date" 
              value={dayjs(scenarioData.summary.project_completion_date).format('MMM D, YYYY')} 
              valueStyle={{ fontSize: '16px' }} 
            />
          </Col>
          <Col span={6}>
             <Statistic title="Total Duration" value={scenarioData.summary.total_project_duration_days} suffix="days" valueStyle={{ fontSize: '16px' }} />
          </Col>
          <Col span={6}>
             <Space direction="vertical" size={0}>
                <Text type="secondary">Milestone Adherence</Text>
                <div>
                   <Tag color="success">Met: {scenarioData.summary.milestone_adherence.met}</Tag>
                   <Tag color="error">Missed: {scenarioData.summary.milestone_adherence.missed}</Tag>
                </div>
             </Space>
          </Col>
        </Row>
        <Divider style={{ margin: '12px 0' }} />
        <Row gutter={24}>
           <Col span={12}>
              <Text strong>Notes:</Text>
              <Paragraph style={{ fontSize: '12px', color: '#666' }}>{scenarioData.summary.notes}</Paragraph>
           </Col>
           <Col span={12}>
              <Text strong>Resource Utilization:</Text>
              <div>
                 Worker: <Tag color="blue">{scenarioData.summary.resource_utilization.overall_worker_utilization_percent.toFixed(1)}%</Tag>
                 Machine: <Tag color="cyan">{scenarioData.summary.resource_utilization.overall_machine_utilization_percent.toFixed(1)}%</Tag>
              </div>
           </Col>
        </Row>
      </Card>
    </Card>
  );
};

export default Scheduler;
