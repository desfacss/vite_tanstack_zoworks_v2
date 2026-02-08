-- =============================================================================
-- DIAGNOSTIC SCRIPT: PostgREST Schema Cache Failure (PGRST002)
-- Run this in Supabase SQL Editor to identify the cause
-- Created: 2026-02-07
-- =============================================================================

-- 1. FORCE SCHEMA RELOAD (Try this first)
NOTIFY pgrst, 'reload schema';

-- 2. CHECK AUTHENTICATOR ROLE PRIVILEGES
SELECT 
    'authenticator' AS role_name,
    has_schema_privilege('authenticator', 'identity', 'USAGE') AS identity_usage,
    has_schema_privilege('authenticator', 'public', 'USAGE') AS public_usage,
    has_schema_privilege('authenticator', 'core', 'USAGE') AS core_usage,
    has_schema_privilege('authenticator', 'extensions', 'USAGE') AS extensions_usage;

-- 3. CHECK FOR BROKEN VIEWS (views with NULL definitions)
SELECT 
    schemaname, 
    viewname,
    'BROKEN - NULL definition' AS status
FROM pg_views
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND definition IS NULL;

-- 4. CHECK FOR VIEWS THAT REFERENCE MISSING OBJECTS
-- This query attempts to identify views that might be referencing deleted tables/columns
WITH view_dependencies AS (
    SELECT DISTINCT
        v.schemaname,
        v.viewname,
        d.refobjid::regclass AS referenced_object
    FROM pg_views v
    JOIN pg_depend d ON d.objid = (v.schemaname || '.' || v.viewname)::regclass
    WHERE v.schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND d.deptype = 'n'
)
SELECT * FROM view_dependencies
WHERE referenced_object::text LIKE '%MISSING%'
   OR referenced_object IS NULL;

-- 5. CHECK FOR FUNCTIONS WITH INVALID DEPENDENCIES
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_def
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('identity', 'core', 'public')
  AND p.proname LIKE '%jwt%'
ORDER BY n.nspname, p.proname;

-- 6. CHECK IF RPC FUNCTIONS ARE ACCESSIBLE
SELECT 
    n.nspname AS schema,
    p.proname AS function,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_execute,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'identity'
  AND p.proname IN ('get_my_organizations', 'jwt_get_user_session', 'set_preferred_organization');

-- 7. CHECK FOR RECENT SCHEMA CHANGES (if pg_stat_user_tables is available)
SELECT 
    schemaname,
    relname AS table_name,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname IN ('identity', 'core')
ORDER BY GREATEST(last_vacuum, last_autovacuum, last_analyze, last_autoanalyze) DESC NULLS LAST
LIMIT 10;

-- 8. CHECK POSTGREST CONFIG (if accessible)
SELECT current_setting('pgrst.db_schemas', true) AS exposed_schemas;

-- 9. VERIFY LTREE EXTENSION IS WORKING
SELECT 
    extname,
    extversion,
    extnamespace::regnamespace AS schema
FROM pg_extension
WHERE extname = 'ltree';

-- 10. FIND THE EXACT BROKEN VIEW (Crucial)
-- This script tries to "touch" every view. If one is broken, it will report it.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, viewname FROM pg_views WHERE schemaname IN ('identity', 'core', 'public', 'workforce', 'crm')) LOOP
        BEGIN
            EXECUTE 'EXPLAIN (FORMAT JSON) SELECT * FROM ' || quote_ident(r.schemaname) || '.' || quote_ident(r.viewname) || ' LIMIT 1';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'FOUND BROKEN VIEW: %.% - ERROR: %', r.schemaname, r.viewname, SQLERRM;
        END;
    END LOOP;
END $$;

-- 11. CHECK FOR STUCK TRANSACTIONS / LOCKS
-- If a table is locked by a hanging transaction, PostgREST cannot introspect it.
SELECT 
    pid, 
    now() - xact_start AS duration, 
    query, 
    state,
    wait_event_type,
    wait_event
FROM pg_stat_activity 
WHERE state != 'idle' 
  AND (now() - xact_start) > interval '1 minute'
ORDER BY duration DESC;

-- 12. CHECK FOR ACCESS EXCLUSIVE LOCKS
SELECT
    l.pid,
    l.mode,
    l.locktype,
    l.relation::regclass AS locked_item,
    a.query AS active_query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.mode = 'AccessExclusiveLock'
  AND l.relid IS NOT NULL;

-- 13. RELOAD AGAIN (Some users report needing multiple reloads)
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- INTERPRETATION:
-- - If Step 2 shows FALSE for any schema, run: GRANT USAGE ON SCHEMA <schema> TO authenticator;
-- - If Step 3 or 4 returns rows, those views need to be fixed or dropped
-- - If Step 6 shows FALSE, grant EXECUTE on those functions to authenticated
-- - If Step 9 is empty, ltree extension is not installed (critical for identity functions)
-- =============================================================================
