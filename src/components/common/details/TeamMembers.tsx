import React, { useState, useEffect } from 'react';
import { Button, message, Select, Spin, List, Card, Row, Col, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

interface TeamMemberDetail {
    organization_user_id: string;
    global_user_name: string;
    current_role_id: string | null;
}

// Updated interface to reflect no automatic join initially
interface OrganizationUser {
    id: string; // organization_users.id (the crucial ID)
    user_id: string; // users.id
}

interface UserDetails {
    id: string; // users.id
    name: string; // users.name
}

// Interface for the fully mapped data
interface UserOrgMapping {
    id: string; // organization_users.id
    user_id: string;
    users: { name: string }; // Client-side "joined" user name
}

interface Role {
    id: string;
    name: string;
}

interface TeamMembersProps {
    editItem: { id: string, name: string } | undefined;
}

const TeamMembers: React.FC<TeamMembersProps> = ({ editItem }) => {
    const team_id = editItem?.id;
    const { t } = useTranslation();
    const { user, organization } = useAuthStore();
    const queryClient = useQueryClient();
    
    // State to hold the current assignment structure: Org User ID -> Role ID
    const [assignments, setAssignments] = useState<TeamMemberDetail[]>([]);
    // State to hold all users in the organization (for the source list)
    const [orgUsers, setOrgUsers] = useState<UserOrgMapping[]>([]);
    // State for the selected users to add/remove
    const [selectedOrgUserIds, setSelectedOrgUserIds] = useState<string[]>([]);

    // --- 1. Fetch All Roles in the Organization (No change here) ---
    const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
        queryKey: ['roles', organization?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('identity_v2').from('roles')
                .select('id, name')
                .eq('organization_id', organization?.id);
            if (error) throw error;
            return data;
        },
        enabled: !!organization?.id,
    });

    // --- Helper: Fetch Public User Details (Names) ---
    const { data: publicUsers = [], isLoading: isLoadingPublicUsers } = useQuery<UserDetails[]>({
        queryKey: ['public-users'],
        queryFn: async () => {
            // Fetch all users from the public schema (needed for names)
            const { data, error } = await supabase
                .schema('identity_v2').from('users') // Assumes 'users' is in the public schema
                .select('id, name');
            if (error) throw error;
            return data;
        },
    });

    // --- 2. Fetch All Organization Users (Source List) - MODIFIED ---
    const { data: orgUsersData = [], isLoading: isLoadingOrgUsers } = useQuery<OrganizationUser[]>({
        queryKey: ['org-users-raw', organization?.id],
        queryFn: async () => {
            // Fetch ALL active users in this organization (Org User ID and Supabase User ID)
            const { data, error } = await supabase
                .schema('identity_v2').from('organization_users')
                .select('id, user_id') // Removed 'users(name)' join
                .eq('organization_id', organization?.id)
                .eq('is_active', true);
            if (error) throw error;
            return data;
        },
        enabled: !!organization?.id,
    });
    
    // --- Manual Join for Organization Users ---
    useEffect(() => {
        if (orgUsersData.length > 0 && publicUsers.length > 0) {
            const userMap = new Map(publicUsers.map(u => [u.id, u.name]));

            const joinedUsers: UserOrgMapping[] = orgUsersData
                .map(orgUser => {
                    const userName = userMap.get(orgUser.user_id);
                    return userName ? {
                        id: orgUser.id,
                        user_id: orgUser.user_id,
                        users: { name: userName }
                    } : null;
                })
                .filter((u): u is UserOrgMapping => u !== null); // Filter out users whose name couldn't be found

            setOrgUsers(joinedUsers);
        } else if (orgUsersData.length === 0) {
            setOrgUsers([]);
        }
    }, [orgUsersData, publicUsers]);


    // --- 3. Fetch Current Team Assignments (Target List) - MODIFIED ---
    const { isLoading: isLoadingAssignments } = useQuery<TeamMemberDetail[]>({
        queryKey: ['team-assignments', team_id, publicUsers],
        queryFn: async () => {
            if (!team_id || publicUsers.length === 0) return [];
            
            const userMap = new Map(publicUsers.map(u => [u.id, u.name]));

            // Fetch current members (organization_user_id and corresponding user_id)
            const { data: membersData, error: memberError } = await supabase
                .schema('identity_v2').from('user_teams')
                .select('organization_user_id, organization_users(user_id)') // Join to organization_users to get user_id
                .eq('team_id', team_id);

            if (memberError) throw memberError;

            // Fetch the roles for these members on this team
            const { data: rolesData, error: roleError } = await supabase
                .schema('identity_v2').from('user_roles')
                .select('organization_user_id, role_id')
                .eq('team_id', team_id);

            if (roleError) throw roleError;
            
            const rolesMap = new Map(rolesData.map(r => [r.organization_user_id, r.role_id]));

            return membersData
                .map(member => {
                    const orgUser = Array.isArray(member.organization_users) ? member.organization_users[0] : member.organization_users;
                    const userId = orgUser?.user_id; // Get the user_id
                    const userName = userId ? userMap.get(userId) : null;

                    if (!userName) return null; // Skip if user name not found

                    return {
                        organization_user_id: member.organization_user_id,
                        global_user_name: userName, // Use the manually-fetched name
                        current_role_id: rolesMap.get(member.organization_user_id) || null,
                    };
                })
                .filter((a): a is TeamMemberDetail => a !== null); // Filter out nulls
        },
        onSuccess: (data) => {
            setAssignments(data);
            setSelectedOrgUserIds(data.map(a => a.organization_user_id));
        },
        // Ensure this query waits for publicUsers to be fetched
        enabled: !!team_id && !isLoadingPublicUsers, 
    });

    // Handle updates to the role dropdown (No change here)
    const handleRoleChange = (orgUserId: string, roleId: string) => {
        setAssignments(prev => prev.map(a => 
            a.organization_user_id === orgUserId ? { ...a, current_role_id: roleId } : a
        ));
    };

    // Mutation to update team membership AND roles (No change here)
    const updateAssignmentsMutation = useMutation({
        mutationFn: async ({ teamId, assignments }: { teamId: string; assignments: TeamMemberDetail[] }) => {
            // ... (rest of the mutation function is the same)
             // Step A: Determine users to keep, add, and remove
            const currentOrgUserIds = assignments.map(a => a.organization_user_id);
            
            // Step B: Update user_teams (Membership)
            await supabase.schema('identity_v2').from('user_teams').delete().eq('team_id', teamId);
            if (currentOrgUserIds.length > 0) {
                const { error } = await supabase
                    .schema('identity_v2').from('user_teams')
                    .insert(
                        currentOrgUserIds.map(orgUserId => ({
                            team_id: teamId,
                            organization_user_id: orgUserId, // CRITICAL: Use org_user_id
                            created_by: user?.id,
                        }))
                    );
                if (error) throw error;
            }

            // Step C: Update user_roles (Authorization)
            // Delete all previous roles for this team, then insert new ones.
            await supabase.schema('identity_v2').from('user_roles').delete().eq('team_id', teamId);
            const rolesToInsert = assignments
                .filter(a => a.current_role_id) // Only insert if a role is selected
                .map(a => ({
                    organization_user_id: a.organization_user_id,
                    role_id: a.current_role_id,
                    team_id: teamId,
                    created_by: user?.id,
                }));
            
            if (rolesToInsert.length > 0) {
                const { error: roleError } = await supabase
                    .schema('identity_v2').from('user_roles')
                    .insert(rolesToInsert);
                if (roleError) throw roleError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-assignments', team_id] });
            message.success(t('teams.members_and_roles_updated'));
        },
        onError: (error: any) => {
            message.error(error.message);
        },
    });

    const isLoading = isLoadingRoles || isLoadingOrgUsers || isLoadingPublicUsers || isLoadingAssignments || updateAssignmentsMutation.isPending;

    // Filtered list of users NOT yet selected for the team (No change here)
    const usersNotInTeam = orgUsers.filter(u => !selectedOrgUserIds.includes(u.id));

    // Handle adding a user to the assignment list (No change here)
    const addUserToTeam = (orgUserId: string, userName: string) => {
        if (!selectedOrgUserIds.includes(orgUserId)) {
            setSelectedOrgUserIds(prev => [...prev, orgUserId]);
            setAssignments(prev => [
                ...prev, 
                { organization_user_id: orgUserId, global_user_name: userName, current_role_id: null }
            ]);
        }
    };

    // Handle removing a user from the assignment list (No change here)
    const removeUserFromTeam = (orgUserId: string) => {
        setSelectedOrgUserIds(prev => prev.filter(id => id !== orgUserId));
        setAssignments(prev => prev.filter(a => a.organization_user_id !== orgUserId));
    };

    if (!team_id) {
        return <Text type="danger">{t('teams.no_team_selected')}</Text>;
    }

    return (
        <Spin spinning={isLoading}>
            <div className="flex flex-col h-full space-y-4">
                <Text strong>{t('teams.current_members_and_roles')}: {editItem?.name}</Text>
                
                {/* Current Assignments List */}
                <Card size="small" title={<><TeamOutlined /> {t('common.team_members')}</>}>
                    <List
                        size="small"
                        bordered
                        dataSource={assignments}
                        renderItem={item => (
                            <List.Item 
                                key={item.organization_user_id}
                                actions={[
                                    <Button 
                                        type="link" 
                                        danger 
                                        onClick={() => removeUserFromTeam(item.organization_user_id)}
                                    >
                                        {t('common.remove')}
                                    </Button>
                                ]}
                            >
                                <Row className="w-full" align="middle" gutter={16}>
                                    <Col span={10}>
                                        <Text>{item.global_user_name}</Text>
                                    </Col>
                                    <Col span={14}>
                                        <Select
                                            placeholder={t('teams.select_role')}
                                            value={item.current_role_id}
                                            onChange={(value) => handleRoleChange(item.organization_user_id, value)}
                                            style={{ width: '100%' }}
                                        >
                                            {roles.map(role => (
                                                <Option key={role.id} value={role.id}>{role.name}</Option>
                                            ))}
                                        </Select>
                                    </Col>
                                </Row>
                            </List.Item>
                        )}
                    />
                </Card>

                {/* Add New Members List */}
                <Card size="small" title={<><UserOutlined /> {t('teams.add_members')}</>}>
                    <List
                        size="small"
                        bordered
                        dataSource={usersNotInTeam}
                        renderItem={item => (
                            <List.Item 
                                key={item.id}
                                actions={[
                                    <Button 
                                        type="link" 
                                        onClick={() => addUserToTeam(item.id, item.users.name)}
                                    >
                                        {t('common.add')}
                                    </Button>
                                ]}
                            >
                                <Text>{item.users.name}</Text>
                            </List.Item>
                        )}
                    />
                </Card>

                <Button
                    type="primary"
                    block
                    onClick={() => {
                        if (team_id) {
                            updateAssignmentsMutation.mutate({
                                teamId: team_id,
                                assignments: assignments,
                            });
                        }
                    }}
                    loading={updateAssignmentsMutation.isPending}
                >
                    {t('common.save_assignments')}
                </Button>
            </div>
        </Spin>
    );
};

export default TeamMembers;