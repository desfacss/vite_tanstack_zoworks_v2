/**
 * CRM Module Manifest
 * Customer Relationship Management module
 */

export const CRM_MANIFEST = {
    id: 'crm',
    name: 'Customer Relationship Management',
    version: '1.0.0',

    // Dependencies on other modules
    dependencies: ['core'],

    // Optional dependencies
    optionalDependencies: ['wa', 'tickets'],

    // Sub-modules that can be toggled per org
    subModules: {
        leads: {
            id: 'leads',
            name: 'Lead Management',
            dependencies: [],
        },
        deals: {
            id: 'deals',
            name: 'Deal Pipeline',
            dependencies: [],
        },
        campaigns: {
            id: 'campaigns',
            name: 'Marketing Campaigns',
            dependencies: ['wa'],
        },
    },

    // Shared services this module uses
    services: ['email', 'whatsapp', 'notifications'],

    // Entity types this module manages
    entityTypes: ['leads', 'deals', 'campaigns', 'contacts'],
};
