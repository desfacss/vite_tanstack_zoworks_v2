# Architecture Verification Checklist

> Living document to track plug-and-play module architecture compliance.

---

## Module Isolation Tests

| Test | Status | Notes |
|------|--------|-------|
| Remove `workforce/` folder → build passes | ⬜ Pending | |
| Remove `tickets/` folder → build passes | ⬜ Pending | |
| Remove `fsm/` folder → build passes | ⬜ Pending | |
| No orphan i18n labels after removal | ⬜ Pending | |
| No broken imports in core | ⬜ Pending | |

---

## Core Independence

| Check | Status | Notes |
|-------|--------|-------|
| `src/core/` has no imports from `src/modules/` | ⬜ Pending | |
| DynamicViews work without any module | ⬜ Pending | |
| Core bundle < 500KB gzipped | ⬜ Pending | |
| Registry pattern fully implemented | ✅ Done | `src/core/registry/` |

---

## Module Compliance

### Required Structure
```
src/modules/{module}/
├── index.ts          # exports register
├── registry.ts       # registration logic
├── manifest.ts       # dependencies (NEW)
├── i18n/             # module labels (NEW)
└── help/             # tours (NEW)
```

| Module | Has i18n/ | Has help/ | Has manifest | Labels extracted |
|--------|-----------|-----------|--------------|------------------|
| workforce | ✅ | ⬜ | ✅ | ✅ |
| tickets | ✅ | ⬜ | ⬜ | ✅ |
| fsm | ✅ | ⬜ | ⬜ | ✅ |
| crm | ✅ | ⬜ | ⬜ | ✅ |
| wa | ⬜ | ⬜ | ⬜ | ⬜ |
| admin | ✅ | ⬜ | ⬜ | ✅ |
| contracts | ⬜ | ⬜ | ⬜ | ⬜ |
| catalog | ⬜ | ⬜ | ⬜ | ⬜ |
| erp | ⬜ | ⬜ | ⬜ | ⬜ |
| esm | ⬜ | ⬜ | ⬜ | ⬜ |
| wms | ⬜ | ⬜ | ⬜ | ⬜ |
| pos | ⬜ | ⬜ | ⬜ | ⬜ |
| landing | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Tenant Configuration

| Feature | Status | Notes |
|---------|--------|-------|
| Lazy i18n loading | ✅ Done | `initI18n()` |
| Tenant theme colors | ✅ Done | `loadTenantTheme()` |
| User dark mode toggle | ✅ Done | `useThemeStore` |
| Module lazy loading | ✅ Done | `ModuleLoader.ts` |
| Sub-module config support | ⬜ Pending | From `org_module_configs` |

---

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Core bundle (gzipped) | < 200KB | TBD | ⬜ |
| Time to interactive | < 3s | TBD | ⬜ |
| Language file per tenant | Only enabled | TBD | ⬜ |
| Module chunk isolation | Separate files | TBD | ⬜ |

---

## Last Updated

- **Date**: 2025-12-21
- **By**: Architecture Review
