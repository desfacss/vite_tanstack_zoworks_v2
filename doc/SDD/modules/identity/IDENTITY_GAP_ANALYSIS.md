# Identity Module — Deep Gap Analysis

> **Produced**: 2026-05-21  
> **Sources scanned**: `identity_schema_only.sql` (6,990 lines, 63 functions), all `src/` `.tsx`/`.ts` files  
> **Purpose**: Authoritative audit of what is covered vs missing in the SDD, and what functions need review/deletion.

---

## 1. Use Cases — Coverage Matrix

| # | Use Case | Documented in SDD | Frontend component | Status |
|---|---------|------------------|--------------------|--------|
| UC-1 | Self-service tenant registration | ✅ §2 | `WebRegister.tsx` | ✅ |
| UC-2 | Admin approves tenant | ✅ §2 | `OnboardingRequests.tsx` | ✅ |
| UC-3 | Invite new global user | ✅ §2 | `InviteUserModal.tsx` | ✅ |
| UC-4 | Cross-tenant existing user | ✅ §2 | `InviteUserModal.tsx` | ✅ |
| UC-5 | Login & org selection | ❌ **MISSING** | `Login.tsx`, `useUserSession.ts` | 🔴 Gap |
| UC-6 | Edit user role/team/location (admin) | ❌ **MISSING** | `Settings/Users.tsx` | 🔴 Gap |
| UC-7 | Deactivate / reactivate user | ❌ **MISSING** | `Settings/Users.tsx` | 🔴 Gap |
| UC-8 | Module configuration per org | ❌ **MISSING** | `Settings/ModuleConfigForm.tsx` | 🔴 Gap |
| UC-9 | Role permission management | ❌ **MISSING** | `Settings/RolePermissions.tsx`, `RolesManagement.tsx` | 🔴 Gap |
| UC-10 | Location hierarchy CRUD | ❌ **MISSING** | `LocationsPage.tsx`, `LocationHierarchyManager` | 🔴 Gap |
| UC-11 | Org switch (post-login) | ❌ **MISSING** | `OrgSwitcher.tsx`, `Header`, `Login.tsx` | 🔴 Gap |
| UC-12 | Channel user resolution (WA/Telegram) | ❌ **MISSING** | Backend-only (`resolve_channel_user`) | 🟡 Backend only |
| UC-13 | User profile view | ❌ **MISSING** | `Profile/index.tsx`, `useUserProfile.ts` | 🔴 Gap |

---

## 2. SQL Functions — Complete Inventory vs SDD Coverage

### 2A. Functions IN USE by Frontend (must be in SDD)

| Function | Called From | In SDD §4? | Notes |
|----------|------------|------------|-------|
| `identity.jwt_get_user_session` | `useUserSession.ts:612` | ✅ Listed | Signature correct |
| `identity.get_my_organizations` | `Login.tsx:219`, `Header:68`, `OrgSwitcher:50`, `Settings/index:57` | ❌ **MISSING** | v1 is used, NOT v2 |
| `identity.set_preferred_organization` | `Login.tsx:171`, `OrgSwitcher:142` | ✅ Listed | OK |
| `identity.onboard_promote_to_tenant` | `OnboardingRequests.tsx:107,128` | ✅ Listed | OK |
| `identity.onboard_invite_user_to_org` | `InviteUserModal.tsx:239` | ✅ Listed | OK |
| `identity.get_module_hierarchy` | `ModuleConfigForm.tsx:43` | ❌ **MISSING** | Not in SDD at all |
| `identity.get_organization_module_configs` | `ModuleConfigForm.tsx:47`, `RolePermissions.tsx:52` | ❌ **MISSING** | Two overloads |
| `save_module_configs` | `ModuleConfigForm.tsx:172` | ❌ **MISSING** | ⚠️ **NOT IN SCHEMA** — may be in another schema or doesn't exist |
| `identity.get_applicable_config_type_values` | `RolePermissions.tsx:51` | ❌ **MISSING** | Config type resolver |

### 2B. Functions Used Internally by Other Functions (infrastructure — no SDD needed)

| Function | Used By | Notes |
|----------|---------|-------|
| `identity.get_current_org_id` | RLS policies (all tables) | Listed in §4.2 — OK |
| `identity.get_my_active_org_ids` | `Multi_Org_Access_V5` policy | RLS helper — internal |
| `identity.get_my_org_ids` | `Multi_Org_Access_V5` policy | RLS helper — internal |
| `identity.get_my_user_id` | Internal utility | Used in `is_saas_admin` |
| `identity.jwt_jsonb_merge_deep` | `jwt_get_user_session` internally | Pure utility |
| `identity.rls_get_current_location_id` | RLS | Internal |
| `identity.rls_get_current_persona` | RLS | Internal |
| `identity.rls_util_has_access` | RLS policies | Internal |
| `identity.rls_util_has_workforce_access` | Workforce module RLS | Internal |
| `identity.is_user_sassadmin` | Called inside `jwt_get_user_session` (line 1788) | Internal — but is the TYPO version; `is_saas_admin` is the canonical |
| `identity.validate_workforce_details` | Validation utility | Internal |

### 2C. Active Triggers — SDD Coverage

| Trigger Name | Table | Function Called | In SDD §4.3? |
|-------------|-------|----------------|-------------|
| `reassign_reports_on_deactivation_trg` | `organization_users` AFTER UPDATE `is_active` | `identity.reassign_reports_on_deactivation` | ❌ **MISSING** |
| `trg_sync_org_user_persona` | `organization_users` AFTER INSERT/UPDATE `persona_type` | `identity.trg_sync_org_user_persona` | ❌ **MISSING** |
| `trg_sync_user_to_unified` | `identity.users` AFTER INSERT/UPDATE `email,name,mobile` | `identity.trg_sync_user_to_unified` | ✅ Listed |
| `trg_update_location_path` | `locations` BEFORE INSERT/UPDATE `parent_id` | `identity.update_location_path` | ❌ **MISSING** |
| `trg_validate_user_role_assignment` | `user_roles` BEFORE INSERT/UPDATE | `identity.validate_team_assignment` | ❌ **MISSING** |
| `trg_v_*_shard_exec` (8 triggers) | L5 views | shard handler functions | ❌ **MISSING** (view write-through triggers) |
| `trg_updated_at` (11 triggers) | All identity tables | `public.update_updated_at_column` | ❌ Not critical |

**Trigger functions defined but NOT attached as active triggers (orphaned or for future use):**
- `identity.trg_cleanup_orphaned_organization_users` — function exists, no trigger found
- `identity.trg_org_user_to_unified` — function exists, no trigger found in schema dump
- `identity.trg_register_org_user_to_unified` — function exists, no trigger found
- `identity.trg_sync_org_user_to_contact` — function exists, no trigger found

> ⚠️ The SDD's trigger table in §4.3 lists `trg_provision_hr_profiles`, `trg_provision_unified_contacts` etc. — **none of these appear in the schema dump**. The provisioning triggers may be registered differently (e.g., from core Composer bootstrap) or the schema dump is partial.

---

## 3. Frontend Bugs Found During Audit

### BUG-001: `identity_v2` Schema Reference — CRITICAL
**File**: [`src/modules/workforce/components/TeamMembers.tsx`](file:///Users/macbookpro/zo_v2/mini_project/src/modules/workforce/components/TeamMembers.tsx)  
**Lines**: 63, 91, 134, 142, 189, 192, 205, 217  
**Problem**: All queries use `supabase.schema('identity_v2')` — this schema does not exist in v6.

```typescript
// WRONG:
supabase.schema('identity_v2').from('roles')
supabase.schema('identity_v2').from('organization_users')
supabase.schema('identity_v2').from('user_teams')
supabase.schema('identity_v2').from('user_roles')

// CORRECT:
supabase.schema('identity').from('roles')
```

**Impact**: All team member CRUD in the Workforce module is broken.

---

### BUG-002: `identity.users` Queried by `organization_id` — WRONG COLUMN
**File**: [`src/modules/workforce/components/Expensesheet.tsx:42`](file:///Users/macbookpro/zo_v2/mini_project/src/modules/workforce/components/Expensesheet.tsx)  
**Problem**: `identity.users` has NO `organization_id` column — it is a global table.

```typescript
// WRONG:
supabase.schema('identity').from('users')
  .select('*')
  .eq('organization_id', user?.pref_organization_id)  // ← column doesn't exist!
  .eq('is_active', true)

// CORRECT: Go through organization_users instead
supabase.schema('identity').from('organization_users')
  .select('user:users!organization_users_user_id_fkey(id, name, email, mobile)')
  .eq('organization_id', organization.id)
  .eq('is_active', true)
```

**Impact**: Expensesheet assignee dropdown fails silently or returns no data.

---

### BUG-003: `user_teams` INSERT Missing `organization_id` in Users.tsx
**File**: [`src/modules/admin/pages/Settings/Users.tsx:233-238`](file:///Users/macbookpro/zo_v2/mini_project/src/modules/admin/pages/Settings/Users.tsx)  
**Problem**: Team assignments inserted without `organization_id` — RLS (`Tenant_Isolation_V5`) will block this.

```typescript
// WRONG (line 234):
const teamAssignments = selectedTeams.map(teamId => ({
  organization_user_id: editingUser.id,
  team_id: teamId,
  created_by: currentUser.id,
  // ← organization_id MISSING!
}));

// CORRECT:
const teamAssignments = selectedTeams.map(teamId => ({
  organization_user_id: editingUser.id,
  team_id: teamId,
  created_by: currentUser.id,
  organization_id: effectiveOrgId,  // ← REQUIRED
}));
```

**Impact**: Edit user → assign team → save → RLS error. Users can't update team assignments.

---

### BUG-004: `save_module_configs` RPC Not Found in Identity Schema
**File**: [`src/modules/admin/pages/Settings/ModuleConfigForm.tsx:172`](file:///Users/macbookpro/zo_v2/mini_project/src/modules/admin/pages/Settings/ModuleConfigForm.tsx)  
**Problem**: Frontend calls `supabase.schema('identity').rpc('save_module_configs', ...)` but this function does NOT appear in `identity_schema_only.sql`.

```typescript
// Called from frontend:
supabase.schema('identity').rpc('save_module_configs', {
  p_organization_id: organization.id,
  p_module_configs: cleanedConfig,
  p_scope_level: 'organization',
  p_location_id: null,
  p_created_by: user.id,
  p_updated_by: user.id,
})
```

**Possible causes**:
1. Function exists in a different schema (core? public?)
2. Function was dropped and not replaced
3. Schema dump is partial

**Impact**: Module configuration save is broken.

---

### BUG-005: `get_my_organizations` v1 Used — v2 Not Adopted
**Files**: `Login.tsx`, `Header/index.tsx`, `OrgSwitcher.tsx`, `Settings/index.tsx`  
**Problem**: All callers use `get_my_organizations` (v1, returns `jsonb`). `get_my_organizations_v2` exists (returns TABLE with more columns) but is never called.

```typescript
// Current (v1):
const { data } = await supabase.schema('identity').rpc('get_my_organizations');
// Returns: jsonb — login.tsx maps org.organization_id, org.organization_name

// Available (v2):
// Returns: TABLE(organization_id, organization_name, role_names[], is_primary, joined_at)
```

**Action needed**: Either migrate all callers to v2 or deprecate v2 if v1 is intentional.

---

## 4. Functions Flagged for Deletion / Manual Review

### 🔴 SAFE TO DROP — Clearly Deprecated

| Function | Reason | Verify Before Drop |
|----------|--------|-------------------|
| `identity."zzx_jwt_get_user_session_draft_NEW"` | `zzx_` prefix = historical draft | No callers found |
| `identity."rls_util_sync_engine-v1"` | Dash in name (unusual), `v1` suffix | Verify no scheduled jobs call it |

### 🟠 NEEDS CALLER AUDIT — Likely Safe to Drop

| Function | Issue | Action |
|----------|-------|--------|
| `identity.bootstrap_user_to_org` | Superseded by `onboard_invite_user_to_org` | `SELECT * FROM pg_stat_user_functions WHERE funcname = 'bootstrap_user_to_org'` — if 0 calls, drop |
| `identity.get_current_org_user_id` (v1) | v2 exists (`get_current_org_user_id_v2`) | Grep DB functions for callers of v1; if none, drop |
| `identity.get_my_organizations_v2` | v1 still used everywhere; v2 unused | Either migrate frontend to v2 or drop v2 |
| `identity.util_get_subordinate_count_v2` | Exists as v2; check if v1 still exists and has callers | From backend audit: v1 also exists |
| `identity.is_user_sassadmin` | Typo name (should be `is_saas_admin`). Currently called internally by `jwt_get_user_session` | Refactor internal call to `is_saas_admin`, then drop |

### 🟡 INFRASTRUCTURE ONLY — Keep, but No SDD Entry Needed

| Function | Status |
|----------|--------|
| `identity.get_current_org_id` | Critical RLS function — keep |
| `identity.get_my_active_org_ids` | Critical for `Multi_Org_Access_V5` policy — keep |
| `identity.get_my_org_ids` | Critical for `Multi_Org_Access_V5` policy — keep |
| `identity.rls_audit_gaps` | DBA utility — keep |
| `identity.rls_bootstrap_entity_policy` | DBA utility — keep |
| `identity.rls_drop_all_policies` | DBA utility — keep |
| `identity.rls_recommend_all` | DBA utility — keep |
| `identity.rls_recommend_policy` | DBA utility — keep |
| `identity.utils_test_session_as_user` | Testing utility — keep for DBA use |
| `identity.util_impersonate_user` | Admin utility — keep |
| `identity.util_merge_role_permissions` | Used by permission resolution — keep |
| `identity.util_ops_delete_organization_user` | User deletion flow — keep |
| `identity.util_ops_delete_user` | User deletion flow — keep |
| `identity.validate_workforce_details` | Validation utility — keep |

### 🟡 NOT CALLED FROM FRONTEND — Keep for Backend/Channel Use

| Function | Used By |
|----------|---------|
| `identity.resolve_channel_user` | WhatsApp/Telegram inbound (backend edge function) |
| `identity.jwt_generate_thin_claims` | May be called by custom JWT hook or edge functions |
| `identity.rls_resonance_init_context` | WhatsApp channel context (wa module) |
| `identity.get_manager_at_level` | Org hierarchy queries (workforce/HR backend) |
| `identity.get_subordinates_by_user` | Org hierarchy queries |
| `identity.util_resolve_or_create_user` | Channel inbound — needed for 057d migration |

### 🟡 ORPHANED TRIGGER FUNCTIONS — Verify Attachment

These trigger functions are defined but NOT found as active triggers in the schema dump:

| Function | Expected trigger | Action |
|----------|-----------------|--------|
| `identity.trg_cleanup_orphaned_organization_users` | Should fire on DELETE from organizations | Run: `SELECT * FROM information_schema.triggers WHERE trigger_schema='identity' AND action_statement LIKE '%cleanup_orphaned%'` |
| `identity.trg_org_user_to_unified` | Should fire on `organization_users` INSERT | Verify if superseded by `trg_register_org_user_to_unified` |
| `identity.trg_register_org_user_to_unified` | Should fire on `organization_users` INSERT | Verify against live DB |
| `identity.trg_sync_org_user_to_contact` | Should fire on `organization_users` UPDATE | Verify against live DB |

---

## 5. Missing Sections to Add to MODULE_SPEC.md

The following use cases and function contracts must be added to `MODULE_SPEC.md`:

### Add: UC-5 — Login & Session Bootstrap
- RPC: `jwt_get_user_session(p_organization_id)` — full return shape (user_id, org_id, permissions jsonb, roles[], teams[], locations[])
- RPC: `get_my_organizations()` — org list for org picker
- Function: `set_preferred_organization(new_org_id)` — update preferred org + trigger JWT refresh
- Frontend: `Login.tsx` full flow (3-step: signIn → getMyOrgs → handleOrgSelect → set_preferred_organization → refreshSession)
- Frontend: `useUserSession.ts` — smart bootstrap logic (JWT → DB fallback for `pref_organization_id`)

### Add: UC-6/7 — Admin User Management (Edit + Deactivate)
- Direct table access: `organization_users.update(location_id)`, `user_roles.delete().insert(new_roles)`, `user_teams.delete().insert(new_teams)`
- ⚠️ Bug: `user_teams` INSERT without `organization_id` — needs fix
- Deactivate: `organization_users.update({ is_active: false })` → trigger `reassign_reports_on_deactivation_trg` fires

### Add: UC-8 — Module Configuration
- RPC: `get_module_hierarchy()` — returns full module tree template
- RPC: `get_organization_module_configs(p_organization_id, p_scope_level)` — org's current config
- RPC: `save_module_configs(...)` — ⚠️ NOT FOUND in schema — needs investigation

### Add: UC-9 — Role Permissions Management
- RPC: `get_applicable_config_type_values(p_entity_schema, p_entity_type, p_org_id)` — permission config values
- Direct write: `identity.roles.upsert({ id, permissions }, { onConflict: 'id' })`

### Add: UC-10 — Location Hierarchy CRUD
- Trigger: `trg_update_location_path` → `update_location_path()` — auto-computes `path` array on INSERT/UPDATE
- Frontend: `LocationsPage.tsx` uses `DynamicViews` (L5 view) + `LocationHierarchyManager` component

### Add: UC-11 — Org Switching
- RPC: `set_preferred_organization(new_org_id)`
- Auth: `supabase.auth.refreshSession()` — MUST be called after setting preferred org to update JWT claims
- Frontend: `OrgSwitcher.tsx` + `Header/index.tsx` — `get_my_organizations` for switcher list

---

## 6. RLS Policy Corrections

The SDD's schema table (§3) contains several inaccuracies found in the real schema dump:

| Table | SDD Claims | Actual Policy from Schema Dump |
|-------|-----------|-------------------------------|
| `identity.organizations` | RLS OFF | `FORCE ROW LEVEL SECURITY` set, but `ENABLE ROW LEVEL SECURITY` NOT run → effectively OFF. Policies exist: `Config_Insert_V5`, `Config_Tenant_Or_Global_V5` |
| `identity.users` | RLS OFF | Same — `FORCE ROW LEVEL SECURITY` set, not enabled. Policy: `identity_users_cohesion_policy` |
| `identity.roles` | `Tenant_Isolation_V5` | ACTUAL: `Config_Insert_V5` + `Config_Tenant_Or_Global_V5` (NOT `Tenant_Isolation_V5`) |
| `identity.locations` | `Tenant_Isolation_V5` | ACTUAL: `Multi_Org_Access_V5` |
| `identity.modules` | Not in table | `Global_Read_V5` + `Tenant_Write_V5` + `Tenant_Update_V5` + `Tenant_Delete_V5` |
| `identity.org_module_configs` | Not in table | `Tenant_Isolation_V5` |
| `identity.location_types` | Not in table | `Tenant_Isolation_V5` |

---

## 7. Summary: Priority Actions

| Priority | Action | File |
|----------|--------|------|
| 🔴 P0 | Fix BUG-001: Replace `identity_v2` → `identity` in TeamMembers.tsx | `src/modules/workforce/components/TeamMembers.tsx` |
| 🔴 P0 | Fix BUG-003: Add `organization_id` to `user_teams` INSERT in Users.tsx | `src/modules/admin/pages/Settings/Users.tsx:233` |
| 🔴 P0 | Fix BUG-002: Fix Expensesheet users query (no `organization_id` on `identity.users`) | `src/modules/workforce/components/Expensesheet.tsx:42` |
| 🔴 P0 | Investigate BUG-004: `save_module_configs` missing from identity schema | Check other schemas + migrations |
| 🟠 P1 | Update MODULE_SPEC.md §4.3 Triggers (add all 5+ active triggers) | `MODULE_SPEC.md` |
| 🟠 P1 | Add UC-5 through UC-11 to MODULE_SPEC.md | `MODULE_SPEC.md` |
| 🟠 P1 | Add `get_my_organizations`, `get_module_hierarchy`, `get_organization_module_configs` to §4.2 | `MODULE_SPEC.md` |
| 🟠 P1 | Drop `zzx_jwt_get_user_session_draft_NEW` and `rls_util_sync_engine-v1` | Migration file |
| 🟡 P2 | Refactor `is_user_sassadmin` → `is_saas_admin` in `jwt_get_user_session` body | Migration |
| 🟡 P2 | Audit v1/v2 pairs: `get_current_org_user_id`, `util_get_subordinate_count` | Caller audit SQL |
| 🟡 P2 | Decide: migrate frontend to `get_my_organizations_v2` or drop v2 | Decision + migration |
| 🟡 P2 | Verify orphaned trigger functions attachment | Live DB query |
