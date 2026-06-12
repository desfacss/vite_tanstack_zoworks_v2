

- **§1–2 Thesis & use cases** — the central bet: *every project is an instance of a process blueprint or a template scoped to (vertical, category, product/service type); every unit of work is a `unified.tasks` row; every assignment is a first-class allocation against a capacity resource — no domain-specific exception tables.* Nine use cases cover template instantiation, CRM-deal-won → delivery project, **ESM-contract → recurring preventive-care project per cycle**, fully-custom construction plans, "My Work" across domains, auto-assignment, time→billing, collaboration, portfolio rollup.
- **§3 Three identity axes** — `intent_type` / `task_type` / `details.task_nature`, reusing the exact convention from `post_deploy/task_unification/`, plus where each new object lands in the 5-group taxonomy.
- **§4 Feature-completeness matrix** — mapped against Asana/ClickUp/monday/Zoho/MS-Project/Smartsheet/ProofHub so nothing generic is missed.
- **§5 Canonical schema** — extends existing `unified.projects`/`tasks`/`milestones`/`checklists` and adds the missing tables: `task_assignments`, `task_dependencies` (FS/SS/FF/SF+lag), `workflow_status_sets/statuses`, `project_phases`, `sprints`, `time_entries`, `tags`, comments/attachments/activity/notifications, and the capacity tables.
- **§6 Template & blueprint engine** — declarative `project_templates`/`task_templates` (Additive config: global library + tenant rows) **plus** the established L1-source / L2-self-lifecycle blueprint pattern, recurrence rules, per-project customisation without forking, typed custom fields via Composer.
- **§7 Scheduling & capacity** — critical-path pass, calendars, demand-vs-supply ledger (`resource_allocations`), auto-assignment ranking, levelling, cost/EV.
- **§8 Cross-domain contract** — Pattern A (domain *is* a project, FK-anchored — consistent with your `202606010095_project_domain_dedup.sql`) and Pattern B (domain *spawns* tasks via the `details.source_entity_*` contract), with the four canonical origins spelled out.
- **§9–14** — RLS per persona/template, RPC surface, analytics views, testing, a phased P0–P5 delivery plan, and open decisions.

**[`SDD/modules/projects/GAP_ANALYSIS.md`](SDD/modules/projects/GAP_ANALYSIS.md)** — maps ideal → current: 14 things already built (the cross-domain engine and task spine are done/reviewed), 25 gaps (G1–G25) with severity/phase, backward-compat notes, and a concrete P0 first-migration slice.

Registered both in [`SDD/modules/00_INDEX.md`](SDD/modules/00_INDEX.md) (also added the `unified` module which was missing from the index, updated the dependency graph and date).

The headline finding from grounding in the code: your **cross-domain engine is the hard part and it already exists** — the gaps are almost entirely the standalone-PM-tool surface (multi-assignee, custom statuses, real dependencies, time, collab, agile) plus the template catalog and the capacity *supply* ledger. The spec is written so P0–P2 deliver your template-driven cross-domain thesis and P3–P5 reach ClickUp/Zoho/MS-Project parity.

Want me to draft the actual P0 migration DDL (`task_assignments`, `task_dependencies`, `workflow_statuses`, `project_phases` + the legacy sync view) next?









![alt text](image.png)




**15 sections**, all idempotent (`IF NOT EXISTS` / `OR REPLACE` / `DO` blocks), single `BEGIN`/`COMMIT`:

| Section | What it creates | Replaces |
|---|---|---|
| §1 | `unified.resource_calendars` (named shift templates) | `scheduler.y_shifts` |
| §2 | `unified.resource_unavailability` (blocked windows) | `scheduler.y_resource_unavailability` + JSONB on contacts |
| §3 | `unified.resource_pools` + `_members` (UUID PK, polymorphic contact/asset) | `scheduler.y_resource_pools` + `_members` (integer PK) |
| §4 | `unified.task_dependencies` (FS/SS/FF/SF + lag + cycle-guard trigger + legacy view) | `tasks.depends_on[]` + `scheduler.y_dependencies` |
| §5 | `unified.task_assignments` (multi-assignee M2M) | RACI-only pattern |
| §6 | `unified.resource_allocations` (capacity booking ledger) | the gap (no supply ledger) |
| §7 | `unified.project_phases` (WBS grouping) | none |
| §8 | `unified.workflow_status_sets` + `workflow_statuses` | fixed 5-value `state_category` |
| §9 | `unified.scheduler_requests` (async solver job queue) | `scheduler.y_planning_requests` |
| §10 | New columns on `tasks` (phase_id, status_id, sprint_id, **pinned_start/end/resource**, story_points, billable) and `projects` (template_id, parent_project_id, category, currency…) and `contacts` (calendar_id, resource_type) | — |
| §11 | `unified.v_solver_tasks` + `v_solver_resources` (read-model views) | `y_load_baseline_data()` ETL function |
| §12 | `unified.generate_ppm_tasks()` (reads unified.* + esm.service_assets directly) | `scheduler.generate_project_plan_delta()` |
| §13 | `unified.trigger_solver_run()` (queues request + calls edge fn via pg_net) | `scheduler.simulate_ppm_plan()` |
| §14 | RLS policies for all 11 new tables | — |
| §15 | FK indexes on new columns | — |

**Dropped** (do not port): `y_projects`, `y_tasks`, `y_locations`, `y_resources` (the shadow mirrors), `y_load_baseline_data()` (the ETL), `y_project_configs`/`y_ppm_configs` (deferred to P1 `project_templates`), `simulate_scenario_from_nlp()` (stays in the edge function).











These are the most important architectural questions to answer correctly before building further. Let me give you my principal-architect view on each, grounded in what the schema actually models.

Now I have everything. The workforce module has `project_id` but no `task_id` — that's the missing link. Let me give the definitive architectural response.

---

## Architectural decisions — my definitive recommendations

### 1. `unified` schema is correct — it IS the system of intelligence

Don't move the tables. Here's the reasoning: `unified` is not a "registry" schema — it's the **operational fabric of the enterprise**. Every meaningful object (organization, person, asset, project, task) and every work relationship (dependency, assignment, allocation, requirement) belongs here because they are fundamentally domain-agnostic. Domain schemas (`crm`, `esm`, `construction`, `hr`) carry only what is irreducibly domain-specific (a deal's `stage_id`, a building's `total_square_feet`, a permit number). The work intelligence lives in `unified`.

The existing `unified.organizations`, `unified.contacts`, `unified.assets` already prove this — they anchor *all* domain entities, not just "task resources." Adding scheduling tables here is consistent and correct.

---

### 2. Everything in an enterprise IS a task — the model holds, mostly

Yes, with one important nuance:

```
Every enterprise commitment = either a TASK or a PROJECT (a structured set of tasks).

TASK: atomic unit of work — one responsible person, one outcome, PERT time/cost, RACI.
PROJECT: a template-driven plan that produces and manages a set of tasks.

EXAMPLES:
  Call a prospect         → task (CRM, intent=CRM_DEAL)
  Respond to a ticket     → task (ESM, intent=ESM_TICKET)
  Onboard a new employee  → project → tasks (HR, intent=HR_ONBOARDING)
  Pay a vendor invoice    → task (Finance, intent=FINANCE_AP)
  Quarterly PM visit      → project → tasks (ESM_CONTRACT recurring)
  AI agent routes a message → task (intent=WA_AUTOMATION, responsible=AGENT)
  Blueprint stage fires   → task (created by automation, responsible=bot_id)
```

What fits perfectly:
- RACI — `responsible` (doer), `accountable` (approver), `consulted`, `informed`
- PERT — `pert_estimates jsonb` already on every task/project
- Effort + cost — `effort_planned/actual_hours` + `task_requirements` for cost
- Human or agent — `responsible` can be a user UUID or a bot/agent UUID; `task_source` distinguishes `manual` vs `automation` vs `agent`

What needs one addition — **every task must know if it needs human action or is agent-driven**:

```json
raci: {
  "responsible": "user_uuid_or_agent_uuid",
  "responsible_kind": "user" | "agent" | "role",
  "accountable": "SALES_MANAGER",
  "consulted": [],
  "informed": ["BRANCH_MANAGER"]
}
```

---

### 3. Assignment: `assignee_id` as a generated column — no row explosion

**The definitive recommendation:**

| Mechanism | Use | What it holds |
|---|---|---|
| `tasks.raci` JSONB | **Governance** | Full R/A/C/I — `responsible` is the primary doer, `accountable` is the approver (role token), consulted/informed lists |
| `tasks.assignee_id` (generated column) | **Queries** | Denormalized from `raci->>'responsible'`, indexed, for fast "My Tasks" |
| `task_assignments` table | **Scheduler only** | Multi-resource allocations created by the OR-Tools solver — e.g. "this task needs 3 field workers", each gets a row + a `resource_allocations` booking |

**Do NOT** create separate task rows per RACI role. That explodes data and defeats the purpose.

```sql
-- Add this to unified.tasks: auto-indexed, always in sync with RACI
ALTER TABLE unified.tasks
  ADD COLUMN IF NOT EXISTS assignee_id uuid
  GENERATED ALWAYS AS ((raci->>'responsible')::uuid) STORED;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON unified.tasks (assignee_id)
  WHERE assignee_id IS NOT NULL;
```

**Lifecycle of assignment:**
1. Blueprint creates task → sets `raci.responsible = owner_id/agent_id from source entity` → `assignee_id` auto-computed
2. Normal work → worker sees task in "My Tasks" (`WHERE assignee_id = auth.uid()`), does work, marks done
3. SLA breach / critical path alert → blueprint detects via `wf_rules` → fires notification to `raci.accountable` role token
4. Reallocation → update `raci.responsible` (new UUID) → `assignee_id` auto-recomputes → `object_activities` records old→new — no new rows needed
5. Agent reallocation → `ai_mcp` agent writes `raci.responsible = new_agent_or_user` → same flow

---

### 4. Agile + monitoring-only — correct, and the architecture supports it

The right framing: **the database records truth, blueprints react to it**. No gate enforcement at the DB level. Tasks flow freely through whatever statuses the tenant defines. The ZWS engine watches for trigger conditions:

```
ONLY notify / escalate when:
  - SLA breach (due_date crossed + task not terminal)
  - Critical path impact (dep-graph recompute reveals delay)
  - Rule in bp_process_blueprints fires (custom ECA rule)

Everything else: record it, don't block it.
```

`workflow_statuses` custom columns map to `state_category` for automation — but moving a task between custom columns never blocks anything by default. Blocking is opt-in via `is_blocked` flag + a blueprint rule on entry.

---

### 5. Approval — reuse the RACI accountable + workflow statuses machinery

No new approval table. The model:

```
task reaches "In Review" status (custom, maps to IN_PROGRESS state_category)
  → blueprint L2 rule fires: on_stage_entry(IN_REVIEW)
      → send_email to raci.accountable (role token resolved at runtime)
      → update task: details.pending_approval = true

accountable user approves:
  → calls tasks.set_status(task_id, 'Done')  OR
  → AI agent receives approval signal → updates task

accountable user rejects:
  → moves task back to "In Progress"
  → comments via core.object_comments (threaded, against the task's URN)
  → object_activities records the rejection + who
```

For formal milestone/deliverable sign-off (client-facing), the `unified.milestones.acceptance_criteria` JSONB + milestone status (`open/met/missed/waived`) + `is_billing_trigger` handles it.

---

### 6. Time entries — extend workforce, don't duplicate

`workforce.timesheet_items` already has `project_id`. We add `task_id`:

```sql
ALTER TABLE workforce.timesheet_items
  ADD COLUMN IF NOT EXISTS task_id uuid
  REFERENCES unified.tasks(id) ON DELETE SET NULL;
```

Then `unified.tasks.effort_actual_hours` becomes a trigger-maintained rollup from `workforce.timesheet_items WHERE task_id = tasks.id`. **Drop `unified.time_entries` from the migration** — it duplicates workforce. The workforce module owns time; the task owns the aggregate.

---

### What this means for the migration I just wrote

Two surgical fixes needed:

Good — `time_entries` was never added to that migration (it was only in the earlier SDD spec). Now apply the two fixes: `assignee_id` generated column, and the `workforce.timesheet_items.task_id` link:

Now add the `task_id` link to the workforce module and the effort rollup trigger:

Now update the SDD and GAP_ANALYSIS to capture these decisions properly:

Final verification the migration is clean:

Clean. Here are my answers to your four questions, and what changed:

---

## Answers

### 1. Does everything belong in `unified`? Yes — it's the system of intelligence, not a registry

`unified` is the **operational fabric** of the enterprise. `unified.organizations/contacts/assets` aren't just resource tables for scheduling — they are the canonical identity anchors for *every* domain entity. All the PM/scheduling tables belong alongside them because they describe the work of the enterprise, not one domain of it. Domain schemas (`crm`, `esm`, `construction`) carry only columns that are irreducibly theirs (a building's square footage, a deal's stage).

The alternative — a `project_management` schema — would create an artificial boundary and immediately create cross-schema FKs that mirror what `unified` already owns.

### 2. Does everything become a task? Yes — and the model covers it

Every enterprise commitment is either a **task** (atomic: one responsible, one outcome) or a **project** (a template-driven set of tasks). Sales call, invoice approval, ticket response, maintenance visit, AI agent routing a WhatsApp message — all tasks. `task_source = manual | automation | agent` and `raci.responsible_kind = user | agent | role` distinguish who/what does the work. PERT time, effort, cost, RACI, dependencies — the columns are all present.

### 3. Agile and messy — correct, and the architecture supports it

No DB-level enforcement. Tasks flow freely. The ZWS engine (`wf_rules`) watches for SLA breach, critical path impact, or tenant-defined ECA rules, then notifies. `is_blocked` is informational. The database records truth; blueprints react to it.

### 4. Assignment model — `assignee_id` generated column, no row explosion

**The decisive resolution:** added `assignee_id uuid GENERATED ALWAYS AS ((raci->>'responsible')::uuid) STORED` to `unified.tasks`. 

- `raci` JSONB is the **single write source** for all R/A/C/I data
- `assignee_id` is an **indexed computed column** for fast "My Tasks" queries — never manually set
- To reassign: `UPDATE tasks SET raci = raci || '{"responsible":"<new_uuid>"}'` → `assignee_id` recomputes automatically, `object_activities` logs the change
- `task_assignments` table is **only for the scheduler** when a task requires multiple resources (e.g. 3 field workers) — the solver creates rows there + `resource_allocations` bookings
- **Approval**: `raci.accountable` (role token) + a custom "In Review" workflow status → L2 blueprint notifies → approve/reject via status change + comment thread. No new approval table.
- **Time entries**: `workforce.timesheet_items` already exists — added `task_id` FK there + a trigger that rolls up `SUM(hours_worked)` → `unified.tasks.effort_actual_hours`. No `unified.time_entries` — workforce owns time, tasks own the aggregate.

### Migration final state

[`20260611000100_projects_scheduling_capacity.sql`](supabase/migrations/20260611000100_projects_scheduling_capacity.sql) — 1,151 lines, 1 transaction:
- **11 new tables** in `unified`
- **4 functions** (2 in `unified`, 1 in `workforce`, 1 trigger)
- **3 views** in `unified` (dependency compat array, solver tasks read-model, solver resources read-model)
- **10 new columns** on `unified.tasks` including `assignee_id` generated + scheduler pins
- **10 new columns** on `unified.projects` including template/hierarchy/category
- **2 new columns** on `unified.contacts`/`assets` (calendar linkage)
- `workforce.timesheet_items.task_id` FK + rollup trigger — workforce module bridged to task tracking without duplication











![alt text](image-1.png)




Layer 1 — every task, always (80% of cases)
raci JSONB on the task row. assignee_id is a generated column auto-derived from raci.responsible. Blueprint creates a task, sets raci.responsible = source_entity.owner_id. Done. No other tables touched. This covers every CRM task, ESM ticket dispatch, approval task, AI agent task.

Layer 2 — multi-resource tasks (construction, manufacturing, field crews)
task_requirements (demand: "I need 3 electricians and 1 crane") → task_assignments (fulfillment: "John [primary/lead], Jane [supporting], Crane-001 [asset]"). raci.responsible = John, the lead. The PM, the solver, or an agent can create these rows. All three use the same tables — there's no "scheduler-only" version of this.

Layer 3 — capacity-tracked (when you need no double-booking)
resource_allocations rows hang off the task_assignments rows — one booked window per person per task. The solver and the availability check both read this.

The critical distinction you're clarifying
task_assignments is not a replacement for the RACI model. They serve different purposes:

raci JSONB	task_assignments rows
Purpose	Governance — who is accountable/consulted/informed	Execution — which specific humans/assets do the work
When created	Always (blueprint sets it)	Only when 2+ resources OR capacity tracking needed
Primary person	raci.responsible → assignee_id	role = 'primary_responsible' row
Accountable	raci.accountable (role token)	Not here — stays in RACI
Query: "My Tasks"	WHERE assignee_id = auth.uid() (fast, indexed)	Not used for this




The blueprint path is identical to the PM path
A blueprint-created task and a PM-finalized project task behave the same way:

Single-person task: blueprint/PM sets raci.responsible → assignee_id generated → notify that person. No task_assignments rows.
Multi-resource task: blueprint/PM sets task_requirements rows first (the plan). Then either the scheduler, an agent, or the PM creates task_assignments rows (the fulfillment). task_requirements.is_fulfilled flips to true when the corresponding assignment exists.
This is the same two-step model a project template uses — templates define task_requirements per task node; the instantiation or scheduler fills task_assignments.