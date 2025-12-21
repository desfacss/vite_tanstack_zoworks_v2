import React from 'react';
import { Timeline } from 'antd';

const StatusTab: React.FC = () => {
  return (
    <Timeline
      items={[
        { datetime: '2023-10-26 10:00:00', children: 'Task Created' },
        { datetime: '2023-10-26 12:00:00', children: 'In Progress' },
        { datetime: '2023-10-27 14:00:00', children: 'Completed' },
      ]}
    />
  );
};

export default StatusTab;