import { useState } from 'react';
import { Tabs, Layout, Drawer } from 'antd';
import { ThunderboltOutlined, BranchesOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { AutomationDashboard } from './Dashboard';
import { WorkflowDefinitionsView } from './WorkflowDefinitionsView';
import { WorkflowLogsView } from './WorkflowLogsView';

const { Content } = Layout;

export function AutomationTabs() {
  const [activeTab, setActiveTab] = useState('definitions');
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<{ id: string; name: string } | null>(null);

  const openLogsView = (workflowId: string, workflowName: string) => {
    setSelectedWorkflow({ id: workflowId, name: workflowName });
    setLogsDrawerOpen(true);
  };

  const tabItems = [
    {
      key: 'definitions',
      label: <span><BranchesOutlined /> Definitions</span>,
      children: <WorkflowDefinitionsView />,
    },
    {
      key: 'workflows',
      label: <span><ThunderboltOutlined /> Automations</span>,
      children: <AutomationDashboard onViewLogs={openLogsView} />,
    },
    {
      key: 'logs',
      label: <span><ClockCircleOutlined /> Logs</span>,
      children: <WorkflowLogsView />,
    },
  ];

  return (
    <>
      <Layout style={{ minHeight: '100%' }}>
        <Content>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ padding: '0 24px' }}
          />
        </Content>
      </Layout>

      <Drawer
        title={selectedWorkflow ? `Logs: ${selectedWorkflow.name}` : 'Workflow Logs'}
        width="80%"
        open={logsDrawerOpen}
        onClose={() => {
          setLogsDrawerOpen(false);
          setSelectedWorkflow(null);
        }}
        destroyOnClose
      >
        {selectedWorkflow && (
          <WorkflowLogsView
            workflowId={selectedWorkflow.id}
          />
        )}
      </Drawer>
    </>
  );
}
