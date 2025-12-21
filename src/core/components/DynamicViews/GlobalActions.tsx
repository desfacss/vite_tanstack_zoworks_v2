
import React, { lazy, Suspense, useState, useCallback, useMemo } from "react";
import { Button, Drawer, Tooltip, message, Spin } from "antd";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/lib/supabase";
import { useAuthStore } from "@/core/lib/store";
import { useViewConfigEnhanced } from "./hooks/useEntityConfig";
import { useFormConfig } from "./hooks/useFormConfig";
import DynamicForm from "../DynamicForm";
import { isLocationPartition } from "@/core/components/common/utils/partitionPermissions";
import { useLocation } from "react-router-dom";
import { useNestedContext } from "../../lib/NestedContext";
import { useDeviceType } from "@/utils/deviceTypeStore";
import { trackAndSaveLocation } from "@/core/components/utils/locationTracker";
import { registry } from "@/core/registry";

interface GlobalAction {
  form: string;
  label: string;
}

interface GlobalActionsProps {
  entityType: string;
  entitySchema?: string;
  config?: {
    global_actions?: GlobalAction[];
    details?: { related_table?: { name: string; key: string; unique_keys?: string[] } };
  };
  viewConfig?: { metadata?: { key: string }[] };
  parentEditItem?: any;
}

const GlobalActions: React.FC<GlobalActionsProps> = ({
  entityType,
  entitySchema,
  config,
  viewConfig,
  parentEditItem
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

  const deviceType = useDeviceType();
  const isDesktop = deviceType === 'desktop';

  // Get registered actions from the new registry
  const registeredActions = useMemo(() =>
    registry.getActionsForEntity(entityType, 'global'),
    [entityType]);

  const { data: formConfig } = useFormConfig(selectedForm || "");

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!organization?.id || !user?.id) throw new Error("Authentication required");
      const prefillData: any = {};
      if (formConfig?.prefill && parentEditItem) {
        for (const parentKey in formConfig.prefill) {
          const payloadKey = formConfig.prefill[parentKey];
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
        ...(metadata?.some((field: any) => field.key === "team_id") && user?.team_id && user?.team_id[0] ? { team_id: user?.team_id[0] } : {}),
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
    retry: false,
  });

  const handleSubmit = async (formData: any) => {
    try {
      await createMutation.mutateAsync(formData);
    } catch (error: any) {
      message.error(error.message || `Failed to save ${entityType}`);
    }
  };

  const handleFormActionClick = async (form: string) => {
    setSelectedForm(form);
    await trackAndSaveLocation("New", user?.id);
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

  const parent = contextStack[contextStack.length - 1];

  return (
    <div className="flex gap-2">
      {/* 1. Legacy Config-based Actions */}
      {globalActionsFromConfig.map((action, index) => {
        const { form, label } = action;
        // Skip dots (legacy component paths which are now handled by registry)
        if (form.startsWith(".")) return null;

        return (
          <Button
            key={`config-${index}`}
            type="primary"
            onClick={() => handleFormActionClick(form)}
            className="bg-[var(--color-primary)] text-white border-none hover:bg-[var(--color-primary-dark)]"
            icon={isDesktop ? undefined : <Plus size={16} />}
          >
            {isDesktop ? (label === "add_user" ? "Add User" : label) : undefined}
          </Button>
        );
      })}

      {/* 2. New Registry-based Actions */}
      {registeredActions.map((action) => (
        <Button
          key={`registry-${action.id}`}
          type="primary"
          onClick={() => handleRegisteredActionClick(action.id)}
          className="bg-[var(--color-primary)] text-white border-none hover:bg-[var(--color-primary-dark)]"
          icon={isDesktop ? undefined : <Plus size={16} />}
        >
          {isDesktop ? (typeof action.label === 'function' ? action.label((s) => s) : action.label) : undefined}
        </Button>
      ))}

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
        title="Add"
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
            onFinish={handleSubmit}
          />
        ) : (
          <div>Loading form configuration...</div>
        )}
      </Drawer>
    </div>
  );
};

export default GlobalActions;