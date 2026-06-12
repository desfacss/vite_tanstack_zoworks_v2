# Projects Module — Gap Analysis (Ideal vs Current)

> **Companion to**: [`MODULE_SPEC.md`](MODULE_SPEC.md)
> **Date**: 2026-06-11
> **Method**: Compares the target-state spec (§5–§8) against what the `unified`, `construction`, `crm`, `esm` schemas + `post_deploy/task_unification/` provide today.
> **Legend**: ✅ exists · 🟡 partial · ❌ missing · ♻️ exists but needs change

---

## 1. What already exists (strong foundation)

| Capability | Where | Status |
|---|---|---|
| Project anchor with budget/health/risk/progress, baseline/planned/actual dates | `unified.projects` (`202606010022_unified_tables.sql`) | ✅ |
| Task hierarchy (ltree `path`, `parent_task_id`, `depth`) | `unified.tasks` | ✅ |
| Task scheduling fields + Gantt derivation trigger | `unified.tasks` + `tasks_compute_schedule()` (`post_deploy/task_unification/00_support_functions.sql`) | ✅ |
| Milestones (gate/deliverable/decision) + acceptance criteria | `unified.milestones` | ✅ |
| Checklists w/ verification | `unified.checklists` | ✅ |
| Demand-side requirements (role/skill/cert/material/asset/doc/approval) | `unified.task_requirements` | ✅ |
| Resource capability data (skills, certs, rates, availability) | `unified.contacts`, `unified.assets` | ✅ |
| Cross-domain task spawn + lifecycle sync | `auto_close_stage_task`, `util_cascade_cancel_children`, source-entity `details` contract | ✅ |
| L1 source / L2 self-lifecycle blueprint pattern | `post_deploy/task_unification/01–12_*.sql` | ✅ |
| Domain anchoring via identity-column dedup | `202606010095_project_domain_dedup.sql` (crm.deals, esm.projects, construction.projects) | ✅ |
| Vertical-payload JSON-Schema CHECK pattern | `valid_esm_tickets_payload` (`06_unified_tasks_ddl.sql`) | ✅ |
| Three identity axes (`intent_type`/`task_type`/`details.task_nature`) | convention across `unified.*` | ✅ |
| Construction domain extension | `construction.projects` (`202606010030`) | ✅ |

> **Verdict**: the cross-domain *engine* and the task-unification *spine* are already built and reviewed. The gaps are almost entirely on the **standalone-PM-tool** side (assignees, statuses, dependencies, time, agile) and the **template catalog + capacity supply-ledger** — NOT collaboration, which is already solved.

### 1a. Collaboration is already solved by `core.unified_objects` + `core.object_*` (do NOT rebuild)

The platform has a polymorphic cross-cutting layer anchored on `core.unified_objects` (URN per object, created by Composer Tier-0.5). Every project/task/milestone gets one anchor, and these hang off it:

| Capability | Table | Covers gap |
|---|---|---|
| Threaded comments + @mentions | `core.object_comments` (`parent_id`, `content`, `is_internal`) | G14 (comments) |
| Attachments | `core.object_attachments` (`file_url`, `file_type`, `category`) | G14 (attachments) |
| Tags | `core.object_tags` (`tag`, `tag_category`, `color`) | G16 |
| Activity feed / audit | `core.object_activities` (`activity_type`, `actor_id`, `data`) | G14 (activity) |
| Cross-object links | `core.object_relations` (`source/target_object_id`, `relation_type`) | (former task_links/project_relations) |
| Watchers / followers | `core.object_subscriptions` (`user_id`, `subscription_type`) | notifications "who" |
| Type registry | `core.object_type_registry` | URN routing |

**Correction to v1 of this doc**: gaps for comments/attachments/activity/tags/links are **withdrawn** — those tables exist. The spec's earlier proposal of `unified.work_comments/work_attachments/activity_log/tags/task_links` is rejected as duplicative. Only a thin `unified.notifications` *delivery* table is net-new (subscriptions decide who, notifications record what was delivered).

### 1b. The `scheduler.*` POC — what to carry forward vs drop

The scheduler is a real v5 schema (`v5_scheduler_full_dump_20260611_164340.sql`) that was **not yet migrated to v6**. It was a CP-SAT POC built as a shadow-copy: `y_load_baseline_data()` ETL-copied `unified.*` + `identity.*` data into `scheduler.y_*` tables so the OR-Tools edge fn (`y_run_planner`) could read a denormalised view. All data tables were empty (POC only).

**Carry forward as `unified.*` first-class tables** (done in `20260611000100`):

| `scheduler.y_*` (drop) | `unified.*` replacement (created) |
|---|---|
| `y_shifts` | `cal.blocked_windows` |
| `y_resource_unavailability` | `cal.blocked_windows` |
| `y_resource_pools` + `_members` | `unified.resource_pools` + `_members` |
| `y_dependencies` (FS/SS/FF/SF, lag) | `unified.task_dependencies` |
| `y_planning_requests` | `unified.scheduler_requests` |
| `y_tasks.pinned_start/end/resource` | columns on `unified.tasks` |
| `generate_project_plan_delta()` | `unified.generate_ppm_tasks()` |
| `simulate_ppm_plan()` | `unified.trigger_solver_run()` |

**Do NOT carry forward** (shadow/ETL pattern, replaced by views):
- `y_projects`, `y_tasks`, `y_locations`, `y_resources` (mirrors) — solver reads `unified.v_solver_tasks` + `unified.v_solver_resources` directly.
- `y_load_baseline_data()` — the ETL function — eliminated.
- `y_project_configs` / `y_ppm_configs` — PPM task-generator config migrates to `project_templates` in P1.
- `simulate_scenario_from_nlp()` — stays in the edge function, not the DB.

**Action completed**: `supabase/migrations/20260611000100_projects_scheduling_capacity.sql`

---

## 2. Gap register (target → action)

| # | Gap | Current state | Required object (spec §) | Sev | Phase |
|---|-----|---------------|--------------------------|-----|-------|
| G1 | **Multiple assignees** as first-class M2M | assignees stuffed in `tasks.raci` / `task_requirements` | `unified.task_assignments` (§5.5) | High | P0 |
| G2 | **Custom statuses / board columns** | fixed 5-value `state_category` only | `workflow_status_sets` + `workflow_statuses` mapping → `state_category` (§5.4) | High | P0 |
| G3 | **Dependency types + lag** | `tasks.depends_on uuid[]` = FS-only, no lag | `unified.task_dependencies` (FS/SS/FF/SF + lag, cycle guard) (§5.6) ♻️ deprecate array | High | P0 |
| G4 | **Project templates** (per vertical/category/product-service-type) | none — only `checklists.template_id` → documents | `project_templates` + `task_templates` + `create_from_template()` (§6.1, §10.1) | High | P1 |
| G5 | **Per-project customisation w/o forking** | n/a (no templates) | deep-copy instantiation + `diff_from_template()`/`save_as_template()` (§6.3) | High | P1 |
| G6 | **Recurring projects/tasks** (PM visits) | none | `recurrence_rules` + `materialise_recurrences()` + cron (§6.4) | High | P2 |
| G7 | **ESM-contract → recurring project** origin | not wired | L1 blueprint on `esm.contracts` + recurrence (§8.3, UC-3) | High | P2 |
| G8 | **CRM-deal-won → delivery project** origin | deals spawn *tasks*, not a project | `spawn_from_source()` Pattern A (§8.1, UC-2) | Med | P2 |
| G9 | **Critical path / forward-backward pass** | `tasks_compute_schedule()` derives bars only, no dep pass | `scheduler.recompute_schedule()` (§7.1) | Med | P3 |
| G10 | **Capacity supply ledger** (booked allocations) | only demand (`task_requirements`); no supply ledger | `resource_allocations` (§5.14, §7.3) | High | P3 |
| G11 | ~~Resource calendars / time-off~~ | `cal` schema migration complete | `cal.blocked_windows` (§7.2) ✅ resolved | Med | P3 |
| G12 | **Auto-assignment / scheduler** | none | `scheduler.suggest_assignments()` + `level_resources()` (§7.4) | Med | P3 |
| G13 | **Detailed time tracking** | aggregated `effort_actual_hours` only | `unified.time_entries` + rollup trigger (§5.11, UC-7) | Med | P4 |
| G14 | ~~Comments / attachments / activity~~ → **NOT A GAP** | `core.object_comments/attachments/activities` exist (anchored on `core.unified_objects`) | only wire PM objects to write there + `unified.notifications` delivery table (§5.13) | ✅/Low | P4 |
| G15 | **Sprints / backlog / agile** | none | `unified.sprints` + `tasks.sprint_id` (§5.12) | Med | P4 |
| G16 | ~~Tags / labels~~ → **NOT A GAP** | `core.object_tags` exists | define PM tag-category conventions only (§5.10) | ✅/Low | — |
| G17 | **Phases / WBS layer** | task hierarchy only | `unified.project_phases` (§5.2) | Low | P0/P1 |
| G18 | **Portfolio / program rollup** | no parent above project | `projects.parent_project_id`+`relation_role` + rollup views (§5.1, §9, §11) | Med | P5 |
| G19 | **Typed custom fields** | loose `details` JSONB | bind template → `core.forms`/`process_templates.vertical_schemas` (§6.5) | Med | P1 |
| G20 | **Analytics / dashboards** (burndown/CFD/EV/utilisation) | none | materialised views (§11) | Med | P5 |
| G21 | **MS-Project / CSV import + grid view** | none | `import_msproject()` + column-meta grid (§10.4) | Low | P5 |
| G22 | **Generic automation rules** (beyond stage) | hardcoded blueprint actions | compile from template `automation` block → `automation.wf_rules` (§6.6) | Low | P2 |
| G23 | **Vertical payload schemas for construction/mfg/PS** | only `esm_tickets` has a CHECK | add per-`task_type`/`project_type` JSON-Schema CHECKs (§8.4) | Low | P2 |
| G24 | **Construction extension FK to unified anchor** | dedup done, but no explicit `unified_project_id` FK column verified | add typed FK `construction.projects.unified_project_id` (§8.1) | Med | P2 |
| G25 | **Milestone billing / weighted progress rollup** | milestones exist, no billing trigger/weight | add `is_billing_trigger`, `weight` to milestones (§5.7) | Low | P4 |
| G26 | **Resource pools** | none (POC had `scheduler.y_resource_pools`) | `unified.resource_pools` + `_members` (§5.14, §7.3) | Low | P3 |
| G27 | **Decommission `scheduler.*` POC** | already `x_scheduler_old`, not in v6 | confirm dropped; port OR-Tools to stateless `project-scheduler` edge fn (§7.0) | Low | P3 |
| G28 | **`core.unified_objects` anchor for PM objects** | exists for core entities; verify projects/tasks/phases all get a URN anchor | confirm Composer Tier-0.5 anchors all four; backfill if missing (§5.15) | Med | P0 |

---

## 3. Backward-compatibility notes

- **`tasks.depends_on uuid[]`** (G3): keep as a read-only synced view over `task_dependencies` (FS edges) so existing consumers don't break; hard-cut deferred (Open Decision §14.2).
- **`tasks.raci`** (G1): retained for `accountable`/`consulted` (role tokens); `responsible` migrates to `task_assignments`. The L1/L2 blueprints set `raci.responsible` to a concrete user column today — assignment rows should be derived from that during cutover.
- **`state_category`** (G2): unchanged and remains the automation/RLS pivot; `workflow_statuses.state_category` is the mapping bridge so all existing blueprints keep firing.
- **Composer dedup** (G24): the dedup migration already moved identity columns to the unified anchor; the FK column is the only missing piece to make Pattern-A explicit rather than convention-only.

---

## 3b. Architectural decisions locked (2026-06-11)

| Decision | Choice | Rationale |
|---|---|---|
| **Schema for PM/scheduling tables** | Stay in `unified` | `unified` is the operational fabric / system of intelligence — not just a registry. Every enterprise activity is a task. Domain schemas carry only domain-specific columns. |
| **Primary assignee on tasks** | `assignee_id` generated column (`raci->>'responsible'::uuid`) | Single source of truth in `raci` JSONB; `assignee_id` is a stored generated column for indexed "My Tasks" queries. No maintenance burden, auto-recomputes on reassign. |
| **RACI vs task row explosion** | `raci` JSONB on task + `assignee_id` generated | Do NOT create separate task rows for R/A/C/I roles. `task_assignments` table is only for multi-resource scheduler bookings (e.g. 3 workers needed). |
| **Approval model** | `raci.accountable` + custom `workflow_statuses` + blueprint | No new approval table. "In Review" custom status → L2 blueprint notifies accountable → approve/reject via status change + comment. |
| **Time entry ownership** | `workforce.timesheet_items` (add `task_id` FK) | Workforce module owns time. `unified.tasks.effort_actual_hours` is a trigger-maintained rollup. No `unified.time_entries` table — that would duplicate workforce. |
| **Agile / monitoring approach** | Record truth, no DB-level enforcement | Tasks flow freely. Only blueprint `wf_rules` (critical path, SLA, custom ECA) trigger notifications. `is_blocked` flag is informational only by default. |
| **Human vs agent tasks** | `raci.responsible_kind` = `user` / `agent` / `role` | Same task model for both. `task_source` = `manual` / `automation` / `agent`. Agent tasks have `responsible = bot_uuid`. |

---

## 4. Recommended first migration (P0 slice)

A single append-only migration `YYYYMMDDHHMMSS_projects_p0_core.sql` adding:
1. `unified.task_assignments` (+ indexes, RLS `workforce`).
2. `unified.task_dependencies` (+ cycle-guard trigger, RLS).
3. `unified.workflow_status_sets` + `unified.workflow_statuses` (RLS `configuration`, Additive).
4. `unified.project_phases` (RLS `standard`).
5. New columns on `unified.tasks` (`phase_id`, `status_id`, `sprint_id`, `milestone_id`, `billable`) and `unified.projects` (`template_id`, `parent_project_id`, `relation_role`, `category`, `product_service_type`, `default_status_set_id`).
6. A `unified.v_task_depends_on` sync view for the legacy array.

Status seed (`supabase/seeds/`): a default global `workflow_status_set` ("Standard Delivery": Backlog→In Progress→In Review→Done, mapped to NEW/IN_PROGRESS/IN_PROGRESS/CLOSED_WON) so every tenant has board columns out of the box.

> Per CLAUDE.md §5: append-only, timestamped, idempotent (`IF NOT EXISTS`), one concern, no config rows in the migration (status sets go to seeds).
