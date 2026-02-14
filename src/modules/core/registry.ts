import { registry } from '@/core/registry';

export function register() {
  console.log('[Module] Registering core');

  registry.registerAction({
    id: 'entity_blueprints_form',
    entityTypes: ['entity_blueprints', 'core.entity_blueprints'],
    position: 'both',
    label: 'Blueprint Form',
    component: () => import('./components/EntityBlueprintForm'),
  });

  registry.registerTab({
    id: 'task-report-page',
    entityTypes: ['files', 'documents'], // Adjust entity types as needed
    label: 'Report',
    component: () => import('@/core/components/common/doc/TaskReportPage'),
    order: 10,
  });
}

