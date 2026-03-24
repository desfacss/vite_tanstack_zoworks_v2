// src/modules/archive/components/Networking/Channels.tsx
import React, { useState } from 'react';
import { Card, Button, Result, Spin, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Lock, MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ChannelThread from './ChannelThread';
import PostForm from './PostForm';

interface ChannelsProps {
  channelId: string;
  isPrivate?: boolean;
}

const Channels: React.FC<ChannelsProps> = ({ channelId, isPrivate }) => {
  const { t } = useTranslation('archive');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showPostForm, setShowPostForm] = useState(false);

  // Fetch channel details
  const { data: channel, isLoading } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  const handleJoinRequest = async () => {
    if (!channel) return;
    const { error } = await supabase
      .from('channels')
      .update({
        join_requests: [...(channel.join_requests || []), user?.id],
      })
      .eq('id', channelId);

    if (error) {
       console.error('Failed to request join:', error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
    }
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>;
  if (!channel) return <Result status="404" title="Channel not found" />;

  const isSubscribed = channel.is_public || (user?.details?.subscriptions?.channels || []).includes(channel.id);
  const isAuthorized = isSubscribed || (channel.join_requests || []).includes(user?.id) || (user as any)?.bypass;

  if (!isAuthorized && !channel.is_public) {
    return (
      <Result
        icon={<Lock size={48} />}
        title="This channel is private"
        subTitle="You need to be a member to view this channel."
        extra={<Button type="primary" onClick={handleJoinRequest}>Request to Join</Button>}
      />
    );
  }

  return (
    <Card 
      title={channel.slug} 
      extra={
        <Button type="primary" icon={<MessageSquarePlus size={14} />} onClick={() => message.info('Coming soon')}>
          {t('label.new_post')}
        </Button>
      }
      bordered={false}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '0 16px 16px' }}>
        <ChannelThread channelId={channelId} isPrivate={isPrivate} />
      </div>

      <PostForm 
        visible={showPostForm} 
        onClose={() => setShowPostForm(false)} 
        channelId={channelId}
      />
    </Card>
  );
};

export default Channels;
