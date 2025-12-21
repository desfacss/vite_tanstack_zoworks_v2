/**
 * Workforce Module Registry
 * Registers tabs, routes, actions, and translations for the workforce module.
 */

import { registry } from '@/core/registry';
import { registerModuleTranslations } from '@/core/i18n';
import { WORKFORCE_MANIFEST } from './manifest';

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
    registry.registerTab({
      id: 'timesheets',
      entityTypes: ['projects', 'tasks'],
      label: 'workforce:nav.timesheets',
      component: () => import('./components/Timesheet'),
      order: 20,
    });
  }

  // 5. Register Agent Activity Report
  registry.registerTab({
    id: 'agent-activity-report',
    entityTypes: ['users'],
    label: 'workforce:tabs.activity',
    component: () => import('./components/AgentActivityReport'),
    order: 30,
  });

  console.log('[Workforce] ✓ Module registered');
}
