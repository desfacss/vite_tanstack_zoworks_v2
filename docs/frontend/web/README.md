# Web App Overview

> React Web Application built with Vite for multi-tenant SaaS.

---

## Project Structure

```
src/
├── main.tsx              # Bootstrap entry
├── App.tsx               # Root component with providers
├── index.css             # Global styles + theme variables
├── sw.ts                 # Service worker (PWA)
│
├── core/                 # Shared infrastructure (NEVER imports from modules)
│   ├── bootstrap/        # Tenant resolution, module loading
│   ├── registry/         # Plugin registration (actions, tabs, views)
│   ├── components/       # Shared UI components
│   ├── lib/              # Utilities (store, supabase, types)
│   ├── theme/            # Theme engine
│   ├── hooks/            # Shared hooks
│   └── i18n/             # Core translations only
│
├── modules/              # Domain modules (can import from core)
│   ├── admin/            # Organization settings
│   ├── tickets/          # Ticket management
│   ├── workforce/        # HRMS (leaves, expenses, timesheets)
│   ├── crm/              # Customer relationship
│   ├── fsm/              # Field service
│   ├── wa/               # WhatsApp integration
│   ├── catalog/          # Product catalog
│   ├── contracts/        # Contract management
│   ├── erp/              # Enterprise planning
│   ├── esm/              # Enterprise service
│   ├── pos/              # Point of sale
│   ├── wms/              # Warehouse management
│   ├── external/         # External contacts/accounts
│   └── landing/          # Public pages
│
├── pages/                # Top-level page components
├── routes/               # Route definitions
├── schemas/              # View/form configurations
├── config/               # App configuration
└── i18n/                 # Root i18n setup
```

---

## Core Layer (`src/core/`)

The core layer is **self-contained** and must NEVER import from modules.

### Subsystems

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `bootstrap/` | App initialization | `TenantResolver.ts`, `ModuleLoader.ts` |
| `registry/` | Plugin registration | `index.ts`, `types.ts` |
| `components/` | Shared UI | `DynamicViews/`, `Layout/`, `ActionBar/` |
| `lib/` | Utilities | `store.ts`, `supabase.ts`, `types.ts` |
| `theme/` | Theming | `ThemeRegistry.ts`, `ThemeProvider.tsx` |
| `hooks/` | Shared hooks | `useDocuments.ts` |
| `i18n/` | Core labels | `locales/en.json`, `locales/kn.json` |

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DynamicViews` | `core/components/DynamicViews/` | Config-driven table/grid/details |
| `DynamicForm` | `core/components/DynamicForm/` | Schema-driven forms |
| `Layout` | `core/components/Layout/` | App shell (Header, Sider) |
| `ActionBar` | `core/components/ActionBar/` | Page-level actions |
| `DetailOverview` | `core/components/details/` | Record detail view |

---

## Module Layer (`src/modules/`)

Each module follows a standard structure:

```
modules/{module}/
├── index.ts          # Entry point (exports register)
├── registry.ts       # Capability registration
├── manifest.ts       # Module metadata + dependencies
├── i18n/             # Module-specific translations
│   ├── en.json
│   └── kn.json
├── help/             # Tour guides
├── pages/            # Custom page components (non-DynamicView)
└── components/       # Module-specific components
```

### Current Modules

| Module | Key | Pages | Status |
|--------|-----|-------|--------|
| admin | `admin` | Settings, UserManagement | ✅ |
| tickets | `tickets` | TicketsPage, StatusTab | ✅ |
| workforce | `workforce` | Leaves, Expenses, Timesheets | ✅ |
| crm | `crm` | Contacts, Accounts | ✅ |
| fsm | `fsm` | Work Orders, Dispatch | 🟡 |
| wa | `wa` | WhatsApp Inbox, Templates | 🟡 |
| catalog | `catalog` | Products, Categories | 🟡 |
| contracts | `contracts` | Contracts | 🟡 |
| erp | `erp` | Planning | 🟡 |
| esm | `esm` | Service Requests | 🟡 |
| pos | `pos` | Sales Terminal | 🟡 |
| wms | `wms` | Inventory | 🟡 |
| external | `external` | External Contacts | ✅ |
| landing | `landing` | Public Pages | 🟡 |
| core | `core` | Core Module Wrapper | ✅ |

---

## State Management

### Zustand Store (`src/core/lib/store.ts`)

| Slice | Purpose |
|-------|---------|
| `useAuthStore` | User, org, location, permissions, session |
| `useThemeStore` | Dark mode, theme config |
| `useViewStore` | View preferences |

### React Query

- All data fetching via React Query
- Configured in `App.tsx` with `QueryClientProvider`
- Supabase client in `src/core/lib/supabase.ts`

---

## Routing

### Structure (`src/routes/index.tsx`)

```tsx
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<Login />} />
  
  {/* Protected routes (require auth) */}
  <Route element={<ProtectedLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/:module/:page" element={<DynamicPage />} />
  </Route>
</Routes>
```

### Lazy Loading

All page components use `React.lazy()`:
```tsx
const TicketsPage = lazy(() => import('@/modules/tickets/pages/TicketsPage'));
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/main.tsx` | React DOM render, providers |
| `src/App.tsx` | Query client, auth guard, router |
| `src/core/bootstrap/TenantResolver.ts` | Subdomain → tenant config |
| `src/core/bootstrap/ModuleLoader.ts` | Lazy module loading |
| `src/core/registry/index.ts` | Central registry |
| `src/core/lib/store.ts` | Zustand stores |
| `src/core/lib/supabase.ts` | Supabase client |
| `vite.config.ts` | Build configuration |

---

*Last Updated: 2025-12-25*
