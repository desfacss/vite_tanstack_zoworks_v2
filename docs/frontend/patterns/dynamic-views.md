# DynamicViews Pattern

> Config-driven views for entities — the core of the meta-driven UI.

---

## Philosophy

> **90% of views work via DynamicViews + config.**
> 
> Modules only contain custom components for complex UIs.

---

## File Structure

```
src/core/components/DynamicViews/
├── index.tsx              # Main orchestrator (1500 lines)
├── registry.ts            # Lazy view loading
├── types.ts               # Shared types
│
├── TableView.tsx          # Table rendering
├── GridView.tsx           # Card grid
├── KanbanView.tsx         # Kanban board
├── MapViewComponent.tsx   # Leaflet map
├── GanttChart.tsx         # Gantt timeline
├── DashboardView.tsx      # Dashboard widgets
├── DashboardEditor.tsx    # Dashboard editing
├── DashboardPage.tsx      # Dashboard page
├── MetricsView.tsx        # Metrics display
├── MetricChartWidget.tsx  # Chart widget
│
├── GlobalFilters.tsx      # Filter bar with overflow
├── GlobalActions.tsx      # Primary + registry actions
├── RowActions.tsx         # Row-level actions
├── ImportExport.tsx       # Import/export functionality
├── BulkUpload.tsx         # Bulk import
├── ZeroStateContent.tsx   # Empty state UI
│
├── calendar/              # Calendar views
│   ├── MobileCalendarView.tsx
│   └── ...
│
└── hooks/
    ├── useViewState.ts       # View preference persistence
    ├── useEntityConfig.ts    # Config fetching
    ├── useFormConfig.ts      # Form config
    └── ...
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      DYNAMICVIEWS COMPONENT                      │
├─────────────────────────────────────────────────────────────────┤
│  Props:                                                          │
│  - entityType: string                                            │
│  - entitySchema?: string                                         │
│  - tabOptions?: TabConfig[]                                      │
│  - defaultFilters?: Record<string, any>                         │
│  - parentRecord?: Record<string, any>                           │
│  - detailView?: boolean                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CONFIGURATION                               │
│  useViewConfigEnhanced → identity.entity_configs                 │
│  - config: available_views, default_view, global_actions        │
│  - viewConfig: tableview.fields, filters, metadata              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CURSOR-BASED PAGINATION                     │
│  - cursorStack: (string | null)[]                               │
│  - currentPageIndex: number                                      │
│  - hasMore: boolean                                              │
│  - RPC: core.api_fetch_entity_records                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      VIEW COMPONENTS                             │
│  Lazy-loaded via loadView(viewType):                            │
│  - TableView, GridView, KanbanView, etc.                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Props Interface

```typescript
interface DynamicViewsProps {
  /** Entity name (e.g., 'tickets', 'users') */
  entityType: string;
  
  /** Database schema. Defaults to 'public' */
  entitySchema?: string;
  
  /** Tab configuration for filtered views */
  tabOptions?: Array<{
    key: string;
    label: string;
    condition?: {
      field: string;
      value: any;
      filter_type?: string;
      valueFromContext?: string;
      join_table?: string;
    };
    hiddenFields?: string[];
    queryConfig?: Record<string, any>;  // Tab-specific RPC overrides
  }>;
  
  /** Default filters applied to all queries */
  defaultFilters?: Record<string, any>;
  
  /** Search configuration */
  searchConfig?: {
    serverSideFilters: string[];
    noDataMessage: string;
    searchButton: React.ReactNode;
  };
  
  /** Whether nested inside another component */
  detailView?: boolean;
  
  /** Parent record for nested views (e.g., orders for a customer) */
  parentRecord?: Record<string, any>;
}
```

---

## View Types

| View | Component | Key Features |
|------|-----------|--------------|
| `tableview` | `TableView.tsx` | Default, sortable, column visibility |
| `gridview` | `GridView.tsx` | Card-based, responsive grid |
| `kanbanview` | `KanbanView.tsx` | Drag-drop lanes, workflow stages |
| `calendarview` | `calendar/*.tsx` | Date-based, mobile responsive |
| `mapview` | `MapViewComponent.tsx` | Leaflet, lazy-loaded |
| `ganttview` | `GanttChart.tsx` | Timeline visualization |
| `dashboardview` | `DashboardView.tsx` | Widgets, metrics |

**View Restrictions:**
- **Top-level**: All views available
- **Nested (detailView)**: Only `tableview`, `gridview` allowed

```typescript
const restrictedViews = ['kanbanview', 'ganttview', 'calendarview', 'mapview', 'dashboardview'];
const filteredAvailableViews = isTopLevel 
  ? availableViews 
  : availableViews.filter(view => !restrictedViews.includes(view));
```

---

## Cursor-Based Pagination

**New Implementation** — Replaced offset-based pagination with cursor-based.

```typescript
// State
const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
const [currentPageIndex, setCurrentPageIndex] = useState(0);
const [hasMore, setHasMore] = useState(false);

// RPC Config
const rpcConfig = {
  pagination: {
    limit: pageSize,
    cursor: cursorStack[currentPageIndex] || null  // 🚀 Cursor instead of offset
  },
  // ...
};

// Response structure
return {
  data: data?.data || [],
  hasMore: data?.hasMore || false,
  nextCursor: data?.nextCursor || null
};
```

**Navigation Logic:**
```typescript
const handlePaginationChange = (page: number, newPageSize?: number) => {
  const targetIndex = page - 1;  // UI is 1-based

  if (targetIndex > currentPageIndex) {
    // NEXT: Push nextCursor to stack
    const nextCursor = tableData?.nextCursor;
    if (nextCursor) {
      setCursorStack(prev => {
        const newStack = [...prev];
        newStack[targetIndex] = nextCursor;
        return newStack;
      });
      setCurrentPageIndex(targetIndex);
    }
  } else if (targetIndex < currentPageIndex) {
    // PREV: Cursor already in stack
    setCurrentPageIndex(targetIndex);
  }
};
```

---

## GlobalFilters — Responsive Overflow

Inline filters with automatic overflow based on viewport width.

```typescript
// Tiered breakpoints
let MAX_VISIBLE = 4;
if (windowWidth < 1240) MAX_VISIBLE = 1;
else if (windowWidth < 1440) MAX_VISIBLE = 2;

const visibleFields = filteredFields.slice(0, MAX_VISIBLE);
const overflowFields = filteredFields.slice(MAX_VISIBLE);
```

**Features:**
- Dynamic filter types: `text`, `date-range`, `select`
- Column visibility toggle (Settings icon)
- Server-side filter support
- Reset functionality

---

## GlobalActions — Registry Integration

Actions from both config and registry.

```typescript
// From config
const globalActionsFromConfig = config?.global_actions || [];

// From registry (modules register their own actions)
const registeredActions = registry.getActionsForEntity(entityType, 'global');
```

**Primary Action Pattern:**
```tsx
<PrimaryAction
  label={primaryAction.label}
  onClick={handlePrimaryClick}
  dropdownItems={secondaryActions}  // Split button for multiple actions
/>
```

---

## Page Card Layout

DynamicViews should be wrapped in a `.page-card` (animated container):

```tsx
<div className="page-content layout-record">
  <PageActionBar>...</PageActionBar>
  <div className="page-card">
    <DynamicViews entityType="tickets" />
  </div>
</div>
```

**Note**: The layout mode (`layout-record` or `layout-canvas`) is applied to `.page-content`, and `.page-card` provides the animated container.

---

## ActionBar Integration

Uses the standardized ActionBar components:

```tsx
import { PageActionBar, ActionBarLeft, ActionBarRight, TabsComponent, Pagination } from '@/core/components/ActionBar';

<PageActionBar>
  <ActionBarLeft>
    {renderTabs()}  {/* TabsComponent or title */}
  </ActionBarLeft>
  <ActionBarRight>
    {isDesktop && globalFiltersElement}
    {globalActionsElement}
    {renderViewSelector()}  {/* Radio group or cycle button */}
  </ActionBarRight>
</PageActionBar>
```

---

## Zero State

When no data and no filters:

```tsx
{entities.length === 0 && !isDataLoading && currentPageIndex === 0 ? (
  <ZeroStateContent
    entityName={config?.details?.name}
    globalActionsElement={globalActionsElement}
    hasActiveFilters={hasActiveFilters}
    clearFilters={handleClearFilters}
  />
) : (
  <ViewComponent {...props} />
)}
```

---

## Basic Usage

```tsx
import DynamicViews from '@/core/components/DynamicViews';

// Simple usage
const TicketsPage = () => (
  <DynamicViews
    entityType="tickets"
    entitySchema="blueprint"
  />
);

// With tabs
const TicketsPage = () => {
  const { user } = useAuthStore();

  return (
    <DynamicViews
      entityType="tickets"
      entitySchema="blueprint"
      tabOptions={[
        { 
          key: '1', 
          label: 'My Tickets', 
          condition: { field: 'assignee_id', value: user?.id, filter_type: 'eq' } 
        },
        { key: '2', label: 'All Tickets' },
      ]}
    />
  );
};

// Nested in detail drawer
const OrdersTab = ({ parentRecord }) => (
  <DynamicViews
    entityType="orders"
    entitySchema="sales"
    detailView={true}
    parentRecord={parentRecord}
    defaultFilters={{ customer_id: parentRecord.id }}
  />
);
```

---

## Configuration (DB)

Stored in `identity.entity_configs`:

```json
{
  "entity_type": "tickets",
  "available_views": ["tableview", "kanbanview", "calendarview"],
  "default_view": "tableview",
  "global_actions": [
    { "form": "create_ticket", "label": "Create Ticket" }
  ],
  "details": {
    "name": "Tickets",
    "description": "Support tickets",
    "related_table": {
      "name": "ticket_logs",
      "key": "ticket_id"
    }
  }
}
```

View config in `identity.entity_view_configs`:

```json
{
  "tableview": {
    "fields": [
      { "fieldPath": "title", "label": "Title", "sortable": true },
      { "fieldPath": "status", "label": "Status", "filterable": true }
    ]
  },
  "general": {
    "filters": [
      { "name": "status", "type": "select", "label": "Status", "options": {...} },
      { "name": "created_at", "type": "date-range", "label": "Created" }
    ]
  },
  "metadata": [
    { "key": "id", "is_displayable": false },
    { "key": "title", "is_displayable": true, "display_name": "Title" }
  ]
}
```

---

## RPC Call

```typescript
const { data, error } = await supabase.schema('core').rpc('api_fetch_entity_records', {
  config: {
    entity_schema: 'blueprint',
    entity_name: 'tickets',
    organization_id: organization.id,
    sorting: { column: 'updated_at', direction: 'DESC' },
    pagination: { limit: 10, cursor: null },
    filters: [...],
    search: { value: 'search term', columns: ['title', 'description'] },
    metadata: viewConfig.metadata,
    include_jsonb: true,
    mode: 'fast'
  }
});

// Response
{
  data: [...],
  hasMore: true,
  nextCursor: "eyJpZCI6MTIzfQ=="
}
```

---

## Implementation Checklist

- [x] Cursor-based pagination (cursorStack)
- [x] Responsive filter overflow (tiered breakpoints)
- [x] Registry-based actions
- [x] ActionBar integration
- [x] View restrictions for nested views
- [x] Layout modes (record/canvas)
- [x] Zero state handling
- [x] View preference persistence

---

*Last Updated: 2025-12-25*
*Source: `src/core/components/DynamicViews/`*
