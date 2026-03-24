// src/modules/archive/registry.ts

import { registry } from '@/core/registry';

export async function register(config: any = {}, enabledLanguages: string[] = ['en']) {
  console.log('[Archive] Registering module');

  // Register Routes
  registry.registerRoute({
    path: '/archive/processes',
    component: () => import('./pages/ProcessEditor'),
    label: 'Process Editor',
  });

  registry.registerRoute({
    path: '/archive/networking',
    component: () => import('./pages/Networking'),
    label: 'Networking',
  });

  registry.registerRoute({
    path: '/archive/project-plan',
    component: () => import('./pages/ProjectPlanPage'),
    label: 'Project Plan',
  });

  registry.registerRoute({
    path: '/archive/scheduler',
    component: () => import('./pages/SchedulerPage'),
    label: 'Scheduler',
  });

  // Register Sidebar Entries
  registry.registerNavItem({
    key: 'archive',
    label: 'Archive',
    path: '/archive/processes',
    icon: 'process',
  });

  registry.registerNavItem({
    key: 'archive-processes',
    label: 'Process Editor',
    path: '/archive/processes',
    parentId: 'archive',
    icon: 'process-blueprints',
  });

  registry.registerNavItem({
    key: 'archive-networking',
    label: 'Networking',
    path: '/archive/networking',
    parentId: 'archive',
    icon: 'users',
  });

  registry.registerNavItem({
    key: 'archive-project-plan',
    label: 'Project Plan',
    path: '/archive/project-plan',
    parentId: 'archive',
    icon: 'projects',
  });

  registry.registerNavItem({
    key: 'archive-scheduler',
    label: 'Scheduler',
    path: '/archive/scheduler',
    parentId: 'archive',
    icon: 'calendar',
  });

  // Register Sidebar Entry (if not using dynamic menuConfig.json)
  // In V2, we typically update menuConfig.json via scripts, 
  // but we can also register it here if the sidebar component supports it.

  console.log('[Archive] ✓ Module registered');
}
