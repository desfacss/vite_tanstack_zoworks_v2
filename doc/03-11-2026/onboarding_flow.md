# Zoworks Organization Onboarding Flow

## Overview

The onboarding process converts a **CRM prospect** (an `account` + `contact`) into a **live tenant** on the Zoworks platform. It is split into two distinct phases:

1. **Phase 1 — Self-Service Registration** (done by the prospect via `/web_register`)
2. **Phase 2 — SaaS Admin Approval** (done by a global admin via the Onboarding Requests panel)

---

## Phase 1: Registration Request (`/web_register`)

### Purpose
Allow a prospective customer to find their organization in the CRM and submit a request to become a tenant.

### UI File
`src/pages/auth/WebRegister.tsx`

### Steps

#### Step 1 — Search for Organization
- User types their organization name in the search box.
- Frontend calls: `public.onboard_search_crm_accounts(p_query)`
- Results returned from `crm.accounts` using full-text / similarity search.
- User selects their organization from the results list.

#### Step 2 — Enter Administrator Details
After selecting the org, user fills in:
| Field | Form Key | Passed to RPC as |
|---|---|---|
| First Name | `firstName` | `p_admin_first_name` |
| Last Name | `lastName` | `p_admin_last_name` |
| Email | `email` | `p_admin_email` |
| Mobile | `mobile` | `p_admin_mobile` |

#### Step 3 — Submit Request
Frontend calls:
```
public.onboard_request_zoworks_account(
  p_account_id,
  p_admin_first_name,
  p_admin_last_name,
  p_admin_email,
  p_admin_mobile
)
```

### What the RPC Does (`onboard_request_zoworks_account`)

1. **Validates CRM Account**: Looks up `crm.accounts` by `p_account_id`. Throws if not found.
2. **Upserts CRM Contact**: Inserts or updates a row in `crm.contacts` using the provided email as the conflict key. Stores `name` (first + last combined), `email`, `phone`.
3. **Creates Inactive Organization**: Inserts a new row in `identity.organizations` with:
   - `is_active = false`
   - `claimed_by_contact_id` = the contact's ID from step 2
4. **Returns**:
```json
{
  "status": "requested",
  "organization_id": "<uuid>",
  "contact_id": "<uuid>",
  "account_id": "<uuid>"
}
```

> **⚠️ Schema Note**: The RPC is defined in `public` schema in Supabase but the file documents it under `identity` schema. The **deployed schema** is what matters — check Supabase directly.

---

## Phase 2: SaaS Admin Approval (`/admin/onboarding-requests`)

### Purpose
A global SaaS admin reviews all pending onboarding requests and approves or rejects them.

### UI File
`src/modules/admin/pages/OnboardingRequests.tsx`

### Fetching Pending Requests

The admin panel fetches all `identity.organizations` records (where `is_active = false`) via the L4 Fetcher:

```
core.api_new_fetch_entity_records({
  entity_name: 'organizations',
  entity_schema: 'identity',
  include: [{
    entity_name: 'contacts',
    entity_schema: 'crm',
    on: 'claimed_by_contact_id',
    select: ['id', 'email', 'phone', 'details', 'name']
  }]
})
```

The result is mapped into a list of `OnboardingRequest` objects with org name, contact name/email/phone, and timestamps.

---

### Approval Flow (handleApprove)

The approval uses an **RPC-First strategy** — all contact data is fetched by the backend, not the frontend.

#### Step 1 — First call to `onboard_promote_to_tenant`
```
identity.onboard_promote_to_tenant(p_org_id)
```
The RPC internally:
- Joins `identity.organizations` with `unified.contacts` via `claimed_by_contact_id`
- Fetches: `name`, `email`, `phone` of the contact
- Checks if a user already exists in `identity.users` by email

**Case A — User already exists** ➜ Proceeds directly to activation (Step 4).

**Case B — User does not exist** ➜ Returns:
```json
{
  "status": "NEED_INVITE",
  "email": "user@example.com",
  "first_name": "Kim",
  "last_name": "Jong Un"
}
```

#### Step 2 — Invite User via Edge Function (only if NEED_INVITE)
Frontend calls the `invite_users` Edge Function:
```
supabase.functions.invoke('invite_users', { body: { email } })
```
Edge function creates the user in `auth.users` and returns `{ id: "<auth_uuid>" }`.

#### Step 3 — Second call to `onboard_promote_to_tenant` (with auth_id)
```
identity.onboard_promote_to_tenant(p_org_id, p_auth_id)
```
Now the RPC has the `auth_id` and proceeds to full activation.

#### Step 4 — Organization Activation (inside the RPC)
The RPC performs all provisioning in one transaction:

| # | Action | Table |
|---|---|---|
| 1 | Set `is_active = true` | `identity.organizations` |
| 2 | Create `SuperAdmin` role | `identity.roles` |
| 3 | Create `Headquarters` location | `identity.locations` |
| 4 | Create `Leadership Team` | `identity.teams` |
| 5 | Provision user (identity + HR + roles + teams) | Calls `identity.onboard_invite_user_to_org(...)` |
| 6 | Mark contact as converted | `crm.contacts` → `status = 'CONVERTED'` |

The `identity.onboard_invite_user_to_org` sub-function handles:
- `identity.users` (creates/links user)
- `identity.organization_users` (links user to org)
- `hr.profiles` (creates HR profile)
- Role and team assignments

#### Returns
```json
{
  "status": "success",
  "organization_id": "<uuid>",
  "user_id": "<uuid>",
  "details": { ... }
}
```

---

### Rejection Flow (handleReject)

Admin can also reject a request. Currently this is a soft rejection — it just keeps `is_active = false` via an L4 upsert. No email is sent. The record remains in the database.

```
core.api_new_core_upsert_data({
  table_name: 'identity.organizations',
  data: { id: <org_id>, is_active: false }
})
```

---

## End-to-End Summary

```
Prospect                      SaaS Admin
   │                                │
   ├── /web_register                │
   │   ├── Search: onboard_search_crm_accounts()
   │   └── Submit: onboard_request_zoworks_account()
   │       ├── Upsert crm.contacts
   │       └── Create identity.organizations (is_active=false)
   │                                │
   │          <pending review>      │
   │                                ├── /admin/onboarding-requests
   │                                │   └── Fetch: api_new_fetch_entity_records
   │                                │
   │                                ├── Click "Approve"
   │                                │   ├── onboard_promote_to_tenant(org_id)
   │                                │   │   ├── Returns NEED_INVITE?
   │                                │   │   │   └── invoke('invite_users', email)
   │                                │   │   │       └── onboard_promote_to_tenant(org_id, auth_id)
   │                                │   │   └── OR proceeds directly (existing user)
   │                                │   └── Org activated ✓ User provisioned ✓
   │                                │
   │ <receives invite email>        │
   └── Sets password & logs in      │
```

---

## Key Files Reference

| Layer | File | Purpose |
|---|---|---|
| Frontend (Registration) | `src/pages/auth/WebRegister.tsx` | Self-service registration form |
| Frontend (Admin Panel) | `src/modules/admin/pages/OnboardingRequests.tsx` | Approval/rejection UI |
| Backend (RPCs) | `doc/03-10-2026/onboarding_rpcs.sql` | RPC definitions (reference — deploy to Supabase) |
| Backend (Invite) | `doc/03-09-2026/invite_user_rpc.sql` | `onboard_invite_user_to_org` definition |

## Known Issues / Open Items

| Issue | Status |
|---|---|
| `column "name" does not exist` in `onboard_request_zoworks_account` | ⚠️ **Open** — RPC in Supabase uses columns that may differ from the local doc. Confirm live `crm.contacts` schema. |
| `column c.name does not exist` in `onboard_promote_to_tenant` | ✅ Fixed — switched join to `unified.contacts` |
| `automation_bp_instance_id` missing on `crm.contacts` | ✅ Fixed — ALTER TABLE added |
| RPC signature mismatch (`PGRST202`) | ✅ Fixed — `p_auth_id DEFAULT NULL` added |
| `column contacts.email does not exist` | ✅ Fixed — RPC-First strategy, frontend no longer fetches directly |
