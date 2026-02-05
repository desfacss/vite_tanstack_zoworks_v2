
// components/common/ApprovalActionButtons.tsx

import React, { useState, useEffect } from 'react';
import { Button, Space, message, Modal, Spin } from 'antd';
import { CheckCircle, XCircle } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase'; // Assuming this path is correct
import { useAuthStore } from '@/core/lib/store'; // Assuming this path is correct

// --- Configuration ---
// NOTE: Use the actual HR Role ID from your system.
const HR_ROLE_ID = '80d2b431-7b95-453a-9a24-b697eefeca42';
// Define the stage ID(s) that permit an approval/rejection action
const ELIGIBLE_STATUSES = ['Submitted', 'Pending', 'Under Review', null, undefined];
const COMPLETED_STATUSES = ['Approved', 'Rwejected'];
// ---------------------

interface ApprovalActionButtonsProps {
  entityId: string;
  entityType: string; // The table name (e.g., 'public.timesheet')
  entitySchema: string; // The schema name (e.g., 'public')
  currentStatus: string | null | undefined;
  submitterUserId: string | null;
  createdAt: string | null;
}

const ApprovalActionButtons: React.FC<ApprovalActionButtonsProps> = ({
  entityId,
  entityType,
  entitySchema,
  currentStatus,
  submitterUserId,
  createdAt,
}) => {
  const [isApprover, setIsApprover] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const { organization, user } = useAuthStore();
  const queryClient = useQueryClient();
  // 1. Check if the current user is an eligible approver for this record
  const checkApproverEligibility = async () => {
    // Basic checks to prevent unnecessary API calls
    if (!submitterUserId || !createdAt || !organization?.id || !user?.id) {
      setIsApprover(false);
      return;
    }

    // Check if the current status allows for approval/rejection
    const statusIsEligible = ELIGIBLE_STATUSES.some(s => s === currentStatus);
    if (!statusIsEligible) {
      setIsApprover(false);
      return;
    }

    setIsCheckingEligibility(true);

    try {
      // Calling the stored procedure/RPC to check eligibility
      const { data: approvers, error } = await supabase.schema('identity').rpc('get_all_approvers', {
        p_submitter_user_id: submitterUserId,
        p_hr_role_id: HR_ROLE_ID,
        p_organization_id: organization.id,
        p_created_at: createdAt,
        p_current_time: new Date().toISOString(),
      });
      console.log("bz", {
        p_submitter_user_id: submitterUserId,
        p_hr_role_id: HR_ROLE_ID,
        p_organization_id: organization.id,
        p_created_at: createdAt,
        p_current_time: new Date().toISOString(),
      }, approvers, user?.id);
      if (error) {
        console.error('Error fetching approvers:', error);
        setIsApprover(false);
        return;
      }

      // Check if the current user's ID is in the list of eligible approvers
      const isEligible = Array.isArray(approvers) && approvers.some(approver => approver.user_id === user.id);

      setIsApprover(isEligible);

    } catch (error) {
      console.error('Approval check failed:', error);
      setIsApprover(false);
      message.error('Failed to check approval eligibility.');
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  useEffect(() => {
    checkApproverEligibility();
  }, [submitterUserId, createdAt, currentStatus, organization?.id, user?.id]);

  // 2. Mutation for updating the record status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: 'Approved' | 'Rejected') => {
      if (!entityId || !entityType) throw new Error('Entity information missing.');

      const payload = {
        // The column in your table that holds the status/stage information
        status: newStatus,
        stage_id: newStatus,
        // Add audit fields if necessary
        // approved_by: newStatus === 'Approved' ? user?.id : null,
        // rejected_by: newStatus === 'Rejected' ? user?.id : null,
        // approved_at: newStatus === 'Approved' ? new Date().toISOString() : null,
        // rejected_at: newStatus === 'Rejected' ? new Date().toISOString() : null,
      };

      // Use the core_upsert_data_v7 RPC for the update
      // const { error } = await supabase.rpc('core_upsert_data_v7', {
      const { error } = await supabase.schema('core').rpc('api_new_core_upsert_data', {
        // table_name: `${ entitySchema }.${ entityType } `,
        table_name: entityType,
        data: payload,
        id: entityId,
      });

      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: [entityType?.split('.')[1], organization?.id] });
      message.success(`Successfully ${newStatus} !`);
      // Re-run eligibility check to hide buttons after update
      setIsApprover(false);
      // checkApproverEligibility(); 
    },
    onError: (error: any, newStatus) => {
      message.error(error.message || `Failed to ${newStatus.toLowerCase()} ${entityType}.`);
    },
  });


  // 3. Handlers with Confirmation Popups
  const handleAction = (action: 'Approved' | 'Rejected') => {
    const title = `${action} Confirmation`;
    const content = `Are you sure you want to ${action.toLowerCase()} this ${entityType}?`;

    Modal.confirm({
      title: title,
      content: content,
      okText: action,
      okType: action === 'Rejected' ? 'danger' : 'primary',
      cancelText: 'Cancel',
      onOk() {
        updateStatusMutation.mutate(action);
      },
      // Do nothing on Cancel
    });
  };


  // 4. Render Logic
  if (isCheckingEligibility || updateStatusMutation.isPending) {
    return <Spin tip={isCheckingEligibility ? "Checking eligibility..." : "Submitting action..."} style={{ marginTop: '20px' }} />;
  }

  if (!isApprover) return null;

  return (
    <Space
      style={{
        marginTop: '20px',
        padding: '15px 0',
        borderTop: '1px solid #f0f0f0',
        width: '100%',
        justifyContent: 'flex-start'
      }}
    >
      <Button
        type="primary"
        className="bg-green-600 hover:bg-green-700 border-green-600"
        icon={<CheckCircle size={16} />}
        loading={updateStatusMutation.isPending}
        onClick={() => handleAction('Approved')}
      >
        Approve
      </Button>
      <Button
        danger
        icon={<XCircle size={16} />}
        loading={updateStatusMutation.isPending}
        onClick={() => handleAction('Rejected')}
      >
        Reject
      </Button>
    </Space>
  );
};

export default ApprovalActionButtons;