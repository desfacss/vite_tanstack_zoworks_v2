// src/modules/archive/components/Networking/ChannelThread.tsx
import React, { useState } from 'react';
import { List, Avatar, Button, Tag, Spin, Empty, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Trash2 } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ChannelReplies from './ChannelReplies';

dayjs.extend(relativeTime);

interface ChannelThreadProps {
  channelId: string;
  isPrivate?: boolean;
}

const PAGE_SIZE = 15;

const ChannelThread: React.FC<ChannelThreadProps> = ({ channelId }) => {
  const { t } = useTranslation('archive');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page] = useState(0);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  const toggleReplies = (id: string) => {
    setExpandedPosts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['channel_messages', channelId, page],
    queryFn: async () => {
      let query = supabase
        .from('channel_posts')
        .select(`
          *,
          user:users!channel_posts_user_id_fkey(user_name),
          reply_count:channel_post_messages(count)
        `)
        .eq('channel_id', channelId)
        .order('inserted_at', { ascending: false });

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error } = await query.range(from, to);
      if (error) throw error;

      return data.map((msg: any) => ({
        ...msg,
        reply_count: msg.reply_count[0]?.count || 0
      }));
    },
    enabled: !!channelId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('channel_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel_messages', channelId] });
      message.success('Post deleted');
    }
  });

  if (isLoading && page === 0) return <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>;

  return (
    <div className="channel-thread">
      <List
        dataSource={messages}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={[
              <Button 
                key="reply" 
                type="link" 
                icon={<MessageSquare size={14} />} 
                size="small"
                onClick={() => toggleReplies(item.id)}
              >
                {item.reply_count > 0 ? `${item.reply_count} ${t('label.replies')}` : t('label.reply')}
              </Button>,
              user?.id === item.user_id && (
                <Button 
                  key="delete"
                  type="link" 
                  danger 
                  icon={<Trash2 size={14} />} 
                  size="small"
                  onClick={() => deleteMutation.mutate(item.id)}
                />
              )
            ].filter(Boolean) as React.ReactNode[]}
          >
            <List.Item.Meta
              avatar={<Avatar>{item.user?.user_name?.charAt(0) || 'U'}</Avatar>}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.user?.user_name || 'Unknown User'}</span>
                  <span style={{ fontSize: '11px', color: '#999' }}>{dayjs(item.inserted_at).fromNow()}</span>
                </div>
              }
              description={
                <div>
                  <div style={{ marginBottom: '8px', color: '#333' }}>{item.message}</div>
                  {item.details?.tags?.map((tag: string) => <Tag key={tag}>{tag}</Tag>)}
                </div>
              }
            />
            {expandedPosts[item.id] && <ChannelReplies postId={item.id} />}
          </List.Item>
        )}
      />
      {messages.length === 0 && <Empty description={t('label.no_messages')} />}
    </div>
  );
};

export default ChannelThread;
