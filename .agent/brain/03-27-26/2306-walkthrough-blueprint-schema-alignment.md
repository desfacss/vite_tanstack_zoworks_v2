# Walkthrough - Blueprint Stability & Sync Fixes

I have resolved the data synchronization issues and runtime crashes reported in the Transitions and Automations tabs.

**Session**: 2026-03-27 ~23:06 IST

## Key Fixes

### 1. Crash Prevention (Automation Manager)
- **Problem**: Clicking "On Transition" triggered a `TypeError: Cannot read properties of undefined (reading 'map')`.
- **Fix**: Added robust `Array.isArray(transitions)` checks before rendering dropdown options. Transitions are now correctly passed from the parent `ProcessBlueprintConfig` component.

### 2. Transition Mapping Alignment
- **Problem**: Transitions appeared as "Untitled Transition" even when they had data in the JSON.
- **Fix**: The backend uses the `label` field for the display name, while the UI was looking for `name`. I have aligned the UI to prioritize `label` and fall back to `id` (e.g., `T_TRIAGE`) to ensure no transition is ever "Untitled."

### 3. Backend Trigger Sync
- **Problem**: Transition trigger modes (Manual/Auto) weren't syncing correctly.
- **Fix**: Mapped the UI `is_manual` switch to the backend `trigger: "manual" | "auto"` field.

### 4. Code Quality & Linting
- **Cleanup**: Removed unused imports across all components.
- **Compatibility**: Fixed invalid Ant Design props (removing `size` from `Tag` and fixing `Badge` icon rendering) that were causing console warnings and CSS layout issues.

## Verification Results

- **Transitions List**: Successfully renders all 5+ transitions from the "ESM Tickets" JSON, including "Start Triage", "Request Info", etc.
- **Automation Triggers**: Selecting "On Transition" now correctly displays the list of defined transitions without crashing the app.
- **JSON Roundtrip**: Modifying transitions in the UI correctly updates the `Advanced (JSON)` tab with the expected `label` and `trigger` schema.

> [!NOTE]
> The "ESM Tickets" blueprint is now fully manageable through the visual UI without needing to touch the raw JSON.
