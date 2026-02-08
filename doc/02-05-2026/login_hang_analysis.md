# Incident Analysis: Infinite Loading on Login (2026-02-05)

## Summary
The application was getting stuck on a "connecting/loading" screen during the login sequence. This was caused by a combination of race conditions in authentication refreshing and a rigid "all-or-nothing" initialization sequence.

## Root Causes

### 1. The "Auth Deadlock"
In `SessionManager.tsx`, the code was detecting a missing `org_id` in the JWT and immediately calling `supabase.auth.refreshSession()`. 
- **The Problem**: When the Supabase client refreshes a session, it invalidates the current token. If the `LoginPage` or another component was also negotiating a login/session state, these calls would collide.
- **The Result**: The Supabase client would enter a state where it was perpetually waiting for a valid session, never returning control to the application, resulting in a hang.

### 2. Lack of Reactive Recovery in Login
The `Login.tsx` component had an `isSyncing` state that defaulted to `true` if a token existed in `localStorage`. 
- **The Problem**: It was waiting for the `useAuthStore` to populate the `user` object. However, if the `SessionManager` was stuck or failed to resolve the user due to the missing `org_id` claim, `user` would remain `null`.
- **The Result**: The `Login` page would show a spinner infinitely because it never received a signal that the initialization attempt had finished (even if it finished with a "not logged in" status).

## The Fixes

### 1. Removed Redundant Refresh
We modified [SessionManager.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/core/components/Layout/SessionManager.tsx) to stop trying to force-refresh the session when claims are missing.
- **Change**: It now logs a warning if `org_id` is missing but proceeds to enable the application state (`setEnabled(true)`).
- **Benefit**: This eliminates the race condition/deadlock during the initial boot sequence.

### 2. Reactive Syncing State
We updated [Login.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/pages/auth/Login.tsx) to be aware of the store's `initialized` flag.
- **Change**: A new `useEffect` was added:
  ```typescript
  useEffect(() => {
    if (initialized && !user && isSyncing) {
      setIsSyncing(false);
    }
  }, [initialized, user, isSyncing]);
  ```
- **Benefit**: Even if the session check "fails" to find a valid user, the `LoginPage` now knows that the check is *done* and reveals the login form, allowing the user to manually log in.

### 3. Reinforced Safety Timeouts
We verified and kept the safety timers (5s in `SessionManager`, 3s in `Login`) as a last line of defense against network hangs.

## Future Prevention
- **Standardization**: We must eventually standardize on a single organization claim (e.g., `organization_id`) across the database, JWT hooks, and frontend to avoid the "Missing Org ID" triggers.
- **Resilient UI**: Always ensure that "Loading" states have a finite duration after which they "fail open" to a login or error screen.
