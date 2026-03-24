# Lead Promotion Flow: Technical Documentation

This document describes the two-phase process for promoting a Lead (CRM Account) to a full Tenant (Identity Organization).

## Phase 1: Request Phase
**Function**: `public.onboard_request_zoworks_account(p_account_id uuid)`

### Signature
sql
CREATE OR REPLACE FUNCTION public.onboard_request_zoworks_account(p_account_id uuid)
RETURNS jsonb


### How to Call (RPC)
javascript
const { data, error } = await supabase.rpc('onboard_request_zoworks_account', {
  p_account_id: '123e4567-e89b-12d3-a456-426614174000'
});


- **Logic**: 
    1. Locates the CRM Account by ID.
    2. Identifies the first associated CRM Contact to act as the primary owner.
    3. Creates a new record in `identity.organizations` with `is_active = false`.
    4. Creates a corresponding record in `identity.users` and links it via `identity.organization_users`.
- **Result**: The lead is converted into a pending "Shadow Tenant" waiting for administrative approval.

## Phase 2: Activation Phase
**Function**: `identity.onboard_promote_to_tenant(p_org_id uuid)`
**Access**: SaaS Admin Only

### Signature
sql
CREATE OR REPLACE FUNCTION identity.onboard_promote_to_tenant(p_org_id uuid)
RETURNS jsonb


### How to Call (RPC)
javascript
const { data, error } = await supabase.rpc('onboard_promote_to_tenant', {
  p_org_id: '123e4567-e89b-12d3-a456-426614174000'
});


- **Logic**:
    1. Sets `is_active = true` for the organization and its associated organization users.
    2. Bootstraps the tenant infrastructure:
        - **HQ Location**: Creates a default "Headquarters" in `identity.locations`.
        - **Leadership Team**: Creates a "Leadership Team" in `identity.teams`.
        - **SuperAdmin Role**: Creates a "SuperAdmin" role with full permissions and assigns it to the primary user.
- **Result**: The tenant is now fully operational and the primary user can log in with administrative privileges.






















Request Phase: public.onboard_request_zoworks_account(p_account_id) converts a CRM account and its primary contact into an inactive Identity organization and user.
Activation Phase: identity.onboard_promote_to_tenant(p_org_id) (SaaS Admin only) activates the organization/user and bootstraps the default Headquarters, Leadership Team, and SuperAdmin roles.














# Hardened Lead Promotion Flow: Technical Documentation

This document describes the hardened three-phase process for promoting a Lead (CRM Account) to a full Tenant (Identity Organization), including account search, verified request, and SaaS activation.

## Phase 1: Search & Selection
**Function**: `public.onboard_search_crm_accounts(p_query text)`

### Signature
sql
CREATE OR REPLACE FUNCTION public.onboard_search_crm_accounts(p_query text)
RETURNS TABLE (id uuid, name text, similarity_score float)


### Hardening Rules
- **Exact Word Requirement**: At least one word in the query must match a word in the account name exactly (case-insensitive).
- **Fuzzy Ranking**: Results are ranked by trigram similarity for typos in other words.

### React / Supabase Call
javascript
const { data: accounts, error } = await supabase.rpc('onboard_search_crm_accounts', {
  p_query: 'Zoworks'
});


---

## Phase 2: Request & Delegate Capture
**Function**: `public.onboard_request_zoworks_account(...)`

### Signature
sql
public.onboard_request_zoworks_account(
    p_account_id uuid,
    p_admin_first_name text DEFAULT NULL,
    p_admin_last_name text DEFAULT NULL,
    p_admin_email text DEFAULT NULL,
    p_admin_mobile text DEFAULT NULL
)


### React / Supabase Call
javascript
const { data, error } = await supabase.rpc('onboard_request_zoworks_account', {
  p_account_id: '...',
  p_admin_first_name: 'John',
  p_admin_last_name: 'Doe',
  p_admin_email: 'john@example.com',
  p_admin_mobile: '+1234567890'
});


- **Logic**: 
    - Creates or updates a CRM Contact with `status = 'PENDING_VERIFICATION'`.
    - Creates inactive identity records linked to this contact.

---

## Phase 3: SaaS Activation
**Function**: `identity.onboard_promote_to_tenant(p_org_id uuid)`
**Access**: SaaS Admin Only

### Signature
sql
CREATE OR REPLACE FUNCTION identity.onboard_promote_to_tenant(p_org_id uuid)
RETURNS jsonb


### React / Supabase Call
javascript
const { data, error } = await supabase.rpc('onboard_promote_to_tenant', {
  p_org_id: '...'
});


- **Security Gate**: Activation will fail if the `claimed_by_contact` is still in `PENDING_VERIFICATION` status.
- **Bootstrapping**: Sets up HQ, Leadership Team, and SuperAdmin role upon successful activation.