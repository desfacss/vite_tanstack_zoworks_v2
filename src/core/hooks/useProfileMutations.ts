// src/core/hooks/useProfileMutations.ts
/**
 * @hook useProfileMutations
 * @description Mutations for updating user profile data (roles, teams, locations)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { message } from 'antd';

interface UpdateRolesParams {
  roleIds: string[];
  teamId: string; // Default team for role assignment
}

interface UpdateTeamsParams {
  teamIds: string[];
}

interface UpdateLocationsParams {
  locationId: string; // Primary location
}

/**
 * Get the organization_user_id for current user
 */
const getOrgUserId = async (userId: string, orgId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .schema('identity')
    .from('organization_users')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();

  if (error || !data) return null;
  return data.id;
};

/**
 * Hook to update user roles
 */
export const useUpdateRoles = () => {
  const queryClient = useQueryClient();
  const { user, organization } = useAuthStore();

  return useMutation({
    mutationFn: async ({ roleIds, teamId }: UpdateRolesParams) => {
      if (!user?.id || !organization?.id) {
        throw new Error('User or organization not available');
      }

      const orgUserId = await getOrgUserId(user.id, organization.id);
      if (!orgUserId) throw new Error('Organization user record not found');

      // 1. Delete existing role assignments for this user
      const { error: deleteError } = await supabase
        .schema('identity')
        .from('user_roles')
        .delete()
        .eq('organization_user_id', orgUserId);

      if (deleteError) throw new Error(`Failed to remove existing roles: ${deleteError.message}`);

      // 2. Insert new role assignments
      if (roleIds.length > 0) {
        const roleAssignments = roleIds.map(roleId => ({
          organization_user_id: orgUserId,
          organization_id: organization.id,
          role_id: roleId,
          team_id: teamId,
          created_by: user.id,
          last_assigned_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
          .schema('identity')
          .from('user_roles')
          .insert(roleAssignments);

        if (insertError) throw new Error(`Failed to assign roles: ${insertError.message}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      message.success('Roles updated successfully');
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-session'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to update roles');
    },
  });
};

/**
 * Hook to update user teams
 */
export const useUpdateTeams = () => {
  const queryClient = useQueryClient();
  const { user, organization } = useAuthStore();

  return useMutation({
    mutationFn: async ({ teamIds }: UpdateTeamsParams) => {
      if (!user?.id || !organization?.id) {
        throw new Error('User or organization not available');
      }

      const orgUserId = await getOrgUserId(user.id, organization.id);
      if (!orgUserId) throw new Error('Organization user record not found');

      // 1. Delete existing team assignments for this user
      const { error: deleteError } = await supabase
        .schema('identity')
        .from('user_teams')
        .delete()
        .eq('organization_user_id', orgUserId);

      if (deleteError) throw new Error(`Failed to remove existing teams: ${deleteError.message}`);

      // 2. Insert new team assignments
      if (teamIds.length > 0) {
        const teamAssignments = teamIds.map(teamId => ({
          organization_user_id: orgUserId,
          team_id: teamId,
          created_by: user.id,
          last_assigned_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
          .schema('identity')
          .from('user_teams')
          .insert(teamAssignments);

        if (insertError) throw new Error(`Failed to assign teams: ${insertError.message}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      message.success('Teams updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-session'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to update teams');
    },
  });
};

/**
 * Hook to update user primary location
 */
export const useUpdateLocation = () => {
  const queryClient = useQueryClient();
  const { user, organization } = useAuthStore();

  return useMutation({
    mutationFn: async ({ locationId }: UpdateLocationsParams) => {
      if (!user?.id || !organization?.id) {
        throw new Error('User or organization not available');
      }

      // Update the organization_users record with new location
      const { error } = await supabase
        .schema('identity')
        .from('organization_users')
        .update({ 
          location_id: locationId,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('user_id', user.id)
        .eq('organization_id', organization.id);

      if (error) throw new Error(`Failed to update location: ${error.message}`);

      return { success: true };
    },
    onSuccess: () => {
      message.success('Location updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-session'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to update location');
    },
  });
};

/**
 * Hook to fetch all available roles for the organization
 */
export const useFetchAvailableRoles = () => {
  const { organization } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error('Organization not available');

      const { data, error } = await supabase
        .schema('identity')
        .from('roles')
        .select('id, name, permissions, is_active')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw new Error(`Failed to fetch roles: ${error.message}`);
      return data || [];
    },
  });
};

/**
 * Hook to fetch all available teams for the organization
 */
export const useFetchAvailableTeams = () => {
  const { organization } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error('Organization not available');

      const { data, error } = await supabase
        .schema('identity')
        .from('teams')
        .select('id, name, location_id')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw new Error(`Failed to fetch teams: ${error.message}`);
      return data || [];
    },
  });
};

/**
 * Hook to fetch all available locations for the organization
 */
export const useFetchAvailableLocations = () => {
  const { organization } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error('Organization not available');

      // Fetch all locations for the organization (no is_active filter)
      // so users can select from any location they have access to
      const { data, error } = await supabase
        .schema('identity')
        .from('locations')
        .select('id, name, is_active')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw new Error(`Failed to fetch locations: ${error.message}`);
      console.log('[useFetchAvailableLocations] Fetched locations:', data);
      return data || [];
    },
  });
};
