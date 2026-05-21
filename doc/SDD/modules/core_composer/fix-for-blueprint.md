Let me read the key files before doing the deep analysis.

Here is the full CPO + Principal Architect analysis.

---

# Entity Blueprints — Business Rules, Bootstrap Lifecycle & React UI Spec

---

## Part 1 — Validated Business Rules (Brain-Verified)

### 1.1 Classification Taxonomy (FROZEN — do not extend)

From `chk_classification_taxonomy` constraint + brain docs:

| Value | Meaning | Registration Required? |
|---|---|---|
| `master` | Unified-registered entity (org, contact, project) | YES — must be `anchor`, `graduated`, or `contact_anchor` |
| `transactional` | Operational records (timesheets, tickets) | OPTIONAL |
| `configuration` | System config tables | NO — must be `none` |
| `analytical` | Analytics/reporting views | NO — must be `none` |

**Constraint enforced**: `chk_master_must_register` + `chk_nonlifecycle_no_register`

**Brain gap found (GAP-004)**: The bootstrap function internally checks for `'lifecycle'` as a classification — this is **invalid**. The trigger template version `1` is the only safe version to use today.

---

### 1.2 Registration Mode Rules (cross-validated with CSV data)

| `registration_mode` | Valid `classification` | Requires `unified.*` dependency | Real examples |
|---|---|---|---|
| `anchor` | `master` | YES — `core.unified_objects` | `tickets`, `projects`, `vendors`, `contacts` |
| `contact_anchor` | `master` | YES — `unified.contacts` | `vendor_contacts`, `wa_contacts` |
| `graduated` | `master` or `transactional` | YES — `unified.*` | (not in current CSV, future use) |
| `none` | Any except `master` | NO | `timesheets`, `teams`, `checklists`, `leave_applications` |

**Critical Rule**: If `registration_mode = anchor`, the dependency array MUST include `"core.unified_objects"`. The bootstrap engine derives Tier 0 routing from this. Missing it = silent data loss (no unified_objects row created).

---

### 1.3 Form Type × Registration Mode Compatibility Matrix

| `form_type` | Valid `registration_mode` | Real examples |
|---|---|---|
| `simple` | `none`, `anchor`, `contact_anchor` | `teams`, `vendors`, `contacts` |
| `dependent` | `anchor` only | `tickets`, `tasks` (resolve via unified parent) |
| `composite` | `anchor` | `projects` |
| `nested` | `none` | `timesheets`, `expense_sheets` (JSONB children) |
| `junction` | `none` | `project_allocations`, `user_teams` |
| `allocator` | `none` | (not observed in CSV — rare) |

**Rule**: `nested` form_type requires `ai_resolution = nested_create`. `dependent` requires `ai_resolution = resolve_parent`. This pairing is currently **only assumed**, not constraint-enforced.

---

### 1.4 AI Resolution × Form Type Pairing (must be locked)

| `form_type` | Required `ai_resolution` |
|---|---|
| `simple` | `direct` |
| `dependent` | `resolve_parent` |
| `composite` | `resolve_parent` or `chain_resolve` |
| `nested` | `nested_create` |
| `junction` | `direct` |
| `allocator` | `allocator_flow` |

This is currently NOT enforced by any constraint. A `nested` entity with `ai_resolution = direct` will silently create broken AI flows.

---

### 1.5 Display Format Rules (from CSV: tickets, tasks, projects, assets)

A `display_format` is only valid if:
1. `classification = master` OR the entity has a physical `display_id` column
2. `counter_config.reset_period` is `NEVER` or `CALENDAR_YEAR`
3. Each `token_config` entry has valid `type`: `counter`, `date_part`, `lookup`

Entities where `display_format = NULL` → no auto-numbering. The bootstrap will not create `display_id_states` rows.

**Post-bootstrap deferral**: You CAN add `display_format` later and re-bootstrap. The `display_id_states` table will be seeded. Existing rows will NOT get backfilled — they keep NULL `display_id`. This is acceptable per observed data.

---

### 1.6 Partition Filter Rules

`partition_filter` (legacy string) is being superseded by `partition_filter_structured` (JSONB). From brain docs:

- If both are present, `partition_filter_structured` takes precedence in view generation
- The structured format supports `AND`/`OR` logic with typed predicates
- **Brain warning**: "All logical partition filters saved to core.entities must be prefix-free. Failure causes Upsert crashes."

Valid `op` values: `eq`, `neq`, `in`, `like`

---

### 1.7 RLS Config Template Rules

| Template | Used For | Columns Referenced |
|---|---|---|
| `standard` | Default org isolation | `organization_id` |
| `tenant_isolation` | Strict per-org | `organization_id` |
| `multi_org` | Cross-org (admin) | `organization_id` |
| `configuration` | Read-only config | none |
| `analytical` | Analytics views | none |
| `workforce` | HR entities | `owner_col`, `approver_col`, `status_col`, `location_col` |

**workforce template**: requires `owner_col` to be non-null in `rls_config`. Observed: `timesheets` has `user_id`, `leave_applications` has `user_id`.

---

## Part 2 — Bootstrap Lifecycle & What Can Be Deferred

### Phase Map

```
INSERT blueprint row
        │
        ▼
 [PHASE 0] Blueprint Registration ──────────────── REQUIRED fields locked here
        │                                           (base_source, classification,
        │                                            registration_mode, dependencies)
        ▼
 [PHASE 1] Physical Layer Provisioning
        │   comp_util_provision_physical_layer(...)
        │   - Creates base table
        │   - Adds V5 standard columns (is_active, intent_type, state_category, is_on_hold)
        │   - Creates org index + RLS
        │   - Creates FK to unified_objects (if anchor)
        ▼
 [PHASE 2] Metadata Scan
        │   comp_met_scan_schema_columns(...)
        │   - Reads pg_attribute
        │   - Builds column context (tier, source_table, type)
        ▼
 [PHASE 3] View + Trigger Generation
        │   comp_util_generate_view_sql(...)
        │   comp_util_generate_trigger_sql(...)
        │   - Applies partition_filter as WHERE
        │   - Routes writes to Tier 0/1/2
        ▼
 [PHASE 4] Metadata Registry
            - Writes core.entities row
            - Seeds display_id_states (if display_format defined)
            - Backfills organization_id
```

### What MUST Be Set Before First Bootstrap

| Field | Why It Cannot Be Deferred |
|---|---|
| `base_source` | Phase 1 needs the physical table name |
| `classification` | Drives registration_mode constraint check |
| `registration_mode` | Drives unified_objects FK creation in Phase 1 |
| `dependencies` | Phase 3 builds JOIN clause from this |
| `form_type` | Drives trigger routing strategy |
| `entity_schema` + `entity_type` | Primary key of the blueprint |
| `rls_config.template` | Phase 1 applies RLS policies |

### What CAN Be Deferred (added after bootstrap, then re-bootstrap)

| Field | Safe to defer? | How to apply |
|---|---|---|
| `display_format` | ✅ Yes | Add to blueprint → re-bootstrap with `force_refresh=true` |
| `partition_filter` / `partition_filter_structured` | ✅ Yes | Add → re-bootstrap (view WHERE clause updates) |
| `semantics` | ✅ Yes | Update anytime — no DDL impact |
| `ai_metadata` | ✅ Yes | Embedding re-index only |
| `ui_general`, `ui_tableview`, `ui_gridview`, etc. | ✅ Yes | Pure UI config — no DDL |
| `sub_panels` | ✅ Yes | UI config, no DDL |
| `rules` | ✅ Yes | AI/workflow rules, no DDL |
| `custom_view_sql` | ⚠️ Deferred OK | Only use when Composer-generated view is insufficient; re-bootstrap required |
| `unified_anchor` table in `dependencies` | ❌ No | Must be in blueprint before Phase 1 or unified routing breaks |
| Extension sources in `dependencies` | ❌ No | Phase 3 JOIN is built from this — cannot be added safely post-bootstrap without full re-bootstrap and data risk |

**Recommended UI message** when saving a new blueprint: "You can add view configuration, display ID format, partition filters, and UI panels after the first successful bootstrap."

---

## Part 3 — React UI Specification (No-Drift Architecture)

### 3.1 Core Design Principle

The form must be **rule-enforced at the component level**, not just at DB constraint level. Every constraint in `entity_blueprints` must map to a UI rule. Every cross-field dependency must trigger live validation.

### 3.2 Two-Phase Form (Bootstrap Boundary)

Split the entity creation UI into two clearly labeled phases:

#### Phase A — Core Bootstrap Fields (required before first bootstrap)

```
┌─────────────────────────────────────────────────────────┐
│  IDENTITY                                               │
│  Entity Type*      [text input — snake_case enforced]   │
│  Entity Schema*    [dropdown — existing schemas]        │
│  Base Source*      [text — schema.table format]         │
│                                                         │
│  CLASSIFICATION                                         │
│  Classification*   [dropdown: master|transactional|     │
│                      configuration|analytical]          │
│  Registration Mode*[dropdown — filtered by classif.]   │
│  Form Type*        [dropdown — filtered by reg. mode]  │
│  AI Resolution*    [dropdown — auto-set from form_type]│
│                                                         │
│  DEPENDENCIES                                           │
│  Dependencies      [multi-tag input — schema.table]     │
│  [⚠ If anchor selected: core.unified_objects required] │
│                                                         │
│  SECURITY                                               │
│  RLS Template*     [dropdown — filtered by classif.]   │
│  [If workforce: owner_col, approver_col inputs shown]  │
└─────────────────────────────────────────────────────────┘
```

#### Phase B — Post-Bootstrap Configuration (collapsible, locked until bootstrap_generation > 0)

```
┌─────────────────────────────────────────────────────────┐
│  [LOCKED until first bootstrap] UI & Display Config     │
│                                                         │
│  Display Format    [format builder — optional]          │
│  Partition Filter  [structured predicate builder]       │
│  Available Views   [multi-select checkboxes]            │
│  Default View      [dropdown — from available_views]    │
│  Global Actions    [action builder — form + label]      │
│  Sub-panels        [panel builder — source + fk + icon] │
│  Semantics         [JSON editor with domain dropdown]   │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Dropdown Value Sets (Frozen — sourced from DB constraints)

```typescript
export const BLUEPRINT_ENUMS = {
  classification: ['master', 'transactional', 'configuration', 'analytical'],
  
  registration_mode: ['anchor', 'contact_anchor', 'graduated', 'none'],
  
  form_type: ['simple', 'dependent', 'composite', 'allocator', 'nested', 'junction'],
  
  ai_resolution: ['direct', 'resolve_parent', 'chain_resolve', 'allocator_flow', 'nested_create'],
  
  rls_template: ['standard', 'tenant_isolation', 'multi_org', 'configuration', 'analytical', 'workforce'],
  
  available_views: ['tableview', 'gridview', 'detailview', 'kanbanview', 'calendarview', 'mapview', 'metricsview', 'ganttview'],
  
  semantics_domain: ['analytics', 'ai', 'service', 'operations', 'identity', 'hr', 'crm', 'procurement', 'finance'],
  
  context_status: ['draft', 'alpha', 'applied'],
  
  partition_op: ['eq', 'neq', 'in', 'like'],
  partition_logic: ['AND', 'OR'],
  
  display_token_type: ['counter', 'date_part', 'lookup'],
  counter_reset_period: ['NEVER', 'CALENDAR_YEAR'],
  
  sub_panel_icon: ['paperclip', 'sticky-note', 'activity', 'tag'],
}
```

### 3.4 Cross-Field Validation Rules (enforced in React — no server round-trip)

```typescript
const CROSS_FIELD_RULES = [
  // R1: master classification requires registration
  {
    when: { classification: 'master' },
    require: { registration_mode: ['anchor', 'contact_anchor', 'graduated'] },
    error: 'Master entities must have a registration mode'
  },
  
  // R2: non-master/transactional cannot register
  {
    when: { classification: ['configuration', 'analytical'] },
    force: { registration_mode: 'none' },
    lock: ['registration_mode']
  },
  
  // R3: anchor requires core.unified_objects dependency
  {
    when: { registration_mode: 'anchor' },
    requireInArray: { dependencies: 'core.unified_objects' },
    error: 'Anchor entities must declare core.unified_objects as a dependency'
  },
  
  // R4: contact_anchor requires unified.contacts
  {
    when: { registration_mode: 'contact_anchor' },
    requireInArray: { dependencies: 'unified.contacts' },
    error: 'Contact anchor entities must declare unified.contacts as a dependency'
  },
  
  // R5: form_type drives ai_resolution (auto-set)
  {
    when: { form_type: 'nested' },
    force: { ai_resolution: 'nested_create' }
  },
  {
    when: { form_type: 'dependent' },
    force: { ai_resolution: 'resolve_parent' }
  },
  {
    when: { form_type: ['simple', 'junction'] },
    force: { ai_resolution: 'direct' }
  },
  {
    when: { form_type: 'allocator' },
    force: { ai_resolution: 'allocator_flow' }
  },
  
  // R6: workforce RLS requires owner_col
  {
    when: { 'rls_config.template': 'workforce' },
    require: { 'rls_config.owner_col': 'non-empty' },
    error: 'Workforce RLS requires owner_col to be set'
  },
  
  // R7: default_view must be in available_views
  {
    when: { 'ui_general.default_view': '*' },
    requireContains: { 'ui_general.available_views': 'ui_general.default_view' },
    error: 'Default view must be in available views list'
  },
  
  // R8: base_source must follow schema.table format
  {
    field: 'base_source',
    pattern: /^[a-z_]+\.[a-z_]+$/,
    error: 'Base source must follow schema.table format'
  },
  
  // R9: junction form_type requires none registration_mode
  {
    when: { form_type: 'junction' },
    force: { registration_mode: 'none' }
  },
  
  // R10: display_format only allowed for master classification
  {
    when: { 'display_format': 'non-empty' },
    require: { classification: 'master' },
    warn: 'Display ID format is typically only used for master entities'
  }
]
```

### 3.5 Registration Mode Filtering by Classification

```typescript
function getValidRegistrationModes(classification: string): string[] {
  switch (classification) {
    case 'master':
      return ['anchor', 'contact_anchor', 'graduated']
    case 'transactional':
      return ['none', 'graduated']  // graduated rare but valid
    case 'configuration':
    case 'analytical':
      return ['none']  // locked
    default:
      return ['none']
  }
}
```

### 3.6 Form Type Filtering by Registration Mode

```typescript
function getValidFormTypes(registrationMode: string): string[] {
  switch (registrationMode) {
    case 'anchor':
      return ['simple', 'dependent', 'composite']
    case 'contact_anchor':
      return ['simple']
    case 'graduated':
      return ['simple', 'composite']
    case 'none':
      return ['simple', 'nested', 'junction', 'allocator', 'dependent']
    default:
      return ['simple']
  }
}
```

### 3.7 Field Visibility by Phase

```typescript
const PHASE_A_FIELDS = [
  'entity_type', 'entity_schema', 'base_source',
  'classification', 'registration_mode', 'form_type', 'ai_resolution',
  'dependencies', 'rls_config', 'is_active'
]

const PHASE_B_FIELDS = [
  // Unlocked after bootstrap_generation >= 1
  'display_format', 'partition_filter_structured',
  'ui_general', 'ui_tableview', 'ui_gridview', 'ui_kanbanview',
  'ui_ganttview', 'ui_calendarview', 'ui_mapview', 'ui_detailview',
  'sub_panels', 'semantics', 'rules', 'ai_metadata',
  'metadata_intent', 'physical_intent', 'custom_view_sql'
]

// These fields are auto-managed — NEVER shown in UI
const SYSTEM_MANAGED_FIELDS = [
  'id', 'created_at', 'updated_at', 'blueprint_hash',
  'last_bootstrap_at', 'last_bootstrap_hash', 'bootstrap_error',
  'bootstrap_generation', 'trigger_template_version', 'version'
]
```

### 3.8 Partition Filter Structured Builder Component

```tsx
// Structured predicate builder — no free-text SQL injection risk
interface PartitionPredicate {
  column: string      // text input — must match physical table column
  op: 'eq' | 'neq' | 'in' | 'like'
  value: string | string[]  // string[] only when op = 'in'
}

interface PartitionFilter {
  logic: 'AND' | 'OR'
  predicates: PartitionPredicate[]
}
```

Render as a predicate builder (Notion filter style): `[column] [op dropdown] [value]` rows, with `+ Add Condition` and `Logic: AND|OR` toggle.

### 3.9 Display Format Builder

Only show when `classification = master`. Render as:

```
Format String:  [TSK-{COUNTER}              ]
                ↑ live preview: TSK-000001

Token Config:
  + Add Token
  [ {COUNTER} ] type: counter | date_part | lookup
  
Counter Config:
  Reset Period: [NEVER ▼]
  Padding:      [6     ]
```

### 3.10 Bootstrap Status Widget

Show at the top of the edit form:

```
┌──────────────────────────────────────────┐
│ Bootstrap Status                         │
│ ○ Not bootstrapped                       │  bootstrap_generation = 0
│ ✓ Bootstrapped (2026-04-16 15:19)        │  bootstrap_generation = 1
│ ⚠ Bootstrap error: [message]            │  bootstrap_error != null
│                                          │
│ [Run Bootstrap] [Force Re-bootstrap]     │
└──────────────────────────────────────────┘
```

Phase B fields render with a lock icon and tooltip: _"Available after first successful bootstrap"_ when `bootstrap_generation = 0`.

---

## Part 4 — Gap Summary & Recommended Fixes

### Gaps to Fix in DB/Engine (already confirmed in brain docs)

| Gap | Risk | Fix Location |
|---|---|---|
| **GAP-001**: No pre-flight check for base table existence | Bootstrap fails with cryptic error | `comp_util_ops_bootstrap_entity` — add existence check before Phase 1 |
| **GAP-002**: Metadata race (scan before Phase 1 columns added) | Stale view metadata stored | Already addressed in migration `202606010081` — verify |
| **GAP-003**: Trigger column filter fragile (B2 bug) | ERROR 42703 on INSERT | Fixed in `202606010081` — confirm timesheets now working |
| **GAP-004**: Invalid `'lifecycle'` classification check in bootstrap | Wrong entities registered to unified_objects | Fix line 3762 in core_functions_tier1.sql |
| **GAP-005**: No validation of `partition_filter` column existence | Silent filter failure | Add preflight column check |

### Gaps to Fix in UI (no current enforcement)

| Gap | Fix |
|---|---|
| `ai_resolution` freely editable, breaks AI flows | Auto-derive from `form_type`, lock field |
| `registration_mode` editable independent of `classification` | Filter dropdown options by classification |
| `dependencies` is a free-text array | Validate format (`schema.table`), check required values for anchor/contact_anchor |
| `default_view` not validated against `available_views` | Cross-field validation at form level |
| Phase B fields editable even before bootstrap | Disable/lock with bootstrap status check |
| No warning when editing locked blueprint (`dependencies_locked = true`) | Show banner: "Dependencies are locked — changes require admin override" |

---

## Summary for CPO

**The data model is sound.** The constraint system covers the critical paths. The drift risk is concentrated in three areas:

1. **Cross-field rules not enforced in UI** — classification × registration_mode × form_type × ai_resolution form a tetrad that must be co-validated. Today any combination can be saved; the engine will fail silently or at bootstrap time.

2. **Phase B fields editable at creation** — display_format, partition_filter, and UI config should be locked behind a successful bootstrap. This prevents engineers from configuring views for entities whose physical tables don't exist yet.

3. **Bootstrap feedback loop is absent from UI** — the `bootstrap_generation`, `last_bootstrap_at`, and `bootstrap_error` columns exist in the table but nothing surfaces them to the person editing the blueprint. A simple status widget closes this gap entirely.

The React implementation above addresses all three. Prioritize in order: **dropdown filtering → cross-field rules → phase lock → bootstrap status widget**.
































Let me explore the codebase first.

Now I have everything I need. Let me do a focused analysis of the key bugs, then implement fixes.

Now fix the form component to use these constants with cross-field validation:

Now fix the form's default values to include the new fields:

Now fix the handleSave to strip invalid keys and handle ai_resolution auto-derivation:

Now replace the General Information card with the corrected field layout:

Now fix the "Main Configs" tab — remove the legacy registration mode section (now top-level) and fix `semantics.context.status` to use proper values:

Now fix the `semantics.context.status` dropdown to use the correct valid values:

Now also fix the UI Settings tab — add `metricsview` to available_views (it was missing from the default_view dropdown), and add cross-validation for default_view vs available_views:

Now add the display format section in Schema & Format tab with proper token builder and a note about post-bootstrap DisplayIdConfig:

Now remove the unused `Option` import since we've replaced all `<Option>` usages with the `options` prop:

Also fix the padding default in DisplayIdConfig to match real data (observed: 6 digits in CSV):

Now remove the unused `Option` destructure from DisplayIdConfig:

Let me verify the final state of the critical BlueprintConfig sections:

All fixes are in place and verified. Here's a precise summary of every change made:

---

## Changes Made

### 1. [BlueprintConfig.tsx](src/modules/settings/pages/Config/BlueprintConfig.tsx) — 6 fixes

**Critical bugs fixed:**

| Issue | Before | After |
|---|---|---|
| `registration_mode` field | Stored in `rules.registration.mode` (JSONB, wrong) | Top-level form field `name="registration_mode"` → correct DB column |
| `form_type` | Not in form at all | Added with full `simple/dependent/composite/nested/junction/allocator` dropdown |
| `ai_resolution` | Not in form at all | Added, auto-derived from `form_type` on change |
| `status` field | Saved to non-existent `status` column | Removed from top-level; `semantics.context.status` uses correct values `draft/alpha/applied` (removed invalid `beta/active/archived`) |
| `rls_config` | Not in form at all | Full section with `template` dropdown + conditional `workforce` fields (`owner_col`, `approver_col`, `status_col`, `location_col`) |
| `default_view` validation | No cross-validation | Validator ensures default_view is in available_views list |

**Cross-field rules enforced:**
- `classification → registration_mode` options filtered live; `configuration`/`analytical` locked to `none`
- `form_type → ai_resolution` auto-derived on change
- `anchor` registration shows alert requiring `core.unified_objects` in dependencies
- `contact_anchor` shows alert requiring `unified.contacts`
- `workforce` RLS blocks save without `owner_col`

**Bootstrap awareness:**
- Bootstrap status badge (Not Bootstrapped / Bootstrapped) in card header
- `bootstrap_error` shown as red alert when present
- Schema & Format tab shows warning if entity not bootstrapped yet, and clarifies that `display_format` is pre-bootstrap config while ID Config tab is post-bootstrap counter status

**`display_format` builder** now has proper `counter_padding` as dropdown (3/4/5/6 digits) and `reset_period` with only `NEVER` / `CALENDAR_YEAR` (no more `FINANCIAL_YEAR`).

---

### 2. [YViewConfigManager.tsx](src/modules/settings/pages/Config/YViewConfigManager.tsx:309) — 1 critical bug fix

```diff
- .eq('base_source', entityType)
+ .eq('entity_type', sanitizedEntityType)
+ .eq('entity_schema', entitySchema)
```

The sync write to `entity_blueprints` was filtering on the wrong column (`base_source` stores `schema.table`, not the entity_type). Every view save was silently failing to sync to blueprints.

---

### 3. [DisplayIdConfig.tsx](src/modules/settings/pages/Config/DisplayIdConfig.tsx) — 2 fixes

- **`FINANCIAL_YEAR` removed** — not a valid `reset_period` per DB data and business rules. Replaced with `NEVER` (default, matching CSV data where `counter_config.reset_period = "NEVER"`)
- **Default padding changed** from 4 → 6 digits (matches all observed entities: `counter_padding: 6`)

---

### Display ID: Should it appear before bootstrap?

**Answer: Yes, partially.** The `display_format` JSONB in the blueprint (pre-bootstrap config) is what instructs the bootstrap engine to seed `display_id_states`. This is now properly configured in the Schema & Format tab of the Blueprint panel — available before bootstrap for any entity where you want auto-numbering.

The ID Config tab (which reads `display_id_states` counter state) remains post-bootstrap only — it has nothing to show until bootstrap seeds that row. The Schema & Format tab now has an alert explaining this split clearly.