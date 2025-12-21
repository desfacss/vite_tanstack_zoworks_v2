// // // // // // Header.tsx
// // // // // import React, { useState, useEffect, useMemo } from 'react';
// // // // // import { Layout, Button, Space, Drawer, Select, message } from 'antd';
// // // // // import { Menu as MenuIcon, Bell, Search, Settings as SettingsIcon } from 'lucide-react';
// // // // // import { useQueryClient, useIsFetching } from '@tanstack/react-query';
// // // // // import { useTranslation } from 'react-i18next';
// // // // // import { ProfileMenu } from '../ProfileMenu';
// // // // // import { useAuthedLayoutConfig } from '../AuthedLayoutContext';
// // // // // import { useAuthStore } from '@/core/lib/store';
// // // // // // NOTE: Removed unused functions like getAllOrganizations and getOrganizationLocations
// // // // // import { supabase } from '@/lib/supabase';
// // // // // import type { Organization, Location } from '@/lib/types';

// // // // // const { Header: AntHeader } = Layout;

// // // // // // Define the structure of the data returned by the get_my_organizations RPC
// // // // // interface UserOrgLocationData {
// // // // //   organization_id: string;
// // // // //   organization_name: string;
// // // // //   roles: string[]; // Roles as a string array
// // // // //   locations: {
// // // // //     location_id: string;
// // // // //     location_name: string;
// // // // //   }[];
// // // // // }

// // // // // interface HeaderProps {
// // // // //   collapsed: boolean;
// // // // //   setCollapsed: (collapsed: boolean) => void;
// // // // //   isMobile: boolean;
// // // // //   unreadCount: number;
// // // // //   setShowNotifications: (show: boolean) => void;
// // // // //   setShowMobileMenu: (show: boolean) => void;
// // // // //   setShowSettings: (show: boolean) => void;
// // // // //   pageTitle?: string;
// // // // // }

// // // // // export const Header: React.FC<HeaderProps> = ({
// // // // //   collapsed,
// // // // //   setCollapsed,
// // // // //   isMobile,
// // // // //   unreadCount,
// // // // //   setShowNotifications,
// // // // //   setShowMobileMenu,
// // // // //   setShowSettings,
// // // // //   pageTitle,
// // // // // }) => {
// // // // //   const { t } = useTranslation();
// // // // //   const { config } = useAuthedLayoutConfig();
// // // // //   const { user, organization, location, setOrganization, setLocation, viewPreferences, setViewPreferences, setIsSwitchingOrg } = useAuthStore();
// // // // //   const queryClient = useQueryClient();
// // // // //   const [showSearch, setShowSearch] = useState(false);

// // // // //   // New state to hold the RPC result
// // // // //   const [userOrgLocations, setUserOrgLocations] = useState<UserOrgLocationData[]>([]);

// // // // //   const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

// // // // //   /**
// // // // //    * 1. Fetch organizations and their associated locations using the RPC.
// // // // //    * 2. Populate the organization and location state in the store.
// // // // //    */
// // // // //   useEffect(() => {
// // // // //     const fetchOrgAndLocations = async () => {
// // // // //       if (!user?.id) {
// // // // //         return;
// // // // //       }

// // // // //       setLoadingOrgLocs(true);
// // // // //       try {
// // // // //         // Call the RPC. No arguments are needed as it uses auth.uid()
// // // // //         const { data, error } = await supabase.schema('identity').rpc('get_my_organizations_v2');
// // // // //         console.log("gz",data);
// // // // //         if (error) {
// // // // //           console.error('Error calling get_my_organizations RPC:', error);
// // // // //           // Handle error (e.g., show a notification)
// // // // //           return;
// // // // //         }

// // // // //         const orgLocs = data as UserOrgLocationData[];
// // // // //         setUserOrgLocations(orgLocs);

// // // // //         if (orgLocs.length > 0) {
// // // // //           // --- Set Initial Organization in Store ---
// // // // //           let initialOrgData = orgLocs[0];

// // // // //           // Try to find the currently stored organization in the new list (for persistence)
// // // // //           if (organization?.id) {
// // // // //              const existingOrg = orgLocs.find(o => o.organization_id === organization.id);
// // // // //              if (existingOrg) {
// // // // //                  initialOrgData = existingOrg;
// // // // //              }
// // // // //           }

// // // // //           // Set the organization in the Zustand store
// // // // //           setOrganization({ id: initialOrgData.organization_id, name: initialOrgData.organization_name } as Organization);

// // // // //           // --- Set Initial Location in Store ---
// // // // //           const initialLocs = initialOrgData.locations;

// // // // //           if (initialLocs.length > 0) {
// // // // //             let initialLoc = initialLocs[0];
// // // // //              // Try to find the currently stored location in the new list
// // // // //             if (location?.id) {
// // // // //                 const existingLoc = initialLocs.find(l => l.location_id === location.id);
// // // // //                 if (existingLoc) {
// // // // //                     initialLoc = existingLoc;
// // // // //                 }
// // // // //             }

// // // // //             // Set the location in the Zustand store
// // // // //             setLocation({ id: initialLoc.location_id, name: initialLoc.location_name } as Location);
// // // // //           } else {
// // // // //             setLocation(null);
// // // // //           }
// // // // //         } else {
// // // // //             // No organizations found for the user
// // // // //             setOrganization(null);
// // // // //             setLocation(null);
// // // // //         }

// // // // //       } catch (error) {
// // // // //         console.error('Unexpected error fetching orgs/locs:', error);
// // // // //       } finally {
// // // // //         setLoadingOrgLocs(false);
// // // // //       }
// // // // //     };

// // // // //     if (user?.id) {
// // // // //       fetchOrgAndLocations();
// // // // //     }
// // // // //   }, [user?.id]);

// // // // //   /**
// // // // //    * Derived state: Organizations for the Select dropdown
// // // // //    */
// // // // //   const organizationOptions = useMemo(() => {
// // // // //     return userOrgLocations.map(org => ({
// // // // //       id: org.organization_id,
// // // // //       name: org.organization_name,
// // // // //       roles: org.roles,
// // // // //     }));
// // // // //   }, [userOrgLocations]);

// // // // //   /**
// // // // //    * Helper function to get locations for the currently selected organization
// // // // //    */
// // // // //   const getCurrentOrganizationLocations = (): Location[] => {
// // // // //     if (!organization?.id) {
// // // // //       return [];
// // // // //     }
// // // // //     const currentOrgData = userOrgLocations.find(
// // // // //       (org) => org.organization_id === organization.id
// // // // //     );
// // // // //     if (!currentOrgData) {
// // // // //       return [];
// // // // //     }
// // // // //     // Map the RPC location structure to the component's Location type
// // // // //     return currentOrgData.locations.map(loc => ({
// // // // //       id: loc.location_id,
// // // // //       name: loc.location_name,
// // // // //     })) as Location[];
// // // // //   };

// // // // //   const currentLocations = getCurrentOrganizationLocations();
// // // // //   const shouldShowLocationDropdown = currentLocations.length > 1;


// // // // //   const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;

// // // // //   useEffect(() => {
// // // // //     if (!isFetchingSession) {
// // // // //       setIsSwitchingOrg(false);
// // // // //     }
// // // // //   }, [isFetchingSession, setIsSwitchingOrg]);

// // // // //   const handleOrganizationChange = async (orgId: string) => {
// // // // //     const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);

// // // // //     if (selectedOrgData && user?.id) {
// // // // //       console.log(`>>> [Header] Switching to organization: ${selectedOrgData.organization_name} (${orgId})`);

// // // // //       setIsSwitchingOrg(true);
// // // // //       message.loading({ content: `Switching to ${selectedOrgData.organization_name}...`, key: 'orgSwitch' });

// // // // //       // Immediately update the store for a responsive UI
// // // // //       setOrganization({ id: selectedOrgData.organization_id, name: selectedOrgData.organization_name } as Organization);
// // // // //       const newLocations = selectedOrgData.locations;
// // // // //       if (newLocations.length > 0) {
// // // // //         const stickyLocationId = viewPreferences[user.id]?.lastLocationByOrg?.[orgId];
// // // // //         const stickyLocation = newLocations.find(l => l.location_id === stickyLocationId);
// // // // //         if (stickyLocation) {
// // // // //           setLocation({ id: stickyLocation.location_id, name: stickyLocation.location_name } as Location);
// // // // //         } else {
// // // // //           setLocation({ id: newLocations[0].location_id, name: newLocations[0].location_name } as Location);
// // // // //         }
// // // // //       } else {
// // // // //         setLocation(null);
// // // // //       }

// // // // //       try {
// // // // //         const { error: rpcError } = await supabase.schema('identity').rpc('set_preferred_organization', {
// // // // //           new_org_id: orgId,
// // // // //         });

// // // // //         if (rpcError) {
// // // // //           console.error("RPC Error updating preferred org:", rpcError);
// // // // //           message.error({ content: 'Failed to switch organization.', key: 'orgSwitch', duration: 2 });
// // // // //           setIsSwitchingOrg(false);
// // // // //         } else {
// // // // //           console.log("[Header] Preferred organization updated. Invalidating session query...");
// // // // //           await queryClient.invalidateQueries({ queryKey: ['user-session'] });
// // // // //           message.success({ content: `Switched to ${selectedOrgData.organization_name}`, key: 'orgSwitch', duration: 2 });
// // // // //         }
// // // // //       } catch (error) {
// // // // //         console.error(">>> [Header] Failed to switch organization:", error);
// // // // //         message.error({ content: 'An error occurred.', key: 'orgSwitch', duration: 2 });
// // // // //         setIsSwitchingOrg(false);
// // // // //       }
// // // // //     }
// // // // //   };

// // // // //   const handleLocationChange = (locId: string) => {
// // // // //     const selectedLoc = currentLocations.find(loc => loc.id === locId);
// // // // //     if (selectedLoc && user && organization) {
// // // // //       setLocation(selectedLoc); // Update current location
// // // // //       // Persist this choice
// // // // //       setViewPreferences(user.id, 'global', {
// // // // //         lastLocationByOrg: {
// // // // //           ...(viewPreferences[user.id]?.lastLocationByOrg || {}),
// // // // //           [organization.id]: locId,
// // // // //         },
// // // // //       });
// // // // //     }
// // // // //   };
// // // // //   console.log("oz",organizationOptions,currentLocations);

// // // // //   return (
// // // // //     <AntHeader className="p-0 bg-[var(--color-background)] border-b border-[var(--color-border)]">
// // // // //       <div className="flex justify-between items-center px-4 h-full">
// // // // //         <div className="flex items-center gap-2">
// // // // //           <Button
// // // // //             type="text"
// // // // //             icon={<MenuIcon size={24} className="transform translate-y-[3px]" />}
// // // // //             onClick={() => (isMobile ? setShowMobileMenu(true) : setCollapsed(!collapsed))}
// // // // //             className="hover:text-[var(--color-primary)] flex items-center"
// // // // //           />
// // // // //           {pageTitle && (
// // // // //             <span className="text-lg font-semibold text-[var(--color-text)] flex items-center">
// // // // //               {pageTitle}
// // // // //             </span>
// // // // //           )}
// // // // //         </div>
// // // // //         <Space size={isMobile?"small":"middle"} className="flex items-center">
// // // // //           {/* Organization Select (Show if more than one org or for SassAdmin) */}
// // // // //           {!isMobile && organizationOptions.length > 1 && (
// // // // //             <Select
// // // // //               placeholder={t('common.select_organization')}
// // // // //               value={organization?.id}
// // // // //               onChange={handleOrganizationChange}
// // // // //               loading={loadingOrgLocs}
// // // // //               style={{ width: 200 }}
// // // // //               options={organizationOptions.map(org => ({
// // // // //                 value: org.id,
// // // // //                 label: (
// // // // //                   <div>
// // // // //                     <span style={{ fontWeight: '500' }}>{org?.name}</span>
// // // // //                     <br />
// // // // //                     <span style={{ fontSize: '0.8em', color: 'var(--color-text-secondary)' }}>{org?.roles?.join(', ')}</span>
// // // // //                   </div>
// // // // //                 ),
// // // // //               }))}
// // // // //               disabled={loadingOrgLocs || organizationOptions.length === 0}
// // // // //             />
// // // // //           )}

// // // // //           {/* Location Select */}
// // // // //           {!isMobile && currentLocations.length > 1 && (
// // // // //             <Select
// // // // //               placeholder={t('common.select_location')}
// // // // //               value={location?.id}
// // // // //               onChange={handleLocationChange}
// // // // //               loading={loadingOrgLocs}
// // // // //               style={{ width: 200 }}
// // // // //               options={currentLocations.map(loc => ({
// // // // //                 value: loc.id,
// // // // //                 label: loc.name,
// // // // //               }))}
// // // // //               disabled={loadingOrgLocs || currentLocations.length === 0}
// // // // //             />
// // // // //           )}

// // // // //           {isMobile && config.searchFilters && (
// // // // //             <Button
// // // // //               type="text"
// // // // //               icon={<Search size={24} className="transform translate-y-[3px]" />}
// // // // //               onClick={() => setShowSearch(true)}
// // // // //               className="hover:text-[var(--color-primary)] flex items-center"
// // // // //             />
// // // // //           )}
// // // // //           <Button
// // // // //             type="text"
// // // // //             icon={<SettingsIcon size={24} className="transform translate-y-[3px]" />}
// // // // //             onClick={() => setShowSettings(true)}
// // // // //             className="hover:text-[var(--color-primary)] flex items-center"
// // // // //           />
// // // // //           <div className="flex items-center">
// // // // //             <ProfileMenu isMobile={isMobile}/>
// // // // //           </div>
// // // // //         </Space>
// // // // //       </div>

// // // // //       {isMobile && (
// // // // //         <Drawer
// // // // //           title={t('common.search')}
// // // // //           placement="right"
// // // // //           onClose={() => setShowSearch(false)}
// // // // //           open={showSearch}
// // // // //           width={320}
// // // // //           className="bg-[var(--color-background)]"
// // // // //           styles={{
// // // // //             body: {
// // // // //               paddingTop: '2px',paddingInline:'15px'
// // // // //             }
// // // // //         }}
// // // // //         >
// // // // //           {config.searchFilters}
// // // // //         </Drawer>
// // // // //       )}
// // // // //     </AntHeader>
// // // // //   );
// // // // // };

// // // // // Header.tsx
// // // // import React, { useState, useEffect, useMemo } from 'react';
// // // // import { Layout, Button, Space, Drawer, Select, message } from 'antd';
// // // // import { Menu as MenuIcon, Bell, Search, Settings as SettingsIcon } from 'lucide-react';
// // // // import { useQueryClient, useIsFetching } from '@tanstack/react-query';
// // // // import { useTranslation } from 'react-i18next';
// // // // import { ProfileMenu } from '../ProfileMenu';
// // // // import { useAuthedLayoutConfig } from '../AuthedLayoutContext';
// // // // import { useAuthStore } from '@/core/lib/store';
// // // // // NOTE: Removed unused functions like getAllOrganizations and getOrganizationLocations
// // // // import { supabase } from '@/lib/supabase';
// // // // import type { Organization, Location } from '@/lib/types';

// // // // const { Header: AntHeader } = Layout;

// // // // // Define the structure of the data returned by the get_my_organizations RPC
// // // // interface UserOrgLocationData {
// // // //   organization_id: string;
// // // //   organization_name: string;
// // // //   roles: string[]; // Roles as a string array
// // // //   locations: {
// // // //     location_id: string;
// // // //     location_name: string;
// // // //   }[];
// // // // }

// // // // interface HeaderProps {
// // // //   collapsed: boolean;
// // // //   setCollapsed: (collapsed: boolean) => void;
// // // //   isMobile: boolean;
// // // //   unreadCount: number;
// // // //   setShowNotifications: (show: boolean) => void;
// // // //   setShowMobileMenu: (show: boolean) => void;
// // // //   setShowSettings: (show: boolean) => void;
// // // //   pageTitle?: string;
// // // // }

// // // // export const Header: React.FC<HeaderProps> = ({
// // // //   collapsed,
// // // //   setCollapsed,
// // // //   isMobile,
// // // //   unreadCount,
// // // //   setShowNotifications,
// // // //   setShowMobileMenu,
// // // //   setShowSettings,
// // // //   pageTitle,
// // // // }) => {
// // // //   const { t } = useTranslation();
// // // //   const { config } = useAuthedLayoutConfig();
// // // //   const { user, organization, location, setOrganization, setLocation, viewPreferences, setViewPreferences, setIsSwitchingOrg } = useAuthStore();
// // // //   const queryClient = useQueryClient();
// // // //   const [showSearch, setShowSearch] = useState(false);

// // // //   // New state to hold the RPC result
// // // //   const [userOrgLocations, setUserOrgLocations] = useState<UserOrgLocationData[]>([]);

// // // //   const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

// // // //   /**
// // // //    * 1. Fetch organizations and their associated locations using the RPC.
// // // //    *    We do NOT set the organization/location in the store here anymore.
// // // //    *    SessionManager handles the initial session state.
// // // //    */
// // // //   useEffect(() => {
// // // //     const fetchOrgAndLocations = async () => {
// // // //       if (!user?.id) {
// // // //         return;
// // // //       }

// // // //       console.log('[Header] Initializing: Fetching available organizations...');
// // // //       setLoadingOrgLocs(true);
// // // //       try {
// // // //         // Call the RPC. No arguments are needed as it uses auth.uid()
// // // //         const { data, error } = await supabase.schema('identity').rpc('get_my_organizations_v2');

// // // //         if (error) {
// // // //           console.error('[Header] Error calling get_my_organizations RPC:', error);
// // // //           // Handle error (e.g., show a notification)
// // // //           return;
// // // //         }

// // // //         const orgLocs = data as UserOrgLocationData[];
// // // //         setUserOrgLocations(orgLocs);
// // // //         console.log(`[Header] Found ${orgLocs.length} available organizations.`);

// // // //       } catch (error) {
// // // //         console.error('[Header] Unexpected error fetching orgs/locs:', error);
// // // //       } finally {
// // // //         setLoadingOrgLocs(false);
// // // //       }
// // // //     };

// // // //     if (user?.id) {
// // // //       fetchOrgAndLocations();
// // // //     }
// // // //   }, [user?.id]);

// // // //   /**
// // // //    * Derived state: Organizations for the Select dropdown
// // // //    */
// // // //   const organizationOptions = useMemo(() => {
// // // //     return userOrgLocations.map(org => ({
// // // //       id: org.organization_id,
// // // //       name: org.organization_name,
// // // //       roles: org.roles,
// // // //     }));
// // // //   }, [userOrgLocations]);

// // // //   /**
// // // //    * Helper function to get locations for the currently selected organization
// // // //    */
// // // //   const getCurrentOrganizationLocations = (): Location[] => {
// // // //     if (!organization?.id) {
// // // //       return [];
// // // //     }
// // // //     const currentOrgData = userOrgLocations.find(
// // // //       (org) => org.organization_id === organization.id
// // // //     );
// // // //     if (!currentOrgData) {
// // // //       return [];
// // // //     }
// // // //     // Map the RPC location structure to the component's Location type
// // // //     return currentOrgData.locations.map(loc => ({
// // // //       id: loc.location_id,
// // // //       name: loc.location_name,
// // // //     })) as Location[];
// // // //   };

// // // //   const currentLocations = getCurrentOrganizationLocations();
// // // //   const shouldShowLocationDropdown = currentLocations.length > 1;


// // // //   const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;

// // // //   useEffect(() => {
// // // //     if (!isFetchingSession) {
// // // //       setIsSwitchingOrg(false);
// // // //     }
// // // //   }, [isFetchingSession, setIsSwitchingOrg]);

// // // //   const handleOrganizationChange = async (orgId: string) => {
// // // //     const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);

// // // //     if (selectedOrgData && user?.id) {
// // // //       console.log(`[Header] Switching to organization: ${selectedOrgData.organization_name} (${orgId})`);

// // // //       setIsSwitchingOrg(true);
// // // //       message.loading({ content: `Switching to ${selectedOrgData.organization_name}...`, key: 'orgSwitch' });

// // // //       // Immediately update the store for a responsive UI.
// // // //       // CRITICAL: This updates the store's organization.id, which useUserSession will read during the next fetch.
// // // //       setOrganization({ id: selectedOrgData.organization_id, name: selectedOrgData.organization_name } as Organization);

// // // //       const newLocations = selectedOrgData.locations;
// // // //       if (newLocations.length > 0) {
// // // //         const stickyLocationId = viewPreferences[user.id]?.lastLocationByOrg?.[orgId];
// // // //         const stickyLocation = newLocations.find(l => l.location_id === stickyLocationId);
// // // //         if (stickyLocation) {
// // // //           setLocation({ id: stickyLocation.location_id, name: stickyLocation.location_name } as Location);
// // // //         } else {
// // // //           setLocation({ id: newLocations[0].location_id, name: newLocations[0].location_name } as Location);
// // // //         }
// // // //       } else {
// // // //         setLocation(null);
// // // //       }

// // // //       try {
// // // //         const { error: rpcError } = await supabase.schema('identity').rpc('set_preferred_organization', {
// // // //           new_org_id: orgId,
// // // //         });

// // // //         if (rpcError) {
// // // //           console.error("[Header] RPC Error updating preferred org:", rpcError);
// // // //           message.error({ content: 'Failed to switch organization.', key: 'orgSwitch', duration: 2 });
// // // //           setIsSwitchingOrg(false);
// // // //         } else {
// // // //           console.log("[Header] Preferred organization updated in DB. Invalidating user-session query to trigger refetch with new Org ID...");
// // // //           await queryClient.invalidateQueries({ queryKey: ['user-session'] });
// // // //           message.success({ content: `Switched to ${selectedOrgData.organization_name}`, key: 'orgSwitch', duration: 2 });
// // // //         }
// // // //       } catch (error) {
// // // //         console.error("[Header] Failed to switch organization:", error);
// // // //         message.error({ content: 'An error occurred.', key: 'orgSwitch', duration: 2 });
// // // //         setIsSwitchingOrg(false);
// // // //       }
// // // //     }
// // // //   };

// // // //   const handleLocationChange = (locId: string) => {
// // // //     const selectedLoc = currentLocations.find(loc => loc.id === locId);
// // // //     if (selectedLoc && user && organization) {
// // // //       console.log(`[Header] Switching location to: ${selectedLoc.name} (${locId})`);
// // // //       setLocation(selectedLoc); // Update current location
// // // //       // Persist this choice
// // // //       setViewPreferences(user.id, 'global', {
// // // //         lastLocationByOrg: {
// // // //           ...(viewPreferences[user.id]?.lastLocationByOrg || {}),
// // // //           [organization.id]: locId,
// // // //         },
// // // //       });
// // // //     }
// // // //   };
// // // //   console.log("oz",organizationOptions,currentLocations);

// // // //   return (
// // // //     <AntHeader className="p-0 bg-[var(--color-background)] border-b border-[var(--color-border)]">
// // // //       <div className="flex justify-between items-center px-4 h-full">
// // // //         <div className="flex items-center gap-2">
// // // //           <Button
// // // //             type="text"
// // // //             icon={<MenuIcon size={24} className="transform translate-y-[3px]" />}
// // // //             onClick={() => (isMobile ? setShowMobileMenu(true) : setCollapsed(!collapsed))}
// // // //             className="hover:text-[var(--color-primary)] flex items-center"
// // // //           />
// // // //           {pageTitle && (
// // // //             <span className="text-lg font-semibold text-[var(--color-text)] flex items-center">
// // // //               {pageTitle}
// // // //             </span>
// // // //           )}
// // // //         </div>
// // // //         <Space size={isMobile?"small":"middle"} className="flex items-center">
// // // //           {/* Organization Select (Show if more than one org or for SassAdmin) */}
// // // //           {!isMobile && organizationOptions.length > 1 && (
// // // //             <Select
// // // //               placeholder={t('common.select_organization')}
// // // //               value={organization?.id}
// // // //               onChange={handleOrganizationChange}
// // // //               loading={loadingOrgLocs}
// // // //               style={{ width: 200 }}
// // // //               options={organizationOptions.map(org => ({
// // // //                 value: org.id,
// // // //                 label: (
// // // //                   <div>
// // // //                     <span style={{ fontWeight: '500' }}>{org?.name}</span>
// // // //                     <br />
// // // //                     <span style={{ fontSize: '0.8em', color: 'var(--color-text-secondary)' }}>{org?.roles?.join(', ')}</span>
// // // //                   </div>
// // // //                 ),
// // // //               }))}
// // // //               disabled={loadingOrgLocs || organizationOptions.length === 0}
// // // //             />
// // // //           )}

// // // //           {/* Location Select */}
// // // //           {!isMobile && currentLocations.length > 1 && (
// // // //             <Select
// // // //               placeholder={t('common.select_location')}
// // // //               value={location?.id}
// // // //               onChange={handleLocationChange}
// // // //               loading={loadingOrgLocs}
// // // //               style={{ width: 200 }}
// // // //               options={currentLocations.map(loc => ({
// // // //                 value: loc.id,
// // // //                 label: loc.name,
// // // //               }))}
// // // //               disabled={loadingOrgLocs || currentLocations.length === 0}
// // // //             />
// // // //           )}

// // // //           {isMobile && config.searchFilters && (
// // // //             <Button
// // // //               type="text"
// // // //               icon={<Search size={24} className="transform translate-y-[3px]" />}
// // // //               onClick={() => setShowSearch(true)}
// // // //               className="hover:text-[var(--color-primary)] flex items-center"
// // // //             />
// // // //           )}
// // // //           <Button
// // // //             type="text"
// // // //             icon={<SettingsIcon size={24} className="transform translate-y-[3px]" />}
// // // //             onClick={() => setShowSettings(true)}
// // // //             className="hover:text-[var(--color-primary)] flex items-center"
// // // //           />
// // // //           <div className="flex items-center">
// // // //             <ProfileMenu isMobile={isMobile}/>
// // // //           </div>
// // // //         </Space>
// // // //       </div>

// // // //       {isMobile && (
// // // //         <Drawer
// // // //           title={t('common.search')}
// // // //           placement="right"
// // // //           onClose={() => setShowSearch(false)}
// // // //           open={showSearch}
// // // //           width={320}
// // // //           className="bg-[var(--color-background)]"
// // // //           styles={{
// // // //             body: {
// // // //               paddingTop: '2px',paddingInline:'15px'
// // // //             }
// // // //         }}
// // // //         >
// // // //           {config.searchFilters}
// // // //         </Drawer>
// // // //       )}
// // // //     </AntHeader>
// // // //   );
// // // // };

// // // import React, { useState, useEffect, useMemo } from 'react';
// // // import { Layout, Button, Space, Drawer, Select, message } from 'antd';
// // // import { Menu as MenuIcon, Search, Settings as SettingsIcon } from 'lucide-react';
// // // import { useQueryClient, useIsFetching } from '@tanstack/react-query';
// // // import { useTranslation } from 'react-i18next';
// // // import { ProfileMenu } from '../ProfileMenu';
// // // import { useAuthedLayoutConfig } from '../AuthedLayoutContext';
// // // import { useAuthStore } from '@/core/lib/store';
// // // import { supabase } from '@/lib/supabase';
// // // import type { Organization, Location } from '@/lib/types';

// // // const { Header: AntHeader } = Layout;

// // // // RPC Response Structure
// // // interface UserOrgLocationData {
// // //   organization_id: string;
// // //   organization_name: string;
// // //   roles: string[];
// // //   locations: {
// // //     location_id: string;
// // //     location_name: string;
// // //   }[];
// // // }

// // // interface HeaderProps {
// // //   collapsed: boolean;
// // //   setCollapsed: (collapsed: boolean) => void;
// // //   isMobile: boolean;
// // //   unreadCount: number;
// // //   setShowNotifications: (show: boolean) => void;
// // //   setShowMobileMenu: (show: boolean) => void;
// // //   setShowSettings: (show: boolean) => void;
// // //   pageTitle?: string;
// // // }

// // // export const Header: React.FC<HeaderProps> = ({
// // //   collapsed,
// // //   setCollapsed,
// // //   isMobile,
// // //   setShowMobileMenu,
// // //   setShowSettings,
// // //   pageTitle,
// // // }) => {
// // //   const { t } = useTranslation();
// // //   const { config } = useAuthedLayoutConfig();

// // //   // Store Access
// // //   const { 
// // //     user, 
// // //     organization, 
// // //     location, 
// // //     setOrganization, 
// // //     setLocation, 
// // //     viewPreferences, 
// // //     setViewPreferences, 
// // //     setIsSwitchingOrg 
// // //   } = useAuthStore();

// // //   const queryClient = useQueryClient();
// // //   const [showSearch, setShowSearch] = useState(false);

// // //   // Local state for the Dropdown Options only
// // //   const [userOrgLocations, setUserOrgLocations] = useState<UserOrgLocationData[]>([]);
// // //   const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

// // //   // --- 1. INITIALIZATION: Fetch Available Options ---
// // //   // We fetch the list of organizations/locations to populate the dropdowns.
// // //   // We do NOT set the active organization here (SessionManager handles the initial active state).
// // //   useEffect(() => {
// // //     const fetchOrgAndLocations = async () => {
// // //       if (!user?.id) return;

// // //       setLoadingOrgLocs(true);
// // //       try {
// // //         const { data, error } = await supabase.schema('identity').rpc('get_my_organizations_v2');

// // //         if (error) {
// // //           console.error('[Header] Error fetching org options:', error);
// // //           return;
// // //         }
// // //         setUserOrgLocations(data as UserOrgLocationData[]);
// // //       } catch (error) {
// // //         console.error('[Header] Unexpected error:', error);
// // //       } finally {
// // //         setLoadingOrgLocs(false);
// // //       }
// // //     };

// // //     if (user?.id) {
// // //       fetchOrgAndLocations();
// // //     }
// // //   }, [user?.id]);

// // //   // --- 2. SWITCHING LOGIC (The Core Fix) ---
// // //   const handleOrganizationChange = async (orgId: string) => {
// // //     const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);

// // //     if (selectedOrgData && user?.id) {
// // //       console.group(`%c[Flow] Organization Switch Initiated`, 'color: #1890ff; font-weight: bold;');
// // //       console.log(`[Flow] Step 1: User selected "${selectedOrgData.organization_name}" (${orgId})`);

// // //       setIsSwitchingOrg(true);
// // //       message.loading({ content: `Switching to ${selectedOrgData.organization_name}...`, key: 'orgSwitch' });

// // //       // A. OPTIMISTIC UPDATE (Zustand)
// // //       // We update the store immediately. The 'useUserSession' hook will read this value next.
// // //       console.log(`[Flow] Step 2: Optimistic Update - Setting Store Organization to ${orgId}`);
// // //       setOrganization({ 
// // //         id: selectedOrgData.organization_id, 
// // //         name: selectedOrgData.organization_name 
// // //       } as Organization);

// // //       // Handle Location (Sticky or Default)
// // //       const newLocations = selectedOrgData.locations;
// // //       let targetLocation: Location | null = null;

// // //       if (newLocations.length > 0) {
// // //         const stickyLocationId = viewPreferences[user.id]?.lastLocationByOrg?.[orgId];
// // //         const stickyLocation = newLocations.find(l => l.location_id === stickyLocationId);

// // //         const locData = stickyLocation || newLocations[0];
// // //         targetLocation = { id: locData.location_id, name: locData.location_name } as Location;
// // //       }

// // //       setLocation(targetLocation);
// // //       console.log(`[Flow] Step 2b: Set Location to ${targetLocation?.name || 'None'}`);

// // //       try {
// // //         // B. PERSISTENCE (Database)
// // //         // Update the "Last Accessed" org in the DB so the next login remembers this choice.
// // //         console.log(`[Flow] Step 3: Persisting choice via RPC (set_preferred_organization)`);
// // //         const { error: rpcError } = await supabase.schema('identity').rpc('set_preferred_organization', {
// // //           new_org_id: orgId,
// // //         });

// // //         if (rpcError) throw rpcError;

// // //         // C. INVALIDATION (Trigger Refetch)
// // //         // This causes 'useUserSession' to run. It will see the new ID in the Store and fetch the correct permissions.
// // //         console.log(`[Flow] Step 4: Invalidating 'user-session' query to trigger fetch...`);
// // //         await queryClient.invalidateQueries({ queryKey: ['user-session'] });

// // //         message.success({ content: `Switched to ${selectedOrgData.organization_name}`, key: 'orgSwitch', duration: 2 });

// // //       } catch (error) {
// // //         console.error("[Flow] Switch Failed:", error);
// // //         message.error({ content: 'Failed to switch organization.', key: 'orgSwitch', duration: 2 });
// // //         setIsSwitchingOrg(false);
// // //       } finally {
// // //         console.groupEnd();
// // //       }
// // //     }
// // //   };

// // //   const handleLocationChange = (locId: string) => {
// // //     if (!organization?.id) return;

// // //     // Find the location name from our local list
// // //     const currentOrgLocs = userOrgLocations.find(o => o.organization_id === organization.id)?.locations || [];
// // //     const selectedLoc = currentOrgLocs.find(loc => loc.location_id === locId);

// // //     if (selectedLoc && user) {
// // //       console.log(`[Header] Switching location to: ${selectedLoc.location_name}`);

// // //       // 1. Update Store
// // //       setLocation({ id: selectedLoc.location_id, name: selectedLoc.location_name } as Location);

// // //       // 2. Persist Preference (Local View Prefs)
// // //       setViewPreferences(user.id, 'global', {
// // //         lastLocationByOrg: {
// // //           ...(viewPreferences[user.id]?.lastLocationByOrg || {}),
// // //           [organization.id]: locId,
// // //         },
// // //       });
// // //     }
// // //   };

// // //   // --- Render Helpers ---
// // //   const organizationOptions = useMemo(() => {
// // //     return userOrgLocations.map(org => ({
// // //       value: org.organization_id,
// // //       label: (
// // //         <div>
// // //           <span style={{ fontWeight: '500' }}>{org.organization_name}</span>
// // //           <br />
// // //           <span style={{ fontSize: '0.8em', color: 'var(--color-text-secondary)' }}>{org.roles?.join(', ')}</span>
// // //         </div>
// // //       ),
// // //     }));
// // //   }, [userOrgLocations]);

// // //   const currentLocations = useMemo(() => {
// // //     if (!organization?.id) return [];
// // //     const orgData = userOrgLocations.find(org => org.organization_id === organization.id);
// // //     return orgData?.locations.map(loc => ({
// // //       value: loc.location_id,
// // //       label: loc.location_name,
// // //     })) || [];
// // //   }, [organization?.id, userOrgLocations]);

// // //   // Clear loading state when React Query finishes
// // //   const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;
// // //   useEffect(() => {
// // //     if (!isFetchingSession) {
// // //       setIsSwitchingOrg(false);
// // //     }
// // //   }, [isFetchingSession, setIsSwitchingOrg]);

// // //   return (
// // //     <AntHeader className="p-0 bg-[var(--color-background)] border-b border-[var(--color-border)]">
// // //       <div className="flex justify-between items-center px-4 h-full">
// // //         <div className="flex items-center gap-2">
// // //           <Button
// // //             type="text"
// // //             icon={<MenuIcon size={24} className="transform translate-y-[3px]" />}
// // //             onClick={() => (isMobile ? setShowMobileMenu(true) : setCollapsed(!collapsed))}
// // //             className="hover:text-[var(--color-primary)] flex items-center"
// // //           />
// // //           {pageTitle && (
// // //             <span className="text-lg font-semibold text-[var(--color-text)] flex items-center">
// // //               {pageTitle}
// // //             </span>
// // //           )}
// // //         </div>
// // //         <Space size={isMobile ? "small" : "middle"} className="flex items-center">

// // //           {/* Organization Select */}
// // //           {!isMobile && organizationOptions.length > 1 && (
// // //             <Select
// // //               placeholder={t('common.select_organization')}
// // //               value={organization?.id}
// // //               onChange={handleOrganizationChange}
// // //               loading={loadingOrgLocs}
// // //               style={{ width: 200 }}
// // //               options={organizationOptions}
// // //               disabled={loadingOrgLocs || organizationOptions.length === 0}
// // //             />
// // //           )}

// // //           {/* Location Select */}
// // //           {!isMobile && currentLocations.length > 1 && (
// // //             <Select
// // //               placeholder={t('common.select_location')}
// // //               value={location?.id}
// // //               onChange={handleLocationChange}
// // //               loading={loadingOrgLocs}
// // //               style={{ width: 200 }}
// // //               options={currentLocations}
// // //               disabled={loadingOrgLocs || currentLocations.length === 0}
// // //             />
// // //           )}

// // //           {isMobile && config.searchFilters && (
// // //             <Button
// // //               type="text"
// // //               icon={<Search size={24} className="transform translate-y-[3px]" />}
// // //               onClick={() => setShowSearch(true)}
// // //               className="hover:text-[var(--color-primary)] flex items-center"
// // //             />
// // //           )}
// // //           <Button
// // //             type="text"
// // //             icon={<SettingsIcon size={24} className="transform translate-y-[3px]" />}
// // //             onClick={() => setShowSettings(true)}
// // //             className="hover:text-[var(--color-primary)] flex items-center"
// // //           />
// // //           <div className="flex items-center">
// // //             <ProfileMenu isMobile={isMobile}/>
// // //           </div>
// // //         </Space>
// // //       </div>

// // //       {isMobile && (
// // //         <Drawer
// // //           title={t('common.search')}
// // //           placement="right"
// // //           onClose={() => setShowSearch(false)}
// // //           open={showSearch}
// // //           width={320}
// // //           className="bg-[var(--color-background)]"
// // //           styles={{ body: { paddingTop: '2px', paddingInline: '15px' } }}
// // //         >
// // //           {config.searchFilters}
// // //         </Drawer>
// // //       )}
// // //     </AntHeader>
// // //   );
// // // };


// // // corrected for users with multi org and rpc to set pref org on header change correctly 
// // import React, { useState, useEffect, useMemo } from 'react';
// // import { Layout, Button, Space, Drawer, Select, message } from 'antd';
// // import { Menu as MenuIcon, Search, Settings as SettingsIcon } from 'lucide-react';
// // import { useQueryClient, useIsFetching } from '@tanstack/react-query';
// // import { useTranslation } from 'react-i18next';
// // import { ProfileMenu } from '../ProfileMenu';
// // import { useAuthedLayoutConfig } from '../AuthedLayoutContext';
// // import { useAuthStore } from '@/core/lib/store';
// // import { supabase } from '@/lib/supabase';
// // import type { Organization, Location } from '@/lib/types';

// // const { Header: AntHeader } = Layout;

// // // RPC Response Structure
// // interface UserOrgLocationData {
// //   organization_id: string;
// //   organization_name: string;
// //   roles: string[];
// //   locations: {
// //     location_id: string;
// //     location_name: string;
// //   }[];
// // }

// // interface HeaderProps {
// //   collapsed: boolean;
// //   setCollapsed: (collapsed: boolean) => void;
// //   isMobile: boolean;
// //   unreadCount: number;
// //   setShowNotifications: (show: boolean) => void;
// //   setShowMobileMenu: (show: boolean) => void;
// //   setShowSettings: (show: boolean) => void;
// //   pageTitle?: string;
// // }

// // export const Header: React.FC<HeaderProps> = ({
// //   collapsed,
// //   setCollapsed,
// //   isMobile,
// //   setShowMobileMenu,
// //   setShowSettings,
// //   pageTitle,
// // }) => {
// //   const { t } = useTranslation();
// //   const { config } = useAuthedLayoutConfig();

// //   // Store Access
// //   const { 
// //     user, 
// //     organization, 
// //     location, 
// //     setOrganization, 
// //     setLocation, 
// //     viewPreferences, 
// //     setViewPreferences, 
// //     setIsSwitchingOrg 
// //   } = useAuthStore();

// //   const queryClient = useQueryClient();
// //   const [showSearch, setShowSearch] = useState(false);

// //   // Local state for the Dropdown Options only
// //   const [userOrgLocations, setUserOrgLocations] = useState<UserOrgLocationData[]>([]);
// //   const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

// //   // --- 1. INITIALIZATION: Fetch Available Options ---
// //   useEffect(() => {
// //     const fetchOrgAndLocations = async () => {
// //       if (!user?.id) return;

// //       setLoadingOrgLocs(true);
// //       try {
// //         const { data, error } = await supabase.schema('identity').rpc('get_my_organizations_v2');

// //         if (error) {
// //           console.error('[Header] Error fetching org options:', error);
// //           return;
// //         }
// //         setUserOrgLocations(data as UserOrgLocationData[]);
// //       } catch (error) {
// //         console.error('[Header] Unexpected error:', error);
// //       } finally {
// //         setLoadingOrgLocs(false);
// //       }
// //     };

// //     if (user?.id) {
// //       fetchOrgAndLocations();
// //     }
// //   }, [user?.id]);

// //   // --- 2. SWITCHING LOGIC (The Resilient Fix) ---
// //   const handleOrganizationChange = async (orgId: string) => {
// //     const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);

// //     if (selectedOrgData && user?.id) {
// //       console.group(`%c[Flow] Organization Switch Initiated`, 'color: #1890ff; font-weight: bold;');

// //       setIsSwitchingOrg(true);
// //       message.loading({ content: `Switching to ${selectedOrgData.organization_name}...`, key: 'orgSwitch' });

// //       // ---------------------------------------------------------
// //       // STEP 1: OPTIMISTIC UPDATE (Critical for UI Responsiveness)
// //       // ---------------------------------------------------------
// //       console.log(`[Flow] Step 1: Optimistic Update - Setting Store to ${orgId}`);
// //       setOrganization({ 
// //         id: selectedOrgData.organization_id, 
// //         name: selectedOrgData.organization_name 
// //       } as Organization);

// //       // Handle Location Logic
// //       const newLocations = selectedOrgData.locations;
// //       let targetLocation: Location | null = null;
// //       if (newLocations.length > 0) {
// //         const stickyLocationId = viewPreferences[user.id]?.lastLocationByOrg?.[orgId];
// //         const stickyLocation = newLocations.find(l => l.location_id === stickyLocationId);
// //         const locData = stickyLocation || newLocations[0];
// //         targetLocation = { id: locData.location_id, name: locData.location_name } as Location;
// //       }
// //       setLocation(targetLocation);

// //       // ---------------------------------------------------------
// //       // STEP 2: PERSISTENCE (Non-Blocking / "Best Effort")
// //       // ---------------------------------------------------------
// //       // Wrapped in its own try/catch so failures here DO NOT stop the session refresh.
// //       try {
// //         console.log(`[Flow] Step 2: Attempting to persist preference to DB...`);
// //         const { error: rpcError } = await supabase.schema('identity').rpc('set_preferred_organization', {
// //           new_org_id: orgId,
// //         });

// //         if (rpcError) {
// //             console.warn("[Flow] Non-Critical Warning: Failed to save preference to DB.", rpcError);
// //         } else {
// //             console.log("[Flow] Step 2: Preference saved successfully.");
// //         }
// //       } catch (err) {
// //         console.warn("[Flow] Non-Critical Warning: RPC Network Error.", err);
// //       }

// //       // ---------------------------------------------------------
// //       // STEP 3: DATA REFRESH (Critical for Permissions/Nav)
// //       // ---------------------------------------------------------
// //       // This MUST run, even if Step 2 failed.
// //       try {
// //         console.log(`[Flow] Step 3: Invalidating 'user-session' to trigger permission fetch...`);
// //         await queryClient.invalidateQueries({ queryKey: ['user-session'] });

// //         message.success({ content: `Switched to ${selectedOrgData.organization_name}`, key: 'orgSwitch', duration: 2 });
// //       } catch (error) {
// //         console.error("[Flow] Critical Error: Failed to refresh session.", error);
// //         message.error({ content: 'Failed to load organization data.', key: 'orgSwitch' });
// //       } finally {
// //         setIsSwitchingOrg(false);
// //         console.groupEnd();
// //       }
// //     }
// //   };

// //   const handleLocationChange = (locId: string) => {
// //     if (!organization?.id) return;

// //     const currentOrgLocs = userOrgLocations.find(o => o.organization_id === organization.id)?.locations || [];
// //     const selectedLoc = currentOrgLocs.find(loc => loc.location_id === locId);

// //     if (selectedLoc && user) {
// //       console.log(`[Header] Switching location to: ${selectedLoc.location_name}`);
// //       setLocation({ id: selectedLoc.location_id, name: selectedLoc.location_name } as Location);
// //       setViewPreferences(user.id, 'global', {
// //         lastLocationByOrg: {
// //           ...(viewPreferences[user.id]?.lastLocationByOrg || {}),
// //           [organization.id]: locId,
// //         },
// //       });
// //     }
// //   };

// //   // --- Render Helpers ---
// //   const organizationOptions = useMemo(() => {
// //     return userOrgLocations.map(org => ({
// //       value: org.organization_id,
// //       label: (
// //         <div>
// //           <span style={{ fontWeight: '500' }}>{org.organization_name}</span>
// //           <br />
// //           <span style={{ fontSize: '0.8em', color: 'var(--color-text-secondary)' }}>{org.roles?.join(', ')}</span>
// //         </div>
// //       ),
// //     }));
// //   }, [userOrgLocations]);

// //   const currentLocations = useMemo(() => {
// //     if (!organization?.id) return [];
// //     const orgData = userOrgLocations.find(org => org.organization_id === organization.id);
// //     return orgData?.locations.map(loc => ({
// //       value: loc.location_id,
// //       label: loc.location_name,
// //     })) || [];
// //   }, [organization?.id, userOrgLocations]);

// //   const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;
// //   useEffect(() => {
// //     if (!isFetchingSession) {
// //       setIsSwitchingOrg(false);
// //     }
// //   }, [isFetchingSession, setIsSwitchingOrg]);

// //   return (
// //     <AntHeader className="p-0 bg-[var(--color-background)] border-b border-[var(--color-border)]">
// //       <div className="flex justify-between items-center px-4 h-full">
// //         <div className="flex items-center gap-2">
// //           <Button
// //             type="text"
// //             icon={<MenuIcon size={24} className="transform translate-y-[3px]" />}
// //             onClick={() => (isMobile ? setShowMobileMenu(true) : setCollapsed(!collapsed))}
// //             className="hover:text-[var(--color-primary)] flex items-center"
// //           />
// //           {pageTitle && (
// //             <span className="text-lg font-semibold text-[var(--color-text)] flex items-center">
// //               {pageTitle}
// //             </span>
// //           )}
// //         </div>
// //         <Space size={isMobile ? "small" : "middle"} className="flex items-center">

// //           {!isMobile && organizationOptions.length > 1 && (
// //             <Select
// //               placeholder={t('common.select_organization')}
// //               value={organization?.id}
// //               onChange={handleOrganizationChange}
// //               loading={loadingOrgLocs}
// //               style={{ width: 200 }}
// //               options={organizationOptions}
// //               disabled={loadingOrgLocs || organizationOptions.length === 0}
// //             />
// //           )}

// //           {!isMobile && currentLocations.length > 1 && (
// //             <Select
// //               placeholder={t('common.select_location')}
// //               value={location?.id}
// //               onChange={handleLocationChange}
// //               loading={loadingOrgLocs}
// //               style={{ width: 200 }}
// //               options={currentLocations}
// //               disabled={loadingOrgLocs || currentLocations.length === 0}
// //             />
// //           )}

// //           {isMobile && config.searchFilters && (
// //             <Button
// //               type="text"
// //               icon={<Search size={24} className="transform translate-y-[3px]" />}
// //               onClick={() => setShowSearch(true)}
// //               className="hover:text-[var(--color-primary)] flex items-center"
// //             />
// //           )}
// //           <Button
// //             type="text"
// //             icon={<SettingsIcon size={24} className="transform translate-y-[3px]" />}
// //             onClick={() => setShowSettings(true)}
// //             className="hover:text-[var(--color-primary)] flex items-center"
// //           />
// //           <div className="flex items-center">
// //             <ProfileMenu isMobile={isMobile}/>
// //           </div>
// //         </Space>
// //       </div>

// //       {isMobile && (
// //         <Drawer
// //           title={t('common.search')}
// //           placement="right"
// //           onClose={() => setShowSearch(false)}
// //           open={showSearch}
// //           width={320}
// //           className="bg-[var(--color-background)]"
// //           styles={{ body: { paddingTop: '2px', paddingInline: '15px' } }}
// //         >
// //           {config.searchFilters}
// //         </Drawer>
// //       )}
// //     </AntHeader>
// //   );
// // };



// // without stale data

// import React, { useState, useEffect, useMemo } from 'react';
// import { Layout, Button, Space, Drawer, Select, message } from 'antd';
// import { Menu as MenuIcon, Search, Settings as SettingsIcon } from 'lucide-react';
// import { useQueryClient, useIsFetching } from '@tanstack/react-query';
// import { useTranslation } from 'react-i18next';
// import { ProfileMenu } from '../ProfileMenu';
// import { useAuthedLayoutConfig } from '../AuthedLayoutContext';
// import { useAuthStore } from '@/core/lib/store';
// import { supabase } from '@/lib/supabase';
// import type { Organization, Location } from '@/lib/types';

// const { Header: AntHeader } = Layout;

// interface UserOrgLocationData {
//   organization_id: string;
//   organization_name: string;
//   roles: string[];
//   locations: { location_id: string; location_name: string; }[];
// }

// interface HeaderProps {
//   collapsed: boolean;
//   setCollapsed: (collapsed: boolean) => void;
//   isMobile: boolean;
//   unreadCount: number;
//   setShowNotifications: (show: boolean) => void;
//   setShowMobileMenu: (show: boolean) => void;
//   setShowSettings: (show: boolean) => void;
//   pageTitle?: string;
// }

// export const Header: React.FC<HeaderProps> = ({
//   collapsed,
//   setCollapsed,
//   isMobile,
//   setShowMobileMenu,
//   setShowSettings,
//   pageTitle,
// }) => {
//   const { t } = useTranslation();
//   const { config } = useAuthedLayoutConfig();

//   const { 
//     user, 
//     organization, 
//     location, 
//     setOrganization, 
//     setLocation, 
//     viewPreferences, 
//     setViewPreferences, 
//     setIsSwitchingOrg 
//   } = useAuthStore();

//   const queryClient = useQueryClient();
//   const [showSearch, setShowSearch] = useState(false);
//   const [userOrgLocations, setUserOrgLocations] = useState<UserOrgLocationData[]>([]);
//   const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

//   useEffect(() => {
//     const fetchOrgAndLocations = async () => {
//       if (!user?.id) return;
//       setLoadingOrgLocs(true);
//       try {
//         const { data, error } = await supabase.schema('identity').rpc('get_my_organizations_v2');
//         if (error) { console.error('[Header] Error:', error); return; }
//         setUserOrgLocations(data as UserOrgLocationData[]);
//       } catch (error) {
//         console.error('[Header] Error:', error);
//       } finally {
//         setLoadingOrgLocs(false);
//       }
//     };
//     if (user?.id) fetchOrgAndLocations();
//   }, [user?.id]);

//   const handleOrganizationChange = async (orgId: string) => {
//     const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);

//     if (selectedOrgData && user?.id) {
//       console.group(`%c[Flow] Organization Switch Initiated`, 'color: #1890ff; font-weight: bold;');

//       setIsSwitchingOrg(true);
//       message.loading({ content: `Switching to ${selectedOrgData.organization_name}...`, key: 'orgSwitch' });

//       // STEP 1: OPTIMISTIC UPDATE
//       console.log(`[Flow] Step 1: Optimistic Update -> ${orgId}`);
//       setOrganization({ 
//         id: selectedOrgData.organization_id, 
//         name: selectedOrgData.organization_name 
//       } as Organization);

//       // Location Logic
//       const newLocations = selectedOrgData.locations;
//       let targetLocation: Location | null = null;
//       if (newLocations.length > 0) {
//         const stickyLocationId = viewPreferences[user.id]?.lastLocationByOrg?.[orgId];
//         const stickyLoc = newLocations.find(l => l.location_id === stickyLocationId);
//         const locData = stickyLoc || newLocations[0];
//         targetLocation = { id: locData.location_id, name: locData.location_name } as Location;
//       }
//       setLocation(targetLocation);

//       // STEP 2: PERSISTENCE (Non-Blocking)
//       try {
//         console.log(`[Flow] Step 2: Persisting preference...`);
//         await supabase.schema('identity').rpc('set_preferred_organization', { new_org_id: orgId });
//       } catch (err) {
//         console.warn("[Flow] Persistence warning (non-critical):", err);
//       }

//       // STEP 3: DATA REFRESH
//       try {
//         console.log(`[Flow] Step 3: Resetting Query to force clean fetch...`);
//         // USE RESET INSTEAD OF INVALIDATE
//         // This clears the old "zoworks" cache so it doesn't flash back
//         await queryClient.resetQueries({ queryKey: ['user-session'] });

//         message.success({ content: `Switched to ${selectedOrgData.organization_name}`, key: 'orgSwitch', duration: 2 });
//       } catch (error) {
//         console.error("[Flow] Critical Error:", error);
//         message.error({ content: 'Failed to load data.', key: 'orgSwitch' });
//       } finally {
//         // NOTE: This runs AFTER the query has started refetching
//         setIsSwitchingOrg(false);
//         console.groupEnd();
//       }
//     }
//   };

//   const handleLocationChange = (locId: string) => {
//     if (!organization?.id) return;
//     const currentOrgLocs = userOrgLocations.find(o => o.organization_id === organization.id)?.locations || [];
//     const selectedLoc = currentOrgLocs.find(loc => loc.location_id === locId);

//     if (selectedLoc && user) {
//       setLocation({ id: selectedLoc.location_id, name: selectedLoc.location_name } as Location);
//       setViewPreferences(user.id, 'global', {
//         lastLocationByOrg: { ...(viewPreferences[user.id]?.lastLocationByOrg || {}), [organization.id]: locId },
//       });
//     }
//   };

//   // Helpers
//   const organizationOptions = useMemo(() => userOrgLocations.map(org => ({
//       value: org.organization_id,
//       label: (<div><span className='font-medium'>{org.organization_name}</span><br/><span className='text-xs text-gray-500'>{org.roles?.join(', ')}</span></div>)
//   })), [userOrgLocations]);

//   const currentLocations = useMemo(() => {
//     if (!organization?.id) return [];
//     return userOrgLocations.find(o => o.organization_id === organization.id)?.locations.map(l => ({
//       value: l.location_id,
//       label: l.location_name,
//     })) || [];
//   }, [organization?.id, userOrgLocations]);

//   const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;
//   useEffect(() => {
//     if (!isFetchingSession) setIsSwitchingOrg(false);
//   }, [isFetchingSession, setIsSwitchingOrg]);

//   return (
//     <AntHeader className="p-0 bg-[var(--color-background)] border-b border-[var(--color-border)]">
//       <div className="flex justify-between items-center px-4 h-full">
//         <div className="flex items-center gap-2">
//           <Button type="text" icon={<MenuIcon size={24} />} onClick={() => (isMobile ? setShowMobileMenu(true) : setCollapsed(!collapsed))} />
//           {pageTitle && <span className="text-lg font-semibold">{pageTitle}</span>}
//         </div>
//         <Space size={isMobile ? "small" : "middle"}>
//           {!isMobile && organizationOptions.length > 1 && (
//             <Select placeholder={t('common.select_organization')} value={organization?.id} onChange={handleOrganizationChange} loading={loadingOrgLocs} style={{ width: 200 }} options={organizationOptions} disabled={loadingOrgLocs} />
//           )}
//           {!isMobile && currentLocations.length > 1 && (
//             <Select placeholder={t('common.select_location')} value={location?.id} onChange={handleLocationChange} loading={loadingOrgLocs} style={{ width: 200 }} options={currentLocations} disabled={loadingOrgLocs} />
//           )}
//           {isMobile && config.searchFilters && <Button type="text" icon={<Search size={24} />} onClick={() => setShowSearch(true)} />}
//           <Button type="text" icon={<SettingsIcon size={24} />} onClick={() => setShowSettings(true)} />
//           <ProfileMenu isMobile={isMobile}/>
//         </Space>
//       </div>
//       {isMobile && <Drawer title={t('common.search')} onClose={() => setShowSearch(false)} open={showSearch} width={320}>{config.searchFilters}</Drawer>}
//     </AntHeader>
//   );
// };


// THE REACTIVE LOGIC + reset supabase auth metadata for next ogin
import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Button, Space, Drawer, Select, message } from 'antd';
import { Menu as MenuIcon, Search, Settings as SettingsIcon } from 'lucide-react';
import { useIsFetching } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ProfileMenu } from '../ProfileMenu';
import { useAuthedLayoutConfig } from '../AuthedLayoutContext';
import { useAuthStore } from '@/core/lib/store';
import { supabase } from '@/lib/supabase';
import type { Organization, Location } from '@/lib/types';

const { Header: AntHeader } = Layout;

interface UserOrgLocationData {
  organization_id: string;
  organization_name: string;
  roles: string[];
  locations: { location_id: string; location_name: string; }[];
  default_location_id: string | null;
  default_location_name: string | null;
}

interface HeaderProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  unreadCount: number;
  setShowNotifications: (show: boolean) => void;
  setShowMobileMenu: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  collapsed,
  setCollapsed,
  isMobile,
  setShowMobileMenu,
  setShowSettings,
  pageTitle,
}) => {
  const { t } = useTranslation();
  const { config } = useAuthedLayoutConfig();
  const navigate = useNavigate();

  const {
    user,
    organization,
    location,
    setOrganization,
    setLocation,
    viewPreferences,
    setViewPreferences,
    setIsSwitchingOrg
  } = useAuthStore();

  const [showSearch, setShowSearch] = useState(false);
  const [userOrgLocations, setUserOrgLocations] = useState<UserOrgLocationData[]>([]);
  const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

  // 1. Fetch Options
  useEffect(() => {
    const fetchOrgAndLocations = async () => {
      if (!user?.id) return;
      setLoadingOrgLocs(true);
      try {
        const { data, error } = await supabase.schema('identity').rpc('get_my_organizations');
        if (error) throw error;
        setUserOrgLocations(data as UserOrgLocationData[]);
      } catch (error) {
        console.error('[Header] Error:', error);
      } finally {
        setLoadingOrgLocs(false);
      }
    };
    if (user?.id) fetchOrgAndLocations();
  }, [user?.id]);

  // 1b. Set default location if no location is selected
  useEffect(() => {
    if (!location?.id && organization?.id && userOrgLocations.length > 0) {
      const currentOrgData = userOrgLocations.find(o => o.organization_id === organization.id);
      if (currentOrgData?.default_location_id) {
        console.log(`[Header] No location selected. Setting default location: ${currentOrgData.default_location_name} (${currentOrgData.default_location_id})`);
        setLocation({
          id: currentOrgData.default_location_id,
          name: currentOrgData.default_location_name || 'Default'
        } as Location);
      }
    }
  }, [location?.id, organization?.id, userOrgLocations, setLocation]);

  // 2. Switching Logic (Reactive)
  const handleOrganizationChange = async (orgId: string) => {
    const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);

    if (selectedOrgData && user?.id) {
      console.group(`%c[Flow] Switch to ${selectedOrgData.organization_name}`, 'color: #1890ff');

      setIsSwitchingOrg(true);

      try {
        // STEP 1: UPDATE STORE
        // Triggers SessionManager -> useUserSession(key=['user-session', newID])
        setOrganization({
          id: selectedOrgData.organization_id,
          name: selectedOrgData.organization_name
        } as Organization);

        // STEP 2: RESET ROUTE
        navigate('/dashboard');

        // Handle Location
        const newLocations = selectedOrgData.locations;
        let targetLocation: Location | null = null;
        if (newLocations.length > 0) {
          const stickyId = viewPreferences[user.id]?.lastLocationByOrg?.[orgId];
          const stickyLoc = newLocations.find(l => l.location_id === stickyId);
          const locData = stickyLoc || newLocations[0];
          targetLocation = { id: locData.location_id, name: locData.location_name } as Location;
        }
        setLocation(targetLocation);

        // STEP 3: PERSISTENCE (Database + Auth Metadata)
        const { error: rpcError } = await supabase.schema('identity').rpc('set_preferred_organization', { new_org_id: orgId });
        if (rpcError) console.warn("[Flow] RPC warning:", rpcError);

        const { error: authError } = await supabase.auth.updateUser({
          data: { org_id: orgId }
        });
        if (authError) console.warn("[Flow] Auth update warning:", authError);

        console.log("[Flow] Preference synced to DB and Auth Metadata.");
      } catch (err) {
        console.error("[Flow] Organization switch error:", err);
      } finally {
        // ALWAYS clear the switching state
        setIsSwitchingOrg(false);
        console.groupEnd();
      }
    }
  };

  const handleLocationChange = (locId: string) => {
    if (!organization?.id) return;
    const currentOrgLocs = userOrgLocations.find(o => o.organization_id === organization.id)?.locations || [];
    const selectedLoc = currentOrgLocs.find(loc => loc.location_id === locId);

    if (selectedLoc && user) {
      setLocation({ id: selectedLoc.location_id, name: selectedLoc.location_name } as Location);
      setViewPreferences(user.id, 'global', {
        lastLocationByOrg: { ...(viewPreferences[user.id]?.lastLocationByOrg || {}), [organization.id]: locId },
      });
    }
  };

  // Helpers
  const organizationOptions = useMemo(() => userOrgLocations.map(org => ({
    value: org.organization_id,
    label: (<div><span className='font-medium'>{org.organization_name}</span><br /><span className='text-xs text-gray-500'>{org.roles?.join(', ')}</span></div>)
  })), [userOrgLocations]);

  const currentLocations = useMemo(() => {
    if (!organization?.id) return [];
    return userOrgLocations.find(o => o.organization_id === organization.id)?.locations.map(l => ({
      value: l.location_id,
      label: l.location_name,
    })) || [];
  }, [organization?.id, userOrgLocations]);

  const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;
  useEffect(() => {
    if (!isFetchingSession) setIsSwitchingOrg(false);
  }, [isFetchingSession, setIsSwitchingOrg]);

  return (
    <AntHeader className="p-0 bg-[var(--color-background)] border-b border-[var(--color-border)]">
      <div className="flex justify-between items-center px-4 h-full overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <Button type="text" icon={<MenuIcon size={24} />} onClick={() => (isMobile ? setShowMobileMenu(true) : setCollapsed(!collapsed))} />
          {pageTitle && <span className="text-lg font-semibold whitespace-nowrap">{pageTitle}</span>}
        </div>

        {/* Right Side Actions */}
        <Space size={isMobile ? "small" : "middle"} className="ml-auto">

          {/* Organization Select - VISIBLE ON MOBILE NOW */}
          {organizationOptions.length > 1 && (
            <Select
              placeholder={t('common.select_organization')}
              value={organization?.id}
              onChange={handleOrganizationChange}
              loading={loadingOrgLocs}
              style={{ width: isMobile ? 140 : 200 }} // Responsive Width
              options={organizationOptions}
              disabled={loadingOrgLocs}
            />
          )}

          {/* Location Select - VISIBLE ON MOBILE NOW */}
          {currentLocations.length > 1 && (
            <Select
              placeholder={t('common.select_location')}
              value={location?.id}
              onChange={handleLocationChange}
              loading={loadingOrgLocs}
              style={{ width: isMobile ? 140 : 200 }} // Responsive Width
              options={currentLocations}
              disabled={loadingOrgLocs}
            />
          )}

          {isMobile && config.searchFilters && <Button type="text" icon={<Search size={24} />} onClick={() => setShowSearch(true)} />}
          {!isMobile && <Button type="text" icon={<SettingsIcon size={24} />} onClick={() => setShowSettings(true)} />}
          <ProfileMenu isMobile={isMobile} />
        </Space>
      </div>
      {isMobile && <Drawer title={t('common.search')} onClose={() => setShowSearch(false)} open={showSearch} width={320}>{config.searchFilters}</Drawer>}
    </AntHeader>
  );
};