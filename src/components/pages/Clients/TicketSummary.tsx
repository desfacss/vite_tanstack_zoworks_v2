// components/SupportTicketForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Select, Button, Modal, message, Spin, Alert } from 'antd';
import { supabase } from '@/lib/supabase';
import moment from 'moment';
import { PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../../lib/store';

const { TextArea } = Input;
const { Option } = Select;

interface DropdownOption {
  id: string;
  name: string;
}

interface FormValues {
  subject: string;
  description: string;
  client_id: string | null;
  contact_id: string | null;
  category_id: string | null;
  contract_id: string | null;
  asset_id: string | null;
  assignee_id: string | null;
  field_technician_id: string | null;
  qr_input?: string;
  email_input?: string;
}

const SupportTicketForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<DropdownOption[]>([]);
  const [contacts, setContacts] = useState<DropdownOption[]>([]);
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [contracts, setContracts] = useState<DropdownOption[]>([]);
  const [assets, setAssets] = useState<DropdownOption[]>([]);
  const [assignees, setAssignees] = useState<DropdownOption[]>([]);
  const [fieldTechnicians, setFieldTechnicians] = useState<DropdownOption[]>([]);
  const [isContactModalVisible, setIsContactModalVisible] = useState<boolean>(false);
  const [contactForm] = Form.useForm();
  const qrInputRef = useRef<Input>(null);
  const emailInputRef = useRef<Input>(null);
  const { organization } = useAuthStore();
  // Fetch dropdown options
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          { data: clientData },
          { data: categoryData },
          { data: userData },
        ] = await Promise.all([
          supabase.schema('external').from('accounts').select('id, name'),
          supabase.schema('catalog').from('asset_categories').select('id, name'),
          supabase.schema('identity').from('users').select('id, name'),
        ]);

        setClients(clientData || []);
        setCategories(categoryData || []);
        setAssignees(userData || []);
        setFieldTechnicians(userData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Fetch contacts, contracts, and assets when client_id changes
  useEffect(() => {
    const fetchClientRelatedData = async () => {
      const clientId = form.getFieldValue('client_id');
      if (true) {
        try {
          setLoading(true);
          const [
            { data: contactData },
            { data: contractData },
            { data: assetData },
          ] = await Promise.all([
            // supabase.schema('external').from('contacts').select('id, name').eq('account_id', clientId),
            // supabase.schema('external').from('contracts').select('*').eq('client_id', clientId),
            // supabase.schema('external').from('service_assets').select('id, display_id').eq('client_id', clientId),
            supabase.schema('external').from('contacts').select('id, name'),
            supabase.schema('external').from('contracts').select('*'),
            supabase.schema('external').from('service_assets').select('id, display_id'),
          ]);

          setContacts(contactData || []);
          setContracts(contractData || []);
          setAssets(assetData || []);
          // form.setFieldsValue({ contact_id: null, contract_id: null, asset_id: null }); // Reset dependent fields
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
          setLoading(false);
        }
      } else {
        setContacts([]);
        setContracts([]);
        setAssets([]);
      }
    };

    fetchClientRelatedData();
  }, [form.getFieldValue('client_id'), form]);

  // Parse QR code input
  const handleParseQR = () => {
    const qrInput = form.getFieldValue('qr_input');
    if (qrInput) {
      try {
        const params = qrInput.split(';').reduce((acc: any, param: string) => {
          const [key, value] = param.split(':');
          acc[key] = value;
          return acc;
        }, {});
        if (params.client && params.asset) {
          form.setFieldsValue({
            client_id: params.client,
            asset_id: params.asset,
          });
          message.success('QR code parsed successfully');
        } else {
          message.error('Invalid QR code format');
        }
      } catch (err) {
        message.error('Failed to parse QR code');
      }
    }
  };

  // Parse email content
  const handleParseEmail = () => {
    const emailInput = form.getFieldValue('email_input');
    if (emailInput) {
      try {
        const [subjectPart, ...bodyParts] = emailInput.split('\n');
        const subject = subjectPart.startsWith('Subject:') ? subjectPart.replace('Subject:', '').trim() : '';
        const body = bodyParts.join('\n').replace('Body:', '').trim();
        form.setFieldsValue({
          subject: subject || body.slice(0, 50), // Fallback to first 50 chars of body
          description: body,
        });
        message.success('Email content parsed successfully');
      } catch (err) {
        message.error('Failed to parse email content');
      }
    }
  };

  // Handle adding new contact
  const handleAddContact = async (values: { name: string; email: string }) => {
    try {
      setLoading(true);
      const clientId = form.getFieldValue('client_id');
      if (!clientId) {
        message.error('Please select a client first');
        return;
      }

      const { data, error } = await supabase
        .schema('external').from('contacts')
        .insert({
          name: values.name,
          account_id: clientId,
          details: { email: values.email },
        })
        .select('id, name')
        .single();

      if (error) {
        throw new Error(`Failed to add contact: ${error.message}`);
      }

      setContacts([...contacts, data]);
      form.setFieldsValue({ contact_id: data.id });
      setIsContactModalVisible(false);
      contactForm.resetFields();
      message.success('Contact added successfully');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const onFinish = async (values: FormValues) => {
    try {
      setLoading(true);
      setError(null);

      const clientId = values.client_id;
      if (!clientId) {
        throw new Error('Client ID is required');
      }

      // Fetch client email for support email submission
      const { data: clientData, error: clientError } = await supabase
        .schema('external')
        .from('accounts')
        .select('details')
        .eq('id', clientId)
        .single();

      if (clientError || !clientData?.details?.contact_email) {
        throw new Error('Failed to fetch client email');
      }

      // Create ticket in Supabase
      const ticketData = {
        subject: values.subject,
        status: 'open',
        reported_at: moment().toISOString(),
        client_id: values.client_id,
        contact_id: values.contact_id,
        category_id: values.category_id,
        x_contract_id: values.contract_id,
        asset_id: values.asset_id,
        assignee_id: values.assignee_id,
        field_agent_id: values.field_technician_id,
        details: { description: values.description },
        organization_id: organization?.id, // Default org ID from schema
      };

      // const { data: ticket, error: ticketError } = await supabase
      //   .from('tickets')
      //   .insert(ticketData)
      //   .select()
      //   .single();

      // if (ticketError) {
      //   throw new Error(`Failed to create ticket: ${ticketError.message}`);
      // }

      // Prepare email payload for support email
      const emailPayload = {
        subject: values.subject,
        messageId: `msg_${Date.now()}`,
        // messageId: `msg_${Date.now()}_${ticket.id}`,
        text: values.description,
        from: clientData.details.contact_email,
        to: import.meta.env.VITE_SUPPORT_TO_EMAIL,
        inReplyTo: null,
        // ticketId: ticket.id,
      };

      // Send email via edge function
      const response = await fetch('/api/supabase/functions/v1/support_email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(emailPayload),
      });
      console.log("gde",response);

      if (!response.ok) {
        throw new Error(`Failed to send support email: ${await response.text()}`);
      }

      message.success('Ticket created and email sent successfully');
      form.resetFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      message.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spin tip="Loading form data..." />;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Create Support Ticket</h1>
      <Form form={form} onFinish={onFinish} layout="vertical">
        {/* QR Code Input */}
        <Form.Item label="QR Code Scan" name="qr_input">
          <Input.Search
            ref={qrInputRef}
            placeholder="Paste QR code (e.g., client:CLIENT_ID;asset:ASSET_ID)"
            enterButton="Parse QR"
            onSearch={handleParseQR}
          />
        </Form.Item>

        {/* Email Content Input */}
        <Form.Item label="Email Content" name="email_input">
          <TextArea
            rows={4}
            placeholder="Paste email content (e.g., Subject: Your Subject\nBody: Your description)"
          />
          <Button style={{ marginTop: 8 }} onClick={handleParseEmail}>
            Parse Email
          </Button>
        </Form.Item>

        {/* Complaint Subject */}
        <Form.Item
          label="Complaint Subject"
          name="subject"
          rules={[{ required: true, message: 'Please enter a subject' }]}
        >
          <Input />
        </Form.Item>

        {/* Description */}
        <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please enter a Description' }]}>
          <TextArea rows={4} />
        </Form.Item>

        {/* Client */}
        <Form.Item
          label="Client"
          name="client_id"
          rules={[{ required: true, message: 'Please select a client' }]}
        >
          <Select allowClear>
            {clients.map((client) => (
              <Option key={client.id} value={client.id}>
                {client.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Contact */}
        <Form.Item label="Contact" name="contact_id">
          <div style={{ display: 'flex', gap: 8 }}>
            <Select allowClear style={{ flex: 1 }}>
              {contacts.map((contact) => (
                <Option key={contact.id} value={contact.id}>
                  {contact.name}
                </Option>
              ))}
            </Select>
            <Button icon={<PlusOutlined />} onClick={() => setIsContactModalVisible(true)}>
              Add New Contact
            </Button>
          </div>
        </Form.Item>

        {/* Category */}
        <Form.Item label="Category" name="category_id">
          <Select allowClear>
            {categories.map((category) => (
              <Option key={category.id} value={category.id}>
                {category.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Contract */}
        <Form.Item label="Contract" name="contract_id">
          <Select allowClear>
            {contracts.map((contract) => (
              <Option key={contract.id} value={contract.id}>
                {contract.display_id}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Asset */}
        <Form.Item label="Asset" name="asset_id">
          <Select allowClear>
            {assets.map((asset) => (
              <Option key={asset.id} value={asset.id}>
                {asset.display_id}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Assignee */}
        <Form.Item label="Assignee" name="assignee_id">
          <Select allowClear>
            {assignees.map((assignee) => (
              <Option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Field Technician */}
        <Form.Item label="Field Technician" name="field_technician_id">
          <Select allowClear>
            {fieldTechnicians.map((technician) => (
              <Option key={technician.id} value={technician.id}>
                {technician.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Submit Ticket
          </Button>
        </Form.Item>
      </Form>

      {/* Modal for adding new contact */}
      <Modal
        title="Add New Contact"
        open={isContactModalVisible}
        onCancel={() => setIsContactModalVisible(false)}
        footer={null}
      >
        <Form form={contactForm} onFinish={handleAddContact} layout="vertical">
          <Form.Item
            label="Contact Name"
            name="name"
            rules={[{ required: true, message: 'Please enter contact name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Please enter contact email' }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Contact
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SupportTicketForm;