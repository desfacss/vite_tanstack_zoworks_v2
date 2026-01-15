-- Migration: Grant Permissions for Workforce Schema
-- Date: 2026-01-14
-- Note: Robust version with multi-schema grants and search paths

-- 1. Grant Usage on ALL necessary schemas
GRANT USAGE ON SCHEMA workforce TO authenticated, anon, authenticator, service_role;
GRANT USAGE ON SCHEMA identity TO authenticated, anon, authenticator, service_role;
GRANT USAGE ON SCHEMA core TO authenticated, anon, authenticator, service_role;

-- 2. Ensure authenticated role has access to the tables and sequences in workforce
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA workforce TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA workforce TO authenticated;

-- 3. Ensure anon role has read access (if needed for public views)
GRANT SELECT ON ALL TABLES IN SCHEMA workforce TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA workforce TO anon;

-- 4. Fix Search Path for the roles (Best practice for multi-schema)
ALTER ROLE authenticated SET search_path TO public, workforce, identity, core;
ALTER ROLE anon SET search_path TO public, workforce, identity, core;

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'All permissions and search paths refreshed' as status;
