# Domain Modules

> How domain modules are organized and how to add new ones.

---

## Module Philosophy

- **Core is a shell** — provides infrastructure, zero domain logic
- **Modules are plugins** — register capabilities via registry
- **Config-driven** — 90% of views use DynamicViews + config
- **Lazy-loaded** — only enabled modules are fetched

---

## Current Modules (15)

| Module | Description | Key Entities |
|--------|-------------|--------------|
| `admin` | Organization settings | Users, Roles, Settings |
| `tickets` | Ticket management | Tickets, Status, Logs |
| `workforce` | HR management | Leaves, Expenses, Timesheets |
| `crm` | Customer relationships | Contacts, Accounts, Deals |
| `fsm` | Field service | Work Orders, Dispatch, Routes |
| `wa` | WhatsApp automation | Inbox, Templates, Campaigns |
| `catalog` | Product catalog | Products, Categories, Pricing |
| `contracts` | Contract management | Contracts, Terms |
| `erp` | Enterprise planning | Resources, Planning |
| `esm` | Enterprise service | IT Services, Requests |
| `pos` | Point of sale | Orders, Transactions |
| `wms` | Warehouse | Inventory, Locations |
| `external` | External parties | Contacts, Accounts |
| `landing` | Public pages | Home, About |
| `core` | Core module wrapper | N/A |

---

## Module Structure

```
src/modules/{module}/
├── index.ts              # Entry (exports register function)
├── registry.ts           # Register routes, tabs, actions
├── manifest.ts           # Module metadata
├── i18n/
│   ├── en.json           # English translations
│   └── kn.json           # Kannada translations
├── help/
│   └── tours.ts          # Help tours
├── pages/                # Custom pages (non-DynamicView)
│   └── CustomPage.tsx
└── components/           # Module-specific components
    └── CustomWidget.tsx
```

---

## Registration Pattern

### Module Manifest
```typescript
// src/modules/tickets/manifest.ts
export const TICKETS_MANIFEST = {
  id: 'tickets',
  name: 'Ticket Management',
  version: '1.0.0',
  dependencies: ['core'],
  optionalDependencies: ['wa'],
  subModules: {
    status: { id: 'status', name: 'Status Tracking' },
    logs: { id: 'logs', name: 'Activity Logs' },
  },
};
```

### Registry Functions
```typescript
// src/modules/tickets/registry.ts
import { registry } from '@/core/registry';

export async function register(config, enabledLanguages) {
  // Register routes
  registry.registerRoute({
    moduleId: 'tickets',
    path: '/tickets',
    component: () => import('./pages/TicketsPage'),
  });

  // Register tabs for entity details
  registry.registerTab({
    id: 'ticket-status',
    entityTypes: ['tickets'],
    label: 'Status',
    component: () => import('./components/StatusTab'),
  });

  // Register actions
  registry.registerAction({
    id: 'create-ticket',
    entityTypes: ['tickets'],
    position: 'global',
    label: 'Create Ticket',
    component: () => import('./components/TicketForm'),
  });
}
```

---

## Adding a New Module

### Step 1: Create Folder Structure
```bash
mkdir -p src/modules/newmodule/{pages,components,i18n,help}
touch src/modules/newmodule/{index.ts,registry.ts,manifest.ts}
touch src/modules/newmodule/i18n/{en,kn}.json
```

### Step 2: Create Manifest
```typescript
// src/modules/newmodule/manifest.ts
export const NEWMODULE_MANIFEST = {
  id: 'newmodule',
  name: 'New Module',
  version: '1.0.0',
  dependencies: ['core'],
};
```

### Step 3: Create Registry
```typescript
// src/modules/newmodule/registry.ts
import { registry } from '@/core/registry';

export async function register(config, languages) {
  // Register capabilities
}
```

### Step 4: Create Entry
```typescript
// src/modules/newmodule/index.ts
export { register } from './registry';
export { NEWMODULE_MANIFEST } from './manifest';
```

### Step 5: Add to ModuleLoader
```typescript
// src/core/bootstrap/ModuleLoader.ts
// Add to MODULE_MANIFEST
newmodule: () => import('@/modules/newmodule'),
```

### Step 6: Add i18n
```json
// src/modules/newmodule/i18n/en.json
{
  "nav": {
    "title": "New Module"
  }
}
```

---

## Merging Sub-Projects

When merging standalone projects (WhatsApp, Automation, etc.):

1. **Create module folder** under `src/modules/`
2. **Move components** to `modules/{name}/components/`
3. **Move pages** to `modules/{name}/pages/`
4. **Extract i18n** to `modules/{name}/i18n/`
5. **Create registry.ts** to register routes/tabs/actions
6. **Update DynamicViews configs** if using config-driven views
7. **Test isolation** — delete module folder, build should pass

---

## Module Dependencies

```
                    ┌─────────────┐
                    │    core     │
                    │ (registry,  │
                    │  components)│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐       ┌────┴────┐       ┌────┴────┐
   │ tickets │       │ workforce│       │   crm   │
   └────┬────┘       └────┬────┘       └─────────┘
        │                  │
        └──────┬───────────┘
               │
         ┌─────┴─────┐
         │    wa     │ (optional dep)
         └───────────┘
```

---

*Last Updated: 2025-12-25*
