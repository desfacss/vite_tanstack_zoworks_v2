import React from 'react';
import { Button, Transfer, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '@/core/lib/store';

interface RoleMembersProps {
  role_id: string | undefined;
  open: boolean;
  onClose: () => void;
}

const RoleMembers: React.FC<RoleMembersProps> = ({ editItem }) => {
  const role_id = editItem?.id; 
  const { t } = useTranslation();
  const { user, organization } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['users', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('identity').from('users')
        .select('*')
        .eq('organization_id', organization?.id)
        // .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });

  // Fetch role members
  const { data: roleMembers = [] } = useQuery({
    queryKey: ['role-members', role_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('identity').from('user_roles')
        .select('user_id')
        .eq('role_id', role_id);

      if (error) throw error;
      return data.map(item => item.user_id);
    },
    enabled: !!role_id,
  });

  // Mutation to update role members
  const updateRoleMembersMutation = useMutation({
    mutationFn: async ({ roleId, memberIds }: { roleId: string; memberIds: string[] }) => {
      await supabase.schema('identity').from('user_roles').delete().eq('role_id', roleId);
      if (memberIds.length > 0) {
        const { error } = await supabase
          .schema('identity').from('user_roles')
          .insert(
            memberIds.map(userId => ({
              role_id: roleId,
              user_id: userId,
              created_by: user?.id,
            }))
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-members', role_id] });
      message.success(t('roles.members'));
    },
    onError: (error: any) => {
      message.error(error.message);
    },
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow">
        <Transfer
          dataSource={users.map(user => ({
            key: user.id,
            title: user.name,
          }))}
          targetKeys={roleMembers}
          onChange={targetKeys => {
            queryClient.setQueryData(['role-members', role_id], targetKeys);
          }}
          render={item => item.title}
          className="mb-4"
        />
      </div>
      <Button
        type="primary"
        block
        onClick={() => {
          if (role_id) {
            updateRoleMembersMutation.mutate({
              roleId: role_id,
              memberIds: roleMembers,
            });
          }
        }}
      >
        {t('common.save')}
      </Button>
    </div>
  );
};

export default RoleMembers;