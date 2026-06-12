I'll investigate this task unification exercise thoroughly. Let me start by exploring the relevant directories and recent work in parallel.

Let me read the core architecture docs and the recent brain entries in parallel.

The most recent task-unification thinking is in the 06-09 brain docs. Let me read those and the actual SQL artifacts.

Now let me examine what was actually implemented in the SQL files and the latest commit diff.

Let me look at the CRM deals files, the compile/verify step, the actual `unified.tasks` schema, and the latest commit diff.

Let me check the live DB state and the unified module spec to validate against reality.

Local DB is down, so this is a static review. Let me find the `unified.tasks` DDL and the blueprint compiler to validate the contracts.

Now let me verify the compiler contract, `partition_filter`, the `service_reports` FK, and whether `crm.tasks` exists.

Let me confirm the `service_reports` schema location and the partition_filter parser limitation precisely.

I've now traced the full evolution — the 06-04 "projection" model, the 06-09 pivot to "True Unification," the committed SQL artifacts, the `unified.tasks` DDL, the compiler contract, and the runtime matcher. Local DB is down so this is a static certification against the schema + compiler source. Here is my architect's review.

---

# Task Unification — Architectural Certification

**Reviewer role:** CPO / Principal Architect · **Scope:** commit `2f486f3` + `supabase/post_deploy/task_unification/*` + SDD `unified/MODULE_SPEC.md` · **DB:** validated against migration source (local instance offline)

## Verdict: ⚠️ **NOT CERTIFIED as-is. Conceptually sound, mechanically broken.**

The *vision* is correct and worth pursuing. The *implementation* is caught mid-pivot between two incompatible models and will not function if applied. Details below.

---

## 1. The objective — is it the right call? ✅ Yes

> *"Every lifecycle stage is a unit of work. `unified.tasks` is the single operating log. Gantt/calendar fall out for free from PERT + RACI already in the blueprints."*

This is the correct strategic bet, and it is well-founded in *this* codebase specifically:
- The compiler genuinely supports `on_stage_entry` / `on_stage_exit` / `on_transition` ([202606010043_automation_functions_tier2.sql:900-1083](supabase/migrations/202606010043_automation_functions_tier2.sql:900)) — so "the blueprint IS the WBS" is buildable, not aspirational.
- `unified.tasks` already carries every column the model needs — `raci`, `intent_type`, `task_type`, `scheduled_start/end`, `effort_planned_hours`, `is_on_hold`, `is_blocked`, `state_category` ([202606010022_unified_tables.sql](supabase/migrations/202606010022_unified_tables.sql)). No DDL gymnastics required.
- The "drop `esm.work_orders` → a work order is just a field-service task" insight (06-09 ADR) is the right simplification.

So the destination is right. The problem is the project pivoted from **Model A (projection)** to **Model B (true unification)** on 06-09, and **only half the artifacts were migrated to Model B.**

---

## 2. Blocking defects (these prevent it from working)

### 🔴 B1 — `04_unified_tasks_blueprint.sql` is stale Model-A code wearing a Model-B filename
The file was renamed and repointed (`entity_schema='unified'`), but its **body was never rewritten**. It still:
- Creates **new child** `unified.tasks` rows on each stage ("Prepare for WO", "Execute WO", "Active repair") — but the committed ADR ([1310](.agent/brain/06-09-26/1310-plan-true-task-unification.md:28)) and the SDD ([MODULE_SPEC.md:15](SDD/modules/unified/MODULE_SPEC.md)) explicitly say WO stages must become **`state_category` updates of the same row**, not new rows.
- References `{{new.assignee_id}}`, `{{new.ticket_id}}`, `{{new.intent_type}}` ([04_unified_tasks_blueprint.sql:42,59,95](supabase/post_deploy/task_unification/04_unified_tasks_blueprint.sql:42)) — but `new` is now a `unified.tasks` row, which **has no `assignee_id` or `ticket_id` columns** (assignee lives in `raci`, ticket in `vertical_payload`/`details`). Every template here resolves to null.
- Header still reads `FILE: 04_esm_work_orders.sql`. It's a cosmetic rename.

### 🔴 B2 — The repurposed blueprint will fire on **every** `unified.tasks` row (runaway recursion)
`partition_filter = 'task_type IN (''esm_tickets'',''esm_projects'')'` ([:22](supabase/post_deploy/task_unification/04_unified_tasks_blueprint.sql:22)). But the runtime matcher only parses **equality** — regex `(\w+)\s*=\s*'([^']+)'` ([20260601004400_automation_functions_tier3.sql:286](supabase/migrations/20260601004400_automation_functions_tier3.sql:286)). `IN (...)` matches **zero** capture groups → the filter loop never runs → `v_filter_matches` stays `TRUE` → **the blueprint matches all task_types, all modules.** A CRM deal task entering any state would trip the WO blueprint, which spawns more `unified.tasks` → potential infinite create loop. This is the single most dangerous item.

### 🔴 B3 — Stage mismatch: the WO blueprint's triggers can never legitimately fire
Its `on_stage_entry` keys are `To_Do / Scheduled / In_Progress / On_Hold / Blocked` — *work-order* stages. But tasks produced by the tickets blueprint (file 03) are written once with `state_category='IN_PROGRESS'` and **never traverse those stages**. So even if the filter worked, the automations are dead. Model A (WO has its own lifecycle) and Model B (task is created terminal-per-stage by the parent) were never reconciled.

### 🔴 B4 — `service_reports` re-pointing is wrong on two counts
[07_unified_tasks_ddl.sql:14](supabase/post_deploy/task_unification/07_unified_tasks_ddl.sql:14) does `ALTER TABLE esm.service_reports RENAME COLUMN work_order_id TO task_id`.
- **FK not re-pointed.** `esm.service_reports.work_order_id` is `NOT NULL` with an FK to `esm.work_orders(id)` ([202606010025_esm_tables.sql:264,448](supabase/migrations/202606010025_esm_tables.sql:264)). Renaming the column keeps the FK — so `task_id` still references `x_work_orders`, **not** `unified.tasks`. You renamed the label, not the relationship.
- **Wrong table for the writer.** File 04 creates service reports with `entity_schema:"blueprint"` ([:124](supabase/post_deploy/task_unification/04_unified_tasks_blueprint.sql:124)), i.e. `blueprint.service_reports` — a *different table* that was **not** renamed and has no `task_id` column. Writer and DDL target two different tables.

### 🔴 B5 — SDD's own negative test contradicts the constraint it ships
[MODULE_SPEC.md:132-133](SDD/modules/unified/MODULE_SPEC.md:132) asserts an `esm_tickets` task **missing `ticket_id`** in `vertical_payload` is *rejected*. But the CHECK in [07:22-39](supabase/post_deploy/task_unification/07_unified_tasks_ddl.sql:22) has **no `"required"` array** — missing `ticket_id` passes. Worse: file 03 writes ticket linkage to `details.source_entity_id`, never to `vertical_payload` ([03_esm_tickets.sql:63-69](supabase/post_deploy/task_unification/03_esm_tickets.sql:63)) — so the UI contract BR-3.1 (`vertical_payload->>'ticket_id'`) returns nothing. The writer, the constraint, and the spec disagree about where the ticket id lives.

---

## 3. Coherence issues (CRM↔PM, ESM↔PM merge)

### 🟠 C1 — `task_type` taxonomy is applied three different ways
The whole "Two-Axis" thesis ([1303](.agent/brain/06-09-26/1303-reference-unified-tasks-taxonomy-strategy.md), [1310](.agent/brain/06-09-26/1310-plan-true-task-unification.md)) hinges on `task_type` = the source entity name. Reality in the committed files:

| File | task_type used | Aligned with ADR? |
|---|---|---|
| 03 tickets | `esm_tickets` | ✅ |
| 05 projects | `esm_projects` | ✅ |
| 01 deals | `stage_task` | ❌ should be `crm_deals` |
| 04 work_orders | `stage_task`, `work_order`, `escalation` (mixed) | ❌ contradicts 1310 *and* the partition_filter that selects on it |

The `crm.deals` → PM merge is the weakest link: deals project into `unified.tasks` but with the *old* generic `stage_task` type, so a "my deals work" filter and a "my tickets work" filter can't use the same predicate. The CRM and ESM halves don't actually unify under one query grammar yet.

### 🟠 C2 — ESM↔PM: `esm.projects` still orchestrates a dropped entity
[05_esm_projects.sql:194,205](supabase/post_deploy/task_unification/05_esm_projects.sql:194) still calls `esm.util_validate_children_terminal(p_child_entity='work_orders')` and `esm.util_cascade_cancel_children(p_child_entity='work_orders')`. Once `esm.work_orders` → `x_work_orders` and child work becomes `unified.tasks`, these RPCs validate/cancel the wrong (renamed/empty) entity. The project→work hierarchy is severed: projects no longer know their children are now tasks.

### 🟢 C3 — `crm.tasks` removal: nothing to do
There is **no `crm.tasks` table** anywhere in migrations. The premise "we are removing crm.tasks" is already vacuously satisfied — but it also means no cleanup migration is needed, and any doc claiming a deprecation step is misleading. Same likely applies to `blueprint.tasks`/`construction.tasks` (worth a one-line confirm).

---

## 4. What is correctly done ✅
- `00_support_functions.sql` `auto_close_stage_task()` — clean, idempotent, correct join on `details->>source_entity_*`. ✅
- Files 03 (tickets) and 05 (projects) `on_stage_entry`/`on_stage_exit` structure matches the compiler contract exactly, and the SYSTEM-stage skip logic is sound. ✅
- RACI/PERT → task derivation is faithful to the live blueprints. ✅
- `crm.deals` `partition_filter='deal_type=''standard'''` **does** parse correctly under the equality matcher — V1/V2 split is mechanically valid. ✅
- The decision to keep `vertical_payload` JSONB + `jsonb_matches_schema` (HR-style) is the right data-integrity pattern. ✅

---

## 5. Required fixes before this can ship (priority order)

1. **Rewrite `04`** to Model B: the parent (tickets/projects) creates **one** task; field-service stage progression = `update_entity` on that task's `state_category` + `vertical_payload`, **not** new child rows. Delete the dead WO-stage `on_stage_entry` blocks or attach a real `unified.tasks` lifecycle blueprint whose stages are actual task states.
2. **Fix B2**: either teach the runtime matcher to parse `IN (...)`, or change `partition_filter` to a single equality (e.g. one blueprint per `task_type`), or use `partition_filter_structured` JSONB if the matcher supports it. Until then, **do not deploy any blueprint targeting `unified.tasks`** — it matches everything.
3. **Fix B4**: pick one `service_reports` table; `DROP` the old FK and re-add `task_id REFERENCES unified.tasks(id)`; make the file-04 writer target the same schema. Update the seed form `esm_service_reports_min` ([202606010082_seed_core_forms.sql:27](supabase/migrations/202606010082_seed_core_forms.sql:27)) which still references `work_order_id`/`esm.work_orders`.
4. **Standardize `task_type`**: `crm_deals`, `esm_tickets`, `esm_projects`. Fix file 01 and 04. Then B5's vertical_payload/`required` and the UI predicate become consistent.
5. **Fix C2**: re-point projects' child-validation/cascade RPCs to `unified.tasks` filtered by `details->>source_entity_id = project.id`.
6. **Reconcile B5**: add `"required":["ticket_id"]` to the CHECK *and* write `ticket_id` into `vertical_payload` in file 03 — or change the spec/UI to read `details`. Pick one source of truth for entity linkage (I recommend `vertical_payload` for domain FKs, `details` for provenance).

---

These are all mechanical, not strategic — the architecture is sound and I'd green-light the *direction* without reservation. But applying the current `task_unification/` set against a live DB would (a) silently no-op the FK rename, (b) install a blueprint that fires on every task row in the system, and (c) leave CRM and ESM speaking different `task_type` dialects. **Conditional pass on concept; fail on current artifacts.**

Want me to implement fixes 1–6 as a corrected, single transactional post-deploy file (plus a proper DDL migration for the FK re-point), or start with the highest-risk one (B2 / the runaway blueprint)?