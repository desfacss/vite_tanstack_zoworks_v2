# Registration Flow Refactor & FK Fix - Handoff Summary

**Date**: 2026-02-17  
**Status**: Implementation Complete / Pending Final Verification  

## Overview
Resolved a critical foreign key constraint violation (`accounts_id_fkey`) that prevented new organization registrations. The fix involved refactoring the registration flow into a two-stage process and satisfying the three-tier dependency chain required by the V4 architecture.

## Dependency Chain
As per the database schema, all records for a new tenant must use the same UUID and be created in this order:
1.  **`identity.organizations`**: The root tenant identity.
2.  **`unified.organizations`**: The core registry entry (linked via `organization_id`).
3.  **`crm.accounts`**: The business domain entity (linked to `unified.organizations` via `id`).

---

## 🛠 Changes Implemented

### 1. Frontend: Stage 1 (Registration Request)
**File**: [`WebRegister.tsx`](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/pages/auth/WebRegister.tsx)
-   Refactored `onFinish` to perform a 3-step sequential insert.
-   Creates a **Shell Organization** first (with `is_active: false`).
-   Submits CRM data to `crm.accounts` and `crm.contacts` with `status: 'requested'` and `intent_category: 'ONBOARDING_PENDING'`.

### 2. Frontend: Stage 2 (Platform Admin Approval)
**File**: [`OnboardingRequests.tsx`](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/admin/pages/OnboardingRequests.tsx)
-   **New Page**: Created to list and manage pending onboarding requests.
-   **Approve Flow**: 
    1. Activates the Org in `identity.organizations`.
    2. Creates the Supabase Auth user.
    3. Creates `identity.users` and `identity.organization_users` records.
    4. Updates CRM records to `active`.
-   **Reject Flow**: Cleans up all staging records across schemas.

### 3. Database: Permissions & RLS
**File**: [`fix_registration_permissions.sql`](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/doc/02-16-2026/fix_registration_permissions.sql)
-   Grants `INSERT` permissions to the `anon` role for the registration chain.
-   Enforce security via RLS (Allows `anon` to insert only if `is_active = false` or `status = 'requested'`).

---

## 🚀 Next Steps (Action Required)

1.  **Run SQL Fix**: The [fix_registration_permissions.sql](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/doc/02-16-2026/fix_registration_permissions.sql) MUST be executed in the Supabase SQL Editor.
2.  **Verify Stage 1**: Visit `/web_register`, submit the form, and verify that 4 records (Identity, Unified, CRM Account, CRM Contact) are created with the same UUID.
3.  **Verify Stage 2**: Navigate to the **Onboarding Requests** page (under Admin) to approve the request and verify the user/org activation.

## Related Files
-   [Walkthrough Artifact](file:///C:/Users/ganesh/.gemini/antigravity/brain/bd37efc9-e334-4722-bb9e-2bd6bc0eb844/walkthrough.md)
-   [Implementation Plan](file:///C:/Users/ganesh/.gemini/antigravity/brain/bd37efc9-e334-4722-bb9e-2bd6bc0eb844/implementation_plan.md)
