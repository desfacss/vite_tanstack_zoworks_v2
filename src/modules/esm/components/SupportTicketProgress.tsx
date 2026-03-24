// components/SupportTicketProgress.tsx
import React from 'react';
import { Steps, Tooltip, Dropdown, Menu } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, MoreOutlined } from '@ant-design/icons';

interface SupportTicketProgressProps {
  stages: { id: string; stage_name: string; ordinal: number }[];
  currentStageId: string | null;
  onStageChange?: (stageId: string) => void;
}

const SupportTicketProgress: React.FC<SupportTicketProgressProps> = ({
  stages,
  currentStageId,
  onStageChange,
}) => {
  // Find the current stage
  const currentStage = stages.find(stage => stage.id === currentStageId);
  const currentOrdinal = currentStage?.ordinal ?? -1;

  // Past stages (ordinal < currentOrdinal)
  const pastStages = stages
    .filter(stage => stage.ordinal < currentOrdinal)
    .sort((a, b) => a.ordinal - b.ordinal);

  // Last completed stage (highest ordinal < currentOrdinal)
  const lastCompletedStage = pastStages.length > 0 ? pastStages[pastStages.length - 1] : null;

  // Current stage
  const currentStageItem = stages.find(stage => stage.ordinal === currentOrdinal);

  // Future stages (ordinal > currentOrdinal)
  const futureStages = stages
    .filter(stage => stage.ordinal > currentOrdinal)
    .sort((a, b) => a.ordinal - b.ordinal);

  // Visible stages: last completed, current, and a placeholder for future stages dropdown
  const visibleStages = [
    ...(lastCompletedStage ? [lastCompletedStage] : []),
    ...(currentStageItem ? [currentStageItem] : []),
  ].sort((a, b) => a.ordinal - b.ordinal);

  // Context menu for past stages
  const pastStagesMenu = (
    <Menu>
      {pastStages.map(stage => (
        <Menu.Item key={stage.id}>
          {stage.stage_name}
        </Menu.Item>
      ))}
    </Menu>
  );

  // Dropdown menu for future stages
  const futureStagesMenu = (
    <Menu>
      {futureStages.map(stage => (
        <Menu.Item
          key={stage.id}
          onClick={() => onStageChange?.(stage.id)}
        >
          {stage.stage_name}
        </Menu.Item>
      ))}
    </Menu>
  );

  // Map visible stages to Steps items
  const items = [
    ...(pastStages.length > 0
      ? [
          {
            title: (
              <Dropdown overlay={pastStagesMenu} trigger={['click']}>
                <Tooltip title="View Past Stages">
                  <MoreOutlined style={{ fontSize: 16 }} />
                </Tooltip>
              </Dropdown>
            ),
            status: 'finish' as const,
            icon: <CheckCircleOutlined />,
          },
        ]
      : []),
    ...visibleStages.map(stage => ({
      title: (
        <Tooltip title={stage.stage_name}>
          <span
            style={{
              backgroundColor: stage.id === currentStageId ? 'var(--tenant-primary-light, #e6f7ff)' : 'transparent',
              padding: '4px 8px',
              borderRadius: 4,
              fontWeight: stage.id === currentStageId ? 'bold' : 'normal'
            }}
          >
            {stage.stage_name}
          </span>
        </Tooltip>
      ),
      status: (stage.ordinal < currentOrdinal ? 'finish' : 'process') as any,
      icon: stage.ordinal < currentOrdinal ? <CheckCircleOutlined /> : <ClockCircleOutlined />,
    })),
    ...(futureStages.length > 0
      ? [
          {
            title: (
              <Dropdown overlay={futureStagesMenu} trigger={['click']}>
                <Tooltip title="Select Next Stage">
                  <span style={{ cursor: 'pointer', marginRight: 4 }}>Next Stages</span>
                  <MoreOutlined style={{ fontSize: 16 }} />
                </Tooltip>
              </Dropdown>
            ),
            status: 'wait' as const,
          },
        ]
      : []),
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Steps
        current={visibleStages.findIndex(stage => stage.id === currentStageId) + (pastStages.length > 0 ? 1 : 0)}
        items={items}
      />
    </div>
  );
};

export default SupportTicketProgress;