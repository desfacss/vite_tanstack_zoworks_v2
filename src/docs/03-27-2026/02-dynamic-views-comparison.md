# Dynamic Views Comparison: Lean-Architect vs Current Project

> **Date:** 2026-03-27  
> **Purpose:** Side-by-side comparison of how dynamic views are built in the Lean-Architect POC vs the current production project

---

## 1. High-Level Summary

| Dimension | Lean-Architect POC | Current Project (`vite_tanstack_zoworks_v2`) |
|-----------|-------------------|----------------------------------------------|
| **Config source** | In-code `EntityConfig` object (TypeScript) | Database-driven (Supabase `core` schema RPC) |
| **View engine** | `ViewEngine.tsx` — single orchestrator | `DynamicViews/index.tsx` — ~1600 line component |
| **View switching** | Per-entity Zustand state | `useViewState` hook + `useAuthStore.viewPreferences` |
| **Available views** | 9 types (Table, Kanban, Grid, Calendar, Gantt, List, Gallery, Map, Custom) | 7 types (Table, Grid, Kanban, Calendar, Gantt, Map, Dashboard) |
| **View gating** | Smart gating based on data capabilities | Backend config `available_views` array |
| **Entity registration** | Add to `entityConfigs` TypeScript object | Add to `menuConfig.json` + ensure DB view/config exists |
| **Route pattern** | `/:entity` (single catch-all) | `/:schema/:entity` (schema-qualified) |
| **Data normalization** | All entities share `NormalizedRecord` (canonical shape) | Each entity returns raw DB rows; view components handle shape |
| **Field mapping** | ViewConfig fields (`imageField`, `latField` etc.) | ViewConfig metadata from DB (`v_metadata`) |
| **Custom views** | `registerView(key, Component)` pattern | `viewRegistry` lazy-load map (`registry.ts`) |
| **API contract** | OpenAPI → Zod → generated hooks (Orval) | Supabase RPC (`core_get_entity_data_v30`) |
| **State persistence** | Zustand (in-memory, per session) | `useAuthStore.viewPreferences` (persisted per user/entity) |
| **Record editor** | `RecordDrawer` (Notion-like, always mounted) | Detail view / form drawer (per module) |
| **Sidebar** | API-driven from `useEntityConfigs()` | `menuConfig.json` + permission filtering |

---

## 2. Config Layer Comparison

### Lean-Architect: TypeScript EntityConfig

```typescript
// In artifacts/api-server/src/data/mockData.ts
const entityConfigs: Record<string, EntityConfig> = {
  tasks: {
    entity: 'tasks',
    label: 'Tasks',
    group: 'Work',
    color: '#6366f1',
    columns: [ /* column definitions */ ],
    views: [
      { type: 'table' },
      { type: 'kanban', groupBy: 'status' },
      { type: 'gantt', dateField: 'startDate', endDateField: 'endDate' },
    ],
    defaultView: 'kanban',
    statusOptions: [ /* { value, label, color } */ ],
    features: { checklist: true, dependencies: true, ... }
  }
};
```

**Pros:** Type-safe, easy to add new entities, instant feedback  
**Cons:** Requires code deploy for new entities, no runtime configurability

---

### Current Project: menuConfig.json + DB Config

```json
// In src/config/menuConfig.json
{
  "modules": {
    "crm": [
      {
        "filePath": "src/core/components/DynamicViews/GenericDynamicPage.tsx",
        "routePath": "/crm/leads",
        "key": "crm-leads",
        "submoduleKey": "crm-leads",
        "tabs": [
          { "key": "all", "label": "All Leads" },
          { "key": "new", "label": "New", "condition": { "field": "status", "value": "new" } }
        ]
      }
    ]
  }
}
```

```typescript
// Runtime: useViewConfigEnhanced(entityType, entitySchema)
// Calls: core_get_entity_data_v30 with metadata
// Returns: { config, viewConfig } from DB
const config = data?.config;          // { available_views, default_view, details }
const viewConfig = data?.viewConfig;  // { tableview.fields, v_metadata, general.filters }
```

**Pros:** Fully runtime configurable, DB-driven, works for any org/tenant  
**Cons:** Dependent on DB health, more layers of indirection, harder to debug

---

## 3. View Engine Comparison

### Lean-Architect: ViewEngine.tsx (~300 lines)

```
ViewEngine
  ├── useEntityConfig(entity)      → EntityConfig (typed, colocated)
  ├── useEntityDataQuery(req)      → NormalizedRecord[]
  ├── useViewStore(entity)         → { activeView, search, filters }
  ├── isViewAvailable(view, data)  → smart gating
  ├── Tab bar: available + gated/disabled tabs
  └── Render switch:
      currentView === 'table'   → <TableView data config />
      currentView === 'kanban'  → <KanbanView data config entity />
      currentView === 'gantt'   → <GanttView data config />
      ... etc.
```

**Architecture style:** Thin orchestrator, each view component is self-contained

---

### Current Project: DynamicViews/index.tsx (~1600 lines, heavily commented)

```
DynamicViews (index.tsx)
  ├── useViewConfigEnhanced(entityType, entitySchema)  → { config, viewConfig }
  ├── useQuery([entityType, org, filters, page, tab])  → { data, total }
  ├── useViewState(entityType, defaultView)            → { viewType, setViewType }
  ├── useNestedContext()                               → isTopLevel detection
  ├── GlobalFilters                                    → injected into AuthedLayout header
  ├── GlobalActions
  ├── ImportExportComponent
  ├── Tab rendering (with condition-based filtering)
  ├── View selector (Radio.Group desktop / Button cycle mobile)
  ├── Pagination
  └── Render: <ViewComponent entityType entitySchema viewConfig config data ... />
```

**Architecture style:** God component, owns all concerns (filters, tabs, pagination, actions, views)

---

## 4. Data Normalization Comparison

### Lean-Architect: Normalized upfront

```typescript
// Every entity maps to NormalizedRecord:
interface NormalizedRecord {
  id, title, status, assignees, startDate, endDate,
  priority, tags, progress, dependencies, checklists,
  notes, originalData  ← entity-specific payload
}

// Views code once against NormalizedRecord — no entity-specific view code
```

### Current Project: Raw rows, view-specific handling

```typescript
// Data returned as raw DB rows (any shape per entity)
// Each view component receives: data: any[], viewConfig, config
// Views must check viewConfig.v_metadata to know field names, types
// Different entities may have wildly different field shapes
```

**Outcome:** Lean-Architect views are fully reusable; current project views have implicit coupling to entity shapes via `viewConfig.v_metadata`

---

## 5. State Management Comparison

### Lean-Architect: Zustand (per-entity, session-only)

```typescript
// useViewStore: entityStates[entity] = { activeView, search, filters, sort, page }
// Persists within session, resets on page reload
// No user coupling — pure UI state
```

### Current Project: useAuthStore (persisted per user)

```typescript
// useAuthStore: viewPreferences[entityType] = { viewType, currentTab, filters, pageSize, tabs }
// Persisted to storage — survives page reloads
// User-specific — saved under user.id context
// The "clear filters" action resets + re-derives from config defaults
```

**Current project advantage:** Multi-tab and multi-session persistence  
**Lean-Architect advantage:** Zero coupling, simpler state machine

---

## 6. View Availability Gating Comparison

### Lean-Architect: Runtime data-aware gating

```typescript
// Computed per render from actual data:
function isViewAvailable(view, data) {
  if (view.type === 'gantt') {
    return data.some(r => r.startDate) && data.some(r => r.dependencies.length > 0);
  }
  if (view.type === 'map') return !!(view.latField && view.lngField);
  // ...
}
// Gated views appear disabled in tab bar with tooltip
```

### Current Project: Config-driven list from DB

```typescript
// config.available_views = ['tableview', 'kanbanview', 'gridview']
// Views NOT in this list don't appear at all
// No runtime gating based on actual data
// isTopLevel check: nested views can only use topLevelViews (table, grid)
```

**Lean-Architect advantage:** Smarter — shows Gantt only when entity has dates+dependencies  
**Current project advantage:** Admin-configured via DB, no hardcoding

---

## 7. Column/Field Configuration Comparison

### Lean-Architect: ColumnConfig in EntityConfig

```typescript
columns: [
  { key: 'title',        label: 'Title',    type: 'text',     sortable: true,  width: 300 },
  { key: 'status',       label: 'Status',   type: 'status',   sortable: true,  width: 120 },
  { key: 'progress',     label: 'Progress', type: 'progress', sortable: true,  width: 120 },
  { key: 'originalData.value', label: 'Deal Value', type: 'currency', width: 130 },
]
// Dot-notation path access into originalData for nested fields
```

### Current Project: v_metadata from DB view

```typescript
viewConfig.v_metadata = [
  { key: 'name', display_name: 'Name', is_displayable: true, foreign_key: null },
  { key: 'status_id', display_name: 'Status', foreign_key: { display_column: 'name' } },
]
// Resolves to: status_id_name (joined display column)
// visibleColumns state controls which columns are shown
```

---

## 8. Custom Views Comparison

### Lean-Architect: `view-registry.ts`

```typescript
// Named import, register once at app init
registerView('my-product-view', MyProductView);

// EntityConfig:
views: [{ type: 'custom', customViewKey: 'my-product-view' }]

// CustomView.tsx:
const Component = getView(view.customViewKey);
return <Component data={data} config={config} onRecordOpen={...} />;
```

### Current Project: `registry.ts`

```typescript
// Lazy-loaded module map:
export const viewRegistry = {
  tableview:     lazy(() => import('./TableView')),
  gridview:      lazy(() => import('./GridView')),
  kanbanview:    lazy(() => import('./KanbanView')),
  ganttview:     lazy(() => import('./GanttChart')),
  calendarview:  lazy(() => import('./calendar/MobileCalendarView')),
  mapview:       lazy(() => import('./MapViewComponent')),
  dashboardview: lazy(() => import('./DashboardView')),
};
// Used via: loadView(viewType) — returns the lazy component
```

**Key difference:** Lean-Architect registry supports runtime-registered components (plugin pattern); current project uses static build-time lazy imports

---

## 9. Missing Views in Current Project

Views present in Lean-Architect but absent from current project:

| View | Lean-Architect | Current Project | Notes |
|------|---------------|-----------------|-------|
| **Gallery** | ✅ `GalleryView.tsx` | ❌ Not implemented | Image grid with price/rating overlays |
| **List** | ✅ `ListView.tsx` | ❌ Not implemented | Compact list view |
| **Map** | ✅ `MapView.tsx` (Leaflet) | ✅ `MapViewComponent.tsx` (Leaflet) | Both use Leaflet |
| **Scheduler** | ✅ `SchedulerView.tsx` | ❌ Not implemented | Timeline/scheduler view |
| **Smart Gating** | ✅ Data-aware | ❌ Config-only | Views can be hidden by data state |
| **Custom registry** | ✅ Runtime registerView | ⚠️ Build-time only | Current is not extensible at runtime |

---

## 10. What the Current Project Does Better

1. **Multi-tenant DB config**: View config comes from Supabase — different orgs can have different field sets, available views, filters
2. **Persisted user preferences**: View type, page, filters saved per user across sessions
3. **Tab-based sub-filtering**: `tabOptions` with `condition` field-value filters (e.g., "My Tickets" vs "All Tickets")
4. **Import/Export**: `ImportExportComponent` built into DynamicViews
5. **Global Filters in header**: Filters injected into layout via `AuthedLayoutContext`
6. **Nested views** (detailView mode): Shows sub-records for a parent record in drawers
7. **Pagination (cursor/offset)**: Connects to real paginated backend
8. **RBAC/Permission-gated fields**: `isLocationPartition` and permission checks
