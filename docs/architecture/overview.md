# 🏗️ ZoWorks Architecture Overview

> High-level system overview for understanding the platform architecture.

---

## System Diagram

```
                                    ┌─────────────────────────┐
                                    │        INTERNET         │
                                    └───────────┬─────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        │                   VERCEL                       │
                        │  ┌─────────────────────────────────────────┐  │
                        │  │         Wildcard DNS Routing            │  │
                        │  │   *.zoworks.com → Single React App      │  │
                        │  └─────────────────────────────────────────┘  │
                        └───────────────────────┬───────────────────────┘
                                                │
            ┌───────────────────────────────────┴───────────────────────────────────┐
            │                        REACT SPA (Frontend)                           │
            │  ┌──────────────────────────────────────────────────────────────────┐ │
            │  │                      TenantResolver                               │ │
            │  │              Extracts subdomain from URL                          │ │
            │  └──────────────────────────────────────────────────────────────────┘ │
            │                                  │                                    │
            │  ┌──────────────────────────────┴───────────────────────────────┐    │
            │  │                      ModuleLoader                             │    │
            │  │          Lazy-loads modules based on tenant config            │    │
            │  └──────────────────────────────────────────────────────────────┘    │
            │                                  │                                    │
            │  ┌──────────────────────────────┴───────────────────────────────┐    │
            │  │                       Core Layer                              │    │
            │  │   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐   │    │
            │  │   │ Layout  │  │   Auth   │  │ Registry │  │ DynamicViews│   │    │
            │  │   └─────────┘  └──────────┘  └──────────┘  └─────────────┘   │    │
            │  └──────────────────────────────────────────────────────────────┘    │
            │                                  │                                    │
            │  ┌──────────────────────────────┴───────────────────────────────┐    │
            │  │                      Domain Modules                           │    │
            │  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │    │
            │  │   │ Tickets  │  │   CRM    │  │ Workforce│  │ Inventory│     │    │
            │  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘     │    │
            │  └──────────────────────────────────────────────────────────────┘    │
            └───────────────────────────────────┬───────────────────────────────────┘
                                                │
            ┌───────────────────────────────────┴───────────────────────────────────┐
            │                         SUPABASE (Backend)                            │
            │  ┌──────────────┐  ┌────────────────┐  ┌───────────────────────────┐ │
            │  │ PostgreSQL   │  │ Auth (JWT)     │  │ Edge Functions            │ │
            │  │ + RLS        │  │ + Metadata     │  │ (Email, Automation, etc)  │ │
            │  └──────────────┘  └────────────────┘  └───────────────────────────┘ │
            └───────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Multi-Tenancy Model

**Approach**: Single codebase, single database, tenant isolation via RLS

| Aspect | Implementation |
|--------|----------------|
| **Tenant Identification** | Subdomain → `vkbs.zoworks.com` |
| **Data Isolation** | PostgreSQL RLS on `organization_id` |
| **Config Isolation** | Tenant-specific `app_settings` JSON |
| **Module Selection** | Tenant config defines enabled modules |

### 2. Module Architecture

```
src/
├── core/                    # Shared infrastructure (NEVER import from modules)
│   ├── bootstrap/           # App initialization
│   ├── registry/            # Plugin registration
│   ├── components/          # Shared UI components
│   └── lib/                 # Utilities, store, types
│
├── modules/                 # Feature modules (can import from core)
│   ├── tickets/             # Ticket management
│   ├── crm/                 # Customer relationship
│   ├── workforce/           # HR & team management
│   ├── inventory/           # Asset management
│   └── ...
│
└── schemas/                 # View/form configurations
    └── viewConfig/          # Per-entity view definitions
```

### 3. Registry Pattern

Modules register their capabilities without tight coupling:

```typescript
// In module's index.ts
import { registry } from '@/core/registry';

registry.registerAction({
  id: 'create-ticket',
  targetEntity: 'tickets',
  label: (t) => t('tickets.create'),
  handler: () => { /* action logic */ }
});
```

---

## Data Flow

### Authentication Flow

```
1. User visits vkbs.zoworks.com
   └─→ TenantResolver extracts "vkbs"
   
2. User clicks Login
   └─→ Redirects to auth.zoworks.com/login?redirect=vkbs...
   
3. User authenticates
   └─→ Supabase returns JWT with org_id in metadata
   
4. SessionManager hydrates store
   └─→ useUserSession RPC fetches full permissions
   
5. ModuleLoader enables "tickets", "crm" based on config
   └─→ Routes and navigation populated
```

### Data Fetching Flow

```
Component Request
      │
      ▼
  React Query ────────→ Cache Hit? ───Yes──→ Return Data
      │                      │
      │ No                   │
      ▼                      │
  Supabase Client            │
      │                      │
      ▼                      │
  RLS Check (org_id) ←───────┘
      │
      ▼
  PostgreSQL Query
      │
      ▼
  Return + Cache
```

---

## Key Subsystems

### 1. DynamicViews

Config-driven entity views (tables, forms, details):

```typescript
// schemas/viewConfig/tickets.ts
{
  entity: 'tickets',
  schema: 'blueprint',
  titleField: 'subject',
  columns: [...],
  formFields: [...],
  detailview: { staticTabs: [...], dynamicTabs: [...] }
}
```

### 2. Auth Store (Zustand)

Centralized session management:

```typescript
// Key state
{
  user: User | null,
  organization: Organization | null,
  location: Location | null,
  permissions: Record<string, any>,
  appSettings: AppSettings | null,
  isSwitchingOrg: boolean
}
```

### 3. Supabase Schema Organization

| Schema | Purpose |
|--------|---------|
| `public` | Core transactional data |
| `identity` | Users, orgs, roles, permissions |
| `blueprint` | Tickets, workflows, automation |
| `automation` | Automation rules and logs |

---

## Environment Configuration

```bash
# Core
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Multi-tenant
VITE_AUTH_BASE_URL=https://auth.zoworks.com
VITE_APP_BASE_DOMAIN=zoworks.com
VITE_COOKIE_DOMAIN=.zoworks.com
```

---

## Related Docs

- [Core Architecture Details](./core-architecture.md)
- [Multi-Tenant Implementation](./multi-tenant.md)
- [Authentication Flow](./auth-flow.md)
- [RPC Functions Reference](../reference/rpc-functions.md)
