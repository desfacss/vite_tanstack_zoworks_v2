// src/modules/archive/pages/SchedulerPage.tsx
import React from 'react';
import Scheduler from '../components/Scheduler';

const SchedulerPage: React.FC = () => {
  return (
    <div className="page-content layout-canvas">
      <div className="page-card">
        <Scheduler />
      </div>
    </div>
  );
};

export default SchedulerPage;
