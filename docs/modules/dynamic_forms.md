# Dynamic Forms Module

The `DynamicForm` module provides a powerful way to generate forms from JSON schemas, eliminating the need to write boilerplate form code for every entity. It is built on top of `react-jsonschema-form` (RJSF) and Ant Design.

## Core Component: `DynamicForm`

**Location**: `src/components/common/DynamicForm/index.tsx`

The `DynamicForm` component takes a schema definition and renders a fully functional form. It handles validation, data binding, and submission.

### Key Props

-   `schemas`: An object containing:
    -   `data_schema`: The JSON Schema defining the data structure (fields, types, validation).
    -   `ui_schema`: The UI Schema defining the layout and widget customization.
    -   `db_schema`: Optional metadata about the database table.
-   `formData`: Initial data to populate the form (for editing).
-   `onFinish`: Callback function triggered upon successful submission.
-   `updateId`: The ID of the record being updated (if applicable).

## Features

### 1. Dynamic Enums & Foreign Keys
One of the most powerful features is the ability to fetch enum options dynamically from the database. This is configured in the schema using the `enum` property with a special object structure:

```json
"role_id": {
  "type": "string",
  "enum": {
    "table": "roles",
    "column": "id",
    "schema": "public",
    "display_column": "name"
  }
}
```

The `DynamicForm` component intercepts this configuration and fetches the data from Supabase, populating the dropdown options automatically.

### 2. Layout Customization
The module supports a custom `ui:layout` property in the `ui_schema` to define grid layouts and multi-page forms.

-   **Grid Layout**: Define rows and columns.
-   **Multi-page**: Split the form into a wizard-style interface with "Next" and "Previous" buttons.

### 3. Custom Widgets & Templates
-   **Widgets**: Custom widgets for specific data types (e.g., date pickers, file uploads).
-   **Templates**: Custom field and object templates to control the rendering of form elements.

### 4. Workflow Integration
The form can dynamically fetch workflow stages from the `dynamic_workflow_definitions` table, allowing for context-aware status transitions.

## Usage Example

```tsx
import DynamicForm from './components/common/DynamicForm';
import userSchema from '../../schemas/users_view_schema.json';

const UserForm = () => {
  const handleFinish = (data) => {
    console.log('Form submitted:', data);
  };

  return (
    <DynamicForm
      schemas={{
        data_schema: userSchema.data_config,
        ui_schema: userSchema.ui_schema
      }}
      onFinish={handleFinish}
    />
  );
};
```
