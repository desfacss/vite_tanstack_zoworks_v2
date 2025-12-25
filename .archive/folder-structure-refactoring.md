# Folder Structure Refactoring Analysis

> **Principal Architect Review** - Files that conflict with plug-and-play architecture

---

## Summary of Issues

| Issue Type | Count | Impact |
|------------|-------|--------|
| Re-export shims (can remove) | 8+ | Low - cleanup |
| Misplaced module pages | 5 | Medium - move to modules |
| Core utilities in wrong location | 2 | Medium - move to core |
| Scattered schemas | 13 | High - move to modules |

---

## Issue 1: Re-Export Shims (Legacy Compatibility)

These files exist only to maintain old import paths. They should be **deleted after updating imports**.

| File | Re-exports to | Action |
|------|---------------|--------|
| `src/lib/store.ts` | `@/core/lib/store` | DELETE after updating imports |
| `src/lib/supabase.ts` | `@/core/lib/supabase` | DELETE |
| `src/lib/types.ts` | `@/core/lib/types` | DELETE |
| `src/lib/theme.ts` | `@/core/lib/theme` | DELETE |
| `src/lib/NestedContext.tsx` | (check) | DELETE or move |
| `src/i18n/index.ts` | `@/core/i18n/index` | DELETE |
| `src/hooks/useSettings.ts` | (check) | DELETE or move |
| `src/hooks/useUserSession.ts` | (check) | DELETE or move |
| `src/pages/admin/Notifications.tsx` | `@/modules/admin/pages/Notifications` | DELETE |
| `src/pages/crm/Contacts.tsx` | (likely re-export) | DELETE |

**Recommendation**: Use IDE global search-replace to update all imports to `@/core/*`, then delete these shim files.

---

## Issue 2: Misplaced Module Pages in `src/pages/`

These pages should be in their respective modules:

| Current Location | Should Be | Reason |
|------------------|-----------|--------|
| `src/pages/core/Profile.tsx` | `src/core/pages/Profile.tsx` OR `src/modules/core/pages/Profile.tsx` | Core functionality |
| `src/pages/core/UserSetting.tsx` | `src/core/pages/UserSettings.tsx` | Core functionality |
| `src/pages/settings/_UserSettings.tsx` | Merge with above | Duplicate |
| `src/pages/auth/Login.tsx` | `src/core/pages/auth/Login.tsx` | Auth is core |
| `src/pages/auth/Signup.tsx` | `src/core/pages/auth/Signup.tsx` | Auth is core |
| `src/pages/auth/ResetPassword.tsx` | `src/core/pages/auth/ResetPassword.tsx` | Auth is core |
| `src/pages/auth/WebRegister.tsx` | `src/core/pages/auth/WebRegister.tsx` | Auth is core |

**Note**: `src/pages/Dashboard.tsx` (154KB) and related files may stay as top-level since they're shell components routing to modules.

---

## Issue 3: Utilities in Wrong Location

| Current Location | Should Be | Reason |
|------------------|-----------|--------|
| `src/utils/constants.ts` | `src/core/lib/env.ts` | Environment config is core |
| `src/utils/deviceTypeStore.ts` | `src/core/lib/deviceTypeStore.ts` | Device detection is core |

**Note**: `src/utils/constants.ts` is imported by `TenantResolver.ts` as `@/utils/constants` - this needs updating.

---

## Issue 4: Scattered Schemas/Configs

**Correction**: Schemas should go to `docs/backend/` for documentation, NOT distributed to modules.

| Current Location | Should Be | Reason |
|------------------|-----------|--------|
| `src/schemas/*.json` | `docs/backend/schemas/` | Backend documentation |
| `src/schemas/forms/*.json` | `docs/backend/forms/` | Form schema docs |
| `src/schemas/viewConfig/*.json` | `docs/backend/viewConfig/` | View config docs |

---

## Issue 5: Module-Specific Components in Core

**Critical**: 25 files in `src/core/components/details/` are module-specific and should move to their modules.

### Workforce Module (`src/modules/workforce/components/`)

| Current Location | Move To |
|------------------|---------|
| `src/core/components/details/Timesheet.tsx` | `src/modules/workforce/components/Timesheet.tsx` |
| `src/core/components/details/TimesheetProjects.tsx` | `src/modules/workforce/components/TimesheetProjects.tsx` |
| `src/core/components/details/timesheet.css` | `src/modules/workforce/components/timesheet.css` |
| `src/core/components/details/Expensesheet.tsx` | `src/modules/workforce/components/Expensesheet.tsx` |
| `src/core/components/details/Expenses.tsx` | `src/modules/workforce/components/Expenses.tsx` |
| `src/core/components/details/TeamMembers.tsx` | `src/modules/workforce/components/TeamMembers.tsx` |
| `src/core/components/details/Times.tsx` | `src/modules/workforce/components/Times.tsx` |
| `src/core/components/details/Planner.tsx` | `src/modules/workforce/components/Planner.tsx` |

### Tickets Module (`src/modules/tickets/components/`)

| Current Location | Move To |
|------------------|---------|
| `src/core/components/details/Task.tsx` | `src/modules/tickets/components/Task.tsx` |
| `src/core/components/details/TaskForm.tsx` | `src/modules/tickets/components/TaskForm.tsx` |
| `src/core/components/details/Logs.tsx` | `src/modules/tickets/components/Logs.tsx` |
| `src/core/components/details/StatusTab.tsx` | `src/modules/tickets/components/StatusTab.tsx` |

### Admin Module (`src/modules/admin/components/`)

| Current Location | Move To |
|------------------|---------|
| `src/core/components/details/RoleUsers.tsx` | `src/modules/admin/components/RoleUsers.tsx` |
| `src/core/components/details/InviteUserModal.tsx` | `src/modules/admin/components/InviteUserModal.tsx` |

### Core Components (KEEP in `src/core/components/details/`)

These are truly shared and should stay:

| File | Reason to Keep |
|------|----------------|
| `DetailOverview.tsx` | Generic detail view wrapper |
| `DetailsView.tsx` | Generic detail view |
| `DynamicTab.tsx` | Tab system component |
| `ActivitiesManager.tsx` | Used across modules |
| `ApprovalActionButtons.tsx` | Used across modules |
| `DocView.tsx`, `DocView.css` | Document viewer (shared) |
| `EntityImages.tsx` | Image viewer (shared) |
| `FilesTab.tsx` | File attachment tab (shared) |
| `NotesTab.tsx` | Notes tab (shared) |
| `QRCard.tsx` | QR code display (shared) |

---

## Issue 6: Duplicate i18n Locales

| Current Location | Should Be | Reason |
|------------------|-----------|--------|
| `src/i18n/locales/*.json` | DELETE | Re-exports only, actual files in `src/core/i18n/locales/` |

---

## Target Folder Structure (After Cleanup)

```
src/
├── App.tsx              # Shell, routing
├── main.tsx             # Entry point
├── index.css            # Global styles
├── vite-env.d.ts
│
├── core/                # ✅ Remains as-is
│   ├── bootstrap/       # TenantProvider, ModuleLoader
│   ├── components/      # DynamicViews, DynamicForms, shared
│   ├── hooks/           # Core hooks
│   ├── i18n/            # Core labels + lazy loading
│   ├── lib/             # store, supabase, types, env
│   ├── pages/           # NEW: auth/, profile, settings
│   ├── registry/        # Module registry
│   └── theme/           # ThemeProvider, ThemeRegistry
│
├── modules/             # ✅ Plug-and-play modules
│   ├── workforce/
│   │   ├── i18n/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── schemas/     # NEW: moved from src/schemas
│   │   ├── manifest.ts
│   │   └── registry.ts
│   ├── admin/
│   ├── tickets/
│   └── ...
│
└── DELETE these:
    ├── lib/             # Re-exports only
    ├── hooks/           # Re-exports or move to core
    ├── i18n/            # Re-exports only
    ├── utils/           # Move to core/lib
    ├── schemas/         # Distribute to modules
    ├── pages/core/      # Move to core/pages
    ├── pages/admin/     # Re-exports only
    ├── pages/crm/       # Re-exports only
    ├── pages/settings/  # Merge with core
    └── types/           # Check if duplicate
```

---

## Migration Priority

| Priority | Task | Files Affected |
|----------|------|----------------|
| 1 | Move `src/utils/constants.ts` → `src/core/lib/env.ts` | ~10 imports |
| 2 | Move auth pages to `src/core/pages/auth/` | 4 files |
| 3 | Delete re-export shims after import updates | ~15 files |
| 4 | Move schemas to respective modules | ~13 files |
| 5 | Clean up `src/pages/` (keep only shell) | ~6 files |

---

## Validation After Refactoring

```bash
# 1. Check for broken imports
yarn build

# 2. Verify no imports from deleted paths
grep -r "from '@/lib/" src/
grep -r "from '@/utils/" src/
grep -r "from '@/hooks/" src/
grep -r "from '@/i18n" src/

# 3. Run the app and test navigation
yarn dev
```
