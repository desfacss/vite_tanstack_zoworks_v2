-- 1. Check current permissions
SELECT 
    n.nspname AS schema_name,
    has_schema_privilege('authenticated', n.nspname, 'USAGE') AS auth_has_usage,
    has_schema_privilege('anon', n.nspname, 'USAGE') AS anon_has_usage,
    has_schema_privilege('service_role', n.nspname, 'USAGE') AS service_has_usage,
    pg_catalog.pg_get_userbyid(n.nspowner) AS owner
FROM pg_catalog.pg_namespace n
WHERE n.nspname = 'workforce';

-- 2. Check search path for roles
SELECT rolname, rolconfig FROM pg_roles WHERE rolname IN ('authenticated', 'anon', 'authenticator', 'service_role');
