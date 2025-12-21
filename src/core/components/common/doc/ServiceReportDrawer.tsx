// src/components/forms/ServiceReportDrawer.tsx

import React, { useState } from 'react';
import { Button, Drawer, Typography } from 'antd';
import ServiceReportForm from './TaskReportPage';

const { Title } = Typography;

interface ServiceReportDrawerProps {
  editItem?: { id: string };
  // We'll pass the title from the parent
  title?: string;
}

const ServiceReportDrawer: React.FC<ServiceReportDrawerProps> = ({ editItem }) => {
  const title = editItem?.id ? 'Edit Service Report' : 'Create Service Report';
  const [open, setOpen] = useState(false);

  const showDrawer = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button type="primary" onClick={showDrawer}>
        {title}
      </Button>
      <Drawer
        title={<Title level={4} style={{ margin: 0 }}>{title}</Title>}
        width={1000}
        onClose={onClose}
        open={open}
        destroyOnClose={true} // Clean up state when closed
      >
        {/* Pass the editItem and onClose props to the form component */}
        <ServiceReportForm editItem={editItem} onClose={onClose} />
      </Drawer>
    </>
  );
};

export default ServiceReportDrawer;