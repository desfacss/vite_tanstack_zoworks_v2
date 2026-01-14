// // // // // // // // // src/components/Layout/SessionManager.tsx - working before revision
// // // // // // // // import { useEffect, useState } from 'react';
// // // // // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // // // // import { useUserSession } from '@/core/hooks/useUserSession';
// // // // // // // // import { supabase } from '@/lib/supabase';
// // // // // // // // import { Session } from '@supabase/supabase-js';

// // // // // // // // /**
// // // // // // // //  * SessionManager is a headless component responsible for orchestrating
// // // // // // // //  * the user session state between Supabase Auth, TanStack Query, and Zustand.
// // // // // // // //  *
// // // // // // // //  * - It listens to Supabase's onAuthStateChange to know *when* to fetch a session.
// // // // // // // //  * - It uses the `useUserSession` hook to fetch and cache the detailed session data.
// // // // // // // //  * - It syncs the results (data or error) from the hook back into the Zustand store,
// // // // // // // //  *   making the session data available to the rest of the application.
// // // // // // // //  */
// // // // // // // // export const SessionManager = () => {
// // // // // // // //   // Local state to control when the TanStack Query should be enabled
// // // // // // // //   const [enabled, setEnabled] = useState(false);

// // // // // // // //   // Zustand actions to update the global state
// // // // // // // //   const { setSession, clearUserSession, setInitialized } = useAuthStore(state => ({
// // // // // // // //     setSession: state.setSession, // Assuming a new 'setSession' action
// // // // // // // //     clearUserSession: state.clearUserSession,
// // // // // // // //     setInitialized: state.setInitialized,
// // // // // // // //   }));

// // // // // // // //   // The TanStack Query hook for fetching user session data
// // // // // // // //   const { data, isSuccess, isError, error } = useUserSession(enabled);

// // // // // // // //   // Effect to listen for Supabase auth events (login/logout)
// // // // // // // //   useEffect(() => {
// // // // // // // //     console.log('>>> [SessionManager] useEffect: Setting up onAuthStateChange listener...');

// // // // // // // //     // Check the initial session state on mount
// // // // // // // //     supabase.auth.getSession().then(({ data: { session } }) => {
// // // // // // // //       console.log('>>> [SessionManager] Initial session check:', session ? 'Session found' : 'No session');
// // // // // // // //       if (session) {
// // // // // // // //         setEnabled(true); // Enable the query if a session exists
// // // // // // // //       } else {
// // // // // // // //         // If there's no session, we are effectively initialized as "logged out"
// // // // // // // //         setInitialized(true);
// // // // // // // //       }
// // // // // // // //     });

// // // // // // // //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
// // // // // // // //       console.log(`>>> [SessionManager] onAuthStateChange EVENT: ${event}`);
// // // // // // // //       if (event === 'SIGNED_IN') {
// // // // // // // //         setEnabled(true); // User logged in, enable the query
// // // // // // // //       }
// // // // // // // //       if (event === 'SIGNED_OUT') {
// // // // // // // //         setEnabled(false); // User logged out, disable the query
// // // // // // // //         clearUserSession(); // Immediately clear the Zustand store
// // // // // // // //       }
// // // // // // // //     });

// // // // // // // //     return () => {
// // // // // // // //       console.log('>>> [SessionManager] useEffect: Cleaning up listener.');
// // // // // // // //       subscription.unsubscribe();
// // // // // // // //     };
// // // // // // // //   }, [clearUserSession, setInitialized]);

// // // // // // // //   // Effect to sync the result of the TanStack Query back to Zustand
// // // // // // // //   useEffect(() => {
// // // // // // // //     if (isSuccess && data) {
// // // // // // // //       console.log('>>> [SessionManager] Syncing successful session data to Zustand...');
// // // // // // // //       setSession(data); // New action to set the entire session state at once
// // // // // // // //     }
// // // // // // // //     if (isError) {
// // // // // // // //       console.error('>>> [SessionManager] Error fetching user session, clearing state.', error);
// // // // // // // //       clearUserSession(); // Clear session in Zustand on fetch failure
// // // // // // // //     }
// // // // // // // //   }, [isSuccess, isError, data, setSession, clearUserSession, error]);

// // // // // // // //   return null; // This is a headless component, it does not render anything
// // // // // // // // };


// // // // // // // // src/components/Layout/SessionManager.tsx
// // // // // // // import { useEffect, useState } from 'react';
// // // // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // // // import { useUserSession } from '@/core/hooks/useUserSession';
// // // // // // // import { supabase } from '@/lib/supabase';

// // // // // // // /**
// // // // // // //  * @component SessionManager
// // // // // // //  * @description A headless component that orchestrates the user session state.
// // // // // // //  *
// // // // // // //  * @returns {null} This component does not render any UI.
// // // // // // //  *
// // // // // // //  * @details
// // // // // // //  * This component is the central controller for the application's authentication flow. Its key responsibilities are:
// // // // // // //  * 1.  **Listening to Auth Events**: It subscribes to Supabase's `onAuthStateChange` to detect when a user signs in or out.
// // // // // // //  * 2.  **Controlling Data Fetching**: Based on auth events, it enables or disables the `useUserSession` TanStack Query hook.
// // // // // // //  * 3.  **Initializing Session State**: On application load, it checks for an existing session. If found, it enables the session query. If not, it marks the auth state as initialized (logged out).
// // // // // // //  * 4.  **Stale-While-Revalidate**: It immediately syncs any cached (stale) session data to Zustand. This allows the UI to render instantly for returning users while the session is revalidated in the background.
// // // // // // //  * 5.  **Syncing State**: It watches the state of the `useUserSession` hook and syncs the final results (both successful data and errors) back into the global Zustand store.
// // // // // // //  */
// // // // // // // export const SessionManager = () => {
// // // // // // //   // Local state to control whether the TanStack Query for the session should be active.
// // // // // // //   const [enabled, setEnabled] = useState(false);

// // // // // // //   // Select actions from the Zustand store.
// // // // // // //   const { setSession, clearUserSession, setInitialized, setAuthError } = useAuthStore(state => ({
// // // // // // //     setSession: state.setSession,
// // // // // // //     clearUserSession: state.clearUserSession,
// // // // // // //     setInitialized: state.setInitialized,
// // // // // // //     setAuthError: state.setAuthError,
// // // // // // //   }));

// // // // // // //   // The TanStack Query hook for fetching detailed user session data.
// // // // // // //   // It will only run when `enabled` is true.
// // // // // // //   const { data, isSuccess, isError, error, isStale } = useUserSession(enabled);

// // // // // // //   /**
// // // // // // //    * @effect
// // // // // // //    * Sets up the Supabase authentication listener and performs the initial session check.
// // // // // // //    * This effect runs once on component mount.
// // // // // // //    */
// // // // // // //   useEffect(() => {
// // // // // // //     console.log('>>> [SessionManager] Mounting: Setting up onAuthStateChange listener...');

// // // // // // //     // 1. Initial Session Check:
// // // // // // //     // On mount, check if a session already exists in storage.
// // // // // // //     supabase.auth.getSession().then(({ data: { session } }) => {
// // // // // // //       console.log('>>> [SessionManager] Initial session check:', session ? 'Session found' : 'No session');
// // // // // // //       if (session) {
// // // // // // //         // If a session exists, enable the query to start fetching data.
// // // // // // //         setEnabled(true);
// // // // // // //       } else {
// // // // // // //         // If no session, we are initialized as "logged out".
// // // // // // //         setInitialized(true);
// // // // // // //       }
// // // // // // //     });

// // // // // // //     // 2. Auth State Change Listener:
// // // // // // //     // Subscribe to all auth events (SIGNED_IN, SIGNED_OUT, etc.).
// // // // // // //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
// // // // // // //       console.log(`>>> [SessionManager] onAuthStateChange EVENT: ${event}`);
// // // // // // //       if (event === 'SIGNED_IN') {
// // // // // // //         // When a user signs in, enable the query to fetch their session data.
// // // // // // //         setEnabled(true);
// // // // // // //       }
// // // // // // //       if (event === 'SIGNED_OUT') {
// // // // // // //         // When a user signs out, disable the query and clear all session state.
// // // // // // //         setEnabled(false);
// // // // // // //         clearUserSession();
// // // // // // //       }
// // // // // // //     });

// // // // // // //     // Cleanup function to unsubscribe when the component unmounts.
// // // // // // //     return () => {
// // // // // // //       console.log('>>> [SessionManager] Unmounting: Cleaning up listener.');
// // // // // // //       subscription.unsubscribe();
// // // // // // //     };
// // // // // // //   }, [clearUserSession, setInitialized]);

// // // // // // //   /**
// // // // // // //    * @effect
// // // // // // //    * Syncs the result of the TanStack Query back to the Zustand store.
// // // // // // //    * This effect runs whenever the query state (`isSuccess`, `isError`, etc.) changes.
// // // // // // //    */
// // // // // // //   useEffect(() => {
// // // // // // //     // If the query is successful and has data, sync it to the Zustand store.
// // // // // // //     // This handles both the initial fetch and subsequent updates.
// // // // // // //     // It's key for the "stale-while-revalidate" pattern:
// // // // // // //     // - On load, if stale data is in the cache, it's synced to the store immediately.
// // // // // // //     // - The UI renders instantly with stale data.
// // // // // // //     // - The query refetches in the background.
// // // // // // //     // - When the fresh data arrives, this effect runs again, and the UI updates.
// // // // // // //     if (isSuccess && data) {
// // // // // // //       if (isStale) {
// // // // // // //         console.log('>>> [SessionManager] Syncing STALE session data to Zustand...');
// // // // // // //       } else {
// // // // // // //         console.log('>>> [SessionManager] Syncing FRESH session data to Zustand...');
// // // // // // //       }
// // // // // // //       setSession(data);
// // // // // // //     }
// // // // // // //     if (isError) {
// // // // // // //       console.error('>>> [SessionManager] Error fetching user session, updating authError and clearing state.', error);
// // // // // // //       setAuthError(error.message); // Set the error message in the global store.
// // // // // // //       clearUserSession(); // Clear session data from the store.
// // // // // // //     }
// // // // // // //   }, [isSuccess, isStale, isError, data, error, setSession, clearUserSession, setAuthError]);

// // // // // // //   return null; // This is a headless component; it renders nothing.
// // // // // // // };

// // // // // // // Header.tsx
// // // // // // import React, { useState, useEffect, useMemo } from 'react';
// // // // // // import { Layout, Button, Space, Drawer, Select, message } from 'antd';
// // // // // // // import { Menu as MenuIcon, Bell, Search, Settings as SettingsIcon } from 'lucide-react-removed';
// // // // // // import { useQueryClient, useIsFetching } from '@tanstack/react-query';
// // // // // // import { useTranslation } from 'react-i18next';
// // // // // // import { ProfileMenu } from './ProfileMenu';
// // // // // // import { useAuthedLayoutConfig } from './AuthedLayoutContext';
// // // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // // // NOTE: Removed unused functions like getAllOrganizations and getOrganizationLocations
// // // // // // import { supabase } from '@/lib/supabase';
// // // // // // import type { Organization, Location } from '@/lib/types';

// // // // // // const { Header: AntHeader } = Layout;

// // // // // // // Define the structure of the data returned by the get_my_organizations RPC
// // // // // // interface UserOrgLocationData {
// // // // // //   organization_id: string;
// // // // // //   organization_name: string;
// // // // // //   roles: string[]; // Roles as a string array
// // // // // //   locations: {
// // // // // //     location_id: string;
// // // // // //     location_name: string;
// // // // // //   }[];
// // // // // // }

// // // // // // interface HeaderProps {
// // // // // //   collapsed: boolean;
// // // // // //   setCollapsed: (collapsed: boolean) => void;
// // // // // //   isMobile: boolean;
// // // // // //   unreadCount: number;
// // // // // //   setShowNotifications: (show: boolean) => void;
// // // // // //   setShowMobileMenu: (show: boolean) => void;
// // // // // //   setShowSettings: (show: boolean) => void;
// // // // // //   pageTitle?: string;
// // // // // // }

// // // // // // export const Header: React.FC<HeaderProps> = ({
// // // // // //   collapsed,
// // // // // //   setCollapsed,
// // // // // //   isMobile,
// // // // // //   unreadCount,
// // // // // //   setShowNotifications,
// // // // // //   setShowMobileMenu,
// // // // // //   setShowSettings,
// // // // // //   pageTitle,
// // // // // // }) => {
// // // // // //   const { t } = useTranslation();
// // // // // //   const { config } = useAuthedLayoutConfig();
// // // // // //   const { user, organization, location, setOrganization, setLocation, viewPreferences, setViewPreferences, setIsSwitchingOrg } = useAuthStore();
// // // // // //   const queryClient = useQueryClient();
// // // // // //   const [showSearch, setShowSearch] = useState(false);

// // // // // //   // New state to hold the RPC result
// // // // // //   const [userOrgLocations, setUserOrgLocations] = useState<UserOrgLocationData[]>([]);

// // // // // //   const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

// // // // // //   /**
// // // // // //    * 1. Fetch organizations and their associated locations using the RPC.
// // // // // //    *    We do NOT set the organization/location in the store here anymore.
// // // // // //    *    SessionManager handles the initial session state.
// // // // // //    */
// // // // // //   useEffect(() => {
// // // // // //     const fetchOrgAndLocations = async () => {
// // // // // //       if (!user?.id) {
// // // // // //         return;
// // // // // //       }

// // // // // //       console.log('[Header] Initializing: Fetching available organizations...');
// // // // // //       setLoadingOrgLocs(true);
// // // // // //       try {
// // // // // //         // Call the RPC. No arguments are needed as it uses auth.uid()
// // // // // //         const { data, error } = await supabase.schema('identity').rpc('get_my_organizations_v2');

// // // // // //         if (error) {
// // // // // //           console.error('[Header] Error calling get_my_organizations RPC:', error);
// // // // // //           // Handle error (e.g., show a notification)
// // // // // //           return;
// // // // // //         }

// // // // // //         const orgLocs = data as UserOrgLocationData[];
// // // // // //         setUserOrgLocations(orgLocs);
// // // // // //         console.log(`[Header] Found ${orgLocs.length} available organizations.`);

// // // // // //       } catch (error) {
// // // // // //         console.error('[Header] Unexpected error fetching orgs/locs:', error);
// // // // // //       } finally {
// // // // // //         setLoadingOrgLocs(false);
// // // // // //       }
// // // // // //     };

// // // // // //     if (user?.id) {
// // // // // //       fetchOrgAndLocations();
// // // // // //     }
// // // // // //   }, [user?.id]);

// // // // // //   /**
// // // // // //    * Derived state: Organizations for the Select dropdown
// // // // // //    */
// // // // // //   const organizationOptions = useMemo(() => {
// // // // // //     return userOrgLocations.map(org => ({
// // // // // //       id: org.organization_id,
// // // // // //       name: org.organization_name,
// // // // // //       roles: org.roles,
// // // // // //     }));
// // // // // //   }, [userOrgLocations]);

// // // // // //   /**
// // // // // //    * Helper function to get locations for the currently selected organization
// // // // // //    */
// // // // // //   const getCurrentOrganizationLocations = (): Location[] => {
// // // // // //     if (!organization?.id) {
// // // // // //       return [];
// // // // // //     }
// // // // // //     const currentOrgData = userOrgLocations.find(
// // // // // //       (org) => org.organization_id === organization.id
// // // // // //     );
// // // // // //     if (!currentOrgData) {
// // // // // //       return [];
// // // // // //     }
// // // // // //     // Map the RPC location structure to the component's Location type
// // // // // //     return currentOrgData.locations.map(loc => ({
// // // // // //       id: loc.location_id,
// // // // // //       name: loc.location_name,
// // // // // //     })) as Location[];
// // // // // //   };

// // // // // //   const currentLocations = getCurrentOrganizationLocations();
// // // // // //   const shouldShowLocationDropdown = currentLocations.length > 1;


// // // // // //   const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;

// // // // // //   useEffect(() => {
// // // // // //     if (!isFetchingSession) {
// // // // // //       setIsSwitchingOrg(false);
// // // // // //     }
// // // // // //   }, [isFetchingSession, setIsSwitchingOrg]);

// // // // // //   const handleOrganizationChange = async (orgId: string) => {
// // // // // //     const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);

// // // // // //     if (selectedOrgData && user?.id) {
// // // // // //       console.log(`[Header] Switching to organization: ${selectedOrgData.organization_name} (${orgId})`);

// // // // // //       setIsSwitchingOrg(true);
// // // // // //       message.loading({ content: `Switching to ${selectedOrgData.organization_name}...`, key: 'orgSwitch' });

// // // // // //       // Immediately update the store for a responsive UI.
// // // // // //       // CRITICAL: This updates the store's organization.id, which useUserSession will read during the next fetch.
// // // // // //       setOrganization({ id: selectedOrgData.organization_id, name: selectedOrgData.organization_name } as Organization);

// // // // // //       const newLocations = selectedOrgData.locations;
// // // // // //       if (newLocations.length > 0) {
// // // // // //         const stickyLocationId = viewPreferences[user.id]?.lastLocationByOrg?.[orgId];
// // // // // //         const stickyLocation = newLocations.find(l => l.location_id === stickyLocationId);
// // // // // //         if (stickyLocation) {
// // // // // //           setLocation({ id: stickyLocation.location_id, name: stickyLocation.location_name } as Location);
// // // // // //         } else {
// // // // // //           setLocation({ id: newLocations[0].location_id, name: newLocations[0].location_name } as Location);
// // // // // //         }
// // // // // //       } else {
// // // // // //         setLocation(null);
// // // // // //       }

// // // // // //       try {
// // // // // //         const { error: rpcError } = await supabase.schema('identity').rpc('set_preferred_organization', {
// // // // // //           new_org_id: orgId,
// // // // // //         });

// // // // // //         if (rpcError) {
// // // // // //           console.error("[Header] RPC Error updating preferred org:", rpcError);
// // // // // //           message.error({ content: 'Failed to switch organization.', key: 'orgSwitch', duration: 2 });
// // // // // //           setIsSwitchingOrg(false);
// // // // // //         } else {
// // // // // //           console.log("[Header] Preferred organization updated in DB. Invalidating user-session query to trigger refetch with new Org ID...");
// // // // // //           await queryClient.invalidateQueries({ queryKey: ['user-session'] });
// // // // // //           message.success({ content: `Switched to ${selectedOrgData.organization_name}`, key: 'orgSwitch', duration: 2 });
// // // // // //         }
// // // // // //       } catch (error) {
// // // // // //         console.error("[Header] Failed to switch organization:", error);
// // // // // //         message.error({ content: 'An error occurred.', key: 'orgSwitch', duration: 2 });
// // // // // //         setIsSwitchingOrg(false);
// // // // // //       }
// // // // // //     }
// // // // // //   };

// // // // // //   const handleLocationChange = (locId: string) => {
// // // // // //     const selectedLoc = currentLocations.find(loc => loc.id === locId);
// // // // // //     if (selectedLoc && user && organization) {
// // // // // //       console.log(`[Header] Switching location to: ${selectedLoc.name} (${locId})`);
// // // // // //       setLocation(selectedLoc); // Update current location
// // // // // //       // Persist this choice
// // // // // //       setViewPreferences(user.id, 'global', {
// // // // // //         lastLocationByOrg: {
// // // // // //           ...(viewPreferences[user.id]?.lastLocationByOrg || {}),
// // // // // //           [organization.id]: locId,
// // // // // //         },
// // // // // //       });
// // // // // //     }
// // // // // //   };
// // // // // //   console.log("oz",organizationOptions,currentLocations);

// // // // // //   return (
// // // // // //     <AntHeader className="p-0 bg-[var(--color-background)] border-b border-[var(--color-border)]">
// // // // // //       <div className="flex justify-between items-center px-4 h-full">
// // // // // //         <div className="flex items-center gap-2">
// // // // // //           <Button
// // // // // //             type="text"
// // // // // //             icon={<MenuIcon size={24} className="transform translate-y-[3px]" />}
// // // // // //             onClick={() => (isMobile ? setShowMobileMenu(true) : setCollapsed(!collapsed))}
// // // // // //             className="hover:text-[var(--color-primary)] flex items-center"
// // // // // //           />
// // // // // //           {pageTitle && (
// // // // // //             <span className="text-lg font-semibold text-[var(--color-text)] flex items-center">
// // // // // //               {pageTitle}
// // // // // //             </span>
// // // // // //           )}
// // // // // //         </div>
// // // // // //         <Space size={isMobile?"small":"middle"} className="flex items-center">
// // // // // //           {/* Organization Select (Show if more than one org or for SassAdmin) */}
// // // // // //           {!isMobile && organizationOptions.length > 1 && (
// // // // // //             <Select
// // // // // //               placeholder={t('common.select_organization')}
// // // // // //               value={organization?.id}
// // // // // //               onChange={handleOrganizationChange}
// // // // // //               loading={loadingOrgLocs}
// // // // // //               style={{ width: 200 }}
// // // // // //               options={organizationOptions.map(org => ({
// // // // // //                 value: org.id,
// // // // // //                 label: (
// // // // // //                   <div>
// // // // // //                     <span style={{ fontWeight: '500' }}>{org?.name}</span>
// // // // // //                     <br />
// // // // // //                     <span style={{ fontSize: '0.8em', color: 'var(--color-text-secondary)' }}>{org?.roles?.join(', ')}</span>
// // // // // //                   </div>
// // // // // //                 ),
// // // // // //               }))}
// // // // // //               disabled={loadingOrgLocs || organizationOptions.length === 0}
// // // // // //             />
// // // // // //           )}

// // // // // //           {/* Location Select */}
// // // // // //           {!isMobile && currentLocations.length > 1 && (
// // // // // //             <Select
// // // // // //               placeholder={t('common.select_location')}
// // // // // //               value={location?.id}
// // // // // //               onChange={handleLocationChange}
// // // // // //               loading={loadingOrgLocs}
// // // // // //               style={{ width: 200 }}
// // // // // //               options={currentLocations.map(loc => ({
// // // // // //                 value: loc.id,
// // // // // //                 label: loc.name,
// // // // // //               }))}
// // // // // //               disabled={loadingOrgLocs || currentLocations.length === 0}
// // // // // //             />
// // // // // //           )}

// // // // // //           {isMobile && config.searchFilters && (
// // // // // //             <Button
// // // // // //               type="text"
// // // // // //               icon={<Search size={24} className="transform translate-y-[3px]" />}
// // // // // //               onClick={() => setShowSearch(true)}
// // // // // //               className="hover:text-[var(--color-primary)] flex items-center"
// // // // // //             />
// // // // // //           )}
// // // // // //           <Button
// // // // // //             type="text"
// // // // // //             icon={<SettingsIcon size={24} className="transform translate-y-[3px]" />}
// // // // // //             onClick={() => setShowSettings(true)}
// // // // // //             className="hover:text-[var(--color-primary)] flex items-center"
// // // // // //           />
// // // // // //           <div className="flex items-center">
// // // // // //             <ProfileMenu isMobile={isMobile}/>
// // // // // //           </div>
// // // // // //         </Space>
// // // // // //       </div>

// // // // // //       {isMobile && (
// // // // // //         <Drawer
// // // // // //           title={t('common.search')}
// // // // // //           placement="right"
// // // // // //           onClose={() => setShowSearch(false)}
// // // // // //           open={showSearch}
// // // // // //           width={320}
// // // // // //           className="bg-[var(--color-background)]"
// // // // // //           styles={{
// // // // // //             body: {
// // // // // //               paddingTop: '2px',paddingInline:'15px'
// // // // // //             }
// // // // // //         }}
// // // // // //         >
// // // // // //           {config.searchFilters}
// // // // // //         </Drawer>
// // // // // //       )}
// // // // // //     </AntHeader>
// // // // // //   );
// // // // // // };


// // // // // // src/components/Layout/SessionManager.tsx
// // // // // import { useEffect, useState } from 'react';
// // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // import { useUserSession } from '@/core/hooks/useUserSession';
// // // // // import { supabase } from '@/lib/supabase';

// // // // // /**
// // // // //  * @component SessionManager
// // // // //  * @description A headless component that orchestrates the user session state.
// // // // //  *
// // // // //  * @returns {null} This component does not render any UI.
// // // // //  *
// // // // //  * @details
// // // // //  * This component is the central controller for the application's authentication flow. Its key responsibilities are:
// // // // //  * 1.  **Listening to Auth Events**: It subscribes to Supabase's `onAuthStateChange` to detect when a user signs in or out.
// // // // //  * 2.  **Controlling Data Fetching**: Based on auth events, it enables or disables the `useUserSession` TanStack Query hook.
// // // // //  * 3.  **Initializing Session State**: On application load, it checks for an existing session. If found, it enables the session query. If not, it marks the auth state as initialized (logged out).
// // // // //  * 4.  **Stale-While-Revalidate**: It immediately syncs any cached (stale) session data to Zustand. This allows the UI to render instantly for returning users while the session is revalidated in the background.
// // // // //  * 5.  **Syncing State**: It watches the state of the `useUserSession` hook and syncs the final results (both successful data and errors) back into the global Zustand store.
// // // // //  */
// // // // // export const SessionManager = () => {
// // // // //   // Local state to control whether the TanStack Query for the session should be active.
// // // // //   const [enabled, setEnabled] = useState(false);

// // // // //   // Select actions from the Zustand store.
// // // // //   const { setSession, clearUserSession, setInitialized, setAuthError } = useAuthStore(state => ({
// // // // //     setSession: state.setSession,
// // // // //     clearUserSession: state.clearUserSession,
// // // // //     setInitialized: state.setInitialized,
// // // // //     setAuthError: state.setAuthError,
// // // // //   }));

// // // // //   // The TanStack Query hook for fetching detailed user session data.
// // // // //   // It will only run when `enabled` is true.
// // // // //   const { data, isSuccess, isError, error, isStale } = useUserSession(enabled);

// // // // //   /**
// // // // //    * @effect
// // // // //    * Sets up the Supabase authentication listener and performs the initial session check.
// // // // //    * This effect runs once on component mount.
// // // // //    */
// // // // //   useEffect(() => {
// // // // //     console.log('>>> [SessionManager] Mounting: Setting up onAuthStateChange listener...');

// // // // //     // 1. Initial Session Check:
// // // // //     // On mount, check if a session already exists in storage.
// // // // //     supabase.auth.getSession().then(({ data: { session } }) => {
// // // // //       console.log('>>> [SessionManager] Initial session check:', session ? 'Session found' : 'No session');
// // // // //       if (session) {
// // // // //         // If a session exists, enable the query to start fetching data.
// // // // //         setEnabled(true);
// // // // //       } else {
// // // // //         // If no session, we are initialized as "logged out".
// // // // //         setInitialized(true);
// // // // //       }
// // // // //     });

// // // // //     // 2. Auth State Change Listener:
// // // // //     // Subscribe to all auth events (SIGNED_IN, SIGNED_OUT, etc.).
// // // // //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
// // // // //       console.log(`[SessionManager] onAuthStateChange EVENT: ${event}`);
// // // // //       if (event === 'SIGNED_IN') {
// // // // //         // When a user signs in, enable the query to fetch their session data.
// // // // //         console.log('[SessionManager] SIGNED_IN detected. Enabling session query...');
// // // // //         setEnabled(true);
// // // // //       }
// // // // //       if (event === 'SIGNED_OUT') {
// // // // //         // When a user signs out, disable the query and clear all session state.
// // // // //         console.log('[SessionManager] SIGNED_OUT detected. Disabling session query and clearing store.');
// // // // //         setEnabled(false);
// // // // //         clearUserSession();
// // // // //       }
// // // // //     });

// // // // //     // Cleanup function to unsubscribe when the component unmounts.
// // // // //     return () => {
// // // // //       console.log('>>> [SessionManager] Unmounting: Cleaning up listener.');
// // // // //       subscription.unsubscribe();
// // // // //     };
// // // // //   }, [clearUserSession, setInitialized]);

// // // // //   /**
// // // // //    * @effect
// // // // //    * Syncs the result of the TanStack Query back to the Zustand store.
// // // // //    * This effect runs whenever the query state (`isSuccess`, `isError`, etc.) changes.
// // // // //    */
// // // // //   useEffect(() => {
// // // // //     // If the query is successful and has data, sync it to the Zustand store.
// // // // //     // This handles both the initial fetch and subsequent updates.
// // // // //     // It's key for the "stale-while-revalidate" pattern:
// // // // //     // - On load, if stale data is in the cache, it's synced to the store immediately.
// // // // //     // - The UI renders instantly with stale data.
// // // // //     // - The query refetches in the background.
// // // // //     // - When the fresh data arrives, this effect runs again, and the UI updates.
// // // // //     if (isSuccess && data) {
// // // // //       const logPrefix = isStale ? '[SessionManager] (STALE)' : '[SessionManager] (FRESH)';
// // // // //       console.log(`${logPrefix} Syncing session data to Zustand for OrgID: ${data.org_id}`);

// // // // //       setSession(data);
// // // // //     }
// // // // //     if (isError) {
// // // // //       console.error('[SessionManager] Error fetching user session, updating authError and clearing state.', error);
// // // // //       setAuthError(error.message); // Set the error message in the global store.
// // // // //       clearUserSession(); // Clear session data from the store.
// // // // //     }
// // // // //   }, [isSuccess, isStale, isError, data, error, setSession, clearUserSession, setAuthError]);

// // // // //   return null; // This is a headless component; it renders nothing.
// // // // // };



// // // // // src/hooks/useUserSession.ts
// // // // import { useQuery } from '@tanstack/react-query';
// // // // import { supabase } from '@/lib/supabase';
// // // // import { useAuthStore } from '@/core/lib/store';
// // // // import type { UserSessionData, RpcSessionData } from '@/core/lib/store';
// // // // import type { User, Organization, Location } from '@/lib/types';

// // // // /**
// // // //  * @function fetchUserSessionData
// // // //  * @description The core async function for fetching the complete user session.
// // // //  *
// // // //  * @returns {Promise<UserSessionData>} A promise that resolves to the complete user session data.
// // // //  * @throws {Error} Throws an error if the session is invalid, RPC fails, or essential data is missing.
// // // //  *
// // // //  * @details
// // // //  * This function orchestrates the multi-step process of building the user session:
// // // //  * 1.  **Validates Supabase Session**: Ensures a valid auth session exists.
// // // //  * 2.  **Calls RPC**: Executes the `jwt_get_user_session` RPC to get core details like user ID, org ID, roles, and permissions.
// // // //  * 3.  **Fetches Full Records**: Fetches the complete `User` and `Organization` objects from their respective tables in parallel.
// // // //  * 4.  **Fetches Location (Optional)**: If a `location_id` is present, it fetches the corresponding `Location` record.
// // // //  * 5.  **Constructs Session**: Combines all fetched data into a single, comprehensive `UserSessionData` object.
// // // //  */
// // // // const fetchUserSessionData = async (): Promise<UserSessionData> => {
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: STARTED.');

// // // //   // 1. Defensively check for an active Supabase session.
// // // //   const { data: { session }, error: sessionError } = await supabase.auth.getSession();
// // // //   if (sessionError) throw new Error(`Supabase getSession Error: ${sessionError.message}`);
// // // //   if (!session) throw new Error('Authentication error: No active session found.');
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 1. Session confirmed.');

// // // //   // 2. Call the RPC to get core session details.
// // // //   // We prioritize the Organization ID from the local store (set by Header during a switch).
// // // //   // If that's null (first login), we fall back to the preferred org in the JWT metadata.
// // // //   const currentOrgId = useAuthStore.getState().organization?.id;
// // // //   const orgIdToUse = currentOrgId || session?.user?.user_metadata?.org_id;

// // // //   console.log(`>>> [useUserSession] fetchUserSessionData: 2. Calling RPC for OrgID: ${orgIdToUse} (Source: ${currentOrgId ? 'Store' : 'JWT Metadata'})`);

// // // //   const { data: rpcData, error: rpcError } = await supabase
// // // //     .schema('identity')
// // // //     .rpc('jwt_get_user_session', { p_organization_id: orgIdToUse });

// // // //   if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
// // // //   if (!rpcData) throw new Error('No data returned from RPC.');

// // // //   const partialSession = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcSessionData;
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 2. RPC Success.', { userId: partialSession.user_id, orgId: partialSession.org_id });

// // // //   // 3. Validate essential data from the RPC.
// // // //   if (!partialSession.user_id || !partialSession.org_id || !partialSession.permissions) {
// // // //     throw new Error('Incomplete session data from RPC.');
// // // //   }
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 3. Validation Success.');

// // // //   // 4. Fetch the full User and Organization objects in parallel.
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. Fetching User/Org in parallel...');
// // // //   const [userResponse, orgResponse] = await Promise.all([
// // // //     supabase.schema('identity').from('users').select('*').eq('id', partialSession.user_id).single(),
// // // //     supabase.schema('identity').from('organizations').select('*').eq('id', partialSession.org_id).single()
// // // //   ]);

// // // //   if (userResponse.error) throw new Error(`User Fetch Error: ${userResponse.error.message}`);
// // // //   if (!userResponse.data) throw new Error(`User not found for ID: ${partialSession.user_id}`);
// // // //   if (orgResponse.error) throw new Error(`Organization Fetch Error: ${orgResponse.error.message}`);
// // // //   if (!orgResponse.data) throw new Error(`Organization not found for ID: ${partialSession.org_id}`);

// // // //   const userData = userResponse.data as User;
// // // //   const orgData = orgResponse.data as Organization;
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. User/Org fetch SUCCESS.');

// // // //   // 5. Fetch Location data if an ID is available.
// // // //   let locationData: Location | null = null;
// // // //   const locationId = partialSession.location_id || userData.location_id;
// // // //   if (locationId) {
// // // //     console.log(`>>> [useUserSession] fetchUserSessionData: 5. Fetching Location ${locationId}...`);
// // // //     const { data, error } = await supabase.schema('identity').from('locations').select('*').eq('id', locationId).maybeSingle();

// // // //     if (error) console.warn(`Location fetch warning: ${error.message}`); // Warn but don't fail.
// // // //     else locationData = data as Location;
// // // //   }
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 5. Location fetch complete.');

// // // //   // 6. Combine all data into the final session object.
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
// // // //  * @hook useUserSession
// // // //  * @description A TanStack Query hook for fetching and caching the complete user session data.
// // // //  *
// // // //  * @param {boolean} enabled - A boolean to control whether the query should be active. This is the key mechanism for starting the fetch only after a user is signed in.
// // // //  * @returns {QueryResult<UserSessionData, Error>} The result object from TanStack Query, including `data`, `isSuccess`, `isError`, `error`, etc.
// // // //  *
// // // //  * @details
// // // //  * This hook wraps the `fetchUserSessionData` function in `useQuery`.
// // // //  * - **`queryKey`**: `['user-session']` is the unique key for this query in the cache.
// // // //  * - **`enabled`**: The query is deferred until `enabled` is `true`, which is controlled by the `SessionManager`.
// // // //  * - **`staleTime`**: Data is considered fresh for 15 minutes.
// // // //  * - **`gcTime`**: Inactive data is kept in the cache for 1 hour.
// // // //  */
// // // // export const useUserSession = (enabled: boolean) => {
// // // //   return useQuery<UserSessionData, Error>({
// // // //     queryKey: ['user-session'],
// // // //     queryFn: fetchUserSessionData,
// // // //     enabled,
// // // //     staleTime: 1000 * 60 * 15,
// // // //     gcTime: 1000 * 60 * 60,
// // // //     retry: 1,
// // // //     refetchOnWindowFocus: true,
// // // //   });
// // // // };


// // // import { useEffect, useState } from 'react';
// // // import { useAuthStore } from '@/core/lib/store';
// // // import { useUserSession } from '@/core/hooks/useUserSession';
// // // import { supabase } from '@/lib/supabase';

// // // /**
// // //  * @component SessionManager
// // //  * @description A headless component that acts as the bridge between Supabase Auth, 
// // //  * React Query, and the Zustand Global Store.
// // //  * * Responsibilities:
// // //  * 1. Detects Login/Logout events.
// // //  * 2. Enables/Disables the 'user-session' query.
// // //  * 3. Syncs the fetched session data (User, Org, Permissions) into the Zustand Store.
// // //  */
// // // export const SessionManager = () => {
// // //   // Controls whether the React Query hook is active
// // //   const [enabled, setEnabled] = useState(false);

// // //   // Zustand Actions
// // //   const { setSession, clearUserSession, setInitialized, setAuthError } = useAuthStore(state => ({
// // //     setSession: state.setSession,
// // //     clearUserSession: state.clearUserSession,
// // //     setInitialized: state.setInitialized,
// // //     setAuthError: state.setAuthError,
// // //   }));

// // //   // The Query Hook
// // //   const { data, isSuccess, isError, error, isStale } = useUserSession(enabled);

// // //   // --- Effect 1: Manage Auth Lifecycle ---
// // //   useEffect(() => {
// // //     console.log('>>> [SessionManager] Initializing Auth Listener...');

// // //     // A. Initial Check
// // //     supabase.auth.getSession().then(({ data: { session } }) => {
// // //       if (session) {
// // //         console.log('>>> [SessionManager] Existing session found. Enabling Query.');
// // //         setEnabled(true);
// // //       } else {
// // //         console.log('>>> [SessionManager] No session found. Marking initialized.');
// // //         setInitialized(true);
// // //       }
// // //     });

// // //     // B. Subscribe to Changes
// // //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
// // //       console.log(`>>> [SessionManager] Auth Event: ${event}`);

// // //       if (event === 'SIGNED_IN') {
// // //         setEnabled(true);
// // //       }
// // //       if (event === 'SIGNED_OUT') {
// // //         setEnabled(false);
// // //         clearUserSession();
// // //       }
// // //     });

// // //     return () => subscription.unsubscribe();
// // //   }, [clearUserSession, setInitialized]);

// // //   // --- Effect 2: Sync Data to Store ---
// // //   useEffect(() => {
// // //     // Handle Success
// // //     if (isSuccess && data) {
// // //       const status = isStale ? '(STALE/CACHE)' : '(FRESH/NETWORK)';
// // //       console.log(`%c[SessionManager] Syncing Data ${status}`, 'color: green', 
// // //         `\n   Org: ${data.organization.name} (${data.org_id})`,
// // //         `\n   User: ${data.user.email}`
// // //       );

// // //       // This updates the global store, which triggers UI re-renders (e.g., Navigation, Dashboard)
// // //       setSession(data);
// // //     }

// // //     // Handle Error
// // //     if (isError) {
// // //       console.error('[SessionManager] Error fetching session:', error);
// // //       setAuthError(error.message);

// // //       // If we can't fetch the session (e.g., deleted user, bad permissions), 
// // //       // we clear the store to prevent a broken UI state.
// // //       clearUserSession();
// // //     }
// // //   }, [isSuccess, isStale, isError, data, error, setSession, clearUserSession, setAuthError]);

// // //   return null; // Headless
// // // };


// // // without stale data for switch org

// // import { useEffect, useState } from 'react';
// // import { useAuthStore } from '@/core/lib/store';
// // import { useUserSession } from '@/core/hooks/useUserSession';
// // import { supabase } from '@/lib/supabase';

// // export const SessionManager = () => {
// //   const [enabled, setEnabled] = useState(false);

// //   // 1. Get isSwitchingOrg to act as a Guard
// //   const { 
// //     setSession, 
// //     clearUserSession, 
// //     setInitialized, 
// //     setAuthError,
// //     isSwitchingOrg // <--- ADD THIS
// //   } = useAuthStore(state => ({
// //     setSession: state.setSession,
// //     clearUserSession: state.clearUserSession,
// //     setInitialized: state.setInitialized,
// //     setAuthError: state.setAuthError,
// //     isSwitchingOrg: state.isSwitchingOrg
// //   }));

// //   const { data, isSuccess, isError, error, isStale } = useUserSession(enabled);

// //   // --- Effect 1: Manage Auth Lifecycle ---
// //   useEffect(() => {
// //     console.log('>>> [SessionManager] Initializing Auth Listener...');

// //     supabase.auth.getSession().then(({ data: { session } }) => {
// //       if (session) {
// //         setEnabled(true);
// //       } else {
// //         setInitialized(true);
// //       }
// //     });

// //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
// //       if (event === 'SIGNED_IN') setEnabled(true);
// //       if (event === 'SIGNED_OUT') {
// //         setEnabled(false);
// //         clearUserSession();
// //       }
// //     });

// //     return () => subscription.unsubscribe();
// //   }, [clearUserSession, setInitialized]);

// //   // --- Effect 2: Sync Data to Store ---
// //   useEffect(() => {
// //     if (isSuccess && data) {
// //       // CRITICAL FIX: Prevent "Cycle of Doom"
// //       // If we are switching orgs, React Query will immediately return the OLD (stale) data 
// //       // from cache before fetching the new data. We must IGNORE this stale data 
// //       // so we don't overwrite the Optimistic Update in the store.
// //       if (isSwitchingOrg && isStale) {
// //         console.log('>>> [SessionManager] Guard: Ignoring stale data during Org Switch.');
// //         return; 
// //       }

// //       const status = isStale ? '(STALE/CACHE)' : '(FRESH/NETWORK)';
// //       console.log(`%c[SessionManager] Syncing Data ${status}`, 'color: green', 
// //         `\n   Org: ${data.organization.name}`,
// //         `\n   User: ${data.user.email}`
// //       );

// //       setSession(data);
// //     }

// //     if (isError) {
// //       console.error('[SessionManager] Error:', error);
// //       setAuthError(error.message);
// //       clearUserSession();
// //     }
// //   }, [isSuccess, isStale, isError, data, error, setSession, clearUserSession, setAuthError, isSwitchingOrg]);

// //   return null;
// // };


// // THE REACTIVE LOGIC
// // // // // // // // // src/components/Layout/SessionManager.tsx - working before revision
// // // // // // // // import { useEffect, useState } from 'react';
// // // // // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // // // // import { useUserSession } from '@/core/hooks/useUserSession';
// // // // // // // // import { supabase } from '@/lib/supabase';
// // // // // // // // import { Session } from '@supabase/supabase-js';

// // // // // // // // /**
// // // // // // // //  * SessionManager is a headless component responsible for orchestrating
// // // // // // // //  * the user session state between Supabase Auth, TanStack Query, and Zustand.
// // // // // // // //  *
// // // // // // // //  * - It listens to Supabase's onAuthStateChange to know *when* to fetch a session.
// // // // // // // //  * - It uses the `useUserSession` hook to fetch and cache the detailed session data.
// // // // // // // //  * - It syncs the results (data or error) from the hook back into the Zustand store,
// // // // // // // //  *   making the session data available to the rest of the application.
// // // // // // // //  */
// // // // // // // // export const SessionManager = () => {
// // // // // // // //   // Local state to control when the TanStack Query should be enabled
// // // // // // // //   const [enabled, setEnabled] = useState(false);

// // // // // // // //   // Zustand actions to update the global state
// // // // // // // //   const { setSession, clearUserSession, setInitialized } = useAuthStore(state => ({
// // // // // // // //     setSession: state.setSession, // Assuming a new 'setSession' action
// // // // // // // //     clearUserSession: state.clearUserSession,
// // // // // // // //     setInitialized: state.setInitialized,
// // // // // // // //   }));

// // // // // // // //   // The TanStack Query hook for fetching user session data
// // // // // // // //   const { data, isSuccess, isError, error } = useUserSession(enabled);

// // // // // // // //   // Effect to listen for Supabase auth events (login/logout)
// // // // // // // //   useEffect(() => {
// // // // // // // //     console.log('>>> [SessionManager] useEffect: Setting up onAuthStateChange listener...');

// // // // // // // //     // Check the initial session state on mount
// // // // // // // //     supabase.auth.getSession().then(({ data: { session } }) => {
// // // // // // // //       console.log('>>> [SessionManager] Initial session check:', session ? 'Session found' : 'No session');
// // // // // // // //       if (session) {
// // // // // // // //         setEnabled(true); // Enable the query if a session exists
// // // // // // // //       } else {
// // // // // // // //         // If there's no session, we are effectively initialized as "logged out"
// // // // // // // //         setInitialized(true);
// // // // // // // //       }
// // // // // // // //     });

// // // // // // // //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
// // // // // // // //       console.log(`>>> [SessionManager] onAuthStateChange EVENT: ${event}`);
// // // // // // // //       if (event === 'SIGNED_IN') {
// // // // // // // //         setEnabled(true); // User logged in, enable the query
// // // // // // // //       }
// // // // // // // //       if (event === 'SIGNED_OUT') {
// // // // // // // //         setEnabled(false); // User logged out, disable the query
// // // // // // // //         clearUserSession(); // Immediately clear the Zustand store
// // // // // // // //       }
// // // // // // // //     });

// // // // // // // //     return () => {
// // // // // // // //       console.log('>>> [SessionManager] useEffect: Cleaning up listener.');
// // // // // // // //       subscription.unsubscribe();
// // // // // // // //     };
// // // // // // // //   }, [clearUserSession, setInitialized]);

// // // // // // // //   // Effect to sync the result of the TanStack Query back to Zustand
// // // // // // // //   useEffect(() => {
// // // // // // // //     if (isSuccess && data) {
// // // // // // // //       console.log('>>> [SessionManager] Syncing successful session data to Zustand...');
// // // // // // // //       setSession(data); // New action to set the entire session state at once
// // // // // // // //     }
// // // // // // // //     if (isError) {
// // // // // // // //       console.error('>>> [SessionManager] Error fetching user session, clearing state.', error);
// // // // // // // //       clearUserSession(); // Clear session in Zustand on fetch failure
// // // // // // // //     }
// // // // // // // //   }, [isSuccess, isError, data, setSession, clearUserSession, error]);

// // // // // // // //   return null; // This is a headless component, it does not render anything
// // // // // // // // };


// // // // // // // // src/components/Layout/SessionManager.tsx
// // // // // // // import { useEffect, useState } from 'react';
// // // // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // // // import { useUserSession } from '@/core/hooks/useUserSession';
// // // // // // // import { supabase } from '@/lib/supabase';

// // // // // // // /**
// // // // // // //  * @component SessionManager
// // // // // // //  * @description A headless component that orchestrates the user session state.
// // // // // // //  *
// // // // // // //  * @returns {null} This component does not render any UI.
// // // // // // //  *
// // // // // // //  * @details
// // // // // // //  * This component is the central controller for the application's authentication flow. Its key responsibilities are:
// // // // // // //  * 1.  **Listening to Auth Events**: It subscribes to Supabase's `onAuthStateChange` to detect when a user signs in or out.
// // // // // // //  * 2.  **Controlling Data Fetching**: Based on auth events, it enables or disables the `useUserSession` TanStack Query hook.
// // // // // // //  * 3.  **Initializing Session State**: On application load, it checks for an existing session. If found, it enables the session query. If not, it marks the auth state as initialized (logged out).
// // // // // // //  * 4.  **Stale-While-Revalidate**: It immediately syncs any cached (stale) session data to Zustand. This allows the UI to render instantly for returning users while the session is revalidated in the background.
// // // // // // //  * 5.  **Syncing State**: It watches the state of the `useUserSession` hook and syncs the final results (both successful data and errors) back into the global Zustand store.
// // // // // // //  */
// // // // // // // export const SessionManager = () => {
// // // // // // //   // Local state to control whether the TanStack Query for the session should be active.
// // // // // // //   const [enabled, setEnabled] = useState(false);

// // // // // // //   // Select actions from the Zustand store.
// // // // // // //   const { setSession, clearUserSession, setInitialized, setAuthError } = useAuthStore(state => ({
// // // // // // //     setSession: state.setSession,
// // // // // // //     clearUserSession: state.clearUserSession,
// // // // // // //     setInitialized: state.setInitialized,
// // // // // // //     setAuthError: state.setAuthError,
// // // // // // //   }));

// // // // // // //   // The TanStack Query hook for fetching detailed user session data.
// // // // // // //   // It will only run when `enabled` is true.
// // // // // // //   const { data, isSuccess, isError, error, isStale } = useUserSession(enabled);

// // // // // // //   /**
// // // // // // //    * @effect
// // // // // // //    * Sets up the Supabase authentication listener and performs the initial session check.
// // // // // // //    * This effect runs once on component mount.
// // // // // // //    */
// // // // // // //   useEffect(() => {
// // // // // // //     console.log('>>> [SessionManager] Mounting: Setting up onAuthStateChange listener...');

// // // // // // //     // 1. Initial Session Check:
// // // // // // //     // On mount, check if a session already exists in storage.
// // // // // // //     supabase.auth.getSession().then(({ data: { session } }) => {
// // // // // // //       console.log('>>> [SessionManager] Initial session check:', session ? 'Session found' : 'No session');
// // // // // // //       if (session) {
// // // // // // //         // If a session exists, enable the query to start fetching data.
// // // // // // //         setEnabled(true);
// // // // // // //       } else {
// // // // // // //         // If no session, we are initialized as "logged out".
// // // // // // //         setInitialized(true);
// // // // // // //       }
// // // // // // //     });

// // // // // // //     // 2. Auth State Change Listener:
// // // // // // //     // Subscribe to all auth events (SIGNED_IN, SIGNED_OUT, etc.).
// // // // // // //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
// // // // // // //       console.log(`>>> [SessionManager] onAuthStateChange EVENT: ${event}`);
// // // // // // //       if (event === 'SIGNED_IN') {
// // // // // // //         // When a user signs in, enable the query to fetch their session data.
// // // // // // //         setEnabled(true);
// // // // // // //       }
// // // // // // //       if (event === 'SIGNED_OUT') {
// // // // // // //         // When a user signs out, disable the query and clear all session state.
// // // // // // //         setEnabled(false);
// // // // // // //         clearUserSession();
// // // // // // //       }
// // // // // // //     });

// // // // // // //     // Cleanup function to unsubscribe when the component unmounts.
// // // // // // //     return () => {
// // // // // // //       console.log('>>> [SessionManager] Unmounting: Cleaning up listener.');
// // // // // // //       subscription.unsubscribe();
// // // // // // //     };
// // // // // // //   }, [clearUserSession, setInitialized]);

// // // // // // //   /**
// // // // // // //    * @effect
// // // // // // //    * Syncs the result of the TanStack Query back to the Zustand store.
// // // // // // //    * This effect runs whenever the query state (`isSuccess`, `isError`, etc.) changes.
// // // // // // //    */
// // // // // // //   useEffect(() => {
// // // // // // //     // If the query is successful and has data, sync it to the Zustand store.
// // // // // // //     // This handles both the initial fetch and subsequent updates.
// // // // // // //     // It's key for the "stale-while-revalidate" pattern:
// // // // // // //     // - On load, if stale data is in the cache, it's synced to the store immediately.
// // // // // // //     // - The UI renders instantly with stale data.
// // // // // // //     // - The query refetches in the background.
// // // // // // //     // - When the fresh data arrives, this effect runs again, and the UI updates.
// // // // // // //     if (isSuccess && data) {
// // // // // // //       if (isStale) {
// // // // // // //         console.log('>>> [SessionManager] Syncing STALE session data to Zustand...');
// // // // // // //       } else {
// // // // // // //         console.log('>>> [SessionManager] Syncing FRESH session data to Zustand...');
// // // // // // //       }
// // // // // // //       setSession(data);
// // // // // // //     }
// // // // // // //     if (isError) {
// // // // // // //       console.error('>>> [SessionManager] Error fetching user session, updating authError and clearing state.', error);
// // // // // // //       setAuthError(error.message); // Set the error message in the global store.
// // // // // // //       clearUserSession(); // Clear session data from the store.
// // // // // // //     }
// // // // // // //   }, [isSuccess, isStale, isError, data, error, setSession, clearUserSession, setAuthError]);

// // // // // // //   return null; // This is a headless component; it renders nothing.
// // // // // // // };

// // // // // // // Header.tsx
// // // // // // import React, { useState, useEffect, useMemo } from 'react';
// // // // // // import { Layout, Button, Space, Drawer, Select, message } from 'antd';
// // // // // // // import { Menu as MenuIcon, Bell, Search, Settings as SettingsIcon } from 'lucide-react-removed';
// // // // // // import { useQueryClient, useIsFetching } from '@tanstack/react-query';
// // // // // // import { useTranslation } from 'react-i18next';
// // // // // // import { ProfileMenu } from './ProfileMenu';
// // // // // // import { useAuthedLayoutConfig } from './AuthedLayoutContext';
// // // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // // // NOTE: Removed unused functions like getAllOrganizations and getOrganizationLocations
// // // // // // import { supabase } from '@/lib/supabase';
// // // // // // import type { Organization, Location } from '@/lib/types';

// // // // // // const { Header: AntHeader } = Layout;

// // // // // // // Define the structure of the data returned by the get_my_organizations RPC
// // // // // // interface UserOrgLocationData {
// // // // // //   organization_id: string;
// // // // // //   organization_name: string;
// // // // // //   roles: string[]; // Roles as a string array
// // // // // //   locations: {
// // // // // //     location_id: string;
// // // // // //     location_name: string;
// // // // // //   }[];
// // // // // // }

// // // // // // interface HeaderProps {
// // // // // //   collapsed: boolean;
// // // // // //   setCollapsed: (collapsed: boolean) => void;
// // // // // //   isMobile: boolean;
// // // // // //   unreadCount: number;
// // // // // //   setShowNotifications: (show: boolean) => void;
// // // // // //   setShowMobileMenu: (show: boolean) => void;
// // // // // //   setShowSettings: (show: boolean) => void;
// // // // // //   pageTitle?: string;
// // // // // // }

// // // // // // export const Header: React.FC<HeaderProps> = ({
// // // // // //   collapsed,
// // // // // //   setCollapsed,
// // // // // //   isMobile,
// // // // // //   unreadCount,
// // // // // //   setShowNotifications,
// // // // // //   setShowMobileMenu,
// // // // // //   setShowSettings,
// // // // // //   pageTitle,
// // // // // // }) => {
// // // // // //   const { t } = useTranslation();
// // // // // //   const { config } = useAuthedLayoutConfig();
// // // // // //   const { user, organization, location, setOrganization, setLocation, viewPreferences, setViewPreferences, setIsSwitchingOrg } = useAuthStore();
// // // // // //   const queryClient = useQueryClient();
// // // // // //   const [showSearch, setShowSearch] = useState(false);

// // // // // //   // New state to hold the RPC result
// // // // // //   const [userOrgLocations, setUserOrgLocations] = useState<UserOrgLocationData[]>([]);

// // // // // //   const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

// // // // // //   /**
// // // // // //    * 1. Fetch organizations and their associated locations using the RPC.
// // // // // //    *    We do NOT set the organization/location in the store here anymore.
// // // // // //    *    SessionManager handles the initial session state.
// // // // // //    */
// // // // // //   useEffect(() => {
// // // // // //     const fetchOrgAndLocations = async () => {
// // // // // //       if (!user?.id) {
// // // // // //         return;
// // // // // //       }

// // // // // //       console.log('[Header] Initializing: Fetching available organizations...');
// // // // // //       setLoadingOrgLocs(true);
// // // // // //       try {
// // // // // //         // Call the RPC. No arguments are needed as it uses auth.uid()
// // // // // //         const { data, error } = await supabase.schema('identity').rpc('get_my_organizations_v2');

// // // // // //         if (error) {
// // // // // //           console.error('[Header] Error calling get_my_organizations RPC:', error);
// // // // // //           // Handle error (e.g., show a notification)
// // // // // //           return;
// // // // // //         }

// // // // // //         const orgLocs = data as UserOrgLocationData[];
// // // // // //         setUserOrgLocations(orgLocs);
// // // // // //         console.log(`[Header] Found ${orgLocs.length} available organizations.`);

// // // // // //       } catch (error) {
// // // // // //         console.error('[Header] Unexpected error fetching orgs/locs:', error);
// // // // // //       } finally {
// // // // // //         setLoadingOrgLocs(false);
// // // // // //       }
// // // // // //     };

// // // // // //     if (user?.id) {
// // // // // //       fetchOrgAndLocations();
// // // // // //     }
// // // // // //   }, [user?.id]);

// // // // // //   /**
// // // // // //    * Derived state: Organizations for the Select dropdown
// // // // // //    */
// // // // // //   const organizationOptions = useMemo(() => {
// // // // // //     return userOrgLocations.map(org => ({
// // // // // //       id: org.organization_id,
// // // // // //       name: org.organization_name,
// // // // // //       roles: org.roles,
// // // // // //     }));
// // // // // //   }, [userOrgLocations]);

// // // // // //   /**
// // // // // //    * Helper function to get locations for the currently selected organization
// // // // // //    */
// // // // // //   const getCurrentOrganizationLocations = (): Location[] => {
// // // // // //     if (!organization?.id) {
// // // // // //       return [];
// // // // // //     }
// // // // // //     const currentOrgData = userOrgLocations.find(
// // // // // //       (org) => org.organization_id === organization.id
// // // // // //     );
// // // // // //     if (!currentOrgData) {
// // // // // //       return [];
// // // // // //     }
// // // // // //     // Map the RPC location structure to the component's Location type
// // // // // //     return currentOrgData.locations.map(loc => ({
// // // // // //       id: loc.location_id,
// // // // // //       name: loc.location_name,
// // // // // //     })) as Location[];
// // // // // //   };

// // // // // //   const currentLocations = getCurrentOrganizationLocations();
// // // // // //   const shouldShowLocationDropdown = currentLocations.length > 1;


// // // // // //   const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;

// // // // // //   useEffect(() => {
// // // // // //     if (!isFetchingSession) {
// // // // // //       setIsSwitchingOrg(false);
// // // // // //     }
// // // // // //   }, [isFetchingSession, setIsSwitchingOrg]);

// // // // // //   const handleOrganizationChange = async (orgId: string) => {
// // // // // //     const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);

// // // // // //     if (selectedOrgData && user?.id) {
// // // // // //       console.log(`[Header] Switching to organization: ${selectedOrgData.organization_name} (${orgId})`);

// // // // // //       setIsSwitchingOrg(true);
// // // // // //       message.loading({ content: `Switching to ${selectedOrgData.organization_name}...`, key: 'orgSwitch' });

// // // // // //       // Immediately update the store for a responsive UI.
// // // // // //       // CRITICAL: This updates the store's organization.id, which useUserSession will read during the next fetch.
// // // // // //       setOrganization({ id: selectedOrgData.organization_id, name: selectedOrgData.organization_name } as Organization);

// // // // // //       const newLocations = selectedOrgData.locations;
// // // // // //       if (newLocations.length > 0) {
// // // // // //         const stickyLocationId = viewPreferences[user.id]?.lastLocationByOrg?.[orgId];
// // // // // //         const stickyLocation = newLocations.find(l => l.location_id === stickyLocationId);
// // // // // //         if (stickyLocation) {
// // // // // //           setLocation({ id: stickyLocation.location_id, name: stickyLocation.location_name } as Location);
// // // // // //         } else {
// // // // // //           setLocation({ id: newLocations[0].location_id, name: newLocations[0].location_name } as Location);
// // // // // //         }
// // // // // //       } else {
// // // // // //         setLocation(null);
// // // // // //       }

// // // // // //       try {
// // // // // //         const { error: rpcError } = await supabase.schema('identity').rpc('set_preferred_organization', {
// // // // // //           new_org_id: orgId,
// // // // // //         });

// // // // // //         if (rpcError) {
// // // // // //           console.error("[Header] RPC Error updating preferred org:", rpcError);
// // // // // //           message.error({ content: 'Failed to switch organization.', key: 'orgSwitch', duration: 2 });
// // // // // //           setIsSwitchingOrg(false);
// // // // // //         } else {
// // // // // //           console.log("[Header] Preferred organization updated in DB. Invalidating user-session query to trigger refetch with new Org ID...");
// // // // // //           await queryClient.invalidateQueries({ queryKey: ['user-session'] });
// // // // // //           message.success({ content: `Switched to ${selectedOrgData.organization_name}`, key: 'orgSwitch', duration: 2 });
// // // // // //         }
// // // // // //       } catch (error) {
// // // // // //         console.error("[Header] Failed to switch organization:", error);
// // // // // //         message.error({ content: 'An error occurred.', key: 'orgSwitch', duration: 2 });
// // // // // //         setIsSwitchingOrg(false);
// // // // // //       }
// // // // // //     }
// // // // // //   };

// // // // // //   const handleLocationChange = (locId: string) => {
// // // // // //     const selectedLoc = currentLocations.find(loc => loc.id === locId);
// // // // // //     if (selectedLoc && user && organization) {
// // // // // //       console.log(`[Header] Switching location to: ${selectedLoc.name} (${locId})`);
// // // // // //       setLocation(selectedLoc); // Update current location
// // // // // //       // Persist this choice
// // // // // //       setViewPreferences(user.id, 'global', {
// // // // // //         lastLocationByOrg: {
// // // // // //           ...(viewPreferences[user.id]?.lastLocationByOrg || {}),
// // // // // //           [organization.id]: locId,
// // // // // //         },
// // // // // //       });
// // // // // //     }
// // // // // //   };
// // // // // //   console.log("oz",organizationOptions,currentLocations);

// // // // // //   return (
// // // // // //     <AntHeader className="p-0 bg-[var(--color-background)] border-b border-[var(--color-border)]">
// // // // // //       <div className="flex justify-between items-center px-4 h-full">
// // // // // //         <div className="flex items-center gap-2">
// // // // // //           <Button
// // // // // //             type="text"
// // // // // //             icon={<MenuIcon size={24} className="transform translate-y-[3px]" />}
// // // // // //             onClick={() => (isMobile ? setShowMobileMenu(true) : setCollapsed(!collapsed))}
// // // // // //             className="hover:text-[var(--color-primary)] flex items-center"
// // // // // //           />
// // // // // //           {pageTitle && (
// // // // // //             <span className="text-lg font-semibold text-[var(--color-text)] flex items-center">
// // // // // //               {pageTitle}
// // // // // //             </span>
// // // // // //           )}
// // // // // //         </div>
// // // // // //         <Space size={isMobile?"small":"middle"} className="flex items-center">
// // // // // //           {/* Organization Select (Show if more than one org or for SassAdmin) */}
// // // // // //           {!isMobile && organizationOptions.length > 1 && (
// // // // // //             <Select
// // // // // //               placeholder={t('common.select_organization')}
// // // // // //               value={organization?.id}
// // // // // //               onChange={handleOrganizationChange}
// // // // // //               loading={loadingOrgLocs}
// // // // // //               style={{ width: 200 }}
// // // // // //               options={organizationOptions.map(org => ({
// // // // // //                 value: org.id,
// // // // // //                 label: (
// // // // // //                   <div>
// // // // // //                     <span style={{ fontWeight: '500' }}>{org?.name}</span>
// // // // // //                     <br />
// // // // // //                     <span style={{ fontSize: '0.8em', color: 'var(--color-text-secondary)' }}>{org?.roles?.join(', ')}</span>
// // // // // //                   </div>
// // // // // //                 ),
// // // // // //               }))}
// // // // // //               disabled={loadingOrgLocs || organizationOptions.length === 0}
// // // // // //             />
// // // // // //           )}

// // // // // //           {/* Location Select */}
// // // // // //           {!isMobile && currentLocations.length > 1 && (
// // // // // //             <Select
// // // // // //               placeholder={t('common.select_location')}
// // // // // //               value={location?.id}
// // // // // //               onChange={handleLocationChange}
// // // // // //               loading={loadingOrgLocs}
// // // // // //               style={{ width: 200 }}
// // // // // //               options={currentLocations.map(loc => ({
// // // // // //                 value: loc.id,
// // // // // //                 label: loc.name,
// // // // // //               }))}
// // // // // //               disabled={loadingOrgLocs || currentLocations.length === 0}
// // // // // //             />
// // // // // //           )}

// // // // // //           {isMobile && config.searchFilters && (
// // // // // //             <Button
// // // // // //               type="text"
// // // // // //               icon={<Search size={24} className="transform translate-y-[3px]" />}
// // // // // //               onClick={() => setShowSearch(true)}
// // // // // //               className="hover:text-[var(--color-primary)] flex items-center"
// // // // // //             />
// // // // // //           )}
// // // // // //           <Button
// // // // // //             type="text"
// // // // // //             icon={<SettingsIcon size={24} className="transform translate-y-[3px]" />}
// // // // // //             onClick={() => setShowSettings(true)}
// // // // // //             className="hover:text-[var(--color-primary)] flex items-center"
// // // // // //           />
// // // // // //           <div className="flex items-center">
// // // // // //             <ProfileMenu isMobile={isMobile}/>
// // // // // //           </div>
// // // // // //         </Space>
// // // // // //       </div>

// // // // // //       {isMobile && (
// // // // // //         <Drawer
// // // // // //           title={t('common.search')}
// // // // // //           placement="right"
// // // // // //           onClose={() => setShowSearch(false)}
// // // // // //           open={showSearch}
// // // // // //           width={320}
// // // // // //           className="bg-[var(--color-background)]"
// // // // // //           styles={{
// // // // // //             body: {
// // // // // //               paddingTop: '2px',paddingInline:'15px'
// // // // // //             }
// // // // // //         }}
// // // // // //         >
// // // // // //           {config.searchFilters}
// // // // // //         </Drawer>
// // // // // //       )}
// // // // // //     </AntHeader>
// // // // // //   );
// // // // // // };


// // // // // // src/components/Layout/SessionManager.tsx
// // // // // import { useEffect, useState } from 'react';
// // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // import { useUserSession } from '@/core/hooks/useUserSession';
// // // // // import { supabase } from '@/lib/supabase';

// // // // // /**
// // // // //  * @component SessionManager
// // // // //  * @description A headless component that orchestrates the user session state.
// // // // //  *
// // // // //  * @returns {null} This component does not render any UI.
// // // // //  *
// // // // //  * @details
// // // // //  * This component is the central controller for the application's authentication flow. Its key responsibilities are:
// // // // //  * 1.  **Listening to Auth Events**: It subscribes to Supabase's `onAuthStateChange` to detect when a user signs in or out.
// // // // //  * 2.  **Controlling Data Fetching**: Based on auth events, it enables or disables the `useUserSession` TanStack Query hook.
// // // // //  * 3.  **Initializing Session State**: On application load, it checks for an existing session. If found, it enables the session query. If not, it marks the auth state as initialized (logged out).
// // // // //  * 4.  **Stale-While-Revalidate**: It immediately syncs any cached (stale) session data to Zustand. This allows the UI to render instantly for returning users while the session is revalidated in the background.
// // // // //  * 5.  **Syncing State**: It watches the state of the `useUserSession` hook and syncs the final results (both successful data and errors) back into the global Zustand store.
// // // // //  */
// // // // // export const SessionManager = () => {
// // // // //   // Local state to control whether the TanStack Query for the session should be active.
// // // // //   const [enabled, setEnabled] = useState(false);

// // // // //   // Select actions from the Zustand store.
// // // // //   const { setSession, clearUserSession, setInitialized, setAuthError } = useAuthStore(state => ({
// // // // //     setSession: state.setSession,
// // // // //     clearUserSession: state.clearUserSession,
// // // // //     setInitialized: state.setInitialized,
// // // // //     setAuthError: state.setAuthError,
// // // // //   }));

// // // // //   // The TanStack Query hook for fetching detailed user session data.
// // // // //   // It will only run when `enabled` is true.
// // // // //   const { data, isSuccess, isError, error, isStale } = useUserSession(enabled);

// // // // //   /**
// // // // //    * @effect
// // // // //    * Sets up the Supabase authentication listener and performs the initial session check.
// // // // //    * This effect runs once on component mount.
// // // // //    */
// // // // //   useEffect(() => {
// // // // //     console.log('>>> [SessionManager] Mounting: Setting up onAuthStateChange listener...');

// // // // //     // 1. Initial Session Check:
// // // // //     // On mount, check if a session already exists in storage.
// // // // //     supabase.auth.getSession().then(({ data: { session } }) => {
// // // // //       console.log('>>> [SessionManager] Initial session check:', session ? 'Session found' : 'No session');
// // // // //       if (session) {
// // // // //         // If a session exists, enable the query to start fetching data.
// // // // //         setEnabled(true);
// // // // //       } else {
// // // // //         // If no session, we are initialized as "logged out".
// // // // //         setInitialized(true);
// // // // //       }
// // // // //     });

// // // // //     // 2. Auth State Change Listener:
// // // // //     // Subscribe to all auth events (SIGNED_IN, SIGNED_OUT, etc.).
// // // // //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
// // // // //       console.log(`[SessionManager] onAuthStateChange EVENT: ${event}`);
// // // // //       if (event === 'SIGNED_IN') {
// // // // //         // When a user signs in, enable the query to fetch their session data.
// // // // //         console.log('[SessionManager] SIGNED_IN detected. Enabling session query...');
// // // // //         setEnabled(true);
// // // // //       }
// // // // //       if (event === 'SIGNED_OUT') {
// // // // //         // When a user signs out, disable the query and clear all session state.
// // // // //         console.log('[SessionManager] SIGNED_OUT detected. Disabling session query and clearing store.');
// // // // //         setEnabled(false);
// // // // //         clearUserSession();
// // // // //       }
// // // // //     });

// // // // //     // Cleanup function to unsubscribe when the component unmounts.
// // // // //     return () => {
// // // // //       console.log('>>> [SessionManager] Unmounting: Cleaning up listener.');
// // // // //       subscription.unsubscribe();
// // // // //     };
// // // // //   }, [clearUserSession, setInitialized]);

// // // // //   /**
// // // // //    * @effect
// // // // //    * Syncs the result of the TanStack Query back to the Zustand store.
// // // // //    * This effect runs whenever the query state (`isSuccess`, `isError`, etc.) changes.
// // // // //    */
// // // // //   useEffect(() => {
// // // // //     // If the query is successful and has data, sync it to the Zustand store.
// // // // //     // This handles both the initial fetch and subsequent updates.
// // // // //     // It's key for the "stale-while-revalidate" pattern:
// // // // //     // - On load, if stale data is in the cache, it's synced to the store immediately.
// // // // //     // - The UI renders instantly with stale data.
// // // // //     // - The query refetches in the background.
// // // // //     // - When the fresh data arrives, this effect runs again, and the UI updates.
// // // // //     if (isSuccess && data) {
// // // // //       const logPrefix = isStale ? '[SessionManager] (STALE)' : '[SessionManager] (FRESH)';
// // // // //       console.log(`${logPrefix} Syncing session data to Zustand for OrgID: ${data.org_id}`);

// // // // //       setSession(data);
// // // // //     }
// // // // //     if (isError) {
// // // // //       console.error('[SessionManager] Error fetching user session, updating authError and clearing state.', error);
// // // // //       setAuthError(error.message); // Set the error message in the global store.
// // // // //       clearUserSession(); // Clear session data from the store.
// // // // //     }
// // // // //   }, [isSuccess, isStale, isError, data, error, setSession, clearUserSession, setAuthError]);

// // // // //   return null; // This is a headless component; it renders nothing.
// // // // // };



// // // // // src/hooks/useUserSession.ts
// // // // import { useQuery } from '@tanstack/react-query';
// // // // import { supabase } from '@/lib/supabase';
// // // // import { useAuthStore } from '@/core/lib/store';
// // // // import type { UserSessionData, RpcSessionData } from '@/core/lib/store';
// // // // import type { User, Organization, Location } from '@/lib/types';

// // // // /**
// // // //  * @function fetchUserSessionData
// // // //  * @description The core async function for fetching the complete user session.
// // // //  *
// // // //  * @returns {Promise<UserSessionData>} A promise that resolves to the complete user session data.
// // // //  * @throws {Error} Throws an error if the session is invalid, RPC fails, or essential data is missing.
// // // //  *
// // // //  * @details
// // // //  * This function orchestrates the multi-step process of building the user session:
// // // //  * 1.  **Validates Supabase Session**: Ensures a valid auth session exists.
// // // //  * 2.  **Calls RPC**: Executes the `jwt_get_user_session` RPC to get core details like user ID, org ID, roles, and permissions.
// // // //  * 3.  **Fetches Full Records**: Fetches the complete `User` and `Organization` objects from their respective tables in parallel.
// // // //  * 4.  **Fetches Location (Optional)**: If a `location_id` is present, it fetches the corresponding `Location` record.
// // // //  * 5.  **Constructs Session**: Combines all fetched data into a single, comprehensive `UserSessionData` object.
// // // //  */
// // // // const fetchUserSessionData = async (): Promise<UserSessionData> => {
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: STARTED.');

// // // //   // 1. Defensively check for an active Supabase session.
// // // //   const { data: { session }, error: sessionError } = await supabase.auth.getSession();
// // // //   if (sessionError) throw new Error(`Supabase getSession Error: ${sessionError.message}`);
// // // //   if (!session) throw new Error('Authentication error: No active session found.');
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 1. Session confirmed.');

// // // //   // 2. Call the RPC to get core session details.
// // // //   // We prioritize the Organization ID from the local store (set by Header during a switch).
// // // //   // If that's null (first login), we fall back to the preferred org in the JWT metadata.
// // // //   const currentOrgId = useAuthStore.getState().organization?.id;
// // // //   const orgIdToUse = currentOrgId || session?.user?.user_metadata?.org_id;

// // // //   console.log(`>>> [useUserSession] fetchUserSessionData: 2. Calling RPC for OrgID: ${orgIdToUse} (Source: ${currentOrgId ? 'Store' : 'JWT Metadata'})`);

// // // //   const { data: rpcData, error: rpcError } = await supabase
// // // //     .schema('identity')
// // // //     .rpc('jwt_get_user_session', { p_organization_id: orgIdToUse });

// // // //   if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
// // // //   if (!rpcData) throw new Error('No data returned from RPC.');

// // // //   const partialSession = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcSessionData;
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 2. RPC Success.', { userId: partialSession.user_id, orgId: partialSession.org_id });

// // // //   // 3. Validate essential data from the RPC.
// // // //   if (!partialSession.user_id || !partialSession.org_id || !partialSession.permissions) {
// // // //     throw new Error('Incomplete session data from RPC.');
// // // //   }
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 3. Validation Success.');

// // // //   // 4. Fetch the full User and Organization objects in parallel.
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. Fetching User/Org in parallel...');
// // // //   const [userResponse, orgResponse] = await Promise.all([
// // // //     supabase.schema('identity').from('users').select('*').eq('id', partialSession.user_id).single(),
// // // //     supabase.schema('identity').from('organizations').select('*').eq('id', partialSession.org_id).single()
// // // //   ]);

// // // //   if (userResponse.error) throw new Error(`User Fetch Error: ${userResponse.error.message}`);
// // // //   if (!userResponse.data) throw new Error(`User not found for ID: ${partialSession.user_id}`);
// // // //   if (orgResponse.error) throw new Error(`Organization Fetch Error: ${orgResponse.error.message}`);
// // // //   if (!orgResponse.data) throw new Error(`Organization not found for ID: ${partialSession.org_id}`);

// // // //   const userData = userResponse.data as User;
// // // //   const orgData = orgResponse.data as Organization;
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 4. User/Org fetch SUCCESS.');

// // // //   // 5. Fetch Location data if an ID is available.
// // // //   let locationData: Location | null = null;
// // // //   const locationId = partialSession.location_id || userData.location_id;
// // // //   if (locationId) {
// // // //     console.log(`>>> [useUserSession] fetchUserSessionData: 5. Fetching Location ${locationId}...`);
// // // //     const { data, error } = await supabase.schema('identity').from('locations').select('*').eq('id', locationId).maybeSingle();

// // // //     if (error) console.warn(`Location fetch warning: ${error.message}`); // Warn but don't fail.
// // // //     else locationData = data as Location;
// // // //   }
// // // //   console.log('>>> [useUserSession] fetchUserSessionData: 5. Location fetch complete.');

// // // //   // 6. Combine all data into the final session object.
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
// // // //  * @hook useUserSession
// // // //  * @description A TanStack Query hook for fetching and caching the complete user session data.
// // // //  *
// // // //  * @param {boolean} enabled - A boolean to control whether the query should be active. This is the key mechanism for starting the fetch only after a user is signed in.
// // // //  * @returns {QueryResult<UserSessionData, Error>} The result object from TanStack Query, including `data`, `isSuccess`, `isError`, `error`, etc.
// // // //  *
// // // //  * @details
// // // //  * This hook wraps the `fetchUserSessionData` function in `useQuery`.
// // // //  * - **`queryKey`**: `['user-session']` is the unique key for this query in the cache.
// // // //  * - **`enabled`**: The query is deferred until `enabled` is `true`, which is controlled by the `SessionManager`.
// // // //  * - **`staleTime`**: Data is considered fresh for 15 minutes.
// // // //  * - **`gcTime`**: Inactive data is kept in the cache for 1 hour.
// // // //  */
// // // // export const useUserSession = (enabled: boolean) => {
// // // //   return useQuery<UserSessionData, Error>({
// // // //     queryKey: ['user-session'],
// // // //     queryFn: fetchUserSessionData,
// // // //     enabled,
// // // //     staleTime: 1000 * 60 * 15,
// // // //     gcTime: 1000 * 60 * 60,
// // // //     retry: 1,
// // // //     refetchOnWindowFocus: true,
// // // //   });
// // // // };


// // // import { useEffect, useState } from 'react';
// // // import { useAuthStore } from '@/core/lib/store';
// // // import { useUserSession } from '@/core/hooks/useUserSession';
// // // import { supabase } from '@/lib/supabase';

// // // /**
// // //  * @component SessionManager
// // //  * @description A headless component that acts as the bridge between Supabase Auth, 
// // //  * React Query, and the Zustand Global Store.
// // //  * * Responsibilities:
// // //  * 1. Detects Login/Logout events.
// // //  * 2. Enables/Disables the 'user-session' query.
// // //  * 3. Syncs the fetched session data (User, Org, Permissions) into the Zustand Store.
// // //  */
// // // export const SessionManager = () => {
// // //   // Controls whether the React Query hook is active
// // //   const [enabled, setEnabled] = useState(false);

// // //   // Zustand Actions
// // //   const { setSession, clearUserSession, setInitialized, setAuthError } = useAuthStore(state => ({
// // //     setSession: state.setSession,
// // //     clearUserSession: state.clearUserSession,
// // //     setInitialized: state.setInitialized,
// // //     setAuthError: state.setAuthError,
// // //   }));

// // //   // The Query Hook
// // //   const { data, isSuccess, isError, error, isStale } = useUserSession(enabled);

// // //   // --- Effect 1: Manage Auth Lifecycle ---
// // //   useEffect(() => {
// // //     console.log('>>> [SessionManager] Initializing Auth Listener...');

// // //     // A. Initial Check
// // //     supabase.auth.getSession().then(({ data: { session } }) => {
// // //       if (session) {
// // //         console.log('>>> [SessionManager] Existing session found. Enabling Query.');
// // //         setEnabled(true);
// // //       } else {
// // //         console.log('>>> [SessionManager] No session found. Marking initialized.');
// // //         setInitialized(true);
// // //       }
// // //     });

// // //     // B. Subscribe to Changes
// // //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
// // //       console.log(`>>> [SessionManager] Auth Event: ${event}`);

// // //       if (event === 'SIGNED_IN') {
// // //         setEnabled(true);
// // //       }
// // //       if (event === 'SIGNED_OUT') {
// // //         setEnabled(false);
// // //         clearUserSession();
// // //       }
// // //     });

// // //     return () => subscription.unsubscribe();
// // //   }, [clearUserSession, setInitialized]);

// // //   // --- Effect 2: Sync Data to Store ---
// // //   useEffect(() => {
// // //     // Handle Success
// // //     if (isSuccess && data) {
// // //       const status = isStale ? '(STALE/CACHE)' : '(FRESH/NETWORK)';
// // //       console.log(`%c[SessionManager] Syncing Data ${status}`, 'color: green', 
// // //         `\n   Org: ${data.organization.name} (${data.org_id})`,
// // //         `\n   User: ${data.user.email}`
// // //       );

// // //       // This updates the global store, which triggers UI re-renders (e.g., Navigation, Dashboard)
// // //       setSession(data);
// // //     }

// // //     // Handle Error
// // //     if (isError) {
// // //       console.error('[SessionManager] Error fetching session:', error);
// // //       setAuthError(error.message);

// // //       // If we can't fetch the session (e.g., deleted user, bad permissions), 
// // //       // we clear the store to prevent a broken UI state.
// // //       clearUserSession();
// // //     }
// // //   }, [isSuccess, isStale, isError, data, error, setSession, clearUserSession, setAuthError]);

// // //   return null; // Headless
// // // };


// // // without stale data for switch org

// // import { useEffect, useState } from 'react';
// // import { useAuthStore } from '@/core/lib/store';
// // import { useUserSession } from '@/core/hooks/useUserSession';
// // import { supabase } from '@/lib/supabase';

// // export const SessionManager = () => {
// //   const [enabled, setEnabled] = useState(false);

// //   // 1. Get isSwitchingOrg to act as a Guard
// //   const { 
// //     setSession, 
// //     clearUserSession, 
// //     setInitialized, 
// //     setAuthError,
// //     isSwitchingOrg // <--- ADD THIS
// //   } = useAuthStore(state => ({
// //     setSession: state.setSession,
// //     clearUserSession: state.clearUserSession,
// //     setInitialized: state.setInitialized,
// //     setAuthError: state.setAuthError,
// //     isSwitchingOrg: state.isSwitchingOrg
// //   }));

// //   const { data, isSuccess, isError, error, isStale } = useUserSession(enabled);

// //   // --- Effect 1: Manage Auth Lifecycle ---
// //   useEffect(() => {
// //     console.log('>>> [SessionManager] Initializing Auth Listener...');

// //     supabase.auth.getSession().then(({ data: { session } }) => {
// //       if (session) {
// //         setEnabled(true);
// //       } else {
// //         setInitialized(true);
// //       }
// //     });

// //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
// //       if (event === 'SIGNED_IN') setEnabled(true);
// //       if (event === 'SIGNED_OUT') {
// //         setEnabled(false);
// //         clearUserSession();
// //       }
// //     });

// //     return () => subscription.unsubscribe();
// //   }, [clearUserSession, setInitialized]);

// //   // --- Effect 2: Sync Data to Store ---
// //   useEffect(() => {
// //     if (isSuccess && data) {
// //       // CRITICAL FIX: Prevent "Cycle of Doom"
// //       // If we are switching orgs, React Query will immediately return the OLD (stale) data 
// //       // from cache before fetching the new data. We must IGNORE this stale data 
// //       // so we don't overwrite the Optimistic Update in the store.
// //       if (isSwitchingOrg && isStale) {
// //         console.log('>>> [SessionManager] Guard: Ignoring stale data during Org Switch.');
// //         return; 
// //       }

// //       const status = isStale ? '(STALE/CACHE)' : '(FRESH/NETWORK)';
// //       console.log(`%c[SessionManager] Syncing Data ${status}`, 'color: green', 
// //         `\n   Org: ${data.organization.name}`,
// //         `\n   User: ${data.user.email}`
// //       );

// //       setSession(data);
// //     }

// //     if (isError) {
// //       console.error('[SessionManager] Error:', error);
// //       setAuthError(error.message);
// //       clearUserSession();
// //     }
// //   }, [isSuccess, isStale, isError, data, error, setSession, clearUserSession, setAuthError, isSwitchingOrg]);

// //   return null;
// // };


// // THE REACTIVE LOGIC + LOGOUT
// import { useEffect, useState } from 'react';
// import { useAuthStore } from '@/core/lib/store';
// import { useUserSession } from '@/core/hooks/useUserSession';
// import { supabase } from '@/lib/supabase';

// export const SessionManager = () => {
//   const [enabled, setEnabled] = useState(false);

//   const { 
//     setSession, 
//     clearUserSession, 
//     setInitialized, 
//     setAuthError,
//     organization, // <-- Get the current Organization from Store
//     isLoggingOut  // <-- New flag to prevent race conditions during logout
//   } = useAuthStore(state => ({
//     setSession: state.setSession,
//     clearUserSession: state.clearUserSession,
//     setInitialized: state.setInitialized,
//     setAuthError: state.setAuthError,
//     organization: state.organization,
//     isLoggingOut: state.isLoggingOut
//   }));

//   // CRITICAL: Pass the organization.id to the hook.
//   // If this changes in the store (via Header), the hook automatically re-runs.
//   // We DISABLE the query if we are in the process of logging out to prevent unwanted re-fetches.
//   const { data, isSuccess, isError, error, isStale } = useUserSession(enabled && !isLoggingOut, organization?.id);

//   // --- Effect 1: Manage Auth Lifecycle ---
//   useEffect(() => {
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       if (session) setEnabled(true);
//       else setInitialized(true);
//     });

//     const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
//       if (event === 'SIGNED_IN') setEnabled(true);
//       if (event === 'SIGNED_OUT') {
//         setEnabled(false);
//         clearUserSession();
//       }
//     });
//     return () => subscription.unsubscribe();
//   }, [clearUserSession, setInitialized]);

//   // --- Effect 2: Sync Data to Store ---
//   useEffect(() => {
//     // 0. Safety Guard: If logging out, STOP EVERYTHING.
//     if (isLoggingOut) {
//       console.log('[SessionManager] Guard: Logging out. Ignoring all query updates.');
//       return;
//     }

//     if (isSuccess && data) {
//       const status = isStale ? '(STALE)' : '(FRESH)';

//       // Extra Check: Ensure we don't overwrite a new intent with old data
//       // If the fetched data Org ID doesn't match our requested store Org ID (and we have one),
//       // it means this is a lagging response from a previous switch. Ignore it.
//       if (organization?.id && data.organization.id !== organization.id) {
//         console.log(`[SessionManager] Guard: Ignoring mismatched data. Wanted ${organization.id}, got ${data.organization.id}`);
//         return;
//       }

//       console.log(`[SessionManager] Syncing ${status}: ${data.organization.name}`);
//       setSession(data);
//     }

//     if (isError) {
//       console.error('[SessionManager] Error:', error);
//       setAuthError(error.message);
//       clearUserSession();
//     }
//   }, [isSuccess, isStale, isError, data, error, setSession, clearUserSession, setAuthError, organization?.id, isLoggingOut]);

//   return null;
// };


import { useEffect, useState } from 'react';
import { useAuthStore } from '@/core/lib/store';
import { useUserSession } from '@/core/hooks/useUserSession';
import { supabase } from '@/lib/supabase';
import { loadTenantTheme } from '@/core/theme/ThemeRegistry';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/core/i18n';

export const SessionManager = () => {
  const [enabled, setEnabled] = useState(false);

  const {
    setSession,
    clearUserSession,
    setInitialized,
    setAuthError,
    organization,
    isLoggingOut,
    setIsLoggingOut
  } = useAuthStore(state => ({
    setSession: state.setSession,
    clearUserSession: state.clearUserSession,
    setInitialized: state.setInitialized,
    setAuthError: state.setAuthError,
    organization: state.organization,
    isLoggingOut: state.isLoggingOut,
    setIsLoggingOut: state.setIsLoggingOut
  }));

  const { data, isSuccess, isError, error, isStale } = useUserSession(enabled && !isLoggingOut, organization?.id);

  // --- Effect 1: Manage Auth Lifecycle ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setEnabled(true);
      else setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setIsLoggingOut(false);
        setEnabled(true);
      }

      if (event === 'SIGNED_OUT') {
        setEnabled(false);
        clearUserSession();
      }
    });
    return () => subscription.unsubscribe();
  }, [clearUserSession, setInitialized, setIsLoggingOut]);

  // --- Effect 2: Sync Data to Store ---
  useEffect(() => {
    if (isLoggingOut) return;

    if (isSuccess && data) {
      if (organization?.id && data.organization.id !== organization.id) {
        return;
      }
      setSession(data);
    }

    if (isError && error) {
      console.error('[SessionManager] Session fetch failed:', error.message);
      setAuthError(error.message);
      setInitialized(true); // <--- CRITICAL: Allow app to proceed (to login or error state) instead of hanging
    }
  }, [isSuccess, isError, data, setSession, clearUserSession, error, organization?.id, isLoggingOut, setAuthError, isStale, setInitialized]);

  // --- Effect 3: Watch and Apply Theme Configuration ---
  // Theme is fully driven by database - apply organization's theme_config directly
  useEffect(() => {
    if (data?.organization?.theme_config) {
      console.log('[SessionManager] Applying org theme_config from database:', data.organization.theme_config);
      loadTenantTheme(data.organization.theme_config as any);
    }
  }, [data?.organization?.theme_config]);

  // --- Effect 4: Watch and Apply Language Configuration ---
  const { i18n } = useTranslation();
  useEffect(() => {
    if (data?.organization) {
      const enabledLangs = data.organization.enabled_languages || ['en'];
      const defaultLang = data.organization.default_language || 'en';

      // If current language is not enabled for this org, switch to default
      if (!enabledLangs.includes(i18n.language)) {
        console.log(`[SessionManager] Language ${i18n.language} not enabled for org. Switching to ${defaultLang}.`);
        changeLanguage(defaultLang);
      }
    }
  }, [data?.organization, i18n]);

  return null;
};
