
import { registry } from '@/core/registry';

export function register(config: any = {}) {
  console.log('[Module] Registering FSM');

  // Register Planner as a tab for certain entities if needed
  registry.registerTab({
    id: 'fsm-planner',
    entityTypes: ['projects', 'teams'],
    label: 'Planner',
    component: () => import('./components/Planner'),
    order: 30,
  });
}
