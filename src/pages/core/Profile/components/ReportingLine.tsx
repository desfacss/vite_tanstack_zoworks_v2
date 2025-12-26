// src/pages/core/Profile/components/ReportingLine.tsx
/**
 * Reporting Line Component
 * Displays manager information and reporting hierarchy
 */
import React from 'react';
import { Card, Typography, Avatar, Skeleton, Tag } from 'antd';
import { UserCheck, ArrowUp, Crown } from 'lucide-react';
import { ManagerInfo } from '@/core/hooks/useUserProfile';

const { Text, Title } = Typography;

interface ReportingLineProps {
  manager: ManagerInfo | null | undefined;
  isLoading?: boolean;
  subordinateCount?: number;
}

export const ReportingLine: React.FC<ReportingLineProps> = ({
  manager,
  isLoading = false,
  subordinateCount = 0,
}) => {
  const hasSubordinates = subordinateCount > 0;

  return (
    <Card className="profile-reporting-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <UserCheck size={20} className="text-blue-500" />
        </div>
        <div>
          <Title level={5} className="!mb-0">
            Reporting Line
          </Title>
          <Text type="secondary" className="text-xs">
            Organizational hierarchy
          </Text>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3">
          <Skeleton.Avatar active size="large" />
          <Skeleton.Input active size="small" style={{ width: 120 }} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Reports To */}
          <div>
            <Text type="secondary" className="text-xs uppercase tracking-wide mb-2 block">
              <ArrowUp size={12} className="inline mr-1" />
              Reports To
            </Text>
            {manager ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-fill-quaternary">
                <Avatar
                  size={40}
                  className="flex-shrink-0"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                  }}
                >
                  {manager.name?.charAt(0).toUpperCase() || '?'}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Text strong className="block truncate">
                    {manager.name}
                  </Text>
                  {manager.email && (
                    <Text type="secondary" className="text-xs truncate block">
                      {manager.email}
                    </Text>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-fill-quaternary">
                <Crown size={16} className="text-yellow-500" />
                <Text type="secondary">Top of hierarchy (No manager)</Text>
              </div>
            )}
          </div>

          {/* Direct Reports */}
          {hasSubordinates && (
            <div>
              <Text type="secondary" className="text-xs uppercase tracking-wide mb-2 block">
                Direct Reports
              </Text>
              <Tag color="blue" className="px-3 py-1">
                {subordinateCount} team member{subordinateCount !== 1 ? 's' : ''}
              </Tag>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ReportingLine;
