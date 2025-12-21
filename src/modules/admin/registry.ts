import { registry } from '@/core/registry';

export function register(config?: any) {
  console.log('[Module] Registering Admin');

  // Register Admin Dashboard Tab
  registry.registerTab({
    id: 'admin-overview',
    entityTypes: ['organization'],
    label: 'Notifications',
    component: () => import('./pages/Notifications'), // Real component
    order: 10,
  });
}

