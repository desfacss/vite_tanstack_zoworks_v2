# Plug-and-Play Module Architecture v2

> **Zoworks AI-Native SaaS Platform - Complete Module System Design**

## Core Principle

> **Config-Driven Development.** 90% of views/forms work via DynamicViews + config. Modules only contain *custom* components.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE (Always Loaded)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  DynamicViews     │ DynamicForms    │ DynamicQuery    │ DynamicSave         │
│  (Config-driven)  │ (Config-driven) │ (Any schema)    │ (Any schema)        │
├───────────────────┴─────────────────┴─────────────────┴─────────────────────┤
│  Registry: Actions, Tabs, Routes, Nav │ Help: HelpProvider, Tours          │
│  Theme: Tenant + User mode            │ i18n: Core labels only              │
│  Shared Services: email, whatsapp, image_upload                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MODULES (Lazy Loaded per Tenant)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  workforce/      │ tickets/       │ fsm/            │ wa/                   │
│  - i18n/         │ - i18n/        │ - i18n/         │ - i18n/               │
│  - CustomPages/  │ - CustomPages/ │ - CustomPages/  │ - CustomPages/        │
│  - CustomComps/  │ - CustomComps/ │ - CustomComps/  │ - CustomComps/        │
│  - help/         │ - help/        │ - help/         │ - help/               │
│  - registry.ts   │ - registry.ts  │ - registry.ts   │ - registry.ts         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What Lives Where?

### Core (`src/core/`)

| Item | Purpose |
|------|---------|
| `DynamicViews/` | TableView, GridView, DetailsView - config-driven |
| `DynamicForms/` | Form generator from schema/config |
| `DynamicQuery/` | Generic query builder for any schema.entity |
| `DynamicSave/` | Generic save handler for any schema.entity |
| `registry/` | Actions, Tabs, Routes, Nav registration |
| `services/` | Shared: email, whatsapp, image_upload, notifications |
| `i18n/locales/` | **ONLY** shared labels: Save, Cancel, Loading, nav |
| `theme/` | Tenant config + user mode toggle |
| `bootstrap/` | TenantResolver, ModuleLoader |

### Module (`src/modules/{module}/`)

| Item | Purpose |
|------|---------|
| `registry.ts` | Module registration (nav, routes, tabs, actions, i18n) |
| `i18n/{lang}.json` | Module-specific labels |
| `pages/` | **ONLY** custom pages (non-DynamicView) |
| `components/` | **ONLY** custom components |
| `help/` | Tours, markdown guides for this module |
| `forms/` | Custom form schemas (if beyond DynamicForm) |

### When to Use Custom vs Dynamic

| Use Case | Approach |
|----------|----------|
| `external.accounts` list | DynamicView + config ✅ |
| `external.contacts` list | DynamicView + config ✅ |
| Timesheet entry (complex UI) | Custom component in `workforce/` |
| Leave request form | DynamicForm + schema config ✅ |
| Expense with receipt upload | Custom form in `workforce/` |

---

## Module Dependencies & Sub-Modules

### Schema: `identity.org_module_configs`

```sql
CREATE TABLE identity.org_module_configs (
    id uuid,
    organization_id uuid,
    module_id uuid,              -- FK to identity.modules
    location_id uuid,            -- Location-specific config
    sub_modules jsonb DEFAULT '{}',  -- { "expenses": true, "leaves": true }
    settings jsonb DEFAULT '{}',     -- Module-specific settings
    scope_level text DEFAULT 'organization'
);
```

### Module Manifest with Dependencies

```typescript
// src/modules/workforce/manifest.ts

export const WORKFORCE_MANIFEST = {
  id: 'workforce',
  name: 'Workforce',
  version: '1.0.0',
  
  // Dependencies on other modules
  dependencies: ['core'],
  
  // Optional dependencies (enhanced features if available)
  optionalDependencies: ['scheduler', 'tickets'],
  
  // Sub-modules that can be toggled per org
  subModules: {
    leaves: {
      id: 'leaves',
      name: 'Leave Management',
      dependencies: ['scheduler'],  // For calendar integration
    },
    expenses: {
      id: 'expenses',
      name: 'Expense Sheets',
      dependencies: ['accounting'],  // For GL posting
    },
    timesheets: {
      id: 'timesheets',
      name: 'Timesheets',
      dependencies: [],
    },
  },
  
  // Shared services this module uses
  services: ['email', 'notifications'],
};
```

### Registration with Sub-Module Check

```typescript
// src/modules/workforce/registry.ts

import { WORKFORCE_MANIFEST } from './manifest';
import { registry } from '@/core/registry';
import { registerModuleTranslations } from '@/core/i18n';

export async function register(
  config: ModuleConfig,
  enabledLanguages: string[]
) {
  const subModules = config.sub_modules || {};
  
  // Always register translations
  await registerModuleTranslations('workforce', {
    en: () => import('./i18n/en.json'),
    hi: () => import('./i18n/hi.json'),
  }, enabledLanguages);

  // Conditionally register based on enabled sub-modules
  if (subModules.leaves) {
    registry.registerRoute({
      moduleId: 'workforce',
      path: '/workforce/leaves',
      component: () => import('./pages/LeavesPage'),
    });
  }
  
  if (subModules.expenses) {
    registry.registerRoute({
      moduleId: 'workforce',
      path: '/workforce/expenses',
      component: () => import('./pages/ExpensesPage'),
    });
  }
  
  // Timesheets - always included
  registry.registerTab({
    id: 'timesheets',
    entityTypes: ['projects', 'tasks'],
    label: 'workforce:tabs.timesheet',
    component: () => import('./components/Timesheet'),
  });
}
```

---

## i18n Namespace Strategy

### Core Labels (`src/core/i18n/locales/en/core.json`)

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "loading": "Loading...",
    "search": "Search..."
  },
  "nav": {
    "dashboard": "Dashboard",
    "settings": "Settings"
  },
  "dynamicView": {
    "noData": "No records found",
    "filter": "Filter",
    "export": "Export"
  }
}
```

### Module Labels (`src/modules/workforce/i18n/en.json`)

```json
{
  "nav": {
    "title": "Workforce",
    "leaves": "Leaves",
    "expenses": "Expenses"
  },
  "tabs": {
    "timesheet": "Timesheet"
  },
  "forms": {
    "leave": {
      "type": "Leave Type",
      "startDate": "Start Date",
      "reason": "Reason"
    }
  }
}
```

### Usage Pattern

```tsx
// In workforce component
const { t } = useTranslation();

// Module namespace (explicit)
t('workforce:forms.leave.type')

// Or with namespace as default
const { t } = useTranslation('workforce');
t('forms.leave.type')

// Core labels (fallback namespace)
t('common.save', { ns: 'translation' })
```

---

## Help System Design

Based on zo_waCRM implementation:

### Core Help Module (`src/core/modules/help/`)

| File | Purpose |
|------|---------|
| `HelpProvider.tsx` | Context + tour management |
| `usePageTour.ts` | Hook for page-level tours |
| `types.ts` | HelpStep, HelpTour types |

### Module-Specific Tours (`src/modules/{module}/help/`)

```typescript
// src/modules/workforce/help/tours.ts

export const timesheetTour: HelpTour = {
  id: 'timesheet-guide',
  name: 'Timesheet Guide',
  steps: [
    { target: '#timesheet-date', content: 'Select the date...' },
    { target: '#timesheet-hours', content: 'Enter hours worked...' },
  ],
};
```

### Backend Integration (Future)

```sql
-- projdoc.help_content or similar
CREATE TABLE projdoc.help_content (
    id uuid,
    module_id text,
    content_key text,        -- 'workforce.timesheet.guide'
    content_markdown text,   -- Dynamic content
    language text DEFAULT 'en',
    version integer DEFAULT 1
);
```

---

## Shared Services (`src/core/services/`)

| Service | Location | Used By |
|---------|----------|---------|
| `email.ts` | core/services | tickets, workforce, crm |
| `whatsapp.ts` | core/services | wa, crm, tickets |
| `imageUpload.ts` | core/services | all modules |
| `notifications.ts` | core/services | all modules |
| `export.ts` | core/services | DynamicViews |

---

## Module Settings UI

Settings pages should be in `admin` module or module-specific:

| Setting | Location |
|---------|----------|
| Organization settings | `admin/pages/OrgSettings` |
| Module config (per-org) | `admin/pages/ModuleConfig` |
| Module-specific settings | `{module}/pages/Settings` |

---

## Implementation Priority

1. **Extract module labels** from core i18n → module i18n folders
2. **Add module manifests** with dependency declarations
3. **Update ModuleLoader** to pass sub_modules config
4. **Move custom components only** to modules (DynamicView stays in core)
5. **Implement help tours** per module

---

## Validation: Remove Module Test

**Delete `src/modules/workforce/`:**

| Check | Expected |
|-------|----------|
| Build | ✅ Passes |
| Navigation | ✅ No workforce items |
| i18n | ✅ No orphan labels |
| Help tours | ✅ Tours not registered |
| DynamicViews | ✅ Still works for other modules |

---

## Related Documents

- [verification-checklist.md](./verification-checklist.md) - Track implementation progress
- [ai-agentic-development.md](./ai-agentic-development.md) - AI-first development workflow
