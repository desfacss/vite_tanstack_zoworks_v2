import { create } from 'zustand';
import { InboxState } from '../types';

export const useInboxStore = create<InboxState>((set) => ({
    selectedConversationId: null,
    filters: {},
    isContactPanelVisible: true,
    activeWorkspace: 'inbox',
    crmView: 'contacts',
    marketingView: 'segments',
    selectedContactId: null,
    selectedAccountId: null,
    selectedSegmentId: null,
    selectedCampaignId: null,
    selectedTicketId: null,
    bulkSelectedItems: [],
    panelSizes: {
        left: 380,
        middle: 600,
        right: 320,
    },

    setSelectedConversationId: (id) =>
        set({ selectedConversationId: id }),

    setFilters: (filters) =>
        set((state) => ({
            filters: { ...state.filters, ...filters }
        })),

    toggleContactPanel: () =>
        set((state) => ({
            isContactPanelVisible: !state.isContactPanelVisible
        })),

    setActiveWorkspace: (workspace) =>
        set({
            activeWorkspace: workspace,
            selectedConversationId: null,
            selectedContactId: null,
            selectedAccountId: null,
            selectedSegmentId: null,
            selectedCampaignId: null,
            selectedTicketId: null,
            bulkSelectedItems: [],
        }),

    setCrmView: (view) =>
        set({
            crmView: view,
            selectedContactId: null,
            selectedAccountId: null,
        }),

    setMarketingView: (view) =>
        set({
            marketingView: view,
            selectedSegmentId: null,
            selectedCampaignId: null,
        }),

    setSelectedContactId: (id) =>
        set({ selectedContactId: id }),

    setSelectedAccountId: (id) =>
        set({ selectedAccountId: id }),

    setSelectedSegmentId: (id) =>
        set({ selectedSegmentId: id }),

    setSelectedCampaignId: (id) =>
        set({ selectedCampaignId: id }),

    setSelectedTicketId: (id) =>
        set({ selectedTicketId: id }),

    setBulkSelectedItems: (items) =>
        set({ bulkSelectedItems: items }),

    setPanelSizes: (sizes) =>
        set({ panelSizes: sizes }),
}));
