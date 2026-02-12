// WhatsApp Service - Core WhatsApp Business API functionality
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import type { SendMessageParams, MessageResult, MediaUploadResult, ConversationUpdateParams } from './types';

/**
 * Get the current access scope from auth store
 */
export const getAccessScope = () => {
  const { organization, location } = useAuthStore.getState();
  if (!organization?.id) throw new Error('No organization selected');
  return {
    organizationId: organization.id,
    locationId: location?.id
  };
};

/**
 * Get the current organization ID (legacy helper)
 */
export const getOrganizationId = async (): Promise<string> => {
  const { organizationId } = getAccessScope();
  return organizationId;
};

/**
 * Upload media file to Meta's WhatsApp Business API
 * @param file - The file to upload
 * @returns Promise with the media ID
 */
export const uploadMediaToMeta = async (file: File): Promise<MediaUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const { organizationId, locationId } = getAccessScope();
    if (organizationId) {
      formData.append('organization_id', organizationId);
    }
    if (locationId) {
      formData.append('location_id', locationId);
    }
  } catch (e) {
    console.warn('[uploadMediaToMeta] Could not get access scope:', e);
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
    console.error('Media upload failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Media upload failed');
  }

  if (!data || !data.id) {
    console.error('Invalid response from media upload:', data);
    throw new Error('Invalid response from media upload');
  }

  return { id: data.id };
};

/**
 * Send a message via WhatsApp Business API
 * @param params - Message parameters
 * @returns Promise with the sent message
 */
export const sendWhatsAppMessage = async (params: SendMessageParams): Promise<MessageResult> => {
  const { organizationId, locationId } = getAccessScope();

  // Fetch conversation and contact details
  let convQuery = supabase
    .schema('wa').from('wa_conversations')
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
    .eq('organization_id', organizationId);

  if (locationId) {
    convQuery = convQuery.eq('location_id', locationId);
  }

  const { data: conversation, error: convError } = await convQuery.single();

  if (convError || !conversation) {
    throw new Error('Conversation not found');
  }

  const contact = (conversation as any).wa_contacts;
  if (!contact || !contact.wa_id) {
    throw new Error('Contact WhatsApp ID not found');
  }

  // Build message content based on type
  let p_message_content: any = {};
  const messageType = params.type || 'text';

  if (messageType === 'text') {
    p_message_content = {
      body: params.content,
      preview_url: true,
    };
  } else if (messageType === 'template') {
    try {
      p_message_content = typeof params.content === 'string'
        ? JSON.parse(params.content)
        : params.content;
    } catch (e) {
      console.error('Failed to parse template content', e);
      throw new Error('Invalid JSON format for template content');
    }
  } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
    if (!params.mediaId && !params.mediaUrl) {
      throw new Error(`Media ID or URL is required for ${messageType}`);
    }

    if (params.mediaId) {
      p_message_content = {
        id: params.mediaId,
        ...(messageType !== 'audio' && { caption: params.content }),
      };
    } else {
      p_message_content = {
        link: params.mediaUrl,
        ...(messageType !== 'audio' && { caption: params.content }),
      };
    }
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-sender`;

  const requestBody = {
    p_organization_id: organizationId,
    p_location_id: locationId || null,
    p_contact_wa_id: contact.wa_id,
    p_message_type: messageType,
    p_message_content: p_message_content,
    p_reply_to_message_id: params.replyToMessageId || null,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to send message (${response.status})`);
  }

  const result = await response.json();

  return {
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
};

/**
 * Update conversation status or assignee
 * @param params - Update parameters
 * @returns Promise with success status
 */
export const updateConversationStatus = async (
  params: ConversationUpdateParams
): Promise<{ success: boolean }> => {
  const { organizationId, locationId } = getAccessScope();

  const updateData: Record<string, any> = {};
  if (params.status) updateData.status = params.status;
  if (params.assigneeId !== undefined) updateData.assignee_id = params.assigneeId;

  let query = supabase
    .schema('wa').from('wa_conversations')
    .update(updateData)
    .eq('id', params.conversationId)
    .eq('organization_id', organizationId);

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }

  return { success: true };
};
