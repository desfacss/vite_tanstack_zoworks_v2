# Architecture Restructuring Plan: From Monolithic to Modular

**Document Version:** 1.0  
**Created:** 2025-12-21  
**Author:** Architecture Review  
**Purpose:** LLM/AI-assisted refactoring instructions

---

## Executive Summary

The current codebase has **deep coupling issues** that prevent modular deployment. During an attempt to create a minimal standalone project (`mini_project`), we discovered that extracting core scaffolding (auth, layout, DynamicViews) requires pulling in domain-specific modules (Tickets, Expenses, ServiceReports, etc.) due to hard-coded imports.

**Problem Statement:**
- Started with ~120 core files for mini_project
- Build failures forced adding 90+ additional files
- Final mini_project contains domain-specific code that shouldn't be required
- Multi-tenant deployments load ALL modules regardless of tenant configuration

**Goal:** Create a truly modular architecture where:
1. Core scaffolding is completely independent
2. Domain modules are opt-in via a registry
3. Multi-tenant apps only load what they need
4. New modules can be added without touching core code

---

## Part 1: Current Architecture Analysis

### 1.1 Dependency Graph of Problems Found

During the mini_project build, these dependency chains were discovered:

```
DynamicViews/index.tsx
└── GlobalActions.tsx
    ├── ../common/details/InviteUserModal  ⚠️ Domain-specific
    ├── ../utils/locationTracker           ⚠️ FSM-specific
    ├── ../common/details/Planner          ⚠️ FSM-specific
    └── ../pages/Clients/TicketNew         ⚠️ Tickets-specific

DynamicViews/RowActions.tsx
├── ../common/details/DetailsView
│   └── ../../pages/tickets/Messages       ⚠️ Tickets-specific
│   └── ../../pages/Team/AgentActivityReport ⚠️ Workforce-specific
├── ../common/DynamicForm                  ✓ Core
└── ../pages/Clients/TicketEdit            ⚠️ Tickets-specific

common/details/DetailsView.tsx
├── ./Expensesheet                         ⚠️ Workforce-specific
│   └── ../email                           ⚠️ External service
├── ./Timesheet                            ⚠️ Workforce-specific
├── ./TaskForm                             ⚠️ Tickets-specific
├── ../doc/ServiceReportDrawer             ⚠️ FSM-specific
└── ../../pages/Team/AgentActivityReport   ⚠️ Workforce-specific

common/details/Expensesheet.tsx
└── ../email                               ⚠️ External service
```

### 1.2 Root Causes

| Cause | Example | Impact |
|-------|---------|--------|
| **Direct imports in generic components** | `GlobalActions.tsx` imports `TicketNew` | Forces all tenants to load Tickets module |
| **Lazy imports with fallback patterns** | `const X = lazy(() => import(...))` inside component | Still creates bundle dependency |
| **Detail tabs hardcoded** | `DetailsView.tsx` has hardcoded tab components | Cannot customize per entity |
| **Action buttons coupled** | Row/Global actions import specific modals | Cannot add actions without modifying core |
| **No module boundary enforcement** | Imports cross module folders freely | No clear ownership |

### 1.3 Current Folder Structure (Problematic)

```
src/
├── components/
│   ├── DynamicViews/          # Core - but imports domain components
│   ├── common/
│   │   ├── DynamicForm/       # Core - clean
│   │   ├── details/           # MIXED - has domain-specific tabs
│   │   └── doc/               # Domain-specific (FSM)
│   └── pages/                 # DOMAIN - but imported by core
│       ├── Clients/           # Tickets domain
│       ├── Team/              # Workforce domain
│       ├── tickets/           # Tickets domain
│       └── Settings/          # Admin domain
├── pages/                     # Route pages
└── lib/                       # Core - clean
```

---

## Part 2: Target Architecture

### 2.1 Design Principles

1. **Core Must Be Self-Contained**: Core components (DynamicViews, DynamicForm, Layout) must NEVER import domain components directly
2. **Dependency Inversion**: Domain modules register themselves with core, not the other way around
3. **Plugin Architecture**: Modules expose registration functions that core calls at runtime
4. **Lazy Everything**: All domain code must be dynamically imported only when needed
5. **Tenant-Aware Loading**: Module registry respects tenant configuration

### 2.2 Target Folder Structure

```
src/
├── core/                          # CORE - Zero domain imports
│   ├── components/
│   │   ├── DynamicViews/
│   │   ├── DynamicForm/
│   │   ├── Layout/
│   │   └── shared/
│   ├── hooks/
│   ├── lib/
│   └── registry/                  # Central registration point
│       ├── index.ts               # Main registry
│       ├── types.ts               # Registry interfaces
│       ├── actionRegistry.ts      # Row/Global action registry
│       ├── tabRegistry.ts         # Detail tab registry
│       ├── viewRegistry.ts        # View type registry
│       └── moduleRegistry.ts      # Module registration
│
├── modules/                       # DOMAIN MODULES - Self-contained
│   ├── tickets/
│   │   ├── index.ts               # Module entry point + registration
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── registry.ts            # Module-specific registrations
│   ├── workforce/
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── Timesheet/
│   │   │   ├── Expensesheet/
│   │   │   └── AgentActivityReport/
│   │   └── registry.ts
│   ├── fsm/
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── LocationTracker/
│   │   │   └── Planner/
│   │   └── registry.ts
│   ├── crm/
│   │   ├── index.ts
│   │   └── ...
│   └── wa/                        # WhatsApp module (already separate)
│       ├── index.ts
│       └── ...
│
├── pages/                         # Route pages (thin wrappers)
│   ├── auth/                      # Core auth pages
│   ├── Dashboard.tsx              # Core
│   └── [module]/                  # Module pages (lazy loaded)
│
└── app/
    ├── App.tsx
    ├── routes/
    └── moduleLoader.ts            # Loads modules based on tenant config
```

### 2.3 Registry Pattern

#### 2.3.1 Central Registry Interface

```typescript
// src/core/registry/types.ts

export interface ModuleDefinition {
  id: string;                    // e.g., 'tickets', 'workforce'
  name: string;                  // Display name
  requiredPermissions?: string[];
  routes: RouteDefinition[];
  navigationItems: NavItemDefinition[];
  initialize: () => Promise<void>;  // Called when module loads
}

export interface ActionDefinition {
  id: string;
  entityTypes: string[];         // Which entities show this action
  position: 'row' | 'global' | 'both';
  component: () => Promise<React.ComponentType<any>>;  // Dynamic import
  condition?: (context: ActionContext) => boolean;
}

export interface TabDefinition {
  id: string;
  entityTypes: string[];         // Which entities show this tab
  label: string | ((t: TFunction) => string);
  component: () => Promise<React.ComponentType<any>>;  // Dynamic import
  order?: number;
  condition?: (context: TabContext) => boolean;
}

export interface ViewTypeDefinition {
  id: string;                    // e.g., 'gantt', 'kanban', 'calendar'
  component: () => Promise<React.ComponentType<any>>;
  requiredModules?: string[];    // e.g., gantt requires 'fsm' module
}
```

#### 2.3.2 Registry Implementation

```typescript
// src/core/registry/index.ts

class AppRegistry {
  private modules: Map<string, ModuleDefinition> = new Map();
  private actions: Map<string, ActionDefinition[]> = new Map();
  private tabs: Map<string, TabDefinition[]> = new Map();
  private viewTypes: Map<string, ViewTypeDefinition> = new Map();
  
  // Module registration
  registerModule(module: ModuleDefinition) {
    this.modules.set(module.id, module);
  }
  
  // Action registration
  registerAction(action: ActionDefinition) {
    action.entityTypes.forEach(entityType => {
      const existing = this.actions.get(entityType) || [];
      this.actions.set(entityType, [...existing, action]);
    });
  }
  
  // Tab registration
  registerTab(tab: TabDefinition) {
    tab.entityTypes.forEach(entityType => {
      const existing = this.tabs.get(entityType) || [];
      this.tabs.set(entityType, [...existing, tab]);
    });
  }
  
  // Get actions for an entity (called by DynamicViews)
  getActionsForEntity(entityType: string, position: 'row' | 'global'): ActionDefinition[] {
    return (this.actions.get(entityType) || [])
      .filter(a => a.position === position || a.position === 'both');
  }
  
  // Get tabs for an entity (called by DetailsView)
  getTabsForEntity(entityType: string): TabDefinition[] {
    return (this.tabs.get(entityType) || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }
}

export const registry = new AppRegistry();
```

#### 2.3.3 Module Registration Example

```typescript
// src/modules/tickets/registry.ts

import { registry } from '@/core/registry';

export function registerTicketsModule() {
  // Register module
  registry.registerModule({
    id: 'tickets',
    name: 'Tickets',
    routes: [
      { path: '/support/tickets', component: () => import('./pages/TicketsPage') },
      { path: '/support/tasks', component: () => import('./pages/TasksPage') },
    ],
    navigationItems: [
      { key: 'tickets', label: 'Tickets', path: '/support/tickets', icon: 'Ticket' },
    ],
    initialize: async () => {
      console.log('[Tickets Module] Initialized');
    },
  });

  // Register actions
  registry.registerAction({
    id: 'create-ticket',
    entityTypes: ['tickets', 'clients', 'contracts'],
    position: 'global',
    component: () => import('./components/TicketNew'),
  });

  registry.registerAction({
    id: 'edit-ticket',
    entityTypes: ['tickets'],
    position: 'row',
    component: () => import('./components/TicketEdit'),
  });

  // Register tabs for detail views
  registry.registerTab({
    id: 'messages',
    entityTypes: ['tickets', 'tasks'],
    label: 'Messages',
    component: () => import('./components/Messages'),
    order: 10,
  });

  registry.registerTab({
    id: 'task-form',
    entityTypes: ['tickets'],
    label: 'Tasks',
    component: () => import('./components/TaskForm'),
    order: 20,
  });
}
```

#### 2.3.4 Workforce Module Registration

```typescript
// src/modules/workforce/registry.ts

import { registry } from '@/core/registry';

export function registerWorkforceModule() {
  registry.registerModule({
    id: 'workforce',
    name: 'Workforce',
    routes: [
      { path: '/workforce/teams', component: () => import('./pages/TeamsPage') },
      { path: '/workforce/leaves', component: () => import('./pages/LeavesPage') },
      { path: '/workforce/expenses', component: () => import('./pages/ExpensesPage') },
    ],
    // ...
  });

  // Register detail tabs
  registry.registerTab({
    id: 'timesheet',
    entityTypes: ['users', 'teams'],
    label: 'Timesheet',
    component: () => import('./components/Timesheet'),
    order: 30,
  });

  registry.registerTab({
    id: 'expenses',
    entityTypes: ['users', 'tickets'],
    label: 'Expenses',
    component: () => import('./components/Expensesheet'),
    order: 40,
  });

  registry.registerTab({
    id: 'agent-report',
    entityTypes: ['users'],
    label: 'Activity Report',
    component: () => import('./components/AgentActivityReport'),
    order: 50,
  });
}
```

---

## Part 3: Refactoring Instructions

### Phase 1: Create Core Registry (Non-Breaking)

**Objective:** Create registry infrastructure without modifying existing code.

#### Step 1.1: Create Registry Files

```bash
mkdir -p src/core/registry
```

Create these files:
- `src/core/registry/types.ts` - Type definitions
- `src/core/registry/index.ts` - Registry class
- `src/core/registry/actionRegistry.ts` - Action-specific helpers
- `src/core/registry/tabRegistry.ts` - Tab-specific helpers
- `src/core/registry/moduleRegistry.ts` - Module loader

#### Step 1.2: Create Module Loader

```typescript
// src/core/registry/moduleLoader.ts

import { registry } from './index';

interface TenantConfig {
  enabledModules: string[];
}

const moduleImports: Record<string, () => Promise<{ register: () => void }>> = {
  tickets: () => import('@/modules/tickets'),
  workforce: () => import('@/modules/workforce'),
  fsm: () => import('@/modules/fsm'),
  crm: () => import('@/modules/crm'),
  contracts: () => import('@/modules/contracts'),
  wa: () => import('@/modules/wa'),
};

export async function loadModules(config: TenantConfig) {
  const loadPromises = config.enabledModules
    .filter(moduleId => moduleImports[moduleId])
    .map(async moduleId => {
      const module = await moduleImports[moduleId]();
      module.register();
      console.log(`[ModuleLoader] Loaded: ${moduleId}`);
    });
  
  await Promise.all(loadPromises);
}
```

### Phase 2: Refactor DynamicViews Components

**Objective:** Remove direct imports, use registry instead.

#### Step 2.1: Refactor GlobalActions.tsx

**BEFORE:**
```typescript
import InviteUserModal from '../common/details/InviteUserModal';
import TicketNew from '../pages/Clients/TicketNew';
import Planner from '../common/details/Planner';

// Hardcoded component mapping
const actionComponents = {
  'invite-user': InviteUserModal,
  'create-ticket': TicketNew,
  'planner': Planner,
};
```

**AFTER:**
```typescript
import { registry } from '@/core/registry';
import React, { Suspense, lazy, useCallback, useState } from 'react';

export const GlobalActions: React.FC<GlobalActionsProps> = ({ entityType, ...props }) => {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [ActionComponent, setActionComponent] = useState<React.ComponentType | null>(null);

  // Get registered actions for this entity type
  const actions = registry.getActionsForEntity(entityType, 'global');

  const handleActionClick = useCallback(async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (action) {
      const Component = await action.component();
      setActionComponent(() => Component.default || Component);
      setActiveAction(actionId);
    }
  }, [actions]);

  return (
    <>
      {/* Render action buttons */}
      {actions.map(action => (
        <Button key={action.id} onClick={() => handleActionClick(action.id)}>
          {action.label}
        </Button>
      ))}

      {/* Render active action component */}
      {activeAction && ActionComponent && (
        <Suspense fallback={<Spin />}>
          <ActionComponent 
            {...props} 
            onClose={() => setActiveAction(null)} 
          />
        </Suspense>
      )}
    </>
  );
};
```

#### Step 2.2: Refactor DetailsView.tsx

**BEFORE:**
```typescript
import Messages from '../../pages/tickets/Messages';
import AgentActivityReport from '../../pages/Team/AgentActivityReport';
import Expensesheet from './Expensesheet';
import Timesheet from './Timesheet';

// Hardcoded tabs
const tabs = [
  { key: 'messages', label: 'Messages', component: Messages },
  { key: 'expenses', label: 'Expenses', component: Expensesheet },
  // ...
];
```

**AFTER:**
```typescript
import { registry } from '@/core/registry';
import React, { Suspense, useState, useEffect } from 'react';
import { Tabs, Spin } from 'antd';

export const DetailsView: React.FC<DetailsViewProps> = ({ entityType, entityId, ...props }) => {
  const [loadedTabs, setLoadedTabs] = useState<Record<string, React.ComponentType>>({});

  // Get registered tabs for this entity type
  const tabDefinitions = registry.getTabsForEntity(entityType);

  // Lazy load tab component when tab is selected
  const handleTabChange = async (tabId: string) => {
    if (!loadedTabs[tabId]) {
      const tabDef = tabDefinitions.find(t => t.id === tabId);
      if (tabDef) {
        const Component = await tabDef.component();
        setLoadedTabs(prev => ({
          ...prev,
          [tabId]: Component.default || Component,
        }));
      }
    }
  };

  const tabItems = tabDefinitions.map(tab => ({
    key: tab.id,
    label: typeof tab.label === 'function' ? tab.label(t) : tab.label,
    children: loadedTabs[tab.id] ? (
      <Suspense fallback={<Spin />}>
        {React.createElement(loadedTabs[tab.id], { entityId, ...props })}
      </Suspense>
    ) : (
      <Spin />
    ),
  }));

  return <Tabs items={tabItems} onChange={handleTabChange} />;
};
```

#### Step 2.3: Refactor RowActions.tsx

Apply same pattern - use registry to get row actions dynamically.

### Phase 3: Migrate Existing Components to Modules

**Objective:** Move domain components to their respective modules.

#### Step 3.1: Create Module Structure

```bash
# Create tickets module
mkdir -p src/modules/tickets/{components,pages,hooks}
mv src/components/pages/Clients/* src/modules/tickets/components/
mv src/components/pages/tickets/* src/modules/tickets/components/
mv src/components/common/details/TaskForm.tsx src/modules/tickets/components/
mv src/pages/support/Tickets.tsx src/modules/tickets/pages/
mv src/pages/support/Tasks.tsx src/modules/tickets/pages/

# Create workforce module
mkdir -p src/modules/workforce/{components,pages,hooks}
mv src/components/common/details/Timesheet.tsx src/modules/workforce/components/
mv src/components/common/details/Expensesheet.tsx src/modules/workforce/components/
mv src/components/common/details/TimesheetProjects.tsx src/modules/workforce/components/
mv src/components/pages/Team/* src/modules/workforce/components/
mv src/pages/workforce/* src/modules/workforce/pages/

# Create fsm module
mkdir -p src/modules/fsm/{components,pages,hooks}
mv src/components/common/details/Planner.tsx src/modules/fsm/components/
mv src/components/utils/locationTracker.ts src/modules/fsm/hooks/
mv src/pages/fsm/* src/modules/fsm/pages/

# Create crm module
mkdir -p src/modules/crm/{components,pages,hooks}
mv src/pages/crm/* src/modules/crm/pages/

# Create contracts module  
mkdir -p src/modules/contracts/{components,pages,hooks}
mv src/pages/contracts/* src/modules/contracts/pages/
```

#### Step 3.2: Create Module Entry Points

Each module needs an `index.ts` that exports:
1. `register()` function for initialization
2. Component re-exports if needed

```typescript
// src/modules/tickets/index.ts

export { registerTicketsModule as register } from './registry';

// Re-export components for backwards compatibility during migration
export { default as TicketNew } from './components/TicketNew';
export { default as TicketEdit } from './components/TicketEdit';
// ...
```

#### Step 3.3: Update Import Paths

Create path aliases for cleaner imports:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/core/*": ["src/core/*"],
      "@/modules/*": ["src/modules/*"],
      "@/lib/*": ["src/lib/*"],
      "@/*": ["src/*"]
    }
  }
}
```

### Phase 4: Integrate with Tenant Configuration

**Objective:** Load modules based on tenant's enabled features.

#### Step 4.1: Tenant Config Source

```typescript
// src/core/registry/tenantConfig.ts

export interface TenantConfig {
  id: string;
  name: string;
  enabledModules: string[];
  features: Record<string, boolean>;
}

export async function getTenantConfig(orgId: string): Promise<TenantConfig> {
  // Option 1: From organization.app_settings in Supabase
  // Option 2: From dedicated tenant_config table
  // Option 3: From organization.module_features array
  
  const { data } = await supabase
    .schema('identity')
    .from('organizations')
    .select('app_settings, module_features')
    .eq('id', orgId)
    .single();

  return {
    id: orgId,
    name: data.name,
    enabledModules: data.module_features || ['core'],
    features: data.app_settings?.features || {},
  };
}
```

#### Step 4.2: App Initialization

```typescript
// src/App.tsx

import { loadModules } from '@/core/registry/moduleLoader';
import { getTenantConfig } from '@/core/registry/tenantConfig';

function App() {
  const { organization } = useAuthStore();
  const [modulesLoaded, setModulesLoaded] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      getTenantConfig(organization.id)
        .then(config => loadModules(config))
        .then(() => setModulesLoaded(true));
    }
  }, [organization?.id]);

  if (!modulesLoaded) {
    return <LoadingFallback />;
  }

  return <RouterProvider router={router} />;
}
```

---

## Part 4: Validation Checklist

### 4.1 Core Independence Test

After refactoring, these tests should pass:

```bash
# Create mini_project with ONLY core files
cp -r src/core mini_project/src/
cp -r src/lib mini_project/src/
cp -r src/i18n mini_project/src/
cp src/App.tsx src/main.tsx mini_project/src/

# Build should succeed with ZERO domain modules
cd mini_project && yarn build
# Expected: Build succeeds with just core + DynamicViews
```

### 4.2 Module Isolation Test

Each module should build independently:

```bash
# Test tickets module isolation
mkdir test_module
cp -r src/modules/tickets test_module/
cd test_module && tsc --noEmit
# Expected: No errors, no missing imports from other modules
```

### 4.3 Bundle Analysis

After restructuring:

```bash
yarn build --analyze
```

**Expected Results:**
- Core bundle: ~500KB (DynamicViews, Layout, Auth)
- Each module: Separate chunk, only loaded when accessed
- Tenant without 'workforce' module: Never loads Timesheet/Expense code

### 4.4 Performance Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Initial bundle size | ~3MB | <800KB |
| Time to interactive | ~4s | <2s |
| Module load time | N/A (all loaded) | <300ms per module |
| Memory footprint | High (all components) | Proportional to enabled modules |

---

## Part 5: Migration Strategy

### 5.1 Phased Approach

| Phase | Scope | Duration | Risk |
|-------|-------|----------|------|
| 1 | Create registry infrastructure | 1 week | Low |
| 2 | Refactor DynamicViews to use registry | 2 weeks | Medium |
| 3 | Migrate tickets module | 1 week | Medium |
| 4 | Migrate workforce module | 1 week | Medium |
| 5 | Migrate remaining modules | 2 weeks | Low |
| 6 | Remove legacy imports, finalize | 1 week | Low |

### 5.2 Backwards Compatibility

During migration, maintain backwards compatibility:

```typescript
// Legacy import path (deprecate after full migration)
// src/components/pages/Clients/TicketNew.tsx
export { default } from '@/modules/tickets/components/TicketNew';
```

### 5.3 Feature Flags

Use feature flags to gradually roll out:

```typescript
const useNewRegistry = organization?.app_settings?.features?.useNewRegistry ?? false;

if (useNewRegistry) {
  // Use registry-based loading
} else {
  // Use legacy direct imports
}
```

---

## Part 6: File Inventory for Refactoring

### 6.1 Files Requiring Modification

| File | Change Required | Priority |
|------|-----------------|----------|
| `src/components/DynamicViews/GlobalActions.tsx` | Remove direct imports, use registry | HIGH |
| `src/components/DynamicViews/RowActions.tsx` | Remove direct imports, use registry | HIGH |
| `src/components/common/details/DetailsView.tsx` | Remove hardcoded tabs, use registry | HIGH |
| `src/App.tsx` | Add module loader | MEDIUM |
| `src/routes/index.tsx` | Use dynamic route generation | MEDIUM |

### 6.2 Files to Move to Modules

**Tickets Module:**
- `src/components/pages/Clients/` → `src/modules/tickets/components/`
- `src/components/pages/tickets/` → `src/modules/tickets/components/`
- `src/components/common/details/TaskForm.tsx` → `src/modules/tickets/components/`
- `src/pages/support/Tickets.tsx` → `src/modules/tickets/pages/`
- `src/pages/support/Tasks.tsx` → `src/modules/tickets/pages/`
- `src/pages/support/Projects.tsx` → `src/modules/tickets/pages/`

**Workforce Module:**
- `src/components/common/details/Timesheet.tsx` → `src/modules/workforce/components/`
- `src/components/common/details/Expensesheet.tsx` → `src/modules/workforce/components/`
- `src/components/common/details/TimesheetProjects.tsx` → `src/modules/workforce/components/`
- `src/components/pages/Team/` → `src/modules/workforce/components/`
- `src/pages/workforce/` → `src/modules/workforce/pages/`

**FSM Module:**
- `src/components/common/details/Planner.tsx` → `src/modules/fsm/components/`
- `src/components/utils/locationTracker.ts` → `src/modules/fsm/hooks/`
- `src/pages/fsm/` → `src/modules/fsm/pages/`

**CRM Module:**
- `src/pages/crm/` → `src/modules/crm/pages/`

**Contracts Module:**
- `src/pages/contracts/` → `src/modules/contracts/pages/`

**Admin Module:**
- `src/pages/admin/` → `src/modules/admin/pages/`

### 6.3 Files That Stay in Core

These files form the core and should NOT have domain dependencies:

```
src/core/
├── components/
│   ├── DynamicViews/
│   │   ├── index.tsx
│   │   ├── TableView.tsx
│   │   ├── GridView.tsx
│   │   ├── KanbanView.tsx
│   │   ├── CalendarView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── MetricsView.tsx
│   │   ├── GlobalFilters.tsx
│   │   ├── GlobalActions.tsx      # Refactored to use registry
│   │   ├── RowActions.tsx         # Refactored to use registry
│   │   └── hooks/
│   ├── DynamicForm/
│   │   ├── index.tsx
│   │   ├── Widgets.tsx
│   │   └── ...
│   ├── Layout/
│   │   ├── AuthGuard.tsx
│   │   ├── AuthedLayout.tsx
│   │   ├── SessionManager.tsx
│   │   ├── Header/
│   │   ├── Sider/
│   │   └── ProfileMenu/
│   └── shared/
│       ├── ThemeProvider.tsx
│       ├── LoadingFallback.tsx
│       └── ...
├── hooks/
│   ├── useUserSession.ts
│   └── useSettings.ts
├── lib/
│   ├── store.ts
│   ├── supabase.ts
│   ├── theme.ts
│   └── types.ts
└── registry/
    └── (new registry files)
```

---

## Part 7: LLM/AI Refactoring Instructions

### 7.1 For AI Assistants

When asked to refactor this codebase:

1. **Start with Registry Creation**
   - Create `src/core/registry/` directory
   - Implement `types.ts`, `index.ts`, `moduleLoader.ts`
   - Do NOT modify existing files yet

2. **Refactor One Component at a Time**
   - Start with `GlobalActions.tsx`
   - Test that existing functionality still works
   - Then move to `RowActions.tsx`
   - Then `DetailsView.tsx`

3. **Migrate One Module at a Time**
   - Start with smallest module (e.g., CRM)
   - Create module structure
   - Create registration file
   - Update imports
   - Test in isolation

4. **Always Maintain Backwards Compatibility**
   - Keep legacy export paths during migration
   - Use feature flags for gradual rollout
   - Don't delete files until migration is complete

5. **Validate After Each Step**
   - Run `yarn build` after each change
   - Run `yarn dev` and test functionality
   - Check bundle size with `yarn build --analyze`

### 7.2 Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Circular dependencies after moving files | Use re-exports in module index.ts |
| Missing type definitions | Create shared types in core |
| Lazy load failures | Ensure correct chunk naming in vite config |
| Registry not populated | Call module registration before app render |

---

## Appendix A: Example Implementation

See separate file: `docs/restructure-examples.md` (to be created during implementation)

## Appendix B: Testing Scenarios

See separate file: `docs/restructure-testing.md` (to be created during implementation)
