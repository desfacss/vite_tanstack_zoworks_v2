// src/pages/core/Profile/components/TeamsSection.tsx
/**
 * Teams Section Component
 * Displays team memberships with edit capability
 */
import React, { useState } from 'react';
import { Card, Typography, Tag, Empty, Button } from 'antd';
import { Users, Pencil } from 'lucide-react';
import EditTeamsModal from './EditTeamsModal';

const { Text, Title } = Typography;

interface Team {
  id: string;
  name: string;
}

interface TeamsSectionProps {
  teams?: Team[];
}

export const TeamsSection: React.FC<TeamsSectionProps> = ({ teams = [] }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const hasTeams = teams.length > 0;

  return (
    <>
      <Card className="profile-teams-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Users size={20} className="text-green-500" />
            </div>
            <div>
              <Title level={5} className="!mb-0">
                Teams
              </Title>
              <Text type="secondary" className="text-xs">
                Group memberships
              </Text>
            </div>
          </div>
          <Button
            type="text"
            icon={<Pencil size={16} />}
            onClick={() => setIsEditModalOpen(true)}
            className="text-text-secondary hover:text-primary"
          />
        </div>

        {!hasTeams ? (
          <Empty description="No team assignments" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <Tag
                key={team.id}
                color="green"
                className="px-3 py-1.5 text-sm"
              >
                <Users size={12} className="inline mr-1.5" />
                {team.name}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      <EditTeamsModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentTeams={teams}
      />
    </>
  );
};

export default TeamsSection;
