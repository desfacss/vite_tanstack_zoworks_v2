import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type { Message } from '../types';
import { supabase } from '@/core/lib/supabase';

// Re-export from centralized services for backward compatibility
export { uploadMediaToMeta, getOrganizationId } from '@/services/whatsapp';
export type { SendMessageParams, MessageResult, MediaUploadResult } from '@/services/whatsapp';

// Import services for local use
import { 
  sendWhatsAppMessage, 
  getOrganizationId,
  type SendMessageParams 
} from '@/services/whatsapp';

/**
 * React hook for sending WhatsApp messages with optimistic updates
 * Uses centralized whatsapp service under the hood
 */
export const useSendMessage = (conversationId?: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: Omit<SendMessageParams, 'conversationId'> & { conversationId?: string }) => {
            const convId = params.conversationId || conversationId;
            if (!convId) {
                throw new Error('No conversation selected');
            }
            return sendWhatsAppMessage({ ...params, conversationId: convId });
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

/**
 * Update conversation status using centralized service
 */
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

/**
 * React hook for updating conversation status
 */
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
