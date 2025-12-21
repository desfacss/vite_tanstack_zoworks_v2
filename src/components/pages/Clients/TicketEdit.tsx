import TicketForm from "./TicketForm";


const TicketEdit = ({editItem,rawData,viewConfig,onFinish}) => {
  return (
    <TicketForm ticket_id={editItem?.id} 
    asset_id={editItem?.asset_id} onSuccess={onFinish}
    />
  );
};

export default TicketEdit;