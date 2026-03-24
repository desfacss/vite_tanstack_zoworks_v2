# Refined Organization Onboarding Process

This plan outlines the implementation of a two-stage organization onboarding process that integrates with CRM accounts and contacts, leading to a SaaS-approved activation that creates the necessary identity and auth records.

## Proposed Changes

### Database Schema (RPCs)

#### [NEW] `identity.onboard_request_organization`
This function handles the initial registration request. It validates/creates CRM records and creates an inactive organization.

- **Inputs**:
    - `p_org_name` (optional if `p_account_id` provided)
    - `p_account_id` (optional)
    - `p_admin_first_name` (optional)
    - `p_admin_last_name` (optional)
    - `p_admin_email` (optional)
    - `p_admin_mobile` (optional)
    - `p_details` JSONB
- **Logic**:
    1. **Account Validation**:
        - If `p_account_id` is provided, fetch `name` from `crm.accounts`. If not found, RAISE EXCEPTION.
        - If `p_account_id` is NOT provided, check if an account with `p_org_name` exists. If so, use its ID.
        - If no account exists, create a new one in `crm.accounts` (and thus `unified.organizations`).
    2. **Contact Validation**:
        - If admin details (email/name) are provided in the form, use them.
        - If NOT provided, attempt to fetch the "Primary Contact" for the selected/created account from `crm.contacts`.
        - If no contact exists and none provided, RAISE EXCEPTION (we need at least an email to invite later).
        - Upsert `crm.contacts` with the resolved details, ensuring it is linked to the account.
    3. **Organization Creation**:
        - Create `identity.organizations` with `is_active = false`.
        - Link to the CRM account/contact (via `claimed_by_contact_id`).
    4. **Return**: The `org_id` of the new inactive organization.

#### [MODIFY] `identity.onboard_approve_organization`
(Refactored from `onboard_promote_to_tenant`)
This function activates the organization and its primary admin user.

- **Inputs**:
    - `p_org_id`
    - `p_auth_id` (the Supabase `auth_id` created via admin invite)
- **Logic**:
    1. Verify organization is inactive and has a claimed contact.
    2. Set `identity.organizations.is_active = true`.
    3. Call (or inline logic from) `identity.onboard_invite_user_to_org` using the claiming contact's details:
        - Create `identity.users` linked to `p_auth_id`.
        - Create `identity.organization_users` (as admin).
        - Provision `hr.profiles`.
        - Assign default roles (SuperAdmin) and teams (Leadership).

## Verification Plan

### Automated Tests
- Since these are SQL RPCs, I will verify them by running SQL batches in the terminal (mocking the environment).
- Command: `psql` or `supabase db execute` (if available, otherwise I will provide the test scripts).

### Manual Verification
1. Call `onboard_request_organization` with a new organization name and admin info.
   - Verify `crm.accounts`, `crm.contacts`, and `identity.organizations` (inactive) are created.
2. Call `onboard_request_organization` with an existing `account_id`.
   - Verify it uses the existing account and creates a new contact if needed.
3. Call `onboard_approve_organization` with a mock `auth_id`.
   - Verify `organizations.is_active` becomes `true`.
   - Verify `identity.users`, `identity.organization_users`, `hr.profiles`, `user_roles`, and `user_teams` are created correctly.
