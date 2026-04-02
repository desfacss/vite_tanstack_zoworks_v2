
// components/common/ApprovalActionButtons.tsx
// Blueprint-driven approval routing via identity.get_all_approvers_from_blueprint

import React, { useState, useEffect } from 'react';
import { Button, Space, message, Modal, Spin } from 'antd';
import { CheckCircle, XCircle, RotateCcw, Send, AlertTriangle, Edit, HelpCircle } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const LUCIDE_ICON_MAP: Record<string, React.ReactNode> = {
  'check': <CheckCircle size={16} />,
  'x': <XCircle size={16} />,
  'x-circle': <XCircle size={16} />,
  'rotate-ccw': <RotateCcw size={16} />,
  'send': <Send size={16} />,
  'alert-triangle': <AlertTriangle size={16} />,
  'edit': <Edit size={16} />,
  'help': <HelpCircle size={16} />,
};

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
    // PRE-EMPTIVE GUARD: If no blueprint available, don't show buttons
    // The previous terminalStages guard is removed to rely on available transitions.

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
          p_current_stage_id: currentStageId === 'Approved' ? 'Submitted' : currentStageId,
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
      const action = res.actionName.toLowerCase();
      const conjugated = action === 'approve' ? 'Approved' : 
                         action === 'reject' ? 'Rejected' : 
                         action === 'cancel' ? 'Cancelled' : 
                         action === 'submit' ? 'Submitted' : 
                         action === 'revise' ? 'Revised' : 
                         `${res.actionName} completed`;
      message.success(`Successfully ${conjugated}!`);
      // Optimization: hide buttons immediately
      setIsApprover(false);
    },
    onError: (error: any, variables) => {
      message.error(error.message || `Failed to ${variables.actionName.toLowerCase()} ${entityType}.`);
    },
  });

  const handleAction = (newStageId: string, actionName: string, confirmMessage?: string) => {
    Modal.confirm({
      title: `${actionName} Confirmation`,
      content: confirmMessage || `Are you sure you want to ${actionName.toLowerCase()} this request?`,
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
    const isApprove = t.to === 'Approved' || t.id?.includes('APPROVE');
    const isReject = t.to === 'Rejected' || t.id?.includes('REJECT');
    const isCancel = t.to === 'Cancelled' || t.id?.includes('CANCEL');

    // DYNAMIC PERMISSION LOGIC (using guard_rules.allowed_roles from blueprint)
    // If no roles defined, fallback to standard role checking.
    const allowedRoles = t.guard_rules?.allowed_roles || [];
    let canPerform = false;

    if (allowedRoles.length === 0) {
      // Default fallback logic if guard_rules is empty:
      canPerform = (isApprove || isReject) 
        ? isApprover 
        : (isCancel && (
            (currentStageId === 'Submitted' && isSubmitter) || 
            (currentStageId === 'Approved' && (isSubmitter || isApprover))
          )) || (!isApprove && !isReject && !isCancel && isSubmitter); // Default other actions to Owner
    } else {
      // Precise role-based logic:
      const includesOwner = allowedRoles.includes('OWNER') || allowedRoles.includes('SELF');
      const includesApprover = allowedRoles.some((r: string) => 
        ['APPROVER', 'MANAGER', 'HR_MANAGER', 'FINANCE'].includes(r)
      );

      canPerform = (includesOwner && isSubmitter) || (includesApprover && isApprover);
    }

    if (!canPerform) return null;

    // DYNAMIC UI METADATA
    const ui = t.ui || {};
    const icon = LUCIDE_ICON_MAP[ui.icon] || (isApprove ? <CheckCircle size={16} /> : isReject ? <XCircle size={16} /> : isCancel ? <RotateCcw size={16} /> : <HelpCircle size={16} />);
    
    // Ant Design button type & styles
    let btnType: "primary" | "default" | "dashed" | "link" | "text" = "default";
    let danger = ui.button_variant === 'danger' || isReject || isCancel;
    let style: React.CSSProperties = {};

    if (ui.button_variant === 'primary' || isApprove) {
      btnType = "primary";
      if (isApprove) style = { backgroundColor: '#16a34a', borderColor: '#16a34a' }; // Keep green for Approve
    } else if (ui.button_variant === 'secondary') {
      btnType = "default";
    }

    // Use blueprint label if available, otherwise verb-mapped status
    const label = t.label || t.name || (
      t.to === 'Approved' ? 'Approve' : 
      t.to === 'Rejected' ? 'Reject' : 
      t.to === 'Cancelled' ? 'Cancel' : t.to
    );

    return (
      <Button
        key={t.id}
        type={btnType}
        danger={danger}
        icon={icon}
        loading={updateStageMutation.isPending}
        onClick={() => handleAction(t.to, label, ui.confirm_message)}
        style={style}
      >
        {label}
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