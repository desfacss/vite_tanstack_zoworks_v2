# Enhancements

This document tracks proposed enhancements for the application.

## Authentication & Session Management

- [ ] **Centralized Organization Switch Hook**: Create a `useOrganizationSwitch` hook to encapsulate the logic for switching organizations, handling optimistic updates, persistence, and error rollback. This will clean up the `Header` component.
- [ ] **Session Recovery**: Implement better handling for network failures during organization switching (e.g., automatic retry or more robust rollback mechanisms).
- [ ] **Client-Side App Settings Merging**:
    *   **Context**: Currently, the application calls the `idt_utils_get_merged_app_settings` RPC to merge organization-level settings with location-level overrides. This occurs even though the client *already* possesses the raw `app_settings` JSON for both the Organization and the Location (fetched via `useUserSession`).
    *   **Problem**: This results in a redundant network request, increasing latency and server load without providing new data.
    *   **Optimization Plan**:
        1.  **Create Helper**: Implement `getMergedAppSettings(session: UserSessionData): AppSettings` in `src/lib/utils.ts`.
        2.  **Logic**:
            *   Start with `session.organization.app_settings` (Base).
            *   Deep merge `session.location.app_settings` (Override) on top, if a location is active.
            *   Ensure proper handling of nested keys (e.g., `channels.email.defaults`).
        3.  **Refactor**: Replace all async calls to `idt_utils_get_merged_app_settings` with this synchronous helper function.
    *   **Benefit**: Eliminates 1 RPC call per session load/refresh, resulting in faster UI rendering for settings-dependent components.
