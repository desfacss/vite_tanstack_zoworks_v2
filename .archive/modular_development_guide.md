# Modular Architecture: Developer Guide

**Document Version:** 1.1  
**Status:** Implementation Active  
**Role:** Principal Architect's Handbook

---

## 1. Executive Summary

The Zoworks V2 architecture is a **Multi-Tenant Plugin System**. It is designed to run a single codebase that morphs into different products (CRM, FSM, ERP, etc.) based on tenant configuration stored in the `identity` schema.

### Core Principles
- **Core is a Shell**: The core framework provides "slots" (Tabs, Actions, Routes) but contains zero domain logic.
- **Lazy Discovery**: Modules register their capabilities only if enabled for the current tenant.
- **Backend-Driven**: Feature flags in Supabase JSONB columns (`module_config`) directly control what UI components are registered.
- **Single Source of Truth**: `identity.organizations` is the master anchor for both identity and configuration.

---

## 2. The Tenant Bootstrap Flow

When a user hits `{tenant}.zoworks.com`:

1.  **Resolution**: `TenantResolver.ts` fetches the "Hydrated" config from the `identity.v_organizations` view.
2.  **Inheritance**: The view automatically merges tenant-specific overrides with system-wide defaults (from `org_module_configs` where `organization_id IS NULL`).
3.  **Theming**: `TenantProvider.tsx` calls `loadTheme()` to apply branding, mode (light/dark), and document title.
4.  **Loading**: `ModuleLoader.ts` pulls only the `enabled_modules` and passes the `module_config` to each.
5.  **Handshake**: Each module's `register(config)` function is called with its specific configuration block.

---

## 3. Module Anatomy

Every module in `src/modules/` must follow this structure:

```text
src/modules/[module-name]/
├── index.ts                # Public entry (re-exports register)
├── registry.ts             # Capability registration logic
├── components/             # Reusable domain components
├── hooks/                  # Domain-specific state/logic
├── pages/                  # Top-level page components
└── lib/                    # Domain utilities/types
```

---

## 4. Capability Registration

Modules fill the UI by calling `registry` functions. Capabilities can be categorized by **Groups**.

### 4.1 Tabs (Entity Details)
Used in `DetailsView`.

```typescript
// src/modules/tickets/registry.ts
registry.registerTab({
  id: 'ticket-summary',
  entityTypes: ['tickets'],
  label: 'Summary',
  component: () => import('./components/TicketSummary'),
  group: 'details', // Grouping for layout categorization
  order: 5,         // Sorting order
  condition: (data) => data.status !== 'closed' // Optional logic
});
```

### 4.2 Actions (Global & Row)
Used in `GlobalActions` and `RowActions`.

```typescript
registry.registerAction({
  id: 'new-ticket',
  entityTypes: ['tickets'],
  position: 'global', // 'global', 'row', or 'both'
  label: 'Create Ticket',
  component: () => import('./components/TicketForm'),
  group: 'primary',   // Controls button styling (primary, danger, etc.)
});
```

---

## 5. Backend-Frontend Cohesion

The `config` object passed to `register(config)` is your bridge to the Supabase Identity settings.

**Supabase JSONB (`identity.org_module_configs.settings`):**
```json
{
  "features": { "messages": true, "logs": false }
}
```

**Frontend Code:**
```typescript
export function register(config: any) {
  if (config.features?.messages) {
    // Message tab will only exist if enabled in database
    registry.registerTab({ ... });
  }
}
```

---

## 6. Checklist: Creating a New Feature

1.  [ ] **Select/Create Module**: Determine if the feature fits an existing module or needs a new folder in `src/modules/`.
2.  [ ] **Build Component**: Create the `.tsx` file in `components/`. Ensure it uses **Absolute Paths** (`@/lib/...`) for core dependencies.
3.  [ ] **Define Config**: Decide which feature flags in it should control this feature.
4.  [ ] **Register**: Update `registry.ts` within the module to import and register the component.
5.  [ ] **Bootstrap**: Ensure the module ID is in `src/core/bootstrap/ModuleLoader.ts` manifest.
6.  [ ] **Enable**: Ensure the module is in `module_features` and configured in `identity.org_module_configs`.

---

## 7. UI Slotted Components

### DetailsView Slots
The `DetailsView` component renders tabs based on the `entityType`. It automatically sorts by the `order` property provided during registration.

### RowActions Slots
The `RowActions` component renders registered actions. It supports custom logic via the `condition` callback, which receives the current row `record`.
