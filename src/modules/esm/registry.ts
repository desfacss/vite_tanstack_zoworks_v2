/**
 * Tickets Module Registry
 * Registers tabs, routes, actions, and translations for the tickets module.
 */

import { registry } from '@/core/registry';
import { registerModuleTranslations } from '@/core/i18n';

export interface ESMModuleConfig {
  features?: {
    messages?: boolean;
    logs?: boolean;
  };
}

export async function register(
  config: ESMModuleConfig = {},
  enabledLanguages: string[] = ['en']
) {
  console.log('[ESM] Registering module');

  // 1. Register translations FIRST
  await registerModuleTranslations('esm', {
    en: () => import('./i18n/en.json'),
    // hi: () => import('./i18n/hi.json'),
  }, enabledLanguages);

  // 2. Core Ticket Summary is always available
  registry.registerTab({
    id: 'ticket-summary',
    entityTypes: ['tickets', 'esm.tickets'],
    label: 'tickets:tabs.summary',
    component: () => import('./components/TicketSummary'),
    order: 5,
  });

  // 3. Conditional Registration based on tenant config
  if (config.features?.messages !== false) {
    registry.registerTab({
      id: 'ticket-messages',
      entityTypes: ['tickets', 'esm.tickets'],
      label: 'Messages',  // Could be tickets:tabs.messages
      component: () => import('./components/Messages'),
      order: 10,
    });
  }

  if (config.features?.logs !== false) {
    registry.registerTab({
      id: 'ticket-logs',
      entityTypes: ['tickets', 'esm.tickets'],
      label: 'Logs',
      component: () => import('./components/LogViewer'),
      order: 15,
    });
  }

  // 4. Register Client Details
  registry.registerTab({
    id: 'client-details',
    entityTypes: ['clients', 'crm.accounts', 'esm.accounts'],
    label: 'Details',
    component: () => import('./components/ClientDetails'),
    order: 1,
  });

  // 5. Register ESM Tickets Action (Overrides DynamicForm)
  registry.registerAction({
    id: 'esm_tickets_min', // Matches DB view_config
    entityTypes: ['tickets', 'esm.tickets', 'esm_tickets'],
    position: 'both',
    label: 'Ticket Editor',
    component: () => import('./components/TicketNew'),
  });

  // 7. Register StatusTab for tickets (previously a static tab in DetailsView)
  registry.registerTab({
    id: 'status',
    entityTypes: ['tickets', 'esm.tickets'],
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

  console.log('[ESM] ✓ Module registered');
}
