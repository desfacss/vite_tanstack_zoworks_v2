import { registry } from '@/core/registry';
import { manifest } from './manifest';

export function register() {
  registry.registerModule(manifest);

  // Register the parent Migration menu item
  registry.registerNavItem({
    key: 'migration-root',
    label: 'Migration',
    path: '/migration',
    icon: 'git-branch',
  });

  const subItems = [
    {
      key: 'migration-data',
      label: 'Data Explorer',
      path: '/migration/data',
      icon: 'database',
      parentId: 'migration-root'
    },
    {
        key: 'migration-geofence',
        label: 'Geofence Map',
        path: '/migration/geofence',
        icon: 'map-pin',
        parentId: 'migration-root'
    },
    {
        key: 'migration-tickets',
        label: 'My Tickets (Legacy)',
        path: '/migration/tickets',
        icon: 'list',
        parentId: 'migration-root'
    },
    {
        key: 'migration-workflows',
        label: 'Workflows',
        path: '/migration/workflows',
        icon: 'git-branch',
        parentId: 'migration-root'
    },
    {
        key: 'migration-nlp',
        label: 'NLP Dashboard',
        path: '/migration/nlp',
        icon: 'bot',
        parentId: 'migration-root'
    },
    {
        key: 'migration-ai',
        label: 'AI Query',
        path: '/migration/ai',
        icon: 'bot',
        parentId: 'migration-root'
    },
    {
        key: 'migration-activities',
        label: 'Activities',
        path: '/migration/activities',
        icon: 'activity',
        parentId: 'migration-root'
    },
    {
        key: 'migration-teams',
        label: 'Teams',
        path: '/migration/teams',
        icon: 'users',
        parentId: 'migration-root'
    },
    {
        key: 'migration-tracking',
        label: 'Agent Tracking',
        path: '/migration/tracking',
        icon: 'map-pin',
        parentId: 'migration-root'
    }
  ];

  subItems.forEach(item => registry.registerNavItem(item));
}
