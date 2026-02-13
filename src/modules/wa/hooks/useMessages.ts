import { useAuthStore } from '@/core/lib/store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Message } from '../types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

// Helper function to extract message body from content
const extractMessageBody = (content: any): string => {
    if (typeof content === 'string') return content;
    if (!content) return '';

    // Try different content structures
    if (content.body) return content.body;
    if (content.text?.body) return content.text.body;
    if (content.image?.caption) return content.image.caption || '[Image]';
    if (content.video?.caption) return content.video.caption || '[Video]';
    if (content.audio) return '[Audio]';
    if (content.document?.filename) return content.document.filename || '[Document]';
    if (content.template?.name) return `Template: ${content.template.name}`;
    if (content.interactive?.body?.text) return content.interactive.body.text;
    if (content.button?.text) return content.button.text;
    if (content.type === 'button' && content.button?.text) return content.button.text;

    return '[Message]';
};

// Helper function to determine message type
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
    const organizationId = useAuthStore.getState().organization?.id;

    const { data, error } = await supabase
        .schema('wa')
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

    // Transform to frontend format
    const messages: Message[] = (data || []).map((msg: any) => {
        const contact = msg.wa_contacts;
        let content = msg.content || msg.details || {};

        // Parse content if it's a string (it often is from DB)
        if (typeof content === 'string') {
            try {
                content = JSON.parse(content);
                // Handle double-stringified JSON
                if (typeof content === 'string') {
                    try {
                        content = JSON.parse(content);
                    } catch (e) {
                        // It was just a string
                    }
                }
            } catch (e) {
                // It's just a plain string message
                content = { body: content };
            }
        }

        // Use the type from the database if available, otherwise infer from content
        const messageType = msg.type || getMessageType(content);

        // For text messages, we might still want to ensure 'body' is accessible directly if it's a string
        // But for consistency, we'll try to keep the structure.
        // If content is a string, we wrap it.
        const normalizedContent = typeof content === 'string' ? { body: content } : content;

        // Ensure legacy body extraction doesn't lose data, but for rich types we use the whole object
        // If it's a simple text message coming as { body: "msg" }, allow it.

        return {
            id: msg.id,
            conversation_id: msg.conversation_id,
            organization_id: msg.organization_id,
            content: normalizedContent, // Pass the full object
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
        staleTime: 1000 * 60, // 1 minute
    });

    // Set up real-time subscription for new messages
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
                    schema: 'wa',
                    table: 'wa_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                () => {
                    // Invalidate and refetch messages
                    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'wa',
                    table: 'wa_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                () => {
                    // Update message status (e.g., delivered, read)
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
