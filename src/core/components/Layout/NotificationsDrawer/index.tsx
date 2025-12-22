import React from 'react';
import { Drawer, List, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Notification } from '../../../lib/types';

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  open,
  onClose,
  notifications,
}) => {
  const { t } = useTranslation();

  const renderNotification = (notification: Notification) => {
    const isActive =
      (!notification.expiry || new Date(notification.expiry) > new Date()) &&
      (!notification.start || new Date(notification.start) <= new Date());

    return (
      <List.Item className={isActive ? 'bg-blue-50 dark:bg-gray-700' : ''}>
        <List.Item.Meta
          title={
            <div className="flex items-center gap-2">
              <span>{notification.title}</span>
              {notification.type && (
                <Tag color={
                  notification.type === 'success' ? 'success' :
                    notification.type === 'warning' ? 'warning' :
                      notification.type === 'error' ? 'error' : 'default'
                }>
                  {notification.type}
                </Tag>
              )}
            </div>
          }
          description={notification.message}
        />
        <div className="text-xs text-gray-500">
          {new Date(notification.created_at).toLocaleDateString()}
        </div>
      </List.Item>
    );
  };

  return (
    <Drawer
      title={t('common.label.notifications')}
      placement="right"
      onClose={onClose}
      open={open}
      width={400}
    >
      <List
        dataSource={notifications}
        renderItem={renderNotification}
        locale={{ emptyText: t('common.message.no_notifications') }}
      />
    </Drawer>
  );
};