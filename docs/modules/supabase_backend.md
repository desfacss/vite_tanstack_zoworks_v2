# Supabase Backend Module

This module handles all interactions with the Supabase backend, including authentication, data fetching, and executing server-side logic via RPCs.

## Core Client: `supabase.ts`

**Location**: `src/lib/supabase.ts`

The `supabase` client is initialized using the `createClient` function from `@supabase/supabase-js`. It is configured to persist sessions in local storage and handle auto-refreshing of tokens.

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // ...
  },
  // ...
});
```

## Key Functions

### 1. Data Fetching with RPCs
The application primarily uses Remote Procedure Calls (RPCs) to fetch data. This allows for complex server-side logic, such as joining tables, applying permissions, and flattening JSON structures, to be encapsulated in the database.

-   **`core_get_entity_data_v30`**: The main RPC used by `DynamicViews`. It accepts a configuration object (filters, pagination, sorting) and returns the requested entity data along with metadata.
-   **`idt_utils_get_merged_app_settings`**: Fetches application settings merged from organization and location levels.

### 2. Helper Utilities
`src/lib/supabase.ts` exports several helper functions to simplify common tasks:

-   **`fetchEntityData`**: A wrapper around Supabase queries to fetch data for a specific entity type, handling flattening and foreign key lookups.
-   **`fetchForeignKeyDisplayValue`**: Resolves foreign key IDs to their display values (e.g., fetching a user's name given their `user_id`). It includes caching and retry logic.
-   **`getOrganizationLocations`**: Fetches active locations for an organization.
-   **`saveDashboard` / `loadDashboards`**: Manages dashboard configurations.

## Authentication
Authentication is managed via the `useAuthStore` (in `src/lib/store.ts`), which interacts with `supabase.auth`. The store handles:
-   User login/logout.
-   Session management.
-   Fetching user profile and permissions.

## Best Practices
-   **Use RPCs for Complex Queries**: Avoid complex client-side joins. Use RPCs to keep the client logic simple and performant.
-   **Centralized Client**: Always use the exported `supabase` instance from `src/lib/supabase.ts` to ensure consistent configuration.
-   **Type Safety**: Use the types defined in `src/lib/types.ts` (or generated types) when interacting with Supabase.
