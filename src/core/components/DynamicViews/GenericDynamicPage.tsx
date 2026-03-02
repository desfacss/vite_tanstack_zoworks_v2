import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import DynamicViews from "./index";
import menuConfig from '@/config/menuConfig.json';

interface GenericDynamicPageProps {
  schema?: string;
}

const GenericDynamicPage: React.FC<GenericDynamicPageProps> = ({ schema: propSchema }) => {
  const { schema: paramSchema, entity: paramEntity } = useParams<{ schema: string; entity: string }>();
  const location = useLocation();
  
  const schema = (propSchema || paramSchema) as keyof typeof menuConfig.modules;
  const entity = paramEntity?.replace(/-/g, '_');
  
  if (!schema || !entity) {
    return <div>Invalid Route Parameters: Schema={schema}, Entity={entity}</div>;
  }

  // Find the route configuration in menuConfig
  const moduleRoutes = menuConfig.modules[schema] || [];
  const currentRoute = moduleRoutes.find((route: any) => route.routePath === location.pathname);
  const tabOptions = (currentRoute as any)?.tabs || [];

  return (
    <DynamicViews 
      entityType={entity} 
      entitySchema={schema} 
      tabOptions={tabOptions}
    />
  );
};

export default GenericDynamicPage;
