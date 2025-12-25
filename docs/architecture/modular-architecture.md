# Modular Architecture Overview

> **Status**: Implemented | **Last Updated**: December 2025

This document consolidates the modular architecture design and implementation details.

---

## 1. Architectural Foundation

### Single Master Schema
The system uses a **Single Master Schema** for Identity and Capability with zero data duplication:

- **Master Anchor**: `identity.organizations` table
- **View Layer**: `v_organizations` handles the entire "Identity + Config" merge automatically
- **Zero-Touch Onboarding**: Insert one row → tenant gets Base Operational Environment

### What the View Combines
1. Organization metadata (Subdomain, Name, Theme)
2. Provisioned modules (via `module_features`)
3. Factory Defaults (from `org_module_configs` where `organization_id IS NULL`)

---

## 2. Configuration-Driven Assembly

The frontend is a **dynamic, tenant-aware engine**, not a static assembly.

### TenantResolver Flow
1. Fetches unified configuration from `identity` schema
2. Determines **Module Activation** (only enabled modules are fetched)
3. Applies **Feature Toggles** (tabs, actions registered conditionally)
4. Sets **Immutable Theming** (one theme per tenant)

### Hierarchical Config Merging
```
Global Defaults (Organization level)
         ↓
Tenant Overrides (Subdomain level)
         ↓
Final Configuration
```

Change a feature for an enterprise (Org) or just one branch (Tenant) — no code changes needed.

---

## 3. Frontend Cohesion

### TenantResolver (Ultra-Lean)
Performs exactly **one query** to get the hydrated state:

| Merged Field | Description |
|--------------|-------------|
| `theme_config` | Merged branding (Primary Color, Mode) |
| `app_settings` | Safe-merged settings (Base defaults + Org overrides) |
| `enabled_modules` | Deduplicated list of active plugins |
| `module_config` | Capability-specific settings per plugin |

### Module Handshake
All modules receive their configuration as a parameter:

```typescript
// In module's registry.ts
export async function register(config: ModuleConfig, enabledLanguages: string[]) {
  // Module-specific initialization based on config
}
```

### Automatic Theming
- Ant Design themes managed by `TenantProvider` upon resolution
- Document titles automatically updated per tenant

---

## 4. Implementation Status

| Task | Status |
|------|--------|
| Migration SQL | ✅ Complete |
| Enhanced Resolver (Tenant + Org joining) | ✅ Complete |
| Registry Updates (group support for Actions/Tabs) | ✅ Complete |
| Module Handshake (tickets, workforce, fsm) | ✅ Complete |
| Reference Documentation | ✅ Complete |

### Pending
- [ ] Theme Previewer in admin module

---

## 5. Developer Reference

For detailed module development guidelines, see:
- [Plug-and-Play Modules](./plug-and-play-modules.md) — Module structure and registration
- [Modular Development Guide](./modular_development_guide.md) — Step-by-step handbook

---

## AI-Native Architecture

The metadata-driven structure enables:
- Future agents to understand where capabilities are registered
- Dynamic extension based on business rules
- Self-documenting plugin system
