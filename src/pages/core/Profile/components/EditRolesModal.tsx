// src/pages/core/Profile/components/EditRolesModal.tsx
/**
 * Edit Roles Modal
 * Allows users to select/deselect their role assignments
 */
import React, { useEffect, useState } from 'react';
import { Modal, Checkbox, Spin, Empty, Alert } from 'antd';
import { Shield } from 'lucide-react';
import { useFetchAvailableRoles, useUpdateRoles } from '@/core/hooks/useProfileMutations';
import { useAuthStore } from '@/core/lib/store';

interface Role {
  id: string;
  name: string;
  permissions?: Record<string, any>;
  is_active?: boolean;
}

interface EditRolesModalProps {
  open: boolean;
  onClose: () => void;
  currentRoles: { id: string; name: string }[];
}

export const EditRolesModal: React.FC<EditRolesModalProps> = ({
  open,
  onClose,
  currentRoles,
}) => {
  const { teams } = useAuthStore();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  const fetchRoles = useFetchAvailableRoles();
  const updateRoles = useUpdateRoles();

  // Initialize selected roles from current roles
  useEffect(() => {
    if (open) {
      setSelectedRoleIds(currentRoles.map(r => r.id));
      fetchRoles.mutate(undefined, {
        onSuccess: (data) => setAvailableRoles(data),
      });
    }
  }, [open, currentRoles]);

  const handleToggleRole = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoleIds(prev => [...prev, roleId]);
    } else {
      setSelectedRoleIds(prev => prev.filter(id => id !== roleId));
    }
  };

  const handleSave = () => {
    // Use the first team as the default team for role assignment
    const defaultTeamId = teams?.[0]?.id;
    if (!defaultTeamId) {
      return;
    }

    updateRoles.mutate(
      { roleIds: selectedRoleIds, teamId: defaultTeamId },
      { onSuccess: () => onClose() }
    );
  };

  const isLoading = fetchRoles.isPending;
  const isSaving = updateRoles.isPending;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-purple-500" />
          <span>Edit Roles</span>
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
      {!teams?.length && (
        <Alert
          type="warning"
          message="You must be assigned to at least one team before you can update roles."
          className="mb-4"
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : availableRoles.length === 0 ? (
        <Empty description="No roles available" />
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {availableRoles.map((role) => (
            <div
              key={role.id}
              className="flex items-center p-3 rounded-lg bg-fill-quaternary hover:bg-fill-tertiary transition-colors"
            >
              <Checkbox
                checked={selectedRoleIds.includes(role.id)}
                onChange={(e) => handleToggleRole(role.id, e.target.checked)}
                disabled={!teams?.length}
              >
                <span className="font-medium">{role.name}</span>
              </Checkbox>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default EditRolesModal;
