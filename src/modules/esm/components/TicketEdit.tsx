import TicketForm from "./TicketForm";


interface TicketActionProps {
  parentEditItem?: any;
  onSuccess?: () => void;
  onClose?: () => void;
}

const TicketEdit: React.FC<TicketActionProps> = ({ parentEditItem, onSuccess, onClose }) => {
  return (
    <TicketForm 
      ticket_id={parentEditItem?.id} 
      asset_id={parentEditItem?.asset_id} 
      onSuccess={() => { onSuccess?.(); onClose?.(); }}
    />
  );
};

export default TicketEdit;