import React from 'react';
import DynamicViews from '@/core/components/DynamicViews';
import HierarchicalSortManager from '@/core/components/common/HierarchicalSortManager';

const TeamsUsers: React.FC = () => {
  const entityType = 'organization_users';
  const entitySchema = 'identity';

  const tabOptions = [
    {
      key: '1',
      label: 'All Users',
    },
  ];

  return (
    <div className="space-y-4">
      <HierarchicalSortManager 
        entityName="organization_users" 
        saveEntityName="organization_users"
        entitySchema={entitySchema} 
        parentColumn={'manager_id'} 
        displayColumn="user_id"
        buttonTitle="Org Hierarchy"
      />
      <DynamicViews
        entityType={entityType}
        entitySchema={entitySchema}
        tabOptions={tabOptions}
      />
    </div>
  );
};

export default TeamsUsers;
