// TicketNew.tsx
// This component is rendered inside a drawer by GlobalActions (New) or RowActions (Edit).
// It directly renders the TicketForm with the appropriate record context.
import React from 'react';
import TicketForm from './TicketForm';

interface TicketActionProps {
  entityType?: string;
  parentEditItem?: any;
  onSuccess?: () => void;
  onClose?: () => void;
}

const TicketNew: React.FC<TicketActionProps> = ({ parentEditItem, onSuccess, onClose }) => {
  const handleFormSuccess = () => {
    onSuccess?.();
    onClose?.();
  };

  return (
    <TicketForm 
      ticket_id={parentEditItem?.id} 
      asset_id={parentEditItem?.asset_id}
      onSuccess={handleFormSuccess} 
    />
  );
};

export default TicketNew;