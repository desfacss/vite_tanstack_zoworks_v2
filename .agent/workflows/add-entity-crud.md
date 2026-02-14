---
description: Complete workflow for adding CRUD interface for new entities
---

# Add New Entity CRUD Interface

This workflow guides you through adding a complete CRUD interface for a new database entity, following the pattern established for `ai_mcp.agents`.

## Prerequisites

- ✅ Database table exists (e.g., `schema_name.entity_name`)
- ✅ View configuration exists in `core.view_configs` table
- ✅ Backend RPC supports the schema (`api_new_fetch_entity_records`, `api_new_core_upsert_data`)

---

## Phase 1: Menu & Navigation Setup

### 1.1 Add Menu Configuration

**File**: `src/config/menuConfig.json`

Add module and submenu entry:

```json
{
  "modules": {
    "your_module": [
      {
        "filePath": "src/core/components/DynamicViews/GenericDynamicPage.tsx",
        "routePath": "/your_schema/your_entity",
        "translationKey": "your_entity",
        "key": "your-module-entity",
        "submoduleKey": "your-module-entity"
      }
    ]
  }
}
```

**Replace**:
- `your_module` → Module name (e.g., `ai`, `hr`, `crm`)
- `your_schema` → Database schema (e.g., `ai_mcp`, `hr`, `crm`)
- `your_entity` → Entity name (e.g., `agents`, `employees`)

### 1.2 Add Navigation Icon

**File**: `src/core/components/Layout/Sider/navigation.tsx`

1. Import icon from `lucide-react`:
```typescript
import { YourIcon } from 'lucide-react';
```

2. Add to `iconMap`:
```typescript
const iconMap: Record<string, JSX.Element> = {
  // ...
  your_module: <YourIcon size={18} />,
  'your-module-entity': <YourIcon size={18} />,
  your_entity: <YourIcon size={18} />,
};
```

### 1.3 Add Route

**File**: `src/routes/index.tsx`

Add schema route:
```typescript
<Route path="/your_schema/:entity" element={<GenericDynamicPage schema="your_schema" />} />
```

### 1.4 Add Translation Keys

**File**: `src/i18n/locales/en.json`

```json
{
  "modules": {
    "your_module": "Your Module"
  },
  "common": {
    "label": {
      "your_entity": "Your Entity",
      "your-module-entity": "Your Module Entity"
    }
  }
}
```

---

## Phase 2: TypeScript Types (Optional - for custom forms)

**File**: `src/modules/your_module/types/index.ts`

Define entity interface:
```typescript
export interface YourEntityRecord {
  id: string;
  // ... all entity fields
  created_at?: string;
  updated_at?: string;
}

export interface YourEntityFormData extends Omit<YourEntityRecord, 'id' | 'created_at' | 'updated_at'> {
  // Form-specific fields
}
```

---

## Phase 3: Custom Form (Optional - only if complex fields like JSON)

### 3.1 Create Custom Form Component

**File**: `src/modules/your_module/components/YourEntityForm.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

interface YourEntityFormProps {
  entityType: string;
  parentEditItem?: any | null;
  onSuccess: () => void;
  onClose: () => void;
}

const YourEntityForm: React.FC<YourEntityFormProps> = ({
  entityType,
  parentEditItem,
  onSuccess,
  onClose
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { organization } = useAuthStore();
  
  const mode = parentEditItem ? 'edit' : 'create';

  useEffect(() => {
    if (parentEditItem && mode === 'edit') {
      form.setFieldsValue(parentEditItem);
    }
  }, [parentEditItem, mode, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (mode === 'create') {
        const { error } = await supabase
          .schema('your_schema')
          .from('your_entity')
          .insert([{ ...values, organization_id: organization?.id }]);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .schema('your_schema')
          .from('your_entity')
          .update(values)
          .eq('id', parentEditItem.id);
        
        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Form form={form} layout="vertical">
        {/* Add your form fields here */}
      </Form>
      
      <Space style={{ float: 'right', marginTop: 16 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" onClick={handleSubmit} loading={loading}>
          {mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </Space>
    </div>
  );
};

export default YourEntityForm;
```

### 3.2 Register Custom Form

**File**: `src/modules/your_module/registry.ts`

```typescript
import { registry } from '@/core/registry';

export async function register() {
  console.log('[YourModule] Registering module');

  registry.registerAction({
    id: 'your_entity_form',
    entityTypes: ['your_entity', 'your_schema.your_entity'],
    position: 'both',
    label: 'Your Entity Form',
    component: () => import('./components/YourEntityForm'),
  });

  console.log('[YourModule] ✓ Module registered');
}
```

### 3.3 Initialize Module

**File**: `src/App.tsx`

Add before `function App()`:
```typescript
import('@/modules/your_module/registry').then(module => module.register());
```

---

## Phase 4: View Configuration (Database)

Update `core.view_configs` for your entity:

```json
{
  "general": {
    "default_view": "tableview",
    "global_actions": [
      {"form": "your_entity_form", "label": "New"}
    ]
  },
  "tableview": {
    "actions": {
      "row": [
        {"form": "your_entity_form", "name": "Edit"},
        {"form": "", "name": "Details"},
        {"form": "", "name": "Delete"}
      ]
    }
  }
}
```

**Note**: The `form` value must match the registry action `id`.

---

## Phase 5: Parent-Child / Joint Table Relationships

> **IMPORTANT**: Track relationships that need to be added/edited/viewed together

### Relationship Types to Handle:

1. **One-to-Many** (Parent → Children)
   - Example: Invoice → Invoice Items
   - Approach: Custom form with embedded child editor

2. **Many-to-Many** (Joint Table)
   - Example: Users ↔ Teams (via user_teams)
   - Approach: Multi-select with junction table handling

3. **Nested Objects** (JSONB fields)
   - Example: Agent config, planning_config
   - Approach: JSON editor components with validation

### Implementation Notes:

When you encounter parent-child relationships:
- [ ] Document the relationship type
- [ ] Decide if using custom form or `related_table` config
- [ ] Implement cascade delete if needed
- [ ] Add validation for required children

**Example - Related Table Config**:
```json
{
  "details": {
    "related_table": {
      "name": "schema.child_table",
      "key": "child_items",
      "fields": ["field1", "field2"],
      "fk_column": "parent_id"
    }
  }
}
```

---

## Testing Checklist

- [ ] Navigate to entity page via sidebar
- [ ] List view displays records correctly
- [ ] "New" button opens form
- [ ] Create new record successfully
- [ ] "Edit" button opens form with data
- [ ] Update existing record successfully
- [ ] "Delete" removes record
- [ ] Pagination works (if >10 records)
- [ ] Search/filter works
- [ ] Parent-child relationships save correctly (if applicable)

---

## Troubleshooting

### Form doesn't open on "New" click
- Check `global_actions` in view config references correct form ID
- Verify registry action ID matches form value
- Confirm module registration in App.tsx

### Form doesn't load data on "Edit"
- Verify RowActions passes `parentEditItem` prop
- Check form uses `parentEditItem` to detect edit mode
- Ensure `onSuccess` callback is provided

### Creating duplicates instead of updating
- Confirm mode detection: `const mode = parentEditItem ? 'edit' : 'create'`
- Check update query uses correct ID field

### JSON editor doesn't expand
- Use `autoSize={{ minRows: X, maxRows: 30 }}` instead of `rows`

---

## Quick Reference

| Step | File | Action |
|------|------|--------|
| Menu | `menuConfig.json` | Add module entry |
| Icon | `navigation.tsx` | Import and map icon |
| Route | `routes/index.tsx` | Add schema route |
| i18n | `locales/en.json` | Add translations |
| Types | `module/types/index.ts` | Define interfaces |
| Form | `module/components/Form.tsx` | Create custom form |
| Registry | `module/registry.ts` | Register action |
| Init | `App.tsx` | Import and register |
| View Config | Database | Update `core.view_configs` |

---

## Notes

- Use GenericDynamicPage for simple tables
- Only create custom forms for complex fields (JSON, nested data)
- Always register custom forms via registry system
- Test both create and edit flows thoroughly
- Document any parent-child relationships for future reference
