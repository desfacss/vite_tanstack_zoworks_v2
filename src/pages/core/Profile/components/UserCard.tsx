// src/pages/core/Profile/components/UserCard.tsx
/**
 * User Identity Card Component
 * Displays user avatar, name, email, and contact info
 */
import React from 'react';
import { Card, Typography, Space, Tag } from 'antd';
import { Mail, Phone, Shield } from 'lucide-react';
import { User } from '@/core/lib/types';
import { ProfileAvatar } from '@/core/components/Layout/Profile';

const { Text, Title } = Typography;

interface UserCardProps {
  user: User | null;
  isSaasAdmin?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({ user, isSaasAdmin = false }) => {
  if (!user) return null;

  const email = user.details?.email || user.email || 'No email set';
  const mobile = user.details?.mobile || user.mobile || 'No mobile set';

  return (
    <Card className="profile-user-card">
      <div className="flex items-start gap-6">
        {/* Large Avatar */}
        <ProfileAvatar size={80} />

        {/* User Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Title level={3} className="!mb-0 !text-lg">
              {user.name || 'Unknown User'}
            </Title>
            {isSaasAdmin && (
              <Tag color="gold" icon={<Shield size={12} />}>
                Admin
              </Tag>
            )}
          </div>

          <Space direction="vertical" size={8} className="w-full">
            <div className="flex items-center gap-2 text-text-secondary">
              <Mail size={14} className="flex-shrink-0 opacity-60" />
              <Text className="text-sm truncate">{email}</Text>
            </div>

            <div className="flex items-center gap-2 text-text-secondary">
              <Phone size={14} className="flex-shrink-0 opacity-60" />
              <Text className="text-sm truncate">{mobile}</Text>
            </div>
          </Space>
        </div>
      </div>
    </Card>
  );
};

export default UserCard;
