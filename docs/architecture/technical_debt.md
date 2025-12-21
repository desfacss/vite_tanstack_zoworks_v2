# Technical Debt

This document tracks technical debt identified in the codebase.

## Authentication & Session Management

- [ ] **Refactor Org Switch Logic**: The organization switching logic in `Header/index.tsx` (optimistic updates, persistence, invalidation) is complex and coupled to the UI. It should be extracted into a custom hook (e.g., `useOrganizationSwitch`) to improve maintainability and testability.
- [ ] **Duplicate Initial Fetch**: The `Header` component fetches the list of organizations on mount. This logic might be better placed in a centralized "Session Initializer" or the `useUserSession` hook to avoid scattered data fetching.
- [x] ~~**Remove Redundant Auth Code**~~:
    *   ~~**Component**: `src/lib/supabase.ts` - `getUserPermissions` function~~
        *   **Status**: ✅ VERIFIED (Dec 21, 2025) - The function is already deprecated and commented out.
        *   **Finding**: Permissions are handled by `jwt_get_user_session` RPC (confirmed in schema dump).
    *   ~~**Component**: `src/components/Layout/AuthGuard_L.tsx`~~
        *   **Status**: ✅ VERIFIED (Dec 21, 2025) - File does not exist in codebase.

## Data Fetching & RPCs

- [x] ~~**Legacy Upsert Logic (`core_upsert_data_v7`)**~~:
    *   **Status**: ✅ VERIFIED (Dec 21, 2025) - Already migrated to v8.
    *   **Finding**: All active code uses `core_upsert_data_v8`. The v7 calls are commented out.
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

## Core Architecture

- [x] ~~**Core Independence Violations**~~ (Fixed Dec 21, 2025):
    *   `DetailsView.tsx` had imports from `@/modules/tickets/` (StatusTab, Logs)
    *   `DetailOverview.tsx` had imports from `@/modules/workforce/` (Expensesheet, Timesheet)
    *   **Resolution**: Components now load dynamically via registry pattern
    *   **New Registry Types**: Added `DetailComponentDefinition` for specialized detail views
