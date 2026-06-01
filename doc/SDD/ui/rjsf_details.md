# React JSON Schema Form (RJSF) Test Bench Reference

This document explains the functionality, related database tables, and RPC functions associated with the `/rjsf` (metadata-based) and `/rjsf-gen` (JSON-based) form generation pages.

---

## 1. Overview of Routes

### RJSF Test Bench (`/rjsf`)
- **File**: [TestRJSFCoreForm.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/pages/TestRJSFCoreForm.tsx)
- **Purpose**: A developer utility designed to dynamically generate, customize, layout, preview, and persist forms using columns metadata from registered database entities.

### RJSF JSON Generator Test Bench (`/rjsf-gen`)
- **File**: [TestRJSFGenForm.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/pages/TestRJSFGenForm.tsx)
- **Purpose**: A developer utility designed to generate RJSF form schemas dynamically from arbitrary JSON data inputs by invoking a dedicated database RPC function (`core.utils_form_gen`).

---

## 2. Related Database Tables

The test benches interact with tables under the `core` schema in Supabase:

| Table Name | Schema | Read / Write | Role in RJSF Test Bench |
| :--- | :--- | :--- | :--- |
| `entities` | `core` | Read | Reads the `v_metadata` JSONB column which contains columns definitions, display titles, data types, and foreign key relationships to populate form configuration options in `/rjsf`. |
| `view_configs` | `core` | Read | Scans active registered entity keys to populate the entity selection dropdown in `/rjsf`. |
| `forms` | `core` | Read & Write | Persists or updates the customized layout configuration. Saves the `data_schema` (schema types), `ui_schema` (styling, widgets, layouts, buttons), and `data_config` (custom properties). |

---

## 3. Database Functions (RPC)

### RJSF Test Bench (`/rjsf`): `core.api_new_generate_form_schema_v3`
- **Purpose**: Dynamically constructs a schema bundle containing the `data_schema`, `ui_schema`, and `db_schema` from an entity's metadata tables.
- **Parameters**:
  - `p_entity_name` (string): The dot-separated entity name (e.g. `crm.contacts`).
  - `p_options` (JSON): Generation switches (mode, system fields, foreign keys, readonly fields, expanded JSONB, required fields).

### RJSF JSON Generator Test Bench (`/rjsf-gen`): `core.utils_form_gen`
- **Purpose**: Generates form schemas dynamically based on a pasted raw JSON data object representing the fields.
- **Parameters**:
  - `p_json_data` (JSONB): A sample JSON payload representing the database fields structure.
  - `p_options` (JSONB): Custom options such as:
    ```json
    {
      "includeSystemFields": false
    }
    ```
- **Returns**: A JSONB object containing:
  - `data_schema`: RJSF schema types and structures.
  - `ui_schema`: Display controls, layout configurations, and component widgets.
  - `db_schema`: Mapping information and database metadata configurations.

---

## 4. Frontend Helper Functions & Logic

Both test bench components utilize identical frontend helpers:

1. **`cleanupUiSchema()`**: A recursive function that traverses the generated `ui_schema` object and repairs any legacy widget assignments (specifically transforming invalid `'input'` widgets to generic `'text'` elements) to prevent RJSF validation warnings.
2. **`getFlattenedFields()`**: A deep-traversal properties reader that flattens nested schema objects (e.g., JSONB properties like `address.street.city`) into a single-depth list displaying indentation levels. This feeds the form columns sidebar editor.
3. **`handleWidgetChange()`**: Reactively updates the schema code state when a widget is altered. For example, if a column is switched to `checkbox`, it changes the `data_schema` parameter type to `boolean` dynamically.
4. **`SelectCustomWidget` Bindings**: Handles lookup configurations by writing database metadata parameters directly to the data schema's `enum` field (specifying lookup schemas, tables, target columns, and cascading dependency filters).
