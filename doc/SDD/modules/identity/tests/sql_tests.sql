-- ============================================================
-- Identity Module SQL Test Suite
-- Run these in the Supabase SQL Editor or psql in phase order.
-- Every test has an ID: TEST-SQL-{N}
-- Expected results are in comments below each query.
-- ============================================================

-- ============================================================
-- PHASE 1: Schema & RLS Existence Tests
-- ============================================================

-- TEST-SQL-001: Verify core identity tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'identity'
  AND table_name IN (
    'organizations', 'users', 'organization_users',
    'roles', 'teams', 'locations', 'user_roles', 'user_teams',
    'modules', 'org_module_configs'
  )
ORDER BY table_name;
-- Expected: 10 rows returned

-- TEST-SQL-002: Verify RLS state on identity tables
-- ⚠️ Known: organizations and users should show RLS OFF (GAP-001, GAP-002)
SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'identity'
  AND c.relkind = 'r'
  AND c.relname IN ('organizations', 'users', 'organization_users', 'roles', 'teams', 'user_teams', 'user_roles')
ORDER BY c.relname;
-- Expected:
--   organization_users | true
--   organizations      | false  ← GAP-001: P0 BUG — should be true
--   roles              | true
--   teams              | true
--   user_roles         | true
--   user_teams         | true
--   users              | false  ← GAP-002: P0 BUG — should be true

-- TEST-SQL-003: Verify audit columns on organization_users
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'identity'
  AND table_name = 'organization_users'
  AND column_name IN ('id', 'organization_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'is_active')
ORDER BY column_name;
-- Expected: 7 rows (all 7 columns present)

-- TEST-SQL-004: Verify user_teams has organization_id column (required for RLS)
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'identity'
  AND table_name = 'user_teams'
  AND column_name = 'organization_id';
-- Expected: 1 row, organization_id column exists
-- If 0 rows: GAP-007 is critical — direct INSERTs to user_teams will fail RLS

-- TEST-SQL-005: Verify triggers on organization_users
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'identity'
  AND event_object_table = 'organization_users'
ORDER BY trigger_name;
-- Expected: At minimum these triggers present:
--   trg_provision_hr_profiles
--   trg_provision_unified_contacts
--   trg_provision_finance_financial_profiles
--   trg_provision_core_unified_objects

-- TEST-SQL-006: Verify RLS functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'identity'
  AND routine_name IN (
    'get_current_org_id',
    'rls_bootstrap_entity_policy',
    'is_saas_admin',
    'jwt_get_user_session'
  )
ORDER BY routine_name;
-- Expected: 4 rows


-- ============================================================
-- PHASE 2: RPC Function Tests
-- Substitute real UUIDs from your environment where shown.
-- ============================================================

-- TEST-SQL-007: onboard_search_crm_accounts — basic search
SELECT * FROM public.onboard_search_crm_accounts('Test')
LIMIT 5;
-- Expected: Returns 0 or more matching CRM accounts that are not yet active tenants.
-- No error = PASS.

-- TEST-SQL-008: onboard_request_zoworks_account — create pending org
-- ⚠️ This creates real data. Use a test email to avoid side effects.
SELECT public.onboard_request_zoworks_account(
    p_org_name          := 'TEST-SQL-008 Org',
    p_admin_first_name  := 'Test',
    p_admin_last_name   := 'Agent',
    p_admin_email       := 'test_agent_008@example.com',
    p_admin_mobile      := '+15550000008',
    p_requested_modules := '["crm"]'::jsonb
) AS created_org_id;
-- Expected: Returns a UUID (the new organization id)
-- Verify: SELECT is_active FROM identity.organizations WHERE id = '<returned_uuid>';
--         Expected: is_active = false

-- TEST-SQL-009: Verify pending org has correct state after TEST-SQL-008
-- Replace <ORG_ID> with UUID from TEST-SQL-008
SELECT name, is_active, claimed_by_contact_id
FROM identity.organizations
WHERE name = 'TEST-SQL-008 Org';
-- Expected: 1 row, is_active = false

-- TEST-SQL-010: onboard_promote_to_tenant Phase 1 — should return NEED_INVITE
-- Replace <ORG_ID> with UUID from TEST-SQL-008
SELECT identity.onboard_promote_to_tenant(
    p_org_id := '<ORG_ID_FROM_TEST_008>'
) AS promote_result;
-- Expected: {"status": "NEED_INVITE", "email": "test_agent_008@example.com", ...}
-- If {"status": "success"}: user already exists — use a different test email

-- TEST-SQL-011: onboard_invite_user_to_org — invite existing user (no auth_id needed)
-- Prerequisites: User must already exist in identity.users (from a previous invite)
-- Replace <ORG_ID>, <USER_AUTH_ID>, <ROLE_ID>, <TEAM_ID>, <LOCATION_ID>
SELECT identity.onboard_invite_user_to_org(
    p_email       := 'aslamnihaal2003@gmail.com',
    p_first_name  := 'Bob',
    p_last_name   := 'Builder',
    p_org_id      := 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2',
    p_auth_id     := 'a6d9ef2b-4334-450c-9208-532ff6deff65',
    p_details     := '{"designation": "Engineer", "department": "Engineering", "mobile": "+15550002222"}'::jsonb
) AS invite_result;
-- Expected: {"status": "success", "user_id": "...", "org_user_id": "..."}
-- Note: p_role_id, p_team_id, p_location_id omitted intentionally — safe to call again later to add them.

-- TEST-SQL-012: Verify triggers fired after TEST-SQL-011
-- Replace <ORG_USER_ID> with org_user_id from TEST-SQL-011 result
SELECT EXISTS (
    SELECT 1 FROM hr.profiles WHERE id = '<ORG_USER_ID>'
) AS hr_profile_exists,
EXISTS (
    SELECT 1 FROM unified.contacts WHERE id = '<ORG_USER_ID>'
) AS unified_contact_exists;
-- Expected: both = true (triggers provisioned them automatically)

-- TEST-SQL-013: onboard_invite_user_to_org — second call to add missing team/role/location (upsert)
-- This demonstrates idempotency: same user, same org, now adding missing assignments.
-- Replace UUIDs with values from your environment.
SELECT identity.onboard_invite_user_to_org(
    p_email       := 'aslamnihaal2003@gmail.com',
    p_first_name  := 'Bob',
    p_last_name   := 'Builder',
    p_org_id      := 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2',
    p_auth_id     := 'a6d9ef2b-4334-450c-9208-532ff6deff65',
    p_role_id     := '<ROLE_UUID>',
    p_team_id     := '<TEAM_UUID>',
    p_location_id := '<LOCATION_UUID>',
    p_details     := '{"designation": "Senior Engineer", "department": "Engineering"}'::jsonb
) AS update_result;
-- Expected: {"status": "success", "user_id": "...", "org_user_id": "..."}
-- organization_users row UPDATED (not duplicated)
-- user_teams row INSERTED (new)
-- user_roles row INSERTED (new)

-- TEST-SQL-014: Verify team and role assignments after TEST-SQL-013
SELECT
    ut.team_id,
    t.name AS team_name,
    ur.role_id,
    r.name AS role_name
FROM identity.organization_users ou
LEFT JOIN identity.user_teams ut ON ut.organization_user_id = ou.id
LEFT JOIN identity.teams t ON t.id = ut.team_id
LEFT JOIN identity.user_roles ur ON ur.organization_user_id = ou.id
LEFT JOIN identity.roles r ON r.id = ur.role_id
WHERE ou.organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2'
  AND ou.user_id = (SELECT id FROM identity.users WHERE email = 'aslamnihaal2003@gmail.com');
-- Expected: 1 row with team_name and role_name filled in

-- ============================================================
-- PHASE 3: Trigger Verification
-- ============================================================

-- TEST-SQL-015: Confirm no duplicate organization_users after idempotent call
SELECT COUNT(*)
FROM identity.organization_users
WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2'
  AND user_id = (SELECT id FROM identity.users WHERE email = 'aslamnihaal2003@gmail.com');
-- Expected: 1 (ON CONFLICT did its job)

-- TEST-SQL-016: Verify HR profile was enriched by TEST-SQL-013
SELECT job_title, department, employment_type, employment_status
FROM hr.profiles
WHERE id = (
    SELECT id FROM identity.organization_users
    WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2'
      AND user_id = (SELECT id FROM identity.users WHERE email = 'aslamnihaal2003@gmail.com')
);
-- Expected: job_title = 'Senior Engineer', department = 'Engineering', employment_status = 'active'

-- ============================================================
-- PHASE 4: Metadata Queries (Grab IDs for testing)
-- ============================================================

-- Get roles, teams, locations for org (needed when testing invite with assignments)
SELECT id, name FROM identity.roles WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2';
SELECT id, name FROM identity.teams WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2';
SELECT id, name FROM identity.locations WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2';

-- Get organization_user_id for a specific user in an org
SELECT id AS org_user_id
FROM identity.organization_users
WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2'
  AND user_id = (SELECT id FROM identity.users WHERE email = 'aslamnihaal2003@gmail.com');
