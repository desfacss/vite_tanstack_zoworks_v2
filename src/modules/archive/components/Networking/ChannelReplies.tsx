// src/modules/archive/components/Networking/ChannelReplies.tsx
import React, { useState } from 'react';
import { List, Avatar, Input, Button, Spin, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

interface ChannelRepliesProps {
  postId: string;
}

const ChannelReplies: React.FC<ChannelRepliesProps> = ({ postId }) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['post_replies', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_post_messages')
        .select(`
          *,
          user:users!channel_post_messages_user_id_fkey(user_name)
        `)
        .eq('post_id', postId)
        .order('inserted_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  const replyMutation = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from('channel_post_messages')
        .insert({
          post_id: postId,
          user_id: user?.id,
          message: text,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post_replies', postId] });
      queryClient.invalidateQueries({ queryKey: ['channel_messages'] }); // Refresh reply count in thread
      setReplyText('');
      message.success('Reply added');
    }
  });

  const handleSend = () => {
    if (!replyText.trim()) return;
    replyMutation.mutate(replyText);
  };

  if (isLoading) return <Spin style={{ margin: '10px' }} />;

  return (
    <div style={{ padding: '0 0 0 40px', background: '#fafafa', borderRadius: '4px' }}>
      <List
        size="small"
        dataSource={replies}
        renderItem={(item) => (
          <List.Item key={item.id}>
            <List.Item.Meta
              avatar={<Avatar size="small">{item.user?.user_name?.charAt(0) || 'U'}</Avatar>}
              title={
                <div style={{ fontSize: '12px' }}>
                  <span style={{ fontWeight: 'bold' }}>{item.user?.user_name || 'Unknown'}</span>
                  <span style={{ marginLeft: '8px', color: '#999' }}>{dayjs(item.inserted_at).fromNow()}</span>
                </div>
              }
              description={<div style={{ color: '#555', fontSize: '13px' }}>{item.message}</div>}
            />
          </List.Item>
        )}
      />
      <div style={{ display: 'flex', gap: '8px', padding: '10px' }}>
        <Input 
          size="small"
          placeholder="Write a reply..." 
          value={replyText} 
          onChange={(e) => setReplyText(e.target.value)}
          onPressEnter={handleSend}
        />
        <Button 
          size="small"
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend}
          loading={replyMutation.isPending}
        />
      </div>
    </div>
  );
};

export default ChannelReplies;
