# Change Log — Identity Module

> Format: **NEW entry = update BEFORE writing code** (spec-anchored rule).  
> Status values: `Proposed` | `In Progress` | `Implemented` | `Reverted`

---

## CHANGE-001: Fix Edge Function Response — Return auth UUID in All Shapes

**Date**: 2026-05-21  
**Status**: Proposed  
**Affects**: `invite_users` Edge Function, `OnboardingRequests.tsx`, `InviteUserModal.tsx`  
**Related Issue**: GAP-003, GAP-004 in `MODULE_SPEC.md §8`

### OLD Behavior

Edge Function returns Shape A for new users — no auth UUID:
```json
{
  "message": "Invitation sent successfully",
  "is_new_user": true,
  "needs_onboarding": true
}
```

Frontend reads: `const authId = inviteData?.id;` → `undefined` for new users.

Next RPC call: `onboard_invite_user_to_org(p_auth_id: undefined)` → PostgreSQL raises:
```
EXCEPTION: auth_id is required for new users
```

### NEW Behavior

Edge Function always returns the auth UUID in ALL shapes:

Shape A (new user) — updated:
```json
{
  "message": "Invitation sent successfully",
  "auth_user_id": "a6d9ef2b-4334-450c-9208-532ff6deff65",
  "is_new_user": true,
  "needs_onboarding": true
}
```

Shape B (existing auth user) — unchanged:
```json
{
  "message": "User already exists in Auth but needs onboarding",
  "auth_user_id": "2a4ed346-4c61-450f-86f2-5c816ae3fa73",
  "is_new_user": false,
  "needs_onboarding": true
}
```

### Frontend Read Pattern — Updated

Both `OnboardingRequests.tsx` and `InviteUserModal.tsx` should read:
```typescript
// OLD (broken for Shape A):
const authId = inviteData?.id;

// NEW (handles both shapes):
const authId = inviteData?.auth_user_id ?? inviteData?.id;
```

### Implementation Tasks
- [ ] Update Deno Edge Function to include `auth_user_id` in Shape A response
- [ ] Update `OnboardingRequests.tsx:123` — change `inviteData?.id` to `inviteData?.auth_user_id ?? inviteData?.id`
- [ ] Update `InviteUserModal.tsx:235` — same pattern
- [ ] Add TEST-EF-002 to `edge_function_tests.http` verifying Shape A returns `auth_user_id`
- [ ] Mark GAP-003 and GAP-004 as resolved in `MODULE_SPEC.md §8`

---

## CHANGE-002: SDD Module Created

**Date**: 2026-05-21  
**Status**: Implemented  
**Affects**: `doc/SDD/modules/identity/`

### Description
Initial creation of the identity module SDD. Populated from:
- Frontend source: `src/modules/admin/pages/OnboardingRequests.tsx`, `src/modules/admin/components/InviteUserModal.tsx`
- Backend SQL: `doc/03-09-2026/invite_user_rpc.sql`, `doc/03-10-2026/onboarding_rpcs.sql`
- Existing guide: `doc/05-21-2026/tenant_onboarding_and_user_invitation_guide.md`
- Backend audit: `/Users/macbookpro/zo/zo_core_v6_supa/identity.md`, `ARCHITECTURE.md`

All 8 known issues/gaps catalogued in `MODULE_SPEC.md §8`.

---

## CHANGE-003: user_teams Direct INSERT Must Include organization_id

**Date**: 2026-05-21  
**Status**: Implemented (documented)  
**Affects**: `identity.user_teams` table, any direct SQL or RPC that inserts into it  
**Related Issue**: GAP-007, `doc/SDD/TODOFix/identity.md`

### OLD Pattern (Missing organization_id — RLS will block)

```sql
INSERT INTO identity.user_teams (
  organization_user_id,
  team_id,
  created_by
) VALUES (
  'b39d41b9-a510-43ae-8abc-e4b7691fdce2',
  'a9b79e41-1da0-4e4b-84f7-811bac64b345',
  '6ba504d2-65b7-4018-b8a1-323dd686996c'
);
-- FAILS: RLS policy on user_teams requires organization_id
```

### NEW Pattern (Correct — includes organization_id)

```sql
INSERT INTO identity.user_teams (
  organization_user_id,
  team_id,
  created_by,
  organization_id   -- ← REQUIRED for RLS
) VALUES (
  'b39d41b9-a510-43ae-8abc-e4b7691fdce2',
  'a9b79e41-1da0-4e4b-84f7-811bac64b345',
  '6ba504d2-65b7-4018-b8a1-323dd686996c',
  'a41b2216-736c-4c00-99ca-30a0cd8ca0d2'
)
ON CONFLICT (organization_user_id, team_id) DO NOTHING;
```

### Preferred Pattern (Use RPC instead of direct INSERT)

Call `identity.onboard_invite_user_to_org` with `p_team_id` set — it handles `organization_id` internally and is safe to call again as an upsert:
```sql
SELECT identity.onboard_invite_user_to_org(
    p_email       := 'user@example.com',
    p_first_name  := 'Bob',
    p_last_name   := 'Builder',
    p_org_id      := 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2',
    p_auth_id     := 'a6d9ef2b-4334-450c-9208-532ff6deff65',
    p_team_id     := 'a9b79e41-1da0-4e4b-84f7-811bac64b345',
    p_role_id     := '<role_uuid>',
    p_location_id := '<location_uuid>'
);
```

### Note on api_new_upsert

The `TODOFix/identity.md` scratch note also mentioned using `api_new_upsert v_user_teams`. The generic upsert RPC `core.api_new_core_upsert_data` will also need `organization_id` in the data payload to satisfy RLS. Using the domain RPC `onboard_invite_user_to_org` is the preferred pattern — it handles all this internally.

---

## CHANGE-004: Fix TeamMembers `identity_v2` Schema References

**Date**: 2026-05-21  
**Status**: Implemented  
**Affects**: `src/modules/workforce/components/TeamMembers.tsx`

### Description
The `TeamMembers.tsx` component was incorrectly querying the `identity_v2` schema (which doesn't exist) instead of `identity`. Fixed 8 queries including fetches to `roles`, `users`, `organization_users`, `user_teams`, `user_roles` and corresponding inserts/deletes to use the correct `identity` schema.

---

## CHANGE-005: Fix RLS in Admin Users Edit Form

**Date**: 2026-05-21  
**Status**: Implemented  
**Affects**: `src/modules/admin/pages/Settings/Users.tsx`

### Description
The user edit form was failing to insert into `identity.user_teams` because the `organization_id` was missing from the payload, causing the RLS policy (`Tenant_Isolation_V5`) to reject the insert. Added `organization_id: effectiveOrgId` to the `teamAssignments` payload.

---

## CHANGE-006: Fix Users Query in Expensesheet

**Date**: 2026-05-21  
**Status**: Implemented  
**Affects**: `src/modules/workforce/components/Expensesheet.tsx`

### Description
The component was incorrectly querying `identity.users` with an `organization_id` filter (a column that does not exist on the global `users` table). Changed the query to target `identity.organization_users` with an inner join to `users`, and mapped the result to preserve compatibility with the rest of the component's expectations.
