# Implementation Plan - Prioritize Custom Global Forms Over Config Forms

**Session**: 2026-05-23 ~13:57 IST

## Goal Description
Resolve the issue where new/create forms for timesheets and expenses are not showing in the main page by prioritizing registry-defined custom forms over config-defined dynamic forms when custom forms are present. Additionally, provide clear labels ("New Timesheet", "New Expense Sheet") for these actions.

## Proposed Changes

### 1. Translation Keys
#### [MODIFY] [en.json](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/workforce/i18n/en.json)
Added new translation keys:
- `"new_timesheet": "New Timesheet"`
- `"new_expense": "New Expense Sheet"`

### 2. Module Registry Action Labels
#### [MODIFY] [registry.ts](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/workforce/registry.ts)
Mapped registry global actions to use the clear labels:
- `timesheet-add` uses `'workforce:nav.new_timesheet'`
- `expense-add` uses `'workforce:nav.new_expense'`

### 3. Dynamic Views Global Actions Resolution
#### [MODIFY] [GlobalActions.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/core/components/DynamicViews/GlobalActions.tsx)
- Added `useTranslation` hook to translate namespace keys containing a colon (`:`).
- Updated the prioritizer to evaluate registry custom forms over config-driven default forms.

---

## Verification Plan

### Manual Verification
- Navigate to the **Timesheets** page and verify that the global action button reads "New Timesheet" and clicking it loads the custom Timesheet component in the drawer.
- Navigate to the **Expenses** page and verify that the global action button reads "New Expense Sheet" and clicking it loads the custom Expensesheet component in the drawer.

## Modified Files
- [en.json](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/workforce/i18n/en.json)
- [registry.ts](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/workforce/registry.ts)
- [GlobalActions.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/core/components/DynamicViews/GlobalActions.tsx)
