import React, { useState } from 'react';
import { Button, Drawer, Space, Typography } from 'antd';
import Expensesheet from './Expensesheet'; // Import the core component

interface ExpensesProps {
  // Props received from GlobalActions (for Create)
  parentEditItem?: { id: string };
  entityType?: 'project' | 'user' | string;

  // Props received from RowActions (for Edit/View)
  editItem?: any; 
  onFinish?: () => void; // Success callback from RowActions
}

const Expenses: React.FC<ExpensesProps> = ({ editItem, onFinish }) => {
  const [visible, setVisible] = useState(false);
  
  const isMobile = window.innerWidth <= 768;
  
  // Determine the title and mode
  const drawerTitle = editItem 
    ? (editItem.status === 'Draft' ? `Edit Expenses Claim` : `View Expenses Claim (${editItem.status})`) 
    : 'Create New Expenses Claim';
    
  const viewMode = editItem?.status !== 'Draft' && editItem?.status !== 'Rejected' && !!editItem;

  const showDrawer = () => {
    setVisible(true);
  };

  const onClose = () => {
    setVisible(false);
  };

  // Function to handle success and close the drawer
  const handleSuccess = () => {
    onClose();
    if (onFinish) {
      onFinish(); // Notify the RowActions/GlobalActions to refresh the list
    }
  };

  // --- Render Logic ---
  
  // 1. Component used in GlobalActions (Create button)
  if (!editItem) {
    return (
      <>
        {/* NOTE: In your GlobalActions component, the 'Add' button handles this, 
          but since the dynamic component path is used (e.g., '.Expenses'), 
          we need a button here if the GlobalActions logic for components doesn't open the drawer.
          Based on your RowActions component, a custom component should handle its own drawer/modal.
          Let's provide a button here to follow the Task component pattern. */}
        <Button type="primary" onClick={showDrawer}>
          Create Expenses Claim
        </Button>
        <Drawer
          title={drawerTitle}
          width={isMobile ? '100%' : '70%'}
          onClose={onClose}
          open={visible}
          style={{ paddingBottom: 80 }}
        >
          <Expensesheet onFinish={handleSuccess} />
        </Drawer>
      </>
    );
  }

  // 2. Component used in RowActions (Edit/View/Approve)
  // When loaded by RowActions, the RowActions component handles the drawer,
  // so we just render the Expensesheet directly.
  return (
    <>
      <Expensesheet 
        editItem={editItem} 
        onFinish={handleSuccess} 
        viewMode={viewMode}
      />
      {/* Add approval/rejection buttons for managers in view mode if applicable */}
    </>
  );
};

export default Expenses;