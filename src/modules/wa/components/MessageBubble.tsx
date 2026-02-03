import React, { useMemo, useState, useEffect } from 'react';
import { Avatar, Typography, Image, Space, Card, Button, Spin, theme } from 'antd';
import {
    CheckCircle,
    FileText,
    Loader2,
    User,
    Phone,
    MapPin,
    FileType,
    FileSpreadsheet,
    FileIcon,
    Archive
} from 'lucide-react';
import dayjs from 'dayjs';
import type { Message } from '../types';
import { supabase } from '@/core/lib/supabase';

const { Text, Paragraph, Link } = Typography;

interface MessageBubbleProps {
    message: Message;
    onReply?: (message: Message) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
    sent: <CheckCircle size={12} style={{ color: '#8696a0' }} />,
    delivered: <CheckCircle size={12} style={{ color: '#8696a0' }} />,
    read: <CheckCircle size={12} style={{ color: '#53bdeb' }} />,
};

const Linkify = ({ text }: { text: string }) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <>
            {parts.map((part: string, i: number) =>
                part.match(urlRegex) ? (
                    <Link key={i} href={part} target="_blank" rel="noopener noreferrer">
                        {part}
                    </Link>
                ) : (
                    part
                )
            )}
        </>
    );
};

const MediaContent = ({ type, content, message }: { type: string, content: any, message: Message }) => {
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const initialUrl = content?.[type]?.link || message.media_url;
    const mediaId = content?.[type]?.id;

    useEffect(() => {
        if (initialUrl) {
            setMediaUrl(initialUrl);
            return;
        }

        if (mediaId && !mediaUrl) {
            setLoading(true);
            const fetchMedia = async () => {
                try {
                    const { data, error } = await supabase.functions.invoke('get-media-url', {
                        body: {
                            media_id: mediaId,
                            organization_id: message.organization_id
                        }
                    });

                    if (error) throw error;

                    if (data instanceof Blob) {
                        const url = URL.createObjectURL(data);
                        setMediaUrl(url);
                    } else {
                        console.error("Unexpected response format", data);
                        setError(true);
                    }
                } catch (err) {
                    console.error("Failed to fetch media:", err);
                    setError(true);
                } finally {
                    setLoading(false);
                }
            };
            fetchMedia();
        }
    }, [initialUrl, mediaId, message.organization_id]);

    if (loading) return <Spin indicator={<Loader2 size={24} className="animate-spin" />} />;
    if (error) return <Text type="danger">Failed to load media</Text>;
    if (!mediaUrl) return <Text type="secondary">No media available</Text>;

    if (type === 'image') {
        return (
            <div>
                <Image
                    src={mediaUrl}
                    alt="Image"
                    style={{ borderRadius: 8, maxHeight: 300, objectFit: 'cover' }}
                />
                {content?.image?.caption && (
                    <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                        <Linkify text={content.image.caption} />
                    </Paragraph>
                )}
            </div>
        );
    }

    if (type === 'video') {
        return (
            <div>
                <video
                    src={mediaUrl}
                    controls
                    style={{ width: '100%', borderRadius: 8, maxHeight: 300 }}
                />
                {content?.video?.caption && (
                    <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                        <Linkify text={content.video.caption} />
                    </Paragraph>
                )}
            </div>
        );
    }

    if (type === 'audio') {
        return (
            <audio
                src={mediaUrl}
                controls
                style={{ width: '100%', marginTop: 4 }}
            />
        );
    }

    if (type === 'sticker') {
        return (
            <Image
                src={mediaUrl}
                alt="Sticker"
                width={120}
                preview={false}
                style={{ marginBottom: 4 }}
            />
        );
    }

    if (type === 'document') {
        const filename = content?.document?.filename || 'Document';
        const extension = filename.split('.').pop()?.toLowerCase();

        let Icon = FileText;
        let iconColor = '#54656f';

        if (extension === 'pdf') { Icon = FileType; iconColor = '#ff4d4f'; }
        else if (['xls', 'xlsx', 'csv'].includes(extension || '')) { Icon = FileSpreadsheet; iconColor = '#52c41a'; }
        else if (['doc', 'docx'].includes(extension || '')) { Icon = FileIcon; iconColor = 'var(--color-primary)'; }
        else if (['zip', 'rar'].includes(extension || '')) { Icon = Archive; iconColor = '#faad14'; }

        return (
            <Card
                size="small"
                style={{
                    background: token.colorFillQuaternary,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    marginTop: 4
                }}
                styles={{ body: { padding: '12px' } }}
            >
                <Space align="center" size={12}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                        <Icon size={20} style={{ color: iconColor }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong style={{ fontSize: 13, lineHeight: 1.2 }}>{filename}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {extension?.toUpperCase()} • <Link href={mediaUrl} target="_blank" style={{ color: 'inherit', textDecoration: 'underline' }}>Download</Link>
                        </Text>
                    </div>
                </Space>
            </Card>
        );
    }

    return null;
};

export const MessageBubble = ({ message, onReply }: MessageBubbleProps) => {
    const { token } = theme.useToken();
    const isDarkMode = token.colorBgLayout !== '#ffffff' && token.colorBgLayout !== '#f8faf9' && token.colorBgLayout !== '#fafafa';
    const isSent = message.sender_type === 'user';

    let content: any = message.content;

    if (typeof message.content === 'string') {
        try {
            content = JSON.parse(message.content);
            if (typeof content === 'string') {
                try {
                    content = JSON.parse(content);
                } catch (e) {
                    // Plain string
                }
            }
        } catch (e) {
            content = { body: message.content };
        }
    }

    let type = message.type || 'text';

    if (type === 'text' && content?.type && content.type !== 'text') {
        type = content.type;
    }

    const bodyText = content?.body || content?.text?.body;

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: isSent ? 'flex-end' : 'flex-start',
                marginBottom: 8,
                padding: '0 16px',
            }}
        >
            {!isSent && (
                <Avatar
                    size={32}
                    src={message.sender_avatar}
                    style={{ marginRight: 8, flexShrink: 0 }}
                >
                    {message.sender_name[0]}
                </Avatar>
            )}
            <div
                style={{
                    maxWidth: '85%',
                    minWidth: '100px',
                    position: 'relative',
                    padding: '6px 7px 8px 9px',
                    borderRadius: 7.5,
                    backgroundColor: isSent
                        ? (isDarkMode ? '#005c4b' : '#dcf8c6')
                        : (isDarkMode ? '#202c33' : '#ffffff'),
                    color: isDarkMode ? '#e9edef' : token.colorText,
                    boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                    borderTopLeftRadius: !isSent ? 0 : 7.5,
                    borderTopRightRadius: isSent ? 0 : 7.5,
                }}
            >
                {!isSent && (
                    <Text strong style={{ fontSize: 12, color: '#25D366', display: 'block', marginBottom: 4 }}>
                        {message.sender_name}
                    </Text>
                )}

                <div style={{ marginBottom: 4 }}>
                    {type === 'text' && (
                        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                            <Linkify text={bodyText || (typeof content === 'string' ? content : '')} />
                        </Paragraph>
                    )}

                    {(type === 'image' || type === 'video' || type === 'audio' || type === 'document' || type === 'sticker') && (
                        <MediaContent type={type} content={content} message={message} />
                    )}

                    {type === 'location' && (
                        <div style={{ padding: 4 }}>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${content.location?.latitude},${content.location?.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <Space>
                                    <MapPin size={16} style={{ color: '#ea4335' }} />
                                    <div>
                                        <Text strong style={{ display: 'block' }}>{content.location?.name || 'Location'}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{content.location?.address}</Text>
                                    </div>
                                </Space>
                            </a>
                        </div>
                    )}

                    {type === 'button' && (
                        <div style={{
                            padding: '8px 12px',
                            background: token.colorFillQuaternary,
                            borderRadius: 8,
                            borderLeft: '4px solid #00a884'
                        }}>
                            <Text strong style={{ fontSize: 12, color: '#00a884', display: 'block', marginBottom: 4 }}>Button Clicked</Text>
                            <Text>{content.button?.text || content.text || 'Button Message'}</Text>
                        </div>
                    )}

                    {type === 'contacts' && (
                        <div style={{ padding: 4 }}>
                            {content.contacts?.map((contact: any, i: number) => (
                                <Card key={i} size="small" style={{ background: token.colorFillQuaternary, marginBottom: 8, border: 'none' }}>
                                    <Space align="start">
                                        <Avatar icon={<User size={16} />} src={contact.org?.logo || undefined} />
                                        <div>
                                            <Text strong>{contact.name?.formatted_name || 'Unknown Contact'}</Text>
                                            {contact.phones?.map((phone: any, j: number) => (
                                                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                    <Phone size={12} style={{ color: '#8696a0' }} />
                                                    <Link href={`tel:${phone.phone}`} target="_blank">
                                                        {phone.phone}
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </Space>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 2,
                }}>
                    {onReply && (
                        <Button
                            type="text"
                            size="small"
                            icon={<span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>↩</span>}
                            onClick={() => onReply(message)}
                            style={{ padding: 0, height: 20, width: 20, color: '#8696a0', marginRight: 4 }}
                            title="Reply"
                        />
                    )}
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(message.created_at).format('h:mm A')}
                    </Text>
                    {isSent && message.delivery_status && statusIcons[message.delivery_status]}
                </div>
            </div>
        </div>
    );
};
