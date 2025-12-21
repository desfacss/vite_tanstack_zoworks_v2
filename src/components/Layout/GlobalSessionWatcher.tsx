// src/components/Layout/GlobalSessionWatcher.tsx
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore, UserSessionData } from '@/lib/store';

/**
 * @component GlobalSessionWatcher
 * @description A headless component that listens to real-time database changes to keep the user session up-to-date.
 *
 * @returns {null} This component does not render any UI.
 *
 * @details
 * This component subscribes to Supabase's real-time Postgres Changes channels for security-sensitive tables like `user_roles` and `organization_users`.
 * - **Granular Updates**: For changes that can be handled granularly (e.g., role updates), it fetches only the necessary data and merges it into the existing TanStack Query cache using `setQueryData`. This provides a near-instant update to the UI without a full session refetch.
 * - **Full Invalidation**: For more fundamental changes (e.g., organization membership), it invalidates the entire `user-session` query to trigger a complete and safe refetch of all session data.
 * This ensures that the user's permissions and data access rights are always current without requiring a page refresh.
 */
export const GlobalSessionWatcher = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!user?.user) {
      return; // Do not subscribe if there is no user.
    }

    console.log('>>> [GlobalSessionWatcher] Subscribing to real-time channels...');

    // Channel for user role changes
    const userRolesChannel = supabase
      .channel('public:user_roles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${user.user_id}` },
        async (payload) => {
          console.log('>>> [GlobalSessionWatcher] Change detected in user_roles:', payload);

          // --- Granular Update Logic ---
          const previousSession = queryClient.getQueryData<UserSessionData>(['user-session']);
          if (!previousSession) {
            queryClient.invalidateQueries({ queryKey: ['user-session'] });
            return;
          }

          try {
            // Refetch only the list of roles for the current user.
            // This assumes a `user_roles` table with a foreign key to a `roles` table.
            const { data: newRolesData, error } = await supabase
              .from('user_roles')
              .select('roles(id, name)') // Adjust based on your table/column names
              .eq('user_id', user.user_id);

            if (error) throw error;

            // The query returns data in the shape: [{ roles: { id, name } }, ...]
            // We need to flatten it to: [{ id, name }, ...]
            const newRoles = newRolesData?.map(item => item.roles) || [];

            // Create an updated session object by merging the new roles.
            const updatedSession: UserSessionData = {
              ...previousSession,
              roles: newRoles,
            };

            // Directly update the TanStack Query cache.
            queryClient.setQueryData(['user-session'], updatedSession);
            console.log('>>> [GlobalSessionWatcher] Merged new roles into session cache.');

          } catch (error) {
            console.error('>>> [GlobalSessionWatcher] Error fetching new roles, falling back to full invalidation.', error);
            queryClient.invalidateQueries({ queryKey: ['user-session'] });
          }
        }
      )
      .subscribe();
      
    // Channel for organization membership changes
    const organizationUsersChannel = supabase
      .channel('public:organization_users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organization_users', filter: `user_id=eq.${user.user_id}` },
        (payload) => {
          console.log('>>> [GlobalSessionWatcher] Change detected in organization_users:', payload);
          // A change in organization is fundamental and can affect many aspects of the session.
          // A full invalidation is the safest way to ensure data consistency.
          queryClient.invalidateQueries({ queryKey: ['user-session'] });
        }
      )
      .subscribe();

    // Cleanup function to remove subscriptions when the component unmounts or the user changes.
    return () => {
      console.log('>>> [GlobalSessionWatcher] Unsubscribing from real-time channels.');
      supabase.removeChannel(userRolesChannel);
      supabase.removeChannel(organizationUsersChannel);
    };
  }, [user, queryClient]);

  return null; // This is a headless component.
};