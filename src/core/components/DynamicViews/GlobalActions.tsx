import React, { Suspense, useState, useCallback, useMemo } from "react";
import { Drawer, message, Spin } from "antd";
import { Plus, MoreHorizontal } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/lib/supabase";
import { useAuthStore } from "@/core/lib/store";
import { useFormConfig } from "./hooks/useFormConfig";
import DynamicForm from "../DynamicForm";
import { isLocationPartition } from "@/core/components/common/utils/partitionPermissions";
import { useLocation } from "react-router-dom";
import { useNestedContext } from "../../lib/NestedContext";
import { trackAndSaveLocation } from "@/core/components/utils/locationTracker";
import { registry } from "@/core/registry";
import { PrimaryAction, MoreMenu } from "@/core/components/ActionBar";

interface GlobalAction {
  form: string;
  label: string;
}

interface GlobalActionsProps {
  entityType: string;
  entitySchema?: string;
  config?: {
    global_actions?: GlobalAction[];
    details?: { related_table?: { name: string; key: string; unique_keys?: string[]; fk_column?: string } };
  };
  viewConfig?: { metadata?: { key: string }[] };
  parentEditItem?: any;
  extraActions?: any[]; // For injecting Import/Export actions
}


const GlobalActions: React.FC<GlobalActionsProps> = ({
  entityType,
  entitySchema,
  config,
  viewConfig,
  parentEditItem,
  extraActions = []
}) => {
  const { contextStack } = useNestedContext();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [LoadedActionComponent, setLoadedActionComponent] = useState<React.ComponentType<any> | null>(null);

  const { organization, user, location, permissions } = useAuthStore();
  const queryClient = useQueryClient();
  const path = useLocation();
  const globalActionsFromConfig = config?.global_actions || [];
  const metadata = viewConfig?.metadata;
  const relatedTable = config?.details?.related_table;

  // Actions from both Config and Registry
  const registeredActions = useMemo(() => registry.getActionsForEntity(entityType, 'global'), [entityType]);

  const { data: formConfig } = useFormConfig(selectedForm || "");

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!organization?.id || !user?.id) throw new Error("Authentication required");
      const prefillData: any = {};
      if (formConfig && (formConfig as any).prefill && parentEditItem) {
        const prefill = (formConfig as any).prefill;
        for (const parentKey in prefill) {
          const payloadKey = prefill[parentKey];
          if (parentEditItem[parentKey] !== undefined) {
            prefillData[payloadKey] = parentEditItem[parentKey];
          }
        }
      }
      const dataPayload = {
        ...values,
        ...prefillData,
        ...(metadata?.some((field: any) => field.key === "organization_id") && organization?.id ? { organization_id: organization?.id } : {}),
        ...(metadata?.some((field: any) => field.key === "created_by") && user?.id ? { created_by: user?.id } : {}),
        ...(metadata?.some((field: any) => field.key === "user_id") && user?.id ? { user_id: user?.id } : {}),
        ...(metadata?.some((field: any) => field.key === "updated_by") && user?.id ? { updated_by: user?.id } : {}),
        ...(metadata?.some((field: any) => field.key === "team_id") && (user as any)?.team_id && (user as any)?.team_id[0] ? { team_id: (user as any)?.team_id[0] } : {}),
        ...(metadata?.some((field: any) => field.key === "location_id") && location?.id && isLocationPartition(permissions, path?.pathname) ? { location_id: location?.id } : {}),
      };

      const { data, error } = await supabase.schema('analytics').rpc("core_upsert_data_v8", {
        table_name: (entitySchema || "public") + "." + entityType,
        data: dataPayload,
        id: null,
        related_table_name: relatedTable?.name,
        related_data_key: relatedTable?.key,
        related_unique_keys: relatedTable?.unique_keys,
        related_fk_column: relatedTable?.fk_column || 'project_id'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
      message.success(`${entityType} created successfully`);
      setIsDrawerVisible(false);
      setSelectedForm(null);
    },
    onError: (error: any) => {
      message.error(error.message || `Failed to create ${entityType}`);
    },
  });

  const handleFormActionClick = (form: string) => {
    setSelectedForm(form);
    trackAndSaveLocation("New", user?.id);
    setIsDrawerVisible(true);
  };

  const handleRegisteredActionClick = useCallback(async (actionId: string) => {
    const action = registeredActions.find(a => a.id === actionId);
    if (action) {
      const Component = await action.component();
      setLoadedActionComponent(() => Component.default || Component);
      setActiveActionId(actionId);
    }
  }, [registeredActions]);

  // Merge and prioritize actions
  const allActions = useMemo(() => {
    const list: any[] = [];

    // 1. Config actions (Add, New, etc)
    globalActionsFromConfig.forEach((a, idx) => {
      if (a.form.startsWith('.')) return;
      list.push({
        type: 'config',
        id: `config-${idx}`,
        label: a.label === "add_user" ? "Add User" : a.label,
        form: a.form,
        isPrimary: a.label.toLowerCase().includes('add') || a.label.toLowerCase().includes('new') || idx === 0
      });
    });

    // 2. Registry actions
    registeredActions.forEach(a => {
      list.push({
        type: 'registry',
        id: a.id,
        label: typeof a.label === 'function' ? a.label((s: any) => s) : a.label,
        isPrimary: list.length === 0 // If no config actions, first registry is primary
      });
    });

    return list;
  }, [globalActionsFromConfig, registeredActions]);

  const primaryActions = allActions.filter(a => a.isPrimary);
  const secondaryActions = allActions.filter(a => !a.isPrimary);

  const mainAction = primaryActions[0];
  const dropdownActions = primaryActions.slice(1);

  const parent = contextStack[contextStack.length - 1];

  // Combine menu items for overflow
  const overflowItems = useMemo(() => {
    const items = secondaryActions.map(a => ({
      key: a.id,
      label: a.label,
      icon: <MoreHorizontal size={16} />,
      onClick: a.type === 'config'
        ? () => handleFormActionClick(a.form)
        : () => handleRegisteredActionClick(a.id)
    }));

    return [...items, ...extraActions];
  }, [secondaryActions, extraActions, handleRegisteredActionClick]);

  if (allActions.length === 0 && extraActions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Primary + Dropdown (Split Button) */}
      {mainAction && (
        <PrimaryAction
          label={mainAction.label}
          icon={<Plus size={18} />}
          onClick={mainAction.type === 'config'
            ? () => handleFormActionClick(mainAction.form)
            : () => handleRegisteredActionClick(mainAction.id)
          }
          dropdownItems={dropdownActions.map(a => ({
            key: a.id,
            label: a.label,
            icon: <Plus size={16} />,
            onClick: a.type === 'config'
              ? () => handleFormActionClick(a.form)
              : () => handleRegisteredActionClick(a.id)
          }))}
        />
      )}

      {/* Overflow for truly additional actions + injected extraActions */}
      {overflowItems.length > 0 && (
        <MoreMenu items={overflowItems} />
      )}

      {/* Registry Action Component (Dynamic) */}
      {activeActionId && LoadedActionComponent && (
        <Suspense fallback={<Spin />}>
          <LoadedActionComponent
            entityType={parent?.viewConfig?.entity_type}
            parentEditItem={parent?.editItem}
            onClose={() => {
              setActiveActionId(null);
              setLoadedActionComponent(null);
            }}
          />
        </Suspense>
      )}

      {/* Drawer for Form-based Actions */}
      <Drawer
        title="Form Action"
        open={isDrawerVisible}
        onClose={() => {
          setIsDrawerVisible(false);
          setSelectedForm(null);
        }}
        width={window.innerWidth <= 768 ? "100%" : "50%"}
      >
        {formConfig ? (
          <DynamicForm
            schemas={{
              data_schema: formConfig.data_schema || {},
              ui_schema: formConfig.ui_schema || {},
              db_schema: formConfig.db_schema || {},
            }}
            onFinish={(vals) => createMutation.mutate(vals)}
          />
        ) : (
          <Spin />
        )}
      </Drawer>
    </div>
  );
};

export default GlobalActions;