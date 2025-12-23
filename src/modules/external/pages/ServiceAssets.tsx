import DynamicViews from '@/core/components/DynamicViews';

const ServiceAssets: React.FC = () => {
  return (
    <DynamicViews
      entityType={'service_assets'}
      entitySchema={'external'}
    />
  );
};

export default ServiceAssets;
