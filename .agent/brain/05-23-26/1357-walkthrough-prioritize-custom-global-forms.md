# Walkthrough - Prioritize Custom Global Forms Over Config Forms

**Session**: 2026-05-23 ~13:57 IST

We have resolved the issue where the "New / Create" global actions for timesheets and expenses (which use custom forms) were not showing up, and changed the label text to be clear and descriptive.

## Changes Made

### 1. Translation Keys
#### [en.json](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/workforce/i18n/en.json)
Added localized translation strings:
- `"new_timesheet": "New Timesheet"`
- `"new_expense": "New Expense Sheet"`

### 2. Action Registry Labels
#### [registry.ts](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/workforce/registry.ts)
Mapped actions to the new translations:
- `timesheet-add` uses `'workforce:nav.new_timesheet'`
- `expense-add` uses `'workforce:nav.new_expense'`

### 3. Dynamic Views Global Actions Resolution
#### [GlobalActions.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/core/components/DynamicViews/GlobalActions.tsx)
- Modified `allActions` to look for registered custom actions (`registeredActions`) for the entity type in global position.
- If there are registered custom actions, it prioritizes them and ignores the forms coming from config.
- Imported and utilized `useTranslation` (`t()`) to translate i18n keys dynamically.

## Verification Results

1. **Timesheet Page**: The global button now says **"New Timesheet"** and clicking it opens the drawer rendering the custom `Timesheet` component.
2. **Expense Sheet Page**: The global button now says **"New Expense Sheet"** and clicking it opens the drawer rendering the custom `Expensesheet` component.
3. **Other Config-driven Pages**: Dynamic forms continue to load from config as usual.

## Modified Files
- [en.json](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/workforce/i18n/en.json)
- [registry.ts](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/workforce/registry.ts)
- [GlobalActions.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/core/components/DynamicViews/GlobalActions.tsx)
