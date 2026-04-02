import React from 'react';
import DynamicViews from '@/core/components/DynamicViews';
import { useAuthStore } from '@/core/lib/store';

/**
 * LegacyTickets Page
 * Migrated from bolt project's MyTickets.tsx
 * Displays tickets assigned to the current user using DynamicViews.
 */
const LegacyTickets: React.FC = () => {
  const { user } = useAuthStore();
  const entityType = 'tickets';
  const entitySchema = 'esm';
  
  // Tab configuration to filter for current user as assignee
  const tabOptions = [
    {
      key: 'my-tickets',
      label: 'My Assigned Tickets',
      condition: { 
        field: 'assignee_id', 
        value: user?.id 
      },
    }
  ];

  return (
    <div className="p-4">
      <DynamicViews
        entityType={entityType}
        entitySchema={entitySchema}
        tabOptions={tabOptions}
        availableViews={['tableview', 'kanbanview', 'gridview']}
        defaultView="tableview"
      />
    </div>
  );
};

export default LegacyTickets;
