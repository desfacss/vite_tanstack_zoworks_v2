import React from 'react';
import Expensesheet from './Expensesheet'; // Import the core component

interface ExpensesProps {
  // Props received from GlobalActions (for Create)
  parentEditItem?: { id: string };
  entityType?: 'project' | 'user' | string;
  onSuccess?: () => void; // Passed by GlobalActions/RowActions

  // Props received from RowActions (for Edit/View)
  editItem?: any; 
  onFinish?: () => void; // Success callback from RowActions

  // Compatibility with RowActions registry
  record?: any;
  onClose?: () => void;
}

/**
 * Expenses Component (Wrapper)
 *
 * This component acts as a wrapper for the core <Expensesheet /> component.
 * It ensures the component renders directly within the DynamicViews drawer.
 */
const Expenses: React.FC<ExpensesProps> = ({ editItem: propEditItem, onFinish, onSuccess, record, parentEditItem }) => {
  // Use either record (registry), propEditItem (direct), or parentEditItem (GlobalActions/Nested)
  const editItem = record || propEditItem || parentEditItem;

  const isDraft = editItem?.status === 'Draft' || editItem?.stage_id === 'Draft';
  const isRejected = editItem?.status === 'Rejected' || editItem?.stage_id === 'Rejected';
  const viewMode = !!editItem && !isDraft && !isRejected;

  // Function to handle success and close the drawer
  const handleSuccess = () => {
    // Call any of the success callbacks provided by the parent
    if (onSuccess) onSuccess();
    if (onFinish) onFinish();
  };

  // --- Render Logic ---
  
  // When loaded by GlobalActions (Create) or RowActions (Edit/View), 
  // the parent component handles the drawer, so we just render the Expensesheet directly.
  return (
    <Expensesheet 
      editItem={editItem} 
      onFinish={handleSuccess} 
      viewMode={viewMode}
    />
  );
};

export default Expenses;