# JWT Session & Tenant Switching Flow Documentation

This document serves as the "Source of Truth" for implementing the authentication and multi-tenant session flow in the React Native application, mirroring the existing web implementation.

## 🏗️ Architecture Overview

The system uses **Supabase Auth** for identity management and a custom **RPC-driven session model** for multi-tenancy. 

- **Identity**: Managed by Supabase `auth.users`.
- **Tenancy**: Managed by the `identity.organizations` table and membership in `identity.organization_users`.
- **Permissions**: Fetched dynamically based on the active `organization_id` using a custom JWT-aware RPC.

---

## 🔐 1. Login & Initial Org Selection

This flow happens in `Login.tsx`.

### Step-by-Step Flow:
1.  **Authentication**: Call `supabase.auth.signInWithPassword({ email, password })`.
2.  **Discovery**: Call RPC `identity.get_my_organizations()` to get the list of tenants the user belongs to.
3.  **Tenant Resolution**:
    -   **Scenario A (Enforced Tenant)**: If the app is bundled with a Tenant ID (e.g., from an environment variable), skip to Step 4 using that ID.
    -   **Scenario B (Preferred Org)**: Check `identity.users.pref_organization_id`. If set, use it.
    -   **Scenario C (Selection)**: If multiple orgs and no preference, show a selection UI.
4.  **Activation**:
    -   Call RPC `identity.set_preferred_organization({ new_org_id })`.
    -   **CRITICAL**: Call `supabase.auth.refreshSession()`. This forces Supabase to issue a new JWT. The backend uses the `org_id` (either from JWT metadata or the preference table) to scope all subsequent RPC calls.
5.  **Persistence**: Save the `active_org_id` to local storage (or `AsyncStorage` in RN).

---

## 🔄 2. Session Hydration (`useUserSession`)

The `useUserSession` hook (and `SessionManager`) is responsible for hydrating the application state.

### Input Parameters:
-   `enabled`: Boolean (is the user logged in?).
-   `currentOrgId`: The ID from the store (highest priority) or null (fallback to JWT metadata).

### Logic Inside `fetchUserSessionData`:
1.  **RPC Call**: `identity.jwt_get_user_session({ p_organization_id: targetOrgId })`.
    -   This RPC returns: `user_id`, `org_id`, `location_id`, `permissions`, `roles`, and `teams`.
2.  **Data Resolution**: Parallel fetch of full records:
    -   `identity.users` where `auth_id = user_id`.
    -   `identity.organizations` where `id = org_id`.
    -   `identity.locations` where `id = location_id` (if present).
3.  **State Update**: Hydrate the global `useAuthStore`.

---

## 🔁 3. Tenant Switching (Post-Login)

Handled by `OrgSwitcher.tsx`.

### Flow:
1.  User selects a different organization from the UI.
2.  **State Update**: Update `organization.id` in `useAuthStore` immediately (triggers reactive hooks).
3.  **Persistence**: Update `localStorage` and call `identity.set_preferred_organization`.
4.  **JWT Metadata Sync**: Call `supabase.auth.updateUser({ data: { org_id: newOrgId } })`.
5.  **Cache Invalidation**: Call `queryClient.invalidateQueries()` to force all data to refetch with the new organization context.

---

## 🛠️ Implementation Guide for React Native

### 1. Global Store (`useAuthStore`)
Mirror the structure in `src/core/lib/store.ts`. Ensure it persists to `AsyncStorage`.

### 2. Session Manager
Create an `AuthProvider` or `SessionManager` component that:
-   Initializes the Supabase client.
-   Listens to `onAuthStateChange`.
-   Forces a refresh if the `org_id` in the JWT doesn't match the one expected for the current tenant.

### 3. Environment-Locked Tenants
If your RN app is "Tenant Locked":
```typescript
const ENFORCED_ORG_ID = process.env.EXPO_PUBLIC_TENANT_ID;

// During Login/Boot:
if (ENFORCED_ORG_ID) {
  await handleOrgSelect({ id: ENFORCED_ORG_ID });
}
```

### 4. Key Functions & RPCs to Mimic
| Function | Table/RPC | Purpose |
| :--- | :--- | :--- |
| `signIn` | `supabase.auth.signIn` | Identity verification |
| `getOrgs` | `rpc: identity.get_my_organizations` | Discovery |
| `setPrefOrg` | `rpc: identity.set_preferred_organization` | Persistence |
| `getSession` | `rpc: identity.jwt_get_user_session` | Permissions & Metadata |
| `refresh` | `supabase.auth.refreshSession` | Update JWT Claims |

---

## 🎨 4. Tenant Configuration & Branding (`resolveTenant`)

In the web app, `TenantResolver.ts` resolves branding and module availability based on the subdomain. For React Native, this should be mirrored to allow for dynamic branding.

### Logic:
1.  **Resolution**: Query `identity.v_organizations` by `subdomain` (or `organization_id`).
2.  **Config Includes**:
    -   `theme_config`: Primary colors, logos, and border radius.
    -   `enabled_modules`: Which features to show in the app.
    -   `app_settings`: External API keys or platform-specific flags.

### React Native Integration:
-   If the app is "Tenant-Locked", call `resolveTenant` on boot using the bundled ID.
-   If "Multi-Tenant", call `resolveTenant` *after* the user selects their organization to apply the correct theme.

---

## ⚠️ Critical Gotchas

> [!IMPORTANT]
> **JWT Refresh is Mandatory**: The backend RPC `jwt_get_user_session` and Row Level Security (RLS) depend on the `org_id` claim. Simply changing it in your local state is not enough; you MUST refresh the Supabase session to get a fresh token.

> [!WARNING]
> **Schema Names**: Most core auth tables/functions are in the `identity` schema. Ensure your Supabase client/calls explicitly reference `.schema('identity')`.

> [!TIP]
> **Parallel Fetching**: To minimize "loading flicker", fetch User and Organization details in `Promise.all` after the RPC returns the IDs.
