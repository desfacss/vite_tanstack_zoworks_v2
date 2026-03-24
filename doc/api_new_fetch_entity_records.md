# API v4 Test Suite: `api_new_fetch_entity_records`

This document contains 10 comprehensive queries to verify that the `core.api_new_fetch_entity_records` function correctly handles all architectural tiers, filtering, full-text search, and pagination.

---

### 1. Basic Entity Fetch (Logical Resolution check)
Verifies that passing a physical table name resolves to the correct logical `v_*` view and handles basic data retrieval.
sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "users",
    "entity_schema": "identity",
    "pagination": {"limit": 5}
}'::jsonb);


### 2. Tenant Isolation Check
Verifies that results are strictly scoped to the provided `organization_id`.
sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "tickets",
    "entity_schema": "blueprint",
    "organization_id": "55555555-5555-5555-5555-555555555555",
    "pagination": {"limit": 5}
}'::jsonb);


### 3. Full-Text Search (L5 Vector Check)
Verifies that searching against the L5 `search_vector` correctly identifies records across multiple joined fields (Name, Status, Vertical, etc.).
sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "candidates",
    "entity_schema": "hr",
    "search": {"value": "Nicole"},
    "pagination": {"limit": 5}
}'::jsonb);


### 4. Dynamic Column Filtering
Verifies that custom JSONB filters are correctly injected into the SQL execution and respect the specified operators.
sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "deals",
    "entity_schema": "external",
    "filters": [
        {"key": "status", "operator": "=", "value": "active"}
    ],
    "pagination": {"limit": 5}
}'::jsonb);


### 5. Multi-Tier Extension Check (L1 + L2 + L3)
Verifies that fetching an entity composed of multiple tiers (e.g., Prospect = L1 Org + L2 Account) correctly joins and flattens all fields into one object.
sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "prospects",
    "entity_schema": "external",
    "pagination": {"limit": 5}
}'::jsonb);


### 6. Custom Sorting (Ascending/Descending)
Verifies that the `sorting` configuration correctly overrides the default sort and validates that the requested column exists.
sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "leads",
    "entity_schema": "external",
    "sorting": {"column": "name", "direction": "ASC"},
    "pagination": {"limit": 10}
}'::jsonb);


### 7. Pagination: Limit & `hasMore`
Verifies that the `limit` parameter is respected and that the `hasMore` flag correctly identifies if more records are available via Cursor.
sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "tasks",
    "entity_schema": "blueprint",
    "pagination": {"limit": 1}
}'::jsonb);


### 8. Combined: Search + Filter + Sort
A complex "Stress Test" query combining three different query modifiers to verify logic precedence and SQL formatting.
sql
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "contacts",
    "entity_schema": "external",
    "search": {"value": "gmail"},
    "filters": [{"key": "module", "value": "identity"}],
    "sorting": {"column": "email", "direction": "DESC"},
    "pagination": {"limit": 5}
}'::jsonb);


### 9. Cursor-Based Pagination (Continuity check)
Simulates a second-page request by passing an ID cursor to verify that the query correctly offsets results for high-performance scanning.
sql
-- Replace the UUID below with an actual ID from a previous query
SELECT * FROM core.api_new_fetch_entity_records('{
    "entity_name": "users",
    "pagination": {
        "limit": 5,
        "cursor": "f8f30b6f-cbd1-4656-bb5e-e8315b4821eb"
    }
}'::jsonb);