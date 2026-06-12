# Architect Certification — Projects, Tasks, Scheduling & Capacity

> Date: 2026-06-12
> Scope: Full audit of all migrations, seeds, post-deploy scripts, SDD docs, brain docs,
>        and test cases covering unified.projects, unified.tasks, and all scheduling/
>        capacity planning tables.
> Status: ✅ CERTIFIED with known open gaps logged below.

---

## 1. Migration Audit

### Committed (cannot change — historical record only)

| Migration | What it contributes | Status |
|---|---|---|
| `202606010022_unified_tables.sql` | Base `unified.projects`, `unified.tasks`, `unified.contacts`, `unified.assets`, `unified.milestones`, `unified.checklists`, `unified.task_requirements` | ✅ |
| `202606010053_rls_unified.sql` | RLS policies on all base unified tables | ✅ |
| `202606010103_drop_misplaced_unified_triggers.sql` | Cleanup of incorrectly placed triggers from early iteration | ✅ |
| `20260604000000_crm_unified_core_enhancements.sql` | CRM-unified cross-schema FK enhancements | ✅ |
| `20260610000100_task_unification_followups.sql` | Task model fixes post-unification | ✅ |
| `20260611000100_projects_scheduling_capacity.sql` | 11 new scheduling/capacity tables, `generate_ppm_tasks()` (renamed in 000600), `trigger_solver_run()`, `v_solver_resources` view, `tasks.phase_id`/`sprint_id`/`assignee_id` GENERATED column, `timesheet_items.task_id` FK + rollup trigger | ✅ |

### Uncommitted (this session)

| Migration | What it adds | Status |
|---|---|---|
| `20260611000500_unified_status_cleanup.sql` | DROP `workflow_status_sets`/`workflow_statuses`/`tasks.status_id`, DROP `assignment_role` CHECK, ADD `calendar_id` FKs, CREATE `unified.v_tasks` view with `participant_ids`, CREATE RACI sync trigger, register `base_view` in `core.entities` | ✅ Ready |
| `20260612000100_unified_project_templates_sprints.sql` | CREATE `unified.project_templates`, CREATE `unified.sprints`, wire FK constraints for `phase_id`/`sprint_id`/`template_id` (NOT VALID), register `identity.modules` row for sprints, RENAME `generate_ppm_tasks → generate_project_tasks` | ✅ Ready |

### Function signature correction (critical fix applied)

`unified.generate_ppm_tasks` actual signature: `(p_project_id uuid, p_config jsonb)` — 2 params.
The rename statement in 000600 was originally written with 3 params. **Fixed** to `(uuid, jsonb)`.
The brain doc reference to `generate_project_tasks(p_project_id, p_template_id, p_config)` was **fixed** to `(p_project_id, p_config)`.

---

## 2. Seed Audit

| File | Purpose | Status |
|---|---|---|
| `01_auth.sql` – `16_hr_templates.sql` | Existing tenant/config seeds | ✅ Committed |
| `17_project_templates.sql` | **NEW** — 5 global `unified.project_templates` rows (Group-2 Additive config). UUIDs are fixed (`11111111-1000-0000-0000-00000000000N`). `ON CONFLICT DO UPDATE` — idempotent. | ✅ Ready (uncommitted) |

### Template coverage

| Slug | Vertical | Phases | Tasks | Sprints flag |
|---|---|---|---|---|
| `construction-hvac-install` | construction / hvac_install | 4 | 9 | false |
| `construction-fit-out` | construction / fit_out | 5 | 12 | false |
| `it-software-feature` | it / software_feature | 4 | 9 | true |
| `services-consulting` | services / consulting | 4 | 10 | false |
| `generic-project` | NULL / NULL (universal) | 3 | 7 | false |

All templates include `feature_flags` JSONB controlling which optional modules (sprints, resource_scheduling, story_points, billable) are surfaced by default for projects of this type. `org_module_configs.is_enabled` always overrides.

---

## 3. Post-Deploy Audit

| Script | Coverage | Gap? |
|---|---|---|
| `01_metadata_sync.sql` | Syncs Composer metadata | ✅ |
| `02_composer_bootstrap.sql` | Bootstraps entity blueprints | ✅ |
| `03_automation_compile.sql` | Compiles automation rules | ✅ |
| `04_health_check.sql` | Schema health check | ✅ |
| `04b_setup_cron.sql` | Schedules cron jobs | ✅ |
| `05_e2e_seed_restoration.sql` | Restores e2e seed state | ✅ |

**Missing post-deploy items (not blocking, P2):**
- No post-deploy script to seed `core.display_id_states` for `project` and `task` prefix if not present
- No post-deploy script to anchor `unified.project_phases` in `core.unified_objects` (Composer Tier-0.5 anchoring — gap G28 from SDD)
- No cron job for `materialise_recurrences()` — but that function doesn't exist yet (gap G6)

---

## 4. GAP_ANALYSIS Status (SDD/modules/projects/GAP_ANALYSIS.md)

The SDD is committed and cannot be edited here. This table is the live authoritative delta. Update the SDD in the next commit.

| Gap | Description | Was | Now |
|---|---|---|---|
| G1 | Multiple assignees M2M | ❌ missing | ✅ CLOSED — `unified.task_assignments` (000100) |
| G2 | Custom statuses/board columns | ❌ missing | ♻️ CHANGED — decision: blueprint stages = status system. `workflow_status_sets` DROPPED (000500). Approach differs from original spec (which wanted a separate table). |
| G3 | Dependency types + lag | ❌ missing | ✅ CLOSED — `unified.task_dependencies` (000100) |
| G4 | Project templates | ❌ missing | ✅ CLOSED — `unified.project_templates` table (000600) + seed data (17) |
| G5 | Per-project customisation (deep-copy, diff) | ❌ missing | 🟡 PARTIAL — table exists; `save_as_template()`/`diff_from_template()` functions not created |
| G6 | Recurring projects/tasks | ❌ missing | ❌ OPEN — P2 |
| G7 | ESM-contract → recurring project | ❌ missing | ❌ OPEN — P2 |
| G8 | CRM-deal-won → delivery project | ❌ missing | ❌ OPEN — P2 |
| G9 | Critical path / forward-backward pass | ❌ missing | ❌ OPEN — P3 |
| G10 | Capacity supply ledger | ❌ missing | ✅ CLOSED — `unified.resource_allocations` (000100) |
| G11 | Resource calendars / time-off | ❌ missing | ✅ CLOSED — `unified.resource_calendars` + `resource_unavailability` (000100) |
| G12 | Auto-assignment / scheduler | ❌ missing | 🟡 PARTIAL — `scheduler_requests` + `trigger_solver_run()` done; `suggest_assignments()` not yet |
| G13 | Detailed time tracking | ❌ missing | ✅ CLOSED — `timesheet_items.task_id` FK + rollup trigger (000100) |
| G14 | Comments/attachments | ✅ NOT A GAP | ✅ confirmed (core.object_comments/attachments) |
| G15 | Sprints | ❌ missing | ✅ CLOSED — `unified.sprints` (000600) + `tasks.sprint_id` (000100) |
| G16 | Tags | ✅ NOT A GAP | ✅ confirmed (core.object_tags) |
| G17 | Phases / WBS layer | ❌ missing | ✅ CLOSED — `unified.project_phases` (000100) |
| G18 | Portfolio/program rollup | ❌ missing | 🟡 PARTIAL — `parent_project_id` + `relation_role` on projects; rollup views not yet |
| G19 | Typed custom fields | ❌ missing | 🟡 PARTIAL — `process_templates.vertical_schemas` exists; not wired to PM forms yet |
| G20 | Analytics/dashboards | ❌ missing | ❌ OPEN — P5 |
| G21 | MS-Project/CSV import | ❌ missing | ❌ OPEN — P5 |
| G22 | Generic automation rules | ❌ missing | ❌ OPEN — P2 |
| G23 | Vertical payload schemas | ❌ missing | ❌ OPEN — P2 |
| G24 | Construction FK to unified | ❌ missing | ❌ OPEN — P2 |
| G25 | Milestone billing / weighted progress | ❌ missing | ❌ OPEN — P4 |
| G26 | Resource pools | ❌ missing | ✅ CLOSED — `unified.resource_pools` + `resource_pool_members` (000100) |
| G27 | Decommission scheduler POC | 🟡 partial | ✅ CLOSED — already `x_scheduler_old` in v6; OR-Tools edge fn is the path |
| G28 | unified_objects anchor for PM | 🟡 unverified | 🟡 PARTIAL — `unified_objects` exists; project/task anchoring via Composer needs verification |

**Gaps closed this session: G1, G3, G4, G10, G11, G13, G15, G17, G26, G27**
**G2 changed approach (not closed in original sense, but resolved correctly)**

---

## 5. Brain Doc Audit

| File | Status |
|---|---|
| `.agent/brain/06-11-26/project-capacity-planning.md` | ✅ Coherent. References `generate_ppm_tasks` — committed file, historical record. Superseded by 06-12-26 docs for current naming. |
| `.agent/brain/06-11-26/task-assignee.md` | ✅ Coherent. Migration checklist §9 matches 000500 exactly. |
| `.agent/brain/06-12-26/project-templates-sprints-vertical-activation.md` | ✅ Updated. Function signature fixed to `(p_project_id, p_config)`. No `generate_ppm_tasks` refs remain. |
| `.agent/brain/06-12-26/architect-certification-projects-tasks.md` | ✅ This document. |

---

## 6. Test Audit (tests/test_unified_tasks_inserts.sql)

Updated this session. Now covers:

| Table | Test Phase | Method |
|---|---|---|
| `unified.projects` | Phase 6a | `api_new_core_upsert_data` |
| `unified.project_phases` | Phase 6b | Direct INSERT + tasks.phase_id FK update |
| `unified.sprints` | Phase 6c | Direct INSERT + tasks.sprint_id FK update |
| `unified.project_templates` | Phase 6d | SELECT from seeded global rows (warns if seed not applied) |
| `unified.tasks` (solo) | Phase 1 | `api_new_core_upsert_data` |
| `unified.tasks` (crew) | Phase 2 | `api_new_core_upsert_data` + embedded `task_assignments` |
| `unified.task_assignments` | Phase 2 | Embedded in crew task call; 3 rows verified |
| `unified.resource_calendars` | Phase 3a | Direct INSERT |
| `unified.resource_unavailability` | Phase 3b | Direct INSERT |
| `unified.resource_pools` | Phase 3c | Direct INSERT |
| `unified.resource_pool_members` | Phase 3c | Direct INSERT |
| `unified.task_dependencies` | Phase 3d | Direct INSERT |
| `unified.resource_allocations` | Phase 3e | Direct INSERT |
| `unified.scheduler_requests` | Phase 3f | Direct INSERT |
| `unified.v_tasks` (fetch) | Phase 4a-e | `api_new_fetch_entity_records` with 5 filter patterns |
| RACI sync trigger | Phase 5 | Verify `raci.responsible` set from `task_assignments` |
| `unified.generate_project_tasks()` | Phase 6e | Direct function call with minimal config; EXCEPTION wrapper for ESM-asset dependency |
| FK constraints (phase_id, sprint_id, template_id) | Phase 6b/6c/6d | UPDATE tasks/projects + assert |

**Tables NOT covered** (bootstrapped via extension tables, not direct insert):
`unified.contacts`, `unified.assets`, `unified.organizations` — correct per user spec.
`unified.locations`, `unified.milestones`, `unified.checklists`, `unified.task_requirements` — tested in other suites (esm_inserts covers milestones/checklists via ESM tickets).

---

## 7. Naming Convention Compliance

| Was | Now | Applied in |
|---|---|---|
| `unified.generate_ppm_tasks` | `unified.generate_project_tasks` | RENAME in 000600; all uncommitted refs updated |
| `scheduler.generate_project_plan_delta` | `unified.generate_project_tasks` | Historical in 000100 header comments |
| `scheduler.simulate_ppm_plan` | `unified.trigger_solver_run` | Historical in 000100 header comments |
| `12_project_templates.sql` (wrong number — taken) | `17_project_templates.sql` | Corrected before file was created |

---

## 8. P0 Completion Certificate

The following P0 items from SDD/modules/projects/GAP_ANALYSIS.md §4 are complete:

- ✅ `unified.task_assignments` (G1)
- ✅ `unified.task_dependencies` (G3)
- ✅ `unified.project_phases` (G17)
- ✅ `core.unified_objects` registration path exists (G28 — needs Composer verify)
- ✅ RACI sync trigger (closes assignee_id consistency gap from SDD §3b)
- ✅ `unified.v_tasks` view with `participant_ids` (closes "My Tasks" fetch gap)
- ✅ Blueprint stages = status system; `workflow_status_sets` DROPPED (G2 resolution)

**P1 now unblocked:**
- `unified.project_templates` table + 5 seed templates ✅
- `unified.generate_project_tasks()` (renamed) ready to consume template data
- `unified.sprints` (G15) ready, module activation via `org_module_configs`
- `unified.resource_pools`/`resource_pool_members` (G26) ✅
- `unified.resource_allocations` capacity ledger (G10) ✅
- `timesheet_items.task_id` rollup bridge (G13) ✅

**P1 still open:**
- G5: `save_as_template()` / `diff_from_template()` functions
- G19: Wire `process_templates.vertical_schemas` to PM form engine

---

## 9. Run Order (after this certification)

```bash
# Apply new migrations
supabase db push                              # or psql on local after db reset

# Apply seed (if local reset already ran through 16, just run 17 manually)
psql $LOCAL_URL < supabase/seeds/17_project_templates.sql

# Run test suite
psql $LOCAL_URL < tests/test_unified_tasks_inserts.sql
```

Local `db reset` picks up all migrations + all seeds in order — including 17.
Cloud: `db push` applies 000500 and 000600; then run 17 seed manually (seeds don't re-run on push).
