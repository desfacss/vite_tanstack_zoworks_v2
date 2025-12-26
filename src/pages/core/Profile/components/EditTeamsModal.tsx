// src/pages/core/Profile/components/EditTeamsModal.tsx
/**
 * Edit Teams Modal
 * Allows users to select/deselect their team memberships
 */
import React, { useEffect, useState } from 'react';
import { Modal, Checkbox, Spin, Empty } from 'antd';
import { Users } from 'lucide-react';
import { useFetchAvailableTeams, useUpdateTeams } from '@/core/hooks/useProfileMutations';

interface Team {
  id: string;
  name: string;
  location_id?: string;
}

interface EditTeamsModalProps {
  open: boolean;
  onClose: () => void;
  currentTeams: { id: string; name: string }[];
}

export const EditTeamsModal: React.FC<EditTeamsModalProps> = ({
  open,
  onClose,
  currentTeams,
}) => {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);

  const fetchTeams = useFetchAvailableTeams();
  const updateTeams = useUpdateTeams();

  // Initialize selected teams from current teams
  useEffect(() => {
    if (open) {
      setSelectedTeamIds(currentTeams.map(t => t.id));
      fetchTeams.mutate(undefined, {
        onSuccess: (data) => setAvailableTeams(data),
      });
    }
  }, [open, currentTeams]);

  const handleToggleTeam = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeamIds(prev => [...prev, teamId]);
    } else {
      setSelectedTeamIds(prev => prev.filter(id => id !== teamId));
    }
  };

  const handleSave = () => {
    updateTeams.mutate(
      { teamIds: selectedTeamIds },
      { onSuccess: () => onClose() }
    );
  };

  const isLoading = fetchTeams.isPending;
  const isSaving = updateTeams.isPending;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Users size={18} className="text-green-500" />
          <span>Edit Teams</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save Changes"
      okButtonProps={{ loading: isSaving, disabled: isLoading }}
      cancelButtonProps={{ disabled: isSaving }}
      destroyOnClose
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : availableTeams.length === 0 ? (
        <Empty description="No teams available" />
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {availableTeams.map((team) => (
            <div
              key={team.id}
              className="flex items-center p-3 rounded-lg bg-fill-quaternary hover:bg-fill-tertiary transition-colors"
            >
              <Checkbox
                checked={selectedTeamIds.includes(team.id)}
                onChange={(e) => handleToggleTeam(team.id, e.target.checked)}
              >
                <span className="font-medium">{team.name}</span>
              </Checkbox>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default EditTeamsModal;
