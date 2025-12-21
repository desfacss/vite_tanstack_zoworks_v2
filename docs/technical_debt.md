# Technical Debt

This document tracks technical debt identified in the codebase.

## Authentication & Session Management

- [ ] **Refactor Org Switch Logic**: The organization switching logic in `Header/index.tsx` (optimistic updates, persistence, invalidation) is complex and coupled to the UI. It should be extracted into a custom hook (e.g., `useOrganizationSwitch`) to improve maintainability and testability.
- [ ] **Duplicate Initial Fetch**: The `Header` component fetches the list of organizations on mount. This logic might be better placed in a centralized "Session Initializer" or the `useUserSession` hook to avoid scattered data fetching.
- [ ] **Remove Redundant Auth Code**:
    *   **Component**: `src/lib/supabase.ts`
        *   **Action**: Remove the deprecated `getUserPermissions` function (and `get_user_module_permissions_v3` RPC call).
        *   **Reason**: Redundant. Permissions are now handled by `jwt_get_user_session` and `useUserSession`.
    *   **Component**: `src/components/Layout/AuthGuard_L.tsx`
        *   **Action**: Delete this file.
        *   **Action**: Delete this file.
        *   **Reason**: Legacy component, not used in the active router (which uses `AuthGuard.tsx`).

## Data Fetching & RPCs

- [ ] **Legacy Upsert Logic (`core_upsert_data_v7`)**:
    *   **Status**: Legacy / Specialized.
    *   **Difference**: Functionally identical to `v8` EXCEPT that it **hardcodes** the foreign key column for related data to `'project_id'`.
    *   **Recommendation**: Use `v8` for all new code. `v7` can be replaced by `v8` by passing `related_fk_column => 'project_id'`.
    *   **Logic Analysis**:
        | Feature | v7 | v8 |
        | :--- | :--- | :--- |
        | **Foreign Key** | Hardcoded `'project_id'` | Dynamic `related_fk_column` (default `'project_id'`) |
        | **ID Default** | No default (must be passed) | Defaults to `NULL` |
        | **Flexibility** | Limited to Project-Child relations | Universal Parent-Child relations |

- [ ] **Unread Counts RPC (`get_unread_counts`)**:
    *   **Context**: Marked as potential debt in RPC documentation.
    *   **Action**: Investigate usage in `Channels/index.tsx`.
    *   **Goal**: Determine if this can be optimized or if it overlaps with other data fetching strategies (e.g., real-time subscriptions).
