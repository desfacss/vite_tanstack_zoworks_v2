import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import type { WaContact } from '../types';

const getAccessScope = () => {
    const { organization, location } = useAuthStore.getState();
    if (!organization?.id) throw new Error('No organization selected');
    return {
        organizationId: organization.id,
        locationId: location?.id
    };
};

const fetchContactForConversation = async (conversationId: string): Promise<WaContact | null> => {
    const { organizationId, locationId } = getAccessScope();

    let query = supabase
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
        .eq('id', conversationId);

    if (locationId) {
        query = query.eq('location_id', locationId);
    }

    const { data: conversation, error: convError } = await query.maybeSingle();

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
    const { organizationId, locationId } = getAccessScope();

    let query = supabase
        .from('wa_contacts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', contactId);

    if (locationId) {
        query = query.eq('location_id', locationId);
    }

    const { data, error } = await query.maybeSingle();

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
    const { organizationId, locationId } = getAccessScope();

    let query = supabase
        .from('wa_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('contact_id', contactId);

    if (locationId) {
        query = query.eq('location_id', locationId);
    }

    const { count, error } = await query;

    if (error) {
        console.error('Error fetching conversation count:', error);
        return 0;
    }

    return count || 0;
};

const fetchMessageCount = async (contactId: string): Promise<number> => {
    const { organizationId, locationId } = getAccessScope();

    let query = supabase
        .from('wa_messages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('contact_id', contactId);

    if (locationId) {
        query = query.eq('location_id', locationId);
    }

    const { count, error } = await query;

    if (error) {
        console.error('Error fetching message count:', error);
        return 0;
    }

    return count || 0;
};

export const useContactForConversation = (conversationId: string | null) => {
    const { organization, location } = useAuthStore();
    return useQuery({
        queryKey: ['conversationContact', organization?.id, location?.id, conversationId],
        queryFn: () => fetchContactForConversation(conversationId!),
        enabled: !!conversationId,
        staleTime: 1000 * 60,
    });
};

export const useContact = (contactId: string | null) => {
    const { organization, location } = useAuthStore();
    return useQuery({
        queryKey: ['contact', organization?.id, location?.id, contactId],
        queryFn: () => fetchContactById(contactId!),
        enabled: !!contactId,
        staleTime: 1000 * 60,
    });
};

export const useContactStats = (contactId: string | null) => {
    const { organization, location } = useAuthStore();
    const conversationCountQuery = useQuery({
        queryKey: ['contactConversationCount', organization?.id, location?.id, contactId],
        queryFn: () => fetchConversationCount(contactId!),
        enabled: !!contactId,
    });

    const messageCountQuery = useQuery({
        queryKey: ['contactMessageCount', organization?.id, location?.id, contactId],
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
