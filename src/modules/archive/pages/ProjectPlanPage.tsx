// src/modules/archive/pages/ProjectPlanPage.tsx
import React from 'react';
import ProjectPlan from '../components/ProjectPlan/ProjectPlan';

const ProjectPlanPage: React.FC = () => {
  return (
    <div className="page-content layout-canvas">
      <div className="page-card">
        <ProjectPlan />
      </div>
    </div>
  );
};

export default ProjectPlanPage;
