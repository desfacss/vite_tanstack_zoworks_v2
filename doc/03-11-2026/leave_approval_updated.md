# UI Architecture: Multi-Tier Approvals & Workforce Records
**Session**: 2026-03-11 ~17:39 IST

This document defines the architectural approach for rendering Workforce records (Leaves, Expenses, Timesheets) and their respective Approval actions in the UI, fully leveraging V5.1 Schema and Row Level Security (RLS).

## 1. Data Separation: 'My Leaves' vs 'Team Leaves'

You do **not** need complex backend queries or custom RPCs to split this data. Supabase's integrated RLS policy `tenant_isolation_policy` paired with `workforce.util_can_access_workforce_record` automatically acts as a data firewall.

### How RLS Evaluates Visiblity
The `util_can_access_workforce_record` function evaluates every row in the Database against the requesting User ID. It guarantees visibility using 4 Gates:
1. **Platform Master Gate**: SaaS Admins see everything.
2. **Personal Gate**: Users always see their own records.
3. **Managerial Gate**: Uses the `path` LTREE (`identity.get_subordinates_by_user`) to grant managers visibility over subordinates (but *only* if the record is submitted, "Drafts" belong to the user).
4. **Functional Gate**: HR Managers/Approvers see all records within their `location_id` scope.

### Frontend Implementation
Because the Database natively filters the data, the Frontend simply filters by relation:

**Tab 1: My Leaves**
typescript
// Query the user's personal records
const fetchMyLeaves = async () => {
    return await supabase
        .from('workforce.v_leave_applications') // V5.1 standard composer view
        .select('*')
        .eq('user_id', myUserId);
}


**Tab 2: Team Leaves (Manager/HR View)**
typescript
// Query records belonging to the team
// RLS automatically drops records the user is not authorized to see
const fetchTeamLeaves = async () => {
    return await supabase
        .from('workforce.v_leave_applications')
        .select('*')
        .neq('user_id', myUserId); 
}


---

## 2. Dynamic Action Buttons (Approve / Reject)

You are absolutely correct to point out the active functions. In the Live Database, the correct V5 standard function is `identity.get_all_approvers_from_blueprint`. 

This function is the central source of truth for "Who holds the baton right now?". 

### How the Escalation Logic Works (Blueprint Driven)
Rather than hardcoding SLA times, the function dynamically reads the `assignments` array from the state machine (`automation.bp_process_blueprints`):
- It evaluates the SLA phases (e.g., Phase 1: `delay: 0`, Phase 2: `delay: 48 hours`).
- Based on `elapsed_time`, it selects the **active phase** and parses the role definitions (e.g., `MANAGER` levels or specific `ROLE` IDs).
- It executes the LTREE path calculation (`reporting_chain`) to resolve the exact User IDs.

### Frontend Implementation
To show the Approve/Reject buttons cleanly without duplicating logic on the client, you have two approaches.

#### Approach A: On-Demand Evaluation (Recommended for Detail Views)
When a Manager clicks into a specific Leave Application to review it:

1. The UI fetches the record details.
2. The UI concurrently calls the RPC to verify their authority:
typescript
const { data: approvers } = await supabase.rpc('get_all_approvers_from_blueprint', {
    p_blueprint_id: record.blueprint_id,             // Link to automation.bp_process_blueprints
    p_current_stage_id: record.status,               // e.g. 'Submitted'
    p_submitter_org_user_id: record.organization_user_id,
    p_organization_id: record.organization_id,
    p_stage_entered_at: record.updated_at,           // Anchor for SLA delays
    p_current_time: new Date().toISOString()
});

// Check if the current user is in the active approvers array
const isAuthorizedToApprove = approvers.some(a => a.approver_user_id === myUserId);

3. If `isAuthorizedToApprove` is true, render the Action Bar containing [Approve] and [Reject].

#### Approach B: Database View Injection (Recommended for List Views)
If you need to display an "Awaiting Your Approval" badge in the Datatable, the optimal strategy is to update the Composer `comp_util_ops_bootstrap_entity` to inject a boolean subquery directly into the `v_` view:

sql
-- Conceptual modification to the Composer View injection
SELECT
    base.*,
    (auth.uid() IN (SELECT approver_user_id FROM identity.get_all_approvers_from_blueprint(base.blueprint_id, base.status, base.organization_user_id, base.organization_id, base.updated_at, NOW()))) AS is_pending_my_approval
FROM workforce.leave_applications base

*Note: Approach B is heavier on Database compute because it calculates the SLA delay and LTREE hierarchy for every row in the list view.*

### Cancel Buttons
The "Cancel" button is distinct from Approval. 
- Only the **Submitter** (Owner) or **HR** should see "Cancel".
- **Rule**: `if (record.user_id === myUserId && (status === 'Submitted' || status === 'Approved')) render <CancelButton />`

---
### Dependencies & Schema Modifications
- Fixed `manager_id` foreign key reference in `identity.organization_users` to fix `LTREE` pathing.
- Confirmed `workforce.util_can_access_workforce_record` RLS policies.