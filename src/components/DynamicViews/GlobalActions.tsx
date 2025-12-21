import React, { lazy, Suspense, useState } from "react";
import { Button, Drawer, Tooltip } from "antd"; // Import Tooltip
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { message } from "antd";
import { useViewConfigEnhanced } from "./hooks/useEntityConfig";
import { useFormConfig } from "./hooks/useFormConfig";
import DynamicForm from "../common/DynamicForm";
import { isLocationPartition } from "../common/utils/partitionPermissions";
import { useLocation } from "react-router-dom";
import { useNestedContext } from "../../lib/NestedContext";
import { useDeviceType } from "../../utils/deviceTypeStore"; // Import the hook
import { trackAndSaveLocation } from "../utils/locationTracker";

// Define a map of known components
const componentMap: Record<string, React.ComponentType> = {
  "../common/details/InviteUserModal": lazy(() => import("../common/details/InviteUserModal").catch(() => ({ default: () => <div>Component not found</div> }))),
  "../common/details/Planner": lazy(() => import("../common/details/Planner").catch(() => ({ default: () => <div>Component not found</div> }))),
  "../common/details/Task": lazy(() => import("../common/details/Task").catch(() => ({ default: () => <div>Component not found</div> }))),
  "../pages/Clients/TicketNew": lazy(() => import("../pages/Clients/TicketNew").catch(() => ({ default: () => <div>Component not found</div> }))),
  "../common/details/Expensesheet": lazy(() => import("../common/details/Expenses").catch(() => ({ default: () => <div>Component not found</div> }))),
  "../common/details/Timesheet": lazy(() => import("../common/details/Times").catch(() => ({ default: () => <div>Component not found</div> }))),
  // ".SomeOtherComponent": lazy(() => import("../components/SomeOtherComponent").catch(() => ({ default: () => <div>Component not found</div> }))),
};

interface GlobalAction {
  form: string;
  label: string;
}

interface GlobalActionsProps {
  entityType: string;
  config?: {
    global_actions?: GlobalAction[];
    details?: { related_table?: { name: string; key: string; unique_keys?: string[] } };
  };
  viewConfig?: { metadata?: { key: string }[] };
}

// Cache for lazy-loaded components
const componentCache = new Map<string, React.ComponentType>();

const GlobalActions: React.FC<GlobalActionsProps> = ({ entityType,entitySchema, config, viewConfig,parentEditItem }) => {
  const { contextStack } = useNestedContext();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const { organization, user, location,permissions } = useAuthStore();
  const queryClient = useQueryClient();
  const path = useLocation();
  const globalActions = config?.global_actions || [];
  const metadata = viewConfig?.metadata;
  const relatedTable = config?.details?.related_table;

  const deviceType = useDeviceType();
  const isDesktop = deviceType === 'desktop';

  // Fetch form configuration for the selected form
  const { data: formConfig } = useFormConfig(selectedForm || "");

  // Mutation for creating a new record using core_upsert_data
  const createMutation = useMutation({
  mutationFn: async (values: any) => {
    if (!organization?.id || !user?.id) throw new Error("Authentication required");
    // --- NEW: Handle prefill logic here ---
    const prefillData = {};
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
      ...prefillData, // <-- Merge the prefill data into the payload
      ...(metadata?.some((field: any) => field.key === "organization_id") && organization?.id
        ? { organization_id: organization?.id }
        : {}),
      ...(metadata?.some((field: any) => field.key === "created_by") && user?.id
        ? { created_by: user?.id }
        : {}),
      ...(metadata?.some((field: any) => field.key === "user_id") && user?.id
        ? { user_id: user?.id }
        : {}),
      ...(metadata?.some((field: any) => field.key === "updated_by") && user?.id
        ? { updated_by: user?.id }
        : {}),
      ...(metadata?.some((field: any) => field.key === "team_id") && user?.team_id && user?.team_id[0]
        ? { team_id: user?.team_id[0] }
        : {}),
      ...(metadata?.some((field: any) => field.key === "location_id") && location?.id && isLocationPartition(permissions, path?.pathname)
        ? { location_id: location?.id }
        : {}),
    };

    console.log("payload-D", formConfig,parentEditItem,{
      table_name: (entitySchema || "public") + "." + entityType,
      data: dataPayload,
      id: null,
      related_table_name: relatedTable?.name,
      related_data_key: relatedTable?.key,
      related_unique_keys: relatedTable?.unique_keys,
      related_fk_column: relatedTable?.fk_column||'project_id'
    });

    const { data, error } = await supabase.schema('analytics').rpc("core_upsert_data_v8", {
      table_name: (entitySchema || "public") + "." + entityType,
      data: dataPayload,
      id: null,
      related_table_name: relatedTable?.name,
      related_data_key: relatedTable?.key,
      related_unique_keys: relatedTable?.unique_keys,
      related_fk_column: relatedTable?.fk_column||'project_id'
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

  const handleButtonClick = async (form: string) => {
    if (form.startsWith(".")) {
      // Component paths don't open the drawer
      return;
    }
    setSelectedForm(form);
    console.log("nn");
    await trackAndSaveLocation("New", user?.id);
    setIsDrawerVisible(true);
  };

  if (!globalActions.length) {
    return null;
  }
  const parent=contextStack[contextStack.length-1];
  return (
    <div className="flex gap-2">
      {globalActions.map((action, index) => {
        const { form, label } = action;
        const isComponentPath = form.startsWith(".");
        const CustomComponent = isComponentPath ? componentMap[form] : null;

        if (isComponentPath && CustomComponent && !componentCache.has(form)) {
          componentCache.set(form, CustomComponent);
        }

        const buttonContent = isDesktop ? (
          <>
            <Plus size={16} />
            {label === "add_user" ? "Add User" : label}
          </>
        ) : (
          <Tooltip title={label === "add_user" ? "Add User" : label}>
            <Plus size={16} />
          </Tooltip>
        );

        return isComponentPath ? (
          <Suspense key={index} fallback={<div>Loading component...</div>}>
            {CustomComponent ? <CustomComponent 
            entityType={parent?.viewConfig?.entity_type} parentEditItem={parent?.editItem}
            /> : <div>Component not found</div>}
          </Suspense>
        ) : (
          <Button
            key={index}
            type="primary"
            onClick={() => handleButtonClick(form)}
            className="bg-[var(--color-primary)] text-white border-none hover:bg-[var(--color-primary-dark)]"
            icon={isDesktop ? undefined : <Plus size={16} />} // Render icon for mobile
          >
            {isDesktop ? (label === "add_user" ? "Add User" : label) : undefined}
          </Button>
        );
      })}
      <Drawer
        // title={`Add ${entityType}`}
        title={`Add`}
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