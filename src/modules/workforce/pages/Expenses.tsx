import React from 'react';
import DynamicViews from '@/core/components/DynamicViews';
import { useAuthStore } from '@/core/lib/store';

const ExpensesPage: React.FC = () => {
  const { user } = useAuthStore();
  const entitySchema = 'workforce';
  const entityType = 'expense_sheets';

  const tabOptions = [
    {
      key: '1',
      label: 'My Expenses',
      condition: { field: 'user_id', value: user?.id },
    },
    {
      key: '2',
      label: 'Team Expenses',
      queryConfig: {
        is_pending_approval_view: true,
        manager_id: user?.id,
        current_time: new Date(),
      }
    }
  ];

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

export default ExpensesPage;
