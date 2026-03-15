
// components/common/ApprovalActionButtons.tsx
// Blueprint-driven approval routing via identity.get_all_approvers_from_blueprint

import React, { useState, useEffect } from 'react';
import { Button, Space, message, Modal, Spin } from 'antd';
import { CheckCircle, XCircle } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

interface ApprovalActionButtonsProps {
  entityId: string;
  entityType: string;      // e.g. 'workforce.leave_applications'
  entitySchema: string;
  currentStageId: string | null | undefined;
  submitterUserId: string | null;
  createdAt: string | null;
  automationBpInstanceId?: string | null; // from leave_applications.automation_bp_instance_id
}

const ApprovalActionButtons: React.FC<ApprovalActionButtonsProps> = ({
  entityId,
  entityType,
  entitySchema,
  currentStageId,
  submitterUserId,
  createdAt,
  automationBpInstanceId,
}) => {
  const [isApprover, setIsApprover] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const { organization, user } = useAuthStore();
  const queryClient = useQueryClient();

  const checkApproverEligibility = async () => {
    // PRE-EMPTIVE GUARD: If record is already in a terminal stage, don't show buttons
    const terminalStages = ['Approved', 'Rejected', 'Cancelled'];
    if (currentStageId && terminalStages.includes(currentStageId)) {
      console.log('[ApprovalActionButtons] Record is in a terminal stage, hiding buttons.');
      setIsApprover(false);
      return;
    }

    console.log('[ApprovalActionButtons] Checking eligibility:', {
      entityId, currentStageId, submitterUserId, createdAt,
      automationBpInstanceId, orgId: organization?.id, userId: user?.id
    });

    // Basic guards
    if (!submitterUserId || !createdAt || !organization?.id || !user?.id || !currentStageId) {
      console.warn('[ApprovalActionButtons] Missing required fields or currentStageId, skipping check.');
      setIsApprover(false);
      return;
    }

    setIsCheckingEligibility(true);

    try {
      // ── Step 1: Resolve blueprint definition ───────────────────────────────
      let blueprintDefinition: any = null;

      if (automationBpInstanceId) {
        // Follow: bp_instance → blueprint_id → bp_process_blueprints.definition
        const { data: bpInstance, error: bpInstanceError } = await supabase
          .schema('automation')
          .from('bp_instances')
          .select('blueprint_id')
          .eq('id', automationBpInstanceId)
          .single();

        if (bpInstanceError || !bpInstance) {
          console.warn('[ApprovalActionButtons] Could not fetch bp_instance:', bpInstanceError);
        } else {
          const { data: blueprint, error: blueprintError } = await supabase
            .schema('automation')
            .from('bp_process_blueprints')
            .select('definition')
            .eq('id', bpInstance.blueprint_id)
            .single();

          if (blueprintError || !blueprint) {
            console.warn('[ApprovalActionButtons] Could not fetch blueprint:', blueprintError);
          } else {
            blueprintDefinition = blueprint.definition;
          }
        }
      }

      if (!blueprintDefinition) {
        console.warn('[ApprovalActionButtons] No blueprint definition available, cannot determine approvers.');
        setIsApprover(false);
        return;
      }

      // ── Step 2: Resolve submitter's org_user_id ────────────────────────────
      const { data: orgUserData, error: orgUserError } = await supabase
        .schema('identity')
        .from('organization_users')
        .select('id')
        .eq('user_id', submitterUserId)
        .eq('organization_id', organization.id)
        .single();

      if (orgUserError || !orgUserData) {
        console.warn('[ApprovalActionButtons] Could not find org_user for submitter:', submitterUserId);
        setIsApprover(false);
        return;
      }

      const submitterOrgUserId = orgUserData.id;

      // ── Step 3: Call get_all_approvers_from_blueprint ──────────────────────
      const { data: approvers, error: rpcError } = await supabase
        .schema('identity')
        .rpc('get_all_approvers_from_blueprint', {
          p_submitter_org_user_id: submitterOrgUserId,
          p_organization_id: organization.id,
          p_blueprint_definition: blueprintDefinition,
          p_current_stage_id: currentStageId,
          p_created_at: createdAt,
          p_current_time: new Date().toISOString(),
        });

      console.log('[ApprovalActionButtons] Blueprint RPC result:', {
        submitterOrgUserId,
        currentStageId,
        approvers,
        myUserId: user?.id
      });

      if (rpcError) {
        console.error('[ApprovalActionButtons] RPC error:', rpcError);
        setIsApprover(false);
        return;
      }

      // ── Step 4: Check if current user is in the approvers list ────────────
      const isEligible = Array.isArray(approvers) &&
        approvers.some((a: any) => a.approver_user_id === user.id);

      setIsApprover(isEligible);

    } catch (err) {
      console.error('[ApprovalActionButtons] Unexpected error:', err);
      setIsApprover(false);
      message.error('Failed to check approval eligibility.');
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  useEffect(() => {
    checkApproverEligibility();
  }, [submitterUserId, createdAt, currentStageId, organization?.id, user?.id, automationBpInstanceId]);

  // ── Approve / Reject mutation ──────────────────────────────────────────────
  const updateStageMutation = useMutation({
    mutationFn: async (newStageId: 'Approved' | 'Rejected') => {
      if (!entityId || !entityType) throw new Error('Entity information missing.');
      const payload = {
        id: entityId,
        status: newStageId,
        stage_id: newStageId,
      };
      const { error } = await supabase.schema('core').rpc('api_new_core_upsert_data', {
        table_name: entityType,
        data: payload
      });
      if (error) throw error;
    },
    onSuccess: (_, newStageId) => {
      queryClient.invalidateQueries({ queryKey: [entityType?.split('.')[1], organization?.id] });
      message.success(`Successfully ${newStageId}!`);
      setIsApprover(false);
    },
    onError: (error: any, newStageId) => {
      message.error(error.message || `Failed to ${newStageId.toLowerCase()} ${entityType}.`);
    },
  });

  const handleAction = (action: 'Approved' | 'Rejected') => {
    Modal.confirm({
      title: `${action} Confirmation`,
      content: `Are you sure you want to ${action.toLowerCase()} this request?`,
      okText: action,
      okType: action === 'Rejected' ? 'danger' : 'primary',
      cancelText: 'Cancel',
      onOk() { updateStageMutation.mutate(action); },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isCheckingEligibility || updateStageMutation.isPending) {
    return <Spin tip={isCheckingEligibility ? 'Checking approval eligibility...' : 'Submitting...'} style={{ marginTop: 20 }} />;
  }

  if (!isApprover) return null;

  return (
    <Space
      style={{
        marginTop: 20,
        padding: '15px 0',
        borderTop: '1px solid #f0f0f0',
        width: '100%',
        justifyContent: 'flex-start'
      }}
    >
      <Button
        type="primary"
        icon={<CheckCircle size={16} />}
        loading={updateStageMutation.isPending}
        onClick={() => handleAction('Approved')}
        style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
      >
        Approve
      </Button>
      <Button
        danger
        icon={<XCircle size={16} />}
        loading={updateStageMutation.isPending}
        onClick={() => handleAction('Rejected')}
      >
        Reject
      </Button>
    </Space>
  );
};

export default ApprovalActionButtons;