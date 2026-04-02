---
description: How to update and customize the Approval Flow UI buttons and logic
---

# Workflow: Updating Approval Flow UI

This workflow describes the process for modifying the behavior and appearance of approval action buttons based on the record's blueprint lifecycle.

## File Involved
- `src/core/components/details/ApprovalActionButtons.tsx`

## Steps

### 1. Identify Target Stages and Transitions
Check the blueprint definition (JSON) for the entity (e.g., `leave_applications`).
- Find the `lifecycle.stages` and `lifecycle.transitions`.
- Identify which transitions should be visible in which stage.

### 2. Allow Buttons in Post-Approval Stages
By default, the UI hides buttons in terminal stages like `Approved`.
To allow buttons (e.g., "Cancel Approved Leave") to show:
- Locate the `terminalStages` array in `checkApproverEligibility`.
- Remove the stage ID (e.g., `'Approved'`) from that array.

### 3. Identify Approvers for Non-Active Stages
If you are showing buttons in a stage that doesn't have its own active approval rules (like a post-approval stage):
- Modify the `p_current_stage_id` in the `get_all_approvers_from_blueprint` RPC call.
- Use a fallback stage ID (e.g., `'Submitted'`) to identify the original approvers (Managers).

### 4. Customize Button Labels
For better UX, map formal stage-transition IDs to active action verbs:
- Create a `displayLabel` mapping in the `availableTransitions.map` block.
- Example: `Approved` → `Approve`, `Rejected` → `Reject`.

### 5. Define Permission Logic (`canPerform`)
Refine who can see which buttons based on the current stage:
- Use `isSubmitter` for owner-only actions.
- Use `isApprover` for manager-level actions.
- Combine with `currentStageId` to create conditional visibility.

## Conjugation Check
If you rename button labels (e.g., "Approve" instead of "Approved"), ensure you update the `onSuccess` message in the `updateStageMutation` to conjugate the verb correctly (e.g., `Successfully Approved!`).
