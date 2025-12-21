import { registry } from '@/core/registry';

export function register(config?: any) {
  console.log('[Module] Registering core');

  registry.registerTab({
    id: 'task-report-page',
    entityTypes: ['files', 'documents'], // Adjust entity types as needed
    label: 'Report',
    component: () => import('@/components/common/doc/TaskReportPage'),
    order: 10,
  });
}

