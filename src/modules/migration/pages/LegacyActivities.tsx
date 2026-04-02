import React from 'react';
import DynamicViews from '@/core/components/DynamicViews';

/**
 * LegacyActivities Page
 * Migrated from bolt project's Activities.tsx
 * Standard DynamicViews wrapper for activities or tasks.
 */
const LegacyActivities: React.FC = () => {
  const entityType = 'ent_activities';
  const availableViews = ['tableview', 'kanbanview', 'gridview'];
  const defaultView = 'tableview';

  return (
    <div className="p-4">
      <DynamicViews
        entityType={entityType}
        availableViews={availableViews}
        defaultView={defaultView}
      />
    </div>
  );
};

export default LegacyActivities;
