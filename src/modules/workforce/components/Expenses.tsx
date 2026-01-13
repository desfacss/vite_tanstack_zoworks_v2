import React, { useState } from 'react';
import { Button, Drawer } from 'antd';
import Expensesheet from './Expensesheet'; // Import the core component

interface ExpensesProps {
  // Props received from GlobalActions (for Create)
  parentEditItem?: { id: string };
  entityType?: 'project' | 'user' | string;

  // Props received from RowActions (for Edit/View)
  editItem?: any; 
  onFinish?: () => void; // Success callback from RowActions

  // Compatibility with RowActions registry
  record?: any;
  onClose?: () => void;
}

const Expenses: React.FC<ExpensesProps> = ({ editItem: propEditItem, onFinish, record, onClose: propOnClose }) => {
  const [visible, setVisible] = useState(false);
  
  // Use either propEditItem (from direct usage) or record (from RowActions)
  const editItem = propEditItem || record;
  const onCloseFinal = propOnClose || onFinish || (() => setVisible(false));

  const isMobile = window.innerWidth <= 768;
  
  const isDraft = editItem?.status === 'Draft' || editItem?.stage_id === 'Draft';
  const isRejected = editItem?.status === 'Rejected' || editItem?.stage_id === 'Rejected';
  const viewMode = !!editItem && !isDraft && !isRejected;

  // Determine the title and mode
  const drawerTitle = editItem 
    ? (isDraft || isRejected ? `Edit Expenses Claim` : `View Expenses Claim (${editItem.stage_id || editItem.status || 'Submitted'})`) 
    : 'Create New Expenses Claim';

  const showDrawer = () => {
    setVisible(true);
  };

  const onClose = () => {
    setVisible(false);
    if (propOnClose) propOnClose();
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
        onFinish={onCloseFinal} 
        viewMode={viewMode}
      />
    </>
  );
};

export default Expenses;