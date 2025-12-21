# DynamicForm Documentation

Comprehensive guide to the RJSF-based DynamicForm component and its configuration patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Schema](#data-schema)
3. [UI Schema](#ui-schema)
4. [Dynamic Selects (Enum)](#dynamic-selects)
5. [Field Dependencies](#field-dependencies)
6. [Widgets](#widgets)
7. [Layout System](#layout-system)
8. [Forms CSV Analysis](#forms-csv-analysis)

---

## Overview

**Location**: `src/components/common/DynamicForm/`

The DynamicForm component wraps [@rjsf/antd](https://rjsf-team.github.io/react-jsonschema-form/) with:
- Dynamic enum population from Supabase tables
- Field dependencies (cascading selects)
- Custom widgets for advanced inputs
- Multi-page form pagination
- Custom submit buttons with default values

---

## Data Schema

The `data_schema` follows JSON Schema format with extensions.

### Basic Field Types

| Type | Format | Description |
|------|--------|-------------|
| `string` | - | Text input |
| `string` | `email` | Email with validation |
| `string` | `date` | Date picker (YYYY-MM-DD) |
| `string` | `date-time` | DateTime picker |
| `integer` | - | Number input |
| `boolean` | - | Checkbox/Switch |
| `array` | - | List of items, can use `$ref` |

### Example
```json
{
  "type": "object",
  "required": ["name", "email"],
  "properties": {
    "name": { "type": "string", "title": "Name" },
    "email": { "type": "string", "title": "Email", "format": "email" },
    "start_date": { "type": "string", "title": "Start Date", "format": "date" },
    "allocated": { "type": "integer", "title": "Allocated", "default": 0 },
    "is_active": { "type": "boolean", "title": "Is Active" }
  }
}
```

---

## Dynamic Selects

Instead of hardcoded enums, use the `EnumSchema` object to fetch options from Supabase:

### EnumSchema Properties

| Property | Type | Description |
|----------|------|-------------|
| `table` | string | Table name (can include schema: `schema.table`) |
| `column` | string | Column to use as display label |
| `schema` | string? | Optional schema override |
| `no_id` | boolean? | If true, use column value as value (not id) |
| `filters` | FilterType[]? | Static filters on query |
| `dependsOn` | string? | Field that triggers refresh |
| `dependsOnField` | string? | Form field to get value from |
| `dependsOnColumn` | string? | Column to filter by |

### Examples

**Simple Select (uses ID as value, column as label):**
```json
"account_id": {
  "enum": { "table": "external.accounts", "column": "name" },
  "type": "string",
  "title": "Client"
}
```

**Select with Static Schema:**
```json
"location_id": {
  "enum": { "table": "locations", "column": "name", "schema": "organization" },
  "type": "string",
  "title": "Location"
}
```

**Select with Hardcoded Options (uses column value as value):**
```json
"leave_type": {
  "enum": { "no_id": true, "table": "leave_type", "column": "name" },
  "type": "string",
  "title": "Leave Type"
}
```

**Workflow Stages (special table):**
```json
"stage_id": {
  "enum": { "table": "dynamic_workflow_definitions", "column": "projects" },
  "type": "string",
  "title": "Stage"
}
```

---

## Field Dependencies

### Cascading Select (dependsOn)

Used when one select should filter based on another field's value:

```json
"contract_id": {
  "enum": {
    "table": "external.contracts",
    "column": "display_id",
    "dependsOn": "offering_id",
    "dependsOnField": "offering_id",
    "dependsOnColumn": "service_offering_id"
  },
  "type": "string",
  "title": "Contract"
}
```

**How it works:**
1. User selects `offering_id` field
2. DynamicForm re-fetches `contract_id` options
3. Query filters: `WHERE service_offering_id = {selected offering_id}`

### Conditional Fields (dependencies)

Show/hide fields based on other field values using JSON Schema `dependencies`:

```json
"dependencies": {
  "level": {
    "oneOf": [
      {
        "properties": { "level": { "enum": ["organization"] } }
      },
      {
        "required": ["location_id"],
        "properties": {
          "level": { "enum": ["location"] },
          "location_id": {
            "enum": { "table": "locations", "column": "name" },
            "type": "string",
            "title": "Location"
          }
        }
      }
    ]
  }
}
```

---

## Widgets

### Available Widgets

| Widget Name | ui:widget Value | Purpose |
|-------------|-----------------|---------|
| Text Input | `text` | Standard text field |
| Select | `select` | Single select dropdown |
| Date | `date` | Date picker |
| Textarea | `textarea` | Multi-line text |
| Hidden | `hidden` | Hidden field |
| Updown | `updown` | Number spinner |
| Radio | `radio` | Radio buttons |
| Email | `email` | Email input |
| **SelectCustomWidget** | `SelectCustomWidget` | Enhanced select with search |
| **TagsWidget** | `TagsWidget` | Tag selection |
| **SelectableTags** | `SelectableTags` | Clickable tag buttons |
| **EditableTableWidget** | `EditableTableWidget` | Inline table editor for arrays |
| **DateRangePickerWidget** | `DateRangePickerWidget` | Start/end date picker |
| **WebWidget** | `WebWidget` | URL input |
| **InfoWidget** | `InfoWidget` | Display-only info |

### EditableTableWidget

For editing array items inline in a table:

```json
"allocations": {
  "type": "array",
  "items": { "$ref": "#/definitions/Users" },
  "title": "Users"
}
```

UI Schema:
```json
"allocations": {
  "ui:widget": "EditableTableWidget",
  "ui:options": {
    "addable": true,
    "orderable": true,
    "removable": true,
    "columnOrder": ["user_id", "details.start_date", "details.end_date"]
  }
}
```

### SelectCustomWidget Options

```json
"account_id": {
  "ui:widget": "SelectCustomWidget",
  "ui:options": {
    "mode": "single",
    "allowClear": false,
    "showSearch": true
  }
}
```

---

## Layout System

### ui:layout

Define multi-row grid layouts using `ui:layout`:

```json
"ui:layout": [
  [
    ["name"],
    ["start_date", "end_date", "stage_id"],
    ["account_id", "offering_id"],
    ["allocations"]
  ]
]
```

### Multi-Page Forms

Each inner array is a page:

```json
"ui:layout": [
  [["name"], ["email"]],
  [["address"], ["phone"]]
]
```

### ui:grid (Alternative)

For explicit column spans (24-column grid):

```json
"ui:grid": [
  { "name": 24 },
  { "start_date": 8, "end_date": 8, "stage_id": 8 },
  { "account_id": 12, "offering_id": 12 }
]
```

---

## Forms CSV Analysis

| Form Name | Status | Features Used |
|-----------|--------|---------------|
| `teams` | ✅ Working | EditableTableWidget, enum with schema, ui:layout |
| `leaves_add_edit_form` | ✅ Working | dependencies (oneOf), enum with no_id, hidden field |
| `projects_form` | ✅ Working | EditableTableWidget, cascading dependsOn, ui:grid + ui:layout, date fields |
| `account_form` | ✅ Working | JSONB paths (details.address), multiple text fields, ui:layout |
| `contacts_form` | ✅ Working | Simple form, enum with schema, radio widget |
| `sr_contracts` | ✅ Working | SelectCustomWidget, date fields, ui:grid |

### Key Patterns Found

1. **JSONB Fields**: Use dot notation: `"details.address"`, `"details.contact_phone"`
2. **Required Fields**: Always define at form level, not field level
3. **Definitions**: Use `definitions` for reusable array item schemas
4. **Submit Button**: Customizable via `ui:submitButtonOptions`

---

## Submit Button Options

```json
"ui:submitButtonOptions": {
  "props": {
    "disabled": false,
    "className": "ant-btn-variant-solid ant-btn-block"
  },
  "norender": false,
  "submitText": "Save"
}
```

### Custom Submit Buttons (Multiple)

```json
"ui:submitButtons": [
  {
    "name": "save_draft",
    "label": "Save as Draft",
    "variant": "default",
    "defaultValues": { "status": "draft" }
  },
  {
    "name": "submit",
    "label": "Submit",
    "variant": "primary",
    "defaultValues": { "status": "submitted" }
  }
]
```
