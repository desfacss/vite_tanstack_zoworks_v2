import { useAuthStore } from '@/core/lib/store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Conversation, ConversationFilters } from '../types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const fetchConversations = async (filters: ConversationFilters): Promise<Conversation[]> => {
    const organizationId = useAuthStore.getState().organization?.id;
    console.log(`[useConversations] Fetching for Org: ${organizationId}`, filters);

    let query = supabase
        .schema('wa')
        .from('wa_conversations')
        .select(`
            id,
            status,
            last_message_at,
            last_message_summary,
            assignee_id,
            created_at,
            metadata,
            wa_contacts!wa_conversations_contact_id_fkey (
                id,
                wa_id,
                name,
                profile_picture_url,
                metadata
            )
        `)
        .eq('organization_id', organizationId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

    // Apply filters
    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    if (filters.assignee) {
        query = query.eq('assignee_id', filters.assignee);
    }

    if (filters.search) {
        // Search in contact name or last message
        query = query.or(`wa_contacts.name.ilike.%${filters.search}%,last_message_summary.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
    }

    // Transform to frontend format
    const conversations: Conversation[] = (data || []).map((conv: any) => {
        const contact = conv.wa_contacts;

        return {
            id: conv.id,
            participant_id: contact?.id || '',
            participant_name: contact?.name || contact?.wa_id || 'Unknown',
            participant_email: '', // WhatsApp doesn't have email
            participant_phone: contact?.wa_id || '',
            participant_avatar: contact?.profile_picture_url,
            last_message: conv.last_message_summary || '',
            last_message_at: conv.last_message_at || conv.created_at,
            channel: 'whatsapp' as const,
            status: conv.status as 'open' | 'closed' | 'snoozed',
            assignee_id: conv.assignee_id,
            assignee_name: undefined, // TODO: Join with users table if needed
            unread_count: 0, // TODO: Calculate from conversation_user_state if needed
            participant_type: 'contact' as const,
        };
    });

    return conversations;
};

export const useConversations = (filters: ConversationFilters) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['conversations', filters],
        queryFn: () => fetchConversations(filters),
        staleTime: 1000 * 30, // 30 seconds
        placeholderData: (previousData: Conversation[] | undefined) => previousData,
    });

    // Set up real-time subscription for conversation updates
    useEffect(() => {
        let channel: any;
        const organizationId = useAuthStore.getState().organization?.id;

        if (!organizationId) return;

        console.log(`[useConversations] Setting up subscription for Org: ${organizationId}`);

        channel = supabase
            .channel(`conversations-${organizationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'wa',
                    table: 'wa_conversations',
                    filter: `organization_id=eq.${organizationId}`,
                },
                () => {
                    // Invalidate queries to refetch data
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }
            )
            .subscribe();

        return () => {
            if (channel) {
                console.log(`[useConversations] Cleaning up subscription for Org: ${organizationId}`);
                supabase.removeChannel(channel);
            }
        };
    }, [queryClient, useAuthStore.getState().organization?.id]);

    return query;
};

export const useConversationCounts = () => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['conversation-counts'],
        queryFn: async () => {
            const organizationId = useAuthStore.getState().organization?.id;
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_conversations')
                .select('status')
                .eq('organization_id', organizationId);

            if (error) throw error;

            return {
                all: data.length,
                open: data.filter((c: any) => c.status === 'open').length,
                closed: data.filter((c: any) => c.status === 'closed').length,
                snoozed: data.filter((c: any) => c.status === 'snoozed').length,
            };
        },
        staleTime: 1000 * 30,
    });

    // Set up real-time subscription for counts
    useEffect(() => {
        let channel: any;
        const organizationId = useAuthStore.getState().organization?.id;

        if (!organizationId) return;

        channel = supabase
            .channel(`conversation-counts-${organizationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'wa',
                    table: 'wa_conversations',
                    filter: `organization_id=eq.${organizationId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
                }
            )
            .subscribe();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [queryClient, useAuthStore.getState().organization?.id]);

    return query;
};
