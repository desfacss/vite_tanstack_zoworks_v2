# unified.tasks — Self-Lifecycle Blueprint Pattern Reference
**Session**: 2026-06-10 ~14:01 IST  
**Type**: Operational Reference  
**Status**: ACTIVE — use this when adding any new domain that writes to unified.tasks

---

## What is a Self-Lifecycle Blueprint?

Every `unified.tasks` row is born from a **Layer 1 source blueprint** (on `crm.deals`,
`esm.tickets`, `esm.projects`, etc.) via an `on_stage_entry → create_entity` action.
Once that task exists, its own state can change independently of the parent entity's
stage — a field visit can get BLOCKED by missing parts while the ticket itself stays
at "Scheduled". No source blueprint fires for this sub-state change.

A **Layer 2 self-lifecycle blueprint** targets `unified.tasks` directly and handles
these sub-state transitions: escalation emails, flag updates, SLA signals.

---

## The Two Layers

```
SOURCE ENTITY (crm.deals / esm.tickets / esm.projects / construction.projects …)
  └── Layer 1 blueprint (source_entity = the domain table)
        on_stage_entry → create_entity → unified.tasks   [BIRTH]

UNIFIED TASKS (unified.tasks)
  └── Layer 2 blueprint (source_entity = unified.tasks, partition_filter = task_type='...')
        on_stage_entry(BLOCKED) → send_email + update_entity   [SUB-STATE]
        on_stage_entry(ON_HOLD) → send_email
        on_stage_exit(BLOCKED)  → update_entity (clear flag)
```

---

## Non-Negotiable Rules for Every L2 Blueprint

| Rule | Why |
|---|---|
| `partition_filter` = single equality `task_type='xyz'` | Runtime matcher regex only captures one equality pair — `IN(...)` ignores the filter entirely, causing the blueprint to fire on every task row → runaway loop |
| Actions are `send_email`, `update_entity`, or `rpc` ONLY | `create_entity` on unified.tasks from a unified.tasks blueprint creates a new row → that row triggers the same blueprint again → infinite loop |
| `scheduled_end` OMITTED | Derived by `unified.tasks_compute_schedule()` trigger |
| `raci.accountable` = ROLE TOKEN string | The task row has no manager user id — nested `{{new.raci.responsible.manager}}` resolves to NULL |
| Stages are `state_category` values | `unified.tasks` has no named lifecycle stages; progression is `state_category` + `is_on_hold` + `is_blocked` |
| New UUID per blueprint | Never share a UUID with an L1 blueprint; never reuse a decommissioned UUID except for the `dc040aa2` esm_tickets L2 repurpose |

---

## Known Blueprint Inventory

### Layer 1 — Source Blueprints (task BIRTH)

| id | name | task_type produced | file |
|---|---|---|---|
| `d58f9e56-1433-4567-84d5-eec55359791c` | Sales Lifecycle V1 (standard) | `crm_deals` | 01 |
| `b0000003-0000-4000-8000-000000000003` | Sales Lifecycle V2 (enterprise) | `crm_deals` | 02 |
| `6dea58b9-8e69-4f8b-8245-ab715512f73b` | ESM Tickets Lifecycle | `esm_tickets` | 03 |
| `5f94ff36-8f7e-45e2-a491-2894496c5d9f` | ESM Projects Lifecycle | `esm_projects` | 05 |
| *(future)* | Construction Projects Lifecycle | `construction_projects` | — |

### Layer 2 — Self-Lifecycle Blueprints (sub-state ESCALATION)

| id | name | partition_filter | file |
|---|---|---|---|
| `dc040aa2-a077-4abe-b62d-fb9a23c676e5` | Unified Tasks — Field Escalation | `task_type='esm_tickets'` | 04 |
| `aa000001-cafe-4000-8000-000000000001` | Unified Tasks — Deal Stall Escalation | `task_type='crm_deals'` | 10 |
| `aa000002-cafe-4000-8000-000000000002` | Unified Tasks — Project Hold Escalation | `task_type='esm_projects'` | 11 |
| `aa000003-cafe-4000-8000-000000000003` | Unified Tasks — Site Escalation | `task_type='construction_projects'` | 12 |

---

## What Each L2 Blueprint Handles

### esm_tickets → Field Escalation (file 04, `dc040aa2`)
| Trigger | Actions |
|---|---|
| BLOCKED entry | Email `branch_manager` role; set `details.escalated=true`, `details.escalated_at` |
| BLOCKED exit | Clear `details.escalated`; set `details.unblocked_at` |
| ON_HOLD entry | Email `branch_manager` role with hold notification |

### crm_deals → Deal Stall Escalation (file 10, `aa000001`)
| Trigger | Actions |
|---|---|
| BLOCKED entry | Email `SALES_MANAGER` role; set `details.escalated=true` |
| BLOCKED exit | Clear `details.escalated`; set `details.unblocked_at` |
| ON_HOLD entry | Email `SALES_MANAGER` role; set `details.stalled=true` |
| ON_HOLD exit | Clear `details.stalled`; set `details.resumed_at` |

### esm_projects → Project Hold Escalation (file 11, `aa000002`)
| Trigger | Actions |
|---|---|
| BLOCKED entry | Email `PROJECT_SPONSOR` role; set `details.escalated=true` |
| BLOCKED exit | Clear `details.escalated` |
| ON_HOLD entry | Email `PROJECT_SPONSOR` role + PM; set `details.hold_reason_required=true` |

### construction_projects → Site Escalation (file 12, `aa000003`)
| Trigger | Actions |
|---|---|
| BLOCKED entry | Email `SITE_MANAGER` role; set `details.escalated=true`, `details.site_blocked=true` |
| BLOCKED exit | Clear `details.escalated`, `details.site_blocked` |
| ON_HOLD entry | Email `SITE_MANAGER` role (permit / compliance hold) |

---

## How to Add a New Domain

When a new domain (e.g. `procurement.purchase_orders`) starts writing to `unified.tasks`:

1. **Choose a `task_type`**: use the source table name — `procurement_po`
2. **Create the L1 blueprint**: on the source entity (`procurement.purchase_orders`),
   with `on_stage_entry → create_entity → unified.tasks` with `task_type='procurement_po'`
3. **Create the L2 blueprint**: new UUID, `source_entity = unified.tasks`,
   `partition_filter = "task_type='procurement_po'"`, actions = email/update only
4. **Add a `vertical_payload` CHECK** if the domain needs enforced payload fields
   (see `valid_esm_tickets_payload` pattern in `06_unified_tasks_ddl.sql`)
5. **Add both IDs to `07_compile_and_verify.sql`**
6. **Add rows to this table** and to the README

---

## Email Template IDs (reference)

| Blueprint | Trigger | Template ID |
|---|---|---|
| esm_tickets L2 | BLOCKED | `field-task-blocked-escalation` |
| esm_tickets L2 | ON_HOLD | `field-task-on-hold` |
| crm_deals L2 | BLOCKED | `deal-task-blocked-escalation` |
| crm_deals L2 | ON_HOLD | `deal-task-on-hold` |
| esm_projects L2 | BLOCKED | `project-task-blocked-escalation` |
| esm_projects L2 | ON_HOLD | `project-task-on-hold` |
| construction L2 | BLOCKED | `site-task-blocked-escalation` |
| construction L2 | ON_HOLD | `site-task-on-hold` |

---

## Related
- [1400-adr-unified-tasks-self-lifecycle-blueprint-architecture.md](1400-adr-unified-tasks-self-lifecycle-blueprint-architecture.md) — the ADR with full rationale
- [1310-plan-true-task-unification.md](../06-09-26/1310-plan-true-task-unification.md) — True Unification ADR
- [supabase/post_deploy/task_unification/README.md](../../../supabase/post_deploy/task_unification/README.md)
