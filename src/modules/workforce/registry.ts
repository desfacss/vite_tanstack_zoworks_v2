/**
 * Workforce Module Registry
 * Registers tabs, routes, actions, and translations for the workforce module.
 */

import { registry } from '@/core/registry';
import { registerModuleTranslations } from '@/core/i18n';
// WORKFORCE_MANIFEST is available for dependency checking if needed

export interface WorkforceModuleConfig {
  sub_modules?: {
    leaves?: boolean;
    expenses?: boolean;
    timesheets?: boolean;
  };
}

export async function register(
  config: WorkforceModuleConfig = {},
  enabledLanguages: string[] = ['en']
) {
  console.log('[Workforce] Registering module');

  // 1. Register translations FIRST (for labels to work)
  await registerModuleTranslations('workforce', {
    en: () => import('./i18n/en.json'),
    // Add more languages as they become available
    // hi: () => import('./i18n/hi.json'),
    // ta: () => import('./i18n/ta.json'),
  }, enabledLanguages);

  // 2. Register Tabs for 'teams' entity
  registry.registerTab({
    id: 'team-members',
    entityTypes: ['teams'],
    label: 'workforce:tabs.members',  // Namespaced label
    component: () => import('./components/TeamMembers'),
    order: 10,
  });

  // 3. Register Tabs for 'roles' entity
  registry.registerTab({
    id: 'role-users',
    entityTypes: ['roles'],
    label: 'admin:nav.users',  // Uses admin namespace
    component: () => import('@/modules/admin/components/RoleUsers'),
    order: 10,
  });

  // 4. Register Timesheets Actions
  if (subModules.timesheets !== false) {
    console.log('[Workforce] Registering timesheets tab and actions');

    const timesheetEntityTypes = ['timesheets', 'workforce.timesheets', 'timesheet', 'timesheet_items'];

    registry.registerTab({
      id: 'timesheets',
      entityTypes: timesheetEntityTypes,
      label: 'workforce:nav.timesheets',
      component: () => import('./components/Timesheet'),
      order: 20,
    });

    registry.registerAction({
      id: 'timesheet-edit',
      entityTypes: timesheetEntityTypes,
      position: 'row',
      label: 'Edit',
      component: () => import('./components/Times'),
    });
    // Add alias for 'timesheet' if form name in DB is just 'timesheet'
    registry.registerAction({
      id: 'timesheet',
      entityTypes: timesheetEntityTypes,
      position: 'row',
      label: 'Edit',
      component: () => import('./components/Times'),
    });
    console.log('[Workforce] ✓ Timesheets registered');
  }

  // 5. Register Expenses Actions
  if (subModules.expenses !== false) {
    const expenseEntityTypes = ['expense_sheets', 'workforce.expense_sheets', 'expense_sheet', 'expense_sheet_items'];

    registry.registerAction({
      id: 'expense-edit',
      entityTypes: expenseEntityTypes,
      position: 'row',
      label: 'Edit',
      component: () => import('./components/Expenses'),
    });
    // Alias to match potentially shorter form names in DB
    registry.registerAction({
      id: 'expense_sheet',
      entityTypes: expenseEntityTypes,
      position: 'row',
      label: 'Edit',
      component: () => import('./components/Expenses'),
    });
    console.log('[Workforce] ✓ Expenses registered');
  }

  // 6. Register Leaves Actions
  if (subModules.leaves !== false) {
    const leaveEntityTypes = ['leave_applications', 'workforce.leave_applications', 'leave_application'];

    // Note: If no specialized Leave component exists, we'll let it fallback to DynamicForm
    // or we can register a placeholder if we find one later.
    // For now, let's at least register a tab if needed for users.
    registry.registerTab({
      id: 'leaves',
      entityTypes: leaveEntityTypes,
      label: 'workforce:nav.leaves',
      component: () => import('./components/Leaves'),
      order: 15,
    });
  }

  // 6. Register Agent Activity Report
  registry.registerTab({
    id: 'agent-activity-report',
    entityTypes: ['users'],
    label: 'workforce:tabs.activity',
    component: () => import('./components/AgentActivityReport'),
    order: 30,
  });

  // 6. Register Detail Components (for DetailOverview)
  // These are used when viewConfig.details_overview.component matches the id
  registry.registerDetailComponent({
    id: 'expense_sheet',
    component: () => import('./components/Expensesheet'),
  });

  registry.registerDetailComponent({
    id: 'leave_application',
    component: () => import('./components/Leaves'),
  });

  registry.registerDetailComponent({
    id: 'timesheet',
    component: () => import('./components/Timesheet'),
  });

  console.log('[Workforce] ✓ Module registered');
}
