# Project Templates, Sprints & Vertical Feature Activation

> Date: 2026-06-12
> Scope: Principal architect ruling on project WBS templates, sprints, phases, and how
>        optional features are activated per vertical and per tenant.
> Companion: migration `20260612000100`, `20260611000100`, `20260611000500`
> Status: Authoritative — supersedes any prior notes on project template storage.

---

## 1. What 000500 actually covers (clarification)

The migration name ("status_cleanup") understates what it does. Full scope:

| Item | In 000500? |
|---|---|
| DROP `workflow_status_sets` + `workflow_statuses` + `tasks.status_id` | ✅ |
| DROP `task_assignments_role_check` (removes 'approver', opens to any string) | ✅ |
| ADD `calendar_id` FK on `unified.contacts` + `unified.assets` (NOT VALID) | ✅ |
| CREATE `unified.v_tasks` view with `participant_ids`, `assignee_name`, stage cols | ✅ |
| CREATE RACI sync trigger (`responsible` role → `tasks.raci.responsible`) | ✅ |
| Register `unified.v_tasks` as `base_view` in `core.entities` | ✅ |

Items from the PA ruling that needed **NO additional migration** (already handled):

| Item | Why |
|---|---|
| `workflow_status_sets`/`workflow_statuses` → DROP | In 000500 ✅ |
| Workforce bridge `timesheet_items.task_id` FK + rollup trigger | In 000100 ✅ |
| `project_phases` table | In 000100 (line 361) ✅ |
| `phase_id` + `sprint_id` columns on tasks | In 000100 ✅ |

Items that only need **documentation** (not a migration):

| Contradiction | Resolution |
|---|---|
| `assignee_id` vs `task_assignments` — looks like duplication | Deliberate two-level design. See §2. |
| Polymorphic refs without FK | Platform convention. See §3. |
| `assignee_kind = 'team'` references non-existent teams table | Forward declaration — teams module pending |
| `phase_id`/`sprint_id` columns with no FK yet | Fixed in 000600 (NOT VALID FKs added) |
| `pinned_resource_id` without typed FK | Polymorphic — same convention as §3 |

---

## 2. Locked design decision: assignee_id vs task_assignments

**Not a contradiction. Deliberate two-level design.**

```
tasks.assignee_id  (GENERATED from raci->>'responsible')
    = governance pointer
    = UI display name, "My Tasks" index, notification routing
    = always exactly one person (or NULL)
    = NEVER manually set — recomputes when raci.responsible changes

task_assignments
    = scheduler's resource ledger
    = used when: (a) multiple people physically execute, OR (b) capacity tracking needed
    = for 90% of tasks: EMPTY — assignee_id drives everything
    = for crew/field tasks: both populated — assignee_id = lead, task_assignments = whole crew
```

**The rule:** When in doubt, write to `raci.responsible`. The scheduler and the RACI sync trigger keep `task_assignments` and `assignee_id` consistent. No manual sync needed.

---

## 3. Locked decision: polymorphic references without FK

`resource_id + resource_kind` columns on `task_assignments`, `resource_allocations`, `resource_unavailability`, `cal.*` tables, and `tasks.pinned_resource_id` intentionally omit FK constraints. Postgres cannot enforce a FK to a UNION of two tables (`unified.contacts UNION unified.assets`).

Integrity is enforced at:
- Application layer: `resource_kind IN ('contact','asset')` CHECK constraint
- Function layer: `cal.resolve_resource()` validates the UUID exists in the right table before any booking
- RLS layer: queries resolve through views that JOIN to the appropriate base table

This is the documented platform convention — not a gap.

---

## 4. Project template storage: two-table composition

Two separate tables serve two different purposes. They compose but do NOT overlap.

### `process_templates.vertical_schemas`
**Purpose:** What FIELDS appear on a form for a given vertical.
**Answers:** "For a construction project, which extra columns appear in the UI? (bond_capacity, union_affiliated, project_types…)"
**Stored as:** JSON Schema (ui_schema + validation_schema) per `(vertical_id, entity_schema, entity_type)`
**Who manages:** SaaS admin for global verticals; tenant for their own overrides
**Used by:** Forms engine — `core.forms` reads this to extend the base form

### `unified.project_templates` (new in 000600)
**Purpose:** Reusable WBS structure — phases and task stubs to generate when a project is created.
**Answers:** "For an HVAC installation project, what phases and tasks should be pre-created?"
**Stored as:** `details.phases[]` + `details.task_generators[]` consumed by `unified.generate_project_tasks()`
**Scope:** Global (org_id IS NULL) or tenant-custom (org_id SET). Vertical-scoped via `vertical` + `product_service_type` columns.
**Who manages:** SaaS admin for global templates; tenant PM for their own

### Composition at project create time

```
User creates project: vertical="construction", product_service_type="hvac_install"
                            │
                            ├── Lookup process_templates.vertical_schemas
                            │   WHERE vertical_id='construction' AND entity_schema='unified'
                            │   AND entity_type='projects'
                            │   → Load extra fields into form (bond_capacity, union_affiliated...)
                            │
                            └── Lookup unified.project_templates
                                WHERE vertical='construction'
                                AND product_service_type='hvac_install'
                                AND (organization_id IS NULL OR organization_id = current_org)
                                → Offer template selection dropdown
                                → If selected: call unified.generate_project_tasks(template_id)
                                  which creates project_phases + task stubs in one call
```

### Template selection logic (UI and engine)

```sql
-- What templates are available for a given project context?
SELECT *
FROM unified.project_templates
WHERE is_active = true
  AND (organization_id IS NULL OR organization_id = get_current_org_id())
  AND (vertical IS NULL OR vertical = $vertical)
  AND (product_service_type IS NULL OR product_service_type = $product_service_type)
ORDER BY
    organization_id NULLS LAST,   -- tenant templates surface above global
    is_system ASC,                 -- custom before system
    name ASC;
```

The engine uses `unified.generate_project_tasks(p_project_id, p_config)` which:
1. Reads `details.phases[]` → creates `unified.project_phases` rows in order
2. Reads `details.task_generators[]` → creates `unified.tasks` rows with `phase_id` set
3. Resolves `dependencies` slugs → creates `unified.task_dependencies` rows
4. Returns count of phases + tasks created

---

## 5. project_phases vs sprints — vertical decision matrix

| Vertical | WBS grouping | Iteration tracking | Sprint table | Phases table |
|---|---|---|---|---|
| **Construction** | `project_phases` (Civil → Structural → MEP → Finishing) | None — phases are the progression | ❌ disabled | ✅ always |
| **Manufacturing** | `project_phases` (Design → Prototype → Production → QA) | None | ❌ disabled | ✅ always |
| **Field Service (HVAC, Plumbing)** | `project_phases` (Survey → Install → Commission → Handover) | None | ❌ disabled | ✅ always |
| **Professional Services / Consulting** | `project_phases` (Discovery → Delivery → Review) | Optional (opt-in) | 🟡 optional | ✅ always |
| **IT / Software Development** | Optional (epics/milestones) | `sprints` (2-week Agile cycles) | ✅ required | 🟡 optional |
| **Healthcare / Clinical** | `project_phases` (Planning → Execution → Closure) | None | ❌ disabled | ✅ always |

**Rule:** `project_phases` is the universal WBS layer — always available, never disabled. Sprints are IT-only and require explicit tenant opt-in. A project can have phases AND sprints (IT teams sometimes phase by quarter and sprint within each phase).

---

## 6. On-demand feature activation: how sprints are enabled per tenant

Sprints are structurally present in the DB (table exists, column exists on tasks) but the UI only surfaces them when the module is enabled for a tenant. This is the same mechanism used for `wa`, `ctrm`, `calendar`, and other optional modules.

### Step 1 — Global module row (done in migration 000600)

```sql
INSERT INTO identity.modules (name, slug, description, is_active)
VALUES ('Sprints (Agile)', 'sprints', 'IT/Agile sprint management', true)
ON CONFLICT (slug) DO NOTHING;
```

### Step 2 — Tenant opt-in (ops action, not a migration)

```sql
-- Enable sprints for a specific tenant
INSERT INTO identity.org_module_configs (organization_id, module_slug, is_enabled, config)
VALUES (
    '<tenant_org_id>',
    'sprints',
    true,
    '{"default_sprint_length_days": 14, "story_points_enabled": true}'::jsonb
)
ON CONFLICT (organization_id, module_slug)
DO UPDATE SET is_enabled = true, config = EXCLUDED.config;
```

### Step 3 — UI check pattern (React)

```ts
// In project settings or task board context
const { data: moduleConfig } = await supabase
  .from('identity_org_module_configs')    // exposed via view or RPC
  .select('is_enabled, config')
  .eq('module_slug', 'sprints')
  .single()

const sprintsEnabled = moduleConfig?.is_enabled ?? false

// Conditionally render Sprint panel
{sprintsEnabled && <SprintBoard projectId={project.id} />}
```

### Step 4 — Template feature_flags (optional shortcut per project type)

`unified.project_templates.feature_flags` can pre-declare which features a project of this type uses:

```json
{
  "sprints": false,
  "phases": true,
  "resource_scheduling": true,
  "story_points": false,
  "billable": true
}
```

The project creation form reads the selected template's `feature_flags` to pre-configure the project's optional sections. The tenant's `org_module_configs` still gates whether the module is available at all — `feature_flags` only controls the default within projects of that type.

Priority: `org_module_configs.is_enabled = false` → feature hidden regardless of `feature_flags`.

---

## 7. Where project_phases fits in the WBS hierarchy

```
unified.projects                    ← Portfolio / Program / Project / Subproject
    │
    ├── unified.project_phases      ← WBS grouping layer (always available)
    │       (Civil Works, MEP, Finishing...)
    │       └── unified.tasks WHERE phase_id = phase.id
    │
    ├── unified.sprints             ← IT-only iteration layer (opt-in)
    │       (Sprint 1, Sprint 2...)
    │       └── unified.tasks WHERE sprint_id = sprint.id
    │
    └── unified.tasks               ← Leaf work items (no phase or sprint = backlog / unscheduled)
            ├── unified.task_dependencies   (FS/SS/FF/SF links)
            ├── unified.task_assignments    (crew members)
            └── unified.resource_allocations (capacity booking)
```

A task CAN have both `phase_id` and `sprint_id` set simultaneously. This supports IT teams that organize work into quarterly phases (Phase 1: Core Platform) and run Agile sprints within each phase.

---

## 8. Seed data: global project templates

Global templates should be seeded in `supabase/seeds/` (Group-2 System Config, Additive pattern) — NOT in migrations. They are config rows, not schema. Add to a new `supabase/seeds/12_project_templates.sql` file.

Template stubs to seed (global):

| slug | vertical | product_service_type | phases | task count |
|---|---|---|---|---|
| `construction-hvac-install` | construction | hvac_install | Survey, Install, Commission, Handover | ~12 tasks |
| `construction-fit-out` | construction | fit_out | Design, Civil, MEP, Fit-Out, Handover | ~20 tasks |
| `it-software-feature` | it | software_feature | Discovery, Build, Test, Deploy | ~8 tasks |
| `services-consulting-engagement` | services | consulting | Kickoff, Delivery, Review, Closure | ~6 tasks |
| `generic-project` | NULL (any) | NULL (any) | Planning, Execution, Closure | ~3 tasks |

These are P1 seed items — the engine (`generate_project_tasks()`) already exists; the templates just need data.

---

## 9. process_templates.vertical_schemas — what it is NOT

This table is frequently mistaken as the home for project plan templates. It is NOT.

`process_templates.vertical_schemas` exclusively stores **field layout metadata** — which extra columns appear in the form for a given entity type in a given vertical. It does not store:
- Task lists
- WBS structures
- Phase sequences
- Role requirements
- Duration estimates

It is the answer to: "What form fields appear when a construction company creates an account?" not "What tasks get created when a construction project starts?"

---

## 10. Migration sequence (final state)

| File | Adds |
|---|---|
| `202606010022_unified_tables.sql` | Base unified tables |
| `20260611000100_projects_scheduling_capacity.sql` | resource_calendars, task_assignments, resource_allocations, project_phases, scheduler_requests, timesheet_items.task_id FK + rollup trigger |
| `20260611000500_unified_status_cleanup.sql` | DROP workflow tables, DROP role CHECK, calendar FKs, v_tasks view, RACI trigger |
| `20260612000100_unified_project_templates_sprints.sql` | unified.project_templates, unified.sprints, FK constraints for phase_id/sprint_id/template_id |
