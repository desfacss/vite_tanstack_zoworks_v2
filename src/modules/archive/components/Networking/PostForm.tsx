// src/modules/archive/components/Networking/PostForm.tsx
import React from 'react';
import { Modal, Form, Input, Button, message, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface PostFormProps {
  visible: boolean;
  onClose: () => void;
  channelId: string;
}

const PostForm: React.FC<PostFormProps> = ({ visible, onClose, channelId }) => {
  const { t } = useTranslation('archive');
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
      title={t('label.new_post')}
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
        <Form.Item
          name="message"
          label={t('label.message') || 'Message'}
          rules={[{ required: true, message: t('message.enter_message') || 'Please enter a message' }]}
        >
          <Input.TextArea rows={4} placeholder={t('placeholder.whats_on_your_mind')} />
        </Form.Item>
        <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
          <Space>
            <Button onClick={onClose}>{t('action.cancel') || 'Cancel'}</Button>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              {t('action.post') || 'Post'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PostForm;
