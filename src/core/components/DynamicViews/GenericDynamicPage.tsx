import React from 'react';
import { useParams } from 'react-router-dom';
import DynamicViews from "./index";

interface GenericDynamicPageProps {
  schema?: string;
}

const GenericDynamicPage: React.FC<GenericDynamicPageProps> = ({ schema: propSchema }) => {
  const { schema: paramSchema, entity: paramEntity } = useParams<{ schema: string; entity: string }>();
  
  const schema = propSchema || paramSchema;
  const entity = paramEntity?.replace(/-/g, '_');
  
  if (!schema || !entity) {
    return <div>Invalid Route Parameters: Schema={schema}, Entity={entity}</div>;
  }

  return (
    <DynamicViews 
      entityType={entity} 
      entitySchema={schema} 
    />
  );
};

export default GenericDynamicPage;
