import React, { useState, lazy, Suspense, useCallback, useMemo } from 'react';
import { Drawer, message, Modal, Spin } from 'antd';
import { Edit2, Trash2, Eye, Copy } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import DynamicForm from '../DynamicForm';
const DetailsView = lazy(() => import('../details/DetailsView'));
import { useFormConfig } from '../DynamicViews/hooks/useFormConfig';
import { useNestedContext } from '@/core/lib/NestedContext';
import { registry } from '@/core/registry';
import { RowActions as RowActionsStandard } from '@/core/components/ActionBar';

// Legacy Component Map Removed - Use Registry or Dynamic Forms
const legacyComponentMap: Record<string, React.ComponentType<any>> = {};

interface RowActionsProps {
  entityType: string;
  record: any;
  actions: Array<{ name: string; form?: string }>;
  accessConfig?: any;
  viewConfig?: any;
  rawData?: any[];
  config?: any;
}

const RowActions: React.FC<RowActionsProps> = ({
  entityType,
  record,
  actions,
  accessConfig,
  viewConfig,
  rawData,
  config,
}) => {
  const [contextId, setContextId] = useState<string | null>(null);
  const { openContext, closeContext, contextStack } = useNestedContext();
  const { organization, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<any | null>(null);
  const [formName, setFormName] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<'Edit' | 'Clone' | 'Registry' | null>(null);
  const [activeRegistryActionId, setActiveRegistryActionId] = useState<string | null>(null);
  const [LoadedActionComponent, setLoadedActionComponent] = useState<React.ComponentType<any> | null>(null);
  const [enhancedRecord, setEnhancedRecord] = useState(record);

  const { data: formConfig } = useFormConfig(formName || '');

  const hasAccess = useCallback((action: string) => {
    if (!accessConfig?.[action]) return true;
    const { roles = [], users = [] } = accessConfig[action];
    return users.includes(user?.id || '') || roles.includes(user?.role_id || '');
  }, [accessConfig, user]);

  const fetchRelatedData = async (projectId: string) => {
    if (!organization?.id) return [];
    const relatedTable = config?.details?.related_table;
    if (!relatedTable?.name || !relatedTable?.fields) return [];

    const parts = relatedTable.name.split('.');
    const schemaName = parts.length === 2 ? parts[0] : 'public';
    const tableName = parts.length === 2 ? parts[1] : relatedTable.name;

    // Using explicit any to avoid TypeScript deep type instantiation error with dynamic schema/table
    const result = await (supabase as any)
      .schema(schemaName)
      .from(tableName)
      .select('*')
      .eq(relatedTable?.fk_column || 'project_id', projectId)
      .eq('organization_id', organization.id);

    const { data, error } = result as { data: any[] | null; error: any };

    if (error) {
      console.error('Error fetching related data:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((item: any) => {
      const transformed: any = {};
      const flattenedFields = new Set(relatedTable.fields);
      for (const key in item) {
        if (key === 'details' && typeof item[key] === 'object' && item[key] !== null) {
          for (const nestedKey in item[key]) {
            const flattenedKey = 'details.' + nestedKey;
            if (flattenedFields.has(flattenedKey)) transformed[flattenedKey] = item[key][nestedKey];
          }
        } else if (flattenedFields.has(key)) {
          transformed[key] = item[key];
        }
      }
      return transformed;
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!organization?.id || !user?.id) throw new Error('Authentication required');
      if (!record?.id) throw new Error('No record selected for update');

      const metadata = viewConfig?.metadata || [];
      const relatedTable = config?.details?.related_table;
      // Extract schema from entity_type or use entity_schema
      const entityTypeWithSchema = viewConfig?.entity_type || entityType;
      const hasSchemaPrefix = entityTypeWithSchema.includes('.');
      const schema = hasSchemaPrefix 
        ? entityTypeWithSchema.split('.')[0] 
        : (viewConfig?.entity_schema || 'public');
      const table = hasSchemaPrefix 
        ? entityTypeWithSchema.split('.')[1] 
        : entityTypeWithSchema;
      const fullTableName = `${schema}.${table}`;

      // Filter out system-managed fields that should not be in the payload
      const systemManagedFields = ['created_at', 'updated_at', 'deleted_at'];
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([key]) => !systemManagedFields.includes(key))
      );

      // Convert empty arrays to null for PostgreSQL compatibility
      const processedValues = Object.fromEntries(
        Object.entries(filteredValues).map(([key, value]) => {
          // If it's an empty array, convert to null
          if (Array.isArray(value) && value.length === 0) {
            return [key, null];
          }
          return [key, value];
        })
      );

      const dataPayload = {
        ...processedValues,
        id: record.id, // Include id in data object for update
        ...(metadata.some((field: any) => field.key === 'organization_id') ? { organization_id: organization.id } : {}),
        ...(metadata.some((field: any) => field.key === 'updated_by') ? { updated_by: user.id } : {}),
      };

      // Update main record
      const { data, error } = await (supabase as any).schema('core').rpc('api_new_core_upsert_data', {
        table_name: fullTableName,
        data: dataPayload
      });

      if (error) throw error;

      // Handle related table updates if configured
      if (relatedTable?.name && relatedTable?.key && values[relatedTable.key]) {
        const relatedData = Array.isArray(values[relatedTable.key]) ? values[relatedTable.key] : [values[relatedTable.key]];
        const fkColumn = relatedTable.fk_column || 'project_id';

        // Delete existing related records not in the new set
        const submittedIds = relatedData.filter((r: any) => r.id).map((r: any) => r.id);
        const { data: existingRecords } = await (supabase as any)
          .schema(relatedTable.name.split('.')[0] || 'public')
          .from(relatedTable.name.split('.')[1] || relatedTable.name)
          .select('id')
          .eq(fkColumn, record.id)
          .eq('organization_id', organization.id);

        if (existingRecords) {
          const idsToDelete = existingRecords
            .map((r: any) => r.id)
            .filter((id: string) => !submittedIds.includes(id));

          for (const idToDelete of idsToDelete) {
            await (supabase as any)
              .schema(relatedTable.name.split('.')[0] || 'public')
              .from(relatedTable.name.split('.')[1] || relatedTable.name)
              .delete()
              .eq('id', idToDelete);
          }
        }

        // Upsert each related record
        for (const relatedRecord of relatedData) {
          const relatedPayload = {
            ...relatedRecord,
            [fkColumn]: data || record.id,
            organization_id: organization.id,
          };

          await (supabase as any).schema('core').rpc('api_new_core_upsert_data', {
            table_name: relatedTable.name,
            data: relatedPayload
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
      message.success(entityType + ' updated successfully');
      setIsDrawerVisible(false);
      setFormName(null);
      setCurrentAction(null);
    },
    onError: (error: any) => message.error(error.message || 'Failed to update ' + entityType),
  });

  const fetchFullRecord = useCallback(async (recordId: string) => {
    try {
      // Prioritize explicit select, fallback to basic items for timesheets and expenses
      let selectStr = viewConfig?.general?.select;
      const isTimesheet = entityType.toLowerCase().includes('timesheet') || (viewConfig?.entity_type || '').toLowerCase().includes('timesheet');
      const isExpense = entityType.toLowerCase().includes('expense_sheet') || (viewConfig?.entity_type || '').toLowerCase().includes('expense_sheet');

      if (!selectStr && isTimesheet) {
        selectStr = '*, timesheet_items(*)';
      } else if (!selectStr && isExpense) {
        selectStr = '*, expense_sheet_items(*)';
      }
      selectStr = selectStr || '*';

      const parts = (viewConfig?.entity_type || entityType).split('.');
      const schemaName = parts.length === 2 ? parts[0] : 'public';
      const tableName = parts.length === 2 ? parts[1] : entityType;

      console.log(`[RowActions] Fetching full record for ${entityType}:`, { schemaName, tableName, selectStr });

      const { data, error } = await (supabase as any)
        .schema(schemaName)
        .from(tableName)
        .select(selectStr)
        .eq('id', recordId)
        .single();

      if (error) {
        console.error(`[RowActions] Fetch failed for ${tableName}:`, error);
        throw error;
      }
      console.log(`[RowActions] Fetch SUCCESS for ${tableName}:`, data);
      return data;
    } catch (error) {
      console.warn('[RowActions] Failed to fetch full record, using basic record:', error);
      return record;
    }
  }, [entityType, viewConfig, record]);

  const handleEdit = async (form: string) => {
    // Fetch full record if we have a special select string OR it's a timesheet/expense
    let latestRecord = record;
    const isTimesheet = (entityType || '').toLowerCase().includes('timesheet') || (viewConfig?.entity_type || '').toLowerCase().includes('timesheet');
    const isExpense = (entityType || '').toLowerCase().includes('expense_sheet') || (viewConfig?.entity_type || '').toLowerCase().includes('expense_sheet');

    if (viewConfig?.general?.select || isTimesheet || isExpense) {
      latestRecord = await fetchFullRecord(record.id);
      setEnhancedRecord(latestRecord);
    }

    // 1. Check if this is a registry action ID (check entity first, then global)
    // Try fuzzy match for common ID patterns
    const normalizedForm = form.toLowerCase();
    const possibleIds = [
      form,
      normalizedForm,
      normalizedForm.replace(/_/g, '-'),
      normalizedForm.replace(/-/g, '_'),
      `${normalizedForm}-edit`,
      `${normalizedForm.replace(/_/g, '-')}-edit`,
      normalizedForm.replace('-edit', ''),
      normalizedForm.replace('_edit', '')
    ];

    let registeredAction = null;
    for (const id of possibleIds) {
      registeredAction = registry.getActionsForEntity(entityType, 'row').find(a => a.id === id)
        || (registry as any).getActionById?.(id);
      if (registeredAction) break;
    }

    console.log('[RowActions] Fuzzy matching for form:', form, 'Result:', registeredAction?.id);

    if (registeredAction) {
      handleRegistryActionClick(registeredAction.id, latestRecord);
      return;
    }

    setFormName(form);
    setCurrentAction('Edit');

    // 2. Check if this is a component path (starts with ../ or ./)
    const isComponentPath = form.startsWith('../') || form.startsWith('./');

    if (isComponentPath) {
      // Load custom component dynamically
      try {
        const pageModules = import.meta.glob('@/pages/**/*.tsx');
        const moduleComponents = import.meta.glob('@/modules/**/components/*.tsx');
        const allModules = { ...pageModules, ...moduleComponents };

        // Extract component name from path (e.g., "TicketEdit" from "../pages/Clients/TicketEdit")
        const componentName = form.split('/').pop()?.replace('.tsx', '') || '';

        const modulePath = Object.keys(allModules).find(key =>
          key.endsWith(`/${componentName}.tsx`)
        );

        if (modulePath && allModules[modulePath]) {
          const Component = await allModules[modulePath]() as any;
          setLoadedActionComponent(() => Component.default || Component);
          setActiveRegistryActionId(`component-${form}`);
          setEnhancedRecord(latestRecord);
          return;
        }
      } catch (error) {
        console.error('Error loading component:', error);
      }
    }

    const isLegacyPath = !!legacyComponentMap[form];
    if (isLegacyPath) {
      setIsDrawerVisible(true);
      return;
    }

    const relatedTable = config?.details?.related_table;
    if (relatedTable?.name && relatedTable?.key) {
      const relatedData = await fetchRelatedData(record.id);
      setEnhancedRecord({ ...latestRecord, [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined });
    }
    setIsDrawerVisible(true);
  };

  const handleClone = async (form: string) => {
    setFormName(form);
    setCurrentAction('Clone');
    const clonedRecord = { ...record };
    delete clonedRecord.id;
    setEnhancedRecord(clonedRecord);
    setIsDrawerVisible(true);
  };

  const handleDetails = () => {
    setIsDetailsDrawerVisible(true);
    const newContextId = openContext({ config, viewConfig, editItem: record });
    setContextId(newContextId);
  };

  const handleRegistryActionClick = useCallback(async (actionId: string, customRecord?: any) => {
    // Check entity specific list first, then global registry
    const action = registry.getActionsForEntity(entityType, 'row').find(a => a.id === actionId)
      || (registry as any).getActionById?.(actionId);

    if (action) {
      // 1. If no custom record provided OR the record is shallow (no items for timesheet/expense), fetch the full one
      let latestRecord = customRecord;
      const isTimesheet = (entityType || '').toLowerCase().includes('timesheet') || (viewConfig?.entity_type || '').toLowerCase().includes('timesheet');
      const isExpense = (entityType || '').toLowerCase().includes('expense_sheet') || (viewConfig?.entity_type || '').toLowerCase().includes('expense_sheet');

      const isShallow = (isTimesheet && !latestRecord?.timesheet_items) || (isExpense && !latestRecord?.expense_sheet_items);

      if ((!latestRecord || isShallow) && record?.id) {
        latestRecord = await fetchFullRecord(record.id);
      }

      const Component = await action.component();
      setLoadedActionComponent(() => Component.default || Component);
      setActiveRegistryActionId(actionId);
      setCurrentAction('Registry');

      if (latestRecord) {
        setEnhancedRecord(latestRecord);
      }
    }
  }, [entityType, record?.id, fetchFullRecord]);

  const handleDeleteConfirm = () => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: 'Are you sure you want to delete this ' + entityType + '?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        const parts = (viewConfig?.entity_type || entityType).split('.');
        const schema = parts.length === 2 ? parts[0] : 'public';
        const { error } = await supabase.schema(schema).from(parts.length === 2 ? parts[1] : entityType).delete().eq('id', record.id);
        if (error) message.error(error.message);
        else {
          message.success('Deleted successfully');
          queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
        }
        setDeleteRecord(null);
      },
      onCancel: () => setDeleteRecord(null),
    });
  };

  const filteredActions = useMemo(() => {
    const builtIn = (actions || []).filter(a => {
      if (a.name === 'Edit') return hasAccess('edit');
      if (a.name === 'Delete') return hasAccess('delete');
      if (a.name === 'Clone') return hasAccess('edit');
      if (a.name === 'Details' || a.name === 'View') {
        return contextStack.length < 2 && hasAccess('details') && (viewConfig?.details_overview || viewConfig?.detail_view);
      }
      return false;
    });

    const registered = registry.getActionsForEntity(entityType, 'row');
    return { builtIn, registered };
  }, [actions, entityType, hasAccess, contextStack.length, viewConfig]);

  const actionItems = useMemo(() => {
    const inlineItems: any[] = [];
    const overflowItems: any[] = [];
    const handledRegistryIds = new Set<string>();

    // 1. Built-in actions - separate into inline (Edit, Details, Delete) and overflow (Clone)
    filteredActions.builtIn.forEach(a => {
      if (a.name === 'Edit') {
        // If a form field is provided, check if it matches a registered action ID for this entity
        const registeredAction = a.form ? (
          filteredActions.registered.find(reg => reg.id === a.form)
          || (registry as any).getActionById?.(a.form)
        ) : null;

        if (registeredAction) {
          handledRegistryIds.add(registeredAction.id);
          inlineItems.push({
            key: 'edit',
            label: 'Edit',
            icon: <Edit2 size={16} />,
            onClick: () => handleRegistryActionClick(registeredAction.id)
          });
        } else if (a.form) {
          // Fall back to form-based edit (either custom component path lookup or DynamicForm schema)
          inlineItems.push({
            key: 'edit',
            label: 'Edit',
            icon: <Edit2 size={16} />,
            onClick: () => handleEdit(a.form!)
          });
        }
      }
      if (a.name === 'Details' || a.name === 'View') {
        inlineItems.push({
          key: 'details',
          label: a.name,
          icon: <Eye size={16} />,
          onClick: handleDetails
        });
      }
      if (a.name === 'Delete') {
        inlineItems.push({ key: 'delete', label: 'Delete', icon: <Trash2 size={16} />, danger: true, onClick: () => setDeleteRecord(record) });
      }
      if (a.name === 'Clone') {
        overflowItems.push({ key: 'clone', label: 'Clone', icon: <Copy size={16} />, onClick: () => a.form && handleClone(a.form) });
      }
    });

    // 2. Remaining registered actions - only those not already used as handlers for built-in actions
    filteredActions.registered
      .filter(a => !handledRegistryIds.has(a.id))
      .forEach(a => {
        overflowItems.push({
          key: a.id,
          label: typeof a.label === 'function' ? (a.label as any)((s: any) => s) : a.label,
          icon: (a as any).icon || <Edit2 size={16} />,
          onClick: () => handleRegistryActionClick(a.id)
        });
      });

    // Return inline items first, then overflow - maxInline=4 will show all inline + More if overflow exists
    return [...inlineItems, ...overflowItems];
  }, [filteredActions, record, handleRegistryActionClick]);

  const isLegacyPath = !!(formName && legacyComponentMap[formName]);
  const LegacyComponent = formName ? legacyComponentMap[formName] : null;

  return (
    <>
      <div className="flex items-center justify-end">
        <RowActionsStandard
          items={actionItems}
          maxInline={4} // Shows Edit, Details, Delete inline + More if overflow exists
        />
      </div>

      {/* Edit/Legacy Drawer */}
      <Drawer
        title={(currentAction || 'Action') + ' ' + (record?.name || record?.id || '')}
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        width={window.innerWidth <= 768 ? '100%' : '50%'}
      >
        {isLegacyPath && LegacyComponent ? (
          <Suspense fallback={<Spin />}>
            <LegacyComponent editItem={enhancedRecord} rawData={rawData} viewConfig={viewConfig} />
          </Suspense>
        ) : formConfig && formName ? (
          <DynamicForm
            schemas={{
              data_schema: formConfig.data_schema || {},
              ui_schema: formConfig.ui_schema || {},
              db_schema: formConfig.db_schema || {},
            }}
            formData={enhancedRecord}
            onFinish={(vals) => updateMutation.mutate(vals)}
          />
        ) : <Spin />}
      </Drawer>

      {/* Registry Action Drawer */}
      <Drawer
        title={(activeRegistryActionId?.toLowerCase().includes('edit') ? 'Edit ' : 'Action ') + (record?.name || record?.id || '')}
        open={!!activeRegistryActionId}
        onClose={() => { setActiveRegistryActionId(null); setLoadedActionComponent(null); }}
        width={window.innerWidth <= 768 ? '100%' : '50%'}
      >
        {LoadedActionComponent && (
          <Suspense fallback={<Spin />}>
            <LoadedActionComponent
              record={enhancedRecord}
              onClose={() => { setActiveRegistryActionId(null); setLoadedActionComponent(null); }}
            />
          </Suspense>
        )}
      </Drawer>

      {/* Details Drawer */}
      <Drawer
        title="Details"
        open={isDetailsDrawerVisible}
        onClose={() => { setIsDetailsDrawerVisible(false); if (contextId) closeContext(contextId); }}
        width={window.innerWidth <= 768 ? '100%' : '70%'}
      >
        <Suspense fallback={<Spin />}>
          <DetailsView
            config={config}
            entityType={entityType}
            viewConfig={viewConfig}
            editItem={record}
            rawData={rawData}
          />
        </Suspense>
      </Drawer>

      {deleteRecord && handleDeleteConfirm()}
    </>
  );
};

export default RowActions;
