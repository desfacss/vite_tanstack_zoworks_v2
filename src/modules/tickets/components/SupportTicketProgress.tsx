// components/SupportTicketProgress.tsx
import React from 'react';
import { Steps, Tooltip, Dropdown, Menu } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, MoreOutlined } from '@ant-design/icons';
// import './SupportTicketProgress.css';

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

  // Context menu for past stages (triggered by three dots)
  const pastStagesMenu = (
    <Menu>
      {pastStages.map(stage => (
        <Menu.Item key={stage.id}>
          {stage.stage_name} {/* Placeholder for view details or other actions */}
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
    // Past stages dropdown (if any past stages exist)
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
            status: 'finish',
            icon: <CheckCircleOutlined />,
            className: 'past-stages-dropdown',
          },
        ]
      : []),
    // Last completed and current stages
    ...visibleStages.map(stage => ({
  title: (
    <Tooltip title={stage.stage_name}>
      <span
        style={{
          backgroundColor: stage.id === currentStageId ? '#79c0ff' : 'transparent',
          padding: '6px 6px',
          borderRadius: 10,
        }}
      >
        {stage.stage_name}
      </span>
    </Tooltip>
  ),
  status: stage.ordinal < currentOrdinal ? 'finish' : 'process',
  icon:
    stage.ordinal < currentOrdinal ? (
      <CheckCircleOutlined />
    ) : (
      <ClockCircleOutlined />
    ),
  className: stage.ordinal < currentOrdinal ? 'past-stage' : 'current-stage',
})),
,
    // Future stages dropdown (if any future stages exist)
    ...(futureStages.length > 0
      ? [
          {
            title: (
              <Dropdown overlay={futureStagesMenu} trigger={['click']}>
                <Tooltip title="Select Next Stage">
                  <span style={{ cursor: 'pointer' }}>Next Stages</span>
                  <MoreOutlined style={{ fontSize: 16 }} />
                </Tooltip>
              </Dropdown>
            ),
            status: 'wait',
            className: 'future-stages-dropdown',
          },
        ]
      : []),
  ];

  return (
    <div className="">
      <Steps
        current={visibleStages.findIndex(stage => stage.id === currentStageId) + (pastStages.length > 0 ? 1 : 0)}
        items={items}
        className="support-ticket-progress"
      />
    </div>
  );
};

export default SupportTicketProgress;