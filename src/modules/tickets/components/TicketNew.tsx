// TicketNew.tsx
// This component is rendered inside a drawer by GlobalActions.
// It directly renders the TicketForm without additional wrapper.
import React from 'react';
import TicketForm from './TicketForm';

interface TicketNewProps {
  ticket_id?: string;
  asset_id?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

const TicketNew: React.FC<TicketNewProps> = ({ onSuccess, onClose }) => {
  const handleFormSuccess = () => {
    onSuccess?.();
    onClose?.();
  };

  return (
    <TicketForm onSuccess={handleFormSuccess} />
  );
};

export default TicketNew;