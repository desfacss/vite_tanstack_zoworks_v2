
import React, { useState, lazy, Suspense, useCallback, useMemo } from 'react';
import { Button, Drawer, Space, message, Modal, Dropdown, Menu, Spin } from 'antd';
import { Edit2, Trash2, Eye, Copy, MoreHorizontal } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import DynamicForm from '../DynamicForm';
import DetailsView from '../details/DetailsView';
import { useFormConfig } from '../DynamicViews/hooks/useFormConfig';
import { useNestedContext } from '@/core/lib/NestedContext';
import { ActionSheet } from 'antd-mobile';
import { useLocation } from 'react-router-dom';
import { isLocationPartition } from '@/components/common/utils/partitionPermissions';
import { registry } from '@/core/registry';

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
  const { organization, user, location, permissions } = useAuthStore();
  const queryClient = useQueryClient();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<any | null>(null);
  const [formName, setFormName] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<'Edit' | 'Clone' | 'Registry' | null>(null);
  const [activeRegistryActionId, setActiveRegistryActionId] = useState<string | null>(null);
  const [LoadedActionComponent, setLoadedActionComponent] = useState<React.ComponentType<any> | null>(null);
  const [enhancedRecord, setEnhancedRecord] = useState(record);
  const path = useLocation();

  const { data: formConfig } = useFormConfig(formName || '');

  const hasAccess = useCallback((action: string) => {
    if (!accessConfig?.[action]) return true;
    const { roles = [], users = [] } = accessConfig[action];
    return users.includes(user?.id || '') || roles.includes(user?.role || '');
  }, [accessConfig, user]);

  const fetchRelatedData = async (projectId: string) => {
    if (!organization?.id) return [];
    const relatedTable = config?.details?.related_table;
    if (!relatedTable?.name || !relatedTable?.fields) return [];

    const parts = relatedTable.name.split('.');
    const schemaName = parts.length === 2 ? parts[0] : 'public';
    const tableName = parts.length === 2 ? parts[1] : relatedTable.name;

    const { data, error } = await supabase
      .schema(schemaName)
      .from(tableName)
      .select('*')
      .eq(relatedTable?.fk_column || 'project_id', projectId)
      .eq('organization_id', organization.id);

    if (error) {
      console.error('Error fetching related data:', error.message);
      return [];
    }

    return data.map((item: any) => {
      const transformed: any = {};
      const flattenedFields = new Set(relatedTable.fields);
      for (const key in item) {
        if (key === 'details' && typeof item[key] === 'object' && item[key] !== null) {
          for (const nestedKey in item[key]) {
            const flattenedKey = `details.${nestedKey}`;
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
      const dataPayload = {
        ...values,
        ...(metadata.some((field: any) => field.key === 'organization_id') ? { organization_id: organization.id } : {}),
        ...(metadata.some((field: any) => field.key === 'updated_by') ? { updated_by: user.id } : {}),
      };
      const relatedTable = config?.details?.related_table;

      const { data, error } = await supabase.schema('analytics').rpc('core_upsert_data_v8', {
        table_name: viewConfig?.entity_type || entityType,
        data: dataPayload,
        id: record.id,
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
      message.success(`${entityType} updated successfully`);
      setIsDrawerVisible(false);
      setFormName(null);
      setCurrentAction(null);
    },
    onError: (error: any) => message.error(error.message || `Failed to update ${entityType}`),
  });

  const handleEdit = async (form: string) => {
    setFormName(form);
    setCurrentAction('Edit');
    const isLegacyPath = !!legacyComponentMap[form];
    if (isLegacyPath) {
      setIsDrawerVisible(true);
      return;
    }

    const relatedTable = config?.details?.related_table;
    let updatedRecord = { ...record };
    if (relatedTable?.name && relatedTable?.key) {
      const relatedData = await fetchRelatedData(record.id);
      updatedRecord = { ...record, [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined };
    }
    setEnhancedRecord(updatedRecord);
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

  const handleRegistryActionClick = useCallback(async (actionId: string) => {
    const action = registry.getActionsForEntity(entityType, 'row').find(a => a.id === actionId);
    if (action) {
      const Component = await action.component();
      setLoadedActionComponent(() => Component.default || Component);
      setActiveRegistryActionId(actionId);
      setCurrentAction('Registry');
    }
  }, [entityType]);

  const handleDeleteConfirm = () => {
    Modal.confirm({
      title: `Confirm Deletion`,
      content: `Are you sure you want to delete this ${entityType}?`,
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
      if (a.name === 'Details') {
        return contextStack.length < 2 && hasAccess('details') && viewConfig?.detailview;
      }
      return false;
    });

    const registered = registry.getActionsForEntity(entityType, 'row');
    return { builtIn, registered };
  }, [actions, entityType, hasAccess, contextStack.length, viewConfig]);

  const actionItems = useMemo(() => {
    const items = [];

    // Built-in actions
    filteredActions.builtIn.forEach(a => {
      if (a.name === 'Edit') items.push({ key: 'edit', label: 'Edit', icon: <Edit2 size={16} />, onClick: () => a.form && handleEdit(a.form) });
      if (a.name === 'Delete') items.push({ key: 'delete', label: 'Delete', icon: <Trash2 size={16} />, danger: true, onClick: () => setDeleteRecord(record) });
      if (a.name === 'Details') items.push({ key: 'details', label: 'Details', icon: <Eye size={16} />, onClick: handleDetails });
      if (a.name === 'Clone') items.push({ key: 'clone', label: 'Clone', icon: <Copy size={16} />, onClick: () => a.form && handleClone(a.form) });
    });

    // Registered actions
    filteredActions.registered.forEach(a => {
      items.push({
        key: a.id,
        label: typeof a.label === 'function' ? a.label((s: string) => s) : a.label,
        icon: <Edit2 size={16} />, // Default icon for registry actions
        onClick: () => handleRegistryActionClick(a.id)
      });
    });

    return items;
  }, [filteredActions, record, handleRegistryActionClick]);

  const isLegacyPath = !!(formName && legacyComponentMap[formName]);
  const LegacyComponent = formName ? legacyComponentMap[formName] : null;

  return (
    <>
      <Space>
        {actionItems.map(item => (
          <Button key={item.key} icon={item.icon} danger={item.danger} onClick={item.onClick} title={item.label} />
        ))}
      </Space>

      {/* Edit/Legacy Drawer */}
      <Drawer
        title={`${currentAction} ${record?.name || record?.id}`}
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
        title="Action"
        open={!!activeRegistryActionId}
        onClose={() => { setActiveRegistryActionId(null); setLoadedActionComponent(null); }}
        width={window.innerWidth <= 768 ? '100%' : '50%'}
      >
        {LoadedActionComponent && (
          <Suspense fallback={<Spin />}>
            <LoadedActionComponent
              record={record}
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
        <DetailsView
          config={config}
          entityType={entityType}
          viewConfig={viewConfig}
          editItem={record}
          rawData={rawData}
        />
      </Drawer>

      {!window.isMobile() && deleteRecord && handleDeleteConfirm()}
    </>
  );
};

export default RowActions;
