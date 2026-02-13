// Re-export all hooks for easy importing
export { useConversations, useConversationCounts } from './useConversations';
export { useMessages } from './useMessages';
export { useContacts, useAccounts, useSegments, useTickets, useContactById, useAccountById } from './useCrmData';
export { useParticipantDetails } from './useParticipantDetails';
export { useTemplates, useCampaigns, useDripSequences, useQuickReplies, useCreateQuickReply, useUpdateQuickReply, useDeleteQuickReply } from './useTemplatesAndCampaigns';
export { useActivityHistory } from './useActivityHistory';
export { useInternalNotes } from './useInternalNotes';

// Supabase-driven hooks
export { useSendMessage, useUpdateConversationStatus } from './useSendMessage';
export {
    useConversationActions,
    useCloseConversation,
    useReopenConversation,
    useSnoozeConversation,
    useAssignAgent,
    useTeamMembers,
} from './useConversationActions';
export { useContactForConversation, useContact, useContactStats, useUpdateContactTags, useAddContactTag, useRemoveContactTag } from './useContactDetails';
export { useWaContacts, useCreateContact, useUpdateContact, useDeleteContact } from './useContacts';

// Drip campaigns and sequences
export * from './useDripCampaigns';
export type { DripCampaign, DripStep, DripEnrollment } from './useDripCampaigns';

// Meta templates
export * from './useMetaTemplates';

// WA Campaigns
export * from './useWaCampaigns';

// Catalog
export * from './useCatalog';

// Responsive utilities
export { useResponsive } from './useResponsive';

