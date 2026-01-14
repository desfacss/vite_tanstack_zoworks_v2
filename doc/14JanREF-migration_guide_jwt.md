# Migration Guide: Optimized JWT & Session Hydration

This guide details how to migrate the "Thin JWT + RPC Hydration" architecture from one Supabase project to another.

## 1. Prerequisites (Schema)
Ensure the following core tables exist in your `identity` schema:
- `identity.users` (with `auth_id` column)
- `identity.organizations`
- `identity.organization_users` (with `id`, `user_id`, `organization_id`, and `path` ltree)

---

## 2. Deploy Functions (The Logic)

Run the following SQL files in your new project in this exact order:

### A. Core Thin Logic
Deploy [jwt_generate_thin_claims.sql](file:///Users/macbookpro/zo_v2/zo_core_v3_supa/zo_core_v3_supa/db/docs/identity/functions/jwt_generate_thin_claims.sql).
> This function determines the `org_user_id` context for the JWT.

### B. Public Hook Wrapper
Deploy [jwt_get_claims.sql](file:///Users/macbookpro/zo_v2/zo_core_v3_supa/zo_core_v3_supa/db/docs/public/functions/jwt_get_claims.sql).
> **Note**: This file uses the required `(event jsonb)` signature for Supabase Hooks.

### C. Session Hydration RPC
Deploy [jwt_get_user_session.sql](file:///Users/macbookpro/zo_v2/zo_core_v3_supa/zo_core_v3_supa/db/docs/identity/functions/jwt_get_user_session.sql).
> This provides the "Fat" data for your UI state manager.

---

## 3. Supabase Dashboard Configuration

### Step 1: Configure the Hook
1. Go to **Auth** -> **Hooks**.
2. Click **Add Customize Access Token (JWT) Claims**.
3. Toggle **Enable**.
4. Select **Postgres** as the Hook Type.
5. Select `public` schema and `jwt_get_claims` function.
6. Click **Create hook**.

### Step 2: Security Hardening (Revokes)
The hook function should **only** be executable by the Supabase Auth system. Because we use `SECURITY DEFINER`, you only need to grant access to the "Entry Point" wrapper. The wrapper will handle the internal calls using the privileges of its owner (PostgreSQL).

```sql
-- 1. Grant usage to the Auth Admin for the Entry Point
GRANT USAGE ON SCHEMA public, identity TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.jwt_get_claims(jsonb) TO supabase_auth_admin;

-- 2. Revoke from all other roles (Safety first)
-- This prevents users from trying to spoof or debug their own claims via SQL
REVOKE EXECUTE ON FUNCTION public.jwt_get_claims(jsonb) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION identity.jwt_generate_thin_claims(uuid) FROM authenticated, anon, public;
```

> [!NOTE]
> **Why no separate grant for `jwt_generate_thin_claims`?**
> Since `public.jwt_get_claims` is defined as `SECURITY DEFINER` (owned by `postgres`), it executes with superuser permissions. When it calls `identity.jwt_generate_thin_claims` internally, it doesn't need the `supabase_auth_admin` role to have explicit permission; it uses the owner's permission instead.

---

## 4. Architecture FAQ

### Q: Why keep them separate (`public` vs `identity`)?
**A: Separation of Concerns (SoC) & Security.**
1. **The Interface Layer (`public`)**: `jwt_get_claims` is the "contract" between Supabase and your database. It handles the specific JSONB "Hook" event format.
2. **The Logic Layer (`identity`)**: `jwt_generate_thin_claims` is the reusable engine. Other internal functions (like background workers or batch processors) might need to generate claims without passing a JSONB event. 
3. **Security Boundaries**: By wrapping the identity function, we ensure that even if someone accidentally grants access to the `public` schema, the core identity logic remains protected behind the `SECURITY DEFINER` gate in `identity`.

### Q: Why not merge them?
Merging into a single function makes that function "Fat" with logic handling both the hook event AND the identity resolution. Keeping them separate makes it much easier to test and reuse the identity logic in other parts of your backend.

---

## 5. Why it was "working" before
If you didn't have hooks set up in your old project, it likely worked because:
- **Default JWT**: Supabase includes standard `auth.users` metadata by default.
- **Triggers**: You might have had a trigger syncing data into `raw_user_meta_data`, which Supabase naturally adds to claims.
- **RLS Logic**: High-level RLS might have been using `auth.uid()` (which always exists) but lacked the tenant-specific hierarchy filtering that `org_user_id` now provides.

**The current Hook-based approach is significantly faster and more secure.**

---

## 5. Summary Flow
| Event | Action | Outcome |
| :--- | :--- | :--- |
| **Login** | Supabase calls `jwt_get_claims` | JWT is issued with `org_id` and `org_user_id`. |
| **API Req** | RLS checks `org_user_id` | Database enforces tenant isolation instantly. |
| **App Load**| Frontend calls `jwt_get_user_session` | Permissions/Teams loaded into local state. |







🚀 The New Way (The Hook):
By using the Custom Access Token Hook with our new jwt_get_claims function:

The JWT is generated in-memory on every request.
It is always up-to-date (no waiting for triggers).
It is perfectly "Thin" (only the IDs needed for RLS).
📋 Setup Steps for your new project:
Run the updated SQL files I've prepared.
Go to Auth -> Hooks in your Dashboard.
Enable the Custom Access Token hook and select public.jwt_get_claims.
You can find the full step-by-step in the 
migration_guide_jwt.md
. Everything is now streamlined and ready for production!





🏛️ Why the "Wrapper" Pattern?
I've documented the rationale for keeping public.jwt_get_claims and identity.jwt_generate_thin_claims separate:

Modularity: You can reuse the "Thin Claims" logic for background workers or internal scripts that don't use the Supabase JSONB "Hook" event format.
Security: It creates a clean "contract" layer in public while keeping the sensitive identity logic safe in the identity schema.
Clean Code: It's much easier to test a function that just takes a UUID than one that expects a complex nested JSONB object.



-----

Test

You are all set for testing! To answer your question: No, you do not need to manually update existing users.

🔄 The Graceful Transition:
Passive Migration: Existing users have tokens that are valid for ~1 hour. When those tokens expire, the Supabase client automatically refreshes the session.
The Switch: At that moment, your new Auth Hook fires, and they are silently upgraded to the new Thin JWT.
No Downtime: Users won't even notice the switch; it happens entirely in the background.
🧪 How to Verify in Prod right now:
I've added a detailed testing guide to your 
walkthrough.md
. The easiest way is:

Log out and log back in (to get a fresh token immediately).
Inspect your token on jwt.io. You should see org_user_id but not the old fat permissions array.
Navigate through the app; your RLS policies will seamlessly use that org_user_id to show your data.



CLEANUP 

-- Clean up stale metadata to sync DB with our new Thin JWT philosophy
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object(
    'migrated_to_thin_jwt', true,
    'last_cleanup', now()
)
WHERE raw_user_meta_data ? 'permissions'; -- Only update if old 'fat' data exists