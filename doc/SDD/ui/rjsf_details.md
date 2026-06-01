# React JSON Schema Form (RJSF) Test Bench Reference

This document explains the functionality, related database tables, and RPC functions associated with the `/rjsf` test bench page.

---

## 1. Overview of `/rjsf` Route

The RJSF Test Bench (`src/pages/TestRJSFCoreForm.tsx`) is a developer utility designed to dynamically generate, customize, layout, preview, and persist metadata-driven JSON forms. It allows developers to construct layout-configured forms and test fields binding without writing component codes.

### Key Capabilities
- **Dynamic Form Generation**: Reads columns metadata from any database entity and generates a compliant React JSON Schema Form definition.
- **Visual Fields Manager**: Provides instant controls to add new columns, delete columns, or switch UI input widgets (e.g., plain input, custom lookups, tags, multi-select, date picker, file upload, switch).
- **Custom Button Configurator**: Appends custom submission buttons with pre-configured transaction payloads.
- **Interactive Multi-Page Layout Manager**: Uses the `PageManager` layout editor component to partition forms into separate sections or paginated steps.
- **Real-time Live Preview**: Renders the form instantly inside the UI using `RJSFCoreForm`.

---

## 2. Related Database Tables

The test bench interacts with three tables under the `core` schema in Supabase:

| Table Name | Schema | Read / Write | Role in RJSF Test Bench |
| :--- | :--- | :--- | :--- |
| `entities` | `core` | Read | Reads the `v_metadata` JSONB column which contains columns definitions, display titles, data types, and foreign key relationships to populate form configuration options. |
| `view_configs` | `core` | Read | Scans active registered entity keys to populate the entity selection dropdown. |
| `forms` | `core` | Read & Write | Persists or updates the customized layout configuration. The table saves the `data_schema` (schema types), `ui_schema` (styling, widgets, layouts, buttons), and `data_config` (custom properties). |

---

## 3. Database Functions (RPC)

The test bench calls a primary RPC database generator function to bootstrap the schema:

### `core.api_new_generate_form_schema_v3`
- **Purpose**: Dynamically constructs a schema bundle containing the `data_schema`, `ui_schema`, and `db_schema` from an entity's metadata tables.
- **Parameters**:
  - `p_entity_name` (string): The dot-separated entity name (e.g. `crm.contacts`).
  - `p_options` (JSON): Generation switches, including:
    - `mode` (string): `'minimal'` (essential fields), `'recommended'` (standard views), or `'all'` (every field).
    - `includeForeignKeyFields` (boolean): Include relational inputs.
    - `includeSystemFields` (boolean): Toggle primary key tracking columns (e.g. `id`, `created_at`).
    - `includeReadOnlyFields` (boolean): Toggle generated fields.
    - `expandJsonbFields` (boolean): Expand JSON sub-columns.
    - `generateRequired` (boolean): Parse non-nullable properties to validation tags.

---

## 4. Frontend Helper Functions & Logic

The test bench component utilizes several key internal javascript helper algorithms:

1. **`cleanupUiSchema()`**: A recursive function that traverses the generated `ui_schema` object and repairs any legacy widget assignments (specifically transforming invalid `'input'` widgets to generic `'text'` elements) to prevent RJSF validation warnings.
2. **`getFlattenedFields()`**: A deep-traversal properties reader that flattens nested schema objects (e.g., JSONB properties like `address.street.city`) into a single-depth list displaying indentation levels. This feeds the form columns sidebar editor.
3. **`handleWidgetChange()`**: Reactively updates the schema code state when a widget is altered. For example, if a column is switched to `checkbox`, it changes the `data_schema` parameter type to `boolean` dynamically.
4. **`SelectCustomWidget` Bindings**: Handles lookup configurations by writing database metadata parameters directly to the data schema's `enum` field (specifying lookup schemas, tables, target columns, and cascading dependency filters).
