import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import type { WaContact } from '../types';

const getOrganizationId = async (): Promise<string> => {
    const org = useAuthStore.getState().organization;
    if (!org?.id) throw new Error('No organization selected');
    return org.id;
};

const fetchContactForConversation = async (conversationId: string): Promise<WaContact | null> => {
    const organizationId = await getOrganizationId();

    const { data: conversation, error: convError } = await supabase
        .from('wa_conversations')
        .select(`
            id,
            contact_id,
            status,
            assignee_id,
            last_message_at,
            last_message_summary,
            wa_contacts!wa_conversations_contact_id_fkey (
                id,
                wa_id,
                name,
                profile_picture_url,
                linked_entity_id,
                linked_entity_type,
                tags,
                opt_in_status,
                metadata,
                created_at,
                updated_at
            )
        `)
        .eq('organization_id', organizationId)
        .eq('id', conversationId)
        .maybeSingle();

    if (convError) {
        console.error('Error fetching conversation contact:', convError);
        return null;
    }
    if (!conversation) return null;

    const contact = (conversation as any).wa_contacts;
    if (!contact) return null;

    return {
        id: contact.id,
        wa_id: contact.wa_id,
        name: contact.name || contact.wa_id,
        profile_picture_url: contact.profile_picture_url,
        tags: contact.tags || [],
        opt_in_status: contact.opt_in_status ?? true,
        created_at: contact.created_at,
        updated_at: contact.updated_at,
        organization_id: organizationId,
    };
};

const fetchContactById = async (contactId: string): Promise<WaContact | null> => {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
        .from('wa_contacts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', contactId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching contact:', error);
        return null;
    }
    if (!data) return null;

    return {
        id: data.id,
        wa_id: data.wa_id,
        name: data.name || data.wa_id,
        profile_picture_url: data.profile_picture_url,
        tags: data.tags || [],
        opt_in_status: data.opt_in_status ?? true,
        created_at: data.created_at,
        updated_at: data.updated_at,
        organization_id: organizationId,
    };
};

const fetchConversationCount = async (contactId: string): Promise<number> => {
    const organizationId = await getOrganizationId();

    const { count, error } = await supabase
        .from('wa_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('contact_id', contactId);

    if (error) {
        console.error('Error fetching conversation count:', error);
        return 0;
    }

    return count || 0;
};

const fetchMessageCount = async (contactId: string): Promise<number> => {
    const organizationId = await getOrganizationId();

    const { count, error } = await supabase
        .from('wa_messages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('contact_id', contactId);

    if (error) {
        console.error('Error fetching message count:', error);
        return 0;
    }

    return count || 0;
};

export const useContactForConversation = (conversationId: string | null) => {
    return useQuery({
        queryKey: ['conversationContact', conversationId],
        queryFn: () => fetchContactForConversation(conversationId!),
        enabled: !!conversationId,
        staleTime: 1000 * 60,
    });
};

export const useContact = (contactId: string | null) => {
    return useQuery({
        queryKey: ['contact', contactId],
        queryFn: () => fetchContactById(contactId!),
        enabled: !!contactId,
        staleTime: 1000 * 60,
    });
};

export const useContactStats = (contactId: string | null) => {
    const conversationCountQuery = useQuery({
        queryKey: ['contactConversationCount', contactId],
        queryFn: () => fetchConversationCount(contactId!),
        enabled: !!contactId,
    });

    const messageCountQuery = useQuery({
        queryKey: ['contactMessageCount', contactId],
        queryFn: () => fetchMessageCount(contactId!),
        enabled: !!contactId,
    });

    return {
        conversationCount: conversationCountQuery.data ?? 0,
        messageCount: messageCountQuery.data ?? 0,
        isLoading: conversationCountQuery.isLoading || messageCountQuery.isLoading,
    };
};

export const useUpdateContactTags = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            contactId,
            tagsToAdd = [],
            tagsToRemove = []
        }: {
            contactId: string;
            tagsToAdd?: string[];
            tagsToRemove?: string[];
        }) => {
            const { data, error } = await supabase
                .rpc('wa_update_contact_tags', {
                    p_wa_contact_id: contactId,
                    p_tags_to_add: tagsToAdd,
                    p_tags_to_remove: tagsToRemove
                });

            if (error) throw error;
            return data as string[];
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
            queryClient.invalidateQueries({ queryKey: ['conversationContact'] });
        }
    });
};

export const useAddContactTag = () => {
    const updateTags = useUpdateContactTags();

    return useMutation({
        mutationFn: async ({ contactId, tag }: { contactId: string; tag: string }) => {
            return updateTags.mutateAsync({ contactId, tagsToAdd: [tag] });
        }
    });
};

export const useRemoveContactTag = () => {
    const updateTags = useUpdateContactTags();

    return useMutation({
        mutationFn: async ({ contactId, tag }: { contactId: string; tag: string }) => {
            return updateTags.mutateAsync({ contactId, tagsToRemove: [tag] });
        }
    });
};
