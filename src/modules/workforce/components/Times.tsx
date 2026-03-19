import React from 'react';
import Timesheet from './Timesheet'; // for the "Projects as Rows" view.

interface TimesProps {
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
 * Times Component (Wrapper)
 *
 * This component acts as a wrapper for the core <Timesheet /> component.
 * It ensures the component renders directly within the DynamicViews drawer.
 */
const Times: React.FC<TimesProps> = ({ editItem, onFinish, onSuccess, record, parentEditItem }) => {
  // Use either record (registry), editItem (RowActions), or parentEditItem (GlobalActions/Nested)
  const actualRecord = record || editItem || parentEditItem;
  
  // View mode is true if the item exists and is NOT in a state that allows editing.
  const isDraft = actualRecord?.status === 'Draft' || actualRecord?.stage_id === 'Draft';
  const isRejected = actualRecord?.status === 'Rejected' || actualRecord?.stage_id === 'Rejected';
  const viewMode = !!actualRecord && !isDraft && !isRejected;

  // Function to handle success and close the drawer
  const handleSuccess = () => {
    // Call any of the success callbacks provided by the parent
    if (onSuccess) onSuccess();
    if (onFinish) onFinish();
  };

  // --- Render Logic ---
  
  // When loaded by GlobalActions (Create) or RowActions (Edit/View), 
  // the parent component handles the drawer, so we just render the Timesheet directly.
  return (
    <Timesheet
      editItem={actualRecord} 
      onFinish={handleSuccess} 
      viewMode={viewMode}
    />
  );
};

export default Times;
