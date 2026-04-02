# Approval Flow Implementation & Process Sync Reference

**Session**: 2026-04-02 ~16:00–22:20 IST
**Topic**: Single Source of Truth for Approval Logic and UI Integration

## 1. System Overview
The approval system is **Blueprint-driven**, meaning both the backend state machine and the frontend UI buttons are dynamically generated based on a JSON definition stored in `automation.bp_process_blueprints`.

The UI component `ApprovalActionButtons.tsx` acts as the bridge between the database record's current state and the available actions defined in its blueprint.

---

## 2. Process Configuration (Blueprints)
Blueprints define the "Rules of the Game" for an entity (e.g., `leave_applications`).

### Key Structures:
- **`lifecycle.stages`**: Defines the valid states (e.g., `Draft`, `Submitted`, `Approved`, `Rejected`, `Cancelled`).
- **`lifecycle.transitions`**: Defines how a record moves between stages.
    - Each transition has a `from` and `to` stage.
    - `guard_rules.allowed_roles`: Defines which roles (e.g., `OWNER`, `MANAGER`) are theoretically allowed to trigger the transition.
- **`approval_rules`**: Defines who the specific approvers are for a given stage (e.g., `L1_MANAGER`).

---

## 3. UI Implementation (`ApprovalActionButtons.tsx`)
This component is responsible for rendering the **Approve**, **Reject**, and **Cancel** buttons on a record's details page.

### Execution Flow:
1.  **Eligibility Check (`checkApproverEligibility`)**:
    *   Calls the RPC `identity.get_all_approvers_from_blueprint`.
    *   **Sync Logic**: It passes the `currentStageId` to the RPC. 
    *   **Special Case (Post-Approval)**: If the stage is `Approved`, it passes `Submitted` as the reference stage to the RPC. This ensures that the Managers (approvers of the submission) are correctly identified for post-approval actions like Cancellation.
2.  **Transition Discovery**:
    *   Filters the blueprint's `lifecycle.transitions` to find those where `from === currentStageId`.
3.  **Permission Logic (`canPerform`)**:
    *   **Approve/Reject**: Only shown if `isApprover` (returned by the RPC) is true.
    *   **Cancel (Pending)**: Only shown if `isSubmitter` (the record creator) is true.
    *   **Cancel (Approved)**: Shown if `isSubmitter` OR `isApprover` is true.

### UI Label Mapping:
To ensure a premium user experience, the system maps backend stage IDs to active action verbs for button labels:
- `Approved` → **Approve**
- `Rejected` → **Reject**
- `Cancelled` → **Cancel**

---

## 4. Synchronization Points
| Feature | Blueprint Property | UI Implementation |
| :--- | :--- | :--- |
| **Button Visibility** | `lifecycle.transitions` | Filtered by `currentStageId` |
| **Permissions** | `guard_rules` & `approval_rules` | Via `checkApproverEligibility` and `canPerform` |
| **Action Labels** | `transitions[].label` | Mapped to UI verbs (`Approve`, `Reject`, `Cancel`) |
| **Post-Action** | `transitions[].to` | Passed to `api_new_core_upsert_data` as the new `status`/`stage_id` |

---

## 5. Traceability Matrix

### Modified Files:
- [ApprovalActionButtons.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/core/components/details/ApprovalActionButtons.tsx) (Logic for stage-specific cancellation and manager identification)
- [DynamicForm/index.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/core/components/DynamicForm/index.tsx) (Added `object_type` prefilling)
- [GlobalActions.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/core/components/DynamicViews/GlobalActions.tsx) (Passed `entityType` and added `object_type` to payload)
- [RowActions.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/core/components/DynamicViews/RowActions.tsx) (Same as GlobalActions)
- [columnRenderers.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/core/components/utils/columnRenderers.tsx) (Updated date formatting to absolute values)

### Database Objects Involved:
- `automation.bp_process_blueprints`: Blueprint source of truth.
- `identity.get_all_approvers_from_blueprint`: Logic for resolving approvers.
- `core.rpc.api_new_core_upsert_data`: Execution of stage transitions.
- `core.entities`: Metadata and table name mapping (`object_type`).
