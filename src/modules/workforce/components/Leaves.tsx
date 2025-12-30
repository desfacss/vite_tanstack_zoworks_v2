import React from 'react';
import DynamicViews from '@/core/components/DynamicViews';
import { useAuthStore } from '@/core/lib/store';

const Leaves: React.FC = () => {
  const { user } = useAuthStore();
  const entitySchema = 'workforce';
  const entityType = 'leave_applications';

  const tabOptions = [
    {
      key: '1',
      label: 'My Leaves',
      condition: { field: 'user_id', value: user?.id },
    },
    // Team Leaves tab - only shown if user has subordinates (from session RPC)
    ((user as any)?.subordinates && {
      key: '2',
      label: 'Team Leaves',
      queryConfig: {
        is_pending_approval_view: true,
        manager_id: user?.id,
        current_time: new Date(),
      }
    })
  ].filter(Boolean); // Filter out falsey values in case user has no subordinates

  return (
    <div className="page-content layout-record">
      <div className="page-card">
        <DynamicViews
          entityType={entityType}
          entitySchema={entitySchema}
          tabOptions={tabOptions}
        />
      </div>
    </div>
  );
};

export default Leaves;
