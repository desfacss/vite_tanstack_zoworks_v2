import React from 'react';
import DynamicViews from '@/core/components/DynamicViews';

/**
 * LegacyTeams Page
 * Migrated from bolt project's Teams.tsx
 * Wraps identity.teams entity in DynamicViews.
 */
const LegacyTeams: React.FC = () => {
  const entityType = 'teams';
  const entitySchema = 'identity';

  return (
    <div className="p-4">
      <DynamicViews 
        entityType={entityType} 
        entitySchema={entitySchema} 
      />
    </div>
  );
};

export default LegacyTeams;
