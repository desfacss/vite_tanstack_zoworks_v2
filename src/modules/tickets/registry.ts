
import { registry } from '@/core/registry';

/**
 * Register function for the Tickets module.
 * @param config Module-specific configuration for the tenant.
 * Example config: { "features": { "messages": true, "logs": true } }
 */
export function register(config: any = {}) {
  console.log('[Module] Registering tickets with config:', config);

  // Core Ticket Summary is always available
  registry.registerTab({
    id: 'ticket-summary',
    entityTypes: ['tickets'],
    label: 'Summary',
    component: () => import('./components/TicketSummary'),
    order: 5,
  });

  // Conditional Registration based on tenant config
  if (config.features?.messages !== false) {
    registry.registerTab({
      id: 'ticket-messages',
      entityTypes: ['tickets'],
      label: 'Messages',
      component: () => import('./components/Messages'),
      order: 10,
    });
  }

  if (config.features?.logs !== false) {
    registry.registerTab({
      id: 'ticket-logs',
      entityTypes: ['tickets'],
      label: 'Logs',
      component: () => import('./components/LogViewer'),
      order: 15,
    });
  }

  // Register Client Details
  registry.registerTab({
    id: 'client-details',
    entityTypes: ['clients'],
    label: 'Details',
    component: () => import('./components/ClientDetails'),
    order: 1,
  });


  // Register Global Action
  registry.registerAction({
    id: 'new-ticket',
    entityTypes: ['tickets'],
    position: 'global',
    label: 'New Ticket',
    component: () => import('./components/TicketNew'),
  });

  // Register Row Action
  registry.registerAction({
    id: 'edit-ticket',
    entityTypes: ['tickets'],
    position: 'row',
    label: 'Edit',
    component: () => import('./components/TicketEdit'),
  });
}
