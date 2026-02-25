# Implementation Detail: Tenant-Specific Enum Overrides

This document outlines the logic for handling tenant-specific enum overrides in `RJSFCoreForm`.

## Objective
Enable the system to prioritize tenant-specific categorical data over global data. If a tenant has defined specific values for a filtered set (e.g., a specific `status` list), only those values should be displayed in the form dropdowns, superceding the global defaults.

## Logic Overview

### 1. Schema Support
The `EnumSchema` interface and `replaceEnums` utility are updated to support a single `filter` object in the schema:
```json
"enum": {
    "table": "v_enums_tenanted",
    "column": "value",
    "filter": { "value_type": "status" },
    "schema": "core"
}
```
This is converted into the standardized `FilterType[]` format before being passed to the fetcher.

### 2. Priority-Based Fetching
The `fetchDataForDropdown` function implements the following priority logic:

1.  **Single Query**: Fetch records where `organization_id` matches the current tenant OR is `NULL`.
2.  **Detection**: Check if any returned records belong to the current tenant.
3.  **Override**: 
    -   If **at least one** record has the current `organization_id`, filter the entire set to include **ONLY** tenant records.
    -   Otherwise, fall back to the global records (where `organization_id` is `NULL`).

### 3. Benefits
-   **Reduced Latency**: Reduces the number of database roundtrips by fetching tenant and global data in a single request.
-   **Consistency**: Ensures that a tenant's custom configuration completely "hides" global defaults when they choose to override a specific category.
-   **No Duplicates**: Prevents merging global and tenant values which could lead to redundant options for users.

## Component Impact
- `RJSFCoreForm/index.tsx`: Core fetch logic and interface updates.
- `DynamicForm/Widgets.tsx`: No change required as it consumes processed enums.
