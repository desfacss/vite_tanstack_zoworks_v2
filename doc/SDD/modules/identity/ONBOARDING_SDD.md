# Onboarding Module — System Design Document
## Identity Schema: Onboarding Subsystem

> **SDD Version**: 2.1 — 2026-05-23  
> **Session**: 2026-05-23 ~16:45–17:17 IST  
> **Author**: Engineering (CPO Lens)  
> **Status**: Living Document — supersedes inline MODULE_SPEC.md onboarding sections  
> **References**:  
> - `supabase/migrations/202606010090_onboarding_functions.sql`  
> - `supabase/migrations/202606010041_identity_functions_tier0.sql` (lines 2003–2122)  
> - `supabase/migrations/202606010091_auth_sync_triggers.sql`  
> - `supabase/migrations/202606010020_identity_tables.sql` (DDL source of truth)  
> - `SDD/modules/identity/MODULE_SPEC.md`

---

## Table of Contents

1. [Business Context](#1-business-context)
2. [Onboarding Vectors — Entry Points](#2-onboarding-vectors)
3. [Use Cases with Full Flow Analysis](#3-use-cases)
4. [Default Infrastructure at Org Activation](#4-default-infrastructure-at-org-activation)
5. [Global Template Roles Pattern](#5-global-template-roles-pattern)
6. [Architecture Gaps & Root Causes](#6-architecture-gaps--root-causes)
7. [Target Architecture Decision Table](#7-target-architecture-decision-table)
8. [SaaS Admin Org Visibility](#8-saas-admin-org-visibility)
9. [Trigger vs. Edge Function Strategy](#9-trigger-vs-edge-function-strategy)
10. [Test Cases](#10-test-cases)
11. [Proposed Fixes — Prioritized](#11-proposed-fixes--prioritized)

---

## 1. Business Context

The Onboarding Subsystem bridges three distinct phases:

| Phase | Actor | System | Goal |
|---|---|---|---|
| **Self-Registration** | Prospective Customer | Public API (`public.*` functions) | Capture interest, create CRM record, queue pending org |
| **Admin Activation** | SaaS Global Admin | Internal RPC (`identity.*`) | Approve tenant, provision infrastructure, invite primary admin |
| **User Invitation** | Tenant Admin | RPC + Auth trigger | Add additional users to an active tenant |

---

## 2. Onboarding Vectors

### When NEITHER Company NOR User Exists in CRM — Vector C

> **Q: If a company and user do not exist in CRM, are we allowing creation of inactive org and identity records?**

**Answer: YES for CRM records and inactive org. CORRECT to withhold `identity.users` and `identity.organization_users` until after approval AND auth invite accepted.**

Here is the exact trace:

```
Prospect fills /web_register
          │
          ▼
  onboard_search_crm_accounts(p_query)  ← returns [] (no match)
          │
          ▼
  onboard_create_lead_account('NewCo Ltd')
  ├── unified.organizations { name: 'NewCo Ltd' }         ← CREATED ✅
  └── crm.accounts { type: 'prospect', org: zoworks_id }  ← CREATED ✅
  → Returns: { status: 'created', account_id: 'xyz' }
          │
          ▼
  onboard_request_zoworks_account(account_id='xyz', email='new@newco.com', ...)
  ├── crm.contacts { email: 'new@newco.com' }                ← CREATED ✅ (new, linked to account)
  └── identity.organizations { is_active: false }            ← CREATED ✅ (pending)
  → identity.users                                           ← NOT CREATED ❌ (correct — no auth yet)
  → identity.organization_users                              ← NOT CREATED ❌ (correct — no auth yet)
```

**Why withholding `identity.users` is CORRECT at this stage:**

1. No `auth.users` record exists yet — `identity.users.auth_id` would be NULL, breaking the auth→identity link
2. No password/credentials exist — the user cannot log in even if the record was created
3. `identity.organization_users` requires a valid `organization_id` FK — and the org is still `is_active = false` with no role/location/team infrastructure
4. Creating identity records prematurely would require a cleanup step if the request is rejected

**Where ARE they created?** — At admin activation:
```
identity.onboard_promote_to_tenant(p_org_id, p_auth_id)
   └── identity.onboard_invite_user_to_org(...)
         ├── identity.users        ← CREATED HERE ✅ (Step 6 of activation)
         └── identity.organization_users ← CREATED HERE ✅ (Step 6 of activation)
```

The creation is deferred to the point where:
- ✅ The org is approved and active
- ✅ The default role, location, and team are provisioned
- ✅ The auth invite has been sent and `auth_id` is available

---

## 3. Use Cases

### UC-1: Self-Registration — Brand New Company, Brand New User (Vector C)

**Records Created**:
| Table | Created? | Notes |
|---|---|---|
| `unified.organizations` | ✅ YES | Company anchor record |
| `crm.accounts` | ✅ YES | CRM representation (prospect type) |
| `crm.contacts` | ✅ YES | Brand new, linked to account |
| `identity.organizations` | ✅ YES (inactive) | Pending SaaS admin approval |
| `identity.users` | ❌ NO | Deferred until auth invite accepted |
| `identity.organization_users` | ❌ NO | Deferred until org activated |
| `identity.roles` | ❌ NO | Provisioned at activation |
| `identity.locations` | ❌ NO | Provisioned at activation |
| `identity.teams` | ❌ NO | Provisioned at activation |

---

### UC-2: SaaS Admin Approves Tenant — Full Cohesive Sequence

```
Step 1: Admin calls onboard_promote_to_tenant(p_org_id, p_auth_id := NULL)
   → Checks identity.users WHERE email = claimant email → NOT FOUND
   → Returns: { status: 'NEED_INVITE', email: '...', first_name: '...' }
   NOTE: Org NOT yet activated at this point — returns early

Step 2: Admin/edge function sends Supabase auth invite
   → supabase.auth.admin.inviteUserByEmail(email, { data: { organization_id } })
   → Returns: { user: { id: 'auth-uuid' } }

Step 3: Admin calls onboard_promote_to_tenant(p_org_id, p_auth_id := 'auth-uuid')
   → SET identity.organizations.is_active = true                ← Activated
   → Provision modules from catalog.offerings                   ← Modules linked
   → CREATE identity.roles { name: 'Superadmin', copied from global template }  ← See Section 5
   → CREATE identity.locations { name: 'Main' }                 ← Default location
   → CREATE identity.teams { name: 'General' }                  ← Default team
   → CALL identity.onboard_invite_user_to_org(
         p_email, p_first_name, p_last_name,
         p_org_id, p_role_id := <superadmin_role_id>,
         p_location_id := <main_location_id>,
         p_team_id := <general_team_id>,
         p_auth_id := 'auth-uuid'
     )
     ├── identity.users         ← CREATED (linked to auth_id)
     ├── identity.organization_users ← CREATED (with location assigned)
     ├── identity.user_roles    ← CREATED (Superadmin role assigned)
     └── hr.profiles            ← CREATED (via bonded trigger on org_users INSERT)
```

---

### UC-3: Tenant Admin Invites Additional Users

After org activation, Tenant Admin invites staff. Same `onboard_invite_user_to_org` function is used but:
- Org defaults now exist (role, location, team)
- DB trigger handles auth→identity sync for new auth invites
- Cross-tenant users skip auth invite (existing `auth_id` reused)

---

## 4. Default Infrastructure at Org Activation

When `identity.onboard_promote_to_tenant` runs Step 5, it creates three records. Based on the DDL and the user's correction:

### Correct Default Names (Updated)

| Object | Current Code | **Correct Target** | Rationale |
|---|---|---|---|
| `identity.roles` | `'SuperAdmin'` with `{"*": true}` | **`'Superadmin'`** copied from global template | Match template record; use full permissions JSONB |
| `identity.locations` | `'Headquarters'` | **`'Main'`** | Simpler, user-specified default |
| `identity.teams` | `'Leadership Team'` | **`'General'`** | Simpler, user-specified default |

### Are These Per-Org Copies or Shared?

**They are PER-ORG COPIES — always.** Reasons:

1. **`identity.locations`**: DDL has `organization_id uuid NOT NULL` — cannot be shared. Templates not possible.
2. **`identity.teams`**: DDL has `organization_id uuid NOT NULL` — cannot be shared. Templates not possible.
3. **`identity.roles`**: DDL has `organization_id uuid` (NULLABLE) — templates ARE possible. But org-specific copies are REQUIRED for:
   - RLS policies filter `WHERE organization_id = current_org_id`
   - `identity.user_roles` FK points to the role's `id` — if multiple orgs shared one role record, deactivating or modifying it for one tenant would affect all tenants

**Conclusion**: Each activated org always gets its own copies of these records. The global template (with `organization_id = NULL`) serves as the source of permissions to COPY FROM — it is never used directly.

---

## 5. Global Template Roles Pattern

### What the Schema Tells Us

From `supabase/migrations/202606010020_identity_tables.sql`:

```sql
CREATE TABLE identity.roles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid,          -- ← NULLABLE: allows global templates
    name text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_sassadmin boolean DEFAULT false,
    ...
);

-- Unique constraint allows: (NULL, 'Superadmin') AND ('org-uuid', 'Superadmin') to coexist
ALTER TABLE ONLY identity.roles
    ADD CONSTRAINT roles_organization_id_name_key UNIQUE (organization_id, name);
```

### The Template Record (From User's Data)

```
id:              44444444-1111-1111-1111-111111111111
organization_id: NULL  ← Global template, not org-specific
name:            Superadmin
permissions:     { full rich JSONB with fsm, core, admin, support, identity, workforce, etc. }
is_sassadmin:    false
is_active:       true
```

### The Correct Pattern: Copy from Template at Activation

**Current code (incorrect)**:
```sql
INSERT INTO identity.roles (organization_id, name, permissions, is_active)
VALUES (p_org_id, 'SuperAdmin', '{"*": true}'::jsonb, true)
```
Problems:
- Wrong name (`'SuperAdmin'` vs `'Superadmin'`)
- Wrong permissions (`{"*": true}` is a wildcard shortcut, not the actual feature-level permissions the UI needs)
- Does not inherit the rich `fsm`, `core`, `support`, `identity` permission structure

**Target code (correct)**:
```sql
-- 1. Copy permissions from global template role
INSERT INTO identity.roles (organization_id, name, permissions, is_active, feature, is_sassadmin)
SELECT
    p_org_id,                    -- bind to new org
    r.name,                      -- 'Superadmin' from template
    r.permissions,               -- full rich JSONB copied from template
    true,
    r.feature,
    false                        -- per-org Superadmin is NOT a SaaS admin
FROM identity.roles r
WHERE r.organization_id IS NULL
  AND r.name = 'Superadmin'
  AND r.is_active = true
LIMIT 1
ON CONFLICT (organization_id, name) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    updated_at = now()
RETURNING id INTO v_role_id;

-- 2. Fallback: if no template exists, create with basic admin permissions
IF v_role_id IS NULL THEN
    INSERT INTO identity.roles (organization_id, name, permissions, is_active)
    VALUES (p_org_id, 'Superadmin', '{"*": true}'::jsonb, true)
    RETURNING id INTO v_role_id;
END IF;

-- 3. Also create a default Staff role (needed for trigger fallback)
INSERT INTO identity.roles (organization_id, name, permissions, is_active)
SELECT p_org_id, 'Staff', permissions, true
FROM identity.roles
WHERE organization_id IS NULL AND name = 'Staff' AND is_active = true
LIMIT 1
ON CONFLICT (organization_id, name) DO NOTHING;
```

### Template Role Architecture Summary

```
identity.roles
│
├── organization_id = NULL, name = 'Superadmin'   ← Global Template (read-only, platform-managed)
│   permissions: { fsm: {...}, core: {...}, support: {...}, ... }  (full feature set)
│
├── organization_id = NULL, name = 'Staff'         ← Global Template
│   permissions: { ... limited set ... }
│
├── organization_id = 'org-uuid-A', name = 'Superadmin'  ← Per-org COPY (editable by tenant)
│   permissions: COPIED from template at activation
│
└── organization_id = 'org-uuid-A', name = 'Staff'       ← Per-org COPY
    permissions: COPIED from template at activation
```

**Why per-org copies AND not shared templates:**
- Tenant admin can edit their own Superadmin permissions without affecting other tenants
- RLS `organization_id` filters would exclude template rows (`organization_id IS NULL`) from tenant queries
- User_roles.role_id FK points to the org-specific copy — clean cascade on org delete

---

## 6. Architecture Gaps & Root Causes

| ID | Gap | Root Cause | Severity |
|---|---|---|---|
| **G-01** | DB trigger fires before org infrastructure exists | Auth invite sent BEFORE `onboard_promote_to_tenant` (second call) | 🔴 P0 |
| **G-02** | Users get no role after trigger runs on inactive org | Trigger finds no role/location/team because org not yet activated | 🔴 P0 |
| **G-03** | SaaS admin cannot see tenant orgs | `get_my_organizations` has no `is_saas_admin()` bypass | 🔴 P0 |
| **G-04** | Activation copies simplified `{"*": true}` instead of full template permissions | Hardcoded permissions in `onboard_promote_to_tenant` | 🔴 P0 |
| **G-05** | Wrong default names: `'SuperAdmin'`, `'Headquarters'`, `'Leadership Team'` | Hardcoded strings in `onboard_promote_to_tenant` Step 5 | 🟡 P1 |
| **G-06** | No `Staff` default role provisioned at activation | Only `SuperAdmin`/`Superadmin` created — trigger fallback fails | 🟡 P1 |
| **G-07** | No atomic edge function enforcing correct sequence | "activate then invite" sequence not enforced at code level | 🟡 P1 |
| **G-08** | `invite_users` Shape A response omits `auth_user_id` | Edge function response inconsistency | 🟡 P1 |

---

## 7. Target Architecture Decision Table

| Decision | Current | Target | Rationale |
|---|---|---|---|
| Default role name | `'SuperAdmin'` | **`'Superadmin'`** | Match global template record |
| Default role permissions | `{"*": true}` | **Copied from global template** | Full feature-level permissions required by UI |
| Default location name | `'Headquarters'` | **`'Main'`** | User-specified |
| Default team name | `'Leadership Team'` | **`'General'`** | User-specified |
| Template vs. per-org roles | N/A | **Per-org copies, source = global template** | Tenant isolation + editability |
| `Staff` role | Not provisioned | **Created alongside Superadmin** | Trigger fallback needs it |
| Auth invite timing | Uncontrolled | **ONLY after activate confirms `NEED_INVITE`** | Prevents race condition |
| SaaS admin org view | Only own memberships | **Dedicated `get_all_organizations_admin()`** | Clean separation |

---

## 8. SaaS Admin Org Visibility

**Decision: Do NOT add SaaS admin to every tenant org.**

The `identity.is_saas_admin()` function checks:
```sql
WHERE ou.user_id = p_user_id
  AND o.is_system_org = true     ← Must be in Zoworks system org
  AND r.is_sassadmin = true      ← Must have a sass admin role
```

`ravi@claritiz.com` IS a SaaS admin. But `get_my_organizations()` only returns orgs where he has `organization_users` rows. Solution: a dedicated function callable from the admin panel:

```sql
CREATE OR REPLACE FUNCTION identity.get_all_organizations_admin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT identity.is_saas_admin() THEN
        RAISE EXCEPTION 'Access denied: SaaS admin role required';
    END IF;
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'organization_id',   o.id,
                'organization_name', o.name,
                'is_active',         o.is_active,
                'tier',              o.tier,
                'claimed_by_email',  c.email,
                'claimed_by_name',   c.name,
                'claimed_at',        o.claimed_at,
                'settings',          o.settings
            ) ORDER BY o.created_at DESC
        ), '[]'::jsonb)
        FROM identity.organizations o
        LEFT JOIN unified.contacts c ON o.claimed_by_contact_id = c.id
        WHERE NOT COALESCE(o.is_system_org, false)
    );
END; $$;
```

---

## 9. Trigger vs. Edge Function Strategy

```
Edge Function (invite-tenant-admin) = Sequencing Controller
DB Trigger (sync_auth_user_to_identity) = Universal Safety Net
```

### Correct Sequence (Edge Function Enforces)

```
[invite-tenant-admin edge function]
1. Call onboard_promote_to_tenant(org_id, NULL)
   → Activates org
   → Copies Superadmin permissions from global template
   → Creates 'Main' location
   → Creates 'General' team
   → Creates 'Staff' role
   → Returns NEED_INVITE

2. Call supabase.auth.admin.inviteUserByEmail(email, {
     data: { organization_id: org_id, first_name, last_name }
   })

   ↓ DB Trigger fires (AFTER INSERT on auth.users)
     → org_id found in metadata
     → is_active = true confirmed (org was just activated in step 1)
     → Resolves Superadmin role ✅
     → Resolves 'Main' location ✅
     → Resolves 'General' team ✅
     → Creates all 6 cohesive records ✅
```

### Trigger Guard for Inactive Orgs

```sql
-- Add after extracting v_org_id in trg_on_auth_user_created:
IF v_org_id IS NOT NULL THEN
    IF NOT EXISTS (
        SELECT 1 FROM identity.organizations 
        WHERE id = v_org_id AND is_active = true
    ) THEN
        -- Org not activated yet — create only base identity.users
        PERFORM identity.util_resolve_or_create_user(
            p_email := NEW.email, p_mobile := NEW.phone,
            p_auth_id := NEW.id, p_name := v_name,
            p_details := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
            p_created_by := NEW.id
        );
        RETURN NEW;  -- Exit early, skip tenant provisioning
    END IF;
    -- ... proceed with full cohesive onboarding
```

---

## 10. Test Cases

### TC-01: Vector C — Brand New Company, Brand New User

```sql
-- Step 1: Create lead account (company doesn't exist in CRM)
SELECT public.onboard_create_lead_account('FreshCo Ltd', 'technology', 'freshco.com');
-- Expected: { "status": "created", "account_id": "<uuid>" }

-- Verify: company exists in unified and crm
SELECT id FROM unified.organizations WHERE name = 'FreshCo Ltd';   -- 1 row
SELECT id, type FROM crm.accounts WHERE name = 'FreshCo Ltd';      -- 1 row, type = 'prospect'

-- Step 2: Submit registration (user doesn't exist in crm.contacts)
SELECT public.onboard_request_zoworks_account(
    p_account_id       := '<account_id>',
    p_admin_email      := 'new@freshco.com',
    p_admin_first_name := 'New',
    p_admin_last_name  := 'Admin',
    p_requested_modules := '["crm"]'
);
-- Expected: { "status": "requested", "organization_id": "<uuid>" }

-- Verify: CRM contact created
SELECT id FROM crm.v_contacts WHERE email = 'new@freshco.com';    -- 1 row

-- Verify: pending org created
SELECT id, is_active FROM identity.organizations WHERE name = 'FreshCo Ltd';
-- Expected: 1 row, is_active = false

-- CRITICAL: Verify identity.users NOT created yet
SELECT id FROM identity.users WHERE email = 'new@freshco.com';     -- 0 rows (correct!)
SELECT id FROM identity.organization_users WHERE organization_id = '<org_id>'; -- 0 rows (correct!)
```

---

### TC-02: Admin Activation — Template Permissions Copied

```sql
-- After auth invite sent with org_id in metadata:
SELECT identity.onboard_promote_to_tenant('<pending-org-id>', '<auth-uuid>');
-- Expected: { "status": "success" }

-- Verify default names (updated from old hardcoded values):
SELECT name FROM identity.roles WHERE organization_id = '<org-id>' AND name = 'Superadmin';
-- Expected: 1 row with name 'Superadmin' (not 'SuperAdmin')

SELECT name FROM identity.locations WHERE organization_id = '<org-id>';
-- Expected: 1 row with name 'Main' (not 'Headquarters')

SELECT name FROM identity.teams WHERE organization_id = '<org-id>';
-- Expected: 1 row with name 'General' (not 'Leadership Team')

-- Verify permissions were copied from template (NOT simple {"*": true})
SELECT permissions->'core' IS NOT NULL AS has_core_perms,
       permissions->'support' IS NOT NULL AS has_support_perms,
       permissions->'identity' IS NOT NULL AS has_identity_perms
FROM identity.roles
WHERE organization_id = '<org-id>' AND name = 'Superadmin';
-- Expected: all true (full feature permissions, not just wildcard)

-- Verify identity.users NOW created
SELECT id, auth_id FROM identity.users WHERE email = 'new@freshco.com';
-- Expected: 1 row, auth_id = '<auth-uuid>'

-- Verify organization_users NOW created with role assigned
SELECT id, is_active FROM identity.organization_users WHERE organization_id = '<org-id>';
-- Expected: 1 row, is_active = true

SELECT ur.role_id, r.name 
FROM identity.user_roles ur
JOIN identity.roles r ON r.id = ur.role_id
WHERE ur.organization_id = '<org-id>';
-- Expected: 1 row, role name = 'Superadmin'

-- Verify Staff role also created
SELECT id FROM identity.roles WHERE organization_id = '<org-id>' AND name = 'Staff';
-- Expected: 1 row
```

---

### TC-03: Global Template Role Exists

```sql
-- Verify the global Superadmin template exists
SELECT id, organization_id, name, is_active
FROM identity.roles
WHERE organization_id IS NULL AND name = 'Superadmin';
-- Expected: 1 row (the template record with id = 44444444-1111-1111-1111-111111111111)

-- Verify permissions are rich (not just {"*":true})
SELECT jsonb_object_keys(permissions) AS permission_modules
FROM identity.roles
WHERE organization_id IS NULL AND name = 'Superadmin';
-- Expected: fsm, core, admin, support, identity, settings, contracts, workforce, contractmgmt
```

---

### TC-04: SaaS Admin Sees All Orgs

```sql
-- Switch to ravi@claritiz.com context
SELECT identity.get_all_organizations_admin();
-- Expected: JSON array containing ALL orgs including inactive/pending ones
-- Expected: Does NOT include system org (Zoworks itself)

-- Verify guard works for non-admin
-- If called by a non-saas-admin user:
-- Expected: ERROR 'Access denied: SaaS admin role required'
```

---

### TC-05: Trigger Guard — Inactive Org Auth Invite

```sql
-- Simulate auth.users INSERT with org_id pointing to INACTIVE org
-- (Only testable via DB-level test or if guard is applied)

-- After guard fix is applied:
-- Verify: identity.users CREATED (base record)
SELECT id FROM identity.users WHERE email = 'early@freshco.com';   -- 1 row

-- Verify: identity.organization_users NOT created (org inactive)
SELECT id FROM identity.organization_users WHERE organization_id = '<inactive-org-id>';
-- Expected: 0 rows (trigger correctly skipped tenant provisioning)
```

---

### TC-06: Cross-Tenant Invitation — No Duplicate Auth Accounts

```sql
SELECT identity.onboard_invite_user_to_org(
    p_email       := 'existing@user.com',
    p_first_name  := 'Existing',
    p_last_name   := 'User',
    p_org_id      := '<second-org-id>',
    p_role_id     := '<staff-role-id>',
    p_team_id     := '<team-id>',
    p_location_id := '<location-id>',
    p_auth_id     := '<existing-auth-id>'
);
-- Expected: { "status": "success", "action": "created" }

-- Verify no duplicate identity.users
SELECT COUNT(*) FROM identity.users WHERE email = 'existing@user.com';
-- Expected: 1 (no duplicates)

-- Verify 2 org memberships
SELECT organization_id FROM identity.organization_users
WHERE user_id = (SELECT id FROM identity.users WHERE email = 'existing@user.com');
-- Expected: 2 rows (original org + second org)
```

---

## 11. Proposed Fixes — Prioritized

| ID | Fix | File | Change |
|---|---|---|---|
| **P0-01** | Copy Superadmin permissions from global template (`organization_id IS NULL`) | `202606010092_onboarding_fixes.sql` | Update `onboard_promote_to_tenant` Step 5 |
| **P0-02** | Rename defaults: `'Main'` location, `'General'` team, `'Superadmin'` role | `202606010092_onboarding_fixes.sql` | Update hardcoded strings |
| **P0-03** | Add `is_active` guard in `trg_on_auth_user_created` | `202606010092_onboarding_fixes.sql` | Skip tenant provisioning if org inactive |
| **P0-04** | Create `identity.get_all_organizations_admin()` | `202606010092_onboarding_fixes.sql` | New function with SaaS admin guard |
| **P0-05** | Create `invite-tenant-admin` atomic edge function | `supabase/functions/invite-tenant-admin/index.ts` | Enforces activate→invite sequence |
| **P1-01** | Provision `Staff` role from template alongside `Superadmin` | `202606010092_onboarding_fixes.sql` | Two roles created at activation |
| **P1-02** | Ensure global template roles exist (`organization_id IS NULL`) | Seed migration or verification | Add if missing |
| **P1-03** | Fix `invite_users` edge function to return `auth_user_id` in Shape A | Deployed edge function | Prevent frontend `undefined` auth_id |

---

## Change Log

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-21 | Initial SDD as part of MODULE_SPEC.md |
| 2.0 | 2026-05-23 16:45 | Extracted onboarding subsystem; added Vector C analysis; auth trigger timing bug |
| 2.1 | 2026-05-23 17:17 | **Added Section 4 (identity.users timing clarification)**; **Added Section 5 (Global Template Roles pattern)**; Corrected default names (Main/General/Superadmin); Documented template→per-org copy pattern; Updated TC-02 to verify rich permissions |
