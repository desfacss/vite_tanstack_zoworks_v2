# Restructuring Implementation Plan

**Document Version:** 1.0  
**Created:** 2025-12-21  
**Status:** 🟡 In Progress  
**Based On:** `restructure.md` & `core_refactoring.md`

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Target State](#target-state)
4. [Implementation Stages](#implementation-stages)
5. [Stage Execution Details](#stage-execution-details)
6. [Placeholder Module Strategy](#placeholder-module-strategy)
7. [Progress Tracking](#progress-tracking)
8. [Rollback Strategy](#rollback-strategy)

---

## Overview

### Goals

1. **Create a modular architecture** where core scaffolding is completely independent
2. **Enable tenant-aware lazy loading** - only load what each tenant needs
3. **Maintain backward compatibility** during migration
4. **Preserve all functionality** - even for modules not fully implemented yet
5. **Document all changes** as we progress

### Key Principles

- ✅ **Non-breaking changes first** - Create new structure alongside existing
- ✅ **One module at a time** - Migrate incrementally
- ✅ **Placeholder for future modules** - Create folder structure for ALL modules, even if not implemented
- ✅ **Test after each stage** - Validate with `yarn build` and `yarn dev`
- ✅ **Document as we go** - Update this file and create module-specific docs

---

## Current State Analysis

### Current Folder Structure

```
src/
├── components/
│   ├── DynamicViews/         # 34 files - Core (but has domain imports)
│   ├── Layout/               # 20 files - Core
│   ├── common/               # 49 files - MIXED (core + domain)
│   │   ├── DynamicForm/      # Core - clean
│   │   ├── details/          # MIXED - has domain-specific tabs
│   │   ├── doc/              # Domain-specific (FSM)
│   │   └── utils/            # Core utilities
│   ├── pages/                # 44 files - DOMAIN components
│   ├── shared/               # 7 files - Shared utilities
│   └── utils/                # 1 file - Utility components
├── pages/                    # 14 items - Route pages
│   ├── auth/                 # Login, Password pages
│   ├── admin/                # Admin pages
│   ├── core/                 # Core pages
│   ├── crm/                  # CRM pages
│   └── settings/             # Settings pages
├── hooks/                    # 2 files
├── i18n/                     # 9 files
├── lib/                      # 5 files - Core utilities
├── routes/                   # 1 file
├── schemas/                  # 13 files - View schemas
├── types/                    # 2 files
└── utils/                    # 2 files
```

### Problems Identified (from restructure.md)

| Problem | Location | Impact |
|---------|----------|--------|
| Direct imports in DynamicViews | GlobalActions.tsx, RowActions.tsx | Forces all domain code to load |
| Hardcoded tabs in DetailsView | common/details/DetailsView.tsx | Cannot customize per entity |
| Mixed core/domain in common/ | common/details/, common/doc/ | No clear ownership |
| No module boundary | Cross-folder imports | Tight coupling |

---

## Target State

### Target Folder Structure

```
src/
├── core/                          # CORE - Zero domain imports
│   ├── bootstrap/                 # App initialization
│   │   ├── index.tsx              # Entry point (rename from main.tsx)
│   │   ├── TenantProvider.tsx     # Tenant context
│   │   ├── TenantResolver.ts      # Subdomain → config
│   │   └── ModuleLoader.ts        # Dynamic module loading
│   ├── components/
│   │   ├── DynamicViews/          # Migrated from src/components/DynamicViews
│   │   ├── DynamicForm/           # Migrated from src/components/common/DynamicForm
│   │   ├── Layout/                # Migrated from src/components/Layout
│   │   └── shared/                # Migrated from src/components/shared
│   ├── hooks/
│   ├── lib/                       # Migrated from src/lib
│   ├── theme/
│   ├── i18n/                      # Migrated from src/i18n
│   └── registry/                  # NEW - Central registration
│       ├── index.ts               # Main registry
│       ├── types.ts               # Registry interfaces
│       ├── actionRegistry.ts      # Row/Global action registry
│       ├── tabRegistry.ts         # Detail tab registry
│       ├── viewRegistry.ts        # View type registry
│       └── moduleRegistry.ts      # Module registration
│
├── modules/                       # DOMAIN MODULES - Self-contained
│   ├── core/                      # Core module (always loaded)
│   ├── crm/                       # CRM module
│   ├── tickets/                   # Tickets/Tasks module
│   ├── workforce/                 # Timesheet, Expenses, Leaves
│   ├── fsm/                       # Field Service Management
│   ├── contracts/                 # Contracts module
│   ├── admin/                     # Admin module
│   ├── wa/                        # WhatsApp module (placeholder)
│   ├── catalog/                   # Catalog module (placeholder)
│   ├── erp/                       # ERP module (placeholder)
│   ├── esm/                       # ESM module (placeholder)
│   ├── wms/                       # WMS module (placeholder)
│   └── pos/                       # POS module (placeholder)
│
├── pages/                         # Route pages (thin wrappers)
└── app/                           # App configuration
    ├── App.tsx
    └── routes/
```

---

## Implementation Stages

### Stage Overview

| Stage | Name | Duration | Risk | Dependencies |
|-------|------|----------|------|--------------|
| **0** | Preparation & Documentation | 1 day | Low | None |
| **1** | Create Registry Infrastructure | 2 days | Low | Stage 0 |
| **2** | Create Core Folder Structure | 1 day | Low | Stage 1 |
| **3** | Create Module Folder Structure | 1 day | Low | Stage 2 |
| **4** | Migrate Core Components | 3 days | Medium | Stage 3 |
| **5** | Implement Registry Pattern in DynamicViews | 3 days | Medium | Stage 4 |
| **6** | Migrate Tickets Module | 2 days | Medium | Stage 5 |
| **7** | Migrate Workforce Module | 2 days | Medium | Stage 5 |
| **8** | Migrate FSM Module | 1 day | Medium | Stage 5 |
| **9** | Migrate CRM Module | 1 day | Low | Stage 5 |
| **10** | Migrate Admin Module | 1 day | Low | Stage 5 |
| **11** | Create Placeholder Modules | 1 day | Low | Stage 3 |
| **12** | Implement Tenant Configuration | 2 days | Medium | Stage 5 |
| **13** | Finalize & Cleanup | 2 days | Low | All |

---

## Stage Execution Details

### Stage 0: Preparation & Documentation

**Objective:** Set up documentation structure and validate current build.

**Tasks:**
- [ ] 0.1 Validate current build works (`yarn build`)
- [ ] 0.2 Create `docs/restructure-changelog.md` for tracking changes
- [ ] 0.3 Create `docs/modules/` directory for module-specific docs
- [ ] 0.4 Document all existing imports in problematic files
- [ ] 0.5 Create git branch for restructuring

**Validation:**
```bash
yarn build  # Should succeed
yarn dev    # Should work
```

---

### Stage 1: Create Registry Infrastructure

**Objective:** Create registry files WITHOUT modifying existing code.

**Tasks:**
- [ ] 1.1 Create `src/core/registry/` directory
- [ ] 1.2 Create `src/core/registry/types.ts` - Type definitions
- [ ] 1.3 Create `src/core/registry/index.ts` - Registry class
- [ ] 1.4 Create `src/core/registry/actionRegistry.ts` - Action helpers
- [ ] 1.5 Create `src/core/registry/tabRegistry.ts` - Tab helpers
- [ ] 1.6 Create `src/core/registry/viewRegistry.ts` - View type helpers
- [ ] 1.7 Create `src/core/registry/moduleRegistry.ts` - Module loader
- [ ] 1.8 Update `tsconfig.json` with path aliases

**Files to Create:**

```
src/core/
└── registry/
    ├── index.ts
    ├── types.ts
    ├── actionRegistry.ts
    ├── tabRegistry.ts
    ├── viewRegistry.ts
    └── moduleRegistry.ts
```

**Validation:**
```bash
yarn build  # Should still succeed (no imports yet)
```

---

### Stage 2: Create Core Folder Structure

**Objective:** Create core directory structure without moving files yet.

**Tasks:**
- [ ] 2.1 Create `src/core/bootstrap/` directory
- [ ] 2.2 Create `src/core/components/` directory
- [ ] 2.3 Create `src/core/components/DynamicViews/` directory
- [ ] 2.4 Create `src/core/components/DynamicForm/` directory
- [ ] 2.5 Create `src/core/components/Layout/` directory
- [ ] 2.6 Create `src/core/components/shared/` directory
- [ ] 2.7 Create `src/core/hooks/` directory
- [ ] 2.8 Create `src/core/lib/` directory
- [ ] 2.9 Create `src/core/theme/` directory
- [ ] 2.10 Create `src/core/i18n/` directory

**Folder Structure:**

```
src/core/
├── bootstrap/
├── components/
│   ├── DynamicViews/
│   ├── DynamicForm/
│   ├── Layout/
│   └── shared/
├── hooks/
├── lib/
├── theme/
├── i18n/
└── registry/          # Created in Stage 1
```

---

### Stage 3: Create Module Folder Structure

**Objective:** Create ALL module directories (including placeholders for future modules).

**Tasks:**
- [ ] 3.1 Create `src/modules/` directory
- [ ] 3.2 Create standard module structure for each module

**Module Structure (for each):**

```
src/modules/{module-name}/
├── index.ts           # Module entry point
├── registry.ts        # Module registration
├── components/        # Module components
├── pages/             # Module pages
└── hooks/             # Module hooks
```

**Modules to Create:**

| Module | Status | Description |
|--------|--------|-------------|
| `core` | **Active** | Always-loaded core functionality |
| `crm` | **Active** | CRM entities (Leads, Contacts, Accounts) |
| `tickets` | **Active** | Support tickets and tasks |
| `workforce` | **Active** | Timesheet, Expenses, Leaves |
| `fsm` | **Active** | Field Service (Planner, Location Tracking) |
| `contracts` | **Active** | Contracts and SLAs |
| `admin` | **Active** | Admin settings and configuration |
| `wa` | **Placeholder** | WhatsApp Engage |
| `catalog` | **Placeholder** | Product catalog |
| `erp` | **Placeholder** | Enterprise Resource Planning |
| `esm` | **Placeholder** | Enterprise Service Management |
| `wms` | **Placeholder** | Warehouse Management |
| `pos` | **Placeholder** | Point of Sale |
| `landing` | **Placeholder** | Landing pages for products |

---

### Stage 4: Migrate Core Components

**Objective:** Move core components to new structure with backward compatibility.

**Tasks:**
- [ ] 4.1 Copy `src/lib/` → `src/core/lib/`
- [ ] 4.2 Create re-exports in old location for backward compatibility
- [ ] 4.3 Copy `src/hooks/` → `src/core/hooks/`
- [ ] 4.4 Copy `src/i18n/` → `src/core/i18n/`
- [ ] 4.5 Copy `src/components/common/DynamicForm/` → `src/core/components/DynamicForm/`
- [ ] 4.6 Copy `src/components/shared/` → `src/core/components/shared/`
- [ ] 4.7 Update path aliases in `tsconfig.json`
- [ ] 4.8 Test build

**Backward Compatibility Example:**

```typescript
// src/lib/store.ts (old location)
export * from '@/core/lib/store';
export { default } from '@/core/lib/store';
```

---

### Stage 5: Implement Registry Pattern in DynamicViews

**Objective:** Refactor DynamicViews to use registry instead of direct imports.

**Tasks:**
- [ ] 5.1 Analyze all imports in `GlobalActions.tsx`
- [ ] 5.2 Analyze all imports in `RowActions.tsx`
- [ ] 5.3 Analyze all imports in `DetailsView.tsx`
- [ ] 5.4 Create registry-based `GlobalActions.tsx` in `src/core/components/DynamicViews/`
- [ ] 5.5 Create registry-based `RowActions.tsx` in `src/core/components/DynamicViews/`
- [ ] 5.6 Create registry-based `DetailsView.tsx` in `src/core/components/details/`
- [ ] 5.7 Migrate other DynamicViews components
- [ ] 5.8 Test with feature flag

**Key Changes:**

Before (GlobalActions.tsx):
```typescript
import InviteUserModal from '../common/details/InviteUserModal';
import TicketNew from '../pages/Clients/TicketNew';
```

After (GlobalActions.tsx):
```typescript
import { registry } from '@/core/registry';
// Get actions from registry - no direct imports
const actions = registry.getActionsForEntity(entityType, 'global');
```

---

### Stage 6: Migrate Tickets Module

**Objective:** Move tickets-related components to tickets module.

**Source Files:**
```
src/components/pages/Clients/  → src/modules/tickets/components/
src/components/pages/tickets/  → src/modules/tickets/components/
src/components/common/details/TaskForm.tsx → src/modules/tickets/components/
src/pages/support/*.tsx → src/modules/tickets/pages/
```

**Tasks:**
- [ ] 6.1 Create `src/modules/tickets/registry.ts`
- [ ] 6.2 Move ticket components
- [ ] 6.3 Create module index.ts with registration
- [ ] 6.4 Register actions and tabs
- [ ] 6.5 Create re-exports for backward compatibility
- [ ] 6.6 Test isolation

---

### Stage 7: Migrate Workforce Module

**Objective:** Move workforce-related components.

**Source Files:**
```
src/components/common/details/Timesheet.tsx → src/modules/workforce/components/
src/components/common/details/Expensesheet.tsx → src/modules/workforce/components/
src/components/common/details/TimesheetProjects.tsx → src/modules/workforce/components/
src/components/pages/Team/* → src/modules/workforce/components/
src/pages/workforce/* → src/modules/workforce/pages/
```

**Tasks:**
- [ ] 7.1 Create `src/modules/workforce/registry.ts`
- [ ] 7.2 Move workforce components
- [ ] 7.3 Create module index.ts with registration
- [ ] 7.4 Register tabs (Timesheet, Expenses)
- [ ] 7.5 Handle email dependency
- [ ] 7.6 Test isolation

---

### Stage 8: Migrate FSM Module

**Objective:** Move Field Service Management components.

**Source Files:**
```
src/components/common/details/Planner.tsx → src/modules/fsm/components/
src/components/utils/locationTracker.ts → src/modules/fsm/hooks/
src/pages/fsm/* → src/modules/fsm/pages/
```

**Tasks:**
- [ ] 8.1 Create `src/modules/fsm/registry.ts`
- [ ] 8.2 Move FSM components
- [ ] 8.3 Create module index.ts
- [ ] 8.4 Register Planner action
- [ ] 8.5 Test isolation

---

### Stage 9: Migrate CRM Module

**Objective:** Move CRM components.

**Source Files:**
```
src/pages/crm/* → src/modules/crm/pages/
```

**Tasks:**
- [ ] 9.1 Create `src/modules/crm/registry.ts`
- [ ] 9.2 Move CRM pages
- [ ] 9.3 Create module index.ts
- [ ] 9.4 Register CRM routes and navigation

---

### Stage 10: Migrate Admin Module

**Objective:** Move Admin components.

**Source Files:**
```
src/pages/admin/* → src/modules/admin/pages/
```

**Tasks:**
- [ ] 10.1 Create `src/modules/admin/registry.ts`
- [ ] 10.2 Move Admin pages
- [ ] 10.3 Create module index.ts

---

### Stage 11: Create Placeholder Modules

**Objective:** Create empty module structures for future modules.

**Modules:**
- wa (WhatsApp)
- catalog
- erp
- esm
- wms
- pos
- landing

**For each placeholder:**
```
src/modules/{name}/
├── index.ts          # Empty registration
├── registry.ts       # Empty registry
├── README.md         # Module documentation
└── components/       # Empty folder
```

---

### Stage 12: Implement Tenant Configuration

**Objective:** Add tenant-aware module loading.

**Tasks:**
- [ ] 12.1 Create `src/core/bootstrap/TenantResolver.ts`
- [ ] 12.2 Create `src/core/bootstrap/TenantProvider.tsx`
- [ ] 12.3 Create `src/core/bootstrap/ModuleLoader.ts`
- [ ] 12.4 Update App.tsx to use tenant-aware loading
- [ ] 12.5 Create tenant config examples
- [ ] 12.6 Test with different module combinations

---

### Stage 13: Finalize & Cleanup

**Objective:** Remove legacy code and finalize structure.

**Tasks:**
- [ ] 13.1 Remove backward compatibility re-exports
- [ ] 13.2 Update all import paths
- [ ] 13.3 Run full test suite
- [ ] 13.4 Update documentation
- [ ] 13.5 Bundle analysis
- [ ] 13.6 Performance validation

---

## Placeholder Module Strategy

For modules that don't exist yet but are planned, we create a minimal structure:

### Placeholder Template

```typescript
// src/modules/{name}/index.ts
export { register } from './registry';

export const MODULE_ID = '{name}';
export const MODULE_NAME = '{Display Name}';
export const MODULE_STATUS = 'placeholder'; // 'active' | 'placeholder' | 'deprecated'
```

```typescript
// src/modules/{name}/registry.ts
import { registry } from '@/core/registry';

export function register(config?: any) {
  console.log(`[${MODULE_NAME}] Module not yet implemented`);
  
  // Register empty module
  registry.registerModule({
    id: MODULE_ID,
    name: MODULE_NAME,
    routes: [],
    navigationItems: [],
    initialize: async () => {
      console.log(`[${MODULE_NAME}] Placeholder initialized`);
    },
  });
}
```

```markdown
<!-- src/modules/{name}/README.md -->
# {Module Name} Module

**Status:** 🟡 Placeholder

## Overview
This module is planned but not yet implemented.

## Planned Features
- Feature 1
- Feature 2

## Dependencies
- crm
- tickets

## Target Entities
- Entity 1
- Entity 2
```

---

## Progress Tracking

### Stage Progress

| Stage | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 0 | 🔴 Not Started | - | - | |
| 1 | 🔴 Not Started | - | - | |
| 2 | 🔴 Not Started | - | - | |
| 3 | 🔴 Not Started | - | - | |
| 4 | 🔴 Not Started | - | - | |
| 5 | 🔴 Not Started | - | - | |
| 6 | 🔴 Not Started | - | - | |
| 7 | 🔴 Not Started | - | - | |
| 8 | 🔴 Not Started | - | - | |
| 9 | 🔴 Not Started | - | - | |
| 10 | 🔴 Not Started | - | - | |
| 11 | 🔴 Not Started | - | - | |
| 12 | 🔴 Not Started | - | - | |
| 13 | 🔴 Not Started | - | - | |

**Legend:**
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Completed
- 🔵 On Hold

---

## Rollback Strategy

### Git-Based Rollback

Each stage should be committed separately with clear commit messages:

```bash
git commit -m "Stage 1: Create registry infrastructure"
git commit -m "Stage 2: Create core folder structure"
```

### Feature Flags

Use feature flags to gradually enable new architecture:

```typescript
// src/config/features.ts
export const USE_NEW_REGISTRY = false;  // Enable after Stage 5
export const USE_MODULAR_LOADING = false;  // Enable after Stage 12
```

### Backward Compatibility Period

Maintain both old and new import paths for 2 weeks after each migration:

```typescript
// Old path (deprecated)
import { TicketNew } from '@/components/pages/Clients/TicketNew';

// New path (recommended)
import { TicketNew } from '@/modules/tickets';
```

---

## Next Steps

**To begin implementation:**

1. ✅ Review this plan
2. ⏳ Start Stage 0: Preparation
3. Create git branch: `git checkout -b refactor/modular-architecture`
4. Begin Stage 1: Registry Infrastructure

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-21 | 1.0 | Initial plan created |

