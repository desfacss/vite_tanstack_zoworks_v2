import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

const getAccessScope = () => {
    const { organization, location } = useAuthStore.getState();
    if (!organization?.id) throw new Error('No organization selected');
    return {
        organizationId: organization.id,
        locationId: location?.id
    };
};

const closeConversation = async (conversationId: string) => {
    const { error } = await supabase.rpc('wa_close_conversation', {
        p_conversation_id: conversationId,
    });

    if (error) {
        console.error('Error closing conversation:', error);
        throw error;
    }

    return { success: true };
};

const reopenConversation = async (conversationId: string) => {
    const { organizationId, locationId } = getAccessScope();

    let query = supabase
        .schema('wa').from('wa_conversations')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('organization_id', organizationId);

    if (locationId) {
        query = query.eq('location_id', locationId);
    }

    const { error } = await query;

    if (error) {
        console.error('Error reopening conversation:', error);
        throw error;
    }

    return { success: true };
};

const snoozeConversation = async (conversationId: string, snoozeUntil?: string) => {
    const { organizationId, locationId } = getAccessScope();

    const updateData: Record<string, any> = {
        status: 'snoozed',
        updated_at: new Date().toISOString(),
    };

    if (snoozeUntil) {
        updateData.snoozed_until = snoozeUntil;
    }

    let query = supabase
        .schema('wa').from('wa_conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq('organization_id', organizationId);

    if (locationId) {
        query = query.eq('location_id', locationId);
    }

    const { error } = await query;

    if (error) {
        console.error('Error snoozing conversation:', JSON.stringify(error, null, 2));
        throw error;
    }

    return { success: true };
};

const assignAgent = async (conversationId: string, agentId: string | null) => {
    const { error } = await supabase.rpc('wa_assign_agent', {
        p_conversation_id: conversationId,
        p_agent_user_id: agentId,
    });

    if (error) {
        console.error('Error assigning agent:', error);
        throw error;
    }

    return { success: true };
};

const fetchTeamMembers = async (): Promise<TeamMember[]> => {
    const { organizationId } = getAccessScope();

    const { data, error } = await supabase
        .schema('identity')
        .from('users')
        .select('id, email')
        .eq('pref_organization_id', organizationId)
        .order('email');

    if (error) {
        console.error('Error fetching team members:', error);
        return [];
    }

    return (data || []).map((user: any) => ({
        id: user.id,
        name: user.email,
        email: user.email,
        avatar: undefined,
    }));
};

export const useTeamMembers = () => {
    const { organization, location } = useAuthStore();
    return useQuery({
        queryKey: ['teamMembers', organization?.id, location?.id],
        queryFn: fetchTeamMembers,
        staleTime: 1000 * 60 * 5,
    });
};

export const useCloseConversation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: closeConversation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            message.success('Conversation closed');
        },
        onError: () => {
            message.error('Failed to close conversation');
        },
    });
};

export const useReopenConversation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: reopenConversation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            message.success('Conversation reopened');
        },
        onError: () => {
            message.error('Failed to reopen conversation');
        },
    });
};

export const useSnoozeConversation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ conversationId, snoozeUntil }: { conversationId: string; snoozeUntil?: string }) =>
            snoozeConversation(conversationId, snoozeUntil),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            message.success('Conversation snoozed');
        },
        onError: () => {
            message.error('Failed to snooze conversation');
        },
    });
};

export const useAssignAgent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ conversationId, agentId }: { conversationId: string; agentId: string | null }) =>
            assignAgent(conversationId, agentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            message.success('Agent assigned');
        },
        onError: () => {
            message.error('Failed to assign agent');
        },
    });
};

export const useConversationActions = (conversationId: string | null) => {
    const closeConv = useCloseConversation();
    const reopenConv = useReopenConversation();
    const snoozeConv = useSnoozeConversation();
    const assignAgentMutation = useAssignAgent();
    const { data: teamMembers = [] } = useTeamMembers();

    return {
        close: () => conversationId && closeConv.mutateAsync(conversationId),
        reopen: () => conversationId && reopenConv.mutateAsync(conversationId),
        snooze: (until?: string) =>
            conversationId && snoozeConv.mutateAsync({ conversationId, snoozeUntil: until }),
        assign: (agentId: string | null) =>
            conversationId && assignAgentMutation.mutateAsync({ conversationId, agentId }),

        isClosing: closeConv.isPending,
        isReopening: reopenConv.isPending,
        isSnoozing: snoozeConv.isPending,
        isAssigning: assignAgentMutation.isPending,

        teamMembers,
    };
};
