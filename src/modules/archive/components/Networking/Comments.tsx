// src/modules/archive/components/Networking/Comments.tsx
import React, { useState } from 'react';
import { List, Avatar, Input, Button, Spin, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface CommentsProps {
  entityId: string;
  entityType?: string;
}

const Comments: React.FC<CommentsProps> = ({ entityId, entityType = 'general' }) => {
  const { t } = useTranslation('archive');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['entity_comments', entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_posts')
        .select(`
          *,
          user:users!channel_posts_user_id_fkey(user_name)
        `)
        .eq('channel_id', entityId) // Using channel_id as entity_id for simplicity in this module
        .order('inserted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from('channel_posts').insert([
        {
          message: text,
          channel_id: entityId,
          user_id: user?.id,
          details: { type: entityType, tags: [] }
        }
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity_comments', entityId] });
      setCommentText('');
      message.success('Comment added');
    }
  });

  const handleSend = () => {
    if (!commentText.trim() || mutation.isPending) return;
    mutation.mutate(commentText);
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: '10px' }}><Spin size="small" /></div>;

  return (
    <div className="comments-section">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <TextArea 
          rows={2}
          placeholder={t('label.add_comment') || 'Add a comment...'} 
          value={commentText} 
          onChange={(e) => setCommentText(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button 
          type="primary" 
          icon={<Send size={16} />} 
          onClick={handleSend}
          loading={mutation.isPending}
        >
          {t('action.post') || 'Post'}
        </Button>
      </div>

      <List
        dataSource={comments}
        renderItem={(item) => (
          <List.Item key={item.id}>
            <List.Item.Meta
              avatar={<Avatar icon={<MessageSquare size={14} />} />}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography.Text strong>{item.user?.user_name || 'User'}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: '11px' }}>
                    {dayjs(item.inserted_at).fromNow()}
                  </Typography.Text>
                </div>
              }
              description={item.message}
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default Comments;
