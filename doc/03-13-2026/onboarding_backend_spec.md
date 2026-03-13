# Onboarding Backend — RPC & Function Spec (V5)

> Covers every database function in the onboarding pipeline.  
> Status legend: ✅ Done · ⚠️ Needs verification/fix · ❌ Missing

---

## 0 — Architecture Recap

```
Public Internet
     │
     ├── public.onboard_get_org_summary()       ← prefill only, read-only
     ├── public.onboard_search_crm_accounts()   ← fuzzy search, read-only
     ├── public.onboard_create_lead_account()   ← Vector C new org
     └── public.onboard_request_zoworks_account() ← unified entry point
                          │
                    (creates inactive org + lead contact)
                          │
              SaaS Admin reviews in /admin/onboarding
                          │
             identity.onboard_promote_to_tenant()
                          │
                ┌─────────┴─────────┐
           NEED_INVITE           EXISTS
                │                   │
         Edge fn: invite_users   (skip invite)
                │
         call promote again with p_auth_id
```

---

## 1 — `public.onboard_get_org_summary` ❌ Missing

### Purpose
Safe, read-only RPC for **Vector A (Fast Track)**. The prospect clicks a marketing URL containing `?org_id=<uuid>` and the UI needs to pre-fill the organization name without exposing any protected data.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.onboard_get_org_summary(
  p_account_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'id',   a.id,
      'name', a.account_name  -- use exact column from crm.accounts
    )
    FROM crm.accounts a
    WHERE a.id = p_account_id
      AND a.is_deleted IS NOT TRUE   -- safety: don't expose deleted orgs
    LIMIT 1
  );
END;
$$;
```

### Tables touched
| Table | Operation |
|---|---|
| `crm.accounts` | SELECT only |

### Frontend expects
```json
{ "id": "uuid", "name": "Acme Corp" }
```

### Security notes
- `SECURITY DEFINER` so anon role can call it.
- Returns only `id` + `name` — no PII, no settings.
- Returns `null` if not found (frontend should show error gracefully).

---

## 2 — `public.onboard_search_crm_accounts` ✅ Exists · ⚠️ Verify columns

### Purpose
Fuzzy-search `crm.accounts` by organization name. Used in Vector B & C step 1.

### Expected signature
```sql
CREATE OR REPLACE FUNCTION public.onboard_search_crm_accounts(
  p_query text
)
RETURNS TABLE(id uuid, name text, similarity_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
```

### What to verify
1. **Column name**: the RPC previously had a bug — `"column name does not exist"` error (see conversation `aeaaf0a7`). Confirm it correctly references `crm.accounts.account_name` (or whatever the actual column is).
2. Similarity/ranking — pg_trgm `similarity()` or `ilike` fallback?
3. Should NOT return orgs that already have an `identity.organizations` record that is `is_active = true` (i.e., don't let someone re-register an existing active tenant).

### Tables touched
| Table | Operation |
|---|---|
| `crm.accounts` | SELECT |
| `identity.organizations` | SELECT (filter out already-active) |

---

## 3 — `public.onboard_create_lead_account` ✅ Exists · ⚠️ Verify return shape

### Purpose
**Vector C** only. Creates a `crm.accounts` row for a brand-new company not in the CRM, then returns its UUID so it can flow into `onboard_request_zoworks_account`.

### Expected signature
```sql
CREATE OR REPLACE FUNCTION public.onboard_create_lead_account(
  p_org_name   text,
  p_domain     text DEFAULT NULL,
  p_industry   text DEFAULT NULL,
  p_details    jsonb DEFAULT '{}'
)
RETURNS jsonb   -- { "account_id": uuid }
LANGUAGE plpgsql
SECURITY DEFINER
```

### Internal logic
1. Check `crm.accounts` — if a row with same `account_name` already exists, return it (idempotent).
2. INSERT into `crm.accounts` with status = 'Lead', source = 'web_self_register'.
3. Return `{ "account_id": <new_uuid> }`.

### Tables touched
| Table | Operation |
|---|---|
| `crm.accounts` | INSERT (or SELECT if duplicate) |

### What to verify
- Return shape: frontend does `leadData.account_id` — confirm key name.
- Idempotency: re-submission of same org name should not create duplicates.

---

## 4 — `public.onboard_request_zoworks_account` ✅ Exists · ⚠️ Needs `p_requested_modules` stored

### Purpose
Unified entry point for all three vectors. Creates an **inactive** `identity.organizations` record and upserts a `crm.contacts` Lead. This is the last step the public internet can trigger.

### Current/Target signature
```sql
CREATE OR REPLACE FUNCTION public.onboard_request_zoworks_account(
  p_account_id        uuid,
  p_admin_first_name  text,
  p_admin_last_name   text,
  p_admin_email       text,
  p_admin_mobile      text  DEFAULT NULL,
  p_requested_modules jsonb DEFAULT '[]',   -- e.g. ["crm","engage"]
  p_details           jsonb DEFAULT '{}'
)
RETURNS jsonb   -- { "org_id": uuid, "status": "PENDING" }
LANGUAGE plpgsql
SECURITY DEFINER
```

### Internal logic (step-by-step)
1. **Resolve CRM contact**: `UPSERT crm.contacts` on `(email)` → set status = 'Lead', populate `details` with first/last name, mobile.
2. **Check for duplicate pending org**: if `identity.organizations` already has a row linked to this `p_account_id` with `is_active = false`, return early (idempotent).
3. **Create inactive org**: INSERT into `identity.organizations` with:
   - `is_active = false`
   - `claimed_by_contact_id = <contact_id from step 1>`
   - `settings = jsonb_build_object('requested_modules', p_requested_modules)` ← **critical new field**
4. Return `{ "org_id": <new_uuid>, "status": "PENDING" }`.

### Tables touched
| Table | Operation |
|---|---|
| `crm.contacts` | UPSERT |
| `identity.organizations` | INSERT |

### What to verify / fix
- `p_requested_modules` is stored in `settings->'requested_modules'` — confirm this column/key exists.
- Idempotency: if same email + account submits twice, don't create two org rows.
- Return shape: frontend only checks for `error` — but returning the `org_id` is useful for debugging.

---

## 5 — `identity.onboard_promote_to_tenant` ⚠️ Exists · Critical gaps to fix

### Purpose
Called by the **SaaS Admin only** (authenticated, identity schema). Transforms a pending inactive `identity.organizations` record into a fully active tenant, provisions modules, and handles user identity.

### Signature (current + needed additions)
```sql
CREATE OR REPLACE FUNCTION identity.onboard_promote_to_tenant(
  p_org_id              uuid,
  p_auth_id             uuid  DEFAULT NULL,   -- passed on 2nd call after invite
  p_approved_modules    jsonb DEFAULT NULL    -- ← NEW: admin can override modules
)
RETURNS jsonb
-- Returns:
--   { "status": "NEED_INVITE", "email": "..." }  -- on first call, user not found
--   { "status": "ACTIVATED", "org_id": "..." }   -- on completion
LANGUAGE plpgsql
SECURITY DEFINER
```

### Internal logic (full transaction)

#### Step A — Preflight (run on first AND second call)
1. Load the `identity.organizations` row for `p_org_id`.
2. Load the linked `crm.contacts` row via `claimed_by_contact_id`.
3. Look up `auth.users` (or `identity.users`) by `contact.email`.

#### Step B — User resolution
```
IF p_auth_id IS NOT NULL:
    -- We're on the 2nd call, user was just invited
    auth_id = p_auth_id
ELSE IF user found in auth.users:
    -- Existing user (Scenario 2)
    auth_id = existing user's auth id
ELSE:
    -- New user (Scenario 1)
    RETURN jsonb_build_object('status','NEED_INVITE','email', contact.email)
    -- THE FUNCTION STOPS HERE on first call for new users
```

#### Step C — Determine final modules
```sql
final_modules = COALESCE(
  p_approved_modules,                           -- admin override (new)
  org.settings -> 'requested_modules'           -- fallback to what user asked
);
```

#### Step D — Activation transaction (atomic)
1. `UPDATE identity.organizations SET is_active = true WHERE id = p_org_id`
2. **INSERT identity.modules** (⚠️ critical — verify this exists):
   ```sql
   INSERT INTO identity.modules (organization_id, is_active,
     sub_modules__crm,      -- true if 'crm' in final_modules
     sub_modules__whatsapp, -- true if 'engage' in final_modules
     sub_modules__esign,    -- true if 'documents' in final_modules
     ...
   )
   ```
3. **UPSERT identity.users**:
   ```sql
   INSERT INTO identity.users (auth_id, organization_id, pref_organization_id, role)
   VALUES (auth_id, p_org_id, p_org_id, 'SUPER_ADMIN')   -- ← pref_org must be set
   ON CONFLICT (auth_id) DO UPDATE
     SET pref_organization_id = p_org_id;
   ```
4. **INSERT identity.organization_users** — founding admin record with SuperAdmin role.
5. **UPDATE crm.contacts** — set status from 'Lead' → 'CONVERTED'.
6. RETURN `{ "status": "ACTIVATED", "org_id": p_org_id }`.

### Tables touched
| Table | Operation |
|---|---|
| `identity.organizations` | UPDATE (`is_active = true`) |
| `identity.modules` | INSERT (new row per tenant) |
| `identity.users` | UPSERT (set `pref_organization_id`) |
| `identity.organization_users` | INSERT (founding SuperAdmin) |
| `crm.contacts` | UPDATE (Lead → CONVERTED) |
| `auth.users` | SELECT only |

### Critical fixes needed
| # | Fix | Why |
|---|---|---|
| 1 | Add `p_approved_modules` param | Admin may change modules before approving |
| 2 | Confirm `identity.modules` INSERT logic with correct `sub_modules__*` column names | Tenant won't have module access without this |
| 3 | Set `pref_organization_id = p_org_id` in `identity.users` upsert | Without this, user logs into wrong/no tenant |
| 4 | Handle `p_auth_id` on conflict for existing multi-tenant users | A user might already be in identity.users for another org |

---

## 6 — Edge Function: `invite_users` ⚠️ Exists · Verify payload

### Purpose
Called by the frontend when `onboard_promote_to_tenant` returns `NEED_INVITE`. It triggers Supabase's magic-link or OTP invite for the new admin.

### Expected input/output
```
Input:  { email: string }
Output: { id: uuid }  ← the new auth.users.id
```

The frontend then passes `inviteData.id` as `p_auth_id` to the second `promote` call.

### What to verify
- Does the Edge Function actually return `{ id }` — or `{ user: { id } }`? The current frontend does `inviteData.id` directly.
- Is the invite URL in the magic link pointing to the correct redirect (the new tenant login, not a generic URL)?

---

## 7 — RLS & Security

| Layer | Rule |
|---|---|
| `public.*` RPCs | `SECURITY DEFINER`, callable by `anon` role only for read/lead creation |
| `identity.onboard_promote_to_tenant` | Must check caller is `authenticated` AND has a `master_saas_admin` role/claim |
| `identity.organizations` table RLS | Anon cannot read/write; only the promote RPC can activate |
| `identity.modules` table RLS | Only the tenant's own users (post-activation) can read; promote RPC inserts |

---

## 8 — Recommended Implementation Order

1. Verify / fix `public.onboard_search_crm_accounts` column name bug
2. Write `public.onboard_get_org_summary` (small, safe, blocking Vector A)
3. Update `public.onboard_request_zoworks_account` to store `p_requested_modules` in `settings`
4. Update `identity.onboard_promote_to_tenant` — add `p_approved_modules`, fix module provisioning, fix `pref_organization_id`
5. Verify Edge Function `invite_users` return shape
6. Write and run integration test: full Vector C flow end-to-end (new org → request → approve → verify `identity.modules` row exists)
