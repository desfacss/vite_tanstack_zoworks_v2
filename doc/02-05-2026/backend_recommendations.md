# Backend Recommendations: Fixing Schema Drift & Permissions

To eliminate the recurring "infinite loading" and "permission denied" issues, the following backend changes are recommended.

## 1. Eliminate JWT Claim Drift
Currently, the frontend must check for both `org_id` and `organization_id` in two different metadata locations.
- **Recommendation**: Standardize on a **single field name** (ideally `organization_id` to match the DB columns) and a **single location** (ideally `app_metadata` for security-critical claims).
- **Required Action**: Update the Supabase `auth.jwt` hook or the trigger that populates user metadata to ensure consistency.

## 2. Hardened RLS Helper Functions
The RLS policies often fail silently when a JWT claim is missing, which PostgREST translates into a generic `42501 Permission Denied`.
- **Recommendation**: Update `identity.get_current_org_id()` to be more resilient and provide better error context if possible (though limited in RLS).
- **Action**: Ensure the function checks all standardized claim locations and returns a consistent `UUID` or `NULL` that RLS can handle predictably.

## 3. Schema-Wide Permission Standardization
The `workforce` schema reported issues where `authenticated` had schema usage but failed on table access.
- **Recommendation**: Implement a "Global Grant" script that runs after migrations to ensure the `authenticated` role always has the necessary `USAGE` and `SELECT/INSERT/UPDATE` permissions on all tables in functional schemas (`workforce`, `crm`, `core`, etc.).
- **Action**: 
  ```sql
  ALTER DEFAULT PRIVILEGES IN SCHEMA workforce GRANT ALL ON TABLES TO authenticated;
  GRANT USAGE ON SCHEMA workforce TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA workforce TO authenticated;
  ```

## 4. PostgREST Schema Reload Automation
Schema changes (adding columns/tables) often require a manual reload of the PostgREST cache.
- **Recommendation**: Integrate `NOTIFY pgrst, 'reload schema';` into the end of all migration scripts.

## 5. Standardize Tenant Isolation (LTREE)
Ensure that all multi-tenant tables consistently use the `organization_id` column and that RLS policies for these tables are identical in structure to prevent "leaky" or "broken" isolation.

---
**Goal**: Move from "Defensive Frontend Coding" (safety timeouts) to "Predictable Backend Contracts" (stable claims and permissions).




Standardize JWT Claims: Unified organization_id in app_metadata to eliminate frontend "drift" checks.
Hardened RLS Helpers: Update SQL functions to predictably handle claims.
Global Permission Grants: Regular schema-wide GRANT scripts for the authenticated role.
Automated Cache Reloads: Add NOTIFY pgrst, 'reload schema' to all migrations.