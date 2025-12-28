// WhatsApp Module Types
// Ported from zo_waCRM

export interface Conversation {
    id: string;
    participant_name: string;
    participant_email: string;
    participant_phone?: string;
    participant_avatar?: string;
    last_message: string;
    last_message_at: string;
    channel: 'email' | 'whatsapp';
    status: 'open' | 'closed' | 'snoozed';
    assignee_id?: string;
    assignee_name?: string;
    unread_count: number;
    campaign_id?: string;
    campaign_name?: string;
    participant_id: string;
    participant_type: 'contact' | 'lead' | 'customer';
}

export interface Message {
    id: string;
    conversation_id: string;
    content: string | MessageContent;
    sender_type: 'user' | 'participant';
    sender_name: string;
    sender_avatar?: string;
    created_at: string;
    delivery_status?: 'sent' | 'delivered' | 'read' | 'failed';
    channel: 'email' | 'whatsapp';
    subject?: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive' | 'button' | 'sticker' | 'location' | 'contacts';
    media_url?: string;
    media_id?: string;
    organization_id?: string;
}

export interface MessageContent {
    body?: string;
    type?: string;
    text?: { body: string; preview_url?: boolean };
    image?: { id?: string; link?: string; caption?: string };
    video?: { id?: string; link?: string; caption?: string };
    audio?: { id?: string; link?: string };
    document?: { id?: string; link?: string; filename?: string; caption?: string };
    template?: {
        name: string;
        language: { code: string };
        components?: Array<{
            type: string;
            parameters?: Array<{ type: string; text?: string; image?: any; video?: any }>;
        }>;
    };
    interactive?: {
        type: string;
        body?: { text: string };
        action?: {
            buttons?: Array<{ type: string; reply: { id: string; title: string } }>;
            sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
        };
    };
    context?: { message_id: string };
    button?: { text: string; payload?: string };
}

export interface ParticipantDetails {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    type: 'contact' | 'lead' | 'customer';
    company?: string;
    title?: string;
    created_at: string;
    last_activity_at: string;
    total_conversations: number;
    total_tickets: number;
    lifetime_value?: number;
    lead_score?: number;
    lead_status?: 'new' | 'qualified' | 'unqualified';
    lead_source?: string;
    industry?: string;
    owner_id?: string;
    owner_name?: string;
    account_id?: string;
    account_name?: string;
    account_status?: 'active' | 'inactive' | 'high-value';
    active_deals?: Deal[];
    last_order_date?: string;
    segments?: string[];
    recent_activity?: string;
}

export interface Deal {
    id: string;
    name: string;
    value: number;
    stage: string;
    probability: number;
    close_date: string;
}

export interface ActivityItem {
    id: string;
    type: 'conversation' | 'ticket' | 'campaign' | 'deal' | 'website' | 'call' | 'meeting';
    title: string;
    description: string;
    created_at: string;
    channel?: string;
    status?: string;
    metadata?: Record<string, any>;
}

export interface MessageTemplate {
    id: string;
    name: string;
    subject?: string;
    content: string;
    category: string;
    channel: 'email' | 'whatsapp' | 'both';
    tags: string[];
    language?: string;
    status?: 'pending' | 'approved' | 'rejected';
    components?: any;
    meta_template_id?: string;
    rejection_reason?: string;
}

export interface Campaign {
    id: string;
    name: string;
    type: 'nurture' | 'promotional' | 'onboarding';
    description: string;
    status: 'active' | 'paused' | 'completed';
    participant_count: number;
}

export interface ConversationFilters {
    status?: string;
    assignee?: string;
    channel?: string;
    search?: string;
}

export interface InboxState {
    selectedConversationId: string | null;
    filters: ConversationFilters;
    isContactPanelVisible: boolean;
    activeWorkspace: 'inbox' | 'crm' | 'marketing' | 'support';
    crmView: 'contacts' | 'accounts';
    marketingView: 'segments' | 'campaigns';
    selectedContactId: string | null;
    selectedAccountId: string | null;
    selectedSegmentId: string | null;
    selectedCampaignId: string | null;
    selectedTicketId: string | null;
    bulkSelectedItems: string[];
    panelSizes: {
        left: number;
        middle: number;
        right: number;
    };
    setSelectedConversationId: (id: string | null) => void;
    setFilters: (filters: ConversationFilters) => void;
    toggleContactPanel: () => void;
    setActiveWorkspace: (workspace: 'inbox' | 'crm' | 'marketing' | 'support') => void;
    setCrmView: (view: 'contacts' | 'accounts') => void;
    setMarketingView: (view: 'segments' | 'campaigns') => void;
    setSelectedContactId: (id: string | null) => void;
    setSelectedAccountId: (id: string | null) => void;
    setSelectedSegmentId: (id: string | null) => void;
    setSelectedCampaignId: (id: string | null) => void;
    setSelectedTicketId: (id: string | null) => void;
    setBulkSelectedItems: (items: string[]) => void;
    setPanelSizes: (sizes: { left: number; middle: number; right: number }) => void;
}

export interface QuickReply {
    id: string;
    title: string;
    content: string;
    shortcut?: string;
    category: string;
    usage_count: number;
    created_at: string;
    media_url?: string;
    media_type?: string;
}

export interface WaContact {
    id: string;
    name: string;
    wa_id: string;
    phone?: string;
    email?: string;
    profile_picture_url?: string;
    tags?: string[];
    opt_in_status?: boolean;
    created_at: string;
    updated_at?: string;
    organization_id: string;
}
