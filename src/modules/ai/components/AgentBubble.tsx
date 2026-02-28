import React from 'react';
import { Avatar, Typography, Card, Tag, Button, Tooltip } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Copy } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

const { Text } = Typography;

export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    name: string;
    content: string;
    timestamp: string;
    metadata?: {
        agent_key?: string;
        tool_names?: string[];
        view_mode?: 'markdown' | 'tabular' | 'chart';
    };
}

interface AgentBubbleProps {
    message: AgentMessage;
    isSelected?: boolean;
    onClick?: () => void;
}

const AgentBubble: React.FC<AgentBubbleProps> = ({ message, isSelected, onClick }) => {
    const isUser = message.role === 'user';
    const [viewMode, setViewMode] = React.useState<'rendered' | 'source'>('rendered');
    const isClickable = !!onClick && (!isUser || !!(message.v_metadata?.tool_names?.length));

    // Sanitize content to replace long URLs with clickable [Link] text
    const sanitizeContent = (content: string): string => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return content.replace(urlRegex, (url) => {
            if (url.length > 50) {
                return `[🔗 Link](${url})`;
            }
            return url;
        });
    };

    const displayContent = React.useMemo(() => sanitizeContent(message.content), [message.content]);

    // Content detection: Check if content has markdown tables or code
    const hasMarkdown = React.useMemo(() => {
        const content = message.content;
        const hasMarkdownTable = /\|.+\|/.test(content) && /\|[-:]+\|/.test(content);
        const hasCodeBlock = /```/.test(content);
        return hasMarkdownTable || hasCodeBlock;
    }, [message.content]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 12,
                padding: '8px 16px',
                backgroundColor: 'transparent',
                width: '100%',
                marginBottom: 8
            }}
        >
            {/* Avatar with selection indicator */}
            <div
                style={{
                    position: 'relative',
                    cursor: isClickable ? 'pointer' : 'default'
                }}
                onClick={isClickable ? onClick : undefined}
            >
                <Tooltip title={isClickable ? "View execution details" : undefined} placement="left">
                    <Avatar
                        size={34}
                        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
                        style={{
                            backgroundColor: isUser ? '#722ed1' : '#1677ff',
                            flexShrink: 0,
                            marginTop: 4,
                            boxShadow: isSelected && !isUser ? '0 0 0 2px #fff, 0 0 0 4px #1677ff' : 'none',
                            transition: 'all 0.2s',
                        }}
                    />
                </Tooltip>
                {isSelected && !isUser && (
                    <div style={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        width: 12,
                        height: 12,
                        backgroundColor: '#1677ff',
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        zIndex: 2
                    }} />
                )}
            </div>

            {/* Content Card */}
            <Card
                size="small"
                className="agent-bubble-card"
                style={{
                    flex: 1,
                    maxWidth: '85%',
                    backgroundColor: isUser ? '#fafafa' : '#ffffff',
                    borderColor: '#f0f0f0',
                    borderRadius: 12,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
                styles={{
                    body: { padding: '12px 16px' }
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 13, color: '#1f1f1f' }}>
                            {message.name}
                        </Text>
                        {!isUser && (
                            <Tag color="blue" bordered={false} style={{ fontSize: 10, margin: 0 }}>
                                AI
                            </Tag>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {!isUser && hasMarkdown && (
                                <div className="view-toggles" style={{
                                    display: 'flex',
                                    gap: 0,
                                    backgroundColor: '#f5f5f5',
                                    padding: '2px',
                                    borderRadius: 6,
                                    marginRight: 8
                                }}>
                                    <Button
                                        size="small"
                                        type={viewMode === 'rendered' ? 'primary' : 'text'}
                                        style={{
                                            padding: '0 8px',
                                            fontSize: 10,
                                            height: 22,
                                            borderRadius: 4,
                                            boxShadow: viewMode === 'rendered' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setViewMode('rendered'); }}
                                    >
                                        VIEW
                                    </Button>
                                    <Button
                                        size="small"
                                        type={viewMode === 'source' ? 'primary' : 'text'}
                                        style={{
                                            padding: '0 8px',
                                            fontSize: 10,
                                            height: 22,
                                            borderRadius: 4,
                                            boxShadow: viewMode === 'source' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setViewMode('source'); }}
                                    >
                                        SRC
                                    </Button>
                                </div>
                            )}

                            <Tooltip title="Copy message">
                                <Button
                                    size="small"
                                    type="text"
                                    icon={<Copy size={13} className="text-gray-400" />}
                                    style={{ height: 22, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(message.content);
                                    }}
                                />
                            </Tooltip>
                        </div>

                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {message.timestamp}
                        </Text>
                    </div>
                </div>

                {/* Message Content */}
                <div className="message-content">
                    {/* Rendered view: Full markdown */}
                    {viewMode === 'rendered' && <MarkdownRenderer content={displayContent} />}

                    {/* Source view: Raw markdown as code block */}
                    {viewMode === 'source' && (
                        <pre style={{
                            background: '#f5f5f5',
                            padding: 12,
                            borderRadius: 8,
                            fontSize: 12,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: 'Monaco, Consolas, monospace',
                            margin: 0,
                            border: '1px solid #e0e0e0'
                        }}>
                            {message.content}
                        </pre>
                    )}
                </div>

                {/* Tool Usage Badge (Clickable for Data Panel) */}
                {message.v_metadata?.tool_names && message.v_metadata.tool_names.length > 0 && (
                    <div
                        onClick={onClick}
                        style={{
                            marginTop: 12,
                            borderTop: '1px solid #f5f5f5',
                            paddingTop: 8,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: 0.8
                        }}
                        className="hover:opacity-100 hover:bg-gray-50 rounded"
                    >
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            🛠️ {message.v_metadata.tool_names.length} tools: {message.v_metadata.tool_names.slice(0, 3).join(', ')}
                            {message.v_metadata.tool_names.length > 3 && ` +${message.v_metadata.tool_names.length - 3} more`}
                        </Text>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AgentBubble;
