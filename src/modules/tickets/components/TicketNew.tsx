// TicketNew.tsx
import React, { useState } from 'react';
import { Button, Drawer, Tooltip } from 'antd'; // Add Tooltip
import { Plus } from 'lucide-react'; // Import Plus icon
import TicketForm from './TicketForm'; // Adjust the import path as needed
import { useAuthStore } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';
import { useDeviceType } from '@/utils/deviceTypeStore';
interface TicketNewProps {
  ticket_id?: string;
  asset_id?: string;
}

const TicketNew: React.FC<TicketNewProps> = () => {
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

  // Function to call after successful form submission in TicketForm
  const handleFormSuccess = () => {
    // const queryClient = useQueryClient();
    // queryClient.invalidateQueries({ queryKey: ["tickets", organization?.id] });
    onClose(); // Close the drawer
    // window.location.reload(); // Reload the page
  };

  const buttonContent = isDesktop ? (
    "Create Ticket"
  ) : (
    <Tooltip title="Create Ticket">
      <Plus size={16} />
    </Tooltip>
  );

  return (
    <>
      <Button
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
        destroyOnClose // Ensures form state is reset on close
      >
        <TicketForm
          // asset_id={"31de7a2d-1937-489d-a1fb-8b1cbbeb70f1"}
          onSuccess={handleFormSuccess} // Pass the success handler
        />
      </Drawer>
    </>
  );
};

export default TicketNew;