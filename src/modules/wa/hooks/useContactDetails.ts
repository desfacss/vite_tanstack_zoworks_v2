import { useAuthStore } from '@/core/lib/store';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface WaContact {
    id: string;
    wa_id: string;
    name: string;
    profile_picture_url?: string;
    linked_entity_id?: string;
    linked_entity_type?: string;
    tags: string[];
    opt_in_status: boolean;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

// Fetch contact details for a conversation
const fetchContactForConversation = async (conversationId: string): Promise<WaContact | null> => {
    const organizationId = useAuthStore.getState().organization?.id;

    // Get the conversation with contact
    const { data: conversation, error: convError } = await supabase
        .schema('wa')
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
        linked_entity_id: contact.linked_entity_id,
        linked_entity_type: contact.linked_entity_type,
        tags: contact.tags || [],
        opt_in_status: contact.opt_in_status ?? true,
        metadata: contact.v_metadata || {},
        created_at: contact.created_at,
        updated_at: contact.updated_at,
    };
};

// Fetch contact by ID directly
const fetchContactById = async (contactId: string): Promise<WaContact | null> => {
    const organizationId = useAuthStore.getState().organization?.id;

    const { data, error } = await supabase
        .schema('wa')
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
        linked_entity_id: data.linked_entity_id,
        linked_entity_type: data.linked_entity_type,
        tags: data.tags || [],
        opt_in_status: data.opt_in_status ?? true,
        metadata: data.v_metadata || {},
        created_at: data.created_at,
        updated_at: data.updated_at,
    };
};

// Fetch conversation count for a contact
const fetchConversationCount = async (contactId: string): Promise<number> => {
    const organizationId = useAuthStore.getState().organization?.id;

    const { count, error } = await supabase
        .schema('wa')
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

// Fetch message count for a contact
const fetchMessageCount = async (contactId: string): Promise<number> => {
    const organizationId = useAuthStore.getState().organization?.id;

    const { count, error } = await supabase
        .schema('wa')
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

// Hook to fetch contact for a conversation
export const useContactForConversation = (conversationId: string | null) => {
    return useQuery({
        queryKey: ['conversationContact', conversationId],
        queryFn: () => fetchContactForConversation(conversationId!),
        enabled: !!conversationId,
        staleTime: 1000 * 60, // 1 minute
    });
};

// Hook to fetch contact by ID
export const useContact = (contactId: string | null) => {
    return useQuery({
        queryKey: ['contact', contactId],
        queryFn: () => fetchContactById(contactId!),
        enabled: !!contactId,
        staleTime: 1000 * 60, // 1 minute
    });
};

// Hook to fetch contact statistics
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

// Hook to update contact tags - uses the wa_update_contact_tags DB function
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
            // Use the DB function
            const { data, error } = await supabase
                .schema('wa')
                .rpc('wa_update_contact_tags', {
                    p_wa_contact_id: contactId,
                    p_tags_to_add: tagsToAdd,
                    p_tags_to_remove: tagsToRemove
                });

            if (error) throw error;
            return data as string[]; // Returns the new tags array
        },
        onSuccess: (_, variables) => {
            // Invalidate contact queries
            queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
            queryClient.invalidateQueries({ queryKey: ['conversationContact'] });
        }
    });
};

// Hook to add a single tag (convenience wrapper)
export const useAddContactTag = () => {
    const updateTags = useUpdateContactTags();

    return useMutation({
        mutationFn: async ({ contactId, tag }: { contactId: string; tag: string }) => {
            return updateTags.mutateAsync({ contactId, tagsToAdd: [tag] });
        }
    });
};

// Hook to remove a single tag (convenience wrapper)
export const useRemoveContactTag = () => {
    const updateTags = useUpdateContactTags();

    return useMutation({
        mutationFn: async ({ contactId, tag }: { contactId: string; tag: string }) => {
            return updateTags.mutateAsync({ contactId, tagsToRemove: [tag] });
        }
    });
};

