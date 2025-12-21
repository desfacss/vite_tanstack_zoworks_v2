# Configuration & Metadata Module

The application's flexibility is driven by a robust configuration and metadata system. This allows the behavior of views and forms to be modified without changing the application code.

## Metadata Schemas

**Location**: `src/schemas/`

Schemas are JSON files (or database records) that define the structure and behavior of entities. A typical schema file (e.g., `users_view_schema.json`) contains:

### 1. Data Configuration (`data_config`)
Defines the data structure, similar to a standard JSON Schema.
-   **Properties**: Fields available for the entity.
-   **Types**: Data types (string, boolean, number, etc.).
-   **Validation**: Required fields, min/max length, patterns.

```json
"data_config": {
  "type": "object",
  "required": ["name", "role_id"],
  "properties": {
    "name": { "type": "string", "title": "Name" },
    "role_id": { "type": "string", "title": "Role" }
  }
}
```

### 2. UI Configuration (`ui_schema`)
Defines how the data should be presented in forms.
-   **Widgets**: Custom widgets (e.g., `select`, `date`, `textarea`).
-   **Placeholders**: Input placeholders.
-   **Layout**: Grid configuration and field ordering.
-   **Submit Buttons**: Custom action buttons.

```json
"ui_schema": {
  "role_id": {
    "ui:widget": "select",
    "ui:placeholder": "Select role"
  }
}
```

### 3. View Configuration (`viewConfig`)
Defines how the entity is displayed in `DynamicViews`.
-   **Columns**: Which fields to show in the table/grid.
-   **Filters**: Default filters and available filter options.
-   **Sorting**: Default sort order.
-   **Tabs**: Configuration for different view tabs.

## Database Configuration

In addition to static JSON files, configuration can be stored in the Supabase database, typically in tables like `y_view_config`. This allows for:
-   **Runtime Updates**: Change configuration without redeploying the app.
-   **Role-based Config**: Different configurations for different user roles.

## Usage

The `useViewConfigEnhanced` hook (in `src/components/DynamicViews/hooks/useEntityConfig.ts`) is responsible for merging static schemas with database configuration to provide the final configuration object used by the components.
