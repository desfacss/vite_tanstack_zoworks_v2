/**
 * WhatsApp Module Manifest
 * WhatsApp Business API integration module
 */
export const WA_MANIFEST = {
  id: 'wa',
  name: 'WhatsApp Business',
  version: '1.0.0',
  dependencies: ['core'],
  optionalDependencies: ['crm', 'tickets'],
  subModules: {
    inbox: {
      id: 'inbox',
      name: 'Inbox & Conversations',
      dependencies: [],
    },
    templates: {
      id: 'templates',
      name: 'Message Templates',
      dependencies: [],
    },
    campaigns: {
      id: 'campaigns',
      name: 'Broadcast Campaigns',
      dependencies: [],
    },
    flows: {
      id: 'flows',
      name: 'Automation Flows',
      dependencies: [],
    },
  },
  services: ['whatsapp', 'notifications'],
  entityTypes: ['conversations', 'messages', 'templates', 'contacts'],
};
