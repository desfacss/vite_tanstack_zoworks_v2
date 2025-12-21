/**
 * Admin Module Manifest
 * System administration and configuration module
 */

export const ADMIN_MANIFEST = {
    id: 'admin',
    name: 'Administration',
    version: '1.0.0',

    // Always required - no dependencies
    dependencies: ['core'],

    // Optional dependencies
    optionalDependencies: [],

    // Sub-modules that can be toggled per org
    subModules: {
        users: {
            id: 'users',
            name: 'User Management',
            dependencies: [],
        },
        roles: {
            id: 'roles',
            name: 'Role & Permissions',
            dependencies: [],
        },
        settings: {
            id: 'settings',
            name: 'Organization Settings',
            dependencies: [],
        },
        modules: {
            id: 'modules',
            name: 'Module Configuration',
            dependencies: [],
        },
    },

    // Shared services this module uses
    services: ['email'],

    // Entity types this module manages
    entityTypes: ['users', 'roles', 'teams', 'locations', 'organizations'],
};
