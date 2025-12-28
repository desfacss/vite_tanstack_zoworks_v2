import React, { useState, useRef } from 'react';
import { Button, Popover, List, Typography, Tag, Mentions, Tooltip, Dropdown, theme } from 'antd';
import {
    Paperclip,
    XCircle,
    Clock,
    Grid3X3,
    Image,
    Video,
    FileText,
    Code,
    Plus,
    Send
} from 'lucide-react';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface MessageInputAreaProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onAttach: (file: File, type: 'image' | 'video' | 'document') => void;
    onTemplateClick: () => void;
    variables?: any[];
    quickReplies?: any[];
    templates?: any[];
    pendingAttachment: { type: string; url: string; file?: File } | null;
    onClearAttachment: () => void;
    replyingToMessage?: any;
    onCancelReply?: () => void;
    scheduledDate?: Date | null;
    onScheduledDateChange?: (date: Date | null) => void;
    isBulk?: boolean;
    isMobile?: boolean;
    onSelectTemplate?: (template: any) => void;
    onSelectQuickReply?: (reply: any) => void;
    onCancelSchedule?: () => void;
}

export const MessageInputArea: React.FC<MessageInputAreaProps> = ({
    value,
    onChange,
    onSend,
    onAttach,
    onTemplateClick,
    variables = [],
    quickReplies = [],
    templates = [],
    pendingAttachment,
    onClearAttachment,
    replyingToMessage,
    onCancelReply,
    scheduledDate,
    isBulk = false,
    isMobile = false,
    onSelectTemplate,
    onSelectQuickReply,
    onCancelSchedule
}) => {
    const { token } = theme.useToken();
    const [mentionsPrefix, setMentionsPrefix] = useState('@');

    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
        const file = e.target.files?.[0];
        if (file) {
            onAttach(file, type);
        }
        e.target.value = '';
    };

    const getMentionsOptions = () => {
        if (mentionsPrefix === '@') {
            return (variables || []).map((v: any) => ({
                value: v.variable_syntax,
                label: v.name,
                key: v.id
            }));
        }
        if (mentionsPrefix === '#') {
            return (quickReplies || []).map((r: any) => ({
                value: r.content,
                label: r.title,
                key: r.id,
                originalReply: r
            }));
        }
        if (mentionsPrefix === '/') {
            return (templates || []).map((t: any) => ({
                value: '',
                label: t.name,
                key: t.id
            }));
        }
        return [];
    };

    return (
        <div style={{
            padding: 12,
            background: token.colorBgLayout === '#000000' ? '#1e2329' : '#f0f0f0',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: isBulk ? 8 : 0
        }}>
            {/* Attachment Preview */}
            {pendingAttachment && (
                <div style={{
                    marginBottom: 8,
                    padding: 8,
                    background: token.colorFillQuaternary,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {pendingAttachment.type === 'image' ? (
                            <img src={pendingAttachment.url} alt="Attachment" style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: 4 }} />
                        ) : (
                            <Paperclip size={16} />
                        )}
                        <Text ellipsis style={{ maxWidth: 200 }}>{pendingAttachment.file?.name || 'Attachment'}</Text>
                        <Tag>{pendingAttachment.type}</Tag>
                    </div>
                    <Button
                        type="text"
                        size="small"
                        icon={<XCircle size={16} />}
                        onClick={onClearAttachment}
                    />
                </div>
            )}

            {/* Reply Preview Banner */}
            {!isBulk && replyingToMessage && (
                <div style={{
                    marginBottom: 8,
                    padding: '8px 12px',
                    background: token.colorFillQuaternary,
                    borderLeft: `4px solid ${token.colorPrimary}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: 4,
                    margin: '0 12px'
                }}>
                    <div style={{ overflow: 'hidden' }}>
                        <Text strong style={{ color: token.colorPrimary, fontSize: 12, display: 'block' }}>
                            Replying to {replyingToMessage.sender_name}
                        </Text>
                        <Paragraph ellipsis={{ rows: 1 }} style={{ margin: 0, fontSize: 12, color: token.colorTextSecondary }}>
                            {typeof replyingToMessage.content === 'string'
                                ? replyingToMessage.content
                                : (replyingToMessage.content?.body || 'Media message')}
                        </Paragraph>
                    </div>
                    <Button
                        type="text"
                        size="small"
                        icon={<XCircle size={16} />}
                        onClick={onCancelReply}
                    />
                </div>
            )}

            {/* Schedule Preview Banner */}
            {scheduledDate && (
                <div style={{
                    marginBottom: 8,
                    padding: '8px 12px',
                    background: token.colorFillQuaternary,
                    borderLeft: `4px solid ${token.colorWarning}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: 4,
                    margin: '0 12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} style={{ color: token.colorWarning }} />
                        <div>
                            <Text strong style={{ color: token.colorWarning, fontSize: 12, display: 'block' }}>
                                Schedule Message
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Will be sent on {dayjs(scheduledDate).format('MMM D, h:mm A')}
                            </Text>
                        </div>
                    </div>
                    <Button
                        type="text"
                        size="small"
                        icon={<XCircle size={16} />}
                        onClick={onCancelSchedule}
                    />
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                {!isMobile && (
                    <>
                        <Tooltip title="Templates">
                            <Button type="text" icon={<Grid3X3 size={18} />} onClick={onTemplateClick} />
                        </Tooltip>

                        <Dropdown
                            menu={{
                                items: [
                                    { key: 'image', label: 'Image', icon: <Image size={16} />, onClick: () => imageInputRef.current?.click() },
                                    { key: 'video', label: 'Video', icon: <Video size={16} />, onClick: () => videoInputRef.current?.click() },
                                    { key: 'document', label: 'Document', icon: <FileText size={16} />, onClick: () => docInputRef.current?.click() },
                                ]
                            }}
                            trigger={['click']}
                        >
                            <Button type="text" icon={<Paperclip size={18} />} />
                        </Dropdown>
                    </>
                )}

                {/* Hidden Inputs */}
                <input
                    ref={imageInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'image')}
                    accept="image/*"
                />
                <input
                    ref={videoInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'video')}
                    accept="video/*"
                />
                <input
                    ref={docInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'document')}
                    accept=".pdf,.doc,.docx,.txt"
                />

                {!isMobile && (
                    <Popover
                        content={
                            <div style={{ maxHeight: 300, overflow: 'auto', width: 300 }}>
                                <List
                                    size="small"
                                    dataSource={variables || []}
                                    renderItem={(item: any) => (
                                        <List.Item
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                onChange(value + item.variable_syntax);
                                            }}
                                        >
                                            <List.Item.Meta
                                                title={<Text code>{item.variable_syntax}</Text>}
                                                description={item.name}
                                            />
                                        </List.Item>
                                    )}
                                />
                            </div>
                        }
                        title="Insert Variable"
                        trigger="click"
                    >
                        <Button icon={<Code size={18} />} type="text" />
                    </Popover>
                )}

                {/* Message Input */}
                <div style={{
                    padding: isMobile ? '6px 8px' : '10px 16px',
                    background: token.colorBgLayout === '#000000' ? '#1e2329' : '#f0f0f0',
                    borderTop: isMobile ? `1px solid ${token.colorBorderSecondary}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: isMobile ? 50 : 62,
                    flex: 1,
                    width: '100%',
                    borderRadius: isBulk ? 8 : 0
                }}>
                    {isMobile && <Button type="text" icon={<Plus size={24} style={{ color: '#54656f' }} />} onClick={() => imageInputRef.current?.click()} />}

                    <div style={{
                        flex: 1,
                        background: token.colorBgLayout === '#000000' ? '#2a3942' : 'white',
                        borderRadius: 24,
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        minHeight: 40
                    }}>
                        <Mentions
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            popupClassName={isMobile ? "mobile-mentions-popup" : ""}
                            placeholder="Type a message"
                            value={value}
                            onChange={(val) => {
                                onChange(val);
                            }}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    onSend();
                                }
                            }}
                            filterOption={(input, option: any) =>
                                (option?.label || '').toLowerCase().includes(input.toLowerCase()) ||
                                (option?.value || '').toLowerCase().includes(input.toLowerCase())
                            }
                            prefix={['@', '#', '/']}
                            onSearch={(_, prefix) => setMentionsPrefix(prefix)}
                            onSelect={(option: any, prefix) => {
                                if (prefix === '/' && onSelectTemplate) {
                                    const template = templates?.find((t: any) => t.id === option.key);
                                    if (template) onSelectTemplate(template);
                                } else if (prefix === '#' && onSelectQuickReply) {
                                    const reply = quickReplies?.find((r: any) => r.id === option.key);
                                    if (reply) onSelectQuickReply(reply);
                                }
                            }}
                            notFoundContent={
                                <div style={{ padding: '8px', textAlign: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                                        {mentionsPrefix === '@' && 'No variables found'}
                                        {mentionsPrefix === '#' && 'No quick replies found'}
                                        {mentionsPrefix === '/' && 'No templates found'}
                                    </Text>
                                </div>
                            }
                            options={getMentionsOptions()}
                            style={{ background: 'transparent', border: 'none', boxShadow: 'none', width: '100%' }}
                        />
                    </div>

                    {!isBulk && (
                        <Button
                            type="text"
                            icon={<Send size={24} style={{ color: value || pendingAttachment ? '#00a884' : '#8696a0' }} />}
                            onClick={onSend}
                            disabled={!value && !pendingAttachment}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
