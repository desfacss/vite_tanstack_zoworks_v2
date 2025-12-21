# 🏢 Adding a New Organization

> Step-by-step guide to onboard a new tenant to the platform

---

## Overview

Adding a new organization involves:
1. Creating the org in Supabase
2. Configuring modules and settings
3. Adding initial users
4. Verifying subdomain access

---

## 1. Create Organization (Database)

### Via Supabase Dashboard

```sql
-- Insert new organization
INSERT INTO identity.organizations (
  id,
  name,
  subdomain,
  app_settings,
  created_at
) VALUES (
  gen_random_uuid(),
  'Acme Corp',
  'acme',
  '{
    "modules": ["tickets", "crm", "inventory"],
    "theme": "light",
    "languages": ["en"],
    "partition": "locations"
  }',
  now()
);
```

### Key Fields

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Display name | "Acme Corp" |
| `subdomain` | URL subdomain | "acme" → acme.zoworks.com |
| `app_settings` | JSON config | See below |

---

## 2. Configure App Settings

The `app_settings` JSON controls what the org can access:

```json
{
  "modules": ["tickets", "crm", "workforce"],
  "theme": "dark",
  "languages": ["en", "es"],
  "partition": "locations",
  "features": {
    "whatsapp": true,
    "automation": true,
    "reports": true
  }
}
```

### Module Options

| Module ID | Description |
|-----------|-------------|
| `tickets` | Ticket/case management |
| `crm` | Customer relationship |
| `inventory` | Asset tracking |
| `workforce` | HR and team management |
| `engage` | WhatsApp integration |
| `catalog` | Product catalog |

---

## 3. Add Locations (Optional)

If org uses location-based partitioning:

```sql
INSERT INTO identity.locations (
  id,
  organization_id,
  name,
  code
) VALUES 
  (gen_random_uuid(), 'org-uuid', 'Headquarters', 'HQ'),
  (gen_random_uuid(), 'org-uuid', 'Branch Office', 'BR1');
```

---

## 4. Create Admin User

### 4.1 Create Auth User

In Supabase Auth → Users → Invite User:
- Email: `admin@acme.com`
- Send invite email

### 4.2 Link to Organization

After user confirms, run:

```sql
-- Get user's auth ID
SELECT id FROM auth.users WHERE email = 'admin@acme.com';

-- Create identity.users record
INSERT INTO identity.users (id, auth_id, email, name)
VALUES (gen_random_uuid(), 'auth-uuid', 'admin@acme.com', 'Admin User');

-- Link to organization
INSERT INTO identity.organization_users (
  id,
  user_id,
  organization_id,
  location_id
) VALUES (
  gen_random_uuid(),
  'user-uuid',
  'org-uuid',
  'location-uuid'
);

-- Assign admin role
INSERT INTO identity.user_roles (
  organization_user_id,
  role_id
) VALUES (
  'org-user-uuid',
  (SELECT id FROM identity.roles WHERE name = 'Admin' AND organization_id = 'org-uuid')
);
```

---

## 5. Create Roles

```sql
-- Create Admin role with full permissions
INSERT INTO identity.roles (
  id,
  organization_id,
  name,
  permissions
) VALUES (
  gen_random_uuid(),
  'org-uuid',
  'Admin',
  '{"admin": "all"}'
);

-- Create basic User role
INSERT INTO identity.roles (
  id,
  organization_id,
  name,
  permissions
) VALUES (
  gen_random_uuid(),
  'org-uuid',
  'User',
  '{
    "tickets": {"read": true, "create": true},
    "crm": {"read": true}
  }'
);
```

---

## 6. Verify Access

### Test Subdomain

1. Visit `https://acme.zoworks.com`
2. Should redirect to `https://auth.zoworks.com/login?redirect=...`
3. Login with admin user
4. Should land on dashboard

### Verify in Console

Check for:
```
[TenantResolver] Subdomain: acme
[ModuleLoader] Loading modules: tickets, crm, workforce
[SessionManager] Syncing: Acme Corp
```

---

## 7. Checklist

- [ ] Organization created in `identity.organizations`
- [ ] Subdomain configured and unique
- [ ] App settings configured with correct modules
- [ ] At least one location created (if using partitioning)
- [ ] Admin user created and linked
- [ ] Admin role assigned
- [ ] Subdomain access verified
- [ ] Login/logout flow works
- [ ] Data isolation verified (can't see other org's data)

---

## Troubleshooting

### "No organizations found"

- Check `identity.organization_users` has correct `user_id`
- Verify `get_my_organizations` RPC returns data

### Modules not showing

- Check `app_settings.modules` array
- Verify module IDs match registered modules

### Permission errors

- Check `user_roles` assignment
- Verify role has correct permissions

---

## Related

- [Multi-Tenant Architecture](../architecture/multi-tenant.md)
- [RLS Functions](../reference/rpc-functions.md)
- [Auth Flow](../architecture/auth-flow.md)
