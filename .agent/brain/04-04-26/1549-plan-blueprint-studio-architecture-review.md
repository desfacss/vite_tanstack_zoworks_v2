**Session**: 2026-04-04 ~15:49 IST  
**Topic**: Blueprint Studio — Principal Architect Review & Correctness Fix Plan  
**Source**: `ProcessBlueprintConfig.tsx` audit against `doc/04-04-2026/blueprints_data.csv`

---

# Blueprint Studio — Principal Architect Review & Fix Plan

## Problem Summary

After comparing `ProcessBlueprintConfig.tsx` against the canonical `blueprints_data.csv`
(which is the ground truth for the JSON schema), multiple structural correctness issues were found
that would cause the Studio to write malformed JSON into `definition`, breaking the automation
engine, SLA enforcement, and workflow compilation.

---

## Critical Findings

### 1. Stage Category Values Are Wrong

The `CATEGORIES` constant and `CardRadioGroup` in the Stage Drawer use wrong values:

| UI Label | Current Code | Correct (from CSV) |
|---|---|---|
| New | `NEW` | `NEW` ✓ |
| Open | `OPEN` | Not in any production blueprint — **remove** |
| In Progress | `IN_PROGRESS` | `IN_PROGRESS` ✓ |
| Complete | `COMPLETE` | Not in any production blueprint — **remove** |
| Closed Won | `WON` | **`CLOSED_WON`** ← WRONG |
| Closed Lost | `LOST` | **`CLOSED_LOST`** ← WRONG |
| Cancelled | `CANCELLED` | `CANCELLED` ✓ |

Using `WON` / `LOST` instead of `CLOSED_WON` / `CLOSED_LOST` will break all automation
conditions the engine evaluates against `category`.

---

### 2. `saveStageDetails` — Drops Critical Stage Fields

The current implementation does a shallow merge of raw form values. Missing fields that MUST
be preserved or set correctly:

- `cost_estimates` — `{ fixed_cost, cost_center, labor_cost_per_hour, aspirational_total_cost }`
- `time_estimates` — `{ optimistic_hours, most_likely_hours, pessimistic_hours, aspirational_hours, pert_expected_hours }`
- `raci` — `{ responsible (string), accountable (string), consulted (array), informed (array) }`
- `description` — No form field exists in the current Stage Drawer
- `cancellation_rules` — For CANCELLED/CLOSED_LOST terminal stages
- `approval_rules` — For approval-type blueprint Submitted stages (phased approval windows)

---

### 3. `saveTransitionDetails` — Multiple Schema Errors

| Issue | Current | Correct |
|---|---|---|
| `from` field type | Array (mode="multiple") | Single string |
| `trigger` value | `"auto"`, `"event"`, `"time"` | `"manual"` or `"automatic"` only |
| `is_manual` field | Written | Must NOT exist in schema |
| `actions` location | Written directly on transition object | Must be in `automations.on_transition[T_ID].actions` |
| `condition` serialization | Raw textarea string | Structured `{ type, expression }` object |
| `trigger_type` field | Written | Must NOT exist (use `trigger` only) |

---

### 4. `fetchBlueprint` — Automations Deserialization Is Broken

The `flattenAutomations` helper fundamentally misreads the automation structure.
It treats the second-level key (stage_id or transition_id) as the action config directly,
which is wrong. This corrupts automations on every load → save cycle.

**Correct structure that must be preserved verbatim:**
```json
{
  "automations": {
    "on_stage_entry": {
      "Approved": { "actions": [ { "name": "...", "action_type": "send_email", "config": {...}, "priority": 10 } ] }
    },
    "on_stage_exit": {
      "Draft": { "actions": [ { "action_type": "rpc", "abort_on_failure": true, "config": {...} } ] }
    },
    "on_transition": {
      "T_CANCEL_APPROVED": { "actions": [ { "action_type": "rpc", "priority": 1, "config": {...} } ] }
    }
  }
}
```

The fix: **remove `flattenAutomations` and `nestAutomations` entirely**. Pass the raw nested
object to `AutomationManager` and let it manage the structure internally.

---

### 5. `resetForm` — Default `automations` Is Wrong Type

```diff
- automations: []    // Array — wrong type, breaks compiler
+ automations: { on_stage_entry: {}, on_stage_exit: {}, on_transition: {} }
```

---

### 6. Transition Drawer — Missing Critical UI Sections

The following fields have no UI at all:
- `condition.type` — dropdown: `always` / `field_check` / `expression`
- `condition.expression` — textarea (hidden when type=always)
- `guard_rules.allowed_roles` — tag-input Select
- `guard_rules.required_fields` — tag-input Select
- `guard_rules.validation_rpc` — Input field
- `guard_rules.validation_expression` (used in Contract Lifecycle) — Input field

---

### 7. Stage Drawer — Missing Sections

- Description: No form field
- `cost_estimates`: No UI (fixed_cost, cost_center)
- `cancellation_rules`: No UI for CANCELLED/CLOSED_LOST stages
- `approval_rules`: No UI for approval-type blueprint Submitted stages

---

## Proposed Fix Plan

### Phase 1 — Zero-Compromise Correctness Fixes

| ID | Fix | Risk |
|---|---|---|
| 1a | Fix category values (WON→CLOSED_WON, LOST→CLOSED_LOST, remove OPEN/COMPLETE) | Low |
| 1b | Add description field to Stage Drawer | Low |
| 1c | Fix `saveStageDetails` to properly nest all fields | Low |
| 1d | Fix `from` Select to single-select mode | Low |
| 1e | Fix trigger values (`automatic` not `auto`) | Low |
| 1f | Remove `is_manual` and `trigger_type` from written output | Low |
| 1g | Fix `condition` to serialize as structured `{ type, expression }` object | Medium |
| 1h | Add complete `guard_rules` UI (allowed_roles, required_fields, validation_rpc) | Medium |
| 1i | Move `action_list` to `automations.on_transition[id].actions` on save | Medium |
| 1j | Remove `flattenAutomations`/`nestAutomations` — pass automations raw | High |
| 1k | Fix `handleSave` to not call `nestAutomations` | Low |
| 1l | Fix `resetForm` default automations type | Low |

### Phase 2 — Enhanced UI

- Stage: cost_estimates section (fixed_cost, cost_center fields)
- Stage: cancellation_rules section for terminal stages
- Stage: approval_rules section for approval-type blueprints 
- Dedicated SLA Rules tab/manager

---

## Verification Plan

1. Save a blueprint and compare stored JSON to `blueprints_data.csv` format
2. Run `comp_core_compile` RPC — must return success
3. Verify stage categories render correctly in the operational UI action buttons

---

## Modified Files (when executed)

- `src/modules/settings/pages/Config/ProcessBlueprintConfig.tsx` — all Phase 1 fixes
- `src/modules/settings/pages/Config/components/ProcessBlueprint/AutomationManager.tsx` — may need update to accept raw automations object

## Reference Files

- `doc/04-04-2026/blueprints_data.csv` — ground truth schema
- `ProcessBlueprintConfig.tsx` — file under review
