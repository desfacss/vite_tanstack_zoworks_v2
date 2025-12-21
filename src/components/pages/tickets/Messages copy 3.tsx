import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Collapse, Spin, Alert, Typography, Card, Input, Button, notification } from 'antd';
import { MailOutlined, ClockCircleOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { sendEmail } from '../../common/email';
// import { sendEmail } from './utils/email'; // Adjust path to where sendEmail is defined

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
  const [replyContent, setReplyContent] = useState<string>(''); // State for reply input
  const [sending, setSending] = useState<boolean>(false); // State for sending reply

  // Fetch messages when component mounts or ticketId changes
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

  // Handle sending reply email
  const handleSendReply = async () => {
    if (!ticketId || !replyContent.trim()) {
      notification.error({
        message: 'Error',
        description: 'Please enter a reply message.',
      });
      return;
    }

    if (messages.length === 0) {
      notification.error({
        message: 'Error',
        description: 'No messages found to reply to.',
      });
      return;
    }

    setSending(true);
    try {
      // Get the latest message to swap from_email and to_email
      const latestMessage = messages[0]; // Messages are sorted by created_at DESC
      const originalSubject = await getTicketSubject(ticketId); // Fetch ticket subject

      // Construct the reply email
      const emailData = {
        from: import.meta.env.VITE_RESEND_FROM_EMAIL || 'team@yourdomain.com',
        to: [latestMessage.from_email], // Reply to the sender of the latest message
        subject: `Re: ${originalSubject || 'Ticket Reply'}`,
        html: `
          <p>${replyContent.replace(/\n/g, '<br/>')}</p>
          <hr/>
          <p><strong>Original Message:</strong></p>
          <p>${latestMessage.content.replace(/\n/g, '<br/>')}</p>
          <p><strong>From:</strong> ${latestMessage.from_email}</p>
          <p><strong>Sent:</strong> ${dayjs(latestMessage.created_at).format('MMM DD, YYYY HH:mm')}</p>
          <p>Best Regards,<br/>Support Team</p>
        `,
      };
console.log("Email Payload",emailData);
      // Send the email using the sendEmail function
      await sendEmail([emailData]);

      // Refresh messages after sending
      const { data, error } = await supabase.rpc('get_ticket_messages', {
        p_ticket_id: ticketId,
      });

      if (error) {
        throw new Error(error.message);
      }

      setMessages(data || []);
      setReplyContent(''); // Clear the input
      notification.success({
        message: 'Success',
        description: 'Reply sent successfully.',
      });
    } catch (err) {
      console.error('Error sending reply:', err);
      notification.error({
        message: 'Error',
        description: 'Failed to send reply. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  // Helper function to fetch ticket subject
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

  // Render loading state
  if (loading) {
    return <Spin tip="Loading messages..." />;
  }

  // Render error state
  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  // Render empty state
  if (messages.length === 0) {
    return <Alert message="No messages found for this ticket." type="info" showIcon />;
  }

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={4}>Messages for Ticket ID: {ticketId}</Title>

      {/* Reply Input Form */}
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

      {/* Messages List */}
      <Collapse
        bordered
        style={{ background: '#fff' }}
        accordion
      >
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