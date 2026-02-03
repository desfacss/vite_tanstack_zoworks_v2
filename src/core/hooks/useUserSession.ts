// // // // // src/hooks/useUserSession.ts - working before revision
// // // // import { useQuery } from '@tanstack/react-query';
// // // // import { supabase } from '@/lib/supabase';
// // // // import type { UserSessionData, RpcSessionData } from '@/core/lib/store'; // Assuming types are in store.ts for now
// // // // import type { User, Organization, Location } from '@/lib/types';

// // // // // The core fetching logic, extracted into a standalone async function.
// // // // // This makes it reusable and easier to test.
// // // // const fetchUserSessionData = async (): Promise<UserSessionData> => {
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: STARTED.');

// // // //   // 1. Check for an active Supabase session. The hook's `enabled` flag should prevent
// // // //   //    this from running if logged out, but this is a defensive check.
// // // //   const { data: { session }, error: sessionError } = await supabase.auth.getSession();
// // // //   if (sessionError) throw new Error(`Supabase getSession Error: ${sessionError.message}`);
// // // //   if (!session) throw new Error('Authentication error: No active session found.');
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 1. Session confirmed.');

// // // //   // 2. Call the RPC to get core session details (IDs, permissions, etc.)
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 2. Calling RPC...');
// // // //   const { data: rpcData, error: rpcError } = await supabase
// // // //     .schema('identity')
// // // //     .rpc('jwt_get_user_session');

// // // //   if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
// // // //   if (!rpcData) throw new Error('No data returned from RPC.');

// // // //   // Handle RPCs that might return an array
// // // //   const partialSession = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcSessionData;
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 2. RPC Success.', { userId: partialSession.user_id, orgId: partialSession.org_id });

// // // //   // 3. Validate essential data from the RPC
// // // //   if (!partialSession.user_id || !partialSession.org_id || !partialSession.permissions) {
// // // //     throw new Error('Incomplete session data from RPC.');
// // // //   }
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 3. Validation Success.');

// // // //   // 4. Fetch the full User and Organization objects in parallel for efficiency
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. Fetching User/Org in parallel...');
// // // //   const [userResponse, orgResponse] = await Promise.all([
// // // //     supabase
// // // //       .schema('identity')
// // // //       .from('users')
// // // //       .select('*')
// // // //       .eq('id', partialSession.user_id)
// // // //       .single(),
// // // //     supabase
// // // //       .schema('identity')
// // // //       .from('organizations')
// // // //       .select('*')
// // // //       .eq('id', partialSession.org_id)
// // // //       .single()
// // // //   ]);

// // // //   if (userResponse.error) throw new Error(`User Fetch Error: ${userResponse.error.message}`);
// // // //   if (!userResponse.data) throw new Error(`User not found for ID: ${partialSession.user_id}`);
// // // //   if (orgResponse.error) throw new Error(`Organization Fetch Error: ${orgResponse.error.message}`);
// // // //   if (!orgResponse.data) throw new Error(`Organization not found for ID: ${partialSession.org_id}`);

// // // //   const userData = userResponse.data as User;
// // // //   const orgData = orgResponse.data as Organization;
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. User/Org fetch SUCCESS.');

// // // //   // 5. Fetch Location data if an ID is available
// // // //   let locationData: Location | null = null;
// // // //   const locationId = partialSession.location_id || userData.location_id;
// // // //   if (locationId) {
// // // //     console.log(`>>> [useUserSession] fetchUserSessionData: 5. Fetching Location ${locationId}...`);
// // // //     const { data, error } = await supabase
// // // //       .schema('organization')
// // // //       .from('locations')
// // // //       .select('*')
// // // //       .eq('id', locationId)
// // // //       .single();

// // // //     if (error) console.warn(`Location fetch warning: ${error.message}`); // Warn but don't fail the entire session fetch
// // // //     else locationData = data as Location;
// // // //   }
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 5. Location fetch complete.');

// // // //   // 6. Combine all data into the final session object
// // // //   const fullSession: UserSessionData = {
// // // //     ...partialSession,
// // // //     user: userData,
// // // //     organization: orgData,
// // // //     location: locationData,
// // // //   };
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 6. Session constructed.');

// // // //   return fullSession;
// // // // };

// // // // /**
// // // //  * Custom hook to fetch and cache the complete user session data.
// // // //  * @param {boolean} enabled - Controls whether the query should automatically run.
// // // //  */
// // // // export const useUserSession = (enabled: boolean) => {
// // // //   return useQuery<UserSessionData, Error>({
// // // //     queryKey: ['user-session'], // A single key for the entire session
// // // //     queryFn: fetchUserSessionData,
// // // //     enabled, // The query will only run when this is true
// // // //     staleTime: 1000 * 60 * 15, // 15 minutes
// // // //     gcTime: 1000 * 60 * 60, // 1 hour
// // // //     retry: 1, // Retry once on failure
// // // //     refetchOnWindowFocus: true, // Refetch on window focus for data consistency
// // // //   });
// // // // };


// // // // src/hooks/useUserSession.ts
// // // import { useQuery } from '@tanstack/react-query';
// // // import { supabase } from '@/lib/supabase';
// // // import type { UserSessionData, RpcSessionData } from '@/core/lib/store';
// // // import type { User, Organization, Location } from '@/lib/types';

// // // /**
// // //  * @function fetchUserSessionData
// // //  * @description The core async function for fetching the complete user session.
// // //  *
// // //  * @returns {Promise<UserSessionData>} A promise that resolves to the complete user session data.
// // //  * @throws {Error} Throws an error if the session is invalid, RPC fails, or essential data is missing.
// // //  *
// // //  * @details
// // //  * This function orchestrates the multi-step process of building the user session:
// // //  * 1.  **Validates Supabase Session**: Ensures a valid auth session exists.
// // //  * 2.  **Calls RPC**: Executes the `jwt_get_user_session` RPC to get core details like user ID, org ID, roles, and permissions.
// // //  * 3.  **Fetches Full Records**: Fetches the complete `User` and `Organization` objects from their respective tables in parallel.
// // //  * 4.  **Fetches Location (Optional)**: If a `location_id` is present, it fetches the corresponding `Location` record.
// // //  * 5.  **Constructs Session**: Combines all fetched data into a single, comprehensive `UserSessionData` object.
// // //  */
// // // const fetchUserSessionData = async (): Promise<UserSessionData> => {
// // //   console.log('>>> [useUserSession] fetchUserSessionData: STARTED.');

// // //   // 1. Defensively check for an active Supabase session.
// // //   const { data: { session }, error: sessionError } = await supabase.auth.getSession();
// // //   if (sessionError) throw new Error(`Supabase getSession Error: ${sessionError.message}`);
// // //   if (!session) throw new Error('Authentication error: No active session found.');
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 1. Session confirmed.');

// // //   // 2. Call the RPC to get core session details.
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 2. Calling RPC...',session.user.user_metadata.org_id);
// // //   const { data: rpcData, error: rpcError } = await supabase
// // //     .schema('identity')
// // //     .rpc('jwt_get_user_session',{p_organization_id:session?.user?.user_metadata?.org_id});

// // //   if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
// // //   if (!rpcData) throw new Error('No data returned from RPC.');

// // //   const partialSession = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcSessionData;
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 2. RPC Success.', { userId: partialSession.user_id, orgId: partialSession.org_id });

// // //   // 3. Validate essential data from the RPC.
// // //   if (!partialSession.user_id || !partialSession.org_id || !partialSession.permissions) {
// // //     throw new Error('Incomplete session data from RPC.');
// // //   }
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 3. Validation Success.');

// // //   // 4. Fetch the full User and Organization objects in parallel.
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. Fetching User/Org in parallel...');
// // //   const [userResponse, orgResponse] = await Promise.all([
// // //     supabase.schema('identity').from('users').select('*').eq('id', partialSession.user_id).single(),
// // //     supabase.schema('identity').from('organizations').select('*').eq('id', partialSession.org_id).single()
// // //   ]);

// // //   if (userResponse.error) throw new Error(`User Fetch Error: ${userResponse.error.message}`);
// // //   if (!userResponse.data) throw new Error(`User not found for ID: ${partialSession.user_id}`);
// // //   if (orgResponse.error) throw new Error(`Organization Fetch Error: ${orgResponse.error.message}`);
// // //   if (!orgResponse.data) throw new Error(`Organization not found for ID: ${partialSession.org_id}`);

// // //   const userData = userResponse.data as User;
// // //   const orgData = orgResponse.data as Organization;
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. User/Org fetch SUCCESS.');

// // //   // 5. Fetch Location data if an ID is available.
// // //   let locationData: Location | null = null;
// // //   const locationId = partialSession.location_id || userData.location_id;
// // //   if (locationId) {
// // //     console.log(`>>> [useUserSession] fetchUserSessionData: 5. Fetching Location ${locationId}...`);
// // //     const { data, error } = await supabase.schema('identity').from('locations').select('*').eq('id', locationId).maybeSingle();

// // //     if (error) console.warn(`Location fetch warning: ${error.message}`); // Warn but don't fail.
// // //     else locationData = data as Location;
// // //   }
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 5. Location fetch complete.');

// // //   // 6. Combine all data into the final session object.
// // //   const fullSession: UserSessionData = {
// // //     ...partialSession,
// // //     user: userData,
// // //     organization: orgData,
// // //     location: locationData,
// // //   };
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 6. Session constructed.');

// // //   return fullSession;
// // // };

// // // /**
// // //  * @hook useUserSession
// // //  * @description A TanStack Query hook for fetching and caching the complete user session data.
// // //  *
// // //  * @param {boolean} enabled - A boolean to control whether the query should be active. This is the key mechanism for starting the fetch only after a user is signed in.
// // //  * @returns {QueryResult<UserSessionData, Error>} The result object from TanStack Query, including `data`, `isSuccess`, `isError`, `error`, etc.
// // //  *
// // //  * @details
// // //  * This hook wraps the `fetchUserSessionData` function in `useQuery`.
// // //  * - **`queryKey`**: `['user-session']` is the unique key for this query in the cache.
// // //  * - **`enabled`**: The query is deferred until `enabled` is `true`, which is controlled by the `SessionManager`.
// // //  * - **`staleTime`**: Data is considered fresh for 15 minutes.
// // //  * - **`gcTime`**: Inactive data is kept in the cache for 1 hour.
// // //  */
// // // export const useUserSession = (enabled: boolean) => {
// // //   return useQuery<UserSessionData, Error>({
// // //     queryKey: ['user-session'],
// // //     queryFn: fetchUserSessionData,
// // //     enabled,
// // //     staleTime: 1000 * 60 * 15,
// // //     gcTime: 1000 * 60 * 60,
// // //     retry: 1,
// // //     refetchOnWindowFocus: true,
// // //   });
// // // };

// // // // src/hooks/useUserSession.ts - working before revision
// // // import { useQuery } from '@tanstack/react-query';
// // // import { supabase } from '@/lib/supabase';
// // // import type { UserSessionData, RpcSessionData } from '@/core/lib/store'; // Assuming types are in store.ts for now
// // // import type { User, Organization, Location } from '@/lib/types';

// // // // The core fetching logic, extracted into a standalone async function.
// // // // This makes it reusable and easier to test.
// // // const fetchUserSessionData = async (): Promise<UserSessionData> => {
// // //   console.log('>>> [useUserSession] fetchUserSessionData: STARTED.');

// // //   // 1. Check for an active Supabase session. The hook's `enabled` flag should prevent
// // //   //    this from running if logged out, but this is a defensive check.
// // //   const { data: { session }, error: sessionError } = await supabase.auth.getSession();
// // //   if (sessionError) throw new Error(`Supabase getSession Error: ${sessionError.message}`);
// // //   if (!session) throw new Error('Authentication error: No active session found.');
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 1. Session confirmed.');

// // //   // 2. Call the RPC to get core session details (IDs, permissions, etc.)
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 2. Calling RPC...');
// // //   const { data: rpcData, error: rpcError } = await supabase
// // //     .schema('identity')
// // //     .rpc('jwt_get_user_session');

// // //   if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
// // //   if (!rpcData) throw new Error('No data returned from RPC.');

// // //   // Handle RPCs that might return an array
// // //   const partialSession = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcSessionData;
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 2. RPC Success.', { userId: partialSession.user_id, orgId: partialSession.org_id });

// // //   // 3. Validate essential data from the RPC
// // //   if (!partialSession.user_id || !partialSession.org_id || !partialSession.permissions) {
// // //     throw new Error('Incomplete session data from RPC.');
// // //   }
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 3. Validation Success.');

// // //   // 4. Fetch the full User and Organization objects in parallel for efficiency
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. Fetching User/Org in parallel...');
// // //   const [userResponse, orgResponse] = await Promise.all([
// // //     supabase
// // //       .schema('identity')
// // //       .from('users')
// // //       .select('*')
// // //       .eq('id', partialSession.user_id)
// // //       .single(),
// // //     supabase
// // //       .schema('identity')
// // //       .from('organizations')
// // //       .select('*')
// // //       .eq('id', partialSession.org_id)
// // //       .single()
// // //   ]);

// // //   if (userResponse.error) throw new Error(`User Fetch Error: ${userResponse.error.message}`);
// // //   if (!userResponse.data) throw new Error(`User not found for ID: ${partialSession.user_id}`);
// // //   if (orgResponse.error) throw new Error(`Organization Fetch Error: ${orgResponse.error.message}`);
// // //   if (!orgResponse.data) throw new Error(`Organization not found for ID: ${partialSession.org_id}`);

// // //   const userData = userResponse.data as User;
// // //   const orgData = orgResponse.data as Organization;
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. User/Org fetch SUCCESS.');

// // //   // 5. Fetch Location data if an ID is available
// // //   let locationData: Location | null = null;
// // //   const locationId = partialSession.location_id || userData.location_id;
// // //   if (locationId) {
// // //     console.log(`>>> [useUserSession] fetchUserSessionData: 5. Fetching Location ${locationId}...`);
// // //     const { data, error } = await supabase
// // //       .schema('organization')
// // //       .from('locations')
// // //       .select('*')
// // //       .eq('id', locationId)
// // //       .single();

// // //     if (error) console.warn(`Location fetch warning: ${error.message}`); // Warn but don't fail the entire session fetch
// // //     else locationData = data as Location;
// // //   }
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 5. Location fetch complete.');

// // //   // 6. Combine all data into the final session object
// // //   const fullSession: UserSessionData = {
// // //     ...partialSession,
// // //     user: userData,
// // //     organization: orgData,
// // //     location: locationData,
// // //   };
// // //   console.log('>>> [useUserSession] fetchUserSessionData: 6. Session constructed.');

// // //   return fullSession;
// // // };

// // // /**
// // //  * Custom hook to fetch and cache the complete user session data.
// // //  * @param {boolean} enabled - Controls whether the query should automatically run.
// // //  */
// // // export const useUserSession = (enabled: boolean) => {
// // //   return useQuery<UserSessionData, Error>({
// // //     queryKey: ['user-session'], // A single key for the entire session
// // //     queryFn: fetchUserSessionData,
// // //     enabled, // The query will only run when this is true
// // //     staleTime: 1000 * 60 * 15, // 15 minutes
// // //     gcTime: 1000 * 60 * 60, // 1 hour
// // //     retry: 1, // Retry once on failure
// // //     refetchOnWindowFocus: true, // Refetch on window focus for data consistency
// // //   });
// // // };


// // // src/hooks/useUserSession.ts
// // import { useQuery } from '@tanstack/react-query';
// // import { supabase } from '@/lib/supabase';
// // import { useAuthStore } from '@/core/lib/store';
// // import type { UserSessionData, RpcSessionData } from '@/core/lib/store';
// // import type { User, Organization, Location } from '@/lib/types';

// // /**
// //  * @function fetchUserSessionData
// //  * @description The core async function for fetching the complete user session.
// //  *
// //  * @returns {Promise<UserSessionData>} A promise that resolves to the complete user session data.
// //  * @throws {Error} Throws an error if the session is invalid, RPC fails, or essential data is missing.
// //  *
// //  * @details
// //  * This function orchestrates the multi-step process of building the user session:
// //  * 1.  **Validates Supabase Session**: Ensures a valid auth session exists.
// //  * 2.  **Calls RPC**: Executes the `jwt_get_user_session` RPC to get core details like user ID, org ID, roles, and permissions.
// //  * 3.  **Fetches Full Records**: Fetches the complete `User` and `Organization` objects from their respective tables in parallel.
// //  * 4.  **Fetches Location (Optional)**: If a `location_id` is present, it fetches the corresponding `Location` record.
// //  * 5.  **Constructs Session**: Combines all fetched data into a single, comprehensive `UserSessionData` object.
// //  */
// // const fetchUserSessionData = async (): Promise<UserSessionData> => {
// //   console.log('>>> [useUserSession] fetchUserSessionData: STARTED.');

// //   // 1. Defensively check for an active Supabase session.
// //   const { data: { session }, error: sessionError } = await supabase.auth.getSession();
// //   if (sessionError) throw new Error(`Supabase getSession Error: ${sessionError.message}`);
// //   if (!session) throw new Error('Authentication error: No active session found.');
// //   console.log('>>> [useUserSession] fetchUserSessionData: 1. Session confirmed.');

// //   // 2. Call the RPC to get core session details.
// //   // We prioritize the Organization ID from the local store (set by Header during a switch).
// //   // If that's null (first login), we fall back to the preferred org in the JWT metadata.
// //   const currentOrgId = useAuthStore.getState().organization?.id;
// //   const orgIdToUse = currentOrgId || session?.user?.user_metadata?.org_id;

// //   console.log(`>>> [useUserSession] fetchUserSessionData: 2. Calling RPC for OrgID: ${orgIdToUse} (Source: ${currentOrgId ? 'Store' : 'JWT Metadata'})`);

// //   const { data: rpcData, error: rpcError } = await supabase
// //     .schema('identity')
// //     .rpc('jwt_get_user_session', { p_organization_id: orgIdToUse });

// //   if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
// //   if (!rpcData) throw new Error('No data returned from RPC.');

// //   const partialSession = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcSessionData;
// //   console.log('>>> [useUserSession] fetchUserSessionData: 2. RPC Success.', { userId: partialSession.user_id, orgId: partialSession.org_id });

// //   // 3. Validate essential data from the RPC.
// //   if (!partialSession.user_id || !partialSession.org_id || !partialSession.permissions) {
// //     throw new Error('Incomplete session data from RPC.');
// //   }
// //   console.log('>>> [useUserSession] fetchUserSessionData: 3. Validation Success.');

// //   // 4. Fetch the full User and Organization objects in parallel.
// //   console.log('>>> [useUserSession] fetchUserSessionData: 4. Fetching User/Org in parallel...');
// //   const [userResponse, orgResponse] = await Promise.all([
// //     supabase.schema('identity').from('users').select('*').eq('id', partialSession.user_id).single(),
// //     supabase.schema('identity').from('organizations').select('*').eq('id', partialSession.org_id).single()
// //   ]);

// //   if (userResponse.error) throw new Error(`User Fetch Error: ${userResponse.error.message}`);
// //   if (!userResponse.data) throw new Error(`User not found for ID: ${partialSession.user_id}`);
// //   if (orgResponse.error) throw new Error(`Organization Fetch Error: ${orgResponse.error.message}`);
// //   if (!orgResponse.data) throw new Error(`Organization not found for ID: ${partialSession.org_id}`);

// //   const userData = userResponse.data as User;
// //   const orgData = orgResponse.data as Organization;
// //   console.log('>>> [useUserSession] fetchUserSessionData: 4. User/Org fetch SUCCESS.');

// //   // 5. Fetch Location data if an ID is available.
// //   let locationData: Location | null = null;
// //   const locationId = partialSession.location_id || userData.location_id;
// //   if (locationId) {
// //     console.log(`>>> [useUserSession] fetchUserSessionData: 5. Fetching Location ${locationId}...`);
// //     const { data, error } = await supabase.schema('identity').from('locations').select('*').eq('id', locationId).maybeSingle();

// //     if (error) console.warn(`Location fetch warning: ${error.message}`); // Warn but don't fail.
// //     else locationData = data as Location;
// //   }
// //   console.log('>>> [useUserSession] fetchUserSessionData: 5. Location fetch complete.');

// //   // 6. Combine all data into the final session object.
// //   const fullSession: UserSessionData = {
// //     ...partialSession,
// //     user: userData,
// //     organization: orgData,
// //     location: locationData,
// //   };
// //   console.log('>>> [useUserSession] fetchUserSessionData: 6. Session constructed.');

// //   return fullSession;
// // };

// // /**
// //  * @hook useUserSession
// //  * @description A TanStack Query hook for fetching and caching the complete user session data.
// //  *
// //  * @param {boolean} enabled - A boolean to control whether the query should be active. This is the key mechanism for starting the fetch only after a user is signed in.
// //  * @returns {QueryResult<UserSessionData, Error>} The result object from TanStack Query, including `data`, `isSuccess`, `isError`, `error`, etc.
// //  *
// //  * @details
// //  * This hook wraps the `fetchUserSessionData` function in `useQuery`.
// //  * - **`queryKey`**: `['user-session']` is the unique key for this query in the cache.
// //  * - **`enabled`**: The query is deferred until `enabled` is `true`, which is controlled by the `SessionManager`.
// //  * - **`staleTime`**: Data is considered fresh for 15 minutes.
// //  * - **`gcTime`**: Inactive data is kept in the cache for 1 hour.
// //  */
// // export const useUserSession = (enabled: boolean) => {
// //   return useQuery<UserSessionData, Error>({
// //     queryKey: ['user-session'],
// //     queryFn: fetchUserSessionData,
// //     enabled,
// //     staleTime: 1000 * 60 * 15,
// //     gcTime: 1000 * 60 * 60,
// //     retry: 1,
// //     refetchOnWindowFocus: true,
// //   });
// // };


// // src/hooks/useUserSession.ts
// import { useQuery } from '@tanstack/react-query';
// import { supabase } from '@/lib/supabase';
// import { useAuthStore } from '@/core/lib/store';
// import type { UserSessionData, RpcSessionData } from '@/core/lib/store';
// import type { User, Organization, Location } from '@/lib/types';

// const fetchUserSessionData = async (): Promise<UserSessionData> => {
//   const start = performance.now();

//   // 1. Check basic Auth Session
//   const { data: { session }, error: sessionError } = await supabase.auth.getSession();
//   if (sessionError || !session) throw new Error('No active Supabase session');

//   // 2. DECISION MATRIX: Store (Recent Switch) vs JWT (Initial Load)
//   const storeOrgId = useAuthStore.getState().organization?.id;
//   const jwtOrgId = session.user.user_metadata.org_id;

//   // The Logic: If the store has an ID, the user just switched. Trust the store.
//   const targetOrgId = storeOrgId || jwtOrgId;

//   console.log(
//     `%c[Flow] Step 5: Fetching Session Data`, 'color: orange; font-weight: bold;',
//     `\n   Target Org ID: ${targetOrgId}`,
//     `\n   Source: ${storeOrgId ? '📍 ACTIVE STORE (User just switched)' : '💾 JWT METADATA (Page refresh/Login)'}`
//   );

//   // 3. RPC Call
//   const { data: rpcData, error: rpcError } = await supabase
//     .schema('identity')
//     .rpc('jwt_get_user_session', { p_organization_id: targetOrgId });

//   if (rpcError || !rpcData) throw new Error(rpcError?.message || 'RPC No Data');

//   const partialSession = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcSessionData;

//   // 4. Parallel Fetch of Full Records
//   const [userResponse, orgResponse] = await Promise.all([
//     supabase.schema('identity').from('users').select('*').eq('id', partialSession.user_id).single(),
//     supabase.schema('identity').from('organizations').select('*').eq('id', partialSession.org_id).single()
//   ]);

//   // 5. Location Fetch
//   let locationData: Location | null = null;
//   const locId = partialSession.location_id || userResponse.data?.location_id;
//   if (locId) {
//      const { data } = await supabase.schema('identity').from('locations').select('*').eq('id', locId).maybeSingle();
//      locationData = data as Location;
//   }

//   console.log(`%c[Flow] Step 6: Session Ready (${Math.round(performance.now() - start)}ms)`, 'color: green', 
//     `\n   Org: ${orgResponse.data?.name}`, 
//     `\n   Loc: ${locationData?.name || 'None'}`
//   );

//   return {
//     ...partialSession,
//     user: userResponse.data as User,
//     organization: orgResponse.data as Organization,
//     location: locationData,
//   };
// };

// export const useUserSession = (enabled: boolean) => {
//   return useQuery({
//     queryKey: ['user-session'], // Key matches invalidation target
//     queryFn: fetchUserSessionData,
//     enabled,
//     staleTime: 1000 * 60 * 15,
//     refetchOnWindowFocus: false, // Prevent flickering
//   });
// };


// THE REACTIVE LOGIC
import { useQuery, QueryFunctionContext, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserSessionData, RpcSessionData } from '@/core/lib/store';
import type { User, Organization, Location } from '@/lib/types';

// Define the Query Key type for type-safety
type UserSessionQueryKey = ['user-session', string | null];

const fetchUserSessionData = async ({ queryKey }: QueryFunctionContext<UserSessionQueryKey>): Promise<UserSessionData> => {
  const start = performance.now();

  // Extract the ID specifically requested by the Query Key
  const [_, requestedOrgId] = queryKey;

  // 1. Check basic Auth Session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('No active Supabase session');

  // 2. DECISION MATRIX: Reactive Key vs JWT Fallback
  // If the hook requested a specific ID (from Store), use it.
  // If the hook passed null (First load), fall back to JWT.
  // Check for org_id in both app_metadata and user_metadata
  let targetOrgId = requestedOrgId ||
    session.user.app_metadata?.org_id ||
    session.user.app_metadata?.organization_id ||
    session.user.user_metadata?.org_id ||
    session.user.user_metadata?.organization_id;

  // --- SMART BOOTSTRAP (Reload Support) ---
  // If we still don't have an ID (e.g., cold reload before JWT refresh), 
  // we fetch it from the database instead of failing.
  if (!targetOrgId && session.user.id) {
    console.log('%c[Flow] Bootstrapping Org ID from Database...', 'color: cyan');

    // Attempt 1: Get Preferred Org from identity.users
    const { data: userData } = await supabase
      .schema('identity')
      .from('users')
      .select('id, pref_organization_id')
      .eq('auth_id', session.user.id)
      .maybeSingle();

    targetOrgId = userData?.pref_organization_id;

    // Attempt 2: Pick first active membership if no preference
    if (!targetOrgId && userData?.id) {
      const { data: memberships } = await supabase
        .schema('identity')
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', userData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);

      targetOrgId = memberships?.[0]?.organization_id;
    }

    if (targetOrgId) {
      console.log(`%c[Flow] Bootstrap Success: ${targetOrgId}`, 'color: cyan');
    }
  }

  console.log(
    `%c[Flow] Fetching Session`, 'color: orange; font-weight: bold;',
    `\n   Target ID: ${targetOrgId}`,
    `\n   Strategy: ${requestedOrgId ? '🎯 REACTIVE (Store ID passed in Key)' : '💾 FALLBACK (JWT Metadata)'}`,
    `\n   JWT Metadata:`, { app: session.user.app_metadata, user: session.user.user_metadata }
  );

  // 3. RPC Call
  if (!targetOrgId) {
    console.warn('[Flow] jwt_get_user_session skipped: targetOrgId is missing');
    throw new Error('Target Organization ID is required for session hydration');
  }

  const { data: rpcData, error: rpcError } = await supabase
    .schema('identity')
    .rpc('jwt_get_user_session', { p_organization_id: targetOrgId });
  console.log('qq-jwt_get_user_session', rpcData);

  if (rpcError || !rpcData) throw new Error(rpcError?.message || 'RPC No Data');

  const partialSession = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcSessionData;

  // 4. Parallel Fetch of Full Records
  const [userResponse, orgResponse] = await Promise.all([
    supabase.schema('identity').from('users').select('*').eq('id', partialSession.user_id).single(),
    supabase.schema('identity').from('organizations').select('*').eq('id', partialSession.org_id).single()
  ]);

  // 5. Location Fetch
  let locationData: Location | null = null;
  const locId = partialSession.location_id || userResponse.data?.location_id;
  if (locId) {
    const { data } = await supabase.schema('identity').from('locations').select('*').eq('id', locId).maybeSingle();
    locationData = data as Location;
  }

  console.log(`%c[Flow] Session Ready (${Math.round(performance.now() - start)}ms)`, 'color: green',
    `\n   Org: ${orgResponse.data?.name}`,
    `\n   Loc: ${locationData?.name || 'None'}`
  );

  return {
    ...partialSession,
    user: userResponse.data as User,
    organization: orgResponse.data as Organization,
    location: locationData,
  };
};

// Modified Hook: Accepts the current Org ID
export const useUserSession = (enabled: boolean, currentOrgId?: string | null) => {
  return useQuery<UserSessionData, Error, UserSessionData, UserSessionQueryKey>({
    // CRITICAL: The ID is now part of the key. 
    // When ID changes, React Query automatically considers it a "New Query" and fetches immediately.
    queryKey: ['user-session', currentOrgId || null],
    queryFn: fetchUserSessionData,
    enabled,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData, // Prevents UI flickering while switching
  });
};