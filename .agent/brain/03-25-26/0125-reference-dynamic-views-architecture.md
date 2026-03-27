# Dynamic Views Architecture

**Session**: 2026-03-25 ~01:25 IST

## 1. Core Concept
DynamicViews is a highly configurable, metadata-driven React component that acts as the universal render engine for entity data (e.g., tickets, users, projects) within the platform. Instead of hardcoding UI for each database table or business entity, DynamicViews consumes configuration (`viewConfig` and `v_metadata`) to dynamically generate various data representations. It abstracts away common boilerplate such as data fetching, filtering, pagination, routing to specific views, and layout toggling.

## 2. Data Structure & Flow
- **Configuration Driven (`useViewConfigEnhanced`)**: It fetches structural metadata (`viewConfig`) and general layout settings (`config`) specific to an `entityType`. This includes what columns to show, available views, actions, and custom filters.
- **Data Fetching via RPC**: A singular, powerful RPC call (`core_get_entity_data_v30` or similar) handles data retrieval. It pushes sorting, cursor-based pagination, global search, and complex filtering (nested, joined, or JSONB based) directly to the PostgreSQL database level for optimal performance.
- **State & Preferences Management (`useViewState` & `useAuthStore`)**:
  - Handles persistence of user preferences, such as the currently active view (table, kanban, etc.), active filters, pagination state, and column visibility, saving them directly to the user's view preferences.
- **Nested Context (`useNestedContext`)**: Allows DynamicViews to act as child components. For example, rendering a list of orders inside a customer detail drawer. It passes a `parentRecord` for tightly scoped, relational data loads.

## 3. Available Views
Views are loaded lazily via a `registry.ts` to optimize frontend bundle sizes.
- **TableView**: A robust data table with dynamic columns, auto-renderers for different data types (dates, booleans, arrays), resizable/hidable columns, sorting, and inline row actions.
- **KanbanView**: Renders data as cards within lanes. It integrates with `@hello-pangea/dnd` for drag-and-drop stage progression. It can flexibly group by statically mapped types or dynamic workflow stages (`workflowDefinitions`). Updates run via an RPC Upsert.
- **GridView**: Similar to Kanban but optimized for a matrix-style card layout without drag-and-drop stages.
- **GanttView & CalendarView**: Time-based representations for scheduled entities.
- **MapView**: Geographical projection of entities with location data.
- **DashboardView / MetricsView**: Analytical aggregations and chart-based representations of the filtered dataset.

## 4. Potential Enhancements
- **Row Virtualization**: Introduce row virtualization in `TableView` and `KanbanView` for extremely large datasets that are loaded into the client to maintain 60fps scrolling.
- **Real-time Subscriptions**: Integrate Supabase Realtime to update view rows and kanban cards instantly when underlying entities are modified by other users, removing the need for manual refreshes.
- **Advanced Filtering UI**: Enhance the `GlobalFilters` with a visual query builder interface, allowing users to create deeper `AND/OR` nested conditions seamlessly.
- **No-Code View Configuration UI**: Build a frontend editor allowing power users or admins to customize the JSON configuration (columns, colors, layout, default filters) directly from the UI without backend metadata changes.

---
**Modified Files:** None
**Created Files:** `.agent/brain/03-25-26/0125-reference-dynamic-views-architecture.md`
