# Complete Feature Specification: Unified Project Management & Scheduling (CPO Guide)

> **Date**: 2026-06-12  
> **Status**: APPROVED & IMPLEMENTED IN DB  
> **Target Audience**: CPO, Product Managers, Help Center Documentation Writers, UI/React Engineering Team  
> **Location**: `/Users/macbookpro/zo/zo_core_v6_supa/.agent/brain/06-12-26/task-timeslot/FEATURE_SPEC_PM_SCHEDULING.md`

---

## 1. Executive Summary

The Project Management (PM), Scheduling, and Resource Capacity modules have been fundamentally unified into the `unified` schema, integrating cohesively with the new `cal` engine and the `p_scheduler` OR-Tools solver.

**The Central Thesis:**
*   **Everything is a Task:** A field service dispatch, a CRM follow-up, an IT software ticket, and a construction phase are all `unified.tasks`.
*   **The Blueprint defines the WBS:** Every project is an instance of a `unified.project_templates`, defining its Work Breakdown Structure (phases, sprints, tasks, dependencies).
*   **The Cal Engine dictates truth:** Availability is no longer loosely tracked. `cal.blocked_windows` (which syncs with Google/Outlook) and `cal.resource_territories` dictate exactly when and where a human or asset can work.
*   **The Solver optimizes:** The `p_scheduler` edge function (Google Cloud Run / OR-Tools) reads the deterministic constraints from `cal` and `unified`, resolving multi-resource scheduling conflicts asynchronously.

This document serves as the master specification for generating user-facing help documentation, setting up tenants, and guiding the final UI implementation.

---

## 2. Core Modules & Feature Set

### 2.1. Template Engine & Project Instantiation
*   **Feature**: Projects are instantiated from `unified.project_templates` (Global or Tenant-level).
*   **Business Rule**: Templates define the `vertical`, `product_service_type`, `phases`, and `task_generators` (default tasks with relative duration, effort, dependencies, and RACI roles).
*   **Action**: `clone_project_from_template()` RPC automatically creates the project, phases, sprints, and tasks, wiring up dependencies and calculating initial start/end dates.

### 2.2. Task Management & RACI Fabric
*   **Feature**: Tasks are the atomic unit of work (`unified.tasks`).
*   **Business Rule**: Every task uses a RACI model (`responsible`, `accountable`, `consulted`, `informed`). `assignee_id` is automatically derived from `raci->>'responsible'`.
*   **Sub-features**: 
    *   **Phases & Sprints**: Tasks can belong to a `phase_id` (Construction) or a `sprint_id` (IT/Agile).
    *   **Custom Statuses**: `state_category` is the fixed backbone (NEW, IN_PROGRESS, CLOSED_WON, etc.), but tenants can define `workflow_statuses` for custom Kanban columns.

### 2.3. Scheduling, Gantt & Dependencies
*   **Feature**: CPM (Critical Path Method) and Dependency Graph.
*   **Business Rule**: `unified.task_dependencies` supports FS, SS, FF, SF relationships with `lag_minutes`.
*   **Action**: Moving a task on the Gantt chart calls `recompute_schedule()`, which updates all downstream dependent tasks, highlighting the critical path (`float = 0`).

### 2.4. Resource Capacity, Allocation & The `cal` Engine
*   **Feature**: True Capacity Planning.
*   **Business Rule**: A user's availability is: `Standard Working Hours` MINUS `cal.blocked_windows` (PTO, Holidays, synced Google Calendar events). 
*   **Business Rule**: A user's eligibility is determined by `skills` and `cal.resource_territories`.
*   **Action**: When a task requires multiple people/assets, `unified.task_assignments` are created, generating locked `unified.resource_allocations` bookings.

### 2.5. AI & OR-Tools Solver (Auto-Suggest & Auto-Schedule)
*   **Feature**: Intelligent Dispatch & Bulk Optimization.
*   **Action (Manual)**: UI calls `suggest_assignments()`. The DB ranks all users based on skills, territory match, and `cal` availability, returning a scored list with reasons.
*   **Action (Bulk)**: UI queues a `unified.scheduler_requests` row. The `p_scheduler` edge function wakes up, ingests all tasks and `cal` constraints, and runs Google OR-Tools to minimize duration or level resources, writing back optimized dates to the DB.

### 2.6. Time & Budget Tracking
*   **Feature**: Cross-module effort tracking.
*   **Business Rule**: `workforce.timesheet_items` now link directly to `task_id`. A trigger automatically rolls up `SUM(hours)` into `unified.tasks.effort_actual_hours`.
*   **Business Rule**: Completing `unified.milestones` triggers `trg_milestone_billing_stamp()`, queuing finance invoices.

---

## 3. Tenant Setup & Configuration Guide

**How to set up a new tenant for Advanced Project Management:**

1.  **Enable Modules**: 
    *   In `identity.org_module_configs`, enable `projects`, `tasks`, and conditionally `sprints` (for IT) or `calendar` (for field service).
2.  **Define Calendars & Territories (`cal`)**:
    *   Set up the default `cal.calendars` for the organization (e.g., standard 9-to-5).
    *   Define `cal.territories` (e.g., "North Region", "New York") and assign users via `cal.resource_territories`.
3.  **Activate Project Templates**:
    *   Go to Project Settings -> Templates. The system seeds 5 default templates (HVAC, Fit-Out, Software Feature, Consulting, General).
    *   Clone a system template to a tenant-specific template and adjust the `task_generators` to match the tenant's exact SOPs.
4.  **Configure Workflow Statuses (Optional)**:
    *   If the tenant wants custom Kanban columns (e.g., "Awaiting Client Review"), create a `unified.workflow_status_sets` and map statuses to the base `state_category`.

---

## 4. End-to-End Use Cases & Test Cases

### Use Case 1: The Ad-Hoc Field Service Dispatch
**Persona**: Dispatcher  
**Goal**: Assign an urgent HVAC repair task to the best available technician in the right city.
**Test Steps**:
1.  Create a task: "Emergency HVAC Repair", Vertical: HVAC, Territory: "Chicago".
2.  Click "Assign". The UI calls `suggest_assignments()`.
3.  **Verify**: The list only shows technicians mapped to the "Chicago" territory.
4.  **Verify**: Technician "Bob" has a Google Calendar dentist appointment (via `cal.blocked_windows`). Bob is penalized and marked with a conflict reason. Technician "Alice" is scored 100%.
5.  Select Alice. **Verify**: `unified.task_assignments` is created, and Alice's calendar now shows a `resource_allocations` block.

### Use Case 2: The Bulk Construction Optimizer
**Persona**: Construction Project Manager  
**Goal**: Auto-schedule a 50-task interior fit-out project.
**Test Steps**:
1.  Create project from template: "Interior Fit-Out".
2.  **Verify**: `clone_project_from_template()` instantly creates 5 phases and 12 linked tasks with dependencies.
3.  Click "Optimize Schedule" in the Gantt UI.
4.  **Verify**: A row is inserted into `unified.scheduler_requests`.
5.  **Verify**: The `p_scheduler` edge function executes. The Gantt chart dynamically updates (via Realtime) as dates are leveled to avoid double-booking the "Civil Works" team.

### Use Case 3: The Agile Software Sprint
**Persona**: Scrum Master / Product Owner  
**Goal**: Plan a 2-week sprint and track velocity.
**Test Steps**:
1.  Create project from template: "Software Feature Delivery".
2.  Create a new Sprint (`unified.sprints`).
3.  Drag tasks from the Backlog into the Sprint. **Verify**: `task.sprint_id` updates.
4.  Move tasks across the Kanban board. **Verify**: The blueprint engine handles state transitions smoothly.

---

## 5. UI Engineering Developer Prompt

> **To: React UI Engineering Team**  
> **Subject: Implementation Spec for Unified PM & Scheduling UI**

Please implement the UI components based on the following strict RPC and DB contracts. Do not perform heavy filtering or joins client-side; rely on the provided RPCs.

### A. Core Fetching Pattern
Always use `api_new_fetch_entity_records` to fetch projects, tasks, sprints, and phases.
```javascript
// Fetch tasks for a project
const tasks = await supabase.rpc('api_new_fetch_entity_records', {
  config: {
    entity_schema: 'unified', entity_name: 'tasks', organization_id: orgId,
    filters: [{ key: 'project_id', operator: '=', value: projectId }],
    sorting: { column: 'scheduled_start', direction: 'asc' }
  }
});
```

### B. Board View (Kanban) Transitions
When a user drags a task card between columns, do NOT manually update `state_category`. Instead, if blueprints are active, transition the stage. For basic projects without blueprints, call upsert:
```javascript
await supabase.rpc('api_new_core_upsert_data', {
  table_name: 'unified.tasks',
  data: { state_category: targetId },
  id: taskId
});
```

### C. The Gantt Chart & Schedule Recomputation
The Gantt chart must render `scheduled_start` and `scheduled_end`. Arrows are rendered via `unified.task_dependencies`.
If a user drags a task bar to change its dates:
1.  Update the task dates via `api_new_core_upsert_data`.
2.  Immediately invoke `await supabase.rpc('recompute_schedule', { p_project_id: projectId });` to cascade dates to dependent tasks.

### D. "Suggest Assignees" Integration
On the Task Detail panel, when the user clicks the Assignee dropdown, do NOT load the whole company directory.
1.  Call the intelligence RPC: `await supabase.rpc('suggest_assignments', { p_task_id: task.id, p_limit: 10 });`
2.  Render the returned `score` and `reasons` array next to the user's avatar.
3.  On selection, update the task's RACI JSONB: `data: { raci: { responsible: selectedUserId } }`.

### E. "Optimize Schedule" Integration
Add a primary button on the Gantt/Schedule view: "Optimize Schedule".
1.  On click, show a spinner, and queue the solver request:
```javascript
await supabase.rpc('api_new_core_upsert_data', {
  table_name: 'unified.scheduler_requests',
  data: {
    organization_id: currentOrgId,
    project_id: currentProjectId,
    objective: 'minimize_duration',
    status: 'pending'
  }
});
```
2.  Do NOT call the edge function directly via fetch.
3.  Subscribe to Supabase Realtime on `unified.tasks` `UPDATE` events. When the solver finishes, the task dates will jump. Animate the Gantt bars to their new positions.

### F. Resource Capacity View (The "Slot Machine")
When rendering the Resource Timeline (who is busy when), you must query TWO sources:
1.  `unified.resource_allocations` (Internal PM bookings).
2.  `cal.blocked_windows` (External Google/Outlook blocks, PTO).
Render `blocked_windows` as grey, non-interactive "Busy/Unavailable" blocks on the timeline.
