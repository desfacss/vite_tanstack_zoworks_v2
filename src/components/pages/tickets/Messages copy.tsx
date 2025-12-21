import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase'; // Updated import path
import { Collapse, Spin, Alert, Typography, Card } from 'antd';
import { MailOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Panel } = Collapse; // Use Collapse.Panel for accordion-like items

// Define the message type based on the RPC function output
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
    id: string; // ticketId is extracted from editItem.id
  } | null;
}

const Ticket: React.FC<TicketProps> = ({ editItem }) => {
  const ticketId = editItem?.id; // Extract ticketId from editItem
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      <Collapse
        bordered
        style={{ background: '#fff' }}
        accordion // Enable accordion mode (only one panel open at a time)
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