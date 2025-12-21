# Architecture Verification Checklist

> Living document to track plug-and-play module architecture compliance.

---

## Module Isolation Tests

| Test | Status | Notes |
|------|--------|-------|
| Remove `workforce/` folder → build passes | ⚠️ Partial | ModuleLoader has manifest refs (by design) |
| Remove `tickets/` folder → build passes | ⚠️ Partial | Core components isolated |
| Remove `fsm/` folder → build passes | ⬜ Pending | |
| No orphan i18n labels after removal | ⬜ Pending | |
| No broken imports in core | ✅ Done | Fixed Dec 21, 2025 |

---

## Core Independence

| Check | Status | Notes |
|-------|--------|-------|
| `src/core/` has no imports from `src/modules/` | ✅ Done | Verified Dec 21, 2025 - Zero module imports |
| DynamicViews work without any module | ✅ Done | Uses registry-based loading |
| Core bundle < 500KB gzipped | ⚠️ Over target | 540KB (mainly Ant Design UI) |
| Registry pattern fully implemented | ✅ Done | `src/core/registry/` |
| Detail components via registry | ✅ Done | Added `DetailComponentDefinition` |

---

## Bundle Size Analysis (Dec 21, 2025)

| Bundle | Raw Size | Gzipped | Notes |
|--------|----------|---------|-------|
| `index-*.js` (main) | 372 KB | **111 KB** | Core app entry |
| `ui-*.js` (Ant Design) | 1.2 MB | **377 KB** | UI framework overhead |
| `vendor-*.js` | 164 KB | **52 KB** | Third-party libs |
| **Total Core** | ~1.7 MB | **~540 KB** | Above 200KB target |
| `plotly.min-*.js` | 4.8 MB | **1.4 MB** | Charts - lazy loaded |

**Optimization Opportunities:**
- Consider tree-shaking Ant Design icons
- Lazy load less-used UI components
- Split plotly into even smaller chunks

---

## Module Compliance

### Required Structure
```
src/modules/{module}/
├── index.ts          # exports register
├── registry.ts       # registration logic
├── manifest.ts       # dependencies ✅ Added Dec 21
├── i18n/             # module labels ✅ Added Dec 21
└── help/             # tours ✅ Added Dec 21
```

| Module | Has i18n/ | Has help/ | Has manifest | Labels extracted | Detail Components |
|--------|-----------|-----------|--------------|------------------|-------------------|
| workforce | ✅ | ✅ | ✅ | ✅ | ✅ (expense_sheet, timesheet) |
| tickets | ✅ | ✅ | ✅ | ✅ | ✅ (StatusTab, Logs via tabs) |
| fsm | ✅ | ✅ | ✅ | ✅ | ⬜ |
| crm | ✅ | ✅ | ✅ | ✅ | ⬜ |
| wa | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| admin | ✅ | ✅ | ✅ | ✅ | ⬜ |
| contracts | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| catalog | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| erp | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| esm | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| wms | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| pos | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| landing | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| core | ✅ | ✅ | ✅ | ✅ | N/A |

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
| Core bundle (gzipped) | < 200KB | 540KB | ⚠️ Over (UI framework) |
| Time to interactive | < 3s | TBD | ⬜ Needs measurement |
| Language file per tenant | Only enabled | ✅ Yes | Done |
| Module chunk isolation | Separate files | ✅ Yes | Done |

---

## Registry Capabilities

| Type | Method | Usage |
|------|--------|-------|
| Modules | `registerModule()` | Module metadata |
| Actions | `registerAction()` | Row/Global actions |
| Tabs | `registerTab()` | Entity detail tabs |
| View Types | `registerViewType()` | Custom view renderers |
| Detail Components | `registerDetailComponent()` | Specialized views (new!) |

---

## ESLint Protection

| Rule | Scope | Status |
|------|-------|--------|
| `no-restricted-imports` | `src/core/**` | ✅ **ERROR** - Blocks module imports in core |
| `@typescript-eslint/no-explicit-any` | Global | Off (legacy) |
| `react-hooks/rules-of-hooks` | Global | Warn (legacy issues) |
| `react-hooks/exhaustive-deps` | Global | Warn |

**Lint Status**: 0 errors, 294 warnings (acceptable for production)

---

## Last Updated

- **Date**: 2025-12-21 (Evening - 22:42 IST)
- **By**: Architecture Review
- **Changes**: 
  - Core independence achieved - zero imports from modules
  - Added manifest, i18n, and help folders to all modules
  - Measured bundle sizes
  - Added DetailComponentDefinition to registry
  - **ESLint protection rule added** - prevents future module imports in core
  - Reduced lint errors from 7,800+ to **0 errors** (294 warnings remain)
  - **Rules-of-hooks violations fixed** - KanbanView.tsx, MapViewComponent.tsx
