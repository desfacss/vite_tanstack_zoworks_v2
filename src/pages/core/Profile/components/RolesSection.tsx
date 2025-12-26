// src/pages/core/Profile/components/RolesSection.tsx
/**
 * Roles Section Component
 * Displays assigned roles with expandable permissions view and edit capability
 */
import React, { useState } from 'react';
import { Card, Typography, Tag, Collapse, Empty, Tooltip, Button } from 'antd';
import { Shield, ChevronRight, Key, Pencil } from 'lucide-react';
import EditRolesModal from './EditRolesModal';

const { Text, Title } = Typography;

interface Role {
  id: string;
  name: string;
}

interface RolesSectionProps {
  roles?: Role[];
  permissions?: Record<string, any>;
}

const PermissionBadge: React.FC<{ module: string; actions: Record<string, any> }> = ({
  module,
  actions,
}) => {
  const actionList = Object.entries(actions)
    .filter(([_, value]) => value === true || typeof value === 'object')
    .map(([key]) => key);

  return (
    <div className="flex items-center gap-2 mb-2">
      <Tag color="blue" className="capitalize">
        {module}
      </Tag>
      <div className="flex gap-1 flex-wrap">
        {actionList.map((action) => (
          <Tooltip key={action} title={`${module}.${action}`}>
            <Tag className="text-xs">{action}</Tag>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export const RolesSection: React.FC<RolesSectionProps> = ({ roles = [], permissions = {} }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const hasRoles = roles.length > 0;
  const hasPermissions = Object.keys(permissions).length > 0;

  return (
    <>
      <Card className="profile-roles-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Shield size={20} className="text-purple-500" />
            </div>
            <div>
              <Title level={5} className="!mb-0">
                Roles & Permissions
              </Title>
              <Text type="secondary" className="text-xs">
                Access control assignments
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

        {!hasRoles ? (
          <Empty description="No roles assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            {/* Roles List */}
            <div className="mb-4">
              <Text type="secondary" className="text-xs uppercase tracking-wide mb-2 block">
                Assigned Roles
              </Text>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Tag key={role.id} color="purple" className="px-3 py-1">
                    <Shield size={12} className="inline mr-1" />
                    {role.name}
                  </Tag>
                ))}
              </div>
            </div>

            {/* Permissions Accordion */}
            {hasPermissions && (
              <Collapse
                ghost
                expandIcon={({ isActive }) => (
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${isActive ? 'rotate-90' : ''}`}
                  />
                )}
                items={[
                  {
                    key: 'permissions',
                    label: (
                      <div className="flex items-center gap-2">
                        <Key size={14} />
                        <span>View Permissions</span>
                      </div>
                    ),
                    children: (
                      <div className="pt-2">
                        {Object.entries(permissions).map(([module, actions]) => (
                          <PermissionBadge
                            key={module}
                            module={module}
                            actions={typeof actions === 'object' ? actions : { [module]: actions }}
                          />
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </>
        )}
      </Card>

      <EditRolesModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentRoles={roles}
      />
    </>
  );
};

export default RolesSection;
