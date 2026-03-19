
// components/common/ApprovalActionButtons.tsx
// Blueprint-driven approval routing via identity.get_all_approvers_from_blueprint

import React, { useState, useEffect } from 'react';
import { Button, Space, message, Modal, Spin } from 'antd';
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
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
  const [blueprint, setBlueprint] = useState<any>(null);
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
        const { data: bpInstance, error: bpInstanceError } = await supabase
          .schema('automation')
          .from('bp_instances')
          .select('blueprint_id')
          .eq('id', automationBpInstanceId)
          .single();

        if (bpInstanceError || !bpInstance) {
          console.warn('[ApprovalActionButtons] Could not fetch bp_instance:', bpInstanceError);
        } else {
          const { data: blueprintData, error: blueprintError } = await supabase
            .schema('automation')
            .from('bp_process_blueprints')
            .select('definition')
            .eq('id', bpInstance.blueprint_id)
            .single();

          if (blueprintError || !blueprintData) {
            console.warn('[ApprovalActionButtons] Could not fetch blueprint:', blueprintError);
          } else {
            blueprintDefinition = blueprintData.definition;
            setBlueprint(blueprintDefinition);
          }
        }
      }

      if (!blueprintDefinition) {
        console.warn('[ApprovalActionButtons] No blueprint definition available.');
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

      if (rpcError) {
        console.error('[ApprovalActionButtons] RPC error:', rpcError);
        setIsApprover(false);
        return;
      }

      const isEligible = Array.isArray(approvers) &&
        approvers.some((a: any) => a.approver_user_id === user.id);

      setIsApprover(isEligible);

    } catch (err) {
      console.error('[ApprovalActionButtons] Unexpected error:', err);
      setIsApprover(false);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  useEffect(() => {
    checkApproverEligibility();
  }, [submitterUserId, createdAt, currentStageId, organization?.id, user?.id, automationBpInstanceId]);

  // ── Action Mutation ────────────────────────────────────────────────────────
  const updateStageMutation = useMutation({
    mutationFn: async ({ newStageId, actionName }: { newStageId: string, actionName: string }) => {
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
      return { newStageId, actionName };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [entityType?.split('.')[1], organization?.id] });
      message.success(`Successfully ${res.actionName}ed!`);
      // Optimization: hide buttons immediately
      setIsApprover(false);
    },
    onError: (error: any, variables) => {
      message.error(error.message || `Failed to ${variables.actionName.toLowerCase()} ${entityType}.`);
    },
  });

  const handleAction = (newStageId: string, actionName: string) => {
    Modal.confirm({
      title: `${actionName} Confirmation`,
      content: `Are you sure you want to ${actionName.toLowerCase()} this request?`,
      okText: actionName,
      okType: newStageId === 'Rejected' || newStageId === 'Cancelled' ? 'danger' : 'primary',
      cancelText: 'Cancel',
      onOk() { updateStageMutation.mutate({ newStageId, actionName }); },
    });
  };

  // ── Render Logic ───────────────────────────────────────────────────────────
  if (isCheckingEligibility || updateStageMutation.isPending) {
    return <Spin tip={isCheckingEligibility ? 'Checking approval eligibility...' : 'Submitting...'} style={{ marginTop: 20 }} />;
  }

  // Determine available transitions from blueprint
  const transitions = blueprint?.lifecycle?.transitions || [];
  const availableTransitions = transitions.filter((t: any) => t.from === currentStageId);

  if (availableTransitions.length === 0) return null;

  const isSubmitter = user?.id === submitterUserId;

  const buttons = availableTransitions.map((t: any) => {
    const isApprove = t.to === 'Approved';
    const isReject = t.to === 'Rejected';
    const isCancel = t.to === 'Cancelled';

    // Permission logic:
    // - Approve/Reject transitions are for Approvers.
    // - Cancel transitions are for Submitter OR Approver (if transition exists).
    const canPerform = (isApprove || isReject) ? isApprover : (isCancel && (isSubmitter || isApprover));

    if (!canPerform) return null;

    let icon = <CheckCircle size={16} />;
    let btnType: "primary" | "default" | "dashed" | "link" | "text" = "default";
    let danger = false;
    let style: React.CSSProperties = {};

    if (isApprove) {
      btnType = "primary";
      style = { backgroundColor: '#16a34a', borderColor: '#16a34a' };
    } else if (isReject) {
      danger = true;
      icon = <XCircle size={16} />;
    } else if (isCancel) {
      icon = <RotateCcw size={16} />;
      danger = true;
    }

    return (
      <Button
        key={t.id}
        type={btnType}
        danger={danger}
        icon={icon}
        loading={updateStageMutation.isPending}
        onClick={() => handleAction(t.to, t.name || t.to)}
        style={style}
      >
        {t.name || t.to}
      </Button>
    );
  }).filter(Boolean);

  if (buttons.length === 0) return null;

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
      {buttons}
    </Space>
  );
};

export default ApprovalActionButtons;