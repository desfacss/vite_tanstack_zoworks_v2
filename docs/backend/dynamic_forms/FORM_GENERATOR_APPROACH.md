# Form Generator from Entity Metadata

> **Date:** 2025-12-12  
> **Status:** Proposed  
> **Objective:** Auto-generate DynamicForm configurations from `core.entities` metadata

---

## Overview

Generate `data_schema`, `ui_schema`, and optionally `db_schema` from entity metadata stored in `core.entities.metadata` column.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Form Generator Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User selects entity (e.g., "external.accounts")             │
│                         ↓                                       │
│  2. Backend: Fetch entity metadata from core.entities           │
│                         ↓                                       │
│  3. Transform: Convert metadata → JSON Schema + UI Schema       │
│                         ↓                                       │
│  4. UI: Load into FormBuilder for refinement                    │
│                         ↓                                       │
│  5. Save: Store to public.forms table                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Entity Metadata Structure

From `core.entities.metadata`:

```typescript
interface EntityField {
  key: string;              // Field name e.g., "name", "details.zip"
  type: string;             // PostgreSQL type: text, uuid, boolean, date, etc.
  display_name: string;     // Human-readable label
  is_mandatory: boolean;    // Required field
  is_virtual: boolean;      // Computed/JSONB path field
  is_displayable: boolean;  // Show in UI
  is_searchable: boolean;   // Enable search
  jsonb_column?: string;    // Parent JSONB column if virtual
  foreign_key?: {
    source_table: string;   // e.g., "identity.organizations"
    source_column: string;  // e.g., "id"
    display_column: string; // e.g., "name"
  };
  semantic_type?: {
    role: string;           // "dimension" | "measure"
    sub_type: string;       // "temporal" | "boolean" | "discrete" | "nominal"
  };
}
```

---

## Type Mapping Rules

| Entity Metadata Type | JSON Schema Type | Format | ui:widget | Widget Type |
|---------------------|------------------|--------|-----------|-------------|
| `text` | `string` | - | `text` | Text |
| `uuid` (no FK) | `string` | - | `text` | Text |
| `uuid` (with FK) | `string` + `enum{}` | - | `select` | SelectSingle |
| `boolean` | `boolean` | - | `checkbox` | Checkboxes |
| `integer`, `bigint` | `integer` | - | `updown` | Number |
| `numeric`, `decimal` | `number` | - | `updown` | Number |
| `date` | `string` | `date` | `date` | Date |
| `timestamptz` | `string` | `date-time` | `date-time` | DateTime |
| `jsonb` | `object` | - | - | (skip or expand) |
| `text[]` | `array` | - | - | Tags |

---

## Implementation Options

### Option A: Pure React Component (Recommended)

**New Component:** `FormGenerator.tsx` alongside FormBuilder

```
src/components/pages/DynamicConfig/
├── FormBuilder/
│   ├── index.tsx         (existing)
│   └── widgets.ts        (existing)
├── FormGenerator/
│   ├── index.tsx         (NEW - entity selector + generator)
│   └── utils.ts          (NEW - metadata to schema conversion)
```

**Flow:**
1. User selects entity from dropdown (fetched from `core.entities`)
2. Click "Generate Form" 
3. Component transforms metadata → schema
4. Output loaded into FormBuilder for editing
5. Preview using existing DynamicForm

**Pros:**
- Faster to implement
- Uses existing FormBuilder preview
- Pure TypeScript logic

**Cons:**
- Requires API call to fetch metadata
- All logic on frontend

---

### Option B: PostgreSQL RPC Function

**New Function:** `core.generate_form_from_entity(entity_name TEXT)`

```sql
CREATE OR REPLACE FUNCTION core.generate_form_from_entity(p_entity_name TEXT)
RETURNS JSONB AS $$
DECLARE
  v_metadata JSONB;
  v_data_schema JSONB := '{"type":"object","properties":{}}';
  v_ui_schema JSONB := '{}';
  v_field RECORD;
BEGIN
  -- Fetch metadata
  SELECT metadata INTO v_metadata
  FROM core.entities
  WHERE entity_type || '.' || entity_schema = p_entity_name;
  
  -- Transform each field
  FOR v_field IN SELECT * FROM jsonb_array_elements(v_metadata) LOOP
    -- Build data_schema properties
    -- Build ui_schema
  END LOOP;
  
  RETURN jsonb_build_object(
    'data_schema', v_data_schema,
    'ui_schema', v_ui_schema
  );
END;
$$ LANGUAGE plpgsql;
```

**Pros:**
- Runs at database level
- Reusable via API
- Can leverage SQL for complex FK resolution

**Cons:**
- Harder to debug
- Duplicate logic if also needed in UI
- PL/pgSQL limitations

---

### Option C: Hybrid (RPC + React)

**RPC:** Simple metadata fetch with basic transformation  
**React:** Full schema generation using widgets.ts config

**Pros:**
- Best of both worlds
- Backend does heavy lifting, frontend refines

**Cons:**
- More components to maintain

---

## Recommended Approach: Option A (Pure React)

### Why?
1. **Simpler Development** - TypeScript is easier to debug than PL/pgSQL
2. **Uses Existing Infrastructure** - Leverages FormBuilder preview
3. **Widget Config Alignment** - Can import from `widgets.ts`
4. **Immediate Feedback** - User sees generated form instantly

### Implementation Steps

#### Step 1: Create EntitySelector Component
```tsx
const EntitySelector: React.FC<{ onSelect: (entity: EntityMetadata) => void }> = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  
  useEffect(() => {
    // Fetch from core.entities
    supabase.from('entities').select('*').eq('is_active', true);
  }, []);
  
  return (
    <Select
      placeholder="Select entity"
      options={entities.map(e => ({
        value: e.id,
        label: `${e.entity_schema}.${e.entity_type}`
      }))}
    />
  );
};
```

#### Step 2: Create Schema Generator Utility
```typescript
// FormGenerator/utils.ts
export function generateFormFromMetadata(
  metadata: EntityField[],
  options: GeneratorOptions
): { dataSchema: object; uiSchema: object } {
  const dataSchema = {
    type: 'object',
    properties: {},
    required: []
  };
  const uiSchema = { 'ui:order': [] };
  
  for (const field of metadata) {
    if (!field.is_displayable) continue;
    if (field.is_virtual && !field.jsonb_column) continue; // Skip computed
    
    const { property, widget } = mapFieldToSchema(field);
    dataSchema.properties[field.key] = property;
    uiSchema[field.key] = widget;
    
    if (field.is_mandatory) {
      dataSchema.required.push(field.key);
    }
  }
  
  return { dataSchema, uiSchema };
}
```

#### Step 3: Field Mapping Logic
```typescript
function mapFieldToSchema(field: EntityField) {
  // Handle FK fields
  if (field.foreign_key) {
    return {
      property: {
        type: 'string',
        title: field.display_name,
        enum: {
          schema: field.foreign_key.source_table.split('.')[0],
          table: field.foreign_key.source_table.split('.')[1],
          column: field.foreign_key.display_column
        }
      },
      widget: { 'ui:widget': 'select' }
    };
  }
  
  // Handle by type
  switch (field.type) {
    case 'text':
      return { property: { type: 'string', title: field.display_name }, widget: {} };
    case 'boolean':
      return { property: { type: 'boolean', title: field.display_name }, widget: {} };
    case 'date':
      return { 
        property: { type: 'string', format: 'date', title: field.display_name },
        widget: { 'ui:widget': 'date' }
      };
    case 'timestamptz':
      return {
        property: { type: 'string', format: 'date-time', title: field.display_name },
        widget: { 'ui:widget': 'date-time' }
      };
    case 'integer':
    case 'bigint':
      return { property: { type: 'integer', title: field.display_name }, widget: {} };
    case 'numeric':
      return { property: { type: 'number', title: field.display_name }, widget: {} };
    default:
      return { property: { type: 'string', title: field.display_name }, widget: {} };
  }
}
```

#### Step 4: Integrate with FormBuilder
```tsx
// In FormBuilder page, add tab or button:
<Button onClick={() => setShowGenerator(true)}>
  Generate from Entity
</Button>

{showGenerator && (
  <FormGenerator 
    onGenerate={(schema) => {
      setDataSchema(schema.dataSchema);
      setUiSchema(schema.uiSchema);
      setShowGenerator(false);
    }}
  />
)}
```

---

## Fields to Exclude

| Field Pattern | Reason |
|---------------|--------|
| `id` | Auto-generated UUID |
| `created_at`, `updated_at` | System timestamps |
| `created_by`, `updated_by` | System user references |
| `organization_id` | Context-injected |
| `is_virtual: true` (no jsonb_column) | Computed from view |
| `is_displayable: false` | Hidden |

---

## Handling JSONB Virtual Fields

The metadata includes virtual fields from JSONB columns like:
- `details.zip`
- `details.address`
- `settings.localization.currency`

**Strategy:**
1. Group by `jsonb_column` (e.g., `details`)
2. Create nested object schema OR flat fields
3. Optionally add "Expand JSONB" toggle in UI

---

## Output Example

**Input Entity:** `external.accounts`

**Generated data_schema:**
```json
{
  "type": "object",
  "required": ["name", "account_type_id"],
  "properties": {
    "name": { "type": "string", "title": "Name" },
    "account_type_id": {
      "type": "string",
      "title": "Account Type",
      "enum": { "schema": "catalog", "table": "account_types", "column": "name" }
    },
    "email": { "type": "string", "format": "email", "title": "Email" },
    "is_active": { "type": "boolean", "title": "Is Active" }
  }
}
```

**Generated ui_schema:**
```json
{
  "ui:order": ["name", "account_type_id", "email", "is_active"],
  "account_type_id": { "ui:widget": "select" },
  "email": { "ui:placeholder": "email@example.com" }
}
```

---

## Next Steps

1. [ ] Create `FormGenerator/index.tsx` component
2. [ ] Create `FormGenerator/utils.ts` with mapping logic
3. [ ] Add entity selector dropdown
4. [ ] Integrate "Generate from Entity" button in FormBuilder
5. [ ] Test with various entity types
6. [ ] Handle JSONB nested fields
