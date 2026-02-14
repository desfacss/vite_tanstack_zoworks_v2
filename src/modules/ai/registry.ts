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

  // Register custom action approvals form action
  registry.registerAction({
    id: 'action_approvals_form',
    entityTypes: ['action_approvals', 'ai_mcp.action_approvals'],
    position: 'both',
    label: 'Approval Form',
    component: () => import('./components/ActionApprovalForm'),
  });

  // Register custom tenant tier configs form action
  registry.registerAction({
    id: 'tenant_tier_configs_form',
    entityTypes: ['tenant_tier_configs', 'ai_mcp.tenant_tier_configs'],
    position: 'both',
    label: 'Tier Config Form',
    component: () => import('./components/TenantTierConfigForm'),
  });

  // Register custom playbooks form action
  registry.registerAction({
    id: 'playbooks_form',
    entityTypes: ['playbooks', 'ai_mcp.playbooks'],
    position: 'both',
    label: 'Playbook Form',
    component: () => import('./components/PlaybookForm'),
  });

  console.log('[AI] ✓ Module registered');
}
