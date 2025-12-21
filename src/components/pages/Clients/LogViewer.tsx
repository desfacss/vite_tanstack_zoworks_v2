// LogViewer.tsx
import React, { useState } from 'react';
import { Button, Drawer, Tooltip } from 'antd'; // Add Tooltip
import { Plus } from 'lucide-react'; // Import Plus icon
import TicketForm from './TicketForm'; // Adjust the import path as needed
import { useAuthStore } from '../../../lib/store';
import { useQueryClient } from '@tanstack/react-query';
import { useDeviceType } from '../../../utils/deviceTypeStore';
import AutomationLogViewer from './AutomationLogViewer';
interface LogViewerProps {
  ticket_id?: string;
  asset_id?: string;
}

const LogViewer: React.FC<LogViewerProps> = ({editItem}) => {
  const [open, setOpen] = useState<boolean>(false);
  const deviceType = useDeviceType();
  const isDesktop = deviceType === 'desktop';
  // const { organization } = useAuthStore();

  const showDrawer = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* <Button
        type="primary"
        onClick={showDrawer}
        icon={!isDesktop ? <Plus size={16} /> : undefined} // Add icon for mobile
      >
        {isDesktop && "Create Ticket"}
      </Button>
      <Drawer
        title="Create Ticket"
        placement="right"
        onClose={onClose}
        open={open}
        width={isDesktop ? 800 : '100%'} // Adjust width for mobile
      > */}
        <AutomationLogViewer ticketId={editItem?.id} />
      {/* </Drawer> */}
    </>
  );
};

export default LogViewer;