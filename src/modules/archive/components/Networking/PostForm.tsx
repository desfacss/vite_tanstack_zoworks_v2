// src/modules/archive/components/Networking/PostForm.tsx
import React from 'react';
import { Modal, Form, Input, Button, message, Space } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface PostFormProps {
  visible: boolean;
  onClose: () => void;
  channelId: string;
}

const PostForm: React.FC<PostFormProps> = ({ visible, onClose, channelId }) => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: { message: string }) => {
      const { error } = await supabase.from('channel_posts').insert([
        {
          message: values.message,
          channel_id: channelId,
          user_id: user?.id,
          details: { tags: [] }
        }
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel_messages', channelId] });
      message.success('Post created successfully');
      form.resetFields();
      onClose();
    },
    onError: (err) => {
      console.error('Error creating post:', err);
      message.error('Failed to create post');
    }
  });

  return (
    <Modal
      title="Create New Post"
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
        <Form.Item
          name="message"
          label="Message"
          rules={[{ required: true, message: 'Please enter a message' }]}
        >
          <Input.TextArea rows={4} placeholder="What's on your mind?" />
        </Form.Item>
        <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              Post
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PostForm;
