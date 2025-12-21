# Dynamic Views Module

The `DynamicViews` module is responsible for rendering entity data in various visual formats. It is designed to be highly configurable, allowing developers to define how data is displayed without writing custom React components for every view.

## Core Component: `DynamicViews`

**Location**: `src/components/DynamicViews/index.tsx`

The `DynamicViews` component is the entry point. It accepts props like `entityType` and `entitySchema` and handles the following:

1.  **Configuration Loading**: Fetches view configuration using `useViewConfigEnhanced`.
2.  **Data Fetching**: Uses `useQuery` to fetch data from Supabase via the `core_get_entity_data_v30` RPC function.
3.  **State Management**: Manages pagination, sorting, filtering, and active tabs.
4.  **View Switching**: Allows users to switch between different view types (Table, Grid, Kanban, etc.).

### Supported View Types

The module supports several view types, loaded dynamically via `registry.ts`:

-   **Table View** (`TableView.tsx`): A standard Ant Design table with sortable and filterable columns.
-   **Grid View** (`GridView.tsx`): A card-based layout useful for visual items.
-   **Kanban View** (`KanbanView.tsx`): A drag-and-drop board for workflow stages.
-   **Calendar View** (`CalendarView.tsx`): Displays items on a calendar based on date fields.
-   **Gantt View** (`GanttChart.tsx`): A timeline view for project management.
-   **Map View** (`MapViewComponent.tsx`): Displays items on a map using geospatial data.
-   **Dashboard View** (`DashboardView.tsx`): Renders a collection of widgets.

## Key Features

### 1. Global Filters
The `GlobalFilters` component allows users to filter data across the entire view. It supports:
-   Text search.
-   Date range filtering.
-   Multi-select for enums.
-   Custom filter logic defined in metadata.

### 2. Tabs
Views can be organized into tabs. Tabs are configured via the `tabOptions` prop or metadata. Each tab can have its own:
-   Filters (e.g., "My Tickets", "All Tickets").
-   Hidden fields.
-   Specific query configurations.

### 3. Import/Export
The `ImportExport` component allows users to:
-   Export current view data to CSV/Excel.
-   Import data from external files (bulk upload).

### 4. Zero State
The `ZeroStateContent` component provides a user-friendly interface when no data is available, often including prompts to create new items or adjust filters.

## Usage Example

```tsx
import DynamicViews from './components/DynamicViews';

const TicketsPage = () => {
  return (
    <DynamicViews
      entityType="tickets"
      entitySchema="public"
      defaultFilters={{ status: 'open' }}
      tabOptions={[
        { key: 'all', label: 'All Tickets' },
        { key: 'my', label: 'My Tickets', condition: { field: 'assignee_id', valueFromContext: 'user_id' } }
      ]}
    />
  );
};
```
