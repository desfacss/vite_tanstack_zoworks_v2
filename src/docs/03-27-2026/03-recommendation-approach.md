# Recommended Approach: Adopting Lean-Architect Patterns

> **Date:** 2026-03-27  
> **Purpose:** Concrete recommendations on what to adopt from Lean-Architect into the current project, with rationale and phased plan

---

## Executive Summary

The Lean-Architect POC demonstrates a **cleaner architecture** for the view engine specifically. However, the current project has real advantages in DB-driven config, user preference persistence, and multi-tenancy. The recommendation is a **selective adoption strategy** — not a rewrite.

**Adopt:** ViewEngine decomposition, smart view gating, Gallery/List/Scheduler views, view-registry extensibility  
**Keep:** DB-driven config, user preference persistence, tab filtering, import/export, nested views, RBAC

---

## What Should Be Brought In (Priority Order)

---

### 🔴 Priority 1: Decompose `DynamicViews/index.tsx`

**Problem:** The current `index.tsx` is ~1600 lines and handles everything: config fetching, data fetching, tabs, filters, view selector, pagination, import/export, and view rendering.

**Solution from Lean-Architect:** Extract a lean `ViewEngine` component that only orchestrates which view to show.

#### Proposed Split

```
DynamicViews/
  index.tsx              ← Keep as "God component" entry but strip down
  engine/
    ViewEngine.tsx       ← NEW: Orchestrates view selection + tab bar
    useViewGating.ts     ← NEW: Smart view availability logic
  views/
    TableView.tsx        ← Existing (keep)
    KanbanView.tsx       ← Existing (keep)
    GridView.tsx         ← Existing (keep)
    GanttChart.tsx       ← Existing (keep, rename to GanttView.tsx)
    CalendarView.tsx     ← Existing (keep)
    MapViewComponent.tsx ← Existing (keep)
    DashboardView.tsx    ← Existing (keep)
    GalleryView.tsx      ← NEW (from Lean-Architect)
    ListView.tsx         ← NEW (from Lean-Architect)
    SchedulerView.tsx    ← NEW (from Lean-Architect)
    CustomView.tsx       ← NEW (from Lean-Architect pattern)
  registry.ts            ← Existing (enhance to support runtime registerView)
```

#### ViewEngine API

```typescript
// engine/ViewEngine.tsx
interface ViewEngineProps {
  entityType: string;
  entitySchema: string;
  data: any[];
  config: any;           // current config shape
  viewConfig: any;       // current viewConfig shape
  isLoading: boolean;
}
// ViewEngine handles: active view, tab bar, smart gating, passes props to view component
```

**Effort:** ~2 days | **Impact:** High — maintainability, testability

---

### 🔴 Priority 1: Smart View Gating

**Problem:** Current project checks `config.available_views` statically from DB. If an entity has no data with dates, Gantt view still appears (just empty).

**Solution from Lean-Architect:** Add runtime gating alongside static config gating:

```typescript
// hooks/useViewGating.ts
function isViewAvailable(viewType: string, data: any[], viewConfig: any): boolean {
  switch (viewType) {
    case 'ganttview':
      // Only show if records have date fields populated
      const dateColumn = viewConfig?.ganttview?.dateField || 'start_date';
      return data.some(r => r[dateColumn]);
    case 'mapview':
      // Only show if lat/lng configured AND data has lat
      const latField = viewConfig?.mapview?.latField;
      return !!(latField && data.some(r => r[latField]));
    case 'calendarview':
      const calDate = viewConfig?.calendarview?.dateField || 'start_date';
      return data.some(r => r[calDate]);
    default:
      return true;
  }
}
```

Add this on top of the existing `available_views` filter.  
**Gated views:** Show as disabled tabs with tooltip — don't hide entirely.

**Effort:** ~4 hours | **Impact:** Medium — better UX, no more empty Gantt charts

---

### 🟡 Priority 2: Gallery View

**Problem:** No gallery/image-grid view for entities with images (products, properties, media assets).

**Solution from Lean-Architect:** Port `GalleryView.tsx`. It reads from `viewConfig` field mappings:

```typescript
// viewConfig.galleryview.imageField — which DB column has the image URL
// viewConfig.galleryview.priceField — overlay price badge
// viewConfig.galleryview.ratingField — star rating
// viewConfig.galleryview.badgeField — type/category badge

// In GalleryView.tsx:
const imageUrl = getNestedValue(record, viewConfig.galleryview.imageField);
```

**Integration:** Add `galleryview` to `viewRegistry`, add to `available_views` in relevant entity DB configs.

**Effort:** ~1 day | **Impact:** High for product/listing/catalog entities

---

### 🟡 Priority 2: List View (Compact List)

**Problem:** No compact list view — users are forced to use either table (column-heavy) or grid (space-heavy).

**Solution from Lean-Architect:** Port `ListView.tsx`. Simple one-row-per-record layout:
- Status badge, priority indicator, title, assignee avatar, due date
- Very scannable, works great on mobile

**Effort:** ~4 hours | **Impact:** Medium — mobile UX improvement

---

### 🟡 Priority 2: Scheduler View

**Problem:** Calendar view shows dates but doesn't show resource scheduling (who is doing what when).

**Solution from Lean-Architect:** `SchedulerView.tsx` is a timeline view that shows tasks per assignee on a time axis.

**Effort:** ~1-2 days | **Impact:** High for task/project/workforce entities

---

### 🟢 Priority 3: Enhance View Registry for Runtime Registration

**Current `registry.ts`:**
```typescript
export const viewRegistry = {
  tableview: lazy(() => import('./TableView')),
  // ... static list
};
```

**Enhanced version (adding Lean-Architect pattern):**
```typescript
// Keep static registry for built-ins
export const viewRegistry = {
  tableview: lazy(() => import('./TableView')),
  // ...
};

// Add runtime registry for custom/plugin views
const customRegistry = new Map<string, ComponentType<ViewComponentProps>>();

export function registerView(key: string, component: ComponentType<ViewComponentProps>) {
  customRegistry.set(key, component);
}

export function getCustomView(key: string) {
  return customRegistry.get(key);
}
```

This allows modules to register domain-specific views (e.g., a `WA Chat View`, `Invoice Preview`, etc.).

**Effort:** ~2 hours | **Impact:** Low now, High in future

---

### 🟢 Priority 3: Zustand Entity View State

**Problem:** Current view state is inside `useAuthStore.viewPreferences` — tightly coupled to auth, persisted to storage including ephemeral UI state (scroll position, transient filters).

**Solution from Lean-Architect:** For purely UI-ephemeral state (which view tab is active, current search query), use a **separate Zustand store**:

```typescript
// core/lib/viewStore.ts (new)
export const useViewStore = create<ViewState>((set, get) => ({
  entityStates: {},
  setActiveView: (entity, view) => set(state => ({
    entityStates: { ...state.entityStates, [entity]: { ...state.entityStates[entity], activeView: view } }
  })),
  // ...
}));
```

Keep `useAuthStore.viewPreferences` for only truly persistent preferences (default view type per entity, page size).

**Effort:** ~1 day | **Impact:** Medium — cleaner separation of concerns

---

### 🟢 Priority 3: NormalizedRecord Contract for Views

**Problem:** Views receive raw `any[]` data. Each view checks different field names. If entity schema changes, all views can break silently.

**Solution from Lean-Architect:** Define a `ViewRecord` interface that all views consume:

```typescript
interface ViewRecord {
  id: string;
  title: string;
  status: string;
  // ... known fields
  raw: Record<string, any>;    // original DB row
}

// In DynamicViews, normalize before passing to views:
const viewRecords = useMemo(() => entities.map(e => ({
  id: e.id,
  title: e[config.titleField],
  status: e[config.statusField],
  raw: e
})), [entities, config]);
```

This gives views a stable API even when DB schema evolves.

**Effort:** ~2 days | **Impact:** High — type safety, view reliability

---

## What NOT to Adopt

| Pattern | Reason |
|---------|--------|
| In-code EntityConfig (TypeScript objects) | Current DB-driven approach is better for multi-tenant, no-code configuration |
| In-memory mock API | Current Supabase RPC is production-grade, no need to change |
| Wouter routing | Current project uses React Router with permission guards — don't regress |
| Single `/:entity` route | Current `/:schema/:entity` correctly namespaces entities by module |
| Session-only state | Persisted user preferences are a strong UX feature |

---

## Phased Adoption Roadmap

### Phase 1 — Quick Wins (1 week)
- [ ] Add `useViewGating.ts` hook for smart view availability
- [ ] Show gated views as disabled tabs with tooltip instead of hiding
- [ ] Port `ListView.tsx` from Lean-Architect (compact list view)
- [ ] Add `listview` to `viewRegistry`

### Phase 2 — New Views (2-3 weeks)
- [ ] Port `GalleryView.tsx` with `galleryview` viewConfig field mappings
- [ ] Add `galleryview` to relevant entity DB configs (products, listings)
- [ ] Port `SchedulerView.tsx` for workforce/task entities
- [ ] Add `schedulerview` to `viewRegistry`

### Phase 3 — Architecture Refactor (1-2 sprints)
- [ ] Extract `engine/ViewEngine.tsx` from `DynamicViews/index.tsx`
- [ ] Create `core/lib/viewStore.ts` (Zustand ephemeral view state)
- [ ] Define `ViewRecord` normalized interface
- [ ] Enhance `registry.ts` with `registerView` runtime pattern
- [ ] Split `index.tsx` into: data layer → engine → view components

### Phase 4 — Enhancement (Ongoing)
- [ ] `CustomView.tsx` with module-level `registerView` calls
- [ ] Gallery view for Catalog/Products/ESM modules
- [ ] Scheduler view for Workforce/Appointments modules

---

## Architecture Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Config source | Keep DB-driven | Multi-tenant, no-code, admin-configurable |
| View state management | Split: Zustand (UI) + authStore (preferences) | Cleaner separation |
| View registry | Extend current registry + add runtime registration | Backwards compatible |
| Data normalization | Add `ViewRecord` interface (adapter layer) | Type safety without breaking changes |
| View gating | Add runtime gating on top of config gating | Both have complementary roles |
| New views | Port Gallery, List, Scheduler from Lean-Architect | Proven implementations, save dev time |
| Engine decomposition | Extract ViewEngine from God component | Mandatory for maintainability |

---

## Conclusion

The Lean-Architect POC is an excellent **reference implementation** for view engine architecture. Copy the following directly:

1. **GalleryView.tsx** — minimal adaptation needed
2. **ListView.tsx** — near plug-and-play  
3. **SchedulerView.tsx** — needs field-mapping adaptation
4. **View gating pattern** — port `isViewAvailable` logic
5. **View registry runtime registration** — extend current `registry.ts`

The key insight from Lean-Architect is **separation of concerns**: the engine should only decide *which* view to show, not also manage filters, actions, tabs, pagination, and imports. That's the single most impactful architectural change to make.
