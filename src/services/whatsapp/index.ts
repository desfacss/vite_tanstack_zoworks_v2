// WhatsApp Service - Re-exports
export {
  uploadMediaToMeta,
  sendWhatsAppMessage,
  updateConversationStatus,
  getOrganizationId,
  getAccessScope,
} from './whatsappService';

export type {
  MessageType,
  SendMessageParams,
  MessageResult,
  MediaUploadResult,
  ConversationUpdateParams,
} from './types';
