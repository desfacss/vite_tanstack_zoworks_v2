# Cohesive Restructuring Implementation Stages

**Document Version:** 2.0  
**Created:** 2025-12-21  
**Status:** 🟡 Active Implementation  
**Based On:** 
- `restructure.md` - Architecture transition from monolithic to modular
- `core_refactoring.md` - AI-native multi-tenant SaaS architecture
- `implementation_plan.md` - Original stage breakdown

---

## Executive Summary

This document consolidates the restructuring exercise into **actionable implementation stages** with clear deliverables. We're transitioning from a monolithic codebase with tight coupling to a **modular, tenant-aware, lazy-loading architecture**.

### Key Goals

| Goal | Description | Metric |
|------|-------------|--------|
| **Core Independence** | Core scaffolding has ZERO domain imports | Build succeeds with only `src/core/` |
| **Module Isolation** | Each module is self-contained | Module can be removed without breaking core |
| **Tenant-Aware Loading** | Only load what tenant needs | Bundle analysis shows per-tenant chunks |
| **Backward Compatibility** | Existing functionality preserved | All tests pass during migration |
| **Placeholder Strategy** | Future modules have structure ready | Empty modules can be activated later |

---

## Current State → Target State

### Current Problems (from restructure.md)

```
DynamicViews/GlobalActions.tsx
├── ../common/details/InviteUserModal  ⚠️ Domain-specific
├── ../utils/locationTracker           ⚠️ FSM-specific
├── ../common/details/Planner          ⚠️ FSM-specific
└── ../pages/Clients/TicketNew         ⚠️ Tickets-specific
```

### Target Architecture (from core_refactoring.md)

```
src/
├── core/                          # ZERO domain imports
│   ├── bootstrap/                 # Tenant resolution, module loading
│   ├── components/                # DynamicViews, DynamicForm, Layout
│   ├── registry/                  # Central action/tab/module registry
│   ├── theme/                     # Per-tenant theme loading
│   └── i18n/                      # Per-tenant language loading
│
└── modules/                       # Self-contained domain modules
    ├── tickets/                   # Registers its own actions/tabs
    ├── workforce/                 # Registers its own actions/tabs
    ├── fsm/                       # Registers its own actions/tabs
    └── ...                        # Other modules
```

---

## Implementation Stages

### Stage 0: Preparation & Validation (IMMEDIATE)

**Duration:** 30 minutes  
**Risk:** Low  
**Objective:** Validate current build and set up documentation structure

#### Tasks

- [ ] **0.1** Validate current build: `yarn build`
- [ ] **0.2** Create git branch: `git checkout -b refactor/modular-architecture`
- [ ] **0.3** Create `docs/restructure-changelog.md` for tracking changes
- [ ] **0.4** Document all problematic imports in DynamicViews components

#### Validation

```bash
yarn build  # Must succeed
yarn dev    # Must work
```

#### Deliverables
- Clean build confirmation
- Git branch created
- Changelog file created

---

### Stage 1: Create Registry Infrastructure (NON-BREAKING)

**Duration:** 2-3 hours  
**Risk:** Low  
**Objective:** Create registry system without modifying existing code

#### Tasks

- [ ] **1.1** Create `src/core/registry/` directory
- [ ] **1.2** Create `src/core/registry/types.ts` - All interface definitions
- [ ] **1.3** Create `src/core/registry/index.ts` - AppRegistry class
- [ ] **1.4** Create `src/core/registry/actionRegistry.ts` - Action helpers
- [ ] **1.5** Create `src/core/registry/tabRegistry.ts` - Tab helpers
- [ ] **1.6** Create `src/core/registry/viewRegistry.ts` - View type helpers
- [ ] **1.7** Create `src/core/registry/moduleRegistry.ts` - Module loader
- [ ] **1.8** Update `tsconfig.json` with `@/core/*` path alias

#### Files to Create

```
src/core/
└── registry/
    ├── types.ts           # ModuleDefinition, ActionDefinition, TabDefinition
    ├── index.ts           # AppRegistry singleton
    ├── actionRegistry.ts  # getActionsForEntity, registerAction
    ├── tabRegistry.ts     # getTabsForEntity, registerTab
    ├── viewRegistry.ts    # getViewType, registerViewType
    └── moduleRegistry.ts  # loadModules, MODULE_MANIFEST
```

#### Validation

```bash
yarn build  # Must still succeed (no imports from registry yet)
```

#### Deliverables
- Complete registry infrastructure
- Registry can be imported but is not used yet

---

### Stage 2: Create Core Folder Structure

**Duration:** 1 hour  
**Risk:** Low  
**Objective:** Create all core directories without moving files

#### Tasks

- [ ] **2.1** Create `src/core/bootstrap/` directory
- [ ] **2.2** Create `src/core/components/DynamicViews/` directory
- [ ] **2.3** Create `src/core/components/DynamicForm/` directory
- [ ] **2.4** Create `src/core/components/Layout/` directory
- [ ] **2.5** Create `src/core/components/shared/` directory
- [ ] **2.6** Create `src/core/components/details/` directory
- [ ] **2.7** Create `src/core/hooks/` directory
- [ ] **2.8** Create `src/core/lib/` directory
- [ ] **2.9** Create `src/core/theme/` directory
- [ ] **2.10** Create `src/core/i18n/` directory

#### Deliverables
- Complete core folder structure
- All directories exist but are empty

---

### Stage 3: Create Module Folder Structure (ALL MODULES)

**Duration:** 1-2 hours  
**Risk:** Low  
**Objective:** Create folder structure for ALL modules, including placeholders

#### Active Modules (will be populated)

| Module | Description | Current Location |
|--------|-------------|------------------|
| `tickets` | Support tickets, tasks | `src/components/pages/Clients/`, `src/components/pages/tickets/` |
| `workforce` | Timesheet, Expenses, Leaves | `src/components/common/details/Timesheet.tsx`, etc. |
| `fsm` | Field Service Management | `src/components/common/details/Planner.tsx`, locationTracker |
| `crm` | CRM entities | `src/pages/crm/` |
| `admin` | Admin settings | `src/pages/admin/` |
| `contracts` | Contracts and SLAs | (minimal) |

#### Placeholder Modules (future implementation)

| Module | Description | Priority |
|--------|-------------|----------|
| `wa` | WhatsApp Engage | High |
| `catalog` | Product catalog | Medium |
| `erp` | Enterprise Resource Planning | Low |
| `esm` | Enterprise Service Management | Low |
| `wms` | Warehouse Management | Low |
| `pos` | Point of Sale | Low |
| `landing` | Product landing pages | Medium |

#### Standard Module Structure

For EACH module (active and placeholder):

```
src/modules/{module-name}/
├── index.ts              # Module entry point with register() export
├── registry.ts           # Module-specific registrations
├── README.md             # Module documentation
├── components/           # Module components (empty for placeholders)
├── pages/                # Module pages (empty for placeholders)
└── hooks/                # Module hooks (empty for placeholders)
```

#### Deliverables
- All module directories created
- Placeholder modules have README.md explaining planned features
- Active modules have empty structure ready for migration

---

### Stage 4: Migrate Core Utilities

**Duration:** 2-3 hours  
**Risk:** Medium  
**Objective:** Move core utilities to new location with backward compatibility

#### Tasks

- [ ] **4.1** Copy `src/lib/*` → `src/core/lib/`
- [ ] **4.2** Create re-exports in `src/lib/` for backward compatibility
- [ ] **4.3** Copy `src/hooks/*` → `src/core/hooks/`
- [ ] **4.4** Create re-exports in `src/hooks/`
- [ ] **4.5** Copy `src/i18n/*` → `src/core/i18n/`
- [ ] **4.6** Create re-exports in `src/i18n/`
- [ ] **4.7** Update `tsconfig.json` paths if needed
- [ ] **4.8** Test build

#### Backward Compatibility Pattern

```typescript
// src/lib/store.ts (OLD location - becomes re-export)
export * from '@/core/lib/store';
export { default } from '@/core/lib/store';
console.warn('[Deprecation] Import from @/core/lib/store instead');
```

#### Validation

```bash
yarn build  # Must succeed
yarn dev    # Must work, may show deprecation warnings
```

---

### Stage 5: Create Bootstrap Infrastructure

**Duration:** 2-3 hours  
**Risk:** Medium  
**Objective:** Create tenant-aware bootstrap system

#### Files to Create

```
src/core/bootstrap/
├── index.tsx             # Main bootstrap entry
├── TenantResolver.ts     # Subdomain → tenant config
├── TenantProvider.tsx    # Tenant context provider
└── ModuleLoader.ts       # Dynamic module loading
```

#### Key Components

**TenantResolver.ts:**
- Extract subdomain from hostname
- Cache tenant config
- Handle special subdomains (login, demo, etc.)
- Fallback to default config

**TenantProvider.tsx:**
- React context for tenant config
- Provide enabled modules, theme, languages
- Expose `useTenantConfig()` hook

**ModuleLoader.ts:**
- Load enabled modules dynamically
- Call module.register() for each
- Log loading times

---

### Stage 6: Create Theme & i18n Systems

**Duration:** 2-3 hours  
**Risk:** Medium  
**Objective:** Create tenant-aware theme and language loading

#### Theme System

```
src/core/theme/
├── ThemeProvider.tsx     # Wraps app with Ant ConfigProvider
├── ThemeRegistry.ts      # Load and cache tenant theme
└── types.ts              # ThemeConfig interface
```

**Key Design Decision:** ONE theme per tenant, NO user toggle.

#### i18n System

```
src/core/i18n/
├── I18nProvider.tsx      # Wraps app with I18nextProvider
├── I18nRegistry.ts       # Load ONLY tenant languages
└── LanguageSelect.tsx    # Only show if multiple languages
```

**Key Design Decision:** Load ONLY languages enabled for tenant.

---

### Stage 7: Refactor DynamicViews to Use Registry

**Duration:** 4-5 hours  
**Risk:** HIGH  
**Objective:** Remove direct domain imports from DynamicViews

This is the **critical stage** where we break the coupling.

#### Files to Modify

| File | Changes Required |
|------|------------------|
| `GlobalActions.tsx` | Remove direct imports, use registry |
| `RowActions.tsx` | Remove direct imports, use registry |
| `DetailsView.tsx` | Remove hardcoded tabs, use registry |

#### Strategy: Copy-Refactor-Replace

1. **Copy** current files to `src/core/components/DynamicViews/`
2. **Refactor** copies to use registry
3. **Test** side-by-side with feature flag
4. **Replace** old files with new ones

#### Before (GlobalActions.tsx)

```typescript
import InviteUserModal from '../common/details/InviteUserModal';
import TicketNew from '../pages/Clients/TicketNew';
import Planner from '../common/details/Planner';

const actionComponents = {
  'invite-user': InviteUserModal,
  'create-ticket': TicketNew,
  'planner': Planner,
};
```

#### After (GlobalActions.tsx)

```typescript
import { registry } from '@/core/registry';

export const GlobalActions = ({ entityType }) => {
  const actions = registry.getActionsForEntity(entityType, 'global');
  
  const handleAction = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (action) {
      const Component = await action.component();
      // Render dynamically loaded component
    }
  };
  
  return (/* render action buttons */);
};
```

---

### Stage 8: Migrate Tickets Module

**Duration:** 3-4 hours  
**Risk:** Medium  
**Objective:** Move all tickets-related code to module

#### Source → Destination Mapping

```
src/components/pages/Clients/TicketNew.tsx → src/modules/tickets/components/TicketNew.tsx
src/components/pages/Clients/TicketEdit.tsx → src/modules/tickets/components/TicketEdit.tsx
src/components/pages/tickets/Messages.tsx → src/modules/tickets/components/Messages.tsx
src/components/common/details/TaskForm.tsx → src/modules/tickets/components/TaskForm.tsx
```

#### Registration

```typescript
// src/modules/tickets/registry.ts
import { registry } from '@/core/registry';

export function registerTicketsModule() {
  registry.registerAction({
    id: 'create-ticket',
    entityTypes: ['tickets', 'clients', 'contracts'],
    position: 'global',
    component: () => import('./components/TicketNew'),
  });
  
  registry.registerTab({
    id: 'messages',
    entityTypes: ['tickets', 'tasks'],
    label: 'Messages',
    component: () => import('./components/Messages'),
    order: 10,
  });
}
```

---

### Stage 9: Migrate Workforce Module

**Duration:** 2-3 hours  
**Risk:** Medium  
**Objective:** Move workforce components to module

#### Source → Destination Mapping

```
src/components/common/details/Timesheet.tsx → src/modules/workforce/components/Timesheet.tsx
src/components/common/details/Expensesheet.tsx → src/modules/workforce/components/Expensesheet.tsx
src/components/pages/Team/* → src/modules/workforce/components/
```

---

### Stage 10: Migrate FSM Module

**Duration:** 1-2 hours  
**Risk:** Medium  
**Objective:** Move FSM components to module

#### Source → Destination Mapping

```
src/components/common/details/Planner.tsx → src/modules/fsm/components/Planner.tsx
src/components/utils/locationTracker.ts → src/modules/fsm/hooks/useLocationTracker.ts
```

---

### Stage 11: Migrate CRM & Admin Modules

**Duration:** 1-2 hours  
**Risk:** Low  
**Objective:** Move remaining page-level modules

#### CRM Module
```
src/pages/crm/* → src/modules/crm/pages/
```

#### Admin Module
```
src/pages/admin/* → src/modules/admin/pages/
```

---

### Stage 12: Finalize Placeholder Modules

**Duration:** 1 hour  
**Risk:** Low  
**Objective:** Ensure all placeholder modules have proper structure

For each placeholder module, ensure:
- [ ] `index.ts` exports `register()` function
- [ ] `registry.ts` has empty registration with console.log
- [ ] `README.md` documents planned features
- [ ] Empty `components/`, `pages/`, `hooks/` folders exist

---

### Stage 13: Integration & Cleanup

**Duration:** 2-3 hours  
**Risk:** Medium  
**Objective:** Final integration and removal of legacy code

#### Tasks

- [ ] **13.1** Update `App.tsx` to use new bootstrap flow
- [ ] **13.2** Update routes to use registry-based navigation
- [ ] **13.3** Remove deprecated re-exports (after testing)
- [ ] **13.4** Run bundle analysis
- [ ] **13.5** Validate performance metrics
- [ ] **13.6** Update all documentation

#### Final Validation

```bash
yarn build --analyze  # Check bundle sizes
yarn dev              # Test all functionality
```

---

## Progress Tracking

| Stage | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 0 | 🔴 Not Started | - | - | Preparation |
| 1 | 🔴 Not Started | - | - | Registry Infrastructure |
| 2 | 🔴 Not Started | - | - | Core Folder Structure |
| 3 | 🔴 Not Started | - | - | Module Folder Structure |
| 4 | 🔴 Not Started | - | - | Core Utilities Migration |
| 5 | 🔴 Not Started | - | - | Bootstrap Infrastructure |
| 6 | 🔴 Not Started | - | - | Theme & i18n Systems |
| 7 | 🔴 Not Started | - | - | DynamicViews Refactor (CRITICAL) |
| 8 | 🔴 Not Started | - | - | Tickets Module |
| 9 | 🔴 Not Started | - | - | Workforce Module |
| 10 | 🔴 Not Started | - | - | FSM Module |
| 11 | 🔴 Not Started | - | - | CRM & Admin Modules |
| 12 | 🔴 Not Started | - | - | Placeholder Modules |
| 13 | 🔴 Not Started | - | - | Final Integration |

**Legend:**
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Completed

---

## Risk Mitigation

### High-Risk Stage (Stage 7)

Stage 7 is the highest risk because it touches the core rendering components.

**Mitigation Strategy:**
1. Use feature flags to toggle between old and new implementations
2. Create side-by-side tests
3. Roll back immediately if any functionality breaks
4. Keep old files until new ones are fully validated

### Rollback Strategy

Each stage should be a separate git commit:

```bash
git commit -m "Stage 1: Create registry infrastructure"
git commit -m "Stage 2: Create core folder structure"
# etc.
```

If any stage fails:
```bash
git revert HEAD  # Revert last commit
```

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-21 | 2.0 | Consolidated implementation stages from restructure.md and core_refactoring.md |

---

## Next Steps

To begin implementation, the AI assistant should:

1. ✅ Read and understand this document
2. ⏳ Start **Stage 0: Preparation** - Validate build, create changelog
3. ⏳ Proceed to **Stage 1: Registry Infrastructure** - Create registry files
4. Continue through stages in order

**Important:** After each stage, update the Progress Tracking table and `docs/restructure-changelog.md`.
