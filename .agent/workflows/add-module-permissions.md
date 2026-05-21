---
name: "Add Module Permissions"
description: "A workflow for configuring the database when adding a new UI route or module feature."
---

# Add Module Permissions Workflow

When a developer adds a new route or page to the React UI (e.g. `/admin/saas`), the Supabase database must be explicitly configured so that the new route is recognized by the RBAC (Role-Based Access Control) system.

The permissions system relies on three interconnected tables within the `identity` schema. To make a new route available, you must write and execute an SQL migration file that updates all three tables cohesively.

## The 3-Table Configuration Pattern

### Step 1: Register in `identity.modules`
The `identity.modules` table is the global catalog for the SaaS platform.
- Identify the parent module for your new route (e.g., `admin`, `crm`, `workforce`).
- Update the `sub_modules` JSONB column for that parent module. Add your new route's identifier and set it to `true`.
- **Example**: If adding a "SaaS Settings" page to the admin module:
  `sub_modules = sub_modules || '{"saas_settings": true}'::jsonb`

### Step 2: Activate in `identity.org_module_configs`
Even though the platform supports the module, it must be "turned on" for the specific tenant organization(s).
- Find the `identity.org_module_configs` record linking the parent `module_id` to the target `organization_id`.
- Update its `sub_modules` JSONB column to include the new route.
- **Example**:
  `sub_modules = sub_modules || '{"saas_settings": true}'::jsonb`

### Step 3: Grant Access in `identity.roles`
Even if a module is activated for an organization, users cannot access it unless their specific Role grants them permission.
- Find the relevant roles in `identity.roles`.
- Update the `permissions` JSONB column. The JSON structure is `{"module_name": {"sub_module_name": ["c", "r", "u", "d"]}}`.
- **Example**:
  `permissions = jsonb_set(permissions, '{admin, saas_settings}', '["c", "r", "u", "d"]'::jsonb, true)`

## SQL Migration Template
When called to perform this task, generate an SQL script similar to this:

```sql
DO $$
DECLARE
    v_module_id uuid;
BEGIN
    -- 1. Register the sub_module globally
    SELECT id INTO v_module_id FROM identity.modules WHERE name = 'admin' LIMIT 1;
    
    IF v_module_id IS NOT NULL THEN
        UPDATE identity.modules 
        SET sub_modules = sub_modules || '{"saas_settings": true}'::jsonb
        WHERE id = v_module_id;
        
        -- 2. Activate for all relevant organizations (e.g., SaaS Admin orgs)
        UPDATE identity.org_module_configs
        SET sub_modules = sub_modules || '{"saas_settings": true}'::jsonb
        WHERE module_id = v_module_id;
    END IF;

    -- 3. Grant full CRUD to the SassAdmin roles
    UPDATE identity.roles
    SET permissions = jsonb_set(
        COALESCE(permissions, '{}'::jsonb),
        '{admin, saas_settings}',
        '["c", "r", "u", "d"]'::jsonb,
        true
    )
    WHERE is_sassadmin = true OR name = 'SassAdmin';

END $$;
```

## The Frontend Registration & Sync Pattern

In addition to the database migration, the new route must be registered in the frontend so that the sidebar navigation, permission verification, and page titles match the RBAC system.

### Step 1: Add to `src/config/menuConfig.json`
Insert the route object inside the corresponding parent module array (e.g. `"admin"`):
```json
{
  "filePath": "src/modules/admin/pages/Settings/OrganizationSettings.tsx",
  "routePath": "/admin/sass",
  "translationKey": "saas_settings",
  "key": "saas_settings",
  "submoduleKey": "admin-saas_settings"
}
```
*   `filePath`: Path to the page component.
*   `routePath`: The actual URL path matched by the router.
*   `translationKey`: Key used in the i18n locales.
*   `key`: Unique identifier (should match the database submodule name, e.g. `saas_settings`).
*   `submoduleKey`: Key mapped as `moduleName-subModuleName` (e.g. `admin-saas_settings`).

### Step 2: Register Translation Label
Add the English sidebar label in `src/i18n/locales/en.json` under `translation` -> `common` -> `label`:
```json
"saas_settings": "SaaS Settings"
```

### Step 3: Register Sidebar Icon
Open `src/core/components/Layout/Sider/navigation.tsx` and add a suitable Lucide Icon entry for your submodule key inside `iconMap`:
```typescript
saas_settings: <Settings size={18} />,
```

### Step 4: Define React Route
In `src/routes/index.tsx`, ensure the page is lazy-loaded and the route matches `menuConfig.json`:
```typescript
const SaasAdminSettings = lazy(() => import('@/modules/admin/pages/Settings/OrganizationSettings'));

// Inside the AuthedLayout Routes:
<Route path="/admin/sass" element={<SaasAdminSettings />} />
```

