import React, { useState, useRef } from 'react';
import { Form, Input, Button, message, Spin, Select } from 'antd';
import { supabase } from '@/lib/supabase';
import ImageUploader from '@/core/components/shared/ImageUploader';

// ===================================================================================
// INTERFACES
// ===================================================================================
interface FormData {
  subject: string;
  description?: string;
  receiver_emails?: string[];
}

interface ImageObject {
  url: string;
  thumbnail?: string;
  name: string;
  type: string;
  description: string;
  created_at: string;
  location?: { lat: number; lng: number };
}

interface QrTicketFormProps {
  asset_id: string;
  onSuccess?: () => void;
}

// ===================================================================================
// COMPONENT DEFINITION
// ===================================================================================
const QrTicketForm: React.FC<QrTicketFormProps> = ({ asset_id, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const imageUploaderRef = useRef<{ triggerUpload: () => Promise<ImageObject[]> }>(null);

  const handleSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const uploadedImages: ImageObject[] = imageUploaderRef.current
        ? await imageUploaderRef.current.triggerUpload()
        : [];
      console.log(uploadedImages, "uploadedImages");
      // Call the new RPC function for public ticket creation
      const { error } = await supabase.rpc('tkt_wrapper_create_qr_ticket_v5', {
        p_asset_id: asset_id,
        p_subject: values.subject,
        p_description: values.description || null,
        p_receiver_emails: values.receiver_emails || [],
        p_images: uploadedImages || [],
      });

      if (error) {
        console.error('RPC Error:', error);
        throw new Error(`Failed to create ticket: ${error.message}`);
      }

      message.success('Ticket created successfully!');
      form.resetFields();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      message.error(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Create Ticket for Asset</h1>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please enter a subject' }]}
          >
            <Input placeholder="Enter ticket subject" />
          </Form.Item>
          <Form.Item name="description" label="Details">
            <Input.TextArea rows={4} placeholder="Enter additional details" />
          </Form.Item>
          <Form.Item
            name="receiver_emails"
            label="Your Email"
            tooltip="Type an email and press Enter. These will be CC'd on communications."
            rules={[{ required: true, message: 'Please enter a Email' }]}
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Add email addresses and press Enter"
              tokenSeparators={[',', ' ']}
            />
          </Form.Item>
          <ImageUploader ref={imageUploaderRef} autoUpload={true} onUploadComplete={() => { }} />
          <Form.Item>
            <Button className="mt-2" type="primary" htmlType="submit" loading={loading}>
              Submit Ticket
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Spin>
  );
};

export default QrTicketForm;