// src/core/hooks/useUserProfile.ts
/**
 * @hook useUserProfile
 * @description Fetches extended profile data beyond what's stored in the session.
 * This includes manager details and can be extended for other profile-specific data.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

export interface ManagerInfo {
  id: string;
  name: string;
  email?: string;
  details?: Record<string, any>;
}

export interface OrganizationUserInfo {
  id: string;
  organization_id: string;
  user_id: string;
  location_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
}

export interface UserProfileData {
  manager: ManagerInfo | null;
  organizationUser: OrganizationUserInfo | null;
}

/**
 * Fetches the manager information for the current user
 */
const fetchManagerInfo = async (orgUserId: string): Promise<ManagerInfo | null> => {
  // First get the organization_users record to find manager_id
  const { data: orgUserData, error: orgUserError } = await supabase
    .schema('identity')
    .from('organization_users')
    .select('manager_id')
    .eq('id', orgUserId)
    .single();

  if (orgUserError || !orgUserData?.manager_id) {
    return null;
  }

  // Get the manager's organization_users record to get their user_id
  const { data: managerOrgUser, error: managerOrgUserError } = await supabase
    .schema('identity')
    .from('organization_users')
    .select('user_id')
    .eq('id', orgUserData.manager_id)
    .single();

  if (managerOrgUserError || !managerOrgUser?.user_id) {
    return null;
  }

  // Finally get the manager's user details
  const { data: managerUser, error: managerUserError } = await supabase
    .schema('identity')
    .from('users')
    .select('id, name, email, details')
    .eq('id', managerOrgUser.user_id)
    .single();

  if (managerUserError || !managerUser) {
    return null;
  }

  return managerUser as ManagerInfo;
};

/**
 * Fetches the organization_users record for the current user
 */
const fetchOrganizationUser = async (orgUserId: string): Promise<OrganizationUserInfo | null> => {
  const { data, error } = await supabase
    .schema('identity')
    .from('organization_users')
    .select('id, organization_id, user_id, location_id, manager_id, is_active, status, created_at')
    .eq('id', orgUserId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as OrganizationUserInfo;
};

/**
 * Main fetch function for user profile data
 */
const fetchUserProfileData = async (orgUserId: string): Promise<UserProfileData> => {
  const [manager, organizationUser] = await Promise.all([
    fetchManagerInfo(orgUserId),
    fetchOrganizationUser(orgUserId),
  ]);

  return {
    manager,
    organizationUser,
  };
};

/**
 * Hook to fetch extended user profile data
 * @param enabled - Whether the query should run
 */
export const useUserProfile = (enabled: boolean = true) => {
  const { user, organization } = useAuthStore();
  
  // We need the org_user_id from the session - this comes from jwt_get_user_session
  // For now, we'll need to look it up
  const userId = user?.id;
  const orgId = organization?.id;

  return useQuery<UserProfileData, Error>({
    queryKey: ['user-profile', userId, orgId],
    queryFn: async () => {
      if (!userId || !orgId) {
        throw new Error('User or organization not available');
      }

      // First, get the organization_users record for this user/org combo
      const { data: orgUserData, error: orgUserError } = await supabase
        .schema('identity')
        .from('organization_users')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single();

      if (orgUserError || !orgUserData) {
        throw new Error('Organization user record not found');
      }

      return fetchUserProfileData(orgUserData.id);
    },
    enabled: enabled && !!userId && !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

export default useUserProfile;
