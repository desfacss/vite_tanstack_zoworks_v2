-- Migration: Grant RPC Permissions for RLS
-- Date: 2026-01-14

-- 1. Ensure the authenticated role can see the core schema
GRANT USAGE ON SCHEMA core TO authenticated;
GRANT USAGE ON SCHEMA core TO anon; -- Fallback for testing

-- 2. Grant EXECUTE on the new RPC gateway
-- This is critical for PostgREST to "see" the function in its cache
GRANT EXECUTE ON FUNCTION core.api_fetch_entity_records_rls(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION core.api_fetch_entity_records_rls(jsonb) TO anon;

-- 3. Grant EXECUTE on the internal query builder (required for SECURITY DEFINER chain if called directly)
GRANT EXECUTE ON FUNCTION core.api_int_build_query_sql_rls(text, uuid, text, jsonb, text, integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION core.api_int_build_query_sql_rls(text, uuid, text, jsonb, text, integer, text, boolean) TO anon;

-- 4. Reload PostgREST Schema Cache
-- This signals Supabase to refresh its knowledge of available functions
NOTIFY pgrst, 'reload schema';

SELECT 'Permissions granted and schema reload triggered.' as status;
