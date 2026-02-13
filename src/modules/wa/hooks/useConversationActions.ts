import { useAuthStore } from '@/core/lib/store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { supabase } from '@/lib/supabase';

// Types for conversation actions
interface TeamMember {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

// Close a conversation using RPC
const closeConversation = async (conversationId: string) => {
    const { error } = await supabase.schema('wa').rpc('wa_close_conversation', {
        p_conversation_id: conversationId,
    });

    if (error) {
        console.error('Error closing conversation:', error);
        throw error;
    }

    return { success: true };
};

// Reopen a conversation (set status back to 'open')
const reopenConversation = async (conversationId: string) => {
    const organizationId = useAuthStore.getState().organization?.id;

    const { error } = await supabase
        .schema('wa')
        .from('wa_conversations')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('organization_id', organizationId);

    if (error) {
        console.error('Error reopening conversation:', error);
        throw error;
    }

    return { success: true };
};

// Snooze a conversation
const snoozeConversation = async (
    conversationId: string,
    snoozeUntil?: string
) => {
    const organizationId = useAuthStore.getState().organization?.id;

    const updateData: Record<string, any> = {
        status: 'snoozed',
        updated_at: new Date().toISOString(),
    };

    if (snoozeUntil) {
        updateData.snoozed_until = snoozeUntil;
    }

    const { error } = await supabase
        .schema('wa')
        .from('wa_conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq('organization_id', organizationId);

    if (error) {
        console.error('Error snoozing conversation:', JSON.stringify(error, null, 2));
        throw error;
    }

    return { success: true };
};

// Assign an agent to a conversation 
const assignAgent = async (
    conversationId: string,
    agentId: string | null
) => {
    const { error } = await supabase.schema('wa').rpc('wa_assign_agent', {
        p_conversation_id: conversationId,
        p_agent_user_id: agentId,
    });

    if (error) {
        console.error('Error assigning agent:', error);
        throw error;
    }

    return { success: true };
};

// Fetch team members for assignment dropdown
const fetchTeamMembers = async (): Promise<TeamMember[]> => {
    const organizationId = useAuthStore.getState().organization?.id;

    // Fetch users from identity.users who belong to this organization
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
        name: user.email, // Fallback to email since name column is uncertain
        email: user.email,
        avatar: undefined,
    }));
};

// Hook for team members
export const useTeamMembers = () => {
    return useQuery({
        queryKey: ['teamMembers'],
        queryFn: fetchTeamMembers,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

// Hook for closing conversation
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

// Hook for reopening conversation
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

// Hook for snoozing conversation
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

// Hook for assigning agent
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

// Combined hook for all conversation actions
export const useConversationActions = (conversationId: string | null) => {
    const closeConv = useCloseConversation();
    const reopenConv = useReopenConversation();
    const snoozeConv = useSnoozeConversation();
    const assignAgentMutation = useAssignAgent();
    const { data: teamMembers = [] } = useTeamMembers();

    return {
        // Actions
        close: () => conversationId && closeConv.mutateAsync(conversationId),
        reopen: () => conversationId && reopenConv.mutateAsync(conversationId),
        snooze: (until?: string) =>
            conversationId && snoozeConv.mutateAsync({ conversationId, snoozeUntil: until }),
        assign: (agentId: string | null) =>
            conversationId && assignAgentMutation.mutateAsync({ conversationId, agentId }),

        // Loading states
        isClosing: closeConv.isPending,
        isReopening: reopenConv.isPending,
        isSnoozing: snoozeConv.isPending,
        isAssigning: assignAgentMutation.isPending,

        // Team members for assignment
        teamMembers,
    };
};
