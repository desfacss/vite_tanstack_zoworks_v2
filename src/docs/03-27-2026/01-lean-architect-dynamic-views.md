# Lean-Architect: Dynamic Views Platform — Architecture Documentation

> **Date:** 2026-03-27  
> **Project:** `Lean-Architect` (inside `vite_tanstack_zoworks_v2/Lean-Architect`)  
> **Type:** Config-driven Dynamic Views POC

---

## 1. Overview

Lean-Architect is a **config-driven Dynamic Views Platform** — a monorepo POC demonstrating how a single React engine can render the same entity data in **9 different view types** (Table, Kanban, Grid, Calendar, Gantt, List, Gallery, Map, Custom), switching views dynamically without any code changes — purely through JSON config.

### Stack
| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces |
| Frontend | React 19 + Vite + shadcn/ui + Tailwind v4 |
| State | Zustand (per-entity view state) |
| Data Fetching | TanStack Query (React Query v5) |
| API | Express 5 (in-memory mock data) |
| API Types | OpenAPI spec → Orval codegen → Zod schemas |
| Routing | Wouter |
| DnD | dnd-kit (Kanban) |
| Map | Leaflet + react-leaflet |
| Table | TanStack Table v8 |

---

## 2. Monorepo Structure

```
Lean-Architect/
├── artifacts/
│   ├── api-server/              # Express 5 API (port 8080) — in-memory data
│   │   └── src/
│   │       ├── data/mockData.ts  # EntityConfig + NormalizedRecord arrays
│   │       └── routes/entity.ts  # /api/entity/data, /api/config/:entity
│   ├── dynamic-views/           # React Vite frontend
│   │   └── src/
│   │       ├── App.tsx           # Route: /:entity → EntityPage
│   │       ├── store.ts          # Zustand: useViewStore, useUIStore, useThemeStore
│   │       ├── view-registry.ts  # Custom view registry (registerView/getView)
│   │       ├── components/
│   │       │   ├── engine/ViewEngine.tsx     # Core: config → view renderer
│   │       │   ├── layout/AppLayout.tsx      # Sidebar + entity navigation
│   │       │   ├── drawer/RecordDrawer.tsx   # Notion-like record editor
│   │       │   └── views/
│   │       │       ├── TableView.tsx
│   │       │       ├── KanbanView.tsx
│   │       │       ├── GanttView.tsx
│   │       │       ├── CalendarView.tsx
│   │       │       ├── GridView.tsx
│   │       │       ├── ListView.tsx
│   │       │       ├── GalleryView.tsx
│   │       │       ├── MapView.tsx
│   │       │       └── CustomView.tsx
│   │       └── hooks/
│   │           └── use-entity.ts  # React Query wrappers
│   └── mockup-sandbox/          # Vite component preview (port 5173)
├── lib/
│   ├── api-spec/openapi.yaml    # OpenAPI spec — single source of truth
│   ├── api-client-react/        # Generated React Query hooks + types
│   └── api-zod/                 # Generated Zod schemas
└── pnpm-workspace.yaml
```

---

## 3. Core Concept: EntityConfig

Every entity in Lean-Architect is described by an **`EntityConfig`** object — the single source of truth for how that entity behaves across all views.

### EntityConfig Shape

```typescript
interface EntityConfig {
  entity: string;           // unique key e.g. "tasks", "crm.leads"
  label: string;            // display name
  description?: string;
  icon: string;             // lucide icon name
  group: string;            // sidebar group e.g. "Work", "CRM"
  color: string;            // brand color hex

  // Field mappings (how entity data maps to normalized slot)
  titleField: string;       // which field is the "title"
  statusField: string;
  dateField: string | null;
  endDateField: string | null;
  assigneeField: string | null;
  priorityField: string | null;

  // Table columns definition
  columns: ColumnConfig[];

  // Available views for this entity
  views: ViewConfig[];
  defaultView: string;      // which view to show first

  // Enumerated option sets
  statusOptions: { value, label, color }[];
  priorityOptions: { value, label, color, icon? }[];
  teamMembers: TeamMember[];

  // Feature flags per entity
  features: {
    checklist: boolean;
    notes: boolean;
    assignees: boolean;
    dependencies: boolean;
    attachments: boolean;
    timeTracking: boolean;
  };
}
```

### ViewConfig Shape

Each entry in `EntityConfig.views` is a `ViewConfig`:

```typescript
interface ViewConfig {
  type: 'table' | 'kanban' | 'grid' | 'calendar' | 'gantt' | 'list' | 'gallery' | 'map' | 'custom';
  label: string;
  icon: string;

  // View-specific optional config
  groupBy?: string;           // Required for kanban
  dateField?: string;         // Used by gantt, calendar
  endDateField?: string;      // Used by gantt
  imageField?: string;        // Used by gallery
  priceField?: string;
  subtitleField?: string;
  ratingField?: string;
  locationField?: string;
  badgeField?: string;
  latField?: string;          // Used by map
  lngField?: string;          // Used by map
  customViewKey?: string;     // Used by custom view type
}
```

---

## 4. The 5 Entities & Their View Configurations

### 4.1 Tasks (`Work` group)

```json
{
  "entity": "tasks",
  "color": "#6366f1",
  "defaultView": "kanban",
  "views": [
    { "type": "table" },
    { "type": "kanban", "groupBy": "status" },
    { "type": "list" },
    { "type": "gantt", "dateField": "startDate", "endDateField": "endDate" },
    { "type": "calendar", "dateField": "endDate" }
  ]
}
```

**Views available:** Table, Kanban, List, Gantt, Calendar  
**Default:** Kanban  
**Special:** Gantt uses dependency arrows (FS/SS/FF/SF types)

---

### 4.2 Projects (`Work` group)

```json
{
  "entity": "projects",
  "color": "#f59e0b",
  "defaultView": "gantt",
  "views": [
    { "type": "gantt", "dateField": "startDate", "endDateField": "endDate" },
    { "type": "table" },
    { "type": "grid" },
    { "type": "kanban", "groupBy": "status" }
  ]
}
```

**Views available:** Gantt (default), Table, Cards, Board  
**Special:** Budget column in table (`originalData.budget` as currency type)

---

### 4.3 CRM Leads (`CRM` group)

```json
{
  "entity": "crm.leads",
  "color": "#10b981",
  "defaultView": "kanban",
  "views": [
    { "type": "kanban", "groupBy": "status" },
    { "type": "table" },
    { "type": "grid" },
    { "type": "list" }
  ]
}
```

**Views available:** Pipeline (Kanban), Table, Cards, List  
**Special:** Dotted entity key (`crm.leads`) — Express handles path params correctly

---

### 4.4 Real Estate Listings (`Real Estate` group)

```json
{
  "entity": "real-estate.listings",
  "color": "#0ea5e9",
  "defaultView": "gallery",
  "views": [
    { "type": "gallery", "imageField": "originalData.imageUrl", "priceField": "originalData.price", ... },
    { "type": "table" },
    { "type": "map", "latField": "originalData.lat", "lngField": "originalData.lng" },
    { "type": "list" },
    { "type": "kanban", "groupBy": "status" }
  ]
}
```

**Views available:** Gallery (default), Table, Map, List, Board  
**Special:** Gallery + Map both need field mappings in ViewConfig; Map requires lat/lng fields

---

### 4.5 E-Commerce Products (`E-Commerce` group)

```json
{
  "entity": "ecommerce.products",
  "color": "#f97316",
  "defaultView": "gallery",
  "views": [
    { "type": "gallery", "imageField": "originalData.imageUrl", ... },
    { "type": "table" },
    { "type": "grid" },
    { "type": "list" },
    { "type": "kanban", "groupBy": "status" }
  ]
}
```

**Views available:** Catalog (Gallery), Table, Cards, List, By Stock (Kanban)  
**Special:** No date fields, no assignees — those features disabled in `features` flags

---

## 5. The ViewEngine — Core Renderer

### File: `artifacts/dynamic-views/src/components/engine/ViewEngine.tsx`

The `ViewEngine` is the **orchestration hub** — it:
1. Fetches entity config via `useEntityConfig(entity)`
2. Reads store state (activeView, search, filters, pagination)
3. Applies **smart view gating** — only surfaces views whose data requirements are met
4. Renders the active view component
5. Manages the view-switcher tab bar

```
URL /:entity
    ↓
EntityPage → ViewEngine(entity)
    ↓
useEntityConfig(entity) → EntityConfig (from /api/config/:entity)
    ↓
useEntityDataQuery(req)  → NormalizedRecord[] (from /api/entity/data)
    ↓
isViewAvailable(view, data) → filters views
    ↓
ViewSwitcher Tab Bar (available + gated/disabled views)
    ↓
{currentView === 'table'   && <TableView   data config />}
{currentView === 'kanban'  && <KanbanView  data config entity />}
{currentView === 'grid'    && <GridView    data config />}
{currentView === 'calendar'&& <CalendarView data config />}
{currentView === 'gantt'   && <GanttView  data config />}
{currentView === 'list'    && <ListView   data config />}
{currentView === 'gallery' && <GalleryView data config />}
{currentView === 'map'     && <MapView    data config />}
{currentView === 'custom'  && <CustomView data config entity view />}
    ↓
RecordDrawer (Notion-like editor, always mounted)
```

### Smart View Gating Logic

```typescript
function isViewAvailable(view: ViewConfig, data: NormalizedRecord[]): boolean {
  switch (view.type) {
    case 'gantt':
      // Needs records with both dates AND dependencies
      return data.some(r => r.startDate && r.endDate) &&
             data.some(r => r.dependencies && r.dependencies.length > 0);
    case 'calendar':
      return data.some(r => r.startDate || r.endDate);
    case 'map':
      // Needs lat/lng field mappings in ViewConfig
      return !!(view.latField && view.lngField);
    case 'kanban':
      return !!(view.groupBy); // needs groupBy field
    default:
      return true; // table, grid, list, gallery always available
  }
}
```

**Gated (unavailable) views appear disabled in the tab bar with a tooltip.**

---

## 6. State Management — Zustand Stores

### File: `src/store.ts`

Three stores, cleanly separated:

#### `useViewStore` — Per-entity view state

```typescript
interface EntityViewState {
  activeView: string;    // which view is shown
  search: string;
  filters: FilterCondition[];
  sort: SortCondition[];
  page: number;
  pageSize: number;      // default 50
}

// entityStates is a Record<entityKey, EntityViewState>
// Actions: setActiveView, setSearch, addFilter, removeFilter, setSort, setPage, resetEntity
```

State persists across entity navigations (switching from Tasks to CRM back to Tasks keeps view and filters).

#### `useUIStore` — Drawer state

```typescript
interface UIState {
  selectedRecord: NormalizedRecord | null;
  isDrawerOpen: boolean;
  openDrawer(record: NormalizedRecord | null): void;
  closeDrawer(): void;
}
```

#### `useThemeStore` — Dark/light theme

```typescript
interface ThemeState {
  isDark: boolean;
  toggleTheme(): void; // also toggles document.documentElement.classList
}
```

---

## 7. Custom View Registry Pattern

### File: `src/view-registry.ts`

Allows registering any React component as a named "custom" view:

```typescript
// Register a custom view component
registerView('my-product-view', MyProductView);

// Then in EntityConfig.views:
{ type: 'custom', customViewKey: 'my-product-view' }
```

**Custom view component contract:**
```typescript
interface ViewComponentProps {
  data: NormalizedRecord[];
  config: EntityConfig;
  entity: string;
  onRecordOpen: (record: NormalizedRecord) => void;
  onNewRecord: () => void;
}
```

---

## 8. Normalized Record Shape

All entities share a common `NormalizedRecord` shape — this is what makes multi-view rendering possible without per-entity view code:

```typescript
interface NormalizedRecord {
  id: string;
  title: string;
  status: string;
  assignees: TeamMember[];
  startDate: string | null;
  endDate: string | null;
  priority: string;
  tags: string[];
  progress: number | null;
  dependencies: Dependency[];
  checklists: Checklist[];
  notes: string;
  originalData: Record<string, any>;  // entity-specific raw data
}
```

**Key insight:** `originalData` carries entity-specific fields (e.g., `lat`, `lng`, `price`, `imageUrl` for listings). ViewConfig field mappings (e.g., `imageField: "originalData.imageUrl"`) tell each view component which `originalData` key to read.

---

## 9. Data Flow (API → View)

```
EntityConfig (from /api/config/:entity)
    ↓ defines
ViewConfig[] + ColumnConfig[] + FieldMappings

EntityDataRequest → /api/entity/data
    { entity, search, filters, sort, page, pageSize }
    ↓ returns
NormalizedRecord[]

ViewEngine resolves:
    activeView ← useViewStore (or config.defaultView on first visit)
    ↓
ViewComponent receives:
    data: NormalizedRecord[]
    config: EntityConfig   ← column defs, field mappings, status options etc.

ViewComponent uses config to render:
    - TableView: config.columns → TanStack Table columnDefs
    - KanbanView: config.views[kanban].groupBy → group by status
    - GanttView: config.views[gantt].dateField/endDateField
    - GalleryView: config.views[gallery].imageField, priceField, ratingField
    - MapView: config.views[map].latField, lngField
```

---

## 10. The 9 View Implementations

| View | Key Tech | Special Features |
|------|---------|-----------------|
| **TableView** | TanStack Table v8 | Sortable columns, status badges, currency, progress bars, tags, assignee avatars |
| **KanbanView** | dnd-kit | Drag-and-drop columns grouped by `config.groupBy`, priority indicators |
| **GridView** | CSS Grid | Responsive card grid, status+priority badges |
| **CalendarView** | Custom SVG | Monthly calendar, record events colored by status |
| **GanttView** | SVG | Dependency arrows (FS/SS/FF/SF), Day/Week/Month zoom, today marker, progress overlays, late detection (red), assignee avatars |
| **ListView** | Flat list | Compact: status, priority, assignee, date |
| **GalleryView** | Card grid | Image overlay, price badge, star ratings, status/type badges, like button, grid/compact toggle |
| **MapView** | Leaflet + react-leaflet | CartoDB tiles (light/dark), colored numbered pins, popups with "Open Record", sidebar list |
| **CustomView** | Registry lookup | `getView(customViewKey)` → renders any registered component |

---

## 11. AppLayout — Sidebar Navigation

The sidebar is **data-driven** — it reads `useEntityConfigs()` (the list API) to populate nav items:

- Groups entities by `EntityConfig.group`  
- Collapsible groups with count badges  
- Entity search bar (live filter)  
- Collapsible to icon-only mode with tooltips  
- Mobile hamburger overlay  
- Each nav item is `Link href="/:entity"` → triggers `EntityPage` which mounts `ViewEngine`

---

## 12. RecordDrawer — Notion-like Editor

Triggered by clicking any record in any view. Features:
- Status + priority inline popovers
- Assignee picker (toggle multi-select)
- Tags (click to remove, add new)  
- Progress bar (driven by checklist completion)
- Notes textarea (debounced auto-save 800ms)
- Checklists CRUD
- Delete with confirm dialog
- "New record" creates with entity defaults

---

## 13. How to Run Lean-Architect Locally

> **Prerequisite:** Node.js v18+, pnpm installed globally (`npm i -g pnpm`)

### Step 1 — Install dependencies

```bash
cd Lean-Architect
pnpm install
```

### Step 2 — Start the API server (Terminal 1)

```bash
pnpm --filter @workspace/api-server run dev
# Runs on http://localhost:8080
```

### Step 3 — Start the frontend (Terminal 2)

```bash
pnpm --filter @workspace/dynamic-views run dev
# Runs on http://localhost:5173 (or next available port)
```

### Step 4 — Open in browser

```
http://localhost:5173
```

You'll be redirected to `/tasks` and see the Kanban view by default.

### Optional — Regenerate API client from OpenAPI spec

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Optional — Typecheck entire workspace

```bash
pnpm run typecheck
```

---

## 14. Key Design Principles

1. **Config-first**: Add a new entity by adding to `entityConfigs` in `mockData.ts` — zero new components needed
2. **Smart gating**: Views are surfaced only when data supports them (no empty Gantt charts)
3. **Normalized data**: All entities normalize to the same `NormalizedRecord` shape, all views code once
4. **Per-entity state**: Zustand keeps each entity's view+filter+sort+page independently
5. **Extensible**: Custom view registry allows registering domain-specific views without modifying the engine
6. **API contract**: OpenAPI spec → Zod → typed API client → typed hooks; swapping backend (mock → Supabase) requires only changing route handlers
