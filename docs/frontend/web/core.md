# Core Layer

> Shared infrastructure that all modules depend on.

---

## Critical Rule

> **Core MUST NEVER import from modules.**
> 
> Enforced by ESLint `no-restricted-imports` rule.

---

## Core Subsystems

```
src/core/
├── bootstrap/        # App initialization
├── registry/         # Plugin registration
├── components/       # Shared UI (99 files)
├── lib/              # Utilities
├── theme/            # Theming engine
├── hooks/            # Shared hooks
├── i18n/             # Core translations
└── types/            # Shared types
```

---

## Bootstrap (`src/core/bootstrap/`)

### TenantResolver.ts
Resolves tenant from subdomain:
```typescript
// vkbs.zoworks.com → { subdomain: 'vkbs', config: {...} }
const tenantConfig = await resolveTenant();
```

### ModuleLoader.ts
Lazy-loads enabled modules:
```typescript
const MODULE_MANIFEST = {
  tickets: () => import('@/modules/tickets'),
  workforce: () => import('@/modules/workforce'),
  // ...
};

await loadModules(enabledModules, tenantConfig);
```

---

## Registry (`src/core/registry/`)

Central plugin registration system.

### Registration Types

| Type | Method | Purpose |
|------|--------|---------|
| Module | `registerModule()` | Module metadata |
| Action | `registerAction()` | Row/global actions |
| Tab | `registerTab()` | Entity detail tabs |
| View Type | `registerViewType()` | Custom view renderers |
| Detail Component | `registerDetailComponent()` | Specialized detail views |

### Usage
```typescript
import { registry } from '@/core/registry';

// Register an action
registry.registerAction({
  id: 'create-ticket',
  entityTypes: ['tickets'],
  position: 'global',
  label: 'Create Ticket',
  component: () => import('./TicketForm'),
});

// Get registered actions
const actions = registry.getActions('tickets', 'global');
```

---

## Components (`src/core/components/`)

### DynamicViews System

| Component | Purpose |
|-----------|---------|
| `DynamicViews/index.tsx` | Main orchestrator |
| `DynamicViews/TableView.tsx` | Table rendering |
| `DynamicViews/GridView.tsx` | Card grid |
| `DynamicViews/KanbanView.tsx` | Kanban board |
| `DynamicViews/CalendarView.tsx` | Calendar |
| `DynamicViews/MapViewComponent.tsx` | Map view |
| `DynamicViews/DetailsView.tsx` | Record details |
| `DynamicViews/RowActions.tsx` | Row-level actions |
| `DynamicViews/GlobalActions.tsx` | Page-level actions |

### Layout Components

| Component | Purpose |
|-----------|---------|
| `Layout/index.tsx` | App shell |
| `Layout/Header/` | Top navigation |
| `Layout/Sider/` | Side navigation |
| `Layout/WelcomeHub/` | Landing page |
| `Layout/Settings/` | Settings UI |

### Form Components

| Component | Purpose |
|-----------|---------|
| `DynamicForm/index.tsx` | Schema-driven form |
| `DynamicForm/FormGenerator.tsx` | Field rendering |

### Detail Components

| Component | Purpose |
|-----------|---------|
| `details/DetailOverview.tsx` | Record detail view |
| `details/DocView.tsx` | Document preview |
| `details/QRCard.tsx` | QR code display |

### ActionBar Components

| Component | Purpose |
|-----------|---------|
| `ActionBar/PageActionBar.tsx` | Page header actions |
| `ActionBar/PrimaryAction.tsx` | Main action button |
| `ActionBar/ViewToggle.tsx` | View mode switcher |

---

## Lib (`src/core/lib/`)

### store.ts
Zustand stores for global state:
```typescript
import { useAuthStore, useThemeStore } from '@/core/lib/store';

const { user, organization } = useAuthStore();
const { isDarkMode } = useThemeStore();
```

### supabase.ts
Supabase client:
```typescript
import { supabase } from '@/core/lib/supabase';

const { data } = await supabase.from('tickets').select('*');
```

### types.ts
Shared TypeScript interfaces:
```typescript
import { User, Organization, Ticket } from '@/core/lib/types';
```

---

## Theme (`src/core/theme/`)

### ThemeRegistry.ts
Loads tenant theme config and sets CSS variables:
```typescript
import { loadTenantTheme, getTenantBrandName } from '@/core/theme/ThemeRegistry';

await loadTenantTheme(themeConfig);
const brandName = getTenantBrandName();
```

### ThemeProvider.tsx
Provides theme context to app.

---

## i18n (`src/core/i18n/`)

Core translations only (Save, Cancel, etc.):
```
core/i18n/
├── index.ts         # i18n setup
└── locales/
    ├── en.json      # English core labels
    └── kn.json      # Kannada core labels
```

Module-specific labels live in `modules/{name}/i18n/`.

---

## Hooks (`src/core/hooks/`)

| Hook | Purpose |
|------|---------|
| `useDocuments.ts` | Document handling |

---

## Extending Core

### Adding a Shared Component

1. Create in `src/core/components/`
2. No module imports allowed
3. Use registry for dynamic content
4. Document in this file

### Adding a Core Service

1. Create in `src/core/lib/` or `src/core/services/`
2. Export from appropriate index
3. Use across all modules

---

*Last Updated: 2025-12-25*
