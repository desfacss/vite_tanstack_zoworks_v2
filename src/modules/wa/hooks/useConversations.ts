import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Conversation, ConversationFilters } from '../types';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const getAccessScope = () => {
    const { organization, location } = useAuthStore.getState();
    if (!organization?.id) throw new Error('No organization selected');
    return {
        organizationId: organization.id,
        locationId: location?.id
    };
};

const fetchConversations = async (filters: ConversationFilters): Promise<Conversation[]> => {
    const { organizationId, locationId } = getAccessScope();
    console.log(`[useConversations] Fetching for Scope: Org=${organizationId}, Loc=${locationId || 'Global'}`, filters);

    let query = supabase
        .schema('wa').from('wa_conversations')
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
        .eq('organization_id', organizationId);

    if (locationId) {
        query = query.eq('location_id', locationId);
    }

    query = query.order('last_message_at', { ascending: false, nullsFirst: false });

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    if (filters.assignee) {
        query = query.eq('assignee_id', filters.assignee);
    }

    if (filters.search) {
        query = query.or(`wa_contacts.name.ilike.%${filters.search}%,last_message_summary.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
    }

    const conversations: Conversation[] = (data || []).map((conv: any) => {
        const contact = conv.wa_contacts;

        return {
            id: conv.id,
            participant_id: contact?.id || '',
            participant_name: contact?.name || contact?.wa_id || 'Unknown',
            participant_email: '',
            participant_phone: contact?.wa_id || '',
            participant_avatar: contact?.profile_picture_url,
            last_message: conv.last_message_summary || '',
            last_message_at: conv.last_message_at || conv.created_at,
            channel: 'whatsapp' as const,
            status: conv.status as 'open' | 'closed' | 'snoozed',
            assignee_id: conv.assignee_id,
            assignee_name: undefined,
            unread_count: 0,
            participant_type: 'contact' as const,
        };
    });

    return conversations;
};

export const useConversations = (filters: ConversationFilters) => {
    const queryClient = useQueryClient();
    const { organization, location } = useAuthStore();

    const query = useQuery({
        queryKey: ['conversations', organization?.id, location?.id, filters],
        queryFn: () => fetchConversations(filters),
        staleTime: 1000 * 30,
        placeholderData: (previousData: Conversation[] | undefined) => previousData,
    });

    useEffect(() => {
        let channel: any;
        const organizationId = organization?.id;
        const locationId = location?.id;

        if (!organizationId) return;

        console.log(`[useConversations] Setting up subscription for Scope: Org=${organizationId}, Loc=${locationId || 'Global'}`);

        let filter = `organization_id=eq.${organizationId}`;
        if (locationId) {
            filter += `,location_id=eq.${locationId}`;
        }

        channel = supabase
            .channel(`conversations-${organizationId}-${locationId || 'global'}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wa_conversations',
                    filter: filter,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }
            )
            .subscribe();

        return () => {
            if (channel) {
                console.log(`[useConversations] Cleaning up subscription for Scope: Org=${organizationId}, Loc=${locationId || 'Global'}`);
                supabase.removeChannel(channel);
            }
        };
    }, [queryClient, organization?.id, location?.id]);

    return query;
};

export const useConversationCounts = () => {
    const queryClient = useQueryClient();

    const { organization, location } = useAuthStore();

    const query = useQuery({
        queryKey: ['conversation-counts', organization?.id, location?.id],
        queryFn: async () => {
            const { organizationId, locationId } = getAccessScope();
            let query = supabase
                .schema('wa').from('wa_conversations')
                .select('status')
                .eq('organization_id', organizationId);

            if (locationId) {
                query = query.eq('location_id', locationId);
            }

            const { data, error } = await query;

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

    useEffect(() => {
        let channel: any;
        const organizationId = organization?.id;
        const locationId = location?.id;

        if (!organizationId) return;

        let filter = `organization_id=eq.${organizationId}`;
        if (locationId) {
            filter += `,location_id=eq.${locationId}`;
        }

        channel = supabase
            .channel(`conversation-counts-${organizationId}-${locationId || 'global'}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wa_conversations',
                    filter: filter,
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
    }, [queryClient, organization?.id, location?.id]);

    return query;
};
