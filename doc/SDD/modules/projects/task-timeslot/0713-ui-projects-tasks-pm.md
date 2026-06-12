# Projects & Tasks — Frontend Implementation Guide

> Date: 2026-06-12
> Scope: Complete React UI specification for the Projects & Task Management module.
>        Covers every view, every RPC call, write paths, module-gating, vertical
>        field injection, and state management patterns.
> Companion: `SDD/modules/projects/`, migrations 000100 / 000500 / 000600 / 000700,
>            seeds 17 / 18, `.agent/brain/06-12-26/project-templates-sprints-vertical-activation.md`
> Format: Same pattern as `ui-task-assignee.md` — decision-first, no ambiguity.

---

## 1. Module architecture: what the frontend owns vs the DB owns

```
DB owns                                  Frontend owns
──────────────────────────────────────   ─────────────────────────────────────
Fetch/filter logic (base view)           Which tabs/panels to show
RLS (user sees only their org's data)    Tab state, URL routing, local sort
participant_ids[] pre-computed           Presentation of stages as board columns
current_stage_id / stage_category        Drag-and-drop reorder UI
recurrence_rule evaluation (cron)        Recurrence config form
suggest_assignments() ranking            Displaying the suggestion list
recompute_schedule() CPM                 Gantt bar rendering
vertical_schemas (field definitions)     Rendering dynamic form fields
feature_flags on project_template        Which panels are initially expanded
org_module_configs (module on/off)       Showing/hiding entire UI sections
```

**Hard rules:**
- Never filter tasks client-side after a full fetch. Use filters in `api_new_fetch_entity_records`.
- Never JOIN in React — if you need a related name (assignee_name, stage name), it must be in the view.
- Feature gates (`sprints`, `recurring_projects`) are checked via `org_module_configs` once at session start and stored in context. Never re-fetch per page.

---

## 2. Data fetching: the three RPCs you use for everything

```ts
// 1. Fetch lists (projects, tasks, phases, sprints)
supabase.rpc('api_new_fetch_entity_records', { config })

// 2. Write (create / update) + embedded child diff
supabase.rpc('api_new_core_upsert_data', { table_name, data, id?, related_table_name?, ... })

// 3. Domain actions (clone from template, suggest assignees, recompute schedule)
supabase.rpc('clone_project_from_template', { ... })
supabase.rpc('suggest_assignments', { ... })
supabase.rpc('recompute_schedule', { ... })
supabase.rpc('save_project_as_template', { ... })
```

**View → base_view mapping (set in core.entities):**

| entity_schema | entity_name | base_view |
|---|---|---|
| unified | projects | unified.v_portfolio_summary |
| unified | tasks | unified.v_tasks |
| unified | sprints | unified.sprints (direct) |
| unified | project_phases | unified.project_phases (direct) |

---

## 3. Module gating: check once at session start

```ts
// In your session/auth context provider
const { data: modules } = await supabase
  .from('identity_org_module_configs')   // RLS-filtered view
  .select('module_slug, is_enabled, config')

const enabledModules = new Set(
  modules?.filter(m => m.is_enabled).map(m => m.module_slug) ?? []
)

// Store in React context:
// enabledModules.has('sprints')           → show sprint board
// enabledModules.has('recurring_projects') → show recurrence config
// enabledModules.has('calendar')          → show booking section on tasks
```

Never conditionally fetch — just conditionally render. The DB RLS handles data isolation.

---

## 4. Projects: list views

### 4a. My Projects

```ts
const myProjects = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'unified',
    entity_name:   'projects',
    organization_id: orgId,
    filters: [
      { key: 'pm_id',        operator: '=',  value: currentUserId },
      { key: 'is_active',    operator: '=',  value: 'true' },
      { key: 'state_category', operator: '!=', value: 'CLOSED_WON' }
    ],
    sorting: { column: 'planned_end_date', direction: 'asc' },
    pagination: { limit: 50 }
  }
})
```

`pm_id` is a pre-computed column in `v_portfolio_summary` = `(raci->>'responsible')::uuid`.

### 4b. All Projects (org-wide)

Remove the `pm_id` filter. Add `state_category` filter for active-only view.

### 4c. Portfolio / Program view

```ts
// Top-level: parent_project_id IS NULL
const portfolio = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'unified',
    entity_name:   'projects',
    organization_id: orgId,
    filters: [
      // Note: NULL filter needs special handling — see §4d
      { key: 'relation_role', operator: '=', value: 'portfolio' }
    ]
  }
})

// Children: relation_role = 'program' | 'project' WHERE parent_project_id = portfolioId
```

**Portfolio tree building:** Fetch all projects in one call, then build the tree client-side using `parent_project_id`. The DB gives you flat rows; the hierarchy is assembled in React.

```ts
function buildTree(projects: Project[]): ProjectNode[] {
  const map = new Map(projects.map(p => [p.project_id, { ...p, children: [] }]))
  const roots: ProjectNode[] = []
  for (const p of map.values()) {
    if (!p.parent_project_id) {
      roots.push(p)
    } else {
      map.get(p.parent_project_id)?.children.push(p)
    }
  }
  return roots
}
```

### 4d. Filter by vertical (for vertical-specific views)

```ts
filters: [{ key: 'vertical', operator: '=', value: 'construction' }]
```

### 4e. Health dashboard — overdue / at-risk

```ts
// At-risk: health_status = 'red' or 'yellow'
filters: [
  { key: 'health_status', operator: '!=', value: 'green' },
  { key: 'is_active',     operator: '=',  value: 'true' }
]
```

---

## 5. Project creation flow

This is the most important flow — get it right.

```
User clicks "+ New Project"
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Project basics                                          │
│  - Name (required)                                               │
│  - Vertical (select: construction | it | services | mfg | ...)  │
│  - Product/service type (conditional on vertical)                │
│                                                                  │
│  → On vertical select: fetch matching templates                  │
│    supabase.rpc('api_new_fetch_entity_records', {               │
│      entity_schema: 'unified', entity_name: 'project_templates',│
│      filters: [{ key: 'vertical', op: '=', val: 'construction'}]│
│    })                                                            │
│    Show as: "Use template" card list — skip = blank project      │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Template selection (optional)                           │
│  - Show global templates matching vertical + product_service_type│
│  - Preview: show phase list + task count from template.details   │
│  - "Start blank" option always visible                           │
│  - Template feature_flags sets initial toggle state (sprints on?)│
└─────────────────────────────────────────────────────────────────┘
        │
        ├── No template selected
        │       ▼
        │   supabase.rpc('api_new_core_upsert_data', {
        │     table_name: 'unified.projects',
        │     data: { name, vertical, ... }
        │   })
        │   → Navigate to empty project board
        │
        └── Template selected
                ▼
            supabase.rpc('clone_project_from_template', {
              p_template_id: selectedTemplate.id,
              p_name:        projectName,
              p_org_id:      orgId,
              p_start_date:  startDate,
              p_config: {
                raci: { responsible: currentUserId },
                priority: 'medium'
              }
            })
            → Returns project_id
            → Navigate to project board (phases + tasks already populated)
```

**Vertical form fields (Step 1 extension):**

After vertical is selected, load dynamic fields:
```ts
const { data: schema } = await supabase
  .from('process_templates_vertical_schemas')  // via view or RPC
  .select('ui_schema, validation_schema')
  .eq('vertical_id', selectedVertical)
  .eq('entity_schema', 'unified')
  .eq('entity_type', 'projects')
  .single()

// Render schema.ui_schema.properties as additional form fields
// Values go into project.vertical_payload JSONB
```

---

## 6. Project detail page: layout and panels

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Back]  HVAC System Upgrade — Building A          [⋮ Menu]  │
│  🟢 IN PROGRESS · CONSTRUCTION · High · Due: 26 Jun             │
│                                                                   │
│  [Board] [List] [Gantt] [Calendar] [Resources] [Budget]          │
│                                     ↑ visible based on feature_flags
└─────────────────────────────────────────────────────────────────┘
│
├── Board (Kanban) — §7
├── List (flat or grouped by phase) — §8
├── Gantt — §9
├── Calendar — §10 (if calendar module enabled)
├── Resources — §11
└── Budget — §12
```

**Tab visibility rules:**

| Tab | Show when |
|---|---|
| Board | Always |
| List | Always |
| Gantt | `feature_flags.phases = true` OR has task dependencies |
| Calendar | `enabledModules.has('calendar')` |
| Resources | `feature_flags.resource_scheduling = true` |
| Budget | `project.budget_planned IS NOT NULL` |
| Sprints | `enabledModules.has('sprints') AND feature_flags.sprints = true` |

---

## 7. Board view (Kanban)

Board columns = **blueprint stages**, not custom status rows. Stages come from `current_stage_id` on `unified.v_tasks`.

```ts
// 1. Fetch project's blueprint stages (column definitions)
const { data: blueprint } = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'automation', entity_name: 'bp_process_blueprints',
    organization_id: orgId,
    filters: [{ key: 'entity_type', operator: '=', value: 'task' }]
  }
})
const stages = blueprint?.details?.lifecycle?.stages ?? defaultStages

// 2. Fetch tasks for this project (one call — no per-column queries)
const { data: tasks } = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'unified', entity_name: 'tasks',
    organization_id: orgId,
    filters: [{ key: 'project_id', operator: '=', value: projectId }],
    sorting: { column: 'scheduled_start', direction: 'asc' },
    pagination: { limit: 200 }
  }
})

// 3. Group client-side by current_stage_id
const columns = groupBy(tasks.data, t => t.current_stage_id ?? 'unstarted')
```

**Drag-and-drop (stage transition):**

Moving a card between columns = advancing the blueprint instance stage. Do NOT update `state_category` directly. Call the blueprint transition RPC:

```ts
async function moveTask(taskId: string, targetStageId: string) {
  await supabase.rpc('api_new_core_upsert_data', {
    table_name: 'automation.bp_instances',
    data: { stage_id: targetStageId },
    // find the active bp_instance for this task, then update
  })
  // Optimistically update local state; refetch on error
}
```

**If no blueprint is configured** (simple projects): fallback to `state_category` as columns:

```ts
const FALLBACK_COLUMNS = [
  { id: 'NEW',         label: 'To Do',      color: '#gray'  },
  { id: 'IN_PROGRESS', label: 'In Progress', color: '#blue'  },
  { id: 'CLOSED_WON',  label: 'Done',        color: '#green' },
]
// Move = api_new_core_upsert_data('unified.tasks', { state_category: targetId })
```

---

## 8. List view

Two sub-modes: **flat** (all tasks sorted) and **grouped by phase**.

```ts
// Flat list
const flatTasks = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'unified', entity_name: 'tasks',
    organization_id: orgId,
    filters: [{ key: 'project_id', operator: '=', value: projectId }],
    sorting: { column: 'scheduled_start', direction: 'asc' }
  }
})

// Grouped by phase: fetch phases first, then tasks — client group
const { data: phases } = await supabase
  .from('unified_project_phases')
  .select('id, name, sequence_order')
  .eq('project_id', projectId)
  .order('sequence_order')

// Then bucket tasks by phase_id
const grouped = groupBy(tasks.data, t => t.phase_id ?? '__none__')
```

**Inline task edit:** clicking a row opens a side drawer (not a full page). The drawer uses the Task Detail form from §13. `api_new_core_upsert_data` is called on save.

**Add task inline (per phase):**

```ts
// Clicking "+ Add task" under a phase row
await supabase.rpc('api_new_core_upsert_data', {
  table_name: 'unified.tasks',
  data: {
    organization_id: orgId,
    project_id: projectId,
    phase_id: phase.id,
    name: newTaskName,
    state_category: 'NEW',
    raci: { responsible: currentUserId }
  }
})
```

---

## 9. Gantt view

The Gantt renders `scheduled_start` / `scheduled_end` bars. These come from `unified.v_tasks`. Dependencies render as arrows using `unified.task_dependencies`.

```ts
// Fetch tasks with dependency info
const tasks = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'unified', entity_name: 'tasks',
    organization_id: orgId,
    filters: [{ key: 'project_id', operator: '=', value: projectId }]
  }
})

// Fetch dependencies separately (not in v_tasks — keeps view light)
const { data: deps } = await supabase
  .from('unified_task_dependencies')
  .select('task_id, depends_on_task_id, dependency_type, lag_minutes')
  .eq('organization_id', orgId)
  .in('task_id', tasks.data.map(t => t.id))
```

**Drag to resize/move a bar:**

```ts
async function updateTaskDates(taskId: string, start: Date, end: Date) {
  await supabase.rpc('api_new_core_upsert_data', {
    table_name: 'unified.tasks',
    data: {
      scheduled_start: start.toISOString(),
      scheduled_end:   end.toISOString(),
      duration_planned_minutes: (end - start) / 60000
    },
    id: taskId
  })
  // After moving any task, recompute the whole project schedule
  await supabase.rpc('recompute_schedule', { p_project_id: projectId })
}
```

**Critical path highlighting:** Tasks with `float = 0` are on the critical path. `recompute_schedule()` returns the CPM result — store the critical task IDs in local state and render those bars in red.

---

## 10. Sprint board (IT module — gated)

Only render if `enabledModules.has('sprints') && project.feature_flags?.sprints`.

```
Sprint selector: [← Sprint 1] [Sprint 2 — current ▼] [Sprint 3 →]

┌── Sprint 2: "Core API" — 14 Jun → 27 Jun ──────────────────────┐
│  Goal: Complete auth + user management API                      │
│  Velocity: 21 pts committed  /  [__ pts completed]             │
│                                                                   │
│  [TODO] [IN PROGRESS] [IN REVIEW] [DONE]                        │
│   ...       ...           ...       ...                          │
└─────────────────────────────────────────────────────────────────┘
[ Backlog ]  (tasks with sprint_id IS NULL)
```

**Fetching the sprint backlog:**

```ts
// Active sprint tasks
const sprintTasks = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'unified', entity_name: 'tasks',
    organization_id: orgId,
    filters: [{ key: 'sprint_id', operator: '=', value: currentSprintId }]
  }
})

// Backlog (no sprint assigned, on this project)
const backlog = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'unified', entity_name: 'tasks',
    organization_id: orgId,
    filters: [
      { key: 'project_id', operator: '=', value: projectId },
      { key: 'state_category', operator: '!=', value: 'CLOSED_WON' }
      // sprint_id IS NULL — handled by is_unassigned_sprint view column (add to v_tasks)
    ]
  }
})
```

**Move from backlog to sprint (drag):**

```ts
await supabase.rpc('api_new_core_upsert_data', {
  table_name: 'unified.tasks',
  data: { sprint_id: currentSprintId },
  id: taskId
})
```

**Sprint creation:**

```ts
await supabase
  .from('unified_sprints')
  .insert({
    organization_id: orgId,
    project_id: projectId,
    name: `Sprint ${nextNumber}`,
    goal: sprintGoal,
    sequence_number: nextNumber,
    start_date: startDate,
    end_date: endDate,
    state_category: 'NEW',
    velocity_planned: committedPoints
  })
```

---

## 11. Task detail: form spec

The task drawer/modal. Applies to tasks created from any context (project, My Tasks, Calendar).

```
┌─ Task Detail ───────────────────────────────────────────────────┐
│  [Title ______________________________]  [Priority ▼]           │
│                                                                   │
│  Status: [■ In Progress ▼]     Stage: driven by blueprint        │
│                                                                   │
│  ┌─ Assignees ─────────────────────────────────────────────┐    │
│  │  Primary:  [John Miller ▼]                              │    │
│  │  + Add more people (expands)                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Dates:  [Jun 15] → [Jun 18]   Effort: [16h planned]            │
│  Phase:  [Equipment Installation ▼]   (if phases enabled)        │
│  Sprint: [Sprint 2 ▼]                 (if sprints enabled)       │
│                                                                   │
│  Dependencies: [+ Add dependency]                                 │
│    ↳ Finish-to-start: "Procure equipment"                        │
│                                                                   │
│  Vertical fields (if vertical schema exists):                     │
│    Trade: [HVAC ▼]   Work Package: [WP-04]                       │
│                                                                   │
│  [Description / Notes ___________]                                │
│  [Checklist items]                                                │
│  [Attachments]                                                    │
│  [Comments]                                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Save path:**

```ts
async function saveTask(task, additionalAssignees) {
  // Load vertical field schema to determine what goes in vertical_payload
  const verticalFields = extractVerticalFields(task, verticalSchema)

  await supabase.rpc('api_new_core_upsert_data', {
    table_name: 'unified.tasks',
    data: {
      name:                     task.name,
      priority:                 task.priority,
      state_category:           task.state_category,
      scheduled_start:          task.start?.toISOString(),
      scheduled_end:            task.end?.toISOString(),
      duration_planned_minutes: task.durationMinutes,
      effort_planned_hours:     task.effortHours,
      phase_id:                 task.phaseId,
      sprint_id:                task.sprintId,
      raci:                     { responsible: task.primaryAssigneeId, accountable: task.accountableId },
      vertical_payload:         verticalFields,
      details:                  task.details,

      // Embedded crew (triggers replace-diff against existing task_assignments rows)
      task_assignments: additionalAssignees.map(a => ({
        assignee_id:     a.id,
        assignee_kind:   a.kind,       // 'user' | 'contact' | 'asset'
        assignment_role: a.role,       // 'support' | 'crane_operator' | domain-specific
        allocation_pct:  a.pct ?? 100,
        estimated_hours: a.hours
      }))
    },
    id:                   task.id ?? null,
    related_table_name:   'unified.task_assignments',
    related_data_key:     'task_assignments',
    related_unique_keys:  ['assignee_id', 'assignment_role'],
    related_fk_column:    'task_id'
  })
}
```

**Suggested assignees:**

When the primary assignee picker is opened, call suggest_assignments() to pre-populate candidates:

```ts
const { data: suggestions } = await supabase.rpc('suggest_assignments', {
  p_task_id: task.id,
  p_limit: 5
})
// Display as ranked list with reasons: "Skills match", "On project", "⚠ Conflict"
// User picks from suggestions or uses the full person search
```

**Vertical fields (dynamic injection):**

```ts
// After vertical is known (from project.vertical), load the tasks schema
const { data: taskSchema } = await supabase
  .from('process_templates_vertical_schemas')
  .select('ui_schema')
  .eq('vertical_id', project.vertical)
  .eq('entity_schema', 'unified')
  .eq('entity_type', 'tasks')
  .single()

// Render taskSchema.ui_schema.properties as additional form fields below the core fields
// Values bind to task.vertical_payload[field_key]
```

---

## 12. Resource / capacity view

Shows who is booked for what, when. Reads from `unified.resource_allocations` + `unified.v_tasks`.

```
Person      Mon     Tue     Wed     Thu     Fri
──────────────────────────────────────────────────
John M.     [██HVAC-Install██]  [──────────]
Jane S.     [──────]  [██Fit-Out Phase 2████]
Crane-001   [████████HVAC-A1████████]

Legend: █ = confirmed allocation  ─ = availability window
```

**Data fetch:**

```ts
// Allocations for this project (or for a team in My Work view)
const { data: allocations } = await supabase
  .from('unified_resource_allocations')
  .select(`
    id, resource_id, resource_kind, start_time, end_time,
    allocation_pct, status, task_id,
    unified_tasks ( name, project_id, state_category )
  `)
  .eq('organization_id', orgId)
  .in('task_id', projectTaskIds)
  .gte('end_time', weekStart.toISOString())
  .lte('start_time', weekEnd.toISOString())
```

**Over-allocation indicator:** if `SUM(allocation_pct)` > 100 for a resource in any time window, show a red indicator on their row. This is a client-side calculation on the fetched allocations.

---

## 13. My Tasks page (cross-project)

```ts
// All tasks where I'm a participant (uses participant_ids @> from v_tasks)
const myTasks = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'unified', entity_name: 'tasks',
    organization_id: orgId,
    filters: [
      { key: 'participant_ids', operator: '@>', value: `{${currentUserId}}` },
      { key: 'state_category',  operator: '!=', value: 'CLOSED_WON' },
      { key: 'state_category',  operator: '!=', value: 'CLOSED_LOST' }
    ],
    sorting: { column: 'scheduled_end', direction: 'asc' }
  }
})
```

**Tabs on My Tasks page:**

| Tab | Filters to add |
|---|---|
| **All open** | `state_category != CLOSED_WON` AND `!= CLOSED_LOST` |
| **Overdue** | `scheduled_end < now()` + same state filter |
| **Today** | `scheduled_start <= today` AND `scheduled_end >= today` |
| **This week** | `scheduled_start` within ISO week |
| **Assigned to me (primary)** | Replace `participant_ids @>` with `assignee_id = me` |
| **I'm supporting** | No direct filter — use `participant_ids @>` only; diff from assignee_id client-side |

---

## 14. Project creation: recurring project setup (module-gated)

Only show if `enabledModules.has('recurring_projects')`.

Add a "Repeat" toggle in Step 1 of project creation. When toggled on:

```
Repeat: [✓ ON]
  Frequency: [Monthly ▼]    Every [1] month(s)
  Day of month: [1st ▼]
  Advance create: [7] days before start
  Ends: [Never ▼]   or [On: ___] or [After N occurrences]
  Use template: [HVAC Installation ▼]  ← auto-selects from project vertical
```

**Save as recurring parent:**

```ts
const nextOccurrence = computeNextOccurrence(startDate, frequency, interval)

await supabase.rpc('api_new_core_upsert_data', {
  table_name: 'unified.projects',
  data: {
    ...projectFields,
    recurrence_rule: {
      frequency: 'monthly',
      interval: 1,
      day_of_month: 1,
      advance_days: 7,
      ends_on: null,
      template_id: selectedTemplateId
    },
    next_occurrence_at: nextOccurrence.toISOString()
  }
})
// materialise_recurrences() cron runs daily and creates child projects automatically
```

**Child project card indicator:**

Projects where `recurrence_parent_id IS NOT NULL` show a 🔄 repeat icon and link back to the parent. Build this from the `v_portfolio_summary` view which returns `recurrence_parent_id`.

---

## 15. Save project as template

Available from project settings (⋮ menu → "Save as template").

```ts
async function saveAsTemplate(project, name, slug, isGlobal) {
  const { data: templateId } = await supabase.rpc('save_project_as_template', {
    p_project_id: project.id,
    p_name:       name,
    p_slug:       slug,
    p_org_id:     isGlobal ? null : orgId   // null = global, only SaaS admin can do this
  })
  // Show success toast: "Template saved — available in new project creation"
  return templateId
}
```

**Show in template selection:** Tenant templates surface above global templates in the template picker (handled by the `ORDER BY organization_id NULLS LAST` in the DB query).

---

## 16. Budget panel

Reads from `v_portfolio_summary` — no separate fetch needed if project is already loaded.

```
Budget:       AED 85,000 planned
Actual cost:  AED 42,800 (50%)
Remaining:    AED 42,200

Billing milestones:
  ✅ Foundation complete       AED 20,000  — billed 10 Jun
  ⬜ MEP rough-in sign-off     AED 25,000  — pending
  ⬜ Final handover            AED 40,000  — pending
```

**Data:** `billed_amount`, `billing_milestones`, `billing_triggered` from `v_portfolio_summary`. Milestone detail from `unified.milestones` filtered by `project_id`.

**Mark milestone complete (triggers billing notification):**

```ts
await supabase.rpc('api_new_core_upsert_data', {
  table_name: 'unified.milestones',
  data: { state_category: 'CLOSED_WON' },
  id: milestone.id
})
// trg_milestone_billing_stamp fires → pg_notify → edge fn creates invoice
```

---

## 17. Gaps that are purely frontend (no DB dependency)

These cannot be unblocked by DB work alone:

| Gap | What frontend must build | Blocked by |
|---|---|---|
| **G7** ESM-contract → recurring project | When ESM contract is activated, show "Create recurring project from this contract" action. Calls `clone_project_from_template()` with contract metadata in `p_config`. | Needs blueprint automation config in automation.bp_process_blueprints (backend) |
| **G8** CRM deal-won → delivery project | On deal `state_category → CLOSED_WON`, show "Create delivery project" button. Same RPC. | Needs blueprint stage transition hook (backend) |
| **G20** Analytics/dashboards | Burndown, CFD, EV charts from `v_portfolio_summary` + task history. Requires daily snapshots (materialised view, scheduled). | Materialised view not yet created |
| **G21** MS-Project / CSV import | Upload form → parse → map to task_generators shape → call `clone_project_from_template()`. | `import_msproject()` function not created |
| **G22** Generic automation rules | Visual rule builder: "When task moves to X → do Y". Writes to `automation.wf_rules`. | Automation rule editor UI is a separate feature |

---

## 18. State management pattern

Use **server state** (React Query / SWR / Supabase Realtime) — do not duplicate in Redux/Zustand unless you need optimistic updates.

```ts
// React Query pattern
const { data: project }  = useQuery(['project', projectId], () => fetchProject(projectId))
const { data: tasks }    = useQuery(['tasks', projectId],   () => fetchProjectTasks(projectId))
const { data: stages }   = useQuery(['stages', projectId],  () => fetchBlueprintStages(projectId))

// Optimistic update on drag-drop (board)
const mutation = useMutation(moveTask, {
  onMutate: async ({ taskId, targetStageId }) => {
    await queryClient.cancelQueries(['tasks', projectId])
    const prev = queryClient.getQueryData(['tasks', projectId])
    queryClient.setQueryData(['tasks', projectId], old =>
      old.map(t => t.id === taskId ? { ...t, current_stage_id: targetStageId } : t)
    )
    return { prev }
  },
  onError: (err, vars, ctx) => queryClient.setQueryData(['tasks', projectId], ctx.prev),
  onSettled: () => queryClient.invalidateQueries(['tasks', projectId])
})
```

**Realtime:** Subscribe to `unified.tasks` changes on the current project for live collaboration. Use Supabase Realtime broadcast channel, not polling.

```ts
supabase
  .channel(`project:${projectId}`)
  .on('postgres_changes', {
    event: '*', schema: 'unified', table: 'tasks',
    filter: `project_id=eq.${projectId}`
  }, payload => {
    queryClient.invalidateQueries(['tasks', projectId])
  })
  .subscribe()
```

---

## 19. URL routing reference

```
/projects                              → All projects list
/projects/new                          → Create project wizard
/projects/:id                          → Project board (default: board tab)
/projects/:id/list                     → List view
/projects/:id/gantt                    → Gantt view
/projects/:id/sprints                  → Sprint board (module-gated)
/projects/:id/resources                → Resource/capacity view
/projects/:id/budget                   → Budget + billing milestones
/projects/:id/tasks/:taskId            → Task drawer open
/portfolio                             → Portfolio tree view
/my-tasks                              → My Tasks page (cross-project)
/my-tasks?tab=overdue                  → Overdue tab
```

---

## 20. Checklist: what the frontend needs before shipping

- [ ] `api_new_fetch_entity_records` for `unified.projects` mapped to `v_portfolio_summary`
- [ ] Module gate context loaded at session start from `org_module_configs`
- [ ] Vertical schema loader for `process_templates.vertical_schemas`
- [ ] Project creation wizard (Step 1 basics → Step 2 template → clone or blank)
- [ ] Board view with blueprint-stage columns + fallback to `state_category`
- [ ] List view with phase grouping
- [ ] Gantt with `recompute_schedule()` call after date drag
- [ ] Task drawer with: assignee panel (primary + expandable crew), suggest_assignments(), vertical fields, dependencies
- [ ] Sprint board (gated) with backlog section
- [ ] My Tasks page with tab filters
- [ ] Portfolio tree view (flat fetch + client-side tree build)
- [ ] Budget panel (milestones + billing trigger)
- [ ] "Save as template" action in project settings
- [ ] Recurring project setup (gated)
- [ ] Realtime subscription per project page
