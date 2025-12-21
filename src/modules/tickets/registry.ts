/**
 * Tickets Module Registry
 * Registers tabs, routes, actions, and translations for the tickets module.
 */

import { registry } from '@/core/registry';
import { registerModuleTranslations } from '@/core/i18n';

export interface TicketsModuleConfig {
  features?: {
    messages?: boolean;
    logs?: boolean;
  };
}

export async function register(
  config: TicketsModuleConfig = {},
  enabledLanguages: string[] = ['en']
) {
  console.log('[Tickets] Registering module');

  // 1. Register translations FIRST
  await registerModuleTranslations('tickets', {
    en: () => import('./i18n/en.json'),
    // hi: () => import('./i18n/hi.json'),
  }, enabledLanguages);

  // 2. Core Ticket Summary is always available
  registry.registerTab({
    id: 'ticket-summary',
    entityTypes: ['tickets'],
    label: 'tickets:tabs.summary',
    component: () => import('./components/TicketSummary'),
    order: 5,
  });

  // 3. Conditional Registration based on tenant config
  if (config.features?.messages !== false) {
    registry.registerTab({
      id: 'ticket-messages',
      entityTypes: ['tickets'],
      label: 'Messages',  // Could be tickets:tabs.messages
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

  // 4. Register Client Details
  registry.registerTab({
    id: 'client-details',
    entityTypes: ['clients'],
    label: 'Details',
    component: () => import('./components/ClientDetails'),
    order: 1,
  });

  // 5. Register Global Action
  registry.registerAction({
    id: 'new-ticket',
    entityTypes: ['tickets'],
    position: 'global',
    label: 'New Ticket',
    component: () => import('./components/TicketNew'),
  });

  // 6. Register Row Action
  registry.registerAction({
    id: 'edit-ticket',
    entityTypes: ['tickets'],
    position: 'row',
    label: 'Edit',
    component: () => import('./components/TicketEdit'),
  });

  // 7. Register StatusTab for tickets (previously a static tab in DetailsView)
  registry.registerTab({
    id: 'status',
    entityTypes: ['tickets'],
    label: 'Status',
    component: () => import('./components/StatusTab'),
    order: 2,
  });

  // 8. Register Logs as a general static tab (replaces the static import in DetailsView)
  // Note: This is a broader entity type list as Logs can apply to many entities
  registry.registerTab({
    id: 'logs-generic',
    entityTypes: ['tickets', 'tasks', 'projects'],
    label: 'Logs',
    component: () => import('./components/Logs'),
    order: 50,
  });

  console.log('[Tickets] ✓ Module registered');
}
