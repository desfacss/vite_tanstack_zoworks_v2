import React, { useRef, useEffect, useState } from 'react';
import {
    Layout, List, Avatar, Typography, Tag, Input, Button, Space,
    Tabs, Badge, Empty, Spin, Tooltip, Dropdown, Drawer, App,
    Descriptions, Select, Checkbox, theme
} from 'antd';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/core/lib/store';
import {
    Search, User, MoreVertical, Check, ArrowLeft, Tags,
    MessageCircle, XCircle, Clock, Phone,
    MessageSquare, Info, Plus
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Module styles
import '../index.css';

import { MessageBubble } from '../components/MessageBubble';
import { MessageInputArea } from '../components/MessageInputArea';
import { useInboxStore } from '../store/inboxStore';
import {
    useConversations,
    useMessages,
    useSendMessage,
    useConversationActions,
    useContactForConversation,
    useContactStats,
    useUpdateContactTags,
    useConversationCounts,
    useResponsive,
} from '../hooks';
import type { Conversation } from '../types';
import { useAuthedLayoutConfig } from '@/core/components/Layout/AuthedLayoutContext';

dayjs.extend(relativeTime);

const { Content } = Layout;
const { Text, Title, Paragraph } = Typography;
const { useToken } = theme;

// Conversation List Item Component
const ConversationItem: React.FC<{
    conversation: Conversation;
    isSelected: boolean;
    onClick: () => void;
    selectionMode?: boolean;
    isChecked?: boolean;
    onToggleCheck?: () => void;
}> = ({ conversation, isSelected, onClick, selectionMode, isChecked, onToggleCheck }) => {
    const { token } = useToken();
    return (
        <List.Item
            onClick={onClick}
            className={`wa-conversation-item ${isSelected ? 'selected' : ''}`}
            style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`
            }}
        >
            {selectionMode && (
                <Checkbox
                    checked={isChecked}
                    style={{ marginRight: 12 }}
                    onClick={(e) => e.stopPropagation()}
                    onChange={onToggleCheck}
                />
            )}
            <List.Item.Meta
                avatar={
                    <Avatar size={48} src={conversation.participant_avatar} icon={<User size={20} />}>
                        {conversation.participant_name[0]}
                    </Avatar>
                }
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Text strong style={{ fontSize: 16, color: token.colorText }}>
                            {conversation.participant_name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, color: conversation.unread_count > 0 ? token.colorPrimary : token.colorTextSecondary }}>
                            {dayjs(conversation.last_message_at).format('h:mm A')}
                        </Text>
                    </div>
                }
                description={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Paragraph
                            ellipsis={{ rows: 1 }}
                            style={{
                                margin: 0,
                                fontSize: 14,
                                color: token.colorTextSecondary,
                                maxWidth: '85%'
                            }}
                        >
                            {conversation.last_message}
                        </Paragraph>
                        {conversation.unread_count > 0 && (
                            <Badge
                                count={conversation.unread_count}
                                style={{ backgroundColor: '#25D366', color: '#fff' }}
                            />
                        )}
                    </div>
                }
            />
        </List.Item>
    );
};

// Contact Details Panel Component
const ContactDetailsPanel: React.FC<{
    conversationId: string | null;
    visible: boolean;
    onClose: () => void;
    assigneeId?: string;
    onAssign: (agentId: string | null) => void;
    teamMembers: any[];
}> = ({ conversationId, visible, onClose, assigneeId, onAssign, teamMembers }) => {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const { data: contact, isLoading, refetch } = useContactForConversation(conversationId);
    const { conversationCount, messageCount } = useContactStats(contact?.id || null);
    const updateTags = useUpdateContactTags();
    const { drawerWidth } = useResponsive();

    const [newTag, setNewTag] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);

    const handleAddTag = async () => {
        if (!contact?.id || !newTag.trim()) return;
        try {
            await updateTags.mutateAsync({
                contactId: contact.id,
                tagsToAdd: [newTag.trim()]
            });
            setNewTag('');
            setShowTagInput(false);
            refetch();
            message.success(`Tag "${newTag.trim()}" added!`);
        } catch (e) {
            message.error('Failed to add tag');
        }
    };

    const handleRemoveTag = async (tag: string) => {
        if (!contact?.id) return;
        try {
            await updateTags.mutateAsync({
                contactId: contact.id,
                tagsToRemove: [tag]
            });
            refetch();
            message.success(`Tag "${tag}" removed`);
        } catch (e) {
            message.error('Failed to remove tag');
        }
    };

    if (!visible) return null;

    return (
        <Drawer
            title="Contact Details"
            placement="right"
            onClose={onClose}
            open={visible}
            width={drawerWidth}
            styles={{ body: { padding: 0, overflow: 'auto' } }}
        >
            <div style={{ padding: 24 }}>
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                        <Spin />
                    </div>
                ) : contact ? (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Avatar size={80} src={contact.profile_picture_url} icon={<User size={32} />}>
                                {contact.name[0]}
                            </Avatar>
                            <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
                                {contact.name}
                            </Title>
                            <Text type="secondary">
                                <Phone size={14} style={{ marginRight: 4 }} /> {contact.wa_id}
                            </Text>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Assignee</Text>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Assign to..."
                                value={assigneeId}
                                onChange={onAssign}
                                allowClear
                                options={teamMembers.map(member => ({
                                    label: member.name || member.email,
                                    value: member.id,
                                }))}
                            />
                        </div>

                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label={<><MessageSquare size={14} /> Conversations</>}>
                                {conversationCount}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><MessageSquare size={14} /> Messages</>}>
                                {messageCount}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><Info size={14} /> Opt-in Status</>}>
                                <Tag color={contact.opt_in_status ? 'green' : 'red'}>
                                    {contact.opt_in_status ? 'Opted In' : 'Opted Out'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Created">
                                {dayjs(contact.created_at).format('MMM D, YYYY')}
                            </Descriptions.Item>
                        </Descriptions>

                        <div style={{ marginTop: 16, padding: '12px', background: token.colorFillQuaternary, borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text strong><Tags size={14} /> Tags</Text>
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<Plus size={14} />}
                                    onClick={() => setShowTagInput(true)}
                                >
                                    Add Tag
                                </Button>
                            </div>

                            {showTagInput && (
                                <div style={{ marginBottom: 8 }}>
                                    <Space.Compact style={{ width: '100%' }}>
                                        <Input
                                            placeholder="Enter tag name"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onPressEnter={handleAddTag}
                                            size="small"
                                        />
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<Check size={14} />}
                                            onClick={handleAddTag}
                                            loading={updateTags.isPending}
                                        />
                                        <Button
                                            size="small"
                                            icon={<XCircle size={14} />}
                                            onClick={() => { setShowTagInput(false); setNewTag(''); }}
                                        />
                                    </Space.Compact>
                                </div>
                            )}

                            <Space size={4} wrap>
                                {contact.tags && contact.tags.length > 0 ? (
                                    contact.tags.map((tag: string) => (
                                        <Tag
                                            key={tag}
                                            color="blue"
                                            closable
                                            onClose={(e) => {
                                                e.preventDefault();
                                                handleRemoveTag(tag);
                                            }}
                                        >
                                            {tag}
                                        </Tag>
                                    ))
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 12 }}>No tags yet</Text>
                                )}
                            </Space>
                        </div>
                    </div>
                ) : (
                    <Empty description="No contact information" />
                )}
            </div>
        </Drawer>
    );
};

// Main Inbox Page Component
const InboxPage: React.FC = () => {
    const {
        selectedConversationId,
        setSelectedConversationId,
    } = useInboxStore();

    const [isContactPanelVisible, setIsContactPanelVisible] = useState(false);
    const [filters, setFilters] = useState<any>({});
    const { setConfig } = useAuthedLayoutConfig();
    const { isMobile } = useResponsive();

    const { token } = theme.useToken();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Enable fullScreen mode when a conversation is selected
        // This hides header, sider, and padding for an immersive chat experience
        if (selectedConversationId) {
            setConfig({ fullScreen: true });
        } else {
            setConfig({ fullScreen: false });
        }

        // Ensure it's shown again when leaving the page
        return () => setConfig({ fullScreen: false });
    }, [selectedConversationId, setConfig]);

    const { organization } = useAuthStore();
    useEffect(() => {
        if (organization) {
            console.log(`[InboxPage] Active Org: ${organization.id} (${organization.name})`);
        }
    }, [organization]);

    const toggleContactPanel = () => setIsContactPanelVisible(!isContactPanelVisible);

    const { data: conversationsData = [], isLoading: isLoadingConversations } = useConversations({
        status: filters.status,
        assignee: filters.assignee,
        search: filters.search
    });

    const { data: counts = { all: 0, open: 0, closed: 0, snoozed: 0 } } = useConversationCounts();
    const { data: messagesData = [], isLoading: isLoadingMessages } = useMessages(selectedConversationId);

    useEffect(() => {
        if (selectedConversationId && conversationsData.length > 0) {
            const exists = conversationsData.some((c: Conversation) => c.id === selectedConversationId);
            if (!exists) {
                console.warn(`[InboxPage] Selected conversation ${selectedConversationId} not found. Clearing.`);
                setSelectedConversationId(null);
            }
        }
    }, [conversationsData, selectedConversationId, setSelectedConversationId]);

    const selectedConversation = conversationsData.find((c: Conversation) => c.id === selectedConversationId);

    const sendMessage = useSendMessage(selectedConversationId);

    const {
        close: closeConversation,
        snooze: snoozeConversation,
        assign: assignConversation,
        teamMembers
    } = useConversationActions(selectedConversationId);

    const [searchValue, setSearchValue] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [pendingAttachment, setPendingAttachment] = useState<{ type: string; url: string; file?: File } | null>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messagesData]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() && !pendingAttachment) return;

        try {
            await sendMessage.mutateAsync({
                content: messageInput,
                type: pendingAttachment ? pendingAttachment.type as any : 'text',
                mediaUrl: pendingAttachment?.url,
            });
            setMessageInput('');
            setPendingAttachment(null);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleAttach = (file: File, type: 'image' | 'video' | 'document') => {
        const url = URL.createObjectURL(file);
        setPendingAttachment({ type, url, file });
    };

    const actionMenuItems: MenuProps['items'] = [
        {
            key: 'close',
            label: 'Close Conversation',
            icon: <Check size={14} />,
            onClick: () => closeConversation(),
        },
        {
            key: 'snooze',
            label: 'Snooze',
            icon: <Clock size={14} />,
            onClick: () => snoozeConversation(),
        },
    ];

    const tabItems = [
        { key: 'all', label: <Badge count={counts.all} offset={[10, 0]}>All</Badge> },
        { key: 'open', label: <Badge count={counts.open} offset={[10, 0]}>Open</Badge> },
        { key: 'closed', label: <Badge count={counts.closed} offset={[10, 0]}>Closed</Badge> },
        { key: 'snoozed', label: <Badge count={counts.snoozed} offset={[10, 0]}>Snoozed</Badge> },
    ];

    // Mobile: Show only chat when conversation selected
    if (isMobile && selectedConversationId) {
        return (
            <div className="wa-inbox-page">
                <App>
                    <Layout style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Chat Header */}
                        <div style={{
                            padding: '12px 16px',
                            background: token.colorBgElevated,
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            <Button
                                type="text"
                                icon={<ArrowLeft size={20} />}
                                onClick={() => setSelectedConversationId(null)}
                            />
                            <Avatar src={selectedConversation?.participant_avatar} icon={<User size={16} />}>
                                {selectedConversation?.participant_name[0]}
                            </Avatar>
                            <div style={{ flex: 1 }}>
                                <Text strong>{selectedConversation?.participant_name}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {selectedConversation?.status}
                                </Text>
                            </div>
                            <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
                                <Button type="text" icon={<MoreVertical size={20} />} />
                            </Dropdown>
                        </div>

                        {/* Messages */}
                        <Content className="wa-chat-messages" style={{ padding: '16px 0' }}>
                            {isLoadingMessages ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                    <Spin />
                                </div>
                            ) : messagesData.length === 0 ? (
                                <Empty description="No messages yet" style={{ marginTop: 40 }} />
                            ) : (
                                messagesData.map((msg: any) => (
                                    <MessageBubble key={msg.id} message={msg} />
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </Content>

                        {/* Message Input */}
                        <MessageInputArea
                            value={messageInput}
                            onChange={setMessageInput}
                            onSend={handleSendMessage}
                            onAttach={handleAttach}
                            onTemplateClick={() => { }}
                            pendingAttachment={pendingAttachment}
                            onClearAttachment={() => setPendingAttachment(null)}
                            isMobile={true}
                        />
                    </Layout>
                </App>
            </div>
        );
    }

    return (
        <div className="wa-inbox-page">
            <App>
                <Layout style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
                    {/* Conversation List - Left Panel */}
                    <div className="wa-conversations-panel" style={{ width: isMobile ? '100%' : undefined }}>
                        {/* Search */}
                        <div style={{ padding: 16 }}>
                            <Input
                                placeholder="Search conversations..."
                                prefix={<Search size={16} style={{ color: token.colorTextSecondary }} />}
                                value={searchValue}
                                onChange={(e) => {
                                    setSearchValue(e.target.value);
                                    setFilters({ ...filters, search: e.target.value });
                                }}
                                style={{ borderRadius: 8 }}
                            />
                        </div>

                        {/* Tabs */}
                        <Tabs
                            items={tabItems}
                            activeKey={filters.status || 'all'}
                            onChange={(key) => setFilters({ ...filters, status: key === 'all' ? undefined : key })}
                            style={{ padding: '0 16px' }}
                        />

                        {/* Conversation List */}
                        <div className="wa-inbox-conversations">
                            {isLoadingConversations ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                    <Spin />
                                </div>
                            ) : conversationsData.length === 0 ? (
                                <Empty description="No conversations" style={{ marginTop: 40 }} />
                            ) : (
                                <List
                                    dataSource={conversationsData}
                                    renderItem={(conversation: Conversation) => (
                                        <ConversationItem
                                            key={conversation.id}
                                            conversation={conversation}
                                            isSelected={conversation.id === selectedConversationId}
                                            onClick={() => setSelectedConversationId(conversation.id)}
                                        />
                                    )}
                                />
                            )}
                        </div>
                    </div>

                    {/* Chat Area - Right Panel (Desktop only) */}
                    {!isMobile && (
                        <div className="wa-chat-panel">
                            {selectedConversationId ? (
                                <>
                                    {/* Chat Header - Fixed */}
                                    <div className="wa-chat-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <Avatar src={selectedConversation?.participant_avatar} icon={<User size={16} />}>
                                                {selectedConversation?.participant_name[0]}
                                            </Avatar>
                                            <div>
                                                <Text strong>{selectedConversation?.participant_name}</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {selectedConversation?.participant_phone}
                                                </Text>
                                            </div>
                                        </div>
                                        <Space>
                                            <Tooltip title="Contact Info">
                                                <Button
                                                    type="text"
                                                    icon={<User size={18} />}
                                                    onClick={toggleContactPanel}
                                                />
                                            </Tooltip>
                                            <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
                                                <Button type="text" icon={<MoreVertical size={18} />} />
                                            </Dropdown>
                                        </Space>
                                    </div>

                                    {/* Messages - Scrollable with WA background */}
                                    <div className="wa-chat-messages">
                                        {isLoadingMessages ? (
                                            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                                <Spin />
                                            </div>
                                        ) : messagesData.length === 0 ? (
                                            <Empty description="No messages yet" style={{ marginTop: 40 }} />
                                        ) : (
                                            messagesData.map((msg: any) => (
                                                <MessageBubble key={msg.id} message={msg} />
                                            ))
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message Input - Fixed at bottom */}
                                    <div className="wa-chat-input">
                                        <MessageInputArea
                                            value={messageInput}
                                            onChange={setMessageInput}
                                            onSend={handleSendMessage}
                                            onAttach={handleAttach}
                                            onTemplateClick={() => { }}
                                            pendingAttachment={pendingAttachment}
                                            onClearAttachment={() => setPendingAttachment(null)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="wa-empty-chat">
                                    <Empty
                                        image={<MessageCircle size={64} style={{ color: token.colorTextSecondary }} />}
                                        description={
                                            <Text type="secondary">Select a conversation to start messaging</Text>
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contact Details Panel */}
                    <ContactDetailsPanel
                        conversationId={selectedConversationId}
                        visible={isContactPanelVisible}
                        onClose={() => setIsContactPanelVisible(false)}
                        assigneeId={selectedConversation?.assignee_id}
                        onAssign={(agentId) => assignConversation(agentId)}
                        teamMembers={teamMembers}
                    />
                </Layout>
            </App>
        </div>
    );
};

export default InboxPage;
