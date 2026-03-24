# Core Upsert Data Implementation Guide

## Overview

The `core.api_new_core_upsert_data` RPC function is the canonical method for creating and updating entities in the V4 architecture. It provides a simplified, metadata-aware interface that handles both simple and complex nested data structures.

## Function Signature

```typescript
supabase.schema('core').rpc('api_new_core_upsert_data', {
  table_name: string,  // Format: "schema.table" (e.g., "hr.interviews", "external.contacts")
  data: object         // The payload containing field values and optional id for updates
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `table_name` | string | ✅ | Fully qualified table name in format `schema.table` |
| `data` | object | ✅ | JSON object containing the entity data |

### Data Payload Structure

The `data` object contains:
- **Physical fields**: Direct column values (e.g., `name`, `email`, `status`)
- **JSONB fields**: Nested structures mapped to JSONB columns (e.g., `details.zip`, `details.interviewStatus`)
- **System fields**: Auto-populated if present in metadata (e.g., `organization_id`, `created_by`)
- **id field**: When present, performs an UPDATE; when absent, performs an INSERT

## Implementation Patterns

### 1. Create Operation (GlobalActions)

**Location**: [GlobalActions.tsx:87-96](file:///C:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/core/components/DynamicViews/GlobalActions.tsx#L87-L96)

```typescript
const createMutation = useMutation({
  mutationFn: async (values: any) => {
    if (!organization?.id || !user?.id) throw new Error("Authentication required");
    
    // Prepare data payload with system fields
    const dataPayload = {
      ...values,
      ...(metadata?.some((field: any) => field.key === "organization_id") ? 
          { organization_id: organization.id } : {}),
      ...(metadata?.some((field: any) => field.key === "created_by") ? 
          { created_by: user.id } : {}),
      ...(metadata?.some((field: any) => field.key === "updated_by") ? 
          { updated_by: user.id } : {})
    };

    // Ensure schema prefix is included
    const schema = entitySchema || "public";
    const fullTableName = `${schema}.${entityType}`;

    const { data, error } = await supabase.schema('core').rpc("api_new_core_upsert_data", {
      table_name: fullTableName,
      data: dataPayload
    });

    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
    message.success(`${entityType} created successfully`);
  }
});
```

**Key Points**:
- Check for metadata presence before adding system fields
- Always use fully qualified table name (`schema.table`)
- No `id` in payload → triggers INSERT
- Invalidate queries after successful mutation

### 2. Update Operation (RowActions)

**Location**: [RowActions.tsx:143-149](file:///C:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/core/components/DynamicViews/RowActions.tsx#L143-L149)

```typescript
const updateMutation = useMutation({
  mutationFn: async (values: any) => {
    if (!organization?.id || !user?.id) throw new Error('Authentication required');
    if (!record?.id) throw new Error('No record selected for update');

    // Filter out system-managed fields
    const systemManagedFields = ['created_at', 'updated_at', 'deleted_at'];
    const filteredValues = Object.fromEntries(
      Object.entries(values).filter(([key]) => !systemManagedFields.includes(key))
    );

    // Convert empty arrays to null for PostgreSQL compatibility
    const processedValues = Object.fromEntries(
      Object.entries(filteredValues).map(([key, value]) => {
        if (Array.isArray(value) && value.length === 0) {
          return [key, null];
        }
        return [key, value];
      })
    );

    const dataPayload = {
      ...processedValues,
      id: record.id, // Include id in data object for update
      ...(metadata.some((field: any) => field.key === 'organization_id') ? 
          { organization_id: organization.id } : {}),
      ...(metadata.some((field: any) => field.key === 'updated_by') ? 
          { updated_by: user.id } : {})
    };

    // Update main record
    const { data, error } = await (supabase as any).schema('core').rpc('api_new_core_upsert_data', {
      table_name: fullTableName,
      data: dataPayload
    });

    if (error) throw error;
    return data;
  }
});
```

**Key Points**:
- **Always include `id` field** for updates
- Filter out read-only system fields (`created_at`, `updated_at`, `deleted_at`)
- Convert empty arrays to `null` for PostgreSQL compatibility
- Add `updated_by` audit field if present in metadata

### 3. Drag-and-Drop Update (KanbanView)

**Location**: [KanbanView.tsx:378-381](file:///C:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/core/components/DynamicViews/KanbanView.tsx#L378-L381)

```typescript
const onDragEnd = async (result: DropResult) => {
  // ... optimistic update logic ...

  const updatePayload = {
    id: draggableId,
    [fieldPathForRPC]: targetValueForRPC  // e.g., stage_id: "NEW_TICKET"
  };

  const { data: rpcData, error } = await supabase.schema('core').rpc('api_new_core_upsert_data', {
    table_name: (viewConfig?.entity_schema || "public") + "." + entityType,
    data: updatePayload
  });

  if (error) throw error;
  
  queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
  message.success(`${entityType} updated successfully`);
};
```

**Key Points**:
- Minimal payload with only changed fields
- Always include `id` for targeted updates
- Use for single-field updates (e.g., status changes)

### 4. Approval Actions (ApprovalActionButtons)

**Location**: [ApprovalActionButtons.tsx:114-117](file:///C:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/core/components/details/ApprovalActionButtons.tsx#L114-L117)

```typescript
const updateStatusMutation = useMutation({
  mutationFn: async (newStatus: 'Approved' | 'Rejected') => {
    if (!entityId || !entityType) throw new Error('Entity information missing.');

    const payload = {
      id: entityId,
      status: newStatus,
      stage_id: newStatus
      // Add audit fields if necessary
      // approved_by: newStatus === 'Approved' ? user?.id : null,
    };

    const { error } = await supabase.schema('core').rpc('api_new_core_upsert_data', {
      table_name: entityType,  // Already includes schema prefix
      data: payload
    });

    if (error) throw error;
  }
});
```

## Data Payload Examples

### Simple Entity (Reference Tier)

```json
{
  "table_name": "external.contacts",
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "organization_id": "a41b2216-736c-4c00-99ca-30a0cd8ca0d2",
    "created_by": "user-uuid"
  }
}
```

### Dependent Entity (Master Tier)

```json
{
  "table_name": "hr.interviews",
  "data": {
    "organization_id": "a41b2216-736c-4c00-99ca-30a0cd8ca0d2",
    "application_id": "fd958e18-5795-4d61-ba89-0e56f5b84f09",
    "details": {
      "interviewStatus": "scheduled",
      "appointment": {
        "validDatePeriod": {
          "start": "2026-02-10T02:20:49+00:00"
        }
      }
    }
  }
}
```

### Update Payload

```json
{
  "table_name": "hr.interviews",
  "data": {
    "id": "39793f23-8d62-408c-b31f-f9f46a3b13e9",
    "details": {
      "interviewStatus": "completed",
      "appointment": {
        "validDatePeriod": {
          "start": "2026-02-10T02:20:49+00:00",
          "end": "2026-02-10T03:20:49+00:00"
        }
      }
    },
    "updated_by": "user-uuid"
  }
}
```

## Best Practices

### ✅ DO

1. **Always use fully qualified table names**
   ```typescript
   table_name: `${schema}.${entityType}`  // ✅ Good
   ```

2. **Include id for updates**
   ```typescript
   data: { id: recordId, ...otherFields }  // ✅ Good
   ```

3. **Check metadata before adding system fields**
   ```typescript
   ...(metadata?.some(f => f.key === "organization_id") ? 
       { organization_id: organization.id } : {})
   ```

4. **Convert empty arrays to null**
   ```typescript
   if (Array.isArray(value) && value.length === 0) {
     return [key, null];  // ✅ PostgreSQL compatible
   }
   ```

5. **Invalidate queries after mutations**
   ```typescript
   queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
   ```

### ❌ DON'T

1. **Don't include read-only system fields**
   ```typescript
   // ❌ Bad - these are auto-managed
   data: { created_at: new Date(), updated_at: new Date() }
   ```

2. **Don't use bare table names**
   ```typescript
   table_name: entityType  // ❌ Bad - missing schema
   ```

3. **Don't send empty arrays**
   ```typescript
   data: { tags: [] }  // ❌ Bad - should be null
   ```

4. **Don't forget error handling**
   ```typescript
   const { data, error } = await supabase.schema('core').rpc(...)
   // ❌ Bad - always check error
   ```

## JSONB Field Handling

The function automatically handles nested JSONB structures based on the entity's metadata:

### Flat Representation (Frontend Form)
```json
{
  "details.zip": "12345",
  "details.city": "New York",
  "details.interviewStatus": "scheduled"
}
```

### Nested Representation (Database Storage)
```json
{
  "details": {
    "zip": "12345",
    "city": "New York",
    "interviewStatus": "scheduled"
  }
}
```

> **Note**: The RPC function intelligently converts between these formats based on the `jsonb_schema` in the entity blueprint.

## Error Handling

```typescript
try {
  const { data, error } = await supabase.schema('core').rpc('api_new_core_upsert_data', {
    table_name: fullTableName,
    data: dataPayload
  });

  if (error) throw error;
  
  message.success('Operation successful');
  queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
  
} catch (error: any) {
  message.error(error.message || 'Operation failed');
  console.error('Upsert error:', error);
}
```

## Related Table Updates (Legacy Pattern)

> ⚠️ **Note**: Related table functionality has been removed in the new API. Use `DO` blocks or separate RPC calls for related updates.

### Old Pattern (Deprecated)
```typescript
// ❌ No longer supported
rpc('api_new_core_upsert_data', {
  id: parentId,
  related_table_name: 'schema.child_table',
  related_data_key: 'items',
  // ...
})
```

### New Pattern
```typescript
// ✅ Update parent
await supabase.schema('core').rpc('api_new_core_upsert_data', {
  table_name: 'schema.parent',
  data: parentData
});

// ✅ Update children separately
for (const item of items) {
  await supabase.schema('core').rpc('api_new_core_upsert_data', {
    table_name: 'schema.child_table',
    data: { ...item, parent_id: parentId }
  });
}
```

## Integration with Object Classification

Based on the [object classification skill](file:///C:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/.agent/object-classification/SKILL.md), the upsert function respects:

- **Classification Tiers**: `master`, `transactional`, `reference`, `definition`
- **Form Types**: `simple`, `dependent`, `composite`, `nested`, `allocator`
- **AI Resolution**: `direct`, `resolve_parent`, `chain_resolve`, `nested_create`, `allocator_flow`

## Testing Evidence

Testing logs from `02-08-26` folder demonstrate successful implementation:

### Example: hr.interviews (Dependent/Master)
- ✅ Form generation with `core.api_new_generate_form_schema`
- ✅ Upsert with nested `details` JSONB
- ✅ Parent resolution (`application_id`)
- ✅ Logical view resolution

See: [20260209_074850-hr_interviews.log](file:///C:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/02-08-26/logs/20260209_074850-hr_interviews.log)

## Next Steps

1. Update FormGenerator to use `core.api_new_generate_form_schema` RPC
2. Ensure all form submissions use `core.api_new_core_upsert_data`
3. Test with multiple entity classifications
4. Document edge cases and limitations
