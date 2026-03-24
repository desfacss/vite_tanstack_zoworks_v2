// src/modules/archive/pages/Networking.tsx
import React from 'react';
import ChannelTabs from '../components/Networking/ChannelTabs';

const Networking: React.FC = () => {
  return (
    <div className="page-content layout-canvas">
      <div className="page-card">
        <ChannelTabs />
      </div>
    </div>
  );
};

export default Networking;
