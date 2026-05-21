# Walkthrough: Adding a Test Route and Permissions

**Session**: 2026-05-21 ~17:26 IST

## Summary of UI Changes
- Updated **RolesManagement.tsx** to fetch tenant‑specific roles with a global fallback when none exist.
- Modified **OrganizationSettings.tsx** and **Organization.tsx** to detect SaaS admin via the `bypass` flag **or** a role named `SassAdmin`/`SaaSAdmin`.
- Added a new **TestRoute.tsx** component under `src/modules/admin/pages/Settings/` that renders a simple "test" body.
- Updated **menuConfig.json** to include the new route `/admin/test` under the admin module.
- Adjusted route definitions in `src/routes/index.tsx` to expose the new route.

## Supabase Configuration Adjustments
- No schema changes were required; the role‑fetching logic now queries `identity.roles` with `organization_id = <orgId>` and falls back to `organization_id IS NULL` for global roles.
- The `jwt_get_user_session` function already provides the `bypass` claim, which we now use to grant SaaS‑admin access.

## Skills Added / Utilized
- **modern‑web‑guidance** – consulted for best‑practice UI patterns.
- **a11y‑debugging** – verified the new component meets accessibility basics.
- **debug‑optimize‑lcp** – ensured the new route does not impact LCP.

## Adding a New UI Route – Workflow
1. **Create the component** (e.g., `TestRoute.tsx`).
2. **Add menu entry** in `src/config/menuConfig.json` with `routePath` and `filePath`.
3. **Add a `<Route>`** in `src/routes/index.tsx` pointing to the component.
4. **Run migration** if the route requires new DB objects (use the `add‑entity‑crud` or `add‑module‑permissions` workflows). For a simple static page we only need steps 1‑3.
5. **Assign permissions** via the **RolePermissions** UI – SaaS admin (`bypass = true`) automatically has access; other roles can be granted by toggling the permission flag for the route.

## Permission Setup for the Test Route
- By default the SaaS admin (`bypass` claim) can access all admin routes, including `/admin/test`.
- To grant the route to other roles:
  1. Open **Settings → Role Permissions**.
  2. Locate the newly added route `admin.test` (it appears under the "admin" module).
  3. Toggle the permission checkbox for the desired role.

## Adding the Route
The following files were created/modified:
- `src/modules/admin/pages/Settings/TestRoute.tsx` – new component.
- `src/config/menuConfig.json` – added entry for `/admin/test`.
- `src/routes/index.tsx` – added `<Route path="/admin/test" element={<TestRoute />} />`.

You can now navigate to `http://localhost:5173/admin/test` to see the plain **test** page.

---
*All changes have been archived using the `/archive-docs` workflow.*
