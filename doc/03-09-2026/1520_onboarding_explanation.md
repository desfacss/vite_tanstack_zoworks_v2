# Onboarding Flow & Database Schema

## Overview
The `/web_register` page is used for onboarding new organizations. It bridges the gap between CRM leads and formal tenant creation in the Zoworks platform.

---

## Tables & Schemas Involved

### 1. `crm.accounts`
- **Purpose**: Stores lead/prospect information.
- **Role**: The search functionality on the registration page queries this table to identify if the organization already exists as a CRM lead.

### 2. `crm.contacts`
- **Purpose**: Stores individual contact details.
- **Role**: When a registration form is submitted, the user's details (name, email, phone) are stored or linked here as the "claimant" of the organization.

### 3. `identity.organizations`
- **Purpose**: Core table for tenant management.
- **Role**: Holds organization metadata (name, subdomain/short code). Initially created with `is_active = false`.

### 4. `identity.users`
- **Purpose**: System users.
- **Role**: Upon approval, the requesting contact is promoted to a system user with administrative privileges for their organization.

---

## Functionality & RPC Flow

### Phase 1: Search (`WebRegister.tsx`)
- **RPC**: `onboard_search_crm_accounts(p_query)`
- **Action**: Queries `crm.accounts` for matches based on user input.
- **Outcome**: Displays matching CRM records for the user to select.

### Phase 2: Request (`WebRegister.tsx`)
- **RPC**: `onboard_request_zoworks_account(...)`
- **Inputs**: `p_account_id`, `p_admin_first_name`, `p_admin_last_name`, `p_admin_email`, `p_admin_mobile`.
- **Action**: Links contact details to the organization and flags it as a pending onboarding request.

### Phase 3: Approval (`OnboardingRequests.tsx`)
- **RPC**: `onboard_promote_to_tenant(p_org_id)`
- **Action**: Performed by a global admin.
- **Outcome**: 
    - Sets `is_active = true` in `identity.organizations`.
    - Activates the tenant subdomain.
    - Creates/Promotes the requesting contact to an `org_admin` user in `identity.users`.
