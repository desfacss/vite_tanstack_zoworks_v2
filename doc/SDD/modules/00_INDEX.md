# SDD Module Registry — Master Index

> Before starting work on any module, check this index.  
> After creating a new module SDD, add it here.

---

## Active Modules

| Module | Description | Status | Key Tables | SDD Path |
|--------|-------------|--------|-----------|---------|
| `identity` | Auth, tenants, users, roles, teams, org structure, onboarding | ✅ Active | `identity.organizations`, `identity.users`, `identity.organization_users`, `identity.roles`, `identity.teams`, `identity.locations` | [`modules/identity/`](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/identity/) |

---

## Planned Modules (SDD not yet written)

| Module | Description | Priority |
|--------|-------------|----------|
| `crm` | Accounts, contacts, deals, leads | High |
| `hr` | Profiles, candidates, applications, offers | High |
| `esm` | Tickets, service requests, work orders | Medium |
| `forms-engine` | `core.forms`, `core.view_configs`, dynamic form system | High |
| `workforce` | Timesheets, leave, expenses | Medium |

---

## Module Dependency Graph

```
identity          ← Base (no dependencies)
    ↓
crm               ← depends on identity (organization_id, contacts)
hr                ← depends on identity (organization_users as person pillar)
workforce         ← depends on identity + hr
esm               ← depends on identity + crm
forms-engine      ← depends on core (platform-level, no tenant deps)
```

---

## Test Phase Status

| Module | Phase 1 (Schema) | Phase 2 (RPCs) | Phase 3 (Triggers) | Phase 4 (Edge Fn) | Phase 5 (E2E) |
|--------|-----------------|---------------|-------------------|------------------|--------------|
| `identity` | ⬜ Pending | ⬜ Pending | ⬜ Pending | ⬜ Pending | ⬜ Pending |

---

## How to Add a New Module

1. Run `/write-sdd` workflow from `.agent/workflows/write-sdd.md`
2. Create `doc/SDD/modules/{module-name}/` with the 3-file structure
3. Add a row to this index
4. Update the dependency graph if the module has dependencies

---

*Last updated: 2026-05-21*
