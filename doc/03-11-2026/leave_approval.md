I have documented the complete UI Architecture for rendering multi-tier approvals ("My Leaves" vs "Team Leaves") and the logic for the action buttons (Approve/Reject/Cancel).

Here is the high-level summary of the approach detailed in the attached guide:

1. "My Leaves" vs "Team Leaves" (The Data Layer) You do not need custom backend queries to split this data. The Database's Row Level Security (tenant_isolation_policy and workforce.util_can_access_workforce_record) handles this automatically.

My Leaves: The Frontend simply calls SELECT * FROM workforce.v_leave_applications WHERE user_id = myUserId.
Team Leaves: The Frontend calls SELECT * FROM workforce.v_leave_applications WHERE user_id != myUserId. Because of RLS, the Database will only return records belonging to the current user's subordinates (if they are a manager) or all location records (if they are HR). Regular employees will simply get an empty array.
2. Approve / Reject Buttons (The Action Layer) You recalled correctly: the identity schema acts as the approver truth. Specifically, the function identity.fn_get_escalation_approvers(submitter_org_user_id, org_id, submitted_at) is still the best and most accurate approach.

Before 48 Hours: It strictly limits approval arrays to the immediate L1 Manager (using the LTREE pathing we just fixed).
After 48 Hours (Escalation): It breaches the SLA and expands the array to include the full management chain (L2, L3) + HR Administrators.
UI Implementation: The simplest approach is for the UI to fetch this RPC array when viewing a record. If myUserId is in that array, render the [Approve] and [Reject] buttons.
3. Cancel Button Only the submitter/owner or HR should see this, and only when the status is Submitted or Approved.