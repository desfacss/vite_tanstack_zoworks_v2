# Zoworks Tenant Onboarding & User Invitation Guide

This document provides a comprehensive overview and technical walkthrough of two core identity and lifecycle flows in the Zoworks platform:
1. **Tenant Onboarding & CRM Promotion** (how prospective accounts/contacts become active tenants).
2. **User Invitation** (how new or existing global users are invited and mapped to specific tenants).

---

## 🏗️ Part 1: Deep Dive into the Supabase Auth Edge Function (`invite_users`)

Before any database record is created in the `identity` or `hr` schemas for a brand new user, they must be registered as a valid identity in Supabase Auth (`auth.users`).

Because the client-side Supabase client operates under restricted privileges (using the `anon` key), it cannot directly create or invite users at will. Instead, this privilege is delegated to a secure, backend Deno-based **Supabase Edge Function** named `invite_users`.

### 1. Edge Function Invocation
The frontend invokes the Edge Function via the Supabase client-side JS library:
```typescript
const { data: inviteData, error: inviteError } = await supabase.functions.invoke("invite_users", {
  body: { email },
});
```

> [!NOTE]
> Since this Edge function has been deployed with JWT verification disabled (`--no-verify-jwt`), the client-side library does not need a valid user session JWT to invoke it. The request only requires the public `anon` / publishable key (which is passed automatically by the client SDK in the `apikey` header and as a fallback Bearer token in the `Authorization` header).

### 2. Edge Function Internal Logic
Under the hood, the `invite_users` function executes the following:
1. **Security & Authentication Check**:
   * It runs with JWT verification disabled (`--no-verify-jwt`), allowing it to be invoked from the frontend (which only has the public anon/publishable key) without requiring an active user session or exposing the private Service Role Key.
   * It internally utilizes the private `SUPABASE_SERVICE_ROLE_KEY` loaded from the Deno environment to bypass RLS and perform admin operations.
2. **Supabase Admin Client Initialization**:
   * Initializes a Supabase client with admin capabilities:
     ```typescript
     const supabaseAdmin = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
       { auth: { persistSession: false } }
     );
     ```
3. **Invitation Trigger**:
   * Invokes the Supabase Auth Admin API:
     ```typescript
     const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
       redirectTo: `${Deno.env.get('CLIENT_RETRY_URL')}/login`
     });
     ```
   * **Supabase Auth Database Actions**:
     * Creates a new row in the `auth.users` schema.
     * Sets the user's status to pending.
     * Generates a unique UUID for the user (`auth.users.id`).
   * **Email Dispatch**:
     * Triggers Supabase's auth service to dispatch an automated email to the user with an invitation link (magic-link/OTP redirect).
4. **JSON Response Payload**:
   * Depending on the state of the user, the Edge Function returns different shapes:
     * **Newly Invited User (Created in Auth)**:
       ```json
       {
         "message": "Invitation sent successfully",
         "is_new_user": true,
         "needs_onboarding": true
       }
       ```
     * **Existing Auth User (Needs Onboarding)**:
       ```json
       {
         "message": "User already exists in Auth but needs onboarding",
         "auth_user_id": "2a4ed346-4c61-450f-86f2-5c816ae3fa73",
         "is_new_user": false,
         "needs_onboarding": true
       }
       ```

---

## 🏢 Part 2: Tenant Onboarding & CRM Promotion

The onboarding process converts a **CRM prospect** (an `account` + `contact`) into a live, active tenant on the Zoworks platform.

### 1. High-Level Flow Chart
```mermaid
sequenceDiagram
    autonumber
    actor Prospect as CRM Prospect / Claimant
    actor Admin as SaaS Global Admin
    participant FE as Frontend (/web_register)
    participant RPC as PostgreSQL (RPCs)
    participant Edge as Supabase Edge Function (invite_users)

    %% Phase 1: Search & Request
    Note over Prospect, RPC: Phase 1: Self-Service Registration
    Prospect->>FE: Search for Organization name
    FE->>RPC: onboard_search_crm_accounts(p_query)
    RPC-->>FE: Return matching CRM accounts
    Prospect->>FE: Input claimant info (Name, Email, Mobile)
    Prospect->>FE: Submit Registration Request
    FE->>RPC: onboard_request_zoworks_account(...)
    Note over RPC: 1. Resolve/Upsert CRM Account<br/>2. Upsert CRM Contact (Claimant)<br/>3. Create inactive identity.organizations
    RPC-->>FE: Return status: "requested"

    %% Phase 2: SaaS Admin Approval
    Note over Admin, RPC: Phase 2: SaaS Admin Approval
    Admin->>FE: View /admin/onboarding-requests
    FE->>RPC: api_new_fetch_entity_records(organizations)
    RPC-->>FE: Return pending requests (is_active = false)
    Admin->>FE: Click "Approve"
    FE->>RPC: onboard_promote_to_tenant(org_id)
    Note over RPC: User doesn't exist?
    RPC-->>FE: Return status: "NEED_INVITE"
    FE->>Edge: invoke('invite_users', { email })
    Note over Edge: Create user in auth.users
    Edge-->>FE: Return auth_id (UUID)
    FE->>RPC: onboard_promote_to_tenant(org_id, auth_id)
    Note over RPC: 1. Set is_active = true on organization<br/>2. Provision modules from Catalog Offerings<br/>3. Bootstrap (SuperAdmin Role, Headquarters, Leadership Team)<br/>4. Call onboard_invite_user_to_org<br/>5. Set CRM contact status to 'CONVERTED'
    RPC-->>FE: Return status: "success"
    Prospect->>Prospect: Receives invite email, sets password & logs in
```

### 2. The Complete SQL & RPC Chain
The full sequence of SQL calls and database operations is as follows:

#### 1. Search Organization: `public.onboard_search_crm_accounts(p_query)`
* **Invoked by**: [WebRegister.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/pages/auth/WebRegister.tsx)
* **Logic**: Queries `crm.accounts` filtering out organizations that are already active in `identity.organizations`.

#### 2. Request Tenant: `public.onboard_request_zoworks_account`
* **Invoked by**: [WebRegister.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/pages/auth/WebRegister.tsx)
* **SQL Location**: [onboarding_rpcs.sql](file:///Users/macbookpro/zo_v2/mini_project/doc/03-10-2026/onboarding_rpcs.sql#L9-L76)
* **SQL Actions**:
  1. Resolves `crm.accounts` by ID or creates a new account if the organization was not found in the CRM.
  2. Upserts `crm.contacts` on `(email)` to insert or update the claimant details.
  3. Inserts an inactive record in `identity.organizations`:
     ```sql
     INSERT INTO identity.organizations (name, is_active, claimed_by_contact_id, details)
     VALUES (v_org_name, false, v_contact_id, p_details);
     ```

#### 3. Fetch Pending: `core.api_new_fetch_entity_records`
* **Invoked by**: [OnboardingRequests.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/modules/admin/pages/OnboardingRequests.tsx)
* **Logic**: Fetches inactive organizations with joint details from `crm.contacts` for administrative review.

#### 4. Promote Tenant: `identity.onboard_promote_to_tenant(p_org_id, p_auth_id)`
* **Invoked by**: [OnboardingRequests.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/modules/admin/pages/OnboardingRequests.tsx)
* **SQL Location**: [schema.sql](file:///Users/macbookpro/zo_v2/mini_project/docs/backend/identity/schema.sql#L2833-L2923) or [onboarding_rpcs.sql](file:///Users/macbookpro/zo_v2/mini_project/doc/03-10-2026/onboarding_rpcs.sql#L81-L183)
* **SQL Actions**:
  1. Retrieves claimant contact details (`email`, `name`, `phone`) using a join with `unified.contacts`.
  2. Checks if an identity user already exists with that email in `identity.users`.
     * **If missing & `p_auth_id` is null**: returns `{"status": "NEED_INVITE"}`.
     * *The frontend catches this, triggers the Edge Function `invite_users` to get the `auth_id`, and makes a second call to this RPC supplying the resolved `p_auth_id`.*
  3. Sets `is_active = true` on `identity.organizations`.
  4. Provisions modules from the catalog into `identity.org_module_configs`.
  5. Bootstraps core tenant structure:
     * **Role**: Inserts `SuperAdmin` role (`identity.roles`) with full permissions (`'{"*": true}'`).
     * **Location**: Inserts `Headquarters` location (`identity.locations`).
     * **Team**: Inserts `Leadership Team` team (`identity.teams`).
  6. Invokes user provisioning: `identity.onboard_invite_user_to_org` (detailed below).
  7. Updates the contact status: `UPDATE crm.contacts SET status = 'CONVERTED'`.

---

## 👥 Part 3: User Invitation Flows

User invitations add new members to an already active organization.

### 1. Inviting a Brand New User
When the email entered in the invite form does not belong to any existing system user:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Tenant Admin
    participant FE as Frontend Drawer
    participant DB as PostgreSQL
    participant Edge as Supabase Edge Function (invite_users)

    Admin->>FE: Fill Invite Form (newemail@example.com)
    FE->>DB: Query identity.users by email
    DB-->>FE: Return null (User not found)
    FE->>Edge: Invoke 'invite_users' edge function
    Note over Edge: Create user in auth.users
    Edge-->>FE: Return new auth_id
    FE->>DB: RPC: identity.onboard_invite_user_to_org(auth_id, email, role_id, team_id, ...)
    Note over DB: 1. Create identity.users linked to auth_id<br/>2. Insert identity.organization_users mapping<br/>3. Provision HR Profile & assign Role/Team
    DB-->>FE: Success
    FE-->>Admin: Show success message
```

#### The SQL & RPC Chain:
1. **Global Check**: Frontend checks `identity.users` for the email.
2. **Auth Registration**: Frontend invokes the Edge Function `invite_users` to create the user in `auth.users` and dispatch the registration email. It returns the `auth_id`.
3. **centralized RPC Call**: Frontend calls `identity.onboard_invite_user_to_org` in [invite_user_rpc.sql](file:///Users/macbookpro/zo_v2/mini_project/doc/03-09-2026/invite_user_rpc.sql#L4-L92):
   ```sql
   identity.onboard_invite_user_to_org(
       p_email, p_first_name, p_last_name, p_org_id,
       p_role_id, p_team_id, p_location_id, p_auth_id, p_details
   )
   ```
   **SQL Operations Inside `onboard_invite_user_to_org`**:
   1. **Create Identity User**:
      ```sql
      INSERT INTO identity.users (auth_id, name, email, details, created_by, updated_by, pref_organization_id, password_confirmed)
      VALUES (p_auth_id, v_full_name, p_email, p_details, v_current_user_id, v_current_user_id, p_org_id, false);
      ```
   2. **Sync User**: Inserting into `identity.users` fires the database trigger:
      * `trg_sync_user_to_unified` executes `identity.trg_sync_user_to_unified()` to sync user details to core registries.
   3. **Map User to Organization**:
      ```sql
      INSERT INTO identity.organization_users (organization_id, user_id, location_id, is_active, persona_type, details, created_by, updated_by)
      VALUES (p_org_id, v_user_id, p_location_id, true, 'worker', ..., v_current_user_id, v_current_user_id);
      ```
   4. **Automated Tenant Profile Triggers (CRITICAL)**:
      Inserting a row into `identity.organization_users` automatically fires four database triggers that provision bonded data profiles:
      * **HR Profiles**: `trg_provision_hr_profiles` fires `core.util_trg_provision_bonded_extension('hr.profiles')` to create a blank HR profile record in `hr.profiles` linked to the mapping.
      * **Unified Contacts**: `trg_provision_unified_contacts` fires `core.util_trg_provision_bonded_extension('unified.contacts')` to create a contact record.
      * **Financial Profiles**: `trg_provision_finance_financial_profiles` fires `core.util_trg_provision_bonded_extension('finance.financial_profiles')` to create a financial profile record.
      * **Core Unified Objects**: `trg_provision_core_unified_objects` fires `core.util_trg_provision_bonded_extension('core.unified_objects')`.
   5. **Enrich HR Profile**:
      Once the HR Profile is created by the trigger, the RPC updates it with form values:
      ```sql
      UPDATE hr.profiles SET job_title = p_details->>'designation', department = p_details->>'department', ... WHERE id = v_org_user_id;
      ```
   6. **Assign Team**:
      ```sql
      INSERT INTO identity.user_teams (organization_user_id, team_id, organization_id, created_by)
      VALUES (v_org_user_id, p_team_id, p_org_id, v_current_user_id);
      ```
   7. **Assign Role**:
      ```sql
      INSERT INTO identity.user_roles (organization_user_id, role_id, team_id, organization_id, created_by)
      VALUES (v_org_user_id, p_role_id, p_team_id, p_org_id, v_current_user_id);
      ```

---

### 2. Inviting an Existing User (Cross-Tenant Invitation)
When a user already exists globally on the platform (e.g. they are a member of another tenant and already have credentials), the flow avoids redundant account creation.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Tenant Admin
    participant FE as Frontend Drawer
    participant DB as PostgreSQL

    Admin->>FE: Fill Invite Form (existinguser@example.com)
    FE->>DB: Query identity.users by email
    DB-->>FE: Return existing user (auth_id: UUID)
    Note over FE: SKIP Edge Function invite_users<br/>(No new Auth record, no reset email)
    FE->>DB: RPC: identity.onboard_invite_user_to_org(auth_id, email, role_id, team_id, ...)
    Note over DB: 1. Update identity.users preferred org if empty<br/>2. Insert/Reactivate identity.organization_users<br/>3. Provision HR Profile & assign Role/Team for this tenant
    DB-->>FE: Success
    FE-->>Admin: Show success message (Ready for switch)
```

#### The SQL & RPC Chain:
1. **Global Lookup**: Frontend checks `identity.users` for the email and resolves the existing `auth_id`.
2. **Bypass Invitation**: Skip the `invite_users` Edge Function.
3. **Enrollment RPC**: Invoke `identity.onboard_invite_user_to_org` passing the existing `auth_id`:
   * **Identify Check & Update**:
     ```sql
     UPDATE identity.users 
     SET pref_organization_id = COALESCE(pref_organization_id, p_org_id), updated_at = now()
     WHERE id = v_user_id;
     ```
   * **New Tenant Mapping**:
     ```sql
     INSERT INTO identity.organization_users (organization_id, user_id, location_id, is_active, persona_type, details, created_by, updated_by)
     VALUES (p_org_id, v_user_id, p_location_id, true, 'worker', ...)
     ON CONFLICT (organization_id, user_id) 
     DO UPDATE SET location_id = EXCLUDED.location_id, is_active = true, updated_at = now();
     ```
   * **Profile Provisioning & Enrichment Triggers**:
     * If this is a new tenant mapping, the database triggers (`trg_provision_hr_profiles`, `trg_provision_unified_contacts`, etc.) run to provision the HR profile, unified contact, and financial profile for this specific organization-user mapping.
     * If the mapping already existed, the triggers do not fire again, but the profile values are updated/reactivated.
     * Enriches `hr.profiles` details.
   * **Role & Team Assignment**:
     * Links the user to the new tenant's teams (`identity.user_teams`) and roles (`identity.user_roles`).

---

### 3. Tenant Switching & Session Hydration
For cross-tenant users, accessing the newly assigned organization is managed by the organization switcher component [OrgSwitcher.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/modules/admin/pages/OnboardingRequests.tsx) (and described in [auth_session_flow.md](file:///Users/macbookpro/zo_v2/mini_project/doc/04-01-2026/auth_session_flow.md)).

```mermaid
sequenceDiagram
    autonumber
    actor User as Existing User
    participant FE as Frontend Switcher
    participant DB as PostgreSQL
    participant Auth as Supabase Auth

    User->>FE: Select New Organization from Dropdown
    FE->>DB: RPC: identity.set_preferred_organization(new_org_id)
    FE->>Auth: supabase.auth.updateUser({ data: { org_id: new_org_id } })
    FE->>Auth: supabase.auth.refreshSession()
    Note over Auth: Issues fresh JWT claims containing<br/>the new org_id and org_user_id
    FE->>FE: Invalidate React Query Cache
    FE->>FE: Reload page / Refetch data with new headers
```

1. **Preference Persistence**: User selects new organization. Call `identity.set_preferred_organization({ new_org_id })` to store this preference.
2. **Metadata Sync**: Update Supabase Auth user metadata:
   ```typescript
   await supabase.auth.updateUser({ data: { org_id: newOrgId } });
   ```
3. **Session Refresh (CRITICAL)**: Call `supabase.auth.refreshSession()`. This forces Supabase to issue a new JWT containing the `org_id` and `org_user_id` claims, which is evaluated by the database Row Level Security (RLS) policies.
4. **Cache Invalidation**: TanStack Query caches are invalidated, forcing all components to refetch and load the isolated data associated with the newly active tenant.

---

## 🔍 Codebase Reference Map

For modifications, debugging, or extending these flows, refer to the following workspace files:

| Layer | File / Location | Purpose / Responsibility |
| :--- | :--- | :--- |
| **Frontend Registration** | [WebRegister.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/pages/auth/WebRegister.tsx) | Entry point for organization search and onboarding requests. |
| **Frontend Admin Panel** | [OnboardingRequests.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/modules/admin/pages/OnboardingRequests.tsx) | SaaS admin dashboard to approve, activate, or reject onboarding requests. |
| **Frontend User Invites** | [InviteUserModal.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/modules/admin/components/InviteUserModal.tsx) | Dialog for administrators to invite new/existing users. |
| **Auth Edge Function** | `/supabase/functions/invite_users` | Edge Function that registers users directly in Supabase Auth. |
| **Onboarding RPCs** | [onboarding_rpcs.sql](file:///Users/macbookpro/zo_v2/mini_project/doc/03-10-2026/onboarding_rpcs.sql) | SQL definitions for `onboard_request_zoworks_account` and `onboard_promote_to_tenant`. |
| **Invitation RPC** | [invite_user_rpc.sql](file:///Users/macbookpro/zo_v2/mini_project/doc/03-09-2026/invite_user_rpc.sql) | SQL definition for the centralized `onboard_invite_user_to_org` function. |
| **Database Schema Reference** | [schema.sql](file:///Users/macbookpro/zo_v2/mini_project/docs/backend/identity/schema.sql) | Absolute truth database representation of functions and tables in the target database. |

---

## 🧪 Testing the Flows Directly via Backend APIs

Use these cURL and SQL command templates to bypass the frontend and execute the onboarding/invitation pipelines directly in your terminal and database terminal/console.

### 1. Test Supabase Auth Edge Function (`invite_users`)

> [!NOTE]
> **Disabled JWT Verification**:
> Since this Edge function has been deployed with JWT verification disabled (`--no-verify-jwt`), you can invoke the function directly without passing a valid user session JWT or a private Service Role Key.
> * The `apikey` header must carry the project's public **anon/publishable key** (`sb_publishable_R6HCTaroeh0wjAcESBa-MQ_Pr69gegS`).
> * The `Authorization` header can either be completely omitted, or it can also carry the **anon/publishable key** as a bearer token (`Authorization: Bearer sb_publishable_R6HCTaroeh0wjAcESBa-MQ_Pr69gegS`). Both formats are accepted.

#### Terminal cURL Command:
Run this command from your terminal to trigger a user registration in Supabase Auth:

```bash
# Option A: Omitting the Authorization header (Cleanest)
curl -X POST "https://ytirobpsblbzgslcfqhn.supabase.co/functions/v1/invite_users" \
  -H "apikey: sb_publishable_R6HCTaroeh0wjAcESBa-MQ_Pr69gegS" \
  -H "Content-Type: application/json" \
  -d '{"email": "sandbox_user@example.com", "organization_id": "a41b2216-736c-4c00-99ca-30a0cd8ca0d2"}'

# Option B: Passing the publishable key in both apikey and Authorization (Matches client SDK default behavior)
curl -X POST "https://ytirobpsblbzgslcfqhn.supabase.co/functions/v1/invite_users" \
  -H "apikey: sb_publishable_R6HCTaroeh0wjAcESBa-MQ_Pr69gegS" \
  -H "Authorization: Bearer sb_publishable_R6HCTaroeh0wjAcESBa-MQ_Pr69gegS" \
  -H "Content-Type: application/json" \
  -d '{"email": "sandbox_user@example.com", "organization_id": "a41b2216-736c-4c00-99ca-30a0cd8ca0d2"}'
```

#### Expected JSON Output Shapes:
* **Newly Invited User (New to Supabase Auth)**:
  ```json
  {
    "message": "Invitation sent successfully",
    "is_new_user": true,
    "needs_onboarding": true
  }
  ```
* **Existing Auth User (Already exists in Supabase Auth)**:
  ```json
  {
    "message": "User already exists in Auth but needs onboarding",
    "auth_user_id": "2a4ed346-4c61-450f-86f2-5c816ae3fa73",
    "is_new_user": false,
    "needs_onboarding": true
  }
  ```

---

### 2. Test Onboarding & CRM Promotion SQL Commands
Run these commands sequentially in your database SQL Editor (e.g. Supabase Dashboard, pgAdmin, or psql):

#### Step 1: Search CRM Accounts
Fuzzy-search prospects matching a query:
```sql
SELECT * FROM public.onboard_search_crm_accounts('Test Org');
```

#### Step 2: Request Onboarding
Simulates a claimant submitting the registration form. This registers a lead contact/account and returns a pending organization:
```sql
SELECT public.onboard_request_zoworks_account(
    p_org_name          := 'Acme Testing Ltd',
    p_admin_first_name  := 'Alice',
    p_admin_last_name   := 'Smith',
    p_admin_email       := 'alice_smith@example.com',
    p_admin_mobile      := '+15550199',
    p_requested_modules := '["crm", "esign"]'::jsonb
);
```
* **Note the return value**: Save the returned `organization_id` UUID (e.g., `88888888-8888-8888-8888-888888888888`).

#### Step 3: Admin Approval - Attempt Promotion (Checks user status)
```sql
-- Checks if Alice Smith exists. Since she doesn't, this returns NEED_INVITE status.
SELECT identity.onboard_promote_to_tenant(
    p_org_id := '<ORGANIZATION_ID_FROM_STEP_2>'
);
```
* **Expected Output**: `{"status": "NEED_INVITE", "email": "alice_smith@example.com", ...}`
* *Now, invoke the cURL command in section 1 using her email to get the `auth_uuid`.*

#### Step 4: Admin Approval - Complete Promotion (With Auth ID)
Provide the resolved `auth_id` from the auth service to complete activation, module mapping, and role/team/HR provisioning:
```sql
SELECT identity.onboard_promote_to_tenant(
    p_org_id  := '<ORGANIZATION_ID_FROM_STEP_2>',
    p_auth_id := '<AUTH_UUID_FROM_EDGE_FUNCTION>'
);
```
* **Expected Output**: `{"status": "success", "organization_id": "...", "user_id": "..."}`

---

### 3. Test User Invitations (Add member to existing tenant)

#### Step 1: Direct Invitation & Organization Enrollment
Invite a user to an active tenant. You will need to query an active tenant's roles, teams, and locations first:
```sql
-- 1. Grab metadata IDs first
SELECT id, name FROM identity.roles WHERE organization_id = '<ORGANIZATION_ID>';
SELECT id, name FROM identity.teams WHERE organization_id = '<ORGANIZATION_ID>';
SELECT id, name FROM identity.locations WHERE organization_id = '<ORGANIZATION_ID>';

-- 2. Call the invitation RPC
SELECT identity.onboard_invite_user_to_org(
    p_email       := 'invited_worker@example.com',
    p_first_name  := 'David',
    p_last_name   := 'Miller',
    p_org_id      := '<ORGANIZATION_ID>',
    p_role_id     := '<ROLE_ID_FROM_METADATA>',
    p_team_id     := '<TEAM_ID_FROM_METADATA>',
    p_location_id := '<LOCATION_ID_FROM_METADATA>',
    p_auth_id     := '<AUTH_UUID>', -- Resolved via invite_users edge function or existing users table
    p_details     := '{"designation": "Project Manager", "department": "Operations"}'::jsonb
);
```
* **Expected Output**: `{"status": "success", "user_id": "...", "org_user_id": "..."}`
* **Verification query**: Verify the automated creation of their HR profile and organization membership:
```sql
SELECT * FROM identity.organization_users WHERE organization_id = '<ORGANIZATION_ID>';
SELECT * FROM hr.profiles WHERE id = (SELECT id FROM identity.organization_users WHERE user_id = (SELECT id FROM identity.users WHERE email = 'invited_worker@example.com'));
```

