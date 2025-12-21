// src/components/Ticket.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Collapse, Spin, Alert, Typography, Card, Input, Button, notification } from 'antd';
import { MailOutlined, ClockCircleOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import env_def from '@/utils/constants';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

interface Message {
  id: string;
  thread_id: string;
  content: string;
  from_email: string;
  to_email: string;
  created_at: string;
  is_outbound: boolean;
  message_id?: string; // Optional for system-generated messages
}

interface TicketProps {
  editItem: {
    id: string;
  } | null;
}

const Ticket: React.FC<TicketProps> = ({ editItem }) => {
  const ticketId = editItem?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  // Fetch messages
  useEffect(() => {
    if (!ticketId) {
      setError('No ticket ID provided.');
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc('get_ticket_messages', {
          p_ticket_id: ticketId,
        });

        if (error) {
          throw new Error(error.message);
        }

        setMessages(data || []);
      } catch (err) {
        setError('Failed to fetch messages. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [ticketId]);

  // Handle sending reply
  const handleSendReply = async () => {
    if (!ticketId || !replyContent.trim()) {
      notification.error({
        message: 'Error',
        description: 'Please enter a reply message.',
      });
      return;
    }

    setSending(true);
    try {
      // Get ticket subject
      const originalSubject = await getTicketSubject(ticketId);
      const latestMessage = messages[0]; // Assuming sorted DESC by created_at

      // Fetch thread for message_id
      const { data: thread, error: threadError } = await supabase
        .schema('external').from('conversations')
        .select('message_id')
        .eq('ticket_id', ticketId)
        .single();
      if (threadError) {
        throw new Error('Failed to fetch thread: ' + threadError.message);
      }

      // Generate unique Message-ID
      const messageId = `support-${Date.now()}@yourdomain.com`;
      const inReplyTo = latestMessage?.message_id || thread.message_id;

      // Payload for support_email
      const supportEmailPayload = {
        ticketId,
        subject: originalSubject || 'Support Ticket',
        messageId,
        text: replyContent,
        from: import.meta.env.VITE_RESEND_FROM_EMAIL || 'team@yourdomain.com',
        to: latestMessage?.from_email || 'customer@example.com', // Fallback for auto-created tickets
        inReplyTo: inReplyTo || null,
      };

      // 1. Call support_email
      const supportEmailResponse = await fetch(
        `${env_def?.SUPABASE_URL}/functions/v1/support_email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(supportEmailPayload),
        }
      );

      if (!supportEmailResponse.ok) {
        throw new Error('Failed to save reply to database: ' + (await supportEmailResponse.text()));
      }

      // 2. Call send_email
      const emailData = [
        {
          from: supportEmailPayload.from,
          to: [supportEmailPayload.to],
          subject: `Re: ${supportEmailPayload.subject}`,
          html: `
            <p>${replyContent.replace(/\n/g, '<br/>')}</p>
            <hr/>
            ${latestMessage ? `
              <p><strong>Original Message:</strong></p>
              <p>${latestMessage.content.replace(/\n/g, '<br/>')}</p>
              <p><strong>From:</strong> ${latestMessage.from_email}</p>
              <p><strong>Sent:</strong> ${dayjs(latestMessage.created_at).format('MMM DD, YYYY HH:mm')}</p>
            ` : ''}
            <p>Best Regards,<br/>Support Team</p>
          `,
          messageId,
          inReplyTo,
        },
      ];

      console.log('Email Payload:', emailData);

      const sendEmailResponse = await fetch(
        `${env_def?.SUPABASE_URL}/functions/v1/send_email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(emailData),
        }
      );

      if (!sendEmailResponse.ok) {
        await supabase.from('failed_emails').insert({
          ticket_id: ticketId,
          payload: JSON.stringify(emailData),
          error: await sendEmailResponse.text(),
          timestamp: new Date().toISOString(),
        });
        throw new Error('Failed to send email: ' + (await sendEmailResponse.text()));
      }

      // Refresh messages
      const { data, error } = await supabase.rpc('get_ticket_messages', {
        p_ticket_id: ticketId,
      });

      if (error) {
        throw new Error(error.message);
      }

      setMessages(data || []);
      setReplyContent('');
      notification.success({
        message: 'Success',
        description: 'Reply sent successfully.',
      });
    } catch (err) {
      console.error('Error sending reply:', err);
      notification.error({
        message: 'Error',
        description: err.message || 'Failed to send reply. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  // Fetch ticket subject
  const getTicketSubject = async (ticketId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('subject')
        .eq('id', ticketId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data?.subject || null;
    } catch (err) {
      console.error('Error fetching ticket subject:', err);
      return null;
    }
  };

  if (loading) {
    return <Spin tip="Loading messages..." />;
  }

  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  if (messages.length === 0) {
    return <Alert message="No messages found for this ticket." type="info" showIcon />;
  }

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={4}>Messages for Ticket ID: {ticketId}</Title>

      <Card style={{ marginBottom: '16px' }}>
        <Text strong>Reply to Ticket</Text>
        <TextArea
          rows={4}
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Type your reply here..."
          style={{ marginTop: '8px', marginBottom: '8px' }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendReply}
          loading={sending}
          disabled={!replyContent.trim()}
        >
          Send Reply
        </Button>
      </Card>

      <Collapse bordered style={{ background: '#fff' }} accordion>
        {messages.map((message) => (
          <Panel
            key={message.id}
            header={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>
                  <MailOutlined style={{ marginRight: '8px' }} />
                  From: {message.from_email}
                </Text>
                <Text type="secondary">
                  <ClockCircleOutlined style={{ marginRight: '8px' }} />
                  {dayjs(message.created_at).format('MMM DD, YYYY HH:mm')}
                </Text>
              </div>
            }
          >
            <Card bordered={false}>
              <Text strong>To: </Text>
              <Text>{message.to_email}</Text>
              <br />
              <Text strong>Message: </Text>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  marginTop: '8px',
                  padding: '8px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                }}
              >
                {message.content}
              </div>
              <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                {message.is_outbound ? 'Sent' : 'Received'}
              </Text>
            </Card>
          </Panel>
        ))}
      </Collapse>
    </div>
  );
};

export default Ticket;