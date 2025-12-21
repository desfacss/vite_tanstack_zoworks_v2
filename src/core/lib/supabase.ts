// Make sure Location is imported if used here, or handled within types.ts
import { createClient, Session } from '@supabase/supabase-js';
import { Organization, User, Module, MasterDataSchema, Dashboard, Location } from './types';

// --- Supabase Client Initialization (Keep) ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Please check your environment variables.');
  throw new Error('Missing Supabase configuration');
}

/**
 * @const supabase
 * @description The initialized Supabase client instance. Exported for use across the app.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'app.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Dynamic cookie domain for cross-subdomain session sharing
    cookieOptions: {
      domain: typeof window !== 'undefined'
        ? (window.location.hostname.includes('localhost') ? 'localhost' : '.zoworks.ai')
        : undefined,
      path: '/',
      sameSite: 'lax',
      secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : true,
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'dashboard-app', // Example header
    },
  },
});

// ----------------------------------------------------------------------
// --- DEPRECATED / REDUNDANT FUNCTIONS ---
// These functions represent an older pattern of fetching auth data piece by piece.
// The `fetchUserSession` action in `useAuthStore` now handles fetching all
// necessary session data via the `jwt_get_user_session` RPC in a single, consistent way.
// They are commented out to prevent accidental usage but kept for reference.
// ----------------------------------------------------------------------

// let isHandlingAuthError = false; // Lock for the deprecated handler

/**
 * @function refreshSession
 * @deprecated Supabase client handles token refreshing automatically. Manual refresh is rarely needed.
 * @private
 */
/*
async function refreshSession(maxRetries = 3, retryDelay = 1000): Promise<Session | null> {
  console.warn('Deprecated function `refreshSession` called.');
  let retries = 0;
  // ... (rest of implementation)
  while (retries < maxRetries) {
    // ... try/catch logic ...
  }
  return null;
}
*/

/**
 * @function handleAuthError
 * @deprecated This handler uses `window.location.href`, causing full page reloads and breaking SPA flow.
 * Error handling and redirection are now managed within `useAuthStore` (calling supabase.auth.signOut)
 * and `AuthGuard` (using `react-router-dom` navigation). Avoid using this.
 * @private
 */
/*
async function handleAuthError(): Promise<void> {
   console.error('Deprecated function `handleAuthError` called. This causes full page reloads!');
   // Original implementation using window.location.href
    if (isHandlingAuthError) return;
    isHandlingAuthError = true;
    try {
        if (window.location.pathname === '/login') return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await supabase.auth.signOut();
        }
        // ... (manual storage clearing - often redundant after signOut) ...
        localStorage.removeItem('app.auth.token'); // Example minimal cleanup
        window.location.href = '/login';
    } catch (error) {
        console.error('Error in deprecated handleAuthError:', error);
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    // No finally block to reset isHandlingAuthError due to hard redirect
}
*/

/**
 * @function getUserPermissions
 * @deprecated Permissions are now included in the data returned by the `jwt_get_user_session` RPC
 * and are available in the `useAuthStore` state (`store.permissions`).
 */

// export async function getUserPermissions(userId: string): Promise<any | null> {
//   console.warn('Deprecated function `getUserPermissions` called. Use `useAuthStore` state.');
//   if (!userId) {
//     console.error('`getUserPermissions` called without userId.');
//     return null;
//   }
//   try {
//     // Original implementation...
//     const { data, error } = await supabase.rpc('get_user_module_permissions_v3_DEPRECATED', { p_user_id: userId });
//     if (error) throw error;
//     console.log("bz",data);
//     return data;
//   } catch (error) {
//     console.error('Error in deprecated `getUserPermissions`:', error);
//     return null;
//   }
// }


/**
 * @function getCurrentUser
 * @deprecated Full user details are now fetched via `fetchUserSession` in `useAuthStore`
 * (after getting the user_id from the RPC) and are available in the store state (`store.user`).
 */
/*
export async function getCurrentUser(): Promise<User | null> {
  console.warn('Deprecated function `getCurrentUser` called. Use `useAuthStore` state.');
  try {
     // Original implementation...
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser?.user) {
        console.error('Deprecated `getCurrentUser`: Auth user not found.', authError);
        // await handleAuthError(); // Avoid calling the deprecated handler
        await supabase.auth.signOut(); // Prefer direct sign out
        return null;
    }
    const { data: user, error } = await supabase
        .schema('identity').from('v_users_permissions') // Or 'users' table directly
        .select(`*, role_id ( * )`) // Select appropriately
        .eq('auth_id', authUser.user.id) // Or use 'id' if using 'users' table
        .eq('is_active', true)
        .single();

    if (error) { console.error('Deprecated `getCurrentUser`: DB fetch error.', error); await supabase.auth.signOut(); return null; }
    if (!user) { console.error('Deprecated `getCurrentUser`: User not found in DB.'); await supabase.auth.signOut(); return null; }

    return { ...user, user_metadata: authUser?.user?.user_metadata }; // Combine if needed

  } catch (error) {
    console.error('Error in deprecated `getCurrentUser`:', error);
     await supabase.auth.signOut(); // Ensure signout on unexpected errors
    return null;
  }
}
*/

/**
 * @function getCurrentOrganization
 * @deprecated Full organization details are now fetched via `fetchUserSession` in `useAuthStore`
 * (after getting the org_id from the RPC) and are available in the store state (`store.organization`).
 */
/*
export async function getCurrentOrganization(user?: User): Promise<Organization | null> {
  console.warn('Deprecated function `getCurrentOrganization` called. Use `useAuthStore` state.');
   // Original implementation relied on user object or complex lookup...
   // This demonstrates why the centralized fetchUserSession is better.
   const orgId = user?.pref_organization_id; // Need orgId somehow

  if (!orgId) {
    console.error('Deprecated `getCurrentOrganization` requires organization_id.');
    return null;
  }
  try {
    const { data: org, error } = await supabase
      .schema('identity').from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle(); // Use maybeSingle

    if (error) throw error;
    return org;
  } catch (error) {
    console.error('Error in deprecated `getCurrentOrganization`:', error);
    return null;
  }
}
*/

/**
 * @function getCurrentLocation
 * @deprecated User's default/current location details are now fetched via `fetchUserSession` in `useAuthStore`
 * (after getting the location_id from the RPC, if available) and are available in the store state (`store.location`).
 */
/*
export async function getCurrentLocation(user?: User): Promise<Location | null> {
   console.warn('Deprecated function `getCurrentLocation` called. Use `useAuthStore` state.');
    // Original implementation relied on user object or complex lookup...
    const locId = user?.location_id; // Need locationId somehow

   if (!locId) {
     console.info('Deprecated `getCurrentLocation`: No location ID associated with user.');
     return null; // Not necessarily an error
   }
   try {
     const { data: location, error } = await supabase
       .schema('identity').from('locations') // Adjust schema if needed
       .select('*')
       .eq('id', locId)
       .eq('is_active', true)
       .maybeSingle(); // Use maybeSingle

     if (error) throw error;
     return location; // Can be null if not found or inactive
   } catch (error) {
     console.error('Error in deprecated `getCurrentLocation`:', error);
     return null;
   }
}
*/


// ----------------------------------------------------------------------
// --- ACTIVE HELPER FUNCTIONS (Keep and Enhance) ---
// These functions provide utility beyond the core session data fetched by the store.
// ----------------------------------------------------------------------

/**
 * Fetches merged application settings based on organization and optional location.
 * Assumes an RPC function `idt_utils_get_merged_app_settings` exists.
 */
// export const getMergedAppSettings = async (orgId: string | null | undefined, locationId: string | null | undefined): Promise<any | null> => {
//   if (!orgId) {
//     // console.warn('getMergedAppSettings called without orgId, cannot fetch settings.');
//     // Return null or default settings if appropriate when no org context exists
//     return null;
//   }
//   try {
//     const { data, error } = await supabase.rpc('idt_utils_get_merged_app_settings_DEPRECATED_REDO', {
//       p_organization_id: orgId,
//       p_location_id: locationId // Pass null if locationId is not available/applicable
//     });

//     if (error) {
//       console.error('Error fetching merged app settings:', error);
//       return null; // Return null on error
//     }
//     return data; // Return the fetched settings object
//   } catch (err) {
//       console.error('Exception calling getMergedAppSettings RPC:', err);
//       return null;
//   }
// };


/**
 * Fetches all active locations for a specific organization.
 * Useful for UI elements like location selectors.
 */
export async function getOrganizationLocations(organizationId: string): Promise<Location[]> {
  if (!organizationId) {
    console.warn('getOrganizationLocations called without organizationId.');
    return []; // Return empty array if no ID provided
  }
  try {
    const { data: locations, error } = await supabase
      .schema('organization') // Ensure schema is correct
      .from('locations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true }); // Add ordering for consistency

    if (error) {
      console.error(`Error fetching locations for org ${organizationId}:`, error);
      return []; // Return empty array on error
    }
    return locations || []; // Ensure an array is always returned
  } catch (error) {
    console.error('Exception in getOrganizationLocations:', error);
    return [];
  }
}

/**
 * Fetches all organizations from the identity schema.
 * Primarily useful for super-admin or system-level views.
 */
export async function getAllOrganizations(): Promise<Organization[]> {
  try {
    const { data: organizations, error } = await supabase
      .schema('identity')
      .from('organizations')
      .select('*')
      .order('name', { ascending: true }); // Add ordering

    if (error) {
      console.error('Error fetching all organizations:', error);
      return [];
    }
    return organizations || [];
  } catch (error) {
    console.error('Exception in getAllOrganizations:', error);
    return [];
  }
}


// --- DASHBOARD & DATA FETCHING UTILITIES (Keep) ---
// These functions handle application-specific data operations.

// Cache for foreign key lookups (Keep)
const foreignKeyCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Backoff helper (Keep)
const backoff = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);

// Foreign Key Lookup Helper (Keep - Refined)
const fetchForeignKeyDisplayValue = async (
  foreignKey: { source_table: string; source_column: string; display_column: string },
  value: any,
  maxRetries = 3
): Promise<any> => {
  // ...(Implementation using maybeSingle, caching, retries - looks reasonable)
  if (value === null || value === undefined) return value; // Skip lookup if value is null/undefined

  try {
    if (!foreignKey.source_table || !foreignKey.source_column || !foreignKey.display_column) {
      console.warn('Invalid FK config:', foreignKey); return value;
    }
    const cacheKey = `${foreignKey.source_table}:${foreignKey.source_column}:${value}`;
    const cached = foreignKeyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.value;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from(foreignKey.source_table)
          .select(foreignKey.display_column)
          .eq(foreignKey.source_column, value)
          .maybeSingle(); // Use maybeSingle for safety

        if (error) {
          // Don't retry on auth errors or specific DB errors like "relation does not exist"
          if (error.code === 'JWT_INVALID' || error.code?.startsWith('42P')) throw error;
          // Retry on network/timeout or standard server errors
          if (attempt < maxRetries - 1) { await new Promise(res => setTimeout(res, backoff(attempt))); continue; }
          throw error; // Throw last error after retries
        }

        const result = data ? data[foreignKey.display_column] : value; // Fallback to original value if lookup returns null
        foreignKeyCache.set(cacheKey, { value: result, timestamp: Date.now() });
        return result;
      } catch (retryError) {
        if (attempt === maxRetries - 1) throw retryError; // Throw error after final attempt
        // Wait before retrying
        await new Promise(res => setTimeout(res, backoff(attempt)));
      }
    }
    return value; // Fallback if retries fail unexpectedly
  } catch (error: any) {
    console.error(`FK Lookup Failed for ${foreignKey.source_table} [${foreignKey.source_column}=${value}]:`, error.message);
    return value; // Return original value on hard failure
  }
};

// Flatten Data Helper (Keep - Refined)
const flattenData = async (rawData: any[] | null, metadata: MasterDataSchema[]): Promise<any[]> => {
  if (!rawData) return [];
  // ... (Implementation using fetchForeignKeyDisplayValue - Ensure null checks)
  const flattenedResults = await Promise.all(
    rawData.map(async (item) => {
      const flattened: Record<string, any> = { id: item.id }; // Always include ID if present
      for (const meta of metadata) {
        const key = meta.key;
        let value;
        try {
          if (key.includes('.')) {
            value = key.split('.').reduce((obj, k) => obj?.[k], item);
          } else {
            value = item[key];
          }

          if (meta.foreign_key && value !== null && value !== undefined) {
            value = await fetchForeignKeyDisplayValue(meta.foreign_key, value);
          }
          flattened[key] = value ?? null; // Use nullish coalescing for undefined/null
        } catch (error) {
          console.error(`Error processing field ${key} for item ${item.id}:`, error);
          flattened[key] = null; // Set field to null on error
        }
      }
      return flattened;
    })
  );
  return flattenedResults;
};


// Map Display Name Helper (Keep)
const mapDisplayNameToKey = (displayName: string | undefined, metadata: MasterDataSchema[]): string | undefined => {
  // ... (Implementation looks okay)
  if (!displayName) return undefined;
  const meta = metadata.find((m) => m.display_name === displayName);
  return meta ? meta.key : displayName; // Fallback to display name if key not found
};

// Fetch Available Entities (Keep)
export const fetchAvailableEntities = async () => {
  // ... (Implementation looks okay)
  try {
    const { data, error } = await supabase.from('y_view_config').select('entity_type, metadata');
    if (error) throw error;
    return (data || []).map((item) => ({ type: item.entity_type, metadata: item.metadata || [] }));
  } catch (error) {
    console.error('Error fetching available entities:', error);
    return [];
  }
};

// Fetch Metadata (Keep)
export const fetchMetadata = async (entityType: string): Promise<MasterDataSchema[]> => {
  // ... (Implementation looks okay, added not found handling)
  try {
    const { data, error } = await supabase
      .from('y_view_config')
      .select('metadata')
      .eq('entity_type', entityType)
      .maybeSingle(); // Use maybeSingle for safety

    if (error) throw error;
    return data?.metadata || []; // Return metadata or empty array if not found
  } catch (error) {
    console.error(`Error fetching metadata for ${entityType}:`, error);
    return []; // Return empty array on error
  }
};


// Fetch Entity Data (Keep - Refined)
export const fetchEntityData = async (entityType: string, dataConfig: any): Promise<{ data: any[], count: number | null }> => {
  // ... (Implementation with filtering, sorting, pagination, flattening, widget logic - Ensure robustness)
  let count: number | null = null;
  try {
    const metadata = await fetchMetadata(entityType);
    if (!metadata || metadata.length === 0) {
      console.warn(`No metadata found for entityType: ${entityType}. Cannot apply display name mappings.`);
      // Proceed without metadata-based key mapping if necessary, or return error
    }

    // Base query - request count along with data
    let query = supabase.from(entityType).select(dataConfig.select || '*', { count: 'exact' });

    // Apply Filters (Refined logic)
    if (dataConfig.filters && Array.isArray(dataConfig.filters)) {
      dataConfig.filters.forEach((filter: any) => {
        if (filter.field && filter.operator && filter.value !== undefined) {
          // Map display name to key, fallback to field name if not found in metadata
          const fieldKey = mapDisplayNameToKey(filter.field, metadata) || filter.field;
          // Handle potential JSONB dot notation (simple case)
          const queryField = fieldKey.includes('.') ? `${fieldKey.split('.')[0]}->>${fieldKey.split('.')[1]}` : fieldKey;

          // Apply filters safely
          try {
            switch (filter.operator) {
              case 'equals': query = query.eq(queryField, filter.value); break;
              case 'not_equals': query = query.neq(queryField, filter.value); break;
              case 'greater_than': query = query.gt(queryField, filter.value); break;
              case 'less_than': query = query.lt(queryField, filter.value); break;
              case 'greater_than_or_equals': query = query.gte(queryField, filter.value); break;
              case 'less_than_or_equals': query = query.lte(queryField, filter.value); break;
              case 'contains': query = query.ilike(queryField, `%${filter.value}%`); break;
              case 'in':
                if (Array.isArray(filter.value) && filter.value.length > 0) {
                  query = query.in(queryField, filter.value);
                }
                break;
              case 'is_null': query = query.is(queryField, null); break;
              case 'is_not_null': query = query.not(queryField, 'is', null); break;
              // Add other operators as needed
              default: console.warn(`Unsupported filter operator: ${filter.operator}`);
            }
          } catch (filterError) {
            console.error(`Error applying filter on field '${queryField}':`, filterError);
            // Optionally skip filter or throw error depending on desired behavior
          }

        } else { console.warn('Skipping invalid filter:', filter); }
      });
    }

    // Apply Sorting
    if (dataConfig.sortBy && dataConfig.sortBy.field) {
      const sortKey = mapDisplayNameToKey(dataConfig.sortBy.field, metadata) || dataConfig.sortBy.field;
      if (sortKey) { // Check if sortKey is valid
        query = query.order(sortKey, { ascending: dataConfig.sortBy.direction !== 'desc' }); // Default to asc
      }
    }

    // Apply Pagination
    const pageSize = dataConfig.pageSize || 10; // Default page size
    const currentPage = dataConfig.currentPage || 1; // Default page number
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute Query
    const { data, error, count: queryCount } = await query;
    if (error) throw error;
    count = queryCount; // Store the count

    // Flatten Data (with FK lookups)
    const flattenedData = await flattenData(data || [], metadata);

    // --- Optional Widget Processing ---
    // (Keep widget processing logic here if needed, ensure it uses the mapped keys)
    // const widgetConfig = dataConfig.widgetConfig;
    // if (widgetConfig) {
    //    // ... process flattenedData based on widgetConfig ...
    //    // Return processed widget data structure instead of flattenedData
    //    return { data: processedWidgetData, count };
    // }

    return { data: flattenedData, count }; // Return flattened data + count

  } catch (error) {
    console.error(`Error fetching entity data for ${entityType}:`, error);
    return { data: [], count: 0 }; // Return empty state on error
  }
};


// Save Dashboard (Keep - Refined Return Type)
export const saveDashboard = async (dashboard: Dashboard): Promise<{ success: boolean, data?: Dashboard | null, error?: any }> => {
  // ...(Implementation looks okay, improved return type)
  try {
    const dashboardData = { /* map dashboard to DB columns */
      id: dashboard.id || undefined, name: dashboard.name, entity_type: dashboard.entityType,
      widgets: dashboard.widgets, organization_id: dashboard.organizationId, /* created_by, updated_by if needed */
    };
    const { data, error } = await supabase.from('dashboards').upsert(dashboardData).select().single();
    if (error) throw error;
    // Map data back if needed
    const savedData: Dashboard = { ...data, entityType: data.entity_type, organizationId: data.organization_id };
    return { success: true, data: savedData };
  } catch (error) {
    console.error('Error saving dashboard:', error);
    return { success: false, data: null, error };
  }
};

// Load Dashboards (Keep - Refined)
export const loadDashboards = async (organizationId: string): Promise<Dashboard[]> => {
  // ...(Implementation looks okay, added filtering and error handling)
  if (!organizationId) return [];
  try {
    const { data, error } = await supabase
      .from('dashboards')
      .select('*')
      .eq('organization_id', organizationId) // Ensure org filter
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(d => ({ ...d, entityType: d.entity_type, organizationId: d.organization_id })); // Map fields
  } catch (error) {
    console.error('Error loading dashboards:', error);
    return [];
  }
};

// Load Dashboard (Keep - Refined)
export const loadDashboard = async (id: string): Promise<Dashboard | null> => {
  // ...(Implementation looks okay, use maybeSingle)
  try {
    const { data, error } = await supabase.from('dashboards').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? { ...data, entityType: data.entity_type, organizationId: data.organization_id } : null; // Map fields
  } catch (error) {
    console.error(`Error loading dashboard ${id}:`, error);
    return null;
  }
};

// Delete Dashboard (Keep)
export const deleteDashboard = async (id: string): Promise<boolean> => {
  // ...(Implementation looks okay)
  try {
    const { error } = await supabase.from('dashboards').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting dashboard ${id}:`, error);
    return false;
  }
};