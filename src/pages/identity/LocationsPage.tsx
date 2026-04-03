import React from 'react';
import DynamicViews from '@/core/components/DynamicViews';
import LocationHierarchyManager from '@/core/components/common/LocationHierarchyManager';

const LocationsPage: React.FC = () => {
  const entityType = 'locations';
  const entitySchema = 'identity';

  const tabOptions = [
    {
      key: 'all',
      label: 'All Locations',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Locations</h1>
        <LocationHierarchyManager />
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DynamicViews
          entityType={entityType}
          entitySchema={entitySchema}
          tabOptions={tabOptions}
        />
      </div>
    </div>
  );
};

export default LocationsPage;
