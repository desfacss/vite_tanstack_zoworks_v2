// src/components/CreateTicket.tsx
import React, { useState } from 'react';
import { Modal, Input, Button, notification } from 'antd';
import env_def from '@/core/lib/env';

const { TextArea } = Input;

interface CreateTicketProps {
  visible: boolean;
  onClose: () => void;
}

const CreateTicket: React.FC<CreateTicketProps> = ({ visible, onClose }) => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!subject.trim() || !content.trim() || !customerEmail.trim()) {
      notification.error({ message: 'Error', description: 'All fields are required.' });
      return;
    }

    setLoading(true);
    try {
      const messageId = `support-${Date.now()}@yourdomain.com`;
      const payload = {
        subject,
        messageId,
        text: content,
        from: 'team@yourdomain.com',
        to: customerEmail,
        inReplyTo: null, // No parent message
      };

      // Call support_email
      const response = await fetch(
        `${env_def?.SUPABASE_URL}/functions/v1/support_email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create ticket: ' + await response.text());
      }

      // Optionally send email
      const emailData = [
        {
          from: payload.from,
          to: [payload.to],
          subject: payload.subject,
          html: `<p>${content.replace(/\n/g, '<br/>')}</p><p>Best Regards,<br/>Support Team</p>`,
          messageId,
        },
      ];

      const emailResponse = await fetch(
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

      if (!emailResponse.ok) {
        throw new Error('Failed to send email: ' + await emailResponse.text());
      }

      notification.success({ message: 'Success', description: 'Ticket created successfully.' });
      setSubject('');
      setContent('');
      setCustomerEmail('');
      onClose();
    } catch (err) {
      notification.error({ message: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Create New Ticket"
      visible={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleCreate} loading={loading}>
          Create
        </Button>,
      ]}
    >
      <Input
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <Input
        placeholder="Customer Email"
        value={customerEmail}
        onChange={(e) => setCustomerEmail(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <TextArea
        placeholder="Message Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
      />
    </Modal>
  );
};

export default CreateTicket;