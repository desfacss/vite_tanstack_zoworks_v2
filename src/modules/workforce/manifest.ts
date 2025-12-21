/**
 * Workforce Module Manifest
 * Declares dependencies, sub-modules, and services used by this module.
 */

export const WORKFORCE_MANIFEST = {
    id: 'workforce',
    name: 'Workforce',
    version: '1.0.0',

    // Required dependencies
    dependencies: ['core'],

    // Optional dependencies (enhanced features if available)
    optionalDependencies: ['scheduler', 'tickets'],

    // Sub-modules that can be toggled per organization
    subModules: {
        leaves: {
            id: 'leaves',
            name: 'Leave Management',
            dependencies: ['scheduler'],
        },
        expenses: {
            id: 'expenses',
            name: 'Expense Sheets',
            dependencies: ['accounting'],
        },
        timesheets: {
            id: 'timesheets',
            name: 'Timesheets',
            dependencies: [],
        },
    },

    // Shared services this module uses
    services: ['email', 'notifications'],

    // Available translations
    languages: ['en', 'hi', 'ta'],
};

export type WorkforceManifest = typeof WORKFORCE_MANIFEST;
