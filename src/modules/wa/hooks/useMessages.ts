import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Message } from '../types';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const getOrganizationId = async (): Promise<string> => {
    const org = useAuthStore.getState().organization;
    if (!org?.id) throw new Error('No organization selected');
    return org.id;
};

const getMessageType = (content: any): Message['type'] => {
    if (typeof content === 'string') return 'text';
    if (content?.image) return 'image';
    if (content?.video) return 'video';
    if (content?.audio) return 'audio';
    if (content?.document) return 'document';
    if (content?.template) return 'template';
    if (content?.interactive) return 'interactive';
    if (content?.button || content?.type === 'button') return 'button';
    if (content?.text || content?.body) return 'text';
    return 'text';
};

const fetchMessages = async (conversationId: string): Promise<Message[]> => {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
        .from('wa_messages')
        .select(`
            id,
            conversation_id,
            whatsapp_message_id,
            direction,
            type,
            content,
            status,
            timestamp,
            recipient_status,
            created_at,
            details,
            contact_id,
            organization_id,
            wa_contacts!whatsapp_messages_contact_id_fkey (
                id,
                name,
                wa_id,
                profile_picture_url
            ) 
        `)
        .eq('organization_id', organizationId)
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        throw error;
    }

    const messages: Message[] = (data || []).map((msg: any) => {
        const contact = msg.wa_contacts;
        let content = msg.content || msg.details || {};

        if (typeof content === 'string') {
            try {
                content = JSON.parse(content);
                if (typeof content === 'string') {
                    try {
                        content = JSON.parse(content);
                    } catch (e) {
                        // It was just a string
                    }
                }
            } catch (e) {
                content = { body: content };
            }
        }

        const messageType = msg.type || getMessageType(content);
        const normalizedContent = typeof content === 'string' ? { body: content } : content;

        return {
            id: msg.id,
            conversation_id: msg.conversation_id,
            organization_id: msg.organization_id,
            content: normalizedContent,
            sender_type: msg.direction === 'inbound' ? 'participant' : 'user',
            sender_name: msg.direction === 'inbound' ? (contact?.name || contact?.wa_id || 'Contact') : 'You',
            sender_avatar: msg.direction === 'inbound' ? contact?.profile_picture_url : undefined,
            created_at: msg.timestamp || msg.created_at,
            delivery_status: (msg.recipient_status || msg.status) as Message['delivery_status'],
            channel: 'whatsapp',
            type: messageType,
            media_url: content.image?.link || content.video?.link || content.audio?.link || content.document?.link,
            media_id: content.image?.id || content.video?.id || content.audio?.id || content.document?.id,
        };
    });

    return messages;
};

export const useMessages = (conversationId: string | null) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['messages', conversationId],
        queryFn: () => fetchMessages(conversationId!),
        enabled: !!conversationId,
        staleTime: 1000 * 60,
    });

    useEffect(() => {
        if (!conversationId) return;

        let channel: any;
        const organizationId = useAuthStore.getState().organization?.id;

        if (!organizationId) return;

        console.log(`[useMessages] Setting up subscription for Conversation: ${conversationId}`);

        channel = supabase
            .channel(`messages-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'wa_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'wa_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[useMessages] ✅ Subscribed to messages for ${conversationId}`);
                } else {
                    console.warn(`[useMessages] ⚠️ Subscription status for ${conversationId}: ${status}`);
                }
            });

        return () => {
            if (channel) {
                console.log(`[useMessages] Cleaning up subscription for Conversation: ${conversationId}`);
                supabase.removeChannel(channel);
            }
        };
    }, [queryClient, conversationId]);

    return query;
};
