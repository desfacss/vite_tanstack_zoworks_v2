// src/modules/archive/pages/ProcessEditor.tsx
import React from 'react';
import ProcessEditVisual from '../components/ProcessEditVisual';

const ProcessEditor: React.FC = () => {
  return (
    <div className="page-content layout-canvas">
      <div className="page-card">
        <ProcessEditVisual />
      </div>
    </div>
  );
};

export default ProcessEditor;
