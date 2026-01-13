// import React, { useState } from 'react';
// import { Button, Drawer, Space, Typography } from 'antd';
// import Timesheet from './Timesheet'; // Import the core component

// interface TimesProps {
//   // Props received from GlobalActions (for Create)
//   parentEditItem?: { id: string };
//   entityType?: 'project' | 'user' | string;

//   // Props received from RowActions (for Edit/View)
//   editItem?: any; 
//   onFinish?: () => void; // Success callback from RowActions
// }

// const Times: React.FC<TimesProps> = ({ editItem, onFinish }) => {
//   const [visible, setVisible] = useState(false);
//   
//   const isMobile = window.innerWidth <= 768;
//   
//   // Determine the title and mode
//   const drawerTitle = editItem 
//     ? (editItem.status === 'Draft' ? `Edit Times Claim` : `View Times Claim (${editItem.status})`) 
//     : 'Create New Times Claim';
//     
//   const viewMode = editItem?.status !== 'Draft' && editItem?.status !== 'Rejected' && !!editItem;

//   const showDrawer = () => {
//     setVisible(true);
//   };

//   const onClose = () => {
//     setVisible(false);
//   };

//   // Function to handle success and close the drawer
//   const handleSuccess = () => {
//     onClose();
//     if (onFinish) {
//       onFinish(); // Notify the RowActions/GlobalActions to refresh the list
//     }
//   };

//   // --- Render Logic ---
//   
//   // 1. Component used in GlobalActions (Create button)
//   if (!editItem) {
//     return (
//       <>
//         {/* NOTE: In your GlobalActions component, the 'Add' button handles this, 
//           but since the dynamic component path is used (e.g., '.Times'), 
//           we need a button here if the GlobalActions logic for components doesn't open the drawer.
//           Based on your RowActions component, a custom component should handle its own drawer/modal.
//           Let's provide a button here to follow the Task component pattern. */}
//         <Button type="primary" onClick={showDrawer}>
//           Create
//         </Button>
//         <Drawer
//           title={drawerTitle}
//           width={isMobile ? '100%' : '70%'}
//           onClose={onClose}
//           open={visible}
//           style={{ paddingBottom: 80 }}
//         >
//           <Timesheet onFinish={handleSuccess} />
//         </Drawer>
//       </>
//     );
//   }

//   // 2. Component used in RowActions (Edit/View/Approve)
//   // When loaded by RowActions, the RowActions component handles the drawer,
//   // so we just render the Timesheet directly.
//   return (
//     <>
//       <Timesheet 
//         editItem={editItem} 
//         onFinish={handleSuccess} 
//         viewMode={viewMode}
//       />
//       {/* Add approval/rejection buttons for managers in view mode if applicable */}
//     </>
//   );
// };

// export default Times;



import React, { useState } from 'react';
import { Button, Drawer } from 'antd';
import Timesheet from './Timesheet'; // for the "Projects as Rows" view.
import TimesheetProjects from './TimesheetProjects'; //for this new "Projects as Columns" view.

interface TimesProps {
  // Props received from GlobalActions (for Create)
  parentEditItem?: { id: string };
  entityType?: 'project' | 'user' | string;

  // Props received from RowActions (for Edit/View)
  editItem?: any; 
  onFinish?: () => void; // Success callback from RowActions

  // New standard props passed by RowActions when using registry actions
  record?: any;
  onClose?: () => void;
}

/**
 * Times Component (Wrapper)
 *
 * This component acts as a wrapper for the core <Timesheet /> component.
 * It is responsible for:
 * 1. Handling the "Create" button state when used in GlobalActions.
 * 2. Managing the <Drawer /> visibility for the "Create" flow.
 * 3. Passing props directly to <Timesheet /> when used in RowActions (for Edit/View),
 * as RowActions typically provides its own Drawer/Modal.
 */
const Times: React.FC<TimesProps> = ({ editItem, onFinish, record, onClose }) => {
  const [visible, setVisible] = useState(false);
  const actualRecord = record || editItem;
  
  const isMobile = window.innerWidth <= 768;
  
  // Determine the title and mode
  const drawerTitle = actualRecord 
    ? (actualRecord.stage_id === 'Draft' || actualRecord.stage_id === 'Rejected' ? `Edit Times Claim` : `View Times Claim (${actualRecord.stage_id})`) 
    : 'Create New Times Claim';
    
  // View mode is true if the item exists and is NOT in a state that allows editing.
  const isDraft = actualRecord?.status === 'Draft' || actualRecord?.stage_id === 'Draft';
  const isRejected = actualRecord?.status === 'Rejected' || actualRecord?.stage_id === 'Rejected';
  const viewMode = !!actualRecord && !isDraft && !isRejected;

  const showDrawer = () => {
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
    onClose?.(); // Close the registry drawer if applicable
  };

  // Function to handle success and close the drawer
  const handleSuccess = () => {
    handleClose();
    if (onFinish) {
      onFinish(); // Notify the RowActions/GlobalActions to refresh the list
    }
  };

  // --- Render Logic ---
  
  // 1. Component used in GlobalActions (Create button)
  if (!actualRecord) {
    return (
      <>
        <Button type="primary" onClick={showDrawer}>
          Create
        </Button>
        <Drawer
          title={drawerTitle}
          width={isMobile ? '100%' : '80%'} // Increased width
          onClose={handleClose}
          open={visible}
          style={{ paddingBottom: 80 }}
          destroyOnClose
        >
          <Timesheet onFinish={handleSuccess} />
        </Drawer>
      </>
    );
  }

  // 2. Component used in RowActions (Edit/View/Approve)
  // When loaded by RowActions, the RowActions component handles the drawer,
  // so we just render the Timesheet directly.
  return (
    <Timesheet
      editItem={actualRecord} 
      onFinish={handleSuccess} 
      viewMode={viewMode}
    />
  );
};

export default Times;
