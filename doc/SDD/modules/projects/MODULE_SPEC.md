# Projects & Work Management Module — Specification

> **SDD Version**: 1.0 — 2026-06-11
> **Topic**: Unified, template-driven Project Management, Capacity Planning & Scheduling
> **Status**: 🟡 Target-state design (greenfield ideal — NOT a description of current schema).
> **Companion docs**: [`USE_CASES.md`](USE_CASES.md) (granular UC catalog + business rules) · [`ARCHITECTURE.md`](ARCHITECTURE.md) (block + ER + flow diagrams) · [`GAP_ANALYSIS.md`](GAP_ANALYSIS.md) (delta vs current, incl. `scheduler.*` decommission & `core.object_*` reuse).
> **Depends on**: `identity` · `core` (Composer, blueprints, forms) · `automation` (ZWS engine) · `unified` (anchors) · `ai_mcp` (agentic assist)
> **Sibling/source modules**: `crm` (deals) · `esm` (tickets, projects, contracts) · `construction` (projects) · `hr`/`workforce` (resources)
> **Agent instructions**: Read §1–§4 for the model and taxonomy. §5 is the canonical schema (build DDL here). §6 = template/blueprint engine. §7 = scheduling & capacity. §8 = cross-domain integration contract. §9 = RLS. §10 = APIs. §11 = analytics. §12 = testing. §13 = phased delivery.

---

## 1. Business Context & Purpose

This module makes `unified.projects` + `unified.tasks` the **single operating system for all delivered work** across the platform — regardless of which domain originated it. It must simultaneously satisfy two audiences that PM tools normally force you to choose between:

1. **The standalone PM-tool user** (Asana / ClickUp / monday.com / Zoho Projects / Smartsheet / MS Project / ProofHub): boards, Gantt, sprints, multiple assignees, custom statuses, time tracking, comments, dependencies with lag, recurring tasks, dashboards, workload views.
2. **The ERP/delivery operator** (construction firm, bespoke manufacturer, field-service contractor, professional-services agency): a project is the *execution arm of a contract, a deal, or a recurring service obligation* — it must be **born from a reusable, category-specific template/blueprint**, carry budget/cost/health/risk, and stay lifecycle-synchronised with its originating domain entity.

### Design thesis (the "CPO bet")

> **Every project is an instance of a process blueprint or a project template, scoped to a vertical, category, and product/service type. Every unit of work is a `unified.tasks` row. Every assignment is a first-class allocation against a capacity-bearing resource. Nothing is a domain-specific exception table.**

This is the natural extension of the **True Task Unification** model already adopted for tasks (see [`../unified/MODULE_SPEC.md`](../unified/MODULE_SPEC.md)). Where unification retired `esm.work_orders` into `unified.tasks`, this module retires the *idea* of per-domain project tables into `unified.projects` + a domain `vertical_payload`/extension row.

### Platform position

```
identity ─┐
core ─────┤ (Composer compiles blueprints → view_configs, display_ids, RLS)
automation┤ (ZWS engine: lifecycle stages → spawn/close/cascade tasks)
unified ──┴─► projects ──► tasks ──► assignments ──► time_entries
                 ▲              ▲
   templates ────┘              └──── requirements ──► capacity/scheduler
   (per category / vertical / product-service type)
                 ▲
   crm.deals · esm.projects(PM) · esm.contracts(recurring) · construction.projects
   (domain extensions, FK-anchored to unified.projects)
```

### What "good" looks like (acceptance at the product level)

- A tenant **picks a template** ("Residential 3-BHK Villa", "CNC Machined Part — Make-to-Order", "Quarterly Preventive-Maintenance Visit", "SaaS Onboarding") and gets a fully-populated project: phases, milestones, tasks, dependencies, default roles/skills, checklists, document requirements, and a baseline schedule — all editable per-project.
- The **same Gantt, board, calendar and workload view** render a CRM-deal delivery, an ESM preventive-care visit, and a ground-up construction project, with zero per-domain UI code.
- A **scheduler/auto-assigner** fills task assignments from a resource pool by matching required role/skill/certification against availability and capacity, flags over-allocation, and respects calendars and time-off.
- A construction PM and a bespoke-manufacturing planner can **fully customise** the template's steps for one specific project without forking the template.

---

## 2. Use Cases & Business Rules

Each use case names actors, trigger, and binding business rules (BR).

### UC-1 — Instantiate a project from a template (manual)
**Actor**: Project Manager · **Trigger**: PM selects a `project_template` and clicks "Create Project".
- BR-1.1: `projects.create_from_template(p_template_id, p_overrides)` materialises one `unified.projects` row plus all template-defined `phases`, `milestones`, `tasks`, `task_dependencies`, `task_requirements`, and `checklists`.
- BR-1.2: Template selection is filtered by `(vertical, category, product_service_type)` so a residential builder never sees a SaaS-onboarding template. Templates are **Group-2 System Config (Additive)** — global library rows + tenant-authored rows coexist (see CLAUDE.md §3).
- BR-1.3: The baseline schedule is computed from template effort + dependency graph (forward pass from `planned_start_date`). `baseline_start_date`/`baseline_end_date` are frozen at creation.
- BR-1.4: The project, all tasks, and milestones get `intent_type` derived from the template; tasks get `task_type = '<category>'` (e.g. `construction_projects`), never a generic string.
- BR-1.5: Template instantiation is **idempotent per (project_id, template_node_id)** so re-applying a template revision adds only new nodes.

### UC-2 — Project born from a CRM deal won (automated)
**Actor**: ZWS Automation · **Trigger**: `crm.deals` enters `closed_won`.
- BR-2.1: The deal's L1 lifecycle blueprint calls `projects.spawn_from_source('crm','deals',deal_id, p_template_resolver)`.
- BR-2.2: Template is resolved from the deal's `product/service type` (line items / opportunity type) → the correct delivery template. If no template matches, a **blank project shell** is created and flagged `details.template_unresolved=true` for PM triage.
- BR-2.3: The project's `external_references` records the deal; `vertical_payload` carries deal economics (contract value, currency, won_at). The deal row is **FK-anchored** to the project (see §8).
- BR-2.4: Closing/cancelling the deal post-win must **not** silently cancel the project — projects outlive deals. Cascade is opt-in per template.

### UC-3 — Recurring preventive-care project from an ESM contract (scheduled)
**Actor**: ZWS Cron / `automation.wf_scheduled_jobs` · **Trigger**: an `esm.contracts` SLA cadence (monthly/quarterly) fires.
- BR-3.1: A recurrence rule (§6.4) instantiates a **new project per cycle** from the contract's bound preventive-maintenance template ("Quarterly PM Visit — Chiller Plant").
- BR-3.2: Each cycle project inherits the contract's covered assets/locations into `task_requirements` (resource = asset) so the right equipment is scheduled.
- BR-3.3: The cycle project's tasks are field-dispatch tasks (`task_type='esm_projects'`/`esm_tickets`) carrying `vertical_payload` (asset_id, location_id, checklist).
- BR-3.4: Missing a cycle (no completion by `due_date`) raises an `sla_breach` and escalates via the L2 self-lifecycle blueprint.

### UC-4 — Construction project with a fully custom plan
**Actor**: Construction Planner · **Trigger**: Planner instantiates "Residential — Ground-up" template, then edits.
- BR-4.1: The planner may add/remove/reorder phases & tasks, change dependencies (FS/SS/FF/SF + lag), and override durations **without forking the template** — edits live on the project instance, not the template.
- BR-4.2: `construction.projects` extension row holds domain fields (square footage, permits, safety rating) and is FK-anchored to `unified.projects` (§8).
- BR-4.3: Permit/inspection gates are `milestones` of `milestone_type='gate'` with `acceptance_criteria`; tasks downstream of a gate are blocked until the gate completes (a dependency on the gate milestone).
- BR-4.4: Critical-path is recomputed on any schedule edit; tasks on the critical path are flagged `details.on_critical_path=true`.

### UC-5 — "My Work" across every domain (UI)
**Actor**: Any worker · **Trigger**: opens "My Work".
- BR-5.1: One query over `unified.tasks` + `task_assignments` where `assignee = me`, unioned across all `task_type`s. No per-domain branching.
- BR-5.2: Views: List, Board (status columns), Calendar (scheduled_start/end), Gantt (dependencies), Workload (capacity).
- BR-5.3: RLS guarantees a worker sees a task iff assigned, in their team/role scope, or org-visible per template visibility (§9).

### UC-6 — Auto-assignment / capacity-aware scheduling
**Actor**: Scheduler service (or planner clicking "Auto-assign") · **Trigger**: tasks have `task_requirements` but no assignee.
- BR-6.1: `scheduler.suggest_assignments(p_project_id|p_task_ids)` returns ranked candidates per task by matching `required_role/skills/certifications` against resource capabilities, then by availability within `[must_be_available_by, scheduled_end]`, then by lowest current utilisation, then by cost rate.
- BR-6.2: Booking an assignment writes a `resource_allocations` row that consumes capacity from the resource's `resource_calendar`; double-booking beyond `capacity_count` raises an over-allocation warning (soft) or rejection (hard constraint).
- BR-6.3: Re-scheduling a task moves its allocations and re-validates capacity for all affected resources.
- BR-6.4: The scheduler honours time-off (`unavailable_periods`), working hours (`preferred_work_hours`), and location/travel constraints.

### UC-7 — Time tracking → effort rollup → billing
**Actor**: Worker · **Trigger**: logs time on a task.
- BR-7.1: `time_entries` capture (user, task, start, end, duration, description, billable, cost_rate snapshot).
- BR-7.2: A trigger rolls `SUM(duration)` into `tasks.effort_actual_hours`, then into `projects.budget_actual` via cost rate.
- BR-7.3: Billable time feeds invoicing (commerce/finance) via `external_references`; approval workflow gates billable status.

### UC-8 — Collaboration & change history
**Actors**: Team · **Trigger**: comments, mentions, attachments, status changes.
- BR-8.1: `work_comments` (threaded, polymorphic to project/task/milestone), `work_attachments` (polymorphic, → `documents`), `activity_log` (append-only event feed) and `notifications` (per-user, `pg_notify` + persisted).
- BR-8.2: Mentions (`@user`) create a notification and an activity event.
- BR-8.3: Every state/assignment/schedule change appends to `activity_log` (who/what/when/old→new).

### UC-9 — Portfolio & program rollup
**Actor**: PMO / Exec · **Trigger**: views portfolio dashboard.
- BR-9.1: Projects nest under programs and portfolios (`portfolio_id`, `program_id` self-referencing via `project_relations` or a `parent_project_id`).
- BR-9.2: Budget, health, progress, and risk **roll up** from child projects via materialised aggregates (§11).

---

## 3. Object Taxonomy & The Three Identity Axes

Every object in this module is classified per CLAUDE.md §3 and tagged on the **three canonical axes** already in use across `unified.*`:

| Axis | Column | Meaning | Example values |
|---|---|---|---|
| **Identity** | `intent_type` | *What domain concept is this?* (inherited from source/template) | `CRM_DEAL`, `ESM_PROJECT`, `CONSTRUCTION_PROJECT`, `BESPOKE_MFG`, `PS_ENGAGEMENT` |
| **Execution nature** | `task_type` / `project_type` | *What kind of execution?* (= source entity / category, never a free string) | `crm_deals`, `esm_projects`, `construction_projects`, `mfg_work_order` |
| **Stage flavour** | `details.task_nature` | *What flavour of step?* (never overloads `task_type`) | `design`, `permit`, `procurement`, `fabrication`, `qa`, `field_dispatch`, `onboarding` |

`state_category` remains the **cross-domain lifecycle bucket** (`NEW`, `IN_PROGRESS`, `CLOSED_WON`, `CLOSED_LOST`, `CANCELLED`) — but human-facing **custom statuses** (Review, QA, Deployed…) live in a new `workflow_statuses` table that *maps onto* a `state_category` (§5.4). This preserves cross-domain automation while giving each template arbitrary board columns.

### Taxonomy-group placement (where each new object lives)

| Object | Group (CLAUDE.md §3/4) | Storage location |
|---|---|---|
| New tables/columns/views/functions | Group 1 — Schema | `supabase/migrations/` |
| `project_templates`, `task_templates`, `workflow_status_sets`, recurrence definitions, the **global** template library | Group 2 — System Config (Additive) | `supabase/seeds/` |
| Tenant zero demo projects, sample templates | Group 3 — Tenant Seed | `supabase/seeds/` |
| Compiled blueprint instances, baseline schedules computed at bootstrap | Group 4 — Post-Deploy | `supabase/post_deploy/` |
| `time_entries`, `activity_log`, `notifications`, `sla_breaches`, scheduler run traces | Group 5 — Ephemeral | live DB only — never seeded |

---

## 4. Feature Completeness Matrix (the "do not miss anything" checklist)

Mapped to leading tools. ✅ = in scope and specified below · ⚙️ = delivered via Composer/blueprint engine · 🔗 = via cross-module integration.

| Domain | Feature | In spec | Where |
|---|---|---|---|
| **Hierarchy** | Portfolio → Program → Project → Phase → Task → Subtask | ✅ | §5.1, §5.3 |
| | Cross-project links (relates-to, blocks, duplicates) | ✅ | §5.9 `project_relations`/`task_links` |
| **Templates** | Project & task templates, per vertical/category/product-service-type | ✅⚙️ | §6 |
| | Blueprint-driven lifecycle (stage→task spawn/close) | ⚙️ | §6.2, §8 |
| | Per-project customisation without forking template | ✅ | §6.3 |
| | Recurring projects/tasks (cron/RRULE) | ✅ | §6.4 |
| **Tasks** | Subtasks (ltree), multiple assignees, priorities, types, codes, tags | ✅ | §5.3, §5.5, §5.10 |
| | Dependencies FS/SS/FF/SF + lead/lag | ✅ | §5.6 `task_dependencies` |
| | Blocked flag + reason, progress %, effort planned/actual | ✅ | §5.3 |
| | Custom statuses / board columns / WIP / swimlanes | ✅ | §5.4 |
| **Milestones** | Gates, deliverables, decisions; acceptance criteria; rollup | ✅ | §5.7 |
| **Checklists** | Per task/milestone, verification/approval | ✅ | §5.8 |
| **Scheduling** | Baseline vs planned vs actual, critical path, Gantt, lag | ✅ | §7.1 |
| | Calendars, working hours, holidays, time-off | ✅ | §7.2 |
| **Capacity / Resourcing** | Resource pool, skills/certs, availability, allocation, over-allocation, levelling | ✅ | §7.3 |
| | Auto-assignment / scheduler suggestions | ✅ | §7.4 |
| | Cost rates, billable, budget burn | ✅ | §5.11, §7.5 |
| **Agile** | Sprints/iterations, backlog, velocity, burndown | ✅ | §5.12, §11 |
| **Time tracking** | Per-user entries, timers, approval, billable | ✅ | §5.11 |
| **Collaboration** | Comments, mentions, attachments, activity feed, watchers, notifications | 🔗 | §5.13, §5.15 — reuse `core.object_*` |
| **Custom fields** | Typed, validated, indexed custom fields per template | ✅⚙️ | §6.5 (via `core.forms`/`process_templates`) |
| **Tags/labels** | Polymorphic many-to-many | 🔗 | §5.10 — reuse `core.object_tags` |
| **Links/relations** | Cross-object links (relates/blocks/duplicates) | 🔗 | §5.9 — reuse `core.object_relations` |
| **Reporting** | Dashboards, burndown/up, CFD, utilisation, variance, health | ✅ | §11 |
| **Automation** | Generic rule engine beyond stage transitions | ⚙️ | §6.2 (ZWS), §6.6 |
| **Cross-domain** | CRM/ESM/contracts/construction native coupling | ✅🔗 | §8 |
| **Multi-tenancy** | org_id + RLS, SaaS-admin, role impersonation | ✅ | §9 |
| **Budget/health/risk** | Planned/actual/remaining, health score, risk score | ✅ | §5.1 |
| **Spreadsheet view** | Smartsheet-style grid (editable columns) | ✅ | §10 (flat fetch + column meta) |
| **MS-Project import** | MPP/MPX/XML & CSV import to tasks+deps | ✅ | §10.4 |

---

## 5. Canonical Schema (build DDL to match this)

> Convention: every table carries the platform-standard columns — `id uuid`, `organization_id uuid NOT NULL`, `display_id text`, `created_at/updated_at`, `created_by/updated_by`, `is_active`, `is_on_hold`, `details jsonb`, `search_vector`, and the three identity-axis columns where applicable. Only the **distinctive** columns are listed below. All FKs are `ON DELETE` specified explicitly. Schema = `unified` unless noted.

### 5.1 `unified.projects` (extend existing)
Anchor for ALL projects. Existing columns (dates, budget_*, health_*, progress_overall, risk_score, external_references, vertical_payload, RACI, PERT) are retained. **Add**:

| Column | Type | Purpose |
|---|---|---|
| `template_id` | uuid → `project_templates.id` | Provenance of the plan |
| `template_version` | text | Which template revision was instantiated |
| `parent_project_id` | uuid → self | Program/portfolio nesting |
| `relation_role` | text CHECK in (`portfolio`,`program`,`project`,`subproject`) | Position in hierarchy |
| `category` | text | Product/service category driving template choice |
| `product_service_type` | text | Finer template selector (e.g. `villa_3bhk`, `cnc_part`) |
| `default_status_set_id` | uuid → `workflow_status_sets.id` | Board columns for this project |
| `currency` | char(3) | Budget currency |
| `cost_actual` | numeric(15,2) | Rolled-up labour+material cost |
| `priority` | text | Project priority |
| `sponsor_id` / `manager_id` | uuid → identity user | Convenience denorm of RACI for indexing |
| `portfolio_rollup` | jsonb | Cached child rollup (budget/health/progress) |

### 5.2 `unified.project_phases` (new)
Grouping layer between project and task (WBS level). Optional but expected by Gantt/MS-Project parity.

| Column | Type | Purpose |
|---|---|---|
| `project_id` | uuid → projects (CASCADE) | Owner |
| `name`, `sequence_order` | text, int | WBS ordering |
| `planned_start/end`, `actual_start/end`, `baseline_start/end` | date | Phase schedule |
| `progress_percentage` | int 0–100 | Rollup from tasks |
| `gate_milestone_id` | uuid → milestones | Phase-exit gate |

### 5.3 `unified.tasks` (extend existing)
Existing columns retained (hierarchy via `parent_task_id`+`path` ltree+`depth`, `depends_on[]` *(deprecated in favour of §5.6 table)*, scheduled/actual, effort_*, progress, is_blocked/blocking_reason, metrics, vertical_payload, esm_instance_id, process_blueprint_id). **Add**:

| Column | Type | Purpose |
|---|---|---|
| `phase_id` | uuid → project_phases | WBS grouping |
| `status_id` | uuid → workflow_statuses | Custom status (board column) — `state_category` stays as the mapped bucket |
| `sprint_id` | uuid → sprints | Agile iteration |
| `milestone_id` | uuid → milestones | Task contributes to milestone |
| `task_template_id` | uuid → task_templates | Provenance |
| `recurrence_rule_id` | uuid → recurrence_rules | If recurring |
| `estimate_method` | text (`pert`,`story_points`,`hours`) | Estimation basis |
| `story_points` | numeric | Agile sizing |
| `billable` | boolean | Default billability |

> **`depends_on uuid[]` is retained read-only for backward compatibility but new dependency semantics (type + lag) live in `task_dependencies` (§5.6). A view keeps the array in sync for legacy consumers.**

### 5.4 `unified.workflow_status_sets` + `unified.workflow_statuses` (new) — **System Config (Additive)**
Custom, per-template/per-project board columns mapped onto cross-domain `state_category`.

`workflow_status_sets`: `id`, `organization_id` (nullable for global), `name`, `applies_to` (`project`|`task`), `category` (vertical/product-service scope).

`workflow_statuses`:

| Column | Type | Purpose |
|---|---|---|
| `status_set_id` | uuid → sets | Owner set |
| `name`, `slug` | text | "In Review", `in_review` |
| `state_category` | text | The cross-domain bucket this maps to (drives automation & RLS) |
| `sequence_order` | int | Board column order |
| `color`, `is_default`, `is_terminal` | … | Board rendering |
| `wip_limit` | int null | Kanban WIP cap |

### 5.5 `unified.task_assignments` (new) — **the missing M2M**
First-class multi-assignee model (replaces stuffing assignees in RACI).

| Column | Type | Purpose |
|---|---|---|
| `task_id` | uuid → tasks (CASCADE) | Work |
| `assignee_id` | uuid → identity user / `unified.contacts` | Who (resource) |
| `assignee_kind` | text (`user`,`contact`,`team`,`role`) | Polymorphic assignee |
| `assignment_role` | text (`responsible`,`reviewer`,`watcher`,`approver`) | Why |
| `allocation_pct` | numeric | Share of their capacity on this task |
| `estimated_hours`, `actual_hours` | numeric | Per-assignee effort |
| `assigned_at`, `assigned_by`, `accepted_at` | … | Audit/acceptance |

Unique `(task_id, assignee_id, assignment_role)`. RACI JSON kept for high-level accountable/consulted; **responsible** is now the assignments table.

### 5.6 `unified.task_dependencies` (new)
Replaces FS-only `depends_on[]`.

| Column | Type | Purpose |
|---|---|---|
| `predecessor_id`, `successor_id` | uuid → tasks (CASCADE) | Edge |
| `dependency_type` | text CHECK (`FS`,`SS`,`FF`,`SF`) | Relation |
| `lag_minutes` | int (may be negative = lead) | Lead/lag |
| `is_hard` | boolean | Hard (scheduling) vs soft (advisory) |

Unique `(predecessor_id, successor_id, dependency_type)`; CHECK `predecessor_id <> successor_id`; a cycle-prevention trigger.

### 5.7 `unified.milestones` (extend existing)
Existing (due/completed dates, `milestone_type` gate/deliverable/decision/external/integration, acceptance_criteria, contributing_task_ids). **Add**: `phase_id`, `status` (open/met/missed/waived), `owner_id`, `is_billing_trigger` (boolean — milestone billing), `weight` (for weighted progress rollup).

### 5.8 `unified.checklists` (extend existing)
Retained. **Add**: `requires_approval` (bool), `approval_status`, `blocks_completion` (bool — task can't close until checklist done). `items` JSONB item schema: `{id, label, done, done_by, done_at, required, evidence_doc_id}`.

### 5.9 Cross-links — **REUSE `core.object_relations`** (do NOT build new)
Non-hierarchical links (relates-to / blocks / duplicates / causes) are already provided polymorphically by `core.object_relations(source_object_id, target_object_id, relation_type)`, anchored on `core.unified_objects`. Every project/task/milestone already has a `core.unified_objects` row (Composer Tier-0.5). The module adds **no** `task_links`/`project_relations` tables — it standardises `relation_type` vocabulary (`relates_to`,`blocks`,`duplicates`,`causes`,`parent_program`,`portfolio_of`). See §5.15.

### 5.10 Tags — **REUSE `core.object_tags`** (do NOT build new)
`core.object_tags(object_id → unified_objects, tag, tag_category, color, organization_id)` already provides polymorphic tagging for any object. The module adds **no** tag tables; it only defines tag-category conventions for PM (e.g. `priority`, `discipline`, `phase`). See §5.15.

### 5.11 `unified.time_entries` (new) — **Ephemeral/transactional**
| Column | Type | Purpose |
|---|---|---|
| `task_id` | uuid → tasks (CASCADE) | Work |
| `assignment_id` | uuid → task_assignments | Which hat |
| `contact_id`/`user_id` | uuid | Who logged |
| `start_time`,`end_time`,`duration_minutes` | … | Span (timer or manual) |
| `description` | text | Notes |
| `billable` | boolean | Billing flag |
| `cost_rate_snapshot`, `bill_rate_snapshot` | numeric | Rate at time of entry |
| `approval_status` | text (`draft`,`submitted`,`approved`,`rejected`) | Timesheet gate |

Trigger: rolls `SUM(duration)` → `tasks.effort_actual_hours`; cost → `projects.cost_actual`/`budget_actual`.

### 5.12 `unified.sprints` (new)
| Column | Type | Purpose |
|---|---|---|
| `project_id` | uuid → projects | Owner (or program-level) |
| `name`, `goal` | text | Iteration |
| `start_date`,`end_date` | date | Window |
| `status` | text (`planned`,`active`,`closed`) | State |
| `capacity_points`/`capacity_hours` | numeric | Committed capacity |

Tasks reference `sprint_id` (§5.3). Backlog = tasks with `sprint_id IS NULL`.

### 5.13 Collaboration — **REUSE the `core.object_*` layer** (do NOT build new)
Comments, attachments, activity feed, and watchers are already provided by the platform's polymorphic cross-cutting layer, anchored on `core.unified_objects` (every project/task/milestone has a `unified_objects` row via Composer). The module builds **none** of these tables — it consumes them:

| PM need | Reuse | Notes |
|---|---|---|
| Threaded comments + @mentions | `core.object_comments` (`parent_id`, `content`, `is_internal`) | mentions parsed from `content`/`metadata` → `notifications` |
| Attachments | `core.object_attachments` (`file_url`, `file_type`, `category`) | links to `documents` via `metadata` |
| Activity feed / audit | `core.object_activities` (`activity_type`, `actor_id`, `data`) | every status/assignment/schedule change appends here |
| Watchers / followers | `core.object_subscriptions` (`user_id`, `subscription_type`) | drives who gets notified |

The **only** net-new collaboration table is delivery-side fan-out:
- `unified.notifications(user_id, type, payload jsonb, object_id → unified_objects, read_at)` — `pg_notify('unified_notify', …)` + persisted inbox. Subscriptions (`object_subscriptions`) decide *who*; this table records *what was delivered*. **Ephemeral.**

> **Correctness note**: an earlier draft proposed `unified.work_comments/work_attachments/activity_log/tags/task_links`. Those are **rejected** — they duplicate `core.object_*`. This section supersedes that.

### 5.14 Capacity & scheduling tables (new) — see §7
- `cal.blocked_windows` & `cal.availability_rules` — the deterministic Slot Engine that handles working hours, holidays, and external synced events per resource (user/contact/asset).
- `unified.resource_allocations` — booked capacity windows per resource per task (the supply-side ledger).
- `unified.resource_pools` + `unified.resource_pool_members` — named pools (e.g. "North Zone Electricians", "CNC Cell B") that the scheduler draws from; a member is a `contact`/`asset`. Replaces the POC's `scheduler.y_resource_pools`.
- `unified.recurrence_rules` — RRULE/cron for recurring tasks & projects.
- `unified.task_requirements` (existing) — the **demand** side (role/skill/cert/material/asset/document/approval). Retained as-is; it is the input to the scheduler.

### 5.15 Cross-cutting anchoring — `core.unified_objects` + `core.object_*`
Every PM object (`unified.projects`, `tasks`, `milestones`, `phases`) is anchored by exactly one `core.unified_objects(urn, object_type, entity_schema, entity_type, …)` row, created by Composer Tier-0.5. That URN anchor is what makes the following **free and uniform** across all object types — no per-table collaboration plumbing:

| Capability | Table | FK |
|---|---|---|
| Comments (threaded) | `core.object_comments` | `object_id → unified_objects.id` |
| Attachments | `core.object_attachments` | `object_id → unified_objects.id` |
| Tags | `core.object_tags` | `object_id → unified_objects.id` |
| Activity / audit feed | `core.object_activities` | `object_id → unified_objects.id` |
| Relations / links | `core.object_relations` | `source/target_object_id → unified_objects.id` |
| Watchers / subscriptions | `core.object_subscriptions` | `object_id → unified_objects.id` |
| Type registry | `core.object_type_registry` | `(object_type, entity_schema, entity_type)` |

**Design rule for this module**: when a feature is "attach X to a work object" (comment, file, tag, link, follow, audit entry), it is implemented by writing to `core.object_*` against the object's URN — **never** by adding a column or a side table in `unified.*`. New `unified.*` tables are reserved for *structural* PM data (assignments, dependencies, statuses, phases, time, allocations, calendars, sprints, recurrence) that has its own schema and query patterns.

---

## 6. Template & Blueprint Engine (the heart of the module)

Two complementary mechanisms — **declarative templates** (the catalog of reusable plans) and **process blueprints** (the runtime lifecycle automation). A template *produces structure*; a blueprint *drives behaviour over time*.

### 6.1 `project_templates` & `task_templates` — **System Config (Additive)**

`project_templates`:

| Column | Purpose |
|---|---|
| `id`, `organization_id` (NULL = global library) | Tenancy (Additive pattern) |
| `name`, `description`, `version` | Catalog identity |
| `vertical`, `category`, `product_service_type` | **Selector keys** (filters which templates a tenant sees per project type) |
| `intent_type` | Identity axis stamped on instantiated project |
| `default_status_set_id` | Board columns |
| `default_phases` jsonb | Ordered WBS phases |
| `default_milestones` jsonb | Gates/deliverables w/ acceptance criteria |
| `default_roles` jsonb | Required roles/skills for staffing |
| `budget_model` jsonb | Cost template (rate cards, contingency %) |
| `custom_field_schema` | → links to `core.forms`/`process_templates.vertical_schemas` (§6.5) |
| `recurrence_rule_id` | If template is a recurring obligation (PM visits) |
| `source_binding` jsonb | How this template is auto-resolved from a domain entity (§8) |

`task_templates` (children of a project template, also reusable standalone):

| Column | Purpose |
|---|---|
| `template_id` → project_templates | Parent plan |
| `node_key` | Stable id for idempotent re-apply |
| `name`, `task_type`, `details.task_nature` | Identity axes |
| `phase_key` | WBS placement |
| `default_effort_hours`, `default_duration_minutes` | Estimation |
| `depends_on_node_keys` jsonb (type+lag) | Template-level dependency graph |
| `required_role/skills/certifications` | Feeds `task_requirements` on instantiate |
| `default_checklist` jsonb | Seeds a checklist |
| `is_milestone`, `milestone_type` | Milestone nodes |

### 6.2 Two-layer blueprint model (already established — extend it)
Reuses the **L1 source / L2 self-lifecycle** pattern from `post_deploy/task_unification/`:

- **L1 source blueprint** (on `crm.deals`, `esm.projects`, `esm.contracts`, `construction.projects`): on stage entry → `projects.spawn_from_source(...)` / `spawn_stage_task(...)`; on stage exit → `unified.auto_close_stage_task(...)`; on cancel → `unified.util_cascade_cancel_children(...)`.
- **L2 self-lifecycle blueprint** (on `unified.tasks`/`unified.projects`, `partition_filter` = single equality on `task_type`/`project_type`): handles sub-state escalation (BLOCKED → notify, ON_HOLD → notify), SLA breaches, and progress rollups. Actions limited to `send_email`/`update_entity`/`rpc` (never `create_entity`) per the engine constraints documented in the task-unification README.

**Engine constraints carried forward (non-negotiable):**
- `scheduled_end` is **never** set in blueprint payloads — derived by `unified.tasks_compute_schedule()` from `scheduled_start + effort_planned_hours`.
- `partition_filter` uses single equality only (no `IN(...)`).
- `raci.responsible` = a concrete user column; `raci.accountable` = a role token.

### 6.3 Per-project customisation without forking
- Template instantiation **deep-copies** structure into instance tables; subsequent edits mutate the instance, never the template.
- `projects.template_version` records the revision; a `projects.diff_from_template()` function reports drift (added/removed/modified nodes) for governance.
- "Re-sync from template" applies only **new** template nodes (matched by `node_key`), never clobbering instance edits — idempotent (BR-1.5).
- Saving a customised project back as a new template = `projects.save_as_template(p_project_id, p_scope)` → writes new global/tenant `project_templates` + `task_templates`.

### 6.4 Recurrence (`recurrence_rules`) — recurring tasks & projects
| Column | Purpose |
|---|---|
| `rrule` text (iCal RRULE) / `cron_expr` | Cadence |
| `anchor` (`project`,`task`,`contract`) | What recurs |
| `template_id` | What to instantiate each cycle |
| `next_run_at`, `until`, `count` | Scheduling bounds |
| `lead_time_days` | Create the cycle N days before due |

A `cron.schedule()` job (post-deploy, per CLAUDE.md §4) invokes `projects.materialise_recurrences()` which instantiates due cycles. ESM-contract preventive care (UC-3) is the canonical consumer.

### 6.5 Custom fields (typed, validated)
Custom fields are **not** loose `details` keys. They are defined per template via `core.forms` + `process_templates.vertical_schemas` (Composer), giving JSON-Schema validation, UI schema, and indexed generated columns where `is_searchable=true` (per architectural-principles: native JSONB arrays, `#>>` extraction, generated columns for indexed fields). The template's `custom_field_schema` points at the form definition.

### 6.6 Generic automation rules
Beyond stage transitions, the ZWS engine (`automation.wf_rules`/`wf_actions`) supports event-condition-action rules (e.g. "when `priority` → high, notify `accountable`"; "when `due_date` within 24h and progress < 50%, escalate"). These compile from the template's `automation` block and from tenant-authored rules — no new engine, reuse `automation.*`.

---

## 7. Scheduling & Capacity Planning

This is the differentiator most PM tools gate behind premium tiers. It must be first-class and **unified** (same engine for a field tech, a CNC machine, and a structural engineer).

### 7.0 No `scheduler.*` schema — the solver is a stateless service
> **Decision (2026-06-11)**: The legacy `scheduler.*` POC schema (`y_projects`, `y_tasks`, `y_dependencies`, `y_resources`, `y_resource_pools`, `y_resource_skills`, `y_resource_unavailability`, `y_shifts`, `y_task_requirements`, `y_materials`, `y_etl_*`, `y_planning_requests`, …) is **decommissioned and will not be carried forward.** It was an OR-Tools auto-assignment POC built as a *shadow* schema fed by `y_etl_*` mappers — a parallel copy of project/task/resource data purely so a CP-SAT solver could read a denormalised view. It is already retired (renamed `x_scheduler_old` in v5, absent from v6 migrations).

Every concept the POC modelled is now native to `unified.*`, so the shadow schema and its ETL are pure liability:

| Legacy `scheduler.y_*` | Native replacement |
|---|---|
| `y_projects`, `y_tasks`, `y_dependencies` | `unified.projects`, `unified.tasks`, `unified.task_dependencies` (§5.6) |
| `y_resources`, `y_skills`, `y_resource_skills` | `unified.contacts` (skills[], certifications[], rates), `unified.assets` |
| `y_resource_pools`, `y_resource_pool_members` | `unified.resource_pools` (small new table, §7.3) |
| `y_resource_unavailability`, `y_shifts` | `cal.blocked_windows` & `cal.availability_rules` (§7.2) |
| `y_task_requirements`, `y_task_material_requirements`, `y_materials` | `unified.task_requirements` (existing) |
| `y_planning_requests` | transient solver run + result, no table (edge fn) |
| `y_etl_*`, `y_etl_resource_mapping` | **eliminated** — the solver reads `unified.*` directly via a read view |

**Going forward**: the OR-Tools (CP-SAT) capability survives as a **stateless edge function** `project-scheduler` (§10.5) that (a) reads a normalised view of `unified.tasks`/`task_dependencies`/`task_requirements`/`cal.blocked_windows`/`resource_allocations`, (b) solves the assignment + sequencing problem, (c) writes results straight back as `task_assignments` + `resource_allocations` rows. No persistent solver schema, no ETL, no shadow copy. For lighter cases the in-DB `scheduler.*` RPCs (§10.3) — note: **function namespace, not a table schema** — do a set-based pass without the solver.

### 7.1 Scheduling engine
- **Forward/backward pass** over `task_dependencies` (FS/SS/FF/SF + lag) computes early/late start/finish and **slack**; zero-slack chain = **critical path** (`details.on_critical_path=true`).
- Three date layers per task/phase/project: **baseline** (frozen at creation), **planned** (current schedule), **actual** (as executed) → variance analytics (§11).
- `scheduler.recompute_schedule(p_project_id)` runs the pass; triggered on any dependency/effort/calendar edit. Pure SQL/PLpgSQL set-based where possible; heavy graphs offloaded to an edge function if needed.
- Gantt is "for free": `tasks_compute_schedule()` already derives bars from `scheduled_start + effort_planned_hours`; the dependency pass refines start times.

### 7.2 Calendars & The `cal` Engine
Per resource (user/contact/asset): working days/hours, public holidays (per location), and time-off are modeled deterministically by the `cal` slot engine (`cal.availability_rules` and `cal.blocked_windows`). The scheduler explicitly penalizes and detects BOTH internal capacity limits (`unified.resource_allocations`) and strict blocking events from external synchronized calendars (like Google/Outlook). Project-level calendar (org working calendar) is the default; resource calendars override.

### 7.3 Capacity model — demand vs supply
- **Demand**: `task_requirements` (existing) — each task declares required role/skill/cert/asset/material, quantity, phase, hard/soft, `must_be_available_by`.
- **Supply**: resource capabilities live on `unified.contacts` (skills[], certifications[], billing rates, availability) and `unified.assets` (capacity_count, cost_per_hour/day, availability_schedule).
- **Ledger**: `resource_allocations` books `(resource, task, start, end, allocation_pct/units)` against capacity. Utilisation = Σ allocations / capacity over a window.
- **Over-allocation**: booking beyond `capacity_count`/100% raises a soft warning (visible in workload view) or hard rejection (if requirement `is_hard_constraint`).
- **Levelling**: `scheduler.level_resources(p_project_id)` shifts non-critical tasks within slack to remove over-allocation.

### 7.4 Auto-assignment (`scheduler.suggest_assignments`)
Ranking pipeline per unassigned task:
1. **Eligibility** — resource capabilities ⊇ required role/skills/certifications.
2. **Availability** — free capacity within `[must_be_available_by, scheduled_end]` evaluated against `unified.resource_allocations` AND `cal.blocked_windows`.
3. **Utilisation** — prefer least-loaded (load-balancing).
4. **Cost** — prefer lowest blended cost rate (configurable: cost vs speed).
5. **Geographic Fencing & Continuity** — requires strict matching via `cal.resource_territories` for field work locations; prefers same resource across a project's related tasks.
Returns ranked candidates; booking writes `task_assignments` + `resource_allocations` atomically and re-validates capacity (BR-6.2/6.3).

### 7.5 Cost & budget
- Labour cost = Σ `time_entries.duration × cost_rate_snapshot`; material cost from `task_requirements` (material) + inventory issue.
- Rolls to `projects.cost_actual`/`budget_actual`; `budget_remaining` is the existing generated column.
- Earned Value (optional): PV/EV/AC, CPI/SPI from baseline vs actual (§11).

---

## 8. Cross-Domain Integration Contract

The whole point: **one project engine, many origins.** Domain entities become **extensions of `unified.projects`**, not parallel project tables. Two binding patterns coexist (consistent with the existing dedup migration `202606010095_project_domain_dedup.sql`):

### 8.1 Pattern A — Project anchoring (domain *is* a project)
`crm.deals` (delivery), `esm.projects` (service project), `construction.projects` (build), `mfg` work orders → each FK-anchors to a `unified.projects` row and keeps only domain-specific columns locally (their identity columns are already deduped into the unified anchor). The unified anchor owns name/display_id/state_category/lifecycle; the domain row owns `total_square_feet`, `permit_status`, `contract_value`, etc.

- Composer Tier-0.5 triggers sync domain → unified anchor (already the mechanism per dedup migration).
- The domain extension row is reached via `projects.vertical = '<schema>'` + `vertical_payload`, or a typed FK column on the extension table (`construction.projects.unified_project_id`).

### 8.2 Pattern B — Task source-linkage (domain *spawns* tasks/projects)
For stage-driven work (the established model), tasks carry the **source-entity contract** in `details`:

```json
{
  "source_entity_id": "uuid",
  "source_entity_schema": "esm",
  "source_entity_type": "contracts",
  "source_stage_id": "quarterly_cycle",
  "source_display_id": "CON-2207"
}
```

- `projects.spawn_from_source(schema,type,id,template_resolver)` — creates a project (Pattern A) from a source entity at a lifecycle stage.
- `unified.auto_close_stage_task(...)` / `util_cascade_cancel_children(...)` — existing lifecycle sync functions, reused unchanged.

### 8.3 The four canonical origins (explicitly specified)

| Origin | Trigger | Becomes | Template resolver key |
|---|---|---|---|
| `crm.deals` won | stage → `closed_won` | A delivery **project** (Pattern A) | deal product/service type |
| `esm.tickets` scheduled | stage → `Scheduled` | A field-dispatch **task** in an existing project (Pattern B) | ticket work_order_type |
| `esm.projects` (preventive) | created/activated | A service **project** (Pattern A) | service catalog item |
| `esm.contracts` (recurring) | cron cadence | A **new project per cycle** (Pattern A + recurrence §6.4) | contract's PM template |
| `construction.projects` | created | A build **project** (Pattern A), fully custom plan | building/project type |

### 8.4 Vertical payload validation
Each `task_type`/`project_type` may carry a JSON-Schema CHECK on `vertical_payload` (as `valid_esm_tickets_payload` does today). Construction, mfg, and PS verticals each get a schema. This keeps domain data structured without domain tables.

---

## 9. RLS & Multi-Tenancy

All tables follow the platform's four-persona model (UI user, AI agent, channel bot, anon) and the seven templates (see `/rls-and-auth`). Use `identity.rls_recommend_policy(schema, entity)` — never hardcode.

| Object | Likely template | Notes |
|---|---|---|
| `projects`, `project_phases`, `milestones` | `standard` (tenant-scoped) + `analytical` for rollups | org-isolated; SaaS-admin bypass |
| `tasks`, `task_assignments` | `workforce` / `user_scope` | a worker sees tasks they're assigned to or in team/role scope |
| `task_requirements`, `resource_allocations` | `workforce` | resource ops (cal engine uses its own RLS) |
| `time_entries` | `user_scope` | own entries + manager approval scope |
| `project_templates`, `task_templates`, `workflow_status_sets`, `workflow_statuses` | `configuration` (Additive) | global library rows + tenant rows coexist; SaaS-admin sees all |
| `work_comments`, `work_attachments`, `activity_log`, `notifications` | `standard` + author scope | mentions widen read scope |
| `tags`, `object_tags` | `configuration` | shared vocab |

- `service_role` (channel bots, ZWS engine, scheduler edge fn) **bypasses RLS** → it MUST filter `organization_id` explicitly in every statement (GOVERNANCE rule).
- SaaS-admin three modes apply (global config / tenant-context / role impersonation) per CLAUDE.md §8.
- Template visibility: a template with `organization_id IS NULL` is the **global library** (visible to all, editable only by SaaS-admin); tenant copies override per Additive pattern.

---

## 10. Backend API Surface (RPC contracts)

All RPCs are `SECURITY DEFINER`, `format()` with `%I/%L`, header docblock, and a `p_dry_run` where they mutate (per architectural-principles). Exposed through the platform's logical fetch/upsert layer (`api_new_core_upsert_data`, `/api/v4/logical/fetch/...`).

### 10.1 Lifecycle / instantiation
- `projects.create_from_template(p_template_id, p_overrides jsonb, p_dry_run) → project_id`
- `projects.spawn_from_source(p_schema, p_type, p_id, p_template_resolver, p_dry_run) → project_id`
- `projects.save_as_template(p_project_id, p_scope text('global'|'tenant')) → template_id`
- `projects.diff_from_template(p_project_id) → jsonb`
- `projects.materialise_recurrences() → int` (cron-invoked)

### 10.2 Work management
- `tasks.upsert(...)`, `tasks.set_status(p_task_id, p_status_id)` (maps to `state_category`), `tasks.add_dependency(...)`, `tasks.block/unblock(...)`.
- `tasks.assign(p_task_id, p_assignee, p_role, p_allocation_pct)` → writes assignment + allocation.
- `checklists.toggle_item(...)`, `milestones.mark(...)`.

### 10.3 Scheduling / capacity
- `scheduler.recompute_schedule(p_project_id)` → critical path + dates.
- `scheduler.suggest_assignments(p_scope) → ranked jsonb`.
- `scheduler.level_resources(p_project_id, p_dry_run)`.
- `scheduler.workload(p_resource_ids, p_window) → utilisation jsonb`.

### 10.4 Import / export / grid
- `projects.import_msproject(p_payload)` — MPP/MPX/XML/CSV → tasks + dependencies (edge function parses, RPC ingests).
- Smartsheet-style grid: the existing logical fetch returns flat rows + a column-meta descriptor (from `core.view_configs`) so the UI renders an editable grid with inline upsert.

### 10.5 Edge functions (per `SDD/edge_functions_architecture.md`)
- `project-scheduler` — heavy critical-path / levelling graph work (offloaded from PG).
- `project-importer` — file parsing (MPP/CSV/Excel).
- `notification-fanout` — `pg_notify` → email/push/WA bridge (reuses WA module).

---

## 11. Analytics & Reporting

Materialised views / aggregate tables (Group 4 post-deploy refresh, never seeded):
- `v_project_health` — health/risk/progress/budget burn per project, rolled to program/portfolio.
- `v_burndown` / `v_burnup` — sprint & project remaining vs ideal (story points / hours).
- `v_cumulative_flow` — task counts per status over time (board CFD).
- `v_velocity` — completed points per closed sprint.
- `v_resource_utilisation` — allocation vs capacity per resource per week (workload heatmap).
- `v_schedule_variance` — baseline vs actual (SV/SPI, CV/CPI earned-value).
- `v_milestone_status` — gate/deliverable on-track/missed.

Each is org-scoped via `analytical` RLS template. Refresh cadence via `cron.schedule()` in post-deploy.

---

## 12. Testing Strategy

Phased per the testing module convention (Schema → RPC → Trigger → Edge → E2E). Representative cases:

1. **Template instantiation** — `create_from_template('Residential 3-BHK')` produces N phases, M tasks, the dependency graph, baseline dates; re-apply is idempotent (no dupes by `node_key`).
2. **Cross-domain spawn** — set a `crm.deals` row to `closed_won` → assert a `unified.projects` row exists, template resolved by product type, deal FK-anchored.
3. **Recurring contract** — advance an `esm.contracts` quarterly cadence → assert one new cycle project per period, covered assets in `task_requirements`.
4. **Custom plan** — instantiate construction template, add a phase + reorder deps → assert critical path recomputes and template is untouched (`diff_from_template` shows drift).
5. **Multi-assignee** — assign 3 users to a task → "My Work" returns the task for each; capacity ledger reflects allocations.
6. **Capacity guard** — over-book a resource past `capacity_count` with a hard requirement → assert rejection; soft → warning row.
7. **Dependency types** — SS+lag and FF dependencies shift successor dates correctly; cycle insert rejected.
8. **Time rollup** — log `time_entries` → `tasks.effort_actual_hours` and `projects.cost_actual` update via trigger.
9. **Status mapping** — set a custom status "In Review" → `state_category` resolves to `IN_PROGRESS`; cross-domain automation still fires.
10. **RLS matrix** — UI user, AI agent, channel bot (service_role with explicit org filter), anon — each persona's visibility verified via `/rls-bash`.
11. **Vertical payload negative test** — insert a `construction_projects` task missing required payload key → CHECK rejects (mirrors `valid_esm_tickets_payload`).

---

## 13. Phased Delivery Plan

| Phase | Scope | Outcome |
|---|---|---|
| **P0 — Foundations** | Extend `unified.projects`/`tasks`; add `task_assignments`, `task_dependencies`, `workflow_status_sets/statuses` | Multi-assignee + custom statuses + real dependencies — closes the top-3 gaps |
| **P1 — Templates** | `project_templates`/`task_templates`, `create_from_template`, `save_as_template`, global library seed | Repeatable project setup per vertical/category |
| **P2 — Cross-domain** | L1/L2 blueprints for `crm.deals`/`esm.projects`/`esm.contracts`/`construction.projects`; `spawn_from_source`; recurrence | One engine, four origins |
| **P3 — Scheduling & capacity** | `task_dependencies` pass + critical path; `resource_calendars`/`resource_allocations`; `suggest_assignments`; levelling | Capacity-aware auto-scheduling |
| **P4 — Time, collab, agile** | `time_entries` + rollups; comments/attachments/activity/notifications; sprints/backlog | Team-collaboration parity |
| **P5 — Analytics & import** | Materialised views (health/burndown/CFD/utilisation/EV); MS-Project & CSV import; grid view | PMO dashboards + migration on-ramp |

> P0–P2 deliver the "ERP-grade, template-driven, cross-domain" thesis; P3–P5 reach feature parity with ClickUp/Zoho/MS-Project for the standalone PM user.

---

## 14. Open Decisions (flagged for the team)

1. **Assignee identity**: are field workers `identity.users` only, or also `unified.contacts` (subcontractors)? Spec assumes polymorphic `assignee_kind` to cover both.
2. **`depends_on[]` deprecation**: keep the sync view indefinitely, or hard-cut once consumers migrate to `task_dependencies`?
3. **Scheduler location**: PLpgSQL set-based pass vs edge-function graph engine — threshold for offload (task count?).
4. **Template governance**: who can publish to the **global** library (SaaS-admin only?) and how are versioned upgrades pushed to tenants who customised?
5. **Earned-value**: in scope for P5 or deferred — depends on finance-module rate-card maturity.

---

*Cross-references*: [`../unified/MODULE_SPEC.md`](../unified/MODULE_SPEC.md) (task unification model) · `supabase/post_deploy/task_unification/` (L1/L2 blueprint reference implementation) · `supabase/migrations/202606010095_project_domain_dedup.sql` (Pattern-A anchoring) · CLAUDE.md §3–§4 (taxonomy) · `.agent/skills/rls-and-auth/SKILL.md` (RLS).
