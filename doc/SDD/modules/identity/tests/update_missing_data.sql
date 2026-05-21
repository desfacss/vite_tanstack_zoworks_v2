-- ============================================================
-- Identity Module — Update Missing Data Patterns
-- Use this file when a user was invited without team/role/location
-- and you need to add the missing assignments later.
--
-- Context from session 2026-05-21:
--   User 'aslamnihaal2003@gmail.com' was invited with:
--     onboard_invite_user_to_org(...) — without p_team_id, p_role_id, p_location_id
--   These patterns show how to add the missing data safely.
-- ============================================================


-- ============================================================
-- PATTERN 1: Use the RPC as an Upsert (RECOMMENDED)
-- Call onboard_invite_user_to_org again with the missing fields.
-- Safe to call multiple times — uses ON CONFLICT throughout.
-- ============================================================

-- Step 1: Get IDs you need
SELECT id, name FROM identity.roles    WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2';
SELECT id, name FROM identity.teams    WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2';
SELECT id, name FROM identity.locations WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2';

-- Step 2: Call RPC with the missing fields populated
-- Replace <ROLE_UUID>, <TEAM_UUID>, <LOCATION_UUID> with values from Step 1
SELECT identity.onboard_invite_user_to_org(
    p_email       := 'aslamnihaal2003@gmail.com',
    p_first_name  := 'Bob',
    p_last_name   := 'Builder',
    p_org_id      := 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2',
    p_auth_id     := 'a6d9ef2b-4334-450c-9208-532ff6deff65',  -- existing auth id
    p_role_id     := '<ROLE_UUID>',
    p_team_id     := '<TEAM_UUID>',
    p_location_id := '<LOCATION_UUID>',
    p_details     := '{"designation": "Engineer", "department": "Engineering", "mobile": "+15550002222"}'::jsonb
) AS update_result;
-- Expected: {"status": "success", "user_id": "...", "org_user_id": "..."}
-- What happens internally:
--   - identity.users: found by email → no new row created
--   - identity.organization_users: ON CONFLICT → UPDATE location_id, is_active=true, updated_at
--   - hr.profiles: UPDATE job_title, department, employment_type, employment_status
--   - identity.user_teams: INSERT (ON CONFLICT DO NOTHING if team already assigned)
--   - identity.user_roles: INSERT (ON CONFLICT DO NOTHING if role already assigned)


-- ============================================================
-- PATTERN 2: Direct INSERT to identity.user_teams
-- Use ONLY when you know the org_user_id already.
-- ⚠️ MUST include organization_id — RLS requires it (GAP-007 / CHANGE-003).
-- ============================================================

-- Step 1: Get org_user_id
SELECT id AS org_user_id
FROM identity.organization_users
WHERE organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2'
  AND user_id = (
      SELECT id FROM identity.users WHERE email = 'aslamnihaal2003@gmail.com'
  );
-- Save the returned id as <ORG_USER_ID>

-- Step 2: Insert team assignment (CORRECT — with organization_id)
INSERT INTO identity.user_teams (
    organization_user_id,
    team_id,
    created_by,
    organization_id   -- ← REQUIRED for RLS — do not omit!
) VALUES (
    '<ORG_USER_ID>',
    '<TEAM_UUID>',
    '<YOUR_USER_UUID>',    -- the admin performing this action (auth.uid())
    'a41b2216-736c-4c00-99ca-30a0cd8ca0d2'
)
ON CONFLICT (organization_user_id, team_id) DO NOTHING;
-- ON CONFLICT prevents duplicate team assignment


-- ============================================================
-- PATTERN 3: Direct INSERT to identity.user_roles
-- Same rule: organization_id is required.
-- ⚠️ user_roles also requires team_id — role is assigned within a team context.
-- ============================================================

INSERT INTO identity.user_roles (
    organization_user_id,
    role_id,
    team_id,
    organization_id,   -- ← REQUIRED for RLS
    created_by
) VALUES (
    '<ORG_USER_ID>',
    '<ROLE_UUID>',
    '<TEAM_UUID>',
    'a41b2216-736c-4c00-99ca-30a0cd8ca0d2',
    '<YOUR_USER_UUID>'
)
ON CONFLICT (organization_user_id, role_id, team_id) DO NOTHING;


-- ============================================================
-- PATTERN 4: Update location on organization_users
-- If p_location_id was omitted in the original invite.
-- ============================================================

UPDATE identity.organization_users
SET
    location_id = '<LOCATION_UUID>',
    updated_at  = now()
WHERE id = '<ORG_USER_ID>';
-- Expected: 1 row updated


-- ============================================================
-- PATTERN 5: Update HR profile directly
-- If designation/department/employment_type needs to be corrected.
-- The id on hr.profiles = org_user_id (shared UUID from trigger).
-- ============================================================

UPDATE hr.profiles
SET
    job_title        = 'Senior Engineer',
    department       = 'Engineering',
    employment_type  = 'full-time',
    employment_status = 'active',
    updated_at       = now()
WHERE id = '<ORG_USER_ID>';


-- ============================================================
-- VERIFICATION: Confirm all assignments after update
-- ============================================================

SELECT
    ou.id                   AS org_user_id,
    u.email,
    u.name                  AS user_name,
    l.name                  AS location,
    t.name                  AS team,
    r.name                  AS role,
    hp.job_title,
    hp.department,
    hp.employment_status
FROM identity.organization_users ou
JOIN identity.users u              ON u.id = ou.user_id
LEFT JOIN identity.locations l     ON l.id = ou.location_id
LEFT JOIN identity.user_teams ut   ON ut.organization_user_id = ou.id
LEFT JOIN identity.teams t         ON t.id = ut.team_id
LEFT JOIN identity.user_roles ur   ON ur.organization_user_id = ou.id
LEFT JOIN identity.roles r         ON r.id = ur.role_id
LEFT JOIN hr.profiles hp           ON hp.id = ou.id
WHERE ou.organization_id = 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2'
  AND u.email = 'aslamnihaal2003@gmail.com';
-- Expected: 1 row with all fields populated


-- ============================================================
-- ANTI-PATTERN: What NOT to do
-- The following will FAIL at RLS — do not use.
-- ============================================================

-- ❌ WRONG: Missing organization_id in user_teams
-- INSERT INTO identity.user_teams (organization_user_id, team_id, created_by)
-- VALUES ('<ORG_USER_ID>', '<TEAM_UUID>', '<ADMIN_UUID>');
-- FAILS: RLS policy blocks INSERT without organization_id

-- ❌ WRONG: Using api_new_upsert without organization_id in data payload
-- SELECT core.api_new_core_upsert_data(
--     table_name := 'identity.user_teams',
--     data := '{"organization_user_id": "...", "team_id": "..."}'::jsonb
-- );
-- FAILS: Same RLS reason — organization_id must be in the data payload

-- ✅ CORRECT: Use api_new_core_upsert_data WITH organization_id
SELECT core.api_new_core_upsert_data(
    'identity.user_teams',
    jsonb_build_object(
        'organization_user_id', '<ORG_USER_ID>',
        'team_id',              '<TEAM_UUID>',
        'organization_id',      'a41b2216-736c-4c00-99ca-30a0cd8ca0d2',
        'created_by',           '<YOUR_USER_UUID>'
    )
);
