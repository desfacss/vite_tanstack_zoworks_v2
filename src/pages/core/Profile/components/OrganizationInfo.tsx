// src/pages/core/Profile/components/OrganizationInfo.tsx
/**
 * Organization Info Component
 * Displays current organization context and membership status
 */
import React from 'react';
import { Card, Typography, Tag, Space } from 'antd';
import { Building2, MapPin, Clock } from 'lucide-react';
import { Organization, Location } from '@/core/lib/types';

const { Text, Title } = Typography;

interface OrganizationInfoProps {
  organization: Organization | null;
  location: Location | null;
  memberSince?: string;
  isActive?: boolean;
}

export const OrganizationInfo: React.FC<OrganizationInfoProps> = ({
  organization,
  location,
  memberSince,
  isActive = true,
}) => {
  if (!organization) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="profile-org-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 size={20} className="text-primary" />
        </div>
        <div>
          <Title level={5} className="!mb-0">
            Organization
          </Title>
          <Text type="secondary" className="text-xs">
            Current workspace context
          </Text>
        </div>
      </div>

      <Space direction="vertical" size={12} className="w-full">
        <div className="flex items-center justify-between">
          <Text strong>{organization.name}</Text>
          <Tag color={isActive ? 'success' : 'default'}>
            {isActive ? 'Active' : 'Inactive'}
          </Tag>
        </div>

        {location && (
          <div className="flex items-center gap-2 text-text-secondary">
            <MapPin size={14} className="flex-shrink-0 opacity-60" />
            <Text className="text-sm">{location.name}</Text>
          </div>
        )}

        {memberSince && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock size={14} className="flex-shrink-0 opacity-60" />
            <Text className="text-sm">Member since {formatDate(memberSince)}</Text>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default OrganizationInfo;
