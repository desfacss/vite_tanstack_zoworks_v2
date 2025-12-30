// WhatsApp Service Types

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';

export interface SendMessageParams {
  conversationId: string;
  content: string;
  type?: MessageType;
  mediaUrl?: string;
  mediaId?: string;
  replyToMessageId?: string;
}

export interface MessageResult {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: 'user' | 'contact';
  sender_name: string;
  created_at: string;
  delivery_status: string;
  channel: 'whatsapp';
  type: MessageType;
  media_url?: string;
}

export interface MediaUploadResult {
  id: string;
}

export interface ConversationUpdateParams {
  conversationId: string;
  status?: string;
  assigneeId?: string;
}
