import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Badge, List } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { Database } from '@/types/database.types';

// Define the type for a single notification based on your Supabase schema
type Notification = Database['public']['Tables']['notifications']['Row'];

const NotificationIcon: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const { location, user } = useAuthStore();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);

    // Get the latest state directly from the store to ensure freshness
    const { user: currentUser, location: currentLocation } = useAuthStore.getState();

    if (!currentUser || !currentLocation) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(
        `type.eq.public,` +
          `locations.cs.{${currentLocation.id}},` +
          `users.cs.{${currentUser.user_id}}`,
      )
      .gte('expiry', new Date().toISOString())
      .lte('start', new Date().toISOString())
      .order('start', { ascending: false })
      .returns<Notification[]>();

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      console.log('notifications', data);
      setNotifications(data || []);
    }

    setLoading(false);
  }, []); // Now the function is stable and has no dependencies.

  useEffect(() => {
    if (user && location) {
      fetchNotifications();
    }
  }, [user, location, fetchNotifications]);

  useEffect(() => {
    if (!user || !location) {
      return;
    }
    
    // Set up real-time listener for notifications
    const subscription = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('Real-time change detected!', payload);
          // Refetch notifications to get the latest data
          fetchNotifications();
        }
      )
      .subscribe();

    // Clean up the subscription on component unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, location, fetchNotifications]); // Dependencies for the real-time effect

  return (
    <>
      <Badge count={notifications.length}>
        <BellOutlined style={{ fontSize: '24px' }} onClick={openModal} />
      </Badge>
      <Modal
        title="Notifications"
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
      >
        <List
          loading={loading}
          dataSource={notifications}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={item.title}
                description={item.message}
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
};

export default NotificationIcon;