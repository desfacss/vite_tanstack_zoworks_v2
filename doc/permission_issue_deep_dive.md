# Deep Dive: Persistent 42501 Permission Denied on `workforce` Schema

## Current Status
Despite multiple rounds of permission grants and schema configuration updates, the Supabase API continues to return a `42501: permission denied` error when attempting to access tables in the `workforce` schema from the frontend.

### Evolution of the Error
1. **Initial Error**: `permission denied for schema workforce`
   - **Fix Applied**: Granted `USAGE` on the `workforce` schema to `authenticated` and `anon` roles.
   - **Result**: This specific error was resolved.

2. **Secondary Error**: `permission denied for table timesheets`
   - **Fix Applied**: Granted `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all tables in `workforce` to `authenticated`.
   - **Fix Applied**: Set `search_path` for `authenticated` and `anon` roles to include `workforce`, `identity`, and `core`.
   - **Fix Applied**: Verified "Exposed Schemas" and "Extra search path" in Supabase Dashboard.
   - **Result**: **Error persists.**

## Diagnostic Findings

### 1. Database Level (SQL Editor)
- `has_schema_privilege('authenticated', 'workforce', 'USAGE')` returns **true**.
- `has_table_privilege('authenticated', 'workforce.timesheets', 'SELECT')` returns **true**.
- Roles (`authenticated`, `anon`) have the correct `rolconfig` with the `search_path` set.
- Functions in the `identity` schema (used by RLS) are executable by the `authenticated` role.

### 2. API Level (Supabase REST)
- The Supabase client initialized in the browser is making requests to `.../rest/v1/timesheets`.
- Even though the database says the role has permission, the REST gateway (PostgREST) returns **403 Forbidden**.

## Potential Root Causes

### A. RLS Policy Internal Failure
The RLS policies for `workforce` tables rely on external dependencies:
- **Schema**: `identity`
- **Functions**: `identity.get_current_org_id()`, `identity.get_current_org_user_id()`
- **Views**: `identity.v_user_access_context`
- **Extensions**: `ltree`

If any of these dependencies are missing `USAGE` or `EXECUTE` permissions for the `authenticated` role, the RLS policy evaluation fails. While we granted these, there might be a "Security Definer/Invoker" mismatch or a missing grant on a lower-level extension function.

### B. Ownership Conflict
If the `workforce` tables are owned by a user other than `postgres` (or the default Supabase admin user), the automatic grants for the `authenticated` role might be incomplete or overridden by schema-level ownership restrictions.

### C. PostgREST Cache Desync
Supabase's API Gateway (PostgREST) caches the schema structure and permissions. If a schema change was made, PostgREST might still be holding onto old permission metadata. 
- *Note: We ran `NOTIFY pgrst, 'reload schema'`, but sometimes a manual click on "Reload Schema" or "Save" in the Dashboard API settings is more effective.*

### D. Case Sensitivity
While PostgreSQL is generally case-insensitive for identifiers unless quoted, the Supabase API and search path configurations are sensitive to how they are stored. We verified this in the dashboard, but a mismatch in the JWT claims (`org_id` vs `organization_id`) could also trigger RLS failures that look like permission errors.

## Recommended Next Steps for Platform Admins

1. **Verify Exposed Schemas**: Double-check that **workforce** is at the top of the Exposed Schemas list in Supabase Settings -> API.
2. **Check JWT Claims**: Log out and log back in to ensure the latest `org_id` is present in the JWT, matching what the RLS functions expect.
3. **Audit Log**: Check the Postgres error logs (if accessible via the provider) to see the exact SQL failure reason—Postgres often provides more detail than the REST API `42501` message.
