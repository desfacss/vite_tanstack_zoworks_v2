/**
 * FSM Module Manifest
 * Field Service Management module for technician dispatching and tracking
 */

export const FSM_MANIFEST = {
    id: 'fsm',
    name: 'Field Service Management',
    version: '1.0.0',

    // Dependencies on other modules
    dependencies: ['core', 'tickets'],

    // Optional dependencies
    optionalDependencies: ['workforce', 'wa'],

    // Sub-modules that can be toggled per org
    subModules: {
        tracking: {
            id: 'tracking',
            name: 'Location Tracking',
            dependencies: [],
        },
        planner: {
            id: 'planner',
            name: 'Route Planner',
            dependencies: [],
        },
        scheduler: {
            id: 'scheduler',
            name: 'Job Scheduler',
            dependencies: [],
        },
    },

    // Shared services this module uses
    services: ['geolocation', 'notifications', 'email'],

    // Entity types this module manages
    entityTypes: ['tasks', 'jobs', 'routes'],
};
