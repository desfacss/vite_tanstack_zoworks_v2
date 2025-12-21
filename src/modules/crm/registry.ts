import { registry } from '@/core/registry';

export function register(config?: any) {
  console.log('[Module] Registering CRM');

  // Register Global Actions
  registry.registerAction({
    id: 'new-lead',
    entityTypes: ['leads'],
    position: 'global',
    label: 'New Lead',
    component: () => import('./pages/Contacts'), // Placeholder until LeadList is created
  });
}

