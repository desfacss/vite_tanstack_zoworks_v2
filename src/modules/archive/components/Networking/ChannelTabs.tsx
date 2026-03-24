// src/modules/archive/components/Networking/ChannelTabs.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Badge, Spin } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useQuery } from '@tanstack/react-query';
import Channels from './Channels';

interface Channel {
  id: string;
  slug: string;
  is_public: boolean;
  ui_order: number;
  is_inbox: boolean;
}

interface ChannelTabsProps {
  onTotalUnreadChange?: (total: number) => void;
}

const ChannelTabs: React.FC<ChannelTabsProps> = ({ onTotalUnreadChange }) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string>('');

  // Fetch channels
  const { data: channels = [], isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('id, slug, is_public, ui_order, is_inbox')
        .order('ui_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Set initial active tab
  useEffect(() => {
    if (channels.length > 0 && !activeTab) {
      setActiveTab(channels[0].id);
    }
  }, [channels, activeTab]);

  // Fetch unread counts
  const { data: unreadCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['unreadCounts', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const { data, error } = await supabase.rpc('get_unread_counts', {
        user_id: user.id,
      });
      if (error) throw error;
      return data.reduce((acc: Record<string, number>, row: { channel_id: string; unread_count: number }) => ({
        ...acc,
        [row.channel_id]: row.unread_count,
      }), {});
    },
    enabled: !!user?.id,
  });

  const tabItems = useMemo(() => {
    return channels.map((channel) => {
      const unreadCount = unreadCounts[channel.id] || 0;
      const subscribedChannels = (user?.details?.subscriptions?.channels || []) as string[];
      const isSubscribed = channel.is_public || subscribedChannels.includes(channel.id);

      return {
        key: channel.id,
        label: (
          <Badge count={unreadCount} overflowCount={99} size="small" offset={[10, 0]}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {channel.slug}
              {!isSubscribed && <LockOutlined style={{ marginLeft: 4, fontSize: '10px' }} />}
            </span>
          </Badge>
        ),
        children: (
          <div style={{ marginTop: '16px' }}>
            <Channels 
              channelId={channel.id} 
              isPrivate={!channel.is_public} 
            />
          </div>
        ),
      };
    });
  }, [channels, unreadCounts, user]);

  if (channelsLoading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

  return (
    <Tabs 
      activeKey={activeTab} 
      onChange={setActiveTab} 
      items={tabItems} 
      type="line"
      tabPosition="top"
    />
  );
};

export default ChannelTabs;
