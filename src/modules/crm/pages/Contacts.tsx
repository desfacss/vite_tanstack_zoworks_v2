import DynamicViews from "@/core/components/DynamicViews";

const Contacts: React.FC = () => {
  
  return (
    <DynamicViews entityType="contacts"
        entitySchema={'external'}/>
  );
};

export default Contacts;