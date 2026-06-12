# Integration Strategy: Cal Slot Engine + OR-Tools Scheduler

**Session**: 2026-06-12 ~13:02 IST

This document outlines the architectural strategy and UI approach for merging the deterministic `cal` slot machine with the asynchronous OR-Tools capacity planner to achieve automated scheduling, critical path simulation, and smart resource assignment.

## 1. Architectural Strategy: Two Gears, One Engine

The system uses `unified.tasks` and `unified.resource_allocations` as the single source of truth. We have two "gears" that operate on this truth:

### Gear 1: The Deterministic Slot Machine (`cal`) & Direct Assignment
- **Purpose:** Synchronous, user-driven booking (Calendly-style) or direct manual task assignment by a PM.
- **Behavior:** Calculates exact free time based on calendars. For PMs, it allows directly opening a `unified.task`, selecting exactly 1 Primary User (stored in `raci->'responsible'`), and optionally multiple staff/resources (stored in `unified.task_assignments` as per the unified assignee model). You can assign them simply with a "Due By" or "End By" date for floating tasks.
- **Output:** A locked `unified.task` and associated `unified.resource_allocation` records. **Note on Views:** `unified.v_tasks` is the primary listing for your Gantt and Scheduler screens, while `unified.resource_allocations` works under the hood as the strict capacity ledger to prevent double-booking.
- **Rule:** When the solver runs, manually locked tasks and time allocations are treated as **Hard Constraints** (fixed in time and resource).

### Gear 2: The Constraint Solver (OR-Tools)
- **Purpose:** Asynchronous, multi-task optimization and capacity planning.
- **Behavior:** Takes a graph of unallocated/floating tasks, looks at dependencies (`unified.task_dependencies`), resource pools (`unified.resource_pools`), and required skills. Runs a CP-SAT solver to find the optimal schedule (Forward/Backward pass for Critical Path) and resource assignment.
- **Output:** Bulk updates to `scheduled_start`/`scheduled_end` on `unified.tasks` and generates new `unified.task_assignments` and `unified.resource_allocations`.

---

## 2. API Consumer & UI Integration Approach

In the React UI (where you already have Gantt, Planner, and Scheduler screens), the integration flows as follows:

### A. Auto-Suggest for a Single Open Task
When a user clicks an "Assign" dropdown on an unallocated task in the Gantt or Board view:

1. **The DB RPC:** You will call a synchronous RPC `suggest_assignments(p_task_id)`.
2. **Under the hood:** This function will query `cal.get_available_slots` and apply strict geographic and organizational constraints. It filters by **Territory**, **Location**, **Team**, **Role**, and **Skills**. (e.g., The system ensures a physical task in a specific city/warehouse is only suggested for a resource whose `cal.territories` or base location matches, preventing impossible physical assignments). 
3. **UI Rendering:** The UI receives a ranked list of available users (e.g., "John Doe - 100% available", "Jane Smith - 50% available"). 
4. **Action:** User selects a person. The UI calls `api_new_core_upsert_data` to create a `unified.task_assignments` record.

### B. Full Project Solver & Critical Path Simulation
When a project manager wants to auto-schedule a whole phase or project:

1. **Triggering the Solver:** The UI presents an "Auto-Schedule" or "Optimize" button.
2. **The Call:** The UI inserts a job into the queue:
   ```javascript
   await supabase.rpc('api_new_core_upsert_data', {
     table_name: 'unified.scheduler_requests',
     data: {
       organization_id: orgId,
       project_id: currentProjectId,
       request_type: 'full_optimization', // or 'critical_path_only'
       status: 'PENDING'
     }
   });
   ```
3. **The Edge Function:** A Supabase Edge Function (or external Python worker) listens to `unified.scheduler_requests`. It pulls the task graph, runs OR-Tools, and writes the results back to `unified.tasks` and `unified.resource_allocations`.
4. **UI Realtime Updates:** The Gantt chart subscribes to Supabase Realtime on `unified.tasks` and `unified.resource_allocations`. As OR-Tools writes the results, the Gantt bars instantly animate to their new optimized dates, and the assigned avatars appear.

### C. Critical Path Visualization
- When OR-Tools runs, it calculates the "float" (slack) for each task. 
- Tasks with `float = 0` are on the Critical Path. The solver updates a `is_critical` boolean or `float` integer on `unified.tasks`.
- **UI Action:** The Gantt chart conditionally renders bars in **Red** if `task.is_critical === true`.

---

## 3. UI Testing Strategy

To test this hybrid deterministic/solver architecture in the React UI:

1. **Hard Constraint Test:** Use the `cal` booking UI to book "John" for Tuesday 9 AM - 12 PM. Verify this creates a locked `resource_allocation`.
2. **Auto-Suggest Conflict Test:** Open a floating task scheduled for Tuesday 10 AM. Click "Suggest Assignee". Verify that "John" does **not** appear in the suggestion list, proving the `cal` slot engine is correctly feeding availability to the PM views.
3. **Solver Execution Test:** Create 5 dependent tasks (A -> B -> C). Leave them unassigned. Click "Auto-Schedule". 
    - Verify the `scheduler_requests` row is created.
    - Verify Realtime pushes updates to the Gantt.
    - Verify the tasks are staggered correctly in time (respecting dependencies).
4. **Critical Path Highlight:** Extend one of the tasks' duration. Verify that upon the next solver run, the downstream tasks are pushed out, and the unbroken chain of zero-slack tasks turns Red on the Gantt chart.

## Resolved Architectural Decisions

> [!NOTE]
> **Solver Hosting:** The OR-Tools solver is hosted as a dedicated Python service on Google Cloud Run. The solver code resides in `/Users/macbookpro/zo_v2/zo-python-solver-service/`. It will interact with the database via the API or direct connection to process `scheduler_requests`.

> [!NOTE]
> **Manual Overrides vs Solver:** The solver operates strictly on a **manual trigger** basis (e.g., clicking an "Optimize" button). If a PM manually drags a task to a different day on the Gantt chart, the UI will simply flag any resulting conflicts and will wait for the PM to explicitly trigger the solver before re-calculating the schedule.

---
**Modified Files / DB Objects Documented:**
- `unified.tasks`
- `unified.resource_allocations`
- `cal.get_available_slots`
- `unified.scheduler_requests`
- `zo-python-solver-service`
