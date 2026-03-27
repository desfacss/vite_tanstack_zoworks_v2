# Implementation Plan - Schema Alignment & Data Loading

The goal is to fix the data loading issues where nested automations and transition rules (guard rules, UI settings) from the JSON definition are not visible or editable in the visual UI.

**Session**: 2026-03-27 ~23:06 IST

## User Review Required

> [!IMPORTANT]
> **Data Structure Change**: We are implementing a bi-directional transformation for the `automations` field. 
> - **Internal UI State**: Flat array of automation objects (easier to manage in UI).
> - **Database JSON**: Nested object structure grouped by event type (required by the backend engine).
> 
> This ensures that historical data loads correctly and saves back in the format the backend expects.

## Proposed Changes

### 1. Utility Layer (New File or within Config)
- Implement `flattenAutomations(nestedObj)`: Converts `{ on_enter: { "StageID": { actions: [] } } }` to `[{ event: 'on_enter', target_id: 'StageID', actions: [] }]`.
- Implement `nestAutomations(flatArray)`: The reverse operation for saving.

### 2. [ProcessBlueprintConfig.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/settings/pages/Config/ProcessBlueprintConfig.tsx)
- **[MODIFY] `fetchBlueprint`**: Use `flattenAutomations` when loading the definition into state.
- **[MODIFY] `handleSave`**: Use `nestAutomations` before stringifying the definition for the database.
- **[MODIFY] `updateDefinition`**: Ensure it handles the internal flat state correctly.

### 3. [TransitionManager.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/settings/pages/Config/components/ProcessBlueprint/TransitionManager.tsx)
- **[MODIFY] UI Mappings**:
    - Expand the `openEditor` logic to extract fields from `guard_rules` and `ui` nested objects.
    - Update `saveDetails` to re-construct those objects.
- **[NEW] Form Fields**:
    - Add "Allowed Roles" (Multi-select) under a "Guard Rules" divider.
    - Add "Validation RPC" field.
    - Add "Icon selection" (Lucide mapping) and "Button Variant" selection.

### 4. [AutomationManager.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/settings/pages/Config/components/ProcessBlueprint/AutomationManager.tsx)
- **[MODIFY] Display Logic**: Ensure that the summary view correctly displays the "Target" name by searching through `stages` or `transitions` based on the `target_id`.

## Verification Plan

### Automated Tests
- Validate that loading the "ESM Tickets" blueprint now shows all 5+ automations in the "Automations" tab.
- Validate that editing a transition shows the "Start Triage" label and "DISPATCHER" roles correctly.

### Manual Verification
- Edit a transition, save, and check the "Advanced (JSON)" tab to ensure `guard_rules` is properly nested.
- Add a new automation, save, and check the JSON to ensure it is nested under the correct event key.
