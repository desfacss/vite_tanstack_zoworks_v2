# Projects, Scheduling & Capacity Planning — Granular Use-Case Catalog

> **Companion to**: [`MODULE_SPEC.md`](MODULE_SPEC.md) · [`GAP_ANALYSIS.md`](GAP_ANALYSIS.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md)
> **Date**: 2026-06-11 · **State**: Ideal / target (not constrained by current implementation)
> **Purpose**: The complete, testable inventory of *what the system must let actors do*, with binding business rules (BR), preconditions, and postconditions. This is the source of truth for backlog slicing, acceptance tests, and RLS verification.
> **Convention**: `UC-<area>-<n>`. BR = business rule. Each UC lists Actor · Trigger · Pre · Flow · BR · Post. "Resource" = a capacity-bearing `unified.contacts` (person/subcontractor) or `unified.assets` (equipment).

---

## Actors / Personas

| Persona | Role token | DB role | Scope |
|---|---|---|---|
| Portfolio/PMO lead | `PMO` | authenticated | all projects in org |
| Project manager | `PROJECT_MANAGER` | authenticated | owned/managed projects |
| Planner / scheduler | `PLANNER` | authenticated | scheduling + capacity for assigned projects |
| Team member / worker | `MEMBER` | authenticated | assigned tasks + team scope |
| Field worker / technician | `FIELD_WORKER` | authenticated | dispatched tasks |
| Subcontractor | `SUBCONTRACTOR` | authenticated (limited) | assigned tasks only |
| Resource manager | `RESOURCE_MANAGER` | authenticated | resource pools, calendars, capacity |
| Client / sponsor | `SPONSOR` | authenticated (read-mostly) | their projects, approvals |
| ZWS automation | system | service_role | blueprint-driven actions |
| Scheduler service | system | service_role | OR-Tools edge fn |
| SaaS admin | `is_sassadmin` | authenticated | cross-tenant (3 modes) |

---

## Area A — Templates, Catalog & Configuration

### UC-A1 — Browse the template catalog scoped to my work type
- **Actor**: PM/Planner · **Trigger**: opens "New Project". · **Pre**: tenant has access to ≥1 template (global library + tenant rows).
- **Flow**: filter templates by `(vertical, category, product_service_type)`; preview phases/milestones/roles/budget model.
- **BR-A1.1**: A residential builder sees building templates, not SaaS-onboarding ones — selector keys are mandatory filters.
- **BR-A1.2**: Templates are **Additive config** — global library rows (`organization_id IS NULL`) + tenant-authored rows coexist; tenant rows override on the same `(category, product_service_type, name)`.
- **BR-A1.3**: A template marked `is_active=false` is hidden from instantiation but retained for existing projects' provenance.
- **Post**: PM has a selected `template_id` + `template_version`.

### UC-A2 — Author a new project template (tenant)
- **Actor**: PMO/Admin · **Trigger**: "Create Template". · **Pre**: `configuration` RLS write on `project_templates`.
- **Flow**: define phases, milestones (with acceptance criteria), task nodes (effort, dependencies by `node_key`, required role/skill/cert, default checklist), status set, budget model, custom-field schema, optional recurrence + source-binding.
- **BR-A2.1**: Template dependency graph is validated acyclic at save.
- **BR-A2.2**: Custom fields reference a `core.forms` definition (typed, validated) — never loose `details` keys.
- **BR-A2.3**: `source_binding` (optional) declares how the template is auto-resolved from a domain entity (deal product type, contract service type, building type).
- **Post**: new `project_templates` + `task_templates` rows; versioned.

### UC-A3 — Version a template and propagate to customised projects
- **Actor**: PMO · **Trigger**: edits a published template. · **Pre**: template in use by ≥1 project.
- **BR-A3.1**: Editing creates a new `version`; existing projects keep their instantiated `template_version` (no silent mutation).
- **BR-A3.2**: PM may "re-sync from template" on a project — applies only **new** nodes (by `node_key`), never clobbering instance edits (idempotent).
- **BR-A3.3**: `diff_from_template(project_id)` reports drift (added/removed/modified nodes) for governance.

### UC-A4 — Save a customised project back as a template
- **Actor**: PM · **Trigger**: "Save as Template". · **Pre**: project exists.
- **BR-A4.1**: `save_as_template(project_id, scope)` writes a new tenant (`scope='tenant'`) or global (`scope='global'`, SaaS-admin only) template from the current instance structure.
- **BR-A4.2**: Instance-specific data (actual dates, assignees, time logs) is stripped; only the plan is captured.

### UC-A5 — Define a custom status set (board columns)
- **Actor**: PMO/PM · **Trigger**: "Customize Statuses". 
- **BR-A5.1**: Each custom status maps to exactly one cross-domain `state_category` so automation/RLS keep working.
- **BR-A5.2**: A status set declares ordering, color, `is_default`, `is_terminal`, optional `wip_limit`.
- **BR-A5.3**: Every tenant has the seeded global "Standard Delivery" set out of the box (Backlog→In Progress→In Review→Done).

### UC-A6 — Define custom fields for a template/project
- **Actor**: PMO · **BR-A6.1**: Typed via `core.forms`/`process_templates.vertical_schemas`; searchable fields get indexed generated columns; rest live in validated `details`/`vertical_payload`.

---

## Area B — Project Lifecycle (manual & instantiation)

### UC-B1 — Instantiate a project from a template
- **Actor**: PM · **Trigger**: confirms template + overrides. · **Pre**: `template_id`.
- **Flow**: `create_from_template(template_id, overrides, dry_run)` materialises `unified.projects` + phases + milestones + tasks + dependencies + requirements + checklists; computes baseline schedule (forward pass from `planned_start_date`).
- **BR-B1.1**: `intent_type` inherited from template; `project_type`/`task_type` = category (never a generic string).
- **BR-B1.2**: `baseline_start/end` frozen at creation; `planned_*` initialised equal to baseline.
- **BR-B1.3**: Idempotent per `(project_id, node_key)`.
- **BR-B1.4**: A `core.unified_objects` URN anchor is created for the project and every task/milestone/phase (Composer Tier-0.5).
- **BR-B1.5**: `dry_run=true` returns the would-be structure without writing.
- **Post**: project + full WBS, status `NEW`.

### UC-B2 — Create a blank/ad-hoc project (no template)
- **Actor**: PM · **BR-B2.1**: Allowed; `details.template_unresolved=true` flag set for later governance; default status set applied.

### UC-B3 — Edit project header (dates, budget, owner, sponsor, priority)
- **BR-B3.1**: Changing `planned_start_date` triggers schedule recompute (§E).
- **BR-B3.2**: Budget edits never alter `budget_actual` (derived) or frozen baseline.

### UC-B4 — Put project on hold / resume
- **BR-B4.1**: `is_on_hold=true` cascades a *soft* hold to open tasks (visible, not schedulable) without changing `state_category`.

### UC-B5 — Close project (won/lost) / cancel
- **BR-B5.1**: Closing requires all `blocks_completion` checklists done and all gate milestones met (or explicitly waived with reason).
- **BR-B5.2**: Cancel cascades to non-terminal tasks via `util_cascade_cancel_children` (opt-in per template for source-spawned projects).
- **BR-B5.3**: Terminal projects are read-only except audit/comments.

### UC-B6 — Archive / restore project
- **BR-B6.1**: Archive sets `is_active=false` + `unified_objects.deleted_at`; excluded from active views, retained for history.

---

## Area C — WBS: Phases, Tasks, Subtasks

### UC-C1 — Add/edit/reorder phases
- **BR-C1.1**: Phase `sequence_order` drives Gantt grouping; phase dates roll up from member tasks.
- **BR-C1.2**: A phase may have a `gate_milestone`; downstream phases depend on the gate.

### UC-C2 — Create task / subtask
- **BR-C2.1**: Subtask sets `parent_task_id`; `path` (ltree) + `depth` maintained by trigger.
- **BR-C2.2**: Task inherits `organization_id`, `project_id`, default status; gets a URN anchor.
- **BR-C2.3**: Parent progress = weighted rollup of children.

### UC-C3 — Move task across phases/projects
- **BR-C3.1**: Re-parenting updates `path` for the whole subtree; dependencies preserved; schedule recompute fired.

### UC-C4 — Set task status (custom) 
- **BR-C4.1**: Setting `status_id` resolves `state_category` via the status mapping; board column changes; WIP limit enforced (soft warning when exceeded).
- **BR-C4.2**: Moving to a terminal status sets `actual_end`, `progress=100`.

### UC-C5 — Block / unblock task
- **BR-C5.1**: `is_blocked=true` + `blocking_reason` required; fires L2 self-lifecycle escalation (notify accountable).
- **BR-C5.2**: A task blocked by an unmet dependency cannot be started (hard dep) — UI prevents status→in-progress.

### UC-C6 — Bulk edit (grid / spreadsheet view)
- **BR-C6.1**: Smartsheet-style inline edit of any column with per-row validation; partial-failure returns row-level errors.

---

## Area D — Dependencies

### UC-D1 — Add a dependency (FS/SS/FF/SF + lag)
- **BR-D1.1**: `task_dependencies(predecessor, successor, type, lag_minutes, is_hard)`; lag may be negative (lead).
- **BR-D1.2**: Cycle creation rejected by trigger.
- **BR-D1.3**: Adding a dep recomputes successor schedule respecting type + lag.

### UC-D2 — Visualise / edit dependencies on Gantt
- **BR-D2.1**: Dragging a task respects hard deps (snaps); soft deps are advisory (warn only).

### UC-D3 — Critical path
- **BR-D3.1**: Forward+backward pass flags zero-slack chain `details.on_critical_path=true`; recomputed on any schedule/dep/effort edit.

---

## Area E — Scheduling

### UC-E1 — Compute/refresh schedule
- **BR-E1.1**: `recompute_schedule(project_id)` runs forward/backward pass over deps; sets early/late start/finish, slack, critical path.
- **BR-E1.2**: `scheduled_end` is derived (`tasks_compute_schedule`) from `scheduled_start + effort_planned_hours` when not explicitly set — never authored in blueprint payloads.

### UC-E2 — Baseline / re-baseline
- **BR-E2.1**: Re-baseline copies current `planned_*` → `baseline_*` (audit-logged); used for variance.

### UC-E3 — Respect working calendars
- **BR-E3.1**: Scheduler never places work outside a resource's available windows (working hours, holidays per location, explicit blocks in `cal.blocked_windows`).
- **BR-E3.2**: Project/org calendar is the default; resource calendar overrides.

### UC-E4 — What-if / scenario (optional, P5)
- **BR-E4.1**: A scenario is a non-committed schedule copy; committing writes back planned dates + allocations.

---

## Area F — Assignments & Capacity Planning

### UC-F1 — Assign one or many resources to a task
- **BR-F1.1**: `task_assignments(task, assignee, assignee_kind, role, allocation_pct, estimated_hours)`; multiple assignees + roles (responsible/reviewer/watcher/approver).
- **BR-F1.2**: Booking writes a `resource_allocations` window consuming capacity from the resource's calendar.
- **BR-F1.3**: `raci.accountable` stays a role token; `responsible` is now an assignment row.

### UC-F2 — Auto-suggest assignments (rule-based, in-DB)
- **BR-F2.1**: `suggest_assignments(scope)` ranks candidates: eligibility (capabilities ⊇ required role/skills/certs) → availability in window (against `cal.blocked_windows`) → strict geographic match (against `cal.resource_territories`) → lowest utilisation → lowest cost → continuity.
- **BR-F2.2**: Returns ranked candidates without booking; planner confirms.

### UC-F3 — Auto-schedule + assign (OR-Tools solver)
- **BR-F3.1**: `project-scheduler` edge fn reads a normalised view of tasks/deps/requirements/`cal.blocked_windows`/allocations, solves sequencing + assignment + levelling, writes back `task_assignments` + `resource_allocations` + planned dates.
- **BR-F3.2**: Solver objective is configurable: minimise makespan / minimise cost / maximise on-time / balance load.
- **BR-F3.3**: Hard constraints (certs, hard deps, capacity, `cal` blocks) are inviolable; soft constraints are penalties.
- **BR-F3.4**: Stateless — no shadow schema, no ETL; results are the only persisted output.

### UC-F4 — Over-allocation detection & levelling
- **BR-F4.1**: Booking beyond `capacity_count`/100% → soft warning (workload view) or hard rejection (requirement `is_hard_constraint`).
- **BR-F4.2**: `level_resources(project_id)` shifts non-critical tasks within slack to remove over-allocation.

### UC-F5 — Resource pools
- **BR-F5.1**: `resource_pools` + `_members` group resources (zone, skill cell, crew); scheduler draws candidates from the project's bound pool first.

### UC-F6 — Manage resource availability & time-off via `cal`
- **Actor**: Resource manager / worker · **BR-F6.1**: Approved time-off creates `is_blocking = true` records in `cal.blocked_windows`; scheduler re-validates affected allocations and flags conflicts.

### UC-F7 — Workload / capacity heatmap
- **BR-F7.1**: `workload(resource_ids, window)` returns Σ allocations / capacity per resource per period; drives a heatmap and over/under-utilisation flags.

### UC-F8 — Reassign / unassign
- **BR-F8.1**: Removing an assignment releases its `resource_allocations`; re-validates the task's coverage (warns if a required role is now unfilled).

---

## Area G — Milestones, Gates & Checklists

### UC-G1 — Track milestone (gate/deliverable/decision)
- **BR-G1.1**: Milestone status (open/met/missed/waived) rolls up from `contributing_task_ids`; auto-met when all contributors terminal + acceptance criteria satisfied.
- **BR-G1.2**: A gate milestone blocks downstream tasks until met (dependency on the gate).

### UC-G2 — Milestone billing trigger
- **BR-G2.1**: `is_billing_trigger=true` milestone, when met, emits a billing event to finance/commerce via `external_references`.

### UC-G3 — Checklist completion & approval
- **BR-G3.1**: `blocks_completion` checklist must be 100% (and approved if `requires_approval`) before the task can close.
- **BR-G3.2**: Each item may require `evidence_doc_id` (attachment via `core.object_attachments`).

---

## Area H — Agile / Sprints

### UC-H1 — Create sprint / iteration
- **BR-H1.1**: `sprints(project_id, start, end, goal, capacity)`; tasks join via `sprint_id`; backlog = `sprint_id IS NULL`.

### UC-H2 — Plan sprint (capacity vs commitment)
- **BR-H2.1**: Sum of committed `story_points`/`estimated_hours` warns when exceeding sprint capacity.

### UC-H3 — Burndown / velocity
- **BR-H3.1**: `v_burndown` (remaining vs ideal) and `v_velocity` (completed points per closed sprint) computed from task status history.

---

## Area I — Time Tracking & Cost

### UC-I1 — Log time (timer or manual)
- **BR-I1.1**: `time_entries(task, assignment, user, start, end, duration, description, billable, rate snapshots)`.
- **BR-I1.2**: Trigger rolls `SUM(duration)` → `tasks.effort_actual_hours` and cost → `projects.cost_actual`/`budget_actual`.

### UC-I2 — Submit & approve timesheets
- **BR-I2.1**: `approval_status` (draft→submitted→approved/rejected); only approved billable time feeds invoicing.

### UC-I3 — Budget burn & variance
- **BR-I3.1**: `budget_remaining` derived; health turns yellow/red on threshold breach; `v_schedule_variance` exposes SV/SPI/CV/CPI (earned value, P5).

---

## Area J — Cross-Domain Origins (the unification payoff)

### UC-J1 — CRM deal won → delivery project
- **Trigger**: `crm.deals` → `closed_won`. · **BR-J1.1**: L1 blueprint calls `spawn_from_source('crm','deals',id, resolver)`; template resolved from deal product/service type; FK-anchored; deal economics in `vertical_payload`. · **BR-J1.2**: Closing the deal does not cancel the project (opt-in cascade).

### UC-J2 — ESM ticket scheduled → field-dispatch task
- **Trigger**: `esm.tickets` → `Scheduled`. · **BR-J2.1**: Spawns a `unified.tasks` (task_type=`esm_tickets`) carrying `vertical_payload.ticket_id` (required by CHECK); exit auto-closes.

### UC-J3 — ESM contract cadence → recurring preventive-care project
- **Trigger**: `esm.contracts` monthly/quarterly cadence (cron). · **BR-J3.1**: One new project per cycle from the contract's bound PM template; covered assets/locations seeded into `task_requirements`. · **BR-J3.2**: Missed cycle (no completion by due) → `sla_breach` + escalation.

### UC-J4 — ESM service project (preventive) lifecycle
- **BR-J4.1**: `esm.projects` Planning/Active/On_Hold spawn stage-tasks; Cancelled cascades; Completed skips.

### UC-J5 — Construction project, fully custom plan
- **Trigger**: planner instantiates a building template. · **BR-J5.1**: Domain row (`construction.projects`: sq ft, permits, safety) FK-anchored to `unified.projects`. · **BR-J5.2**: Permit/inspection = gate milestones with acceptance criteria. · **BR-J5.3**: Planner edits the plan freely without forking the template.

### UC-J6 — Bespoke manufacturing / make-to-order
- **BR-J6.1**: A sales order line of `make_to_order` type spawns a production project from a routing template (operations as tasks, work-centres/machines as `unified.assets` resources, materials as `task_requirements`).

### UC-J7 — Professional-services engagement
- **BR-J7.1**: A won services deal spawns an engagement project (phases = SOW deliverables; billable time → milestone/T&M invoicing).

---

## Area K — Recurrence & Automation

### UC-K1 — Define a recurring task/project
- **BR-K1.1**: `recurrence_rules(rrule|cron, anchor, template_id, next_run_at, until/count, lead_time_days)`.

### UC-K2 — Materialise due cycles
- **BR-K2.1**: `materialise_recurrences()` (cron) instantiates cycles due within `lead_time_days`; idempotent per `(rule, occurrence_date)`.

### UC-K3 — Generic event-condition-action rules
- **BR-K3.1**: Tenant/template-authored rules compile to `automation.wf_rules`/`wf_actions` (e.g. priority→high notifies accountable; due<24h & progress<50% escalates). No new engine.

---

## Area L — Collaboration (via `core.object_*`)

### UC-L1 — Comment + @mention on any work object
- **BR-L1.1**: Writes `core.object_comments` (threaded via `parent_id`) against the object URN; mentions create `notifications` + an `object_activities` entry.

### UC-L2 — Attach a file/document
- **BR-L2.1**: `core.object_attachments` against the URN; may link a `documents` envelope via metadata.

### UC-L3 — Tag / label
- **BR-L3.1**: `core.object_tags` with PM tag categories (priority/discipline/phase).

### UC-L4 — Follow / watch
- **BR-L4.1**: `core.object_subscriptions`; watchers receive notifications on activity.

### UC-L5 — Activity feed & audit
- **BR-L5.1**: Every status/assignment/schedule/budget change appends to `core.object_activities` (actor, verb, old→new in `data`).

### UC-L6 — Notifications inbox
- **BR-L6.1**: `unified.notifications` persisted + `pg_notify`; fan-out edge fn delivers email/push/WA (reuse WA module). Subscriptions decide *who*; notifications record *what was delivered*.

---

## Area M — Portfolio / Program

### UC-M1 — Nest projects under program/portfolio
- **BR-M1.1**: `parent_project_id` + `relation_role` (portfolio/program/project/subproject) OR `core.object_relations` for matrixed links.

### UC-M2 — Roll up budget/health/progress/risk
- **BR-M2.1**: Materialised aggregates roll child → parent; `portfolio_rollup` cached on the parent.

### UC-M3 — Cross-project dependencies
- **BR-M3.1**: A task in project A may depend on a milestone in project B (via `task_dependencies`/`object_relations`); critical path spans projects.

---

## Area N — Reporting & Dashboards

### UC-N1 — Project health dashboard — `v_project_health`
### UC-N2 — Burndown / burnup — `v_burndown` / `v_burnup`
### UC-N3 — Cumulative flow (board) — `v_cumulative_flow`
### UC-N4 — Resource utilisation heatmap — `v_resource_utilisation`
### UC-N5 — Schedule variance / earned value — `v_schedule_variance`
### UC-N6 — Milestone/gate status — `v_milestone_status`
- **BR-N*.1**: All org-scoped via `analytical` RLS; refreshed via `cron.schedule()` post-deploy.

---

## Area O — Governance, Security & Multi-Tenancy

### UC-O1 — Tenant isolation
- **BR-O1.1**: Every table org-scoped; `service_role` callers (ZWS, scheduler) MUST filter `organization_id` explicitly.

### UC-O2 — "My Work" visibility
- **BR-O2.1**: A worker sees a task iff assigned, in team/role scope, or org-visible per template visibility (`workforce`/`user_scope` RLS).

### UC-O3 — Subcontractor limited access
- **BR-O3.1**: `SUBCONTRACTOR` sees only assigned tasks + their checklists/attachments; no budget/cost/other resources.

### UC-O4 — Client/sponsor portal
- **BR-O4.1**: `SPONSOR` read-mostly: milestones, progress, deliverables, approvals; no internal cost/resource data.

### UC-O5 — SaaS-admin cross-tenant
- **BR-O5.1**: Three modes (global config / tenant-context / role impersonation) per CLAUDE.md §8.

### UC-O6 — Global template library governance
- **BR-O6.1**: Only SaaS-admin publishes to the global library (`organization_id IS NULL`); tenants override locally (Additive).

---

## Area P — Import / Export / Migration

### UC-P1 — Import MS-Project / CSV / Excel
- **BR-P1.1**: `import_msproject(payload)` (edge fn parses MPP/MPX/XML/CSV) → tasks + dependencies + phases; unmatched resources flagged for mapping.

### UC-P2 — Export
- **BR-P2.1**: Gantt/CSV/Excel export of the project plan + actuals.

### UC-P3 — Bulk template seeding
- **BR-P3.1**: Global library templates ship as Group-2 config seeds (idempotent).

---

## Cross-cutting business rules (apply everywhere)

| ID | Rule |
|---|---|
| X-1 | Every work object has exactly one `core.unified_objects` URN anchor; collaboration/tags/links/activity attach there, never as new `unified.*` columns/tables. |
| X-2 | Custom statuses always map to a cross-domain `state_category`; automation & RLS pivot on `state_category`. |
| X-3 | `scheduled_end` is DB-derived, never authored in blueprint payloads (template resolver lacks `DATE_ADD`). |
| X-4 | `partition_filter` on L2 blueprints uses single equality only. |
| X-5 | Structure (assignments, deps, statuses, phases, time, allocations, `cal` availability logic, sprints, recurrence) lives in typed `unified` / `cal` tables; loose `details`/`vertical_payload` only for validated, heterogeneous, or ephemeral data. |
| X-6 | All mutations are append-only-friendly: changes append to `object_activities`; nothing is silently overwritten without audit. |
| X-7 | No shadow/ETL schema — the OR-Tools solver reads `unified.*` directly and writes back assignments/allocations. |
| X-8 | Templates are versioned; instantiation deep-copies; per-project edits never mutate the template. |
