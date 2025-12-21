
import { registry } from '@/core/registry';

export function register(config: any = {}) {
  console.log('[Module] Registering workforce');

  // Register Tabs for 'teams' entity
  registry.registerTab({
    id: 'team-members',
    entityTypes: ['teams'],
    label: 'Members',
    component: () => import('./components/TeamMembers'),
    order: 10,
  });

  // Register Tabs for 'roles' entity
  registry.registerTab({
    id: 'role-users',
    entityTypes: ['roles'],
    label: 'Users',
    component: () => import('./components/RoleUsers'),
    order: 10,
  });

  // Register Tabs for 'projects' or 'tasks' for timesheets if needed
  registry.registerTab({
    id: 'timesheets',
    entityTypes: ['projects', 'tasks'],
    label: 'Timesheets',
    component: () => import('./components/Timesheet'),
    order: 20,
  });


  // Register Agent Activity Report
  registry.registerTab({
    id: 'agent-activity-report',
    entityTypes: ['users'],
    label: 'Activity Report',
    component: () => import('./components/AgentActivityReport'),
    order: 30,
  });
}
