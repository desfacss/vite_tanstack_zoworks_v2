# Technical Reference: DynamicForm Metadata Prefilling

**Session**: 2026-04-02 ~16:00–22:20 IST
**Topic**: Automated Field Population for Metadata (user_id, object_type)

## Overview
To ensure data integrity and reduce user friction, the `DynamicForm` logic automatically identifies and populates common metadata fields based on the current user session and the entity context.

## 1. Automatic `user_id` Prefilling
If a form schema includes a `user_id` field and it is currently empty, the component will automatically inject the ID of the currently logged-in user.

- **Source**: `useAuthStore` → `user.id`
- **Implementation**: `DynamicForm` → `initialSetup` hook.
- **Precedence**: This prefill only triggers if the field is present in the `data_schema` and is currently `null` or `undefined`.

## 2. Automatic `object_type` Prefilling
When records are created or edited via `GlobalActions` or `RowActions`, the `object_type` field must often match the table name of the entity.

- **Source**: `entityType` prop (e.g., `crm.accounts`) or `db_schema.table`.
- **Extraction Logic**: `entityType.split('.').pop()` (extracts `accounts` from `crm.accounts`).
- **Prefill Trigger**:
    - **UI Level**: Done in `DynamicForm.initialSetup` for display to the user.
    - **Action Level**: Explicitly reinforced in `GlobalActions.tsx` and `RowActions.tsx` during mutation to ensure the field is sent even if hidden in the form.

## 3. Propagation across Components
The prefilling works in three stages:
1.  **Parent Action**: `GlobalActions` or `RowActions` identify the `entityType`.
2.  **Form Prop**: The `entityType` is passed as a prop to `DynamicForm`.
3.  **Form Logic**: The `DynamicForm` uses `initialSetup` to merge these values into the `localFormData`.

## Modified Components
- `src/core/components/DynamicForm/index.tsx`
- `src/core/components/DynamicViews/GlobalActions.tsx`
- `src/core/components/DynamicViews/RowActions.tsx`
