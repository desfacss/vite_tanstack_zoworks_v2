# CPO Guide: Unified Task Scheduling, Cal Engine & OR-Solver Integration
**Source of truth for frontend implementation**

> Date: 2026-06-12  
> Target: `/Users/macbookpro/zo/zo_core_v6_supa/.agent/brain/06-12-26/task-timeslot/`  
> Scope: Complete E2E use case and developer prompt for the React UI team to implement the unified scheduling and capacity planner.

---

## 1. Executive Summary: The "Slot Machine" meets the "Solver"

We have fundamentally upgraded how capacity and scheduling are handled. The legacy `calendar` schema has been ripped out and replaced by `cal`.
For the Project Management module, we now rely on three synchronized pillars:

1. **`unified.tasks`**: The ultimate source of truth. Whether a record is a PM Task, a Field Service Job, or a Calendar Appointment, it is a task.
2. **`cal` Slot Engine**: A deterministic engine that knows *exactly* when someone is free, factoring in synced Google/Microsoft calendars (`cal.blocked_windows`), personal availability rules, and geographical territories (`cal.resource_territories`).
3. **`p_scheduler` Edge Function**: The asynchronous OR-Tools engine running in Google Cloud Run / Supabase Edge Functions (`https://iemshcfgjcquzwnktwzo.supabase.co/functions/v1/p_scheduler`). It bulk-optimizes tasks by respecting dependencies, skill requirements, and the deterministic availability provided by `cal`.

---

## 2. The Core Use Case: Field Service / PM Dispatch

**Scenario**: You are a Dispatcher (or Project Manager) managing an installation project across multiple cities. You have 20 unassigned "floating" tasks in your Gantt chart.

**Step-by-Step Flow**:
1. **The Manual "Auto-Suggest" Override**:
   - You click on a specific critical task (e.g., "Install Server Rack in NY").
   - You click **"Suggest Assignees"** in the React UI.
   - The UI calls the `unified.suggest_assignments` RPC.
   - **What happens under the hood**: The RPC filters the entire workforce to find someone who (a) has the required skills, (b) belongs to the NY Territory (`cal.resource_territories`), (c) matches the required role, and (d) has no conflicts in `unified.resource_allocations` OR external Google Calendar blocks (`cal.blocked_windows`).
   - You select "Jane Doe". The UI saves this via `api_new_core_upsert_data` to `unified.task_assignments`. This creates a locked `resource_allocation`.

2. **The Bulk "Auto-Schedule" (OR-Tools Solver)**:
   - You now have 19 unassigned tasks and 1 locked task. You click **"Optimize Schedule"**.
   - The UI inserts a row into `unified.scheduler_requests` with `objective = 'minimize_duration'`.
   - **What happens under the hood**: This triggers the `p_scheduler` Edge Function. The Python OR-Tools worker wakes up. It treats "Jane Doe's" locked task and any synced calendar events as **Hard Constraints**. It then cascades the remaining 19 tasks across available technicians, respecting dependencies.
   - **The Result**: `p_scheduler` updates `scheduled_start` and `scheduled_end` on the tasks and creates new `resource_allocations`. The Gantt chart updates instantly via Realtime subscriptions.

---

## 3. Developer Prompt for React UI Team

> [!IMPORTANT]  
> **Copy/Paste this prompt to your UI Engineering Team or AI Coding Assistant to execute the frontend integration.**

### **UI Engineering Prompt: Unified Scheduler & Gantt Integration**

**Context**: We are integrating our React Gantt/Scheduler with the new `cal` backend and the `p_scheduler` edge function. We do not use legacy `calendar` tables anymore.

**Task 1: The "Suggest Assignees" Dropdown**
When a user clicks "Assign" on a task in the Gantt chart or Task Details panel, do not just list all users. You must call the backend RPC to get a ranked list of available, qualified resources.
- **Action**: Call `supabase.rpc('suggest_assignments', { p_task_id: task.id, p_limit: 10 })`.
- **UI Rendering**: Render the returned list (`resource_id`, `display_name`, `score`, `reasons`). Highlight the `reasons` array (e.g., showing a badge for "skills_match" or "team_match").
- **Save**: When the user selects a resource, call `api_new_core_upsert_data` on `unified.task_assignments` with `role = 'responsible'` (or update the task's `raci->'responsible'`). Do not write to `resource_allocations` directly; the backend triggers handle it.

**Task 2: The "Optimize Schedule" Button**
Add an "Optimize Schedule" (or "Auto-Schedule") button to the main toolbar of the Gantt chart.
- **Action**: When clicked, show a loading spinner and execute the following upsert:
  ```javascript
  await supabase.rpc('api_new_core_upsert_data', {
    table_name: 'unified.scheduler_requests',
    data: {
      organization_id: currentOrgId,
      project_id: currentProjectId,
      objective: 'minimize_duration', // or 'level_resources'
      status: 'pending'
    }
  });
  ```
- **Backend Routing**: This insert automatically triggers the edge function `https://iemshcfgjcquzwnktwzo.supabase.co/functions/v1/p_scheduler`. Do not call the edge function directly from the frontend via fetch. The database queue ensures transactional integrity.
- **Realtime**: Ensure the Gantt chart is subscribed to Supabase Realtime for `unified.tasks` and `unified.resource_allocations`. When the `p_scheduler` finishes, it will bulk update these tables, and the Gantt bars should instantly snap to their optimized dates.

**Task 3: Handling External Calendar Blocks**
- If you render a "Resource Timeline" or capacity view, you must query BOTH `unified.resource_allocations` (internal project tasks) AND `cal.blocked_windows` (external Google/Outlook events). Both dictate true capacity. Render `cal.blocked_windows` as grey "Busy" blocks where `is_blocking = true`.

---

## 4. Testing & Verification Checklist for CPO

To verify the correctness of the architecture and the new migration (`20260612000300_unified_suggest_assignments_geo.sql`):

1. **Verify Geo-Fencing**:
   - Assign a resource (e.g., "Bob") to the "Chicago" territory in `cal.resource_territories`.
   - Create a task with `vertical_payload: {"territory_id": "<chicago-uuid>"}`.
   - Run `suggest_assignments`. Bob should appear.
   - Change the task's territory to "New York". Bob should immediately disappear from the suggestions.

2. **Verify External Calendar Blocking**:
   - Create a manual block in `cal.blocked_windows` for Bob from 1pm - 3pm today.
   - Create a task scheduled for 2pm today.
   - Run `suggest_assignments`. Bob should be heavily penalized (`score` drops by 3) and listed with the reason `conflict`.

3. **Verify the Solver Queue**:
   - Insert a row into `unified.scheduler_requests` manually via SQL.
   - Check the logs of the `p_scheduler` Edge Function in the Supabase Dashboard to ensure it caught the webhook/trigger and attempted to process the project.
