1. The Root Cause: "Blocking Dependency"
The actual issue that caused the "endless loading" was Rigid Initialization.

The app was designed with an "all-or-nothing" boot-up sequence. Before showing the Login screen or the Dashboard, we were waiting for the Supabase auth.getSession() call to resolve.

The Failure: If that network call hung—even for a few seconds—the entire app froze on a loading icon.
The Deadlock: I found that when you clicked "Login," both the 
Login.tsx
 page and the global 
SessionManager
 were simultaneously trying to refresh the session. This created a race condition in the Supabase client where one request would invalidate the other's token, leading to an infinite "waiting" state.
2. Why it keeps coming back every 10 days
We are hitting three compounding types of "Architectural Debt":

Schema Drift (org_id vs organization_id): We haven't successfully standardized on a single field name for the organization context. The JWT claims sometimes use one, the database uses another, and the frontend store uses a third. Every time we tweak a backend trigger or a JWT hook, the "decision matrix" in the frontend breaks.
Environment Variance: Authentication behaves differently on localhost (using localhost cookies) than it does on .zoworks.com (using cross-subdomain cookies). A fix for the "Hub" layout often breaks the "Subdomain" layout.
Lack of Resilience: Until now, we didn't have "Safety Timeouts." We were trusting that the auth service would always respond instantly. In a real-world network, that is a dangerous assumption.
3. The Structural Fix (What I just committed)
Instead of trying to "fix the network," I've moved the app to a Resilient Bootstrap model:

Safety Timeouts: If the auth check takes more than 3–5 seconds, the UI now says "I've waited long enough" and reveals the login form or dashboard anyway. This prevents the "Loading Icon" trap.
Optimistic Rendering: The 
Login
 page now checks localStorage directly. If it doesn't see a token, it skips the loading phase and shows the form immediately.
Unified Lookup: I've expanded 
useUserSession
 to check for both field names (org_id and organization_id) in both metadata locations (
app
 and user).


4. Authentication & Session Resilience
We identified and resolved an "initialization hang" that was causing the app to get stuck on a loading screen.

Safety Timeouts: Added a 5-second timer to 
SessionManager
 and 3-second timer to 
Login.tsx
. The UI now reveals itself even if the auth service is slow.
Redundant Call Removal: Removed a secondary refreshSession() call that was causing deadlocks during sign-in.
Improved Org Resolution: Better handling of org_id vs organization_id in JWTs.