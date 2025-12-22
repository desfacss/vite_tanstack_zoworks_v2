// import React, { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabase';
// import { Collapse, Spin, Alert, Typography, Card, Input, Button, notification } from 'antd';
// import { Mail, Clock, Send } from 'lucide-react';
// import { v4 as uuidv4 } from 'uuid';
// import dayjs from 'dayjs';
// import { useAuthStore } from '@/core/lib/store';

// // Optional: Uncomment when email sending is implemented
// import { sendEmail } from '@/core/components/shared/email';

// const { Title, Text } = Typography;
// const { Panel } = Collapse;
// const { TextArea } = Input;

// // ===================================================================================
// // INTERFACES
// // ===================================================================================
// interface Message {
//   id: string;
//   conversation_id: string;
//   content: string; // Parsed body_text from message content
//   timestamp: string;
//   direction: 'inbound' | 'outbound';
//   from_email?: string | string[]; // Can be a string or array
//   to_email?: string | string[]; // Can be a string or array
//   cc_emails?: string[]; // Array of CC emails
// }

// interface TicketProps {
//   editItem: {
//     id: string;
//   } | null;
// }

// interface TicketDetails {
//   subject: string;
//   display_id: string;
//   conversation_id: string | null;
//   receivers: { emails: string[] } | null;
//   contact_id: string | null;
//   cli_client_contacts: { name: string; email: string } | null;
//   organization_id?: string; // Added for dynamic organization_id
//   location_id?: string; // Added for dynamic location_id
// }

// // ===================================================================================
// // COMPONENT DEFINITION
// // ===================================================================================
// const Ticket: React.FC<TicketProps> = ({ editItem }) => {
//   // =================================================================================
//   // STATE AND HOOKS INITIALIZATION
//   // =================================================================================
//   const { user } = useAuthStore();
//   const ticketId = editItem?.id;
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [replyContent, setReplyContent] = useState<string>('');
//   const [sending, setSending] = useState<boolean>(false);
//   const [supportEmail, setSupportEmail] = useState<string>('support@vkbs.zoworks.com'); // Default fallback

//   // =================================================================================
//   // DATA FETCHING EFFECT
//   // Fetches ticket details using RPC and messages from external.messages.
//   // =================================================================================
//   useEffect(() => {
//     if (!ticketId) {
//       setError('No ticket ID provided.');
//       setLoading(false);
//       return;
//     }

//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         setError(null);

//         // Fetch ticket details using RPC to join public.tickets with external.contacts
//         const config = {
//           main_table: {
//             schema: 'public',
//             name: 'tickets',
//           },
//           join_table: {
//             schema: 'external',
//             name: 'contacts',
//             on_fk_column: 'contact_id',
//           },
//           filters: {
//             where_clause: `m.id = '${ticketId}'`,
//           },
//         };

//         const { data: ticketData, error: ticketError } = await supabase.rpc('core_get_entity_data_with_joins_v2', { config });
//         if (ticketError) {
//           console.error('Ticket fetch error details:', ticketError);
//           throw new Error(`Ticket fetch failed: ${ticketError.message}`);
//         }
//         const parsedTicketData = ticketData ? ticketData[0] : null;
//         if (!parsedTicketData) throw new Error('Ticket not found.');

//         setTicketDetails({
//           subject: parsedTicketData.subject,
//           display_id: parsedTicketData.display_id,
//           conversation_id: parsedTicketData.conversation_id,
//           receivers: parsedTicketData.receivers,
//           contact_id: parsedTicketData.contact_id,
//           cli_client_contacts: parsedTicketData.cli_client_contacts,
//           organization_id: parsedTicketData.organization_id,
//           location_id: parsedTicketData.location_id, // Ensure location_id is available
//         });

//         // Fetch support email from app_settings
//         const { data: orgData } = await supabase
//           .from('identity.organizations')
//           .select('app_settings')
//           .eq('id', parsedTicketData.organization_id)
//           .single();
//         const { data: locData } = await supabase
//           .from('organization.locations')
//           .select('app_settings')
//           .eq('id', parsedTicketData.location_id)
//           .single();
//         const locEmail = locData?.app_settings?.emailOverrides?.fromAddress;
//         const orgEmail = orgData?.app_settings?.channels?.email?.defaults?.fromAddress;
//         setSupportEmail(locEmail || orgEmail || 'support@vkbs.zoworks.com');

//         // Fetch messages if conversation exists
//         if (parsedTicketData.conversation_id) {
//           const { data: messagesData, error: messagesError } = await supabase
//             .schema('external')
//             .from('messages')
//             .select('id, conversation_id, content, timestamp, direction')
//             .eq('conversation_id', parsedTicketData.conversation_id)
//             .order('timestamp', { ascending: false });

//           if (messagesError) {
//             console.error('Messages fetch error details:', messagesError);
//             throw new Error(`Messages fetch failed: ${messagesError.message}`);
//           }

//           const parsedMessages = messagesData.map(msg => {
//             try {
//               const rawContent = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
//               const messageBody = rawContent?.body_text || 'No text content available';
//               return {
//                 ...msg,
//                 content: messageBody,
//                 from_email: rawContent?.from,
//                 to_email: rawContent?.to,
//                 cc_emails: rawContent?.cc || [],
//               };
//             } catch (e) {
//               console.error('Error parsing message content for message ID', msg.id, e);
//               return {
//                 ...msg,
//                 content: 'Failed to parse message content.',
//                 from_email: 'Unknown',
//                 to_email: ['Unknown'],
//                 cc_emails: [],
//               };
//             }
//           });
//           setMessages(parsedMessages || []);
//         } else {
//           setMessages([]);
//         }
//       } catch (err: any) {
//         console.error('Fetch error:', err);
//         setError(err.message || 'Failed to fetch data. Please try again.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [ticketId]);

//   // =================================================================================
//   // SEND REPLY HANDLER
//   // Sends a reply to the latest message's recipients using Option 1 (UI email + RPC save)
//   // or Option 2 (RPC-only, commented out). Fetches the latest message to get to, from, and cc.
//   // =================================================================================
//   const handleSendReply = async () => {
//     if (!ticketId || !replyContent.trim() || !ticketDetails?.conversation_id || !user?.id) {
//       notification.error({ message: 'Error', description: 'Missing required information to send reply.' });
//       return;
//     }

//     setSending(true);
//     try {
//       // Fetch the latest message to get recipient details
//       const { data: latestMessage, error: messageError } = await supabase
//         .schema('external')
//         .from('messages')
//         .select('content')
//         .eq('conversation_id', ticketDetails.conversation_id)
//         .order('timestamp', { ascending: false })
//         .limit(1)
//         .single();

//       if (messageError) {
//         console.error('Latest message fetch error:', messageError);
//         throw new Error(`Failed to fetch latest message: ${messageError.message}`);
//       }

//       const messageContent = latestMessage?.content
//         ? typeof latestMessage.content === 'string'
//           ? JSON.parse(latestMessage.content)
//           : latestMessage.content
//         : null;

//       if (!messageContent) {
//         notification.error({ message: 'Error', description: 'No content found in the latest message.' });
//         return;
//       }

//       // Construct reply recipients, excluding agent's email
//       const agentEmail = user.email;
//       const recipientEmails = Array.isArray(messageContent.from)
//         ? messageContent.from.filter(email => email !== agentEmail)
//         : [messageContent.from].filter(email => email && email !== agentEmail) || [];
//       const ccEmails = (messageContent.cc || []).filter(email => email !== agentEmail);
//       const replyToEmails = (messageContent.to || []).filter(email => email !== agentEmail);
//       const uniqueEmails = Array.from(new Set([...replyToEmails, ...ccEmails])).filter(Boolean);

//       // ----------------- OPTION 1: Send Email from UI & Save with RPC (Active) -----------------
//       const { data: conversationData, error: conversationError } = await supabase
//         .schema('external')
//         .from('conversations')
//         .select('channel_conversation_id')
//         .eq('id', ticketDetails.conversation_id)
//         .single();
//       if (conversationError) {
//         console.error('Conversation fetch error:', conversationError);
//         throw new Error(`Failed to fetch conversation: ${conversationError.message}`);
//       }

//       const emailMessageId = `<${uuidv4()}@zoworks.com>`;
//       const inReplyTo = conversationData?.channel_conversation_id || null;

//       const emailData = {
//         from: supportEmail, // Use pre-fetched support email
//         to: uniqueEmails,
//         cc: ccEmails,
//         subject: `Re: ${ticketDetails.display_id} - ${ticketDetails.subject}`,
//         text: replyContent,
//         messageId: emailMessageId,
//         inReplyTo: inReplyTo,
//       };

//       // Uncomment when sendEmail is implemented
//       await sendEmail([emailData]);
//       console.log('Email would be sent:', emailData); // Placeholder for testing

//       const rpcContent = {
//         from: supportEmail, // Use pre-fetched support email
//         to: uniqueEmails,
//         cc: ccEmails,
//         subject: emailData.subject,
//         body_text: replyContent,
//       };

//       // Debug: Log parameters to verify
//       console.log('RPC Parameters:', {
//         p_conversation_id: ticketDetails.conversation_id,
//         p_organization_id: ticketDetails.organization_id || 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2',
//         p_content: rpcContent,
//         p_direction: 'outbound',
//         p_channel: 'manual_entry',
//         p_created_by: user.id,
//         p_channel_message_id: null,
//       });

//       const { error: rpcError } = await supabase.rpc('tkt_add_reply_to_conversation', {
//         p_conversation_id: ticketDetails.conversation_id,
//         p_organization_id: ticketDetails.organization_id || 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2',
//         p_content: rpcContent,
//         p_direction: 'outbound',
//         p_channel: 'manual_entry',
//         p_created_by: user.id,
//         p_channel_message_id: null, // Explicitly pass NULL as allowed by RPC
//       });

//       if (rpcError) {
//         console.error('RPC error details:', rpcError);
//         throw new Error(`Failed to save reply: ${rpcError.message}`);
//       }

//       // ----------------- END OF OPTION 1 -----------------

//       // ----------------- OPTION 2: Use RPC for both Send & Save (Commented) -----------------
//       /*
//       const rpcContent = {
//         from: user.email || 'support@vkbs.zoworks.com',
//         to: uniqueEmails,
//         cc: ccEmails,
//         subject: `Re: ${ticketDetails.display_id} - ${ticketDetails.subject}`,
//         body_text: replyContent,
//       };

//       const { error: rpcError } = await supabase.rpc('tkt_add_reply_to_conversation', {
//         p_conversation_id: ticketDetails.conversation_id,
//         p_organization_id: ticketDetails.organization_id || 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2',
//         p_content: rpcContent,
//         p_direction: 'outbound',
//         p_channel: 'manual_entry',
//         p_created_by: user.id,
//         p_channel_message_id: null, // Explicitly pass NULL as allowed by RPC
//       });

//       if (rpcError) {
//         console.error('RPC error:', rpcError);
//         throw new Error(`Failed to send/save reply: ${rpcError.message}`);
//       }
//       */
//       // ----------------- END OF OPTION 2 -----------------

//       // Refresh messages
//       const { data, error } = await supabase
//         .schema('external')
//         .from('messages')
//         .select('id, conversation_id, content, timestamp, direction')
//         .eq('conversation_id', ticketDetails.conversation_id)
//         .order('timestamp', { ascending: false });

//       if (error) {
//         console.error('Messages refresh error:', error);
//         throw new Error(`Failed to refresh messages: ${error.message}`);
//       }

//       const parsedMessages = data.map(msg => {
//         try {
//           const rawContent = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
//           const messageBody = rawContent?.body_text || 'No text content available';
//           return {
//             ...msg,
//             content: messageBody,
//             from_email: rawContent?.from,
//             to_email: rawContent?.to,
//             cc_emails: rawContent?.cc || [],
//           };
//         } catch (e) {
//           console.error('Error parsing message content for message ID', msg.id, e);
//           return {
//             ...msg,
//             content: 'Failed to parse message content.',
//             from_email: 'Unknown',
//             to_email: ['Unknown'],
//             cc_emails: [],
//           };
//         }
//       });

//       setMessages(parsedMessages || []);
//       setReplyContent('');
//       notification.success({ message: 'Success', description: 'Reply sent successfully.' });
//     } catch (err: any) {
//       console.error('Send reply error:', err);
//       notification.error({ message: 'Error', description: err.message || 'Failed to send reply.' });
//     } finally {
//       setSending(false);
//     }
//   };

//   // =================================================================================
//   // RENDER METHOD
//   // =================================================================================
//   const items = messages.map((message) => ({
//     key: message.id,
//     label: (
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <Text strong>
//           <MailOutlined style={{ marginRight: '8px' }} />
//           From: {Array.isArray(message.from_email) ? message.from_email.join(', ') : message.from_email || 'Unknown'}
//         </Text>
//         <Text type="secondary">
//           <ClockCircleOutlined style={{ marginRight: '8px' }} />
//           {dayjs(message.timestamp).format('MMM DD, YYYY HH:mm')}
//         </Text>
//       </div>
//     ),
//     children: (
//       <Card bordered={false}>
//         <Text strong>To: </Text>
//         <Text>{Array.isArray(message.to_email) ? message.to_email.join(', ') : message.to_email || 'Unknown'}</Text>
//         <br />
//         {message.cc_emails && message.cc_emails.length > 0 && (
//           <>
//             <Text strong>CC: </Text>
//             <Text>{message.cc_emails.join(', ')}</Text>
//             <br />
//           </>
//         )}
//         <Text strong>Message: </Text>
//         <div
//           style={{
//             whiteSpace: 'pre-wrap',
//             marginTop: '8px',
//             padding: '8px',
//             background: '#f5f5f5',
//             borderRadius: '4px',
//           }}
//         >
//           {message.content}
//         </div>
//         <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
//           {message.direction === 'outbound' ? 'Sent' : 'Received'}
//         </Text>
//       </Card>
//     ),
//   }));

//   if (loading) return <Spin />;
//   if (error) return <Alert message={error} type="error" showIcon />;

//   return (
//     <div style={{ padding: '16px', margin: '0 auto' }}>
//       <Title level={4}>Messages for Ticket {ticketDetails?.display_id || ticketId}</Title>
//       <Card style={{ marginBottom: '16px' }}>
//         <Text strong>Reply to Ticket</Text>
//         <TextArea
//           rows={4}
//           value={replyContent}
//           onChange={(e) => setReplyContent(e.target.value)}
//           placeholder="Type your reply here..."
//           style={{ marginTop: '8px', marginBottom: '8px' }}
//         />
//         <Button
//           type="primary"
//           icon={<SendOutlined />}
//           onClick={handleSendReply}
//           loading={sending}
//           disabled={!replyContent.trim()}
//         >
//           Send Reply
//         </Button>
//       </Card>
//       {messages.length > 0 ? (
//         <Collapse bordered style={{ background: '#fff' }} accordion items={items} />
//       ) : (
//         <Alert message="No messages found for this ticket." type="info" showIcon />
//       )}
//     </div>
//   );
// };

// export default Ticket;


// sending emails to itself in loop - since its in the cc or to address



import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Collapse, Spin, Alert, Typography, Card, Input, Button, App } from 'antd'; // Use App for context
import { Mail, Clock, Send } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { useAuthStore } from '@/core/lib/store';

// Optional: Uncomment when email sending is implemented
import { sendEmail } from '@/core/components/shared/email';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

// ===================================================================================
// INTERFACES
// ===================================================================================
interface Message {
  id: string;
  conversation_id: string;
  content: string; // Parsed body_text from message content
  timestamp: string;
  direction: 'inbound' | 'outbound';
  from_email?: string | string[];
  to_email?: string | string[];
  cc_emails?: string[];
}

interface TicketProps {
  data?: { id: string } | null;  // Changed from 'editItem' to match DetailsView prop passing
  entityId?: string;              // Also passed by DetailsView
  entityType?: string;            // Also passed by DetailsView
}

interface TicketDetails {
  subject: string;
  display_id: string;
  conversation_id: string | null;
  organization_id?: string;
}

// ===================================================================================
// COMPONENT DEFINITION
// ===================================================================================
const Ticket: React.FC<TicketProps> = ({ data, entityId }) => {
  const { notification } = App.useApp(); // Use context-aware notifications
  const { user, organization } = useAuthStore();
  const ticketId = data?.id || entityId;  // Use data.id or entityId fallback
  const appSettings =organization?.app_settings;
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const supportEmail = appSettings?.emailOverrides?.email || appSettings?.email?.[0];
  useEffect(() => {
    if (!ticketId) {
      setError('No ticket ID provided.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch ticket details
        const config = {
          main_table: { schema: 'blueprint', name: 'tickets' },
          join_table: { schema: 'external', name: 'contacts', on_fk_column: 'contact_id' },
          filters: { where_clause: `m.id = '${ticketId}'` },
        };
        const { data: ticketData, error: ticketError } = await supabase.rpc('core_get_entity_data_with_joins_v2', { config });//TODO:RAVI
        // const { data: ticketData, error: ticketError } = await supabase.schema('core').rpc('api_fetch_entity_records', { config });//TODO:RAVI
        if (ticketError) throw new Error(`Ticket fetch failed: ${ticketError.message}`);
        const parsedTicketData = ticketData?.[0];
        if (!parsedTicketData) throw new Error('Ticket not found.');
        setTicketDetails(parsedTicketData);

        // Fetch dynamic support email
        if (parsedTicketData.organization_id && parsedTicketData.location_id) {
          const { data: orgData } = await supabase.schema('identity').from('organizations').select('app_settings').eq('id', parsedTicketData.organization_id).single();
          const { data: locData } = await supabase.schema('identity').from('locations').select('app_settings').eq('id', parsedTicketData.location_id).single();
          const locEmail = locData?.app_settings?.emailOverrides?.fromAddress;
          const orgEmail = orgData?.app_settings?.channels?.email?.defaults?.fromAddress;
          // setSupportEmail(locEmail || orgEmail || 'support@vkbs.zoworks.com');
        }

        // Fetch messages
        if (parsedTicketData.conversation_id) {
          const { data: messagesData, error: messagesError } = await supabase.schema('external').from('messages').select('id, conversation_id, content, timestamp, direction').eq('conversation_id', parsedTicketData.conversation_id).order('timestamp', { ascending: false });
          if (messagesError) throw new Error(`Messages fetch failed: ${messagesError.message}`);

          const parsedMessages = messagesData.map(msg => {
            try {
              const rawContent = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
              return { ...msg, content: rawContent?.body_text || 'No text content available', from_email: rawContent?.from, to_email: rawContent?.to, cc_emails: rawContent?.cc || [] };
            } catch (e) {
              return { ...msg, content: 'Failed to parse message content.', from_email: 'Unknown', to_email: ['Unknown'], cc_emails: [] };
            }
          });
          setMessages(parsedMessages);
        } else {
          setMessages([]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticketId]);

  const handleSendReply = async () => {
    if (!replyContent.trim() || !ticketDetails?.conversation_id || !user?.id) {
      notification.error({ message: 'Error', description: 'Missing required information to send reply.' });
      return;
    }
    setSending(true);
    try {
      // Fetch the latest message to get recipient details
      const { data: latestMessage, error: messageError } = await supabase.schema('external').from('messages').select('content').eq('conversation_id', ticketDetails.conversation_id).order('timestamp', { ascending: false }).limit(1).single();
      if (messageError) throw new Error(`Failed to fetch latest message: ${messageError.message}`);

      const messageContent = latestMessage?.content ? (typeof latestMessage.content === 'string' ? JSON.parse(latestMessage.content) : latestMessage.content) : null;
      if (!messageContent) throw new Error('No content found in the latest message.');

      // Construct reply recipients, excluding the agent's email AND the support email
      const agentEmail = user.email || '';
      const fromEmails = Array.isArray(messageContent.from) ? messageContent.from : [messageContent.from];
      const toEmails = Array.isArray(messageContent.to) ? messageContent.to : [messageContent.to];
      const ccEmails = Array.isArray(messageContent.cc) ? messageContent.cc : [];

      const allEmails = [...fromEmails, ...toEmails, ...ccEmails];

      const uniqueEmails = Array.from(new Set(allEmails))
        .filter(Boolean) // Remove any null/undefined entries
        .filter(email => email.toLowerCase() !== agentEmail.toLowerCase()) // [FIXED] Filter out the agent sending the reply
        .filter(email => email.toLowerCase() !== supportEmail.toLowerCase()); // [FIXED] Filter out the common support email to prevent loops

      if (uniqueEmails.length === 0) throw new Error("No external recipients to send a reply to.");

      const { data: conversationData } = await supabase.schema('external').from('conversations').select('channel_conversation_id').eq('id', ticketDetails.conversation_id).single();

      const emailMessageId = `<${uuidv4()}@zoworks.com>`;
      const inReplyTo = conversationData?.channel_conversation_id || null;

      const emailData = { from: supportEmail, to: uniqueEmails, cc: [], subject: `Re: ${ticketDetails.display_id} - ${ticketDetails.subject}`, body_text: replyContent };

      // 1. Send the email
      await sendEmail([{ ...emailData, text: emailData.body_text, messageId: emailMessageId, inReplyTo: inReplyTo }]);

      // 2. Save the reply to the database
      const { error: rpcError } = await supabase.rpc('tkt_add_reply_to_conversation', {
        p_conversation_id: ticketDetails.conversation_id,
        p_organization_id: ticketDetails.organization_id,
        p_content: emailData,
        p_direction: 'outbound',
        p_channel: 'manual_entry',
        p_created_by: user.id,
        p_channel_message_id: emailMessageId,
      });
      if (rpcError) throw new Error(`Failed to save reply: ${rpcError.message}`);

      // 3. Update UI instantly
      setMessages([{ id: uuidv4(), conversation_id: ticketDetails.conversation_id, content: replyContent, timestamp: new Date().toISOString(), direction: 'outbound', from_email: supportEmail, to_email: uniqueEmails, cc_emails: [] }, ...messages]);
      setReplyContent('');
      notification.success({ message: 'Reply Sent' });

    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    } finally {
      setSending(false);
    }
  };

  const items = messages.map((message) => ({
    key: message.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong><MailOutlined style={{ marginRight: '8px' }} />From: {Array.isArray(message.from_email) ? message.from_email.join(', ') : message.from_email || 'Unknown'}</Text>
        <Text type="secondary"><ClockCircleOutlined style={{ marginRight: '8px' }} />{dayjs(message.timestamp).format('MMM DD, YYYY HH:mm')}</Text>
      </div>
    ),
    children: (
      <Card bordered={false}>
        <Text strong>To: </Text><Text>{Array.isArray(message.to_email) ? message.to_email.join(', ') : message.to_email || 'Unknown'}</Text><br />
        {message.cc_emails && message.cc_emails.length > 0 && (<><br /><Text strong>CC: </Text><Text>{message.cc_emails.join(', ')}</Text></>)}<br />
        <Text strong>Message: </Text>
        <div style={{ whiteSpace: 'pre-wrap', marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>{message.content}</div>
        <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>{message.direction === 'outbound' ? 'Sent' : 'Received'}</Text>
      </Card>
    ),
  }));

  if (loading) return <Spin />;
  if (error) return <Alert message={error} type="error" showIcon />;

  return (
    <div style={{ padding: '16px', margin: '0 auto' }}>
      <Title level={4}>Messages for Ticket {ticketDetails?.display_id || ticketId}</Title>
      <Card style={{ marginBottom: '16px' }}>
        <Text strong>Reply to Ticket</Text>
        <TextArea rows={4} value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Type your reply here..." style={{ marginTop: '8px', marginBottom: '8px' }} />
        <Button type="primary" icon={<Send />} onClick={handleSendReply} loading={sending} disabled={!replyContent.trim()}>Send Reply</Button>
      </Card>
      {messages.length > 0 ? <Collapse bordered style={{ background: '#fff' }} accordion items={items} /> : <Alert message="No messages found for this ticket." type="info" showIcon />}
    </div>
  );
};

export default Ticket;