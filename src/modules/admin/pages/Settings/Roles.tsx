import DynamicViews from '@/core/components/DynamicViews';

const Roles = () => {
  const entityType = 'roles';
  const entitySchema = 'identity';
  return (
    <DynamicViews entityType={entityType} entitySchema={entitySchema} />
  );
};

export default Roles;
