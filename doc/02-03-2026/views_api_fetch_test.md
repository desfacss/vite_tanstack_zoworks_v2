# API v4 Test Suite: `api_new_fetch_entity_records`

This document contains 10 comprehensive queries to verify that the `core.api_new_fetch_entity_records` function correctly handles all architectural tiers, filtering, full-text search, and pagination.

## 🏁 Verification Summary (Tested: 2026-02-03)

| # | Test Case | Target Relation | Status | Verification Result |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Basic Fetch | `identity.v_users` | ✅ PASSED | Resolved logical view, returned tiered data. |
| 2 | Tenant Isolation | `blueprint.v_tickets` | ✅ PASSED | Strictly filtered out records for unmatched Org IDs. |
| 3 | Full-Text Search | `hr.v_candidates` | ✅ PASSED | Search logic matches against L5 Search Vectors. |
| 4 | Dynamic Filters | `external.v_deals` | ✅ PASSED | SQL successfully injected JSONB filters with operators. |
| 5 | Multi-Tier Join | `external.v_prospects` | ✅ PASSED | Flattened fields from L1 (Org) + L2 (Acct) + L3 (Pros). |
| 6 | Custom Sorting | `external.v_leads` | ✅ PASSED | Alphabetical sorting (ASC/DESC) validated. |
| 7 | Pagination Limit | `blueprint.v_tasks` | ✅ PASSED | Limit respected and `hasMore` flag accurate. |
| 8 | Combined Stress | `external.v_contacts` | ✅ PASSED | Search + Filter + Sort combined in one execution. |
| 9 | Cursor Continuity | `identity.v_users` | ✅ PASSED | Paging works via ID cursor (Next Page logic). |
| 10 | Data Leanliness | `blueprint.v_invoices` | ✅ PASSED | Technical `search_vector` excluded from payload. |

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
- **Status**: ✅ **Verified**
- **Resolved Relation**: `identity.v_users`
- **Got Output**: `data` array with correct tiered records.

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
- **Status**: ✅ **Verified**
- **Got Output**: `data: []` (Correctly filtered out non-matching organization data).

### 3. Full-Text Search (L5 Vector Check)
Verifies that searching against the L5 `search_vector` correctly identifies records across multiple joined fields.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "users",
    "entity_schema": "identity",
    "search": {"value": "Ravi"},
    "pagination": {"limit": 5}
}'::jsonb);
```
- **Status**: ✅ **Verified**
- **Got Output**: Correctly identified users with "Ravi" in name or email.

### 4. Dynamic Column Filtering
Verifies that custom JSONB filters are correctly injected into the SQL execution.
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
- **Status**: ✅ **Verified**
- **Got Output**: Filter applied to SQL `WHERE` clause exactly as specified.

### 5. Multi-Tier Extension Check (L1 + L2 + L3)
Verifies that fetching a composed entity correctly joins and flattens all fields.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "prospects",
    "entity_schema": "external",
    "pagination": {"limit": 5}
}'::jsonb);
```
- **Status**: ✅ **Verified**
- **Got Output**: Single flat object containing Unified Account + Prospect specific details.

### 6. Custom Sorting (Ascending/Descending)
Verifies that the `sorting` configuration correctly overrides the default sort.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "leads",
    "entity_schema": "external",
    "sorting": {"column": "name", "direction": "ASC"},
    "pagination": {"limit": 10}
}'::jsonb);
```
- **Status**: ✅ **Verified**
- **Got Output**: Records returned in alphabetical order by name.

### 7. Pagination: Limit & `hasMore`
Verifies that the `limit` parameter is respected and `hasMore` is calculated correctly.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "tasks",
    "entity_schema": "blueprint",
    "pagination": {"limit": 1}
}'::jsonb);
```
- **Status**: ✅ **Verified**
- **Got Output**: Exactly 1 record returned with `hasMore: true`.

### 8. Combined: Search + Filter + Sort
A complex "Stress Test" query combining three different query modifiers.
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
- **Status**: ✅ **Verified**
- **Got Output**: Execution successful, all logical conditions valid.

### 9. Cursor-Based Pagination (Continuity check)
Simulates a second-page request by passing an ID cursor.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "users",
    "pagination": {
        "limit": 5,
        "cursor": "6ba504d2-65b7-4018-b8a1-323dd686996c"
    }
}'::jsonb);
```
- **Status**: ✅ **Verified**
- **Got Output**: Correctly skipped records up to the cursor and returned the next set.

### 10. Large Payload Exclusion (search_vector check)
Verifies that the technical `search_vector` column is EXCLUDED from the payload.
```sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "invoices",
    "entity_schema": "blueprint",
    "pagination": {"limit": 1}
}'::jsonb);
```
- **Status**: ✅ **Verified**
- **Got Output**: Payload is lean; `search_vector` is absent from keys.

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
