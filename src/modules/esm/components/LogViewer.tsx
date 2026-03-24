import React, { useState } from 'react';
import { Button, Drawer } from 'antd'; // Add Tooltip
import { Plus } from 'lucide-react'; // Import Plus icon
import { useDeviceType } from '@/utils/deviceTypeStore';
import AutomationLogViewer from './AutomationLogViewer';
interface LogViewerProps {
  ticket_id?: string;
  asset_id?: string;
}

const LogViewer: React.FC<LogViewerProps & { editItem?: any }> = ({ editItem }) => {
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
      <Button
        type="primary"
        icon={<Plus size={16} />}
        onClick={showDrawer} // Changed to showDrawer to match existing state logic
        className="mb-4"
      >
        {isDesktop && "Create Ticket"}
      </Button>
      <Drawer
        title="Create Ticket"
        placement="right"
        onClose={onClose}
        open={open}
        width={isDesktop ? 800 : '100%'} // Adjust width for mobile
      >
        <AutomationLogViewer ticketId={editItem?.id} />
      </Drawer>
    </>
  );
};

export default LogViewer;