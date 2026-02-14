/**
 * AI Module Registry
 * Registers custom forms and components for the AI module.
 */

import { registry } from '@/core/registry';

export async function register() {
  console.log('[AI] Registering module');

  // Register custom agent form action
  // This connects the 'agents_form' reference in view_configs to our custom component
  registry.registerAction({
    id: 'agents_form',
    entityTypes: ['agents', 'ai_mcp.agents'],
    position: 'both', // Available for both row actions and global actions
    label: 'Agent Form',
    component: () => import('./components/AgentFormModal'),
  });

  console.log('[AI] ✓ Module registered');
}
