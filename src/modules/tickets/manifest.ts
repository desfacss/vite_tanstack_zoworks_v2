/**
 * Tickets Module Manifest
 * Defines module metadata, dependencies, and sub-modules
 */

export const TICKETS_MANIFEST = {
    id: 'tickets',
    name: 'Tickets & Support',
    version: '1.0.0',

    // Dependencies on other modules
    dependencies: ['core'],

    // Optional dependencies (enhanced features if available)
    optionalDependencies: ['wa', 'fsm'],

    // Sub-modules that can be toggled per org
    subModules: {
        messages: {
            id: 'messages',
            name: 'Ticket Messages',
            dependencies: [],
        },
        logs: {
            id: 'logs',
            name: 'Activity Logs',
            dependencies: [],
        },
    },

    // Shared services this module uses
    services: ['email', 'notifications'],

    // Entity types this module manages
    entityTypes: ['tickets', 'clients', 'contacts'],
};
