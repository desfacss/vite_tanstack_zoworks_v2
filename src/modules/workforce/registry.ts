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

  // 4. Register Tabs for 'projects' or 'tasks' for timesheets
  const subModules = config.sub_modules || {};
  if (subModules.timesheets !== false) {  // Default enabled
    console.log('[Workforce] Registering timesheets tab and actions');
    
    const timesheetEntityTypes = ['timesheets', 'workforce.timesheets', 'timesheet'];

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
    console.log('[Workforce] ✓ Timesheets registered for:', timesheetEntityTypes);
  } else {
    console.log('[Workforce] Skipping timesheets registration (disabled)');
  }

  // 5. Register Expenses Actions
  if (subModules.expenses !== false) {
    const expenseEntityTypes = ['expense_sheets', 'workforce.expense_sheets', 'expense_sheet'];
    
    registry.registerAction({
      id: 'expense-edit',
      entityTypes: expenseEntityTypes,
      position: 'row',
      label: 'Edit',
      component: () => import('./components/Expenses'),
    });
    console.log('[Workforce] ✓ Expenses registered for:', expenseEntityTypes);
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
