import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type { Message } from '../types';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

interface SendMessageParams {
    conversationId: string;
    content: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
    mediaUrl?: string;
    mediaId?: string;
    replyToMessageId?: string;
}

const getOrganizationId = async (): Promise<string> => {
    const org = useAuthStore.getState().organization;
    if (!org?.id) throw new Error('No organization selected');
    return org.id;
};

export const uploadMediaToMeta = async (file: File): Promise<{ id: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const organizationId = await getOrganizationId();
        if (organizationId) {
            formData.append('organization_id', organizationId);
        }
    } catch (e) {
        console.warn("[uploadMediaToMeta] Could not get organizationId:", e);
    }

    let metaType = 'document';
    if (file.type.startsWith('image/')) metaType = 'image';
    else if (file.type.startsWith('video/')) metaType = 'video';
    else if (file.type.startsWith('audio/')) metaType = 'audio';

    formData.append('type', metaType);
    formData.append('messaging_product', 'whatsapp');

    const { data, error } = await supabase.functions.invoke('whatsapp-media-upload', {
        body: formData,
    });

    if (error) {
        console.error("Media upload failed:", error);
        let errorMessage = "Media upload failed";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }

    if (!data || !data.id) {
        console.error("Invalid response from media upload:", data);
        throw new Error("Invalid response from media upload");
    }

    return { id: data.id };
};

const sendMessage = async (params: SendMessageParams): Promise<Message> => {
    const organizationId = await getOrganizationId();

    const { data: conversation, error: convError } = await supabase
        .from('wa_conversations')
        .select(`
            id,
            contact_id,
            wa_contacts!wa_conversations_contact_id_fkey (
                id,
                wa_id,
                name
            )
        `)
        .eq('id', params.conversationId)
        .eq('organization_id', organizationId)
        .single();

    if (convError || !conversation) {
        throw new Error('Conversation not found');
    }

    const contact = (conversation as any).wa_contacts;
    if (!contact || !contact.wa_id) {
        throw new Error('Contact WhatsApp ID not found');
    }

    let p_message_content: any = {};
    const messageType = params.type || 'text';

    if (messageType === 'text') {
        p_message_content = {
            body: params.content,
            preview_url: true
        };
    } else if (messageType === 'template') {
        try {
            p_message_content = typeof params.content === 'string'
                ? JSON.parse(params.content)
                : params.content;
        } catch (e) {
            console.error("Failed to parse template content", e);
            throw new Error("Invalid JSON format for template content");
        }
    } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
        if (!params.mediaId && !params.mediaUrl) {
            throw new Error(`Media ID or URL is required for ${messageType}`);
        }

        if (params.mediaId) {
            p_message_content = {
                id: params.mediaId,
                ...(messageType !== 'audio' && { caption: params.content })
            };
        } else {
            p_message_content = {
                link: params.mediaUrl,
                ...(messageType !== 'audio' && { caption: params.content })
            };
        }
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-sender`;

    const requestBody = {
        p_organization_id: organizationId,
        p_contact_wa_id: contact.wa_id,
        p_message_type: messageType,
        p_message_content: p_message_content,
        p_reply_to_message_id: params.replyToMessageId || null
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to send message (${response.status})`);
    }

    const result = await response.json();

    const newMessage: Message = {
        id: result.message_id || `msg_${Date.now()}`,
        conversation_id: params.conversationId,
        content: params.content,
        sender_type: 'user',
        sender_name: 'You',
        created_at: new Date().toISOString(),
        delivery_status: 'sent',
        channel: 'whatsapp',
        type: messageType,
        media_url: params.mediaUrl,
    };

    return newMessage;
};

export const useSendMessage = (conversationId?: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: Omit<SendMessageParams, 'conversationId'> & { conversationId?: string }) => {
            const convId = params.conversationId || conversationId;
            if (!convId) {
                throw new Error('No conversation selected');
            }
            return sendMessage({ ...params, conversationId: convId });
        },
        onMutate: async (params) => {
            const convId = params.conversationId || conversationId;
            if (!convId) return;

            await queryClient.cancelQueries({ queryKey: ['messages', convId] });
            const previousMessages = queryClient.getQueryData(['messages', convId]);

            const optimisticMessage: Message = {
                id: `temp_${Date.now()}`,
                conversation_id: convId,
                content: params.content,
                sender_type: 'user',
                sender_name: 'You',
                created_at: new Date().toISOString(),
                delivery_status: 'sent',
                channel: 'whatsapp',
                type: params.type || 'text',
                media_url: params.mediaUrl
            };

            queryClient.setQueryData(['messages', convId], (old: Message[] = []) => [
                ...old,
                optimisticMessage,
            ]);

            return { previousMessages };
        },
        onError: (err, params, context) => {
            const convId = params.conversationId || conversationId;
            console.error("Send Message Error:", err);
            if (context?.previousMessages && convId) {
                queryClient.setQueryData(['messages', convId], context.previousMessages);
            }
            message.error(err instanceof Error ? err.message : 'Failed to send message');
        },
        onSuccess: (_data, params) => {
            const convId = params.conversationId || conversationId;
            if (convId) {
                queryClient.invalidateQueries({ queryKey: ['messages', convId] });
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
            }
        },
    });
};

const updateConversationStatus = async (params: {
    conversationId: string;
    status?: string;
    assigneeId?: string;
}) => {
    const organizationId = await getOrganizationId();

    const updateData: Record<string, any> = {};
    if (params.status) updateData.status = params.status;
    if (params.assigneeId !== undefined) updateData.assignee_id = params.assigneeId;

    const { error } = await supabase
        .from('wa_conversations')
        .update(updateData)
        .eq('id', params.conversationId)
        .eq('organization_id', organizationId);

    if (error) {
        console.error('Error updating conversation:', error);
        throw error;
    }

    return { success: true };
};

export const useUpdateConversationStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateConversationStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            message.success('Conversation updated');
        },
        onError: () => {
            message.error('Failed to update conversation');
        },
    });
};
