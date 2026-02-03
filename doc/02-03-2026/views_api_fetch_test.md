# API v4 Test Suite: `api_new_fetch_entity_records`

This document contains 10 comprehensive queries to verify that the `core.api_new_fetch_entity_records` function correctly handles all architectural tiers, filtering, full-text search, and pagination.

---

### 1. Basic Entity Fetch (Logical Resolution check)
Verifies that passing a physical table name resolves to the correct logical `v_*` view and handles basic data retrieval.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "users",
    "entity_schema": "identity",
    "pagination": {"limit": 5}
}'::jsonb);
```

### 2. Tenant Isolation Check
Verifies that results are strictly scoped to the provided `organization_id`.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "tickets",
    "entity_schema": "blueprint",
    "organization_id": "55555555-5555-5555-5555-555555555555",
    "pagination": {"limit": 5}
}'::jsonb);
```

### 3. Full-Text Search (L5 Vector Check)
Verifies that searching against the L5 `search_vector` correctly identifies records across multiple joined fields (Name, Status, Vertical, etc.).
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "candidates",
    "entity_schema": "hr",
    "search": {"value": "Nicole"},
    "pagination": {"limit": 5}
}'::jsonb);
```

### 4. Dynamic Column Filtering
Verifies that custom JSONB filters are correctly injected into the SQL execution and respect the specified operators.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "deals",
    "entity_schema": "external",
    "filters": [
        {"key": "status", "operator": "=", "value": "active"}
    ],
    "pagination": {"limit": 5}
}'::jsonb);
```

### 5. Multi-Tier Extension Check (L1 + L2 + L3)
Verifies that fetching an entity composed of multiple tiers (e.g., Prospect = L1 Org + L2 Account) correctly joins and flattens all fields into one object.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "prospects",
    "entity_schema": "external",
    "pagination": {"limit": 5}
}'::jsonb);
```

### 6. Custom Sorting (Ascending/Descending)
Verifies that the `sorting` configuration correctly overrides the default sort and validates that the requested column exists.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "leads",
    "entity_schema": "external",
    "sorting": {"column": "name", "direction": "ASC"},
    "pagination": {"limit": 10}
}'::jsonb);
```

### 7. Pagination: Limit & `hasMore`
Verifies that the `limit` parameter is respected and that the `hasMore` flag correctly identifies if more records are available via Cursor.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "tasks",
    "entity_schema": "blueprint",
    "pagination": {"limit": 1}
}'::jsonb);
```

### 8. Combined: Search + Filter + Sort
A complex "Stress Test" query combining three different query modifiers to verify logic precedence and SQL formatting.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "contacts",
    "entity_schema": "external",
    "search": {"value": "gmail"},
    "filters": [{"key": "module", "value": "identity"}],
    "sorting": {"column": "email", "direction": "DESC"},
    "pagination": {"limit": 5}
}'::jsonb);
```

### 9. Cursor-Based Pagination (Continuity check)
Simulates a second-page request by passing an ID cursor to verify that the query correctly offsets results for high-performance scanning.
```sql
-- Replace the UUID below with an actual ID from a previous query
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "users",
    "pagination": {
        "limit": 5,
        "cursor": "f8f30b6f-cbd1-4656-bb5e-e8315b4821eb"
    }
}'::jsonb);
```

### 10. Large Payload Exclusion (search_vector check)
Verifies that the technical `search_vector` column is EXCLUDED from the payload while still being used for filtering, ensuring lean API responses.
```sql
---

## ⚛️ React Implementation Sample (Supabase-js)

Use this pattern to create a dynamic, reusable fetcher for any V4 entity.

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * Reusable V4 Entity Fetcher
 */
export async function fetchV4Records({
  schema = 'identity',
  entity = 'users',
  search = '',
  filters = [],
  sortColumn = 'created_at',
  sortDirection = 'DESC',
  limit = 10,
  cursor = null
}) {
  const { data, error } = await supabase.rpc('api_new_fetch_entity_records', {
    config: {
      entity_schema: schema,
      entity_name: entity,
      organization_id: '55555555-5555-5555-5555-555555555555', // Usually from Auth Context
      search: { value: search },
      filters: filters, // e.g., [{ key: 'status', operator: '=', value: 'active' }]
      sorting: { column: sortColumn, direction: sortDirection },
      pagination: { limit: limit, cursor: cursor }
    }
  });

  if (error) throw error;
  return data; // Returns { data: [...], hasMore: boolean, api: 'new_v4', ... }
}

/**
 * Example Component Usage
 */
function UserList() {
  const loadUsers = async () => {
    try {
      const results = await fetchV4Records({
        schema: 'identity',
        entity: 'users',
        search: 'Ravi',
        limit: 5
      });
      console.log('V4 Data:', results.data);
    } catch (err) {
      console.error('Fetch failed:', err);
    }
  };

  return <button onClick={loadUsers}>Fetch V4 Users</button>;
}
```

### Key Implementation Rules:
1.  **Logical Target**: Only provide the base entity name (e.g., `candidates`). The API handles the `v_` mapping internally.
2.  **Flat Payloads**: The return `data` is a flat array of objects—no nested join logic needed in the frontend.
3.  **Metadata**: The response includes `resolved_relation` and `entity` for debugging or dynamic UI labeling.
4.  **Pagination**: If `hasMore` is true, take the `id` of the last record in `data` and pass it as the `cursor` in your next request.
```
