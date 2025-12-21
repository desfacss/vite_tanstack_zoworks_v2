// // // import React, { useState, useEffect, lazy, Suspense } from 'react';
// // // import { Button, Drawer, Space, message, Modal } from 'antd'; // Import Modal
// // // import { Edit2, Trash2, Eye, Copy } from 'lucide-react';
// // // import { useMutation, useQueryClient } from '@tanstack/react-query';
// // // import { supabase } from '../../lib/supabase';
// // // import { useAuthStore } from '../../lib/store';
// // // import DynamicForm from '../common/DynamicForm';
// // // import DetailsView from '../common/details/DetailsView';
// // // import { useFormConfig } from './hooks/useFormConfig';
// // // import { ActionSheet } from 'antd-mobile';
// // // import { ViewConfig } from '../../types/types';
// // // import { useLocation } from 'react-router-dom';
// // // import { isLocationPartition } from '../common/utils/partitionPermissions';
// // // import { useNestedContext } from '../../lib/NestedContext';

// // // // Define a map of known components for row actions
// // // const componentMap: Record<string, React.ComponentType<any>> = {
// // //   "../pages/Clients/TicketEdit": lazy(() => import("../pages/Clients/TicketEdit").catch(() => ({ default: () => <div>Component not found</div> }))),
// // //   // Add other components here as needed
// // // };

// // // // Add window declaration to satisfy TypeScript for global functions
// // // declare global {
// // //   interface Window {
// // //     isMobile: () => boolean;
// // //     isTablet: () => boolean;
// // //     isDesktop: () => boolean;
// // //   }
// // // }

// // // interface RowActionsProps {
// // //   entityType: string;
// // //   record: any;
// // //   actions: Array<{ name: string; form?: string }>;
// // //   accessConfig?: ViewConfig['access_config'];
// // //   viewConfig?: ViewConfig;
// // //   rawData?: any[];
// // //   config?: any; // Assuming config contains details like related_table
// // // }

// // // // Cache for lazy-loaded components
// // // const componentCache = new Map<string, React.ComponentType>();

// // // const RowActions: React.FC<RowActionsProps> = ({
// // //   entityType,
// // //   record,
// // //   actions,
// // //   accessConfig,
// // //   viewConfig,
// // //   rawData,
// // //   config,
// // // }) => {
// // //   const [contextId, setContextId] = useState<string | null>(null);
// // //   const { openContext, closeContext } = useNestedContext();
// // //   const { organization, user, location, permissions } = useAuthStore();
// // //   const queryClient = useQueryClient();
// // //   const [isDrawerVisible, setIsDrawerVisible] = useState(false); // Single drawer state
// // //   const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
// // //   const [deleteRecord, setDeleteRecord] = useState<any | null>(null);
// // //   const [formName, setFormName] = useState<string | null>(null); // Single form state
// // //   const [currentAction, setCurrentAction] = useState<'Edit' | 'Clone' | null>(null); // Track action type
// // //   const [enhancedRecord, setEnhancedRecord] = useState(record);
// // //   const path = useLocation();

// // //   // Fetch form configuration
// // //   const { data: formConfig } = useFormConfig(formName || '');

// // //   // Check if user has access to an action
// // //   const hasAccess = (action: string) => {
// // //     if (!accessConfig?.[action]) {
// // //       return true;
// // //     }
// // //     const { roles = [], users = [] } = accessConfig[action];
// // //     const canAccess = users.includes(user?.id || '') || roles.includes(user?.role || '');
// // //     return canAccess;
// // //   };

// // //   const fetchRelatedData = async (projectId: string) => {
// // //     if (!organization?.id) {
// // //       console.error('No organization ID available');
// // //       return [];
// // //     }

// // //     const relatedTable = config?.details?.related_table;
// // //     if (!relatedTable?.name) {
// // //       console.warn('No related table defined in config');
// // //       return [];
// // //     }

// // //     const { data, error } = await supabase
// // //       .from(relatedTable.name)
// // //       // .select('user_id, details')
// // //       .select('*')
// // //       .eq('project_id', projectId)
// // //       .eq('organization_id', organization.id);

// // //     if (error) {
// // //       console.error('Error fetching related data:', error.message);
// // //       message.error('Failed to load related data');
// // //       return [];
// // //     }

// // //     // Transform allocations to match form data structure
// // //     return data.map((item: any) => {
// // //       // const transformed = { user_id: item.user_id };
// // //       const transformed = { ...item };
// // //       if (item.details) {
// // //         Object.entries(item.details).forEach(([key, value]) => {
// // //           transformed[`details.${key}`] = value;
// // //         });
// // //       }
// // //       return transformed;
// // //     });
// // //   };

// // //   // Helper function to compare record and formData, including nested details
// // //   const getChangedValues = (record: any, formData: any): any => {
// // //     const changedValues: any = {};
// // //     const relatedTable = config?.details?.related_table;
// // //     const relatedDataKey = relatedTable?.key;

// // //     // Compare top-level fields
// // //     for (const key in formData) {
// // //       if (key === 'details' && formData[key] && typeof formData[key] === 'object') {
// // //         // Handle nested details object
// // //         const detailsChanged: any = {};
// // //         for (const detailKey in formData.details) {
// // //           if (
// // //             !record.details ||
// // //             JSON.stringify(record.details[detailKey]) !== JSON.stringify(formData.details[detailKey])
// // //           ) {
// // //             detailsChanged[detailKey] = formData.details[detailKey];
// // //           }
// // //         }
// // //         if (Object.keys(detailsChanged).length > 0) {
// // //           changedValues.details = detailsChanged;
// // //         }
// // //       } else if (relatedTable && key === relatedDataKey && Array.isArray(formData[key])) {
// // //         // Include allocations array if present
// // //         changedValues[key] = formData[key];
// // //       } else if (
// // //         key !== 'details' &&
// // //         (!relatedTable || key !== relatedDataKey) &&
// // //         formData[key] !== undefined &&
// // //         JSON.stringify(record[key]) !== JSON.stringify(formData[key])
// // //       ) {
// // //         // Handle top-level fields
// // //         changedValues[key] = formData[key];
// // //       }
// // //     }

// // //     return changedValues;
// // //   };

// // //   // Mutation for updating a record using core_upsert_data
// // //   const updateMutation = useMutation({
// // //     mutationFn: async (values: any) => {
// // //       if (!organization?.id || !user?.id) throw new Error('Authentication required');
// // //       if (!record?.id) throw new Error('No record selected for update');

// // //       // Compare record and formData to get only changed values
// // //       const changedValues = getChangedValues(record, values);

// // //       // If no changes, throw an error or return early
// // //       if (Object.keys(changedValues).length === 0) {
// // //         throw new Error('No changes detected');
// // //       }

// // //       // // Prepare the data for the RPC call
// // //       // const dataPayload = {
// // //       //   ...changedValues,
// // //       //   organization_id: organization.id,
// // //       // };

// // //       const metadata = viewConfig?.metadata || [];
// // //       const dataPayload = {
// // //         ...changedValues,
// // //         ...(metadata.some((field) => field.key === 'organization_id') && organization?.id
// // //           ? { organization_id: organization.id }
// // //           : {}),
// // //         ...(metadata.some((field) => field.key === 'updated_by') && user?.id
// // //           ? { updated_by: user.id }
// // //           : {}),
// // //         // ...(metadata.some((field) => field.key === 'updated_at')
// // //         //   ? { updated_at: new Date().toISOString() }
// // //         //   : {}),
// // //       };
// // //       const relatedTable = config?.details?.related_table;

// // //       // Log payload for debugging
// // //       console.log('Update payload:', {
// // //         table_name: (viewConfig?.entity_schema || "public") + "." + entityType,
// // //         data: dataPayload,
// // //         id: record.id,
// // //         related_table_name: relatedTable?.name,
// // //         related_data_key: relatedTable?.key,
// // //         related_unique_keys: relatedTable?.unique_keys,
// // //       });

// // //       const { data, error } = await supabase.rpc('core_upsert_data_v7', {
// // //         table_name: (viewConfig?.entity_schema || "public") + "." + entityType,
// // //         data: dataPayload,
// // //         id: record.id,
// // //         related_table_name: relatedTable?.name,
// // //         related_data_key: relatedTable?.key,
// // //         related_unique_keys: relatedTable?.unique_keys,
// // //       });

// // //       if (error) throw error;
// // //       return data;
// // //     },
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
// // //       message.success(`${entityType} updated successfully`);
// // //       setIsDrawerVisible(false);
// // //       setFormName(null);
// // //       setCurrentAction(null);
// // //     },
// // //     onError: (error: any) => {
// // //       message.error(error.message || `Failed to update ${entityType}`);
// // //     },
// // //     retry: false,
// // //   });

// // //   // Mutation for cloning a record
// // //   const cloneMutation = useMutation({
// // //     mutationFn: async (values: any) => {
// // //       if (!organization?.id || !user?.id) throw new Error('Authentication required');

// // //       const metadata = viewConfig?.metadata || [];
// // //       const dataPayload = {
// // //         ...values,
// // //         ...(metadata.some((field) => field.key === 'organization_id') && organization?.id
// // //           ? { organization_id: organization?.id }
// // //           : {}),
// // //         ...(metadata.some((field) => field.key === 'created_by') && user?.id
// // //           ? { created_by: user?.id }
// // //           : {}),
// // //         ...(metadata.some((field) => field.key === 'user_id') && user?.id
// // //           ? { user_id: user?.id }
// // //           : {}),
// // //         ...(metadata.some((field) => field.key === 'updated_by') && user?.id
// // //           ? { updated_by: user?.id }
// // //           : {}),
// // //         ...(metadata.some((field) => field.key === 'team_id') && user?.team_id
// // //           ? { team_id: user?.team_id }
// // //           : {}),
// // //         ...(metadata.some((field) => field.key === 'location_id') && location?.id && isLocationPartition(permissions, path?.pathname)
// // //           ? { location_id: location?.id }
// // //           : {}),
// // //         ...(metadata.some((field) => field.key === 'created_at')
// // //           ? { created_at: new Date().toISOString() }
// // //           : {}),
// // //         ...(metadata.some((field) => field.key === 'updated_at')
// // //           ? { updated_at: new Date().toISOString() }
// // //           : {}),
// // //       };
// // //       const relatedTable = config?.details?.related_table;

// // //       const { data, error } = await supabase.rpc('core_upsert_data_v7', {
// // //         table_name: (viewConfig?.entity_schema || "public") + "." + entityType,
// // //         data: dataPayload,
// // //         id: null,
// // //         related_table_name: relatedTable?.name,
// // //         related_data_key: relatedTable?.key,
// // //         related_unique_keys: relatedTable?.unique_keys,
// // //       });

// // //       if (error) throw error;
// // //       return data;
// // //     },
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
// // //       message.success(`${entityType} cloned successfully`);
// // //       setIsDrawerVisible(false);
// // //       setFormName(null);
// // //       setCurrentAction(null);
// // //     },
// // //     onError: (error: any) => {
// // //       message.error(error.message || `Failed to clone ${entityType}`);
// // //     },
// // //   });

// // //   // Mutation for deleting a record
// // //   const deleteMutation = useMutation({
// // //     mutationFn: async (id: string) => {
// // //       const { error } = await supabase
// // //         .schema(viewConfig?.entity_schema || "public")
// // //         .from(entityType)
// // //         .delete()
// // //         .eq('id', id)
// // //         .eq('organization_id', organization?.id);
// // //       if (error) throw error;
// // //     },
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
// // //       message.success(`${entityType} deleted successfully`);
// // //       setDeleteRecord(null); // Clear the record after successful deletion
// // //     },
// // //     onError: (error: any) => {
// // //       message.error(error.message || `Failed to delete ${entityType}`);
// // //     },
// // //   });

// // //   const handleEdit = async (form: string) => {
// // //     setFormName(form);
// // //     setCurrentAction('Edit');
  
// // //     // Check if the form is a path to a custom component
// // //     const isComponentPath = form.startsWith(".");
// // //     const CustomComponent = isComponentPath ? componentMap[form] : null;
  
// // //     if (isComponentPath && CustomComponent) {
// // //       if (!componentCache.has(form)) {
// // //         componentCache.set(form, CustomComponent);
// // //       }
// // //       setIsDrawerVisible(true);
// // //       return; // Exit early since we will render the custom component
// // //     }
  
// // //     // Existing logic for DynamicForm
// // //     const relatedTable = config?.details?.related_table;
// // //     let updatedRecord = { ...record };

// // //     if (relatedTable?.name && relatedTable?.key) {
// // //       const relatedData = await fetchRelatedData(record.id);
// // //       updatedRecord = {
// // //         ...record,
// // //         [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined,
// // //       };
// // //     }
// // //     setEnhancedRecord(updatedRecord);
// // //     setIsDrawerVisible(true);
// // //   };

// // //   // Handle clone action
// // //   const handleClone = async (formName: string) => {
// // //     setFormName(formName);
// // //     setCurrentAction('Clone');

// // //     // Copy record data, excluding id
// // //     const clonedRecord = { ...record };
// // //     delete clonedRecord.id;

// // //     const relatedTable = config?.details?.related_table;
// // //     let updatedRecord = clonedRecord;

// // //     if (relatedTable?.name && relatedTable?.key) {
// // //       const relatedData = await fetchRelatedData(record.id);
// // //       updatedRecord = {
// // //         ...clonedRecord,
// // //         [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined,
// // //       };
// // //     }

// // //     setEnhancedRecord(updatedRecord);
// // //     setIsDrawerVisible(true);
// // //   };

// // //   const handleDetails = () => {
// // //     setIsDetailsDrawerVisible(true);
// // //     const newContextId = openContext({ config, viewConfig, editItem: record });
// // //     setContextId(newContextId);
// // //   };

// // //   // Handle delete confirmation for desktop/tablet
// // //   const handleDeleteConfirm = () => {
// // //     Modal.confirm({
// // //       title: `Confirm Deletion`,
// // //       content: `Are you sure you want to delete this ${entityType}? This action cannot be undone.`,
// // //       okText: 'Delete',
// // //       okType: 'danger',
// // //       cancelText: 'Cancel',
// // //       onOk() {
// // //         if (record) deleteMutation.mutate(record.id);
// // //       },
// // //       onCancel() {
// // //         setDeleteRecord(null); // Clear the record if cancelled
// // //       },
// // //     });
// // //   };

// // //   // Unified submit handler
// // //   const handleSubmit = async (formData: any) => {
// // //     try {
// // //       if (currentAction === 'Edit') {
// // //         await updateMutation.mutateAsync(formData);
// // //       } else if (currentAction === 'Clone') {
// // //         await cloneMutation.mutateAsync(formData);
// // //       }
// // //     } catch (error: any) {
// // //       message.error(error.message || `Failed to ${currentAction?.toLowerCase()} ${entityType}`);
// // //     }
// // //   };

// // //   const filteredActions = actions.filter((action) => {
// // //     if (action.name === 'Edit') return hasAccess('edit');
// // //     if (action.name === 'Delete') return hasAccess('delete');
// // //     if (action.name === 'Clone') return hasAccess('edit'); // Clone uses edit access
// // //     if (action.name === 'Details') {
// // //       return (
// // //         hasAccess('details') &&
// // //         viewConfig?.detailview &&
// // //         Object.keys(viewConfig.detailview).length > 0
// // //       );
// // //     }
// // //     return false;
// // //   });

// // //   const handleDrawerClose = () => {
// // //     setIsDetailsDrawerVisible(false);
// // //     // Close the context using the stored ID
// // //     if (contextId) {
// // //       closeContext(contextId);
// // //     }
// // //   };
// // //   if (filteredActions.length === 0) {
// // //     return null;
// // //   }

// // //   const isComponentPath = formName?.startsWith(".");
// // //   const CustomComponent = isComponentPath ? componentMap[formName!] : null;

// // //   return (
// // //     <>
// // //       <Space>
// // //         {filteredActions.map((action) => {
// // //           if (action.name === 'Edit' && action.form) {
// // //             return (
// // //               <Button
// // //                 key="edit"
// // //                 icon={<Edit2 size={16} />}
// // //                 onClick={() => handleEdit(action?.form!)}
// // //                 aria-label={`Edit ${record?.name || 'record'}`}
// // //               />
// // //             );
// // //           }
// // //           if (action.name === 'Delete') {
// // //             return (
// // //               <Button
// // //                 key="delete"
// // //                 icon={<Trash2 size={16} />}
// // //                 danger
// // //                 onClick={() => {
// // //                   setDeleteRecord(record);
// // //                   // Call Ant Design Modal directly if not mobile
// // //                   if (window.isDesktop() || window.isTablet()) {
// // //                     handleDeleteConfirm();
// // //                   }
// // //                 }}
// // //                 aria-label={`Delete ${record?.name || 'record'}`}
// // //               />
// // //             );
// // //           }
// // //           if (action.name === 'Details') {
// // //             return (
// // //               <Button
// // //                 key="details"
// // //                 icon={<Eye size={16} />}
// // //                 onClick={handleDetails}
// // //                 aria-label={`View details for ${record?.name || 'record'}`}
// // //               />
// // //             );
// // //           }
// // //           if (action?.name === 'Clone' && action?.form) {
// // //             return (
// // //               <Button
// // //                 key="clone"
// // //                 icon={<Copy size={16} />}
// // //                 onClick={() => handleClone(action?.form!)}
// // //                 aria-label={`Clone ${record?.name || 'record'}`}
// // //               />
// // //             );
// // //           }
// // //           return null;
// // //         })}
// // //       </Space>

// // //       <Drawer
// // //         title={`${(currentAction === 'Clone' ? 'Clone' : 'Edit') + ' ' + (record && record[config?.details?.rowTitle] || record?.name)}`}
// // //         open={isDrawerVisible}
// // //         onClose={() => {
// // //           setIsDrawerVisible(false);
// // //           setFormName(null);
// // //           setCurrentAction(null);
// // //           setEnhancedRecord(record);
// // //         }}
// // //         width={window.innerWidth <= 768 ? '100%' : '50%'}
// // //       >
// // //         {isComponentPath && CustomComponent ? (
// // //           <Suspense fallback={<div>Loading component...</div>}>
// // //             <CustomComponent editItem={enhancedRecord} rawData={rawData} viewConfig={viewConfig} />
// // //           </Suspense>
// // //         ) : formConfig && formName ? (
// // //           <DynamicForm
// // //             schemas={{
// // //               data_schema: formConfig?.data_schema || {},
// // //               ui_schema: formConfig?.ui_schema || {},
// // //               db_schema: formConfig?.db_schema || {},
// // //             }}
// // //             formData={enhancedRecord} // Use enhanced record with allocations
// // //             onFinish={handleSubmit}
// // //           />
// // //         ) : (
// // //           <div>Loading form configuration...</div>
// // //         )}
// // //       </Drawer>

// // //       <Drawer
// // //         title={`${(record && record[config?.details?.rowTitle] || record?.name) + " " + "Details"}`}
// // //         open={isDetailsDrawerVisible}
// // //         onClose={handleDrawerClose}
// // //         width={window.innerWidth <= 768 ? '100%' : '70%'}
// // //       >
// // //         <DetailsView
// // //           config={config}
// // //           entityType={entityType}
// // //           viewConfig={viewConfig}
// // //           editItem={record}
// // //           rawData={rawData}
// // //         />
// // //       </Drawer>

// // //       {/* Conditionally render ActionSheet only for mobile */}
// // //       {window.isMobile() && (
// // //         <ActionSheet
// // //           visible={!!deleteRecord}
// // //           actions={[
// // //             {
// // //               text: 'Delete',
// // //               key: 'delete',
// // //               danger: true,
// // //               onClick: () => {
// // //                 if (deleteRecord) deleteMutation.mutate(deleteRecord?.id);
// // //                 setDeleteRecord(null); // Hide action sheet after click
// // //               },
// // //             },
// // //             {
// // //               text: 'Cancel',
// // //               key: 'cancel',
// // //               onClick: () => setDeleteRecord(null),
// // //             },
// // //           ]}
// // //           onClose={() => setDeleteRecord(null)}
// // //         />
// // //       )}
// // //     </>
// // //   );
// // // };

// // // export default RowActions;





// // // src/components/DynamicViews/RowActions.tsx

// // import React, { useState, lazy, Suspense } from 'react';
// // import { Button, Drawer, Space, message, Modal } from 'antd';
// // import { Edit2, Trash2, Eye, Copy } from 'lucide-react';
// // import { useMutation, useQueryClient } from '@tanstack/react-query';
// // import { supabase } from '../../lib/supabase';
// // import { useAuthStore } from '../../lib/store';
// // import DynamicForm from '../common/DynamicForm';
// // import DetailsView from '../common/details/DetailsView';
// // import { useFormConfig } from './hooks/useFormConfig';
// // import { ActionSheet } from 'antd-mobile';
// // import { useLocation } from 'react-router-dom';
// // import { isLocationPartition } from '../common/utils/partitionPermissions';
// // import { useNestedContext } from '../../lib/NestedContext';

// // // Define a map of known components for row actions
// // const componentMap: Record<string, React.ComponentType<any>> = {
// //   "../pages/Clients/TicketEdit": lazy(() => import("../pages/Clients/TicketEdit").catch(() => ({ default: () => <div>Component not found</div> }))),
// // };

// // // Add window declaration to satisfy TypeScript for global functions
// // declare global {
// //   interface Window {
// //     isMobile: () => boolean;
// //     isTablet: () => boolean;
// //     isDesktop: () => boolean;
// //   }
// // }

// // interface RowActionsProps {
// //   entityType: string;
// //   record: any;
// //   actions: Array<{ name: string; form?: string }>;
// //   accessConfig?: any;
// //   viewConfig?: any;
// //   rawData?: any[];
// //   config?: any;
// // }

// // // Cache for lazy-loaded components
// // const componentCache = new Map<string, React.ComponentType>();

// // const RowActions: React.FC<RowActionsProps> = ({
// //   entityType,
// //   record,
// //   actions,
// //   accessConfig,
// //   viewConfig,
// //   rawData,
// //   config,
// // }) => {
// //   const [contextId, setContextId] = useState<string | null>(null);
// //   const { openContext, closeContext, contextStack } = useNestedContext();
// //   const isNested = contextStack.length > 0;
// //   const { organization, user, location, permissions } = useAuthStore();
// //   const queryClient = useQueryClient();
// //   const [isDrawerVisible, setIsDrawerVisible] = useState(false);
// //   const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
// //   const [deleteRecord, setDeleteRecord] = useState<any | null>(null);
// //   const [formName, setFormName] = useState<string | null>(null);
// //   const [currentAction, setCurrentAction] = useState<'Edit' | 'Clone' | null>(null);
// //   const [enhancedRecord, setEnhancedRecord] = useState(record);
// //   const path = useLocation();

// //   const { data: formConfig } = useFormConfig(formName || '');

// //   const hasAccess = (action: string) => {
// //     if (!accessConfig?.[action]) {
// //       return true;
// //     }
// //     const { roles = [], users = [] } = accessConfig[action];
// //     return users.includes(user?.id || '') || roles.includes(user?.role || '');
// //   };

// //   const fetchRelatedData = async (projectId: string) => {
// //     if (!organization?.id) {
// //       console.error('No organization ID available');
// //       return [];
// //     }

// //     const relatedTable = config?.details?.related_table;
// //     if (!relatedTable?.name) {
// //       console.warn('No related table defined in config');
// //       return [];
// //     }

// //     const { data, error } = await supabase
// //       .from(relatedTable.name)
// //       .select('*')
// //       .eq('project_id', projectId)
// //       .eq('organization_id', organization.id);

// //     if (error) {
// //       console.error('Error fetching related data:', error.message);
// //       message.error('Failed to load related data');
// //       return [];
// //     }

// //     return data.map((item: any) => {
// //       const transformed = { ...item };
// //       if (item.details) {
// //         Object.entries(item.details).forEach(([key, value]) => {
// //           transformed[`details.${key}`] = value;
// //         });
// //       }
// //       return transformed;
// //     });
// //   };

// //   const getChangedValues = (record: any, formData: any): any => {
// //     const changedValues: any = {};
// //     const relatedTable = config?.details?.related_table;
// //     const relatedDataKey = relatedTable?.key;

// //     for (const key in formData) {
// //       if (key === 'details' && formData[key] && typeof formData[key] === 'object') {
// //         const detailsChanged: any = {};
// //         for (const detailKey in formData.details) {
// //           if (
// //             !record.details ||
// //             JSON.stringify(record.details[detailKey]) !== JSON.stringify(formData.details[detailKey])
// //           ) {
// //             detailsChanged[detailKey] = formData.details[detailKey];
// //           }
// //         }
// //         if (Object.keys(detailsChanged).length > 0) {
// //           changedValues.details = detailsChanged;
// //         }
// //       } else if (relatedTable && key === relatedDataKey && Array.isArray(formData[key])) {
// //         changedValues[key] = formData[key];
// //       } else if (
// //         key !== 'details' &&
// //         (!relatedTable || key !== relatedDataKey) &&
// //         formData[key] !== undefined &&
// //         JSON.stringify(record[key]) !== JSON.stringify(formData[key])
// //       ) {
// //         changedValues[key] = formData[key];
// //       }
// //     }

// //     return changedValues;
// //   };

// //   const updateMutation = useMutation({
// //     mutationFn: async (values: any) => {
// //       if (!organization?.id || !user?.id) throw new Error('Authentication required');
// //       if (!record?.id) throw new Error('No record selected for update');

// //       const changedValues = getChangedValues(record, values);
// //       if (Object.keys(changedValues).length === 0) {
// //         throw new Error('No changes detected');
// //       }

// //       const metadata = viewConfig?.metadata || [];
// //       const dataPayload = {
// //         ...changedValues,
// //         ...(metadata.some((field) => field.key === 'organization_id') && organization?.id
// //           ? { organization_id: organization.id }
// //           : {}),
// //         ...(metadata.some((field) => field.key === 'updated_by') && user?.id
// //           ? { updated_by: user.id }
// //           : {}),
// //       };
// //       const relatedTable = config?.details?.related_table;

// //       const { data, error } = await supabase.rpc('core_upsert_data_v7', {
// //         table_name: (viewConfig?.entity_schema || 'public') + '.' + entityType,
// //         data: dataPayload,
// //         id: record.id,
// //         related_table_name: relatedTable?.name,
// //         related_data_key: relatedTable?.key,
// //         related_unique_keys: relatedTable?.unique_keys,
// //       });

// //       if (error) throw error;
// //       return data;
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
// //       message.success(`${entityType} updated successfully`);
// //       setIsDrawerVisible(false);
// //       setFormName(null);
// //       setCurrentAction(null);
// //     },
// //     onError: (error: any) => {
// //       message.error(error.message || `Failed to update ${entityType}`);
// //     },
// //     retry: false,
// //   });

// //   const cloneMutation = useMutation({
// //     mutationFn: async (values: any) => {
// //       if (!organization?.id || !user?.id) throw new Error('Authentication required');

// //       const metadata = viewConfig?.metadata || [];
// //       const dataPayload = {
// //         ...values,
// //         ...(metadata.some((field) => field.key === 'organization_id') && organization?.id
// //           ? { organization_id: organization?.id }
// //           : {}),
// //         ...(metadata.some((field) => field.key === 'created_by') && user?.id
// //           ? { created_by: user?.id }
// //           : {}),
// //         ...(metadata.some((field) => field.key === 'user_id') && user?.id
// //           ? { user_id: user?.id }
// //           : {}),
// //         ...(metadata.some((field) => field.key === 'updated_by') && user?.id
// //           ? { updated_by: user?.id }
// //           : {}),
// //         ...(metadata.some((field) => field.key === 'team_id') && user?.team_id
// //           ? { team_id: user?.team_id }
// //           : {}),
// //         ...(metadata.some((field) => field.key === 'location_id') && location?.id && isLocationPartition(permissions, path?.pathname)
// //           ? { location_id: location?.id }
// //           : {}),
// //         ...(metadata.some((field) => field.key === 'created_at')
// //           ? { created_at: new Date().toISOString() }
// //           : {}),
// //         ...(metadata.some((field) => field.key === 'updated_at')
// //           ? { updated_at: new Date().toISOString() }
// //           : {}),
// //       };
// //       const relatedTable = config?.details?.related_table;

// //       const { data, error } = await supabase.rpc('core_upsert_data_v7', {
// //         table_name: (viewConfig?.entity_schema || 'public') + '.' + entityType,
// //         data: dataPayload,
// //         id: null,
// //         related_table_name: relatedTable?.name,
// //         related_data_key: relatedTable?.key,
// //         related_unique_keys: relatedTable?.unique_keys,
// //       });

// //       if (error) throw error;
// //       return data;
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
// //       message.success(`${entityType} cloned successfully`);
// //       setIsDrawerVisible(false);
// //       setFormName(null);
// //       setCurrentAction(null);
// //     },
// //     onError: (error: any) => {
// //       message.error(error.message || `Failed to clone ${entityType}`);
// //     },
// //   });

// //   const deleteMutation = useMutation({
// //     mutationFn: async (id: string) => {
// //       const { error } = await supabase
// //         .schema(viewConfig?.entity_schema || 'public')
// //         .from(entityType)
// //         .delete()
// //         .eq('id', id)
// //         .eq('organization_id', organization?.id);
// //       if (error) throw error;
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
// //       message.success(`${entityType} deleted successfully`);
// //       setDeleteRecord(null);
// //     },
// //     onError: (error: any) => {
// //       message.error(error.message || `Failed to delete ${entityType}`);
// //     },
// //   });

// //   const handleEdit = async (form: string) => {
// //     setFormName(form);
// //     setCurrentAction('Edit');

// //     const isComponentPath = form.startsWith('.');
// //     const CustomComponent = isComponentPath ? componentMap[form] : null;

// //     if (isComponentPath && CustomComponent) {
// //       if (!componentCache.has(form)) {
// //         componentCache.set(form, CustomComponent);
// //       }
// //       setIsDrawerVisible(true);
// //       return;
// //     }

// //     const relatedTable = config?.details?.related_table;
// //     let updatedRecord = { ...record };

// //     if (relatedTable?.name && relatedTable?.key) {
// //       const relatedData = await fetchRelatedData(record.id);
// //       updatedRecord = {
// //         ...record,
// //         [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined,
// //       };
// //     }
// //     setEnhancedRecord(updatedRecord);
// //     setIsDrawerVisible(true);
// //   };

// //   const handleClone = async (formName: string) => {
// //     setFormName(formName);
// //     setCurrentAction('Clone');

// //     const clonedRecord = { ...record };
// //     delete clonedRecord.id;

// //     const relatedTable = config?.details?.related_table;
// //     let updatedRecord = clonedRecord;

// //     if (relatedTable?.name && relatedTable?.key) {
// //       const relatedData = await fetchRelatedData(record.id);
// //       updatedRecord = {
// //         ...clonedRecord,
// //         [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined,
// //       };
// //     }

// //     setEnhancedRecord(updatedRecord);
// //     setIsDrawerVisible(true);
// //   };

// //   const handleDetails = () => {
// //     setIsDetailsDrawerVisible(true);
// //     const newContextId = openContext({ config, viewConfig, editItem: record });
// //     setContextId(newContextId);
// //   };

// //   const handleDeleteConfirm = () => {
// //     Modal.confirm({
// //       title: `Confirm Deletion`,
// //       content: `Are you sure you want to delete this ${entityType}? This action cannot be undone.`,
// //       okText: 'Delete',
// //       okType: 'danger',
// //       cancelText: 'Cancel',
// //       onOk() {
// //         if (record) deleteMutation.mutate(record.id);
// //       },
// //       onCancel() {
// //         setDeleteRecord(null);
// //       },
// //     });
// //   };

// //   const handleSubmit = async (formData: any) => {
// //     try {
// //       if (currentAction === 'Edit') {
// //         await updateMutation.mutateAsync(formData);
// //       } else if (currentAction === 'Clone') {
// //         await cloneMutation.mutateAsync(formData);
// //       }
// //     } catch (error: any) {
// //       message.error(error.message || `Failed to ${currentAction?.toLowerCase()} ${entityType}`);
// //     }
// //   };

// //   const handleDrawerClose = () => {
// //     setIsDetailsDrawerVisible(false);
// //     if (contextId) {
// //       closeContext(contextId);
// //       setContextId(null);
// //     }
// //   };

// //   const filteredActions = actions.filter((action) => {
// //     if (action.name === 'Edit') return hasAccess('edit');
// //     if (action.name === 'Delete') return hasAccess('delete');
// //     if (action.name === 'Clone') return hasAccess('edit');
// //     if (action.name === 'Details') {
// //       if (isNested) {
// //         return false;
// //       }
// //       return (
// //         hasAccess('details') &&
// //         viewConfig?.detailview &&
// //         Object.keys(viewConfig.detailview).length > 0
// //       );
// //     }
// //     return false;
// //   });

// //   if (filteredActions.length === 0) {
// //     return null;
// //   }

// //   const isComponentPath = formName?.startsWith('.');
// //   const CustomComponent = isComponentPath ? componentMap[formName!] : null;

// //   return (
// //     <>
// //       <Space>
// //         {filteredActions.map((action) => {
// //           if (action.name === 'Edit' && action.form) {
// //             return (
// //               <Button
// //                 key="edit"
// //                 icon={<Edit2 size={16} />}
// //                 onClick={() => handleEdit(action.form!)}
// //                 aria-label={`Edit ${record?.name || 'record'}`}
// //               />
// //             );
// //           }
// //           if (action.name === 'Delete') {
// //             return (
// //               <Button
// //                 key="delete"
// //                 icon={<Trash2 size={16} />}
// //                 danger
// //                 onClick={() => {
// //                   setDeleteRecord(record);
// //                   if (window.isDesktop() || window.isTablet()) {
// //                     handleDeleteConfirm();
// //                   }
// //                 }}
// //                 aria-label={`Delete ${record?.name || 'record'}`}
// //               />
// //             );
// //           }
// //           if (action.name === 'Details') {
// //             return (
// //               <Button
// //                 key="details"
// //                 icon={<Eye size={16} />}
// //                 onClick={handleDetails}
// //                 aria-label={`View details for ${record?.name || 'record'}`}
// //               />
// //             );
// //           }
// //           if (action.name === 'Clone' && action.form) {
// //             return (
// //               <Button
// //                 key="clone"
// //                 icon={<Copy size={16} />}
// //                 onClick={() => handleClone(action.form!)}
// //                 aria-label={`Clone ${record?.name || 'record'}`}
// //               />
// //             );
// //           }
// //           return null;
// //         })}
// //       </Space>

// //       <Drawer
// //         title={`${(currentAction === 'Clone' ? 'Clone' : 'Edit') + ' ' + (record && record[config?.details?.rowTitle] || record?.name)}`}
// //         open={isDrawerVisible}
// //         onClose={() => {
// //           setIsDrawerVisible(false);
// //           setFormName(null);
// //           setCurrentAction(null);
// //           setEnhancedRecord(record);
// //         }}
// //         width={window.innerWidth <= 768 ? '100%' : '50%'}
// //       >
// //         {isComponentPath && CustomComponent ? (
// //           <Suspense fallback={<div>Loading component...</div>}>
// //             <CustomComponent editItem={enhancedRecord} rawData={rawData} viewConfig={viewConfig} />
// //           </Suspense>
// //         ) : formConfig && formName ? (
// //           <DynamicForm
// //             schemas={{
// //               data_schema: formConfig?.data_schema || {},
// //               ui_schema: formConfig?.ui_schema || {},
// //               db_schema: formConfig?.db_schema || {},
// //             }}
// //             formData={enhancedRecord}
// //             onFinish={handleSubmit}
// //           />
// //         ) : (
// //           <div>Loading form configuration...</div>
// //         )}
// //       </Drawer>

// //       <Drawer
// //         title={`${(record && record[config?.details?.rowTitle] || record?.name) + ' Details'}`}
// //         open={isDetailsDrawerVisible}
// //         onClose={handleDrawerClose}
// //         width={window.innerWidth <= 768 ? '100%' : '70%'}
// //       >
// //         <DetailsView
// //           config={config}
// //           entityType={entityType}
// //           viewConfig={viewConfig}
// //           editItem={record}
// //           rawData={rawData}
// //         />
// //       </Drawer>

// //       {window.isMobile() && (
// //         <ActionSheet
// //           visible={!!deleteRecord}
// //           actions={[
// //             {
// //               text: 'Delete',
// //               key: 'delete',
// //               danger: true,
// //               onClick: () => {
// //                 if (deleteRecord) deleteMutation.mutate(deleteRecord.id);
// //                 setDeleteRecord(null);
// //               },
// //             },
// //             {
// //               text: 'Cancel',
// //               key: 'cancel',
// //               onClick: () => setDeleteRecord(null),
// //             },
// //           ]}
// //           onClose={() => setDeleteRecord(null)}
// //         />
// //       )}
// //     </>
// //   );
// // };

// // export default RowActions;




// // // ABOVE WORKING CORRECTLY FOR 0 LEVEL - NOW ADJUSTING FOR MULTI LEVEL VIEW DETAILS
// import React, { useState, lazy, Suspense } from 'react';
// import { Button, Drawer, Space, message, Modal } from 'antd';
// import { Edit2, Trash2, Eye, Copy } from 'lucide-react';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { supabase } from '../../lib/supabase';
// import { useAuthStore } from '../../lib/store';
// import DynamicForm from '../common/DynamicForm';
// import DetailsView from '../common/details/DetailsView';
// import { useFormConfig } from './hooks/useFormConfig';
// import { ActionSheet } from 'antd-mobile';
// import { useLocation } from 'react-router-dom';
// import { isLocationPartition } from '../common/utils/partitionPermissions';
// import { useNestedContext } from '../../lib/NestedContext';

// // Define a map of known components for row actions
// const componentMap: Record<string, React.ComponentType<any>> = {
//   "../pages/Clients/TicketEdit": lazy(() => import("../pages/Clients/TicketEdit").catch(() => ({ default: () => <div>Component not found</div> }))),
// };

// // Add window declaration to satisfy TypeScript for global functions
// declare global {
//   interface Window {
//     isMobile: () => boolean;
//     isTablet: () => boolean;
//     isDesktop: () => boolean;
//   }
// }

// interface RowActionsProps {
//   entityType: string;
//   record: any;
//   actions: Array<{ name: string; form?: string }>;
//   accessConfig?: any;
//   viewConfig?: any;
//   rawData?: any[];
//   config?: any;
// }

// // Cache for lazy-loaded components
// const componentCache = new Map<string, React.ComponentType>();

// const RowActions: React.FC<RowActionsProps> = ({
//   entityType,
//   record,
//   actions,
//   accessConfig,
//   viewConfig,
//   rawData,
//   config,
// }) => {
//   const [contextId, setContextId] = useState<string | null>(null);
//   const { openContext, closeContext, contextStack } = useNestedContext();
//   const { organization, user, location, permissions } = useAuthStore();
//   const queryClient = useQueryClient();
//   const [isDrawerVisible, setIsDrawerVisible] = useState(false);
//   const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
//   const [deleteRecord, setDeleteRecord] = useState<any | null>(null);
//   const [formName, setFormName] = useState<string | null>(null);
//   const [currentAction, setCurrentAction] = useState<'Edit' | 'Clone' | null>(null);
//   const [enhancedRecord, setEnhancedRecord] = useState(record);
//   const path = useLocation();

//   const { data: formConfig } = useFormConfig(formName || '');

//   const hasAccess = (action: string) => {
//     if (!accessConfig?.[action]) return true;
//     const { roles = [], users = [] } = accessConfig[action];
//     return users.includes(user?.id || '') || roles.includes(user?.role || '');
//   };

//   // --- Data fetch for relations ---
//   const fetchRelatedData = async (projectId: string) => {
//     if (!organization?.id) return [];

//     const relatedTable = config?.details?.related_table;
//     if (!relatedTable?.name) return [];

//     const { data, error } = await supabase
//       .from(relatedTable.name)
//       .select('*')
//       .eq('project_id', projectId)
//       .eq('organization_id', organization.id);

//     if (error) {
//       console.error('Error fetching related data:', error.message);
//       message.error('Failed to load related data');
//       return [];
//     }

//     return data.map((item: any) => {
//       const transformed = { ...item };
//       if (item.details) {
//         Object.entries(item.details).forEach(([key, value]) => {
//           transformed[`details.${key}`] = value;
//         });
//       }
//       return transformed;
//     });
//   };

//   const getChangedValues = (record: any, formData: any): any => {
//     const changedValues: any = {};
//     const relatedTable = config?.details?.related_table;
//     const relatedDataKey = relatedTable?.key;

//     for (const key in formData) {
//       if (key === 'details' && formData[key] && typeof formData[key] === 'object') {
//         const detailsChanged: any = {};
//         for (const detailKey in formData.details) {
//           if (
//             !record.details ||
//             JSON.stringify(record.details[detailKey]) !== JSON.stringify(formData.details[detailKey])
//           ) {
//             detailsChanged[detailKey] = formData.details[detailKey];
//           }
//         }
//         if (Object.keys(detailsChanged).length > 0) {
//           changedValues.details = detailsChanged;
//         }
//       } else if (relatedTable && key === relatedDataKey && Array.isArray(formData[key])) {
//         changedValues[key] = formData[key];
//       } else if (
//         key !== 'details' &&
//         (!relatedTable || key !== relatedDataKey) &&
//         formData[key] !== undefined &&
//         JSON.stringify(record[key]) !== JSON.stringify(formData[key])
//       ) {
//         changedValues[key] = formData[key];
//       }
//     }
//     return changedValues;
//   };

//   // --- Mutations ---
//   const updateMutation = useMutation({
//     mutationFn: async (values: any) => {
//       if (!organization?.id || !user?.id) throw new Error('Authentication required');
//       if (!record?.id) throw new Error('No record selected for update');

//       const changedValues = getChangedValues(record, values);
//       if (Object.keys(changedValues).length === 0) {
//         throw new Error('No changes detected');
//       }

//       const metadata = viewConfig?.metadata || [];
//       const dataPayload = {
//         ...changedValues,
//         ...(metadata.some((field) => field.key === 'organization_id') && organization?.id
//           ? { organization_id: organization.id }
//           : {}),
//         ...(metadata.some((field) => field.key === 'updated_by') && user?.id
//           ? { updated_by: user.id }
//           : {}),
//       };
//       const relatedTable = config?.details?.related_table;

//       const { data, error } = await supabase.rpc('core_upsert_data_v7', {
//         table_name: (viewConfig?.entity_schema || 'public') + '.' + entityType,
//         data: dataPayload,
//         id: record.id,
//         related_table_name: relatedTable?.name,
//         related_data_key: relatedTable?.key,
//         related_unique_keys: relatedTable?.unique_keys,
//       });

//       if (error) throw error;
//       return data;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
//       message.success(`${entityType} updated successfully`);
//       setIsDrawerVisible(false);
//       setFormName(null);
//       setCurrentAction(null);
//     },
//     onError: (error: any) => {
//       message.error(error.message || `Failed to update ${entityType}`);
//     },
//     retry: false,
//   });

//   const cloneMutation = useMutation({
//     mutationFn: async (values: any) => {
//       if (!organization?.id || !user?.id) throw new Error('Authentication required');

//       const metadata = viewConfig?.metadata || [];
//       const dataPayload = {
//         ...values,
//         ...(metadata.some((field) => field.key === 'organization_id') && organization?.id
//           ? { organization_id: organization?.id }
//           : {}),
//         ...(metadata.some((field) => field.key === 'created_by') && user?.id
//           ? { created_by: user?.id }
//           : {}),
//         ...(metadata.some((field) => field.key === 'user_id') && user?.id
//           ? { user_id: user?.id }
//           : {}),
//         ...(metadata.some((field) => field.key === 'updated_by') && user?.id
//           ? { updated_by: user?.id }
//           : {}),
//         ...(metadata.some((field) => field.key === 'team_id') && user?.team_id
//           ? { team_id: user?.team_id }
//           : {}),
//         ...(metadata.some((field) => field.key === 'location_id') && location?.id && isLocationPartition(permissions, path?.pathname)
//           ? { location_id: location?.id }
//           : {}),
//         ...(metadata.some((field) => field.key === 'created_at')
//           ? { created_at: new Date().toISOString() }
//           : {}),
//         ...(metadata.some((field) => field.key === 'updated_at')
//           ? { updated_at: new Date().toISOString() }
//           : {}),
//       };
//       const relatedTable = config?.details?.related_table;

//       const { data, error } = await supabase.rpc('core_upsert_data_v7', {
//         table_name: (viewConfig?.entity_schema || 'public') + '.' + entityType,
//         data: dataPayload,
//         id: null,
//         related_table_name: relatedTable?.name,
//         related_data_key: relatedTable?.key,
//         related_unique_keys: relatedTable?.unique_keys,
//       });

//       if (error) throw error;
//       return data;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
//       message.success(`${entityType} cloned successfully`);
//       setIsDrawerVisible(false);
//       setFormName(null);
//       setCurrentAction(null);
//     },
//     onError: (error: any) => {
//       message.error(error.message || `Failed to clone ${entityType}`);
//     },
//   });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       const { error } = await supabase
//         .schema(viewConfig?.entity_schema || 'public')
//         .from(entityType)
//         .delete()
//         .eq('id', id)
//         .eq('organization_id', organization?.id);
//       if (error) throw error;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
//       message.success(`${entityType} deleted successfully`);
//       setDeleteRecord(null);
//     },
//     onError: (error: any) => {
//       message.error(error.message || `Failed to delete ${entityType}`);
//     },
//   });

//   // --- Handlers ---
//   const handleEdit = async (form: string) => {
//     setFormName(form);
//     setCurrentAction('Edit');

//     const isComponentPath = form.startsWith('.');
//     const CustomComponent = isComponentPath ? componentMap[form] : null;

//     if (isComponentPath && CustomComponent) {
//       if (!componentCache.has(form)) {
//         componentCache.set(form, CustomComponent);
//       }
//       setIsDrawerVisible(true);
//       return;
//     }

//     const relatedTable = config?.details?.related_table;
//     let updatedRecord = { ...record };

//     if (relatedTable?.name && relatedTable?.key) {
//       const relatedData = await fetchRelatedData(record.id);
//       updatedRecord = {
//         ...record,
//         [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined,
//       };
//     }
//     setEnhancedRecord(updatedRecord);
//     setIsDrawerVisible(true);
//   };

//   const handleClone = async (formName: string) => {
//     setFormName(formName);
//     setCurrentAction('Clone');

//     const clonedRecord = { ...record };
//     delete clonedRecord.id;

//     const relatedTable = config?.details?.related_table;
//     let updatedRecord = clonedRecord;

//     if (relatedTable?.name && relatedTable?.key) {
//       const relatedData = await fetchRelatedData(record.id);
//       updatedRecord = {
//         ...clonedRecord,
//         [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined,
//       };
//     }
//     setEnhancedRecord(updatedRecord);
//     setIsDrawerVisible(true);
//   };

//   const handleDetails = () => {
//     setIsDetailsDrawerVisible(true);
//     const newContextId = openContext({ config, viewConfig, editItem: record });
//     setContextId(newContextId);
//   };

//   const handleDeleteConfirm = () => {
//     Modal.confirm({
//       title: `Confirm Deletion`,
//       content: `Are you sure you want to delete this ${entityType}? This action cannot be undone.`,
//       okText: 'Delete',
//       okType: 'danger',
//       cancelText: 'Cancel',
//       onOk() {
//         if (record) deleteMutation.mutate(record.id);
//       },
//       onCancel() {
//         setDeleteRecord(null);
//       },
//     });
//   };

//   const handleSubmit = async (formData: any) => {
//     try {
//       if (currentAction === 'Edit') {
//         await updateMutation.mutateAsync(formData);
//       } else if (currentAction === 'Clone') {
//         await cloneMutation.mutateAsync(formData);
//       }
//     } catch (error: any) {
//       message.error(error.message || `Failed to ${currentAction?.toLowerCase()} ${entityType}`);
//     }
//   };

//   const handleDrawerClose = () => {
//     setIsDetailsDrawerVisible(false);
//     if (contextId) {
//       closeContext(contextId);
//       setContextId(null);
//     }
//   };

//   // --- FILTER Actions (NEW RULE: allow 2 levels max) ---
//   const filteredActions = (actions || []).filter((action) => {
//     if (action.name === 'Edit') return hasAccess('edit');
//     if (action.name === 'Delete') return hasAccess('delete');
//     if (action.name === 'Clone') return hasAccess('edit');

//     // --- CHANGE START: Adjust the nesting depth check ---
//     // REASON: We are changing the rule to allow nesting up to 2 levels deep.
//     // The "Details" button should only be hidden when the context stack already has 2 or more items.
//     // contextStack.length === 0 -> Top level (Level 0)
//     // contextStack.length === 1 -> First drawer (Level 1)
//     // contextStack.length === 2 -> Second drawer (Level 2), hide the button here.
//     if (action.name === 'Details') {
//       if (contextStack.length >= 2) {
//         return false;
//       }
//       return (
//         hasAccess('details') &&
//         viewConfig?.detailview &&
//         Object.keys(viewConfig.detailview).length > 0
//       );
//     }
//     // --- CHANGE END ---

//     // Note: You may want a default case here if you have other action types.
//     // For now, this matches your existing logic.
//     return false;
//   });

//   if (filteredActions.length === 0) return null;

//   const isComponentPath = formName?.startsWith('.');
//   const CustomComponent = isComponentPath ? componentMap[formName!] : null;

//   return (
//     <>
//       <Space>
//         {filteredActions.map((action) => {
//           if (action.name === 'Edit' && action.form) {
//             return (
//               <Button
//                 key="edit"
//                 icon={<Edit2 size={16} />}
//                 onClick={() => handleEdit(action.form!)}
//                 aria-label={`Edit ${record?.name || 'record'}`}
//               />
//             );
//           }
//           if (action.name === 'Delete') {
//             return (
//               <Button
//                 key="delete"
//                 icon={<Trash2 size={16} />}
//                 danger
//                 onClick={() => {
//                   setDeleteRecord(record);
//                   if (window.isDesktop() || window.isTablet()) handleDeleteConfirm();
//                 }}
//                 aria-label={`Delete ${record?.name || 'record'}`}
//               />
//             );
//           }
//           if (action.name === 'Details') {
//             return (
//               <Button
//                 key="details"
//                 icon={<Eye size={16} />}
//                 onClick={handleDetails}
//                 aria-label={`View details for ${record?.name || 'record'}`}
//               />
//             );
//           }
//           if (action.name === 'Clone' && action.form) {
//             return (
//               <Button
//                 key="clone"
//                 icon={<Copy size={16} />}
//                 onClick={() => handleClone(action.form!)}
//                 aria-label={`Clone ${record?.name || 'record'}`}
//               />
//             );
//           }
//           return null;
//         })}
//       </Space>

//       {/* Edit/Clone Drawer */}
//       <Drawer
//         title={`${(currentAction === 'Clone' ? 'Clone' : 'Edit') + ' ' + (record && record[config?.details?.rowTitle] || record?.name)}`}
//         open={isDrawerVisible}
//         onClose={() => {
//           setIsDrawerVisible(false);
//           setFormName(null);
//           setCurrentAction(null);
//           setEnhancedRecord(record);
//         }}
//         width={window.innerWidth <= 768 ? '100%' : '50%'}
//       >
//         {isComponentPath && CustomComponent ? (
//           <Suspense fallback={<div>Loading component...</div>}>
//             <CustomComponent editItem={enhancedRecord} rawData={rawData} viewConfig={viewConfig} />
//           </Suspense>
//         ) : formConfig && formName ? (
//           <DynamicForm
//             schemas={{
//               data_schema: formConfig?.data_schema || {},
//               ui_schema: formConfig?.ui_schema || {},
//               db_schema: formConfig?.db_schema || {},
//             }}
//             formData={enhancedRecord}
//             onFinish={handleSubmit}
//           />
//         ) : (
//           <div>Loading form configuration...</div>
//         )}
//       </Drawer>

//       {/* Details Drawer */}
//       <Drawer
//         title={`${(record && record[config?.details?.rowTitle] || record?.name) + ' Details'}`}
//         open={isDetailsDrawerVisible}
//         onClose={handleDrawerClose}
//         width={window.innerWidth <= 768 ? '100%' : '70%'}
//       >
//         <DetailsView
//           config={config}
//           entityType={entityType}
//           viewConfig={viewConfig}
//           editItem={record}
//           rawData={rawData}
//         />
//       </Drawer>

//       {/* Mobile Delete ActionSheet */}
//       {window.isMobile() && (
//         <ActionSheet
//           visible={!!deleteRecord}
//           actions={[
//             {
//               text: 'Delete',
//               key: 'delete',
//               danger: true,
//               onClick: () => {
//                 if (deleteRecord) deleteMutation.mutate(deleteRecord.id);
//                 setDeleteRecord(null);
//               },
//             },
//             {
//               text: 'Cancel',
//               key: 'cancel',
//               onClick: () => setDeleteRecord(null),
//             },
//           ]}
//           onClose={() => setDeleteRecord(null)}
//         />
//       )}
//     </>
//   );
// };

// export default RowActions;








import React, { useState, lazy, Suspense } from 'react';
import { Button, Drawer, Space, message, Modal, Dropdown, Menu } from 'antd'; // Add Dropdown and Menu
import { Edit2, Trash2, Eye, Copy, MoreHorizontal } from 'lucide-react'; // Add MoreHorizontal icon
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import DynamicForm from '../common/DynamicForm';
import DetailsView from '../common/details/DetailsView';
import { useFormConfig } from './hooks/useFormConfig';
import { useNestedContext } from '../../lib/NestedContext';
import { ActionSheet } from 'antd-mobile';
import { useLocation } from 'react-router-dom';
import { isLocationPartition } from '../common/utils/partitionPermissions';

const componentMap: Record<string, React.ComponentType<any>> = {
  "../pages/Clients/TicketEdit": lazy(() => import("../pages/Clients/TicketEdit").catch(() => ({ default: () => <div>Component not found</div> })) ),
  "../pages/Clients/LogViewer": lazy(() => import("../pages/Clients/LogViewer").catch(() => ({ default: () => <div>Component not found</div> })) ),
  "../common/details/Task": lazy(() => import("../common/details/Task").catch(() => ({ default: () => <div>Component not found</div> })) ),
  "../common/doc/ServiceReportDrawer": lazy(() => import("../common/doc/ServiceReportDrawer").catch(() => ({ default: () => <div>Component not found</div> })) ),
  "../common/doc/TaskReportPage": lazy(() => import("../common/doc/TaskReportPage").catch(() => ({ default: () => <div>Component not found</div> })) ),
  "../common/details/Expensesheet": lazy(() => import("../common/details/Expenses").catch(() => ({ default: () => <div>Component not found</div> }))),
  "../common/details/Timesheet": lazy(() => import("../common/details/Times").catch(() => ({ default: () => <div>Component not found</div> }))),
  // Add other custom components here as needed
};

declare global {
  interface Window {
    isMobile: () => boolean;
    isTablet: () => boolean;
    isDesktop: () => boolean;
  }
}

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
  const [currentAction, setCurrentAction] = useState<'Edit' | 'Clone' | null>(null);
  const [enhancedRecord, setEnhancedRecord] = useState(record);
  const path = useLocation();
  console.log("jwt",user);

  const { data: formConfig } = useFormConfig(formName || '');

  const hasAccess = (action: string) => {
    if (!accessConfig?.[action]) return true;
    const { roles = [], users = [] } = accessConfig[action];
    return users.includes(user?.id || '') || roles.includes(user?.role || '');
  };

  const fetchRelatedData = async (projectId: string) => {
  if (!organization?.id) return [];

  const relatedTable = config?.details?.related_table;
  if (!relatedTable?.name || !relatedTable?.fields) return []; // Ensure fields are defined

  const parts = relatedTable.name.split('.');

let schemaName;
let tableName;

if (parts.length === 2) {
  // If there's a '.', the first part is the schema, the second is the table.
  schemaName = parts[0];
  tableName = parts[1];
} else {
  // If no '.', the schema is 'public' by default, and the whole name is the table.
  schemaName = 'public';
  tableName = relatedTable.name;
}

  // Select all columns from the related table, including the full 'details' JSONB column
  const { data, error } = await supabase
    .schema(schemaName) // Use the dynamically determined schema
    .from(tableName)
    .select('*')
    .eq(relatedTable?.fk_column, projectId)
    .eq('organization_id', organization.id);

  if (error) {
    console.error('Error fetching related data:', error.message);
    message.error('Failed to load related data');
    return [];
  }

  // Manually flatten and filter the data on the client side
  return data.map((item: any) => {
    const transformed: any = {};
    const flattenedFields = new Set(relatedTable.fields);

    // Filter fields from the original item and flatten JSONB fields
    for (const key in item) {
      if (item.hasOwnProperty(key)) {
        if (key === 'details' && typeof item[key] === 'object' && item[key] !== null) {
          // Flatten JSONB fields that are in the fields array
          for (const nestedKey in item[key]) {
            const flattenedKey = `details.${nestedKey}`;
            if (flattenedFields.has(flattenedKey)) {
              transformed[flattenedKey] = item[key][nestedKey];
            }
          }
        } else if (flattenedFields.has(key)) {
          // Include top-level fields that are in the fields array
          transformed[key] = item[key];
        }
      }
    }
    
    // // Ensure unique keys are always included for a successful update
    // relatedTable?.unique_keys?.forEach((uniqueKey: string) => {
    //   if (item.hasOwnProperty(uniqueKey) && !transformed.hasOwnProperty(uniqueKey)) {
    //     transformed[uniqueKey] = item[uniqueKey];
    //   }
    // });
    console.log("tzx",transformed);
    return transformed;
  });
};

  const getChangedValues = (record: any, formData: any): any => {
    const changedValues: any = {};
    const relatedTable = config?.details?.related_table;
    const relatedDataKey = relatedTable?.key;

    for (const key in formData) {
      if (key === 'details' && formData[key] && typeof formData[key] === 'object') {
        const detailsChanged: any = {};
        for (const detailKey in formData.details) {
          if (
            !record.details ||
            JSON.stringify(record.details[detailKey]) !== JSON.stringify(formData.details[detailKey])
          ) {
            detailsChanged[detailKey] = formData.details[detailKey];
          }
        }
        if (Object.keys(detailsChanged).length > 0) {
          changedValues.details = detailsChanged;
        }
      } else if (relatedTable && key === relatedDataKey && Array.isArray(formData[key])) {
        changedValues[key] = formData[key];
      } else if (
        key !== 'details' &&
        (!relatedTable || key !== relatedDataKey) &&
        formData[key] !== undefined &&
        JSON.stringify(record[key]) !== JSON.stringify(formData[key])
      ) {
        changedValues[key] = formData[key];
      }
    }
    return changedValues;
  };

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!organization?.id || !user?.id) throw new Error('Authentication required');
      if (!record?.id) throw new Error('No record selected for update');

      const changedValues = getChangedValues(record, values);
      if (Object.keys(changedValues).length === 0) {
        throw new Error('No changes detected');
      }

      const metadata = viewConfig?.metadata || [];
      const dataPayload = {
        ...changedValues,
        ...(metadata.some((field) => field.key === 'organization_id') && organization?.id
          ? { organization_id: organization.id }
          : {}),
        ...(metadata.some((field) => field.key === 'updated_by') && user?.id
          ? { updated_by: user.id }
          : {}),
      };
      const relatedTable = config?.details?.related_table;
console.log("payload-r",{
        table_name: viewConfig?.entity_type,
        data: dataPayload,
        id: record.id,
        related_table_name: relatedTable?.name,
        related_data_key: relatedTable?.key,
        related_unique_keys: relatedTable?.unique_keys,
      related_fk_column: relatedTable?.fk_column||'project_id'
      });
      const { data, error } = await supabase.schema('analytics').rpc('core_upsert_data_v8', {
        table_name: viewConfig?.entity_type,
        data: dataPayload,
        id: record.id,
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
      message.success(`${entityType} updated successfully`);
      setIsDrawerVisible(false);
      setFormName(null);
      setCurrentAction(null);
    },
    onError: (error: any) => {
      message.error(error.message || `Failed to update ${entityType}`);
    },
    retry: false,
  });

  const cloneMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!organization?.id || !user?.id) throw new Error('Authentication required');

      const metadata = viewConfig?.metadata || [];
      const dataPayload = {
        ...values,
        ...(metadata.some((field) => field.key === 'organization_id') && organization?.id
          ? { organization_id: organization?.id }
          : {}),
        ...(metadata.some((field) => field.key === 'created_by') && user?.id
          ? { created_by: user?.id }
          : {}),
        ...(metadata.some((field) => field.key === 'user_id') && user?.id
          ? { user_id: user?.id }
          : {}),
        ...(metadata.some((field) => field.key === 'updated_by') && user?.id
          ? { updated_by: user?.id }
          : {}),
        ...(metadata.some((field) => field.key === 'team_id') && user?.team_id
          ? { team_id: user?.team_id }
          : {}),
        ...(metadata.some((field) => field.key === 'location_id') && location?.id && isLocationPartition(permissions, path?.pathname)
          ? { location_id: location?.id }
          : {}),
        ...(metadata.some((field) => field.key === 'created_at')
          ? { created_at: new Date().toISOString() }
          : {}),
        ...(metadata.some((field) => field.key === 'updated_at')
          ? { updated_at: new Date().toISOString() }
          : {}),
      };
      const relatedTable = config?.details?.related_table;

      // const { data, error } = await supabase.rpc('core_upsert_data_v7', {
      const { data, error } = await supabase.schema('analytics').rpc('core_upsert_data_v8', {
        table_name: viewConfig?.entity_type,
        data: dataPayload,
        id: null,
        related_table_name: relatedTable?.name,
        related_data_key: relatedTable?.key,
        related_unique_keys: relatedTable?.unique_keys,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
      message.success(`${entityType} cloned successfully`);
      setIsDrawerVisible(false);
      setFormName(null);
      setCurrentAction(null);
    },
    onError: (error: any) => {
      message.error(error.message || `Failed to clone ${entityType}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const parts = viewConfig?.entity_type.split('.');
      const schema = parts[0];
      const { error } = await supabase
        .schema(schema||'public')
        .from(entityType)
        .delete()
        .eq('id', id)
        .eq('organization_id', organization?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, organization?.id] });
      message.success(`${entityType} deleted successfully`);
      setDeleteRecord(null);
    },
    onError: (error: any) => {
      message.error(error.message || `Failed to delete ${entityType}`);
    },
  });

  const handleSubmit = async (formData: any) => {
    try {
      if (currentAction === 'Edit') {
        await updateMutation.mutateAsync(formData);
      } else if (currentAction === 'Clone') {
        await cloneMutation.mutateAsync(formData);
      }
    } catch (error: any) {
      message.error(error.message || `Failed to ${currentAction?.toLowerCase()} ${entityType}`);
    }
  };

  const handleEdit = async (form: string) => {
    setFormName(form);
    setCurrentAction('Edit');

    const isComponentPath = form.startsWith('.');
    const CustomComponent = isComponentPath ? componentMap[form] : null;

    if (isComponentPath && CustomComponent) {
      setIsDrawerVisible(true);
      return;
    }

    const relatedTable = config?.details?.related_table;
    let updatedRecord = { ...record };

    if (relatedTable?.name && relatedTable?.key) {
      const relatedData = await fetchRelatedData(record.id);
      updatedRecord = {
        ...record,
        [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined,
      };
    }
    setEnhancedRecord(updatedRecord);
    setIsDrawerVisible(true);
  };

  const handleClone = async (formName: string) => {
    setFormName(formName);
    setCurrentAction('Clone');

    const clonedRecord = { ...record };
    delete clonedRecord.id;

    const relatedTable = config?.details?.related_table;
    let updatedRecord = clonedRecord;

    if (relatedTable?.name && relatedTable?.key) {
      const relatedData = await fetchRelatedData(record.id);
      updatedRecord = {
        ...clonedRecord,
        [relatedTable.key]: relatedData.length > 0 ? relatedData : undefined,
      };
    }
    setEnhancedRecord(updatedRecord);
    setIsDrawerVisible(true);
  };

  const handleDetails = () => {
    setIsDetailsDrawerVisible(true);
    const newContextId = openContext({ config, viewConfig, editItem: record });
    setContextId(newContextId);
  };
  const handleDeleteConfirm = () => {
    Modal.confirm({
      title: `Confirm Deletion`,
      content: `Are you sure you want to delete this ${entityType}? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        if (record) deleteMutation.mutate(record.id);
        setDeleteRecord(null);
      },
      onCancel() {
        setDeleteRecord(null);
      },
    });
  };

  const handleDrawerClose = () => {
    setIsDetailsDrawerVisible(false);
    // On close, ensure we remove this specific drawer's context from the global stack
    if (contextId) {
      closeContext(contextId);
      setContextId(null);
    }
  };

  // --- CORE FIX: Filter actions based on nesting depth ---
  const filteredActions = (actions || []).filter((action) => {
    switch (action.name) {
      case 'Edit':
        return hasAccess('edit');
      case 'Delete':
        return hasAccess('delete');
      case 'Details':
        // The gatekeeper logic
      // This is the gatekeeper logic.
        // It prevents showing the 'Details' button if we are already 2 levels deep.
         // --- CHANGE START: Adjust the nesting depth check ---
    // REASON: We are changing the rule to allow nesting up to 2 levels deep.
    // The "Details" button should only be hidden when the context stack already has 2 or more items.
    // contextStack.length === 0 -> Top level (Level 0)
    // contextStack.length === 1 -> First drawer (Level 1)
    // contextStack.length === 2 -> Second drawer (Level 2), hide the button here.
        if (contextStack.length >= 2) {
          return false;
        }
        return (
          hasAccess('details') &&
          viewConfig?.detailview &&
          Object.keys(viewConfig.detailview).length > 0
        );
      case 'Clone':
        return hasAccess('clone'); // Assuming a 'clone' access check
      default:
        // By default, handle custom actions if they have a form and are not "details"
        if(action.name && action.form){
          return true;
        }
        return false;
    }
  });

  const onFinish = () => {
    setIsDrawerVisible(false);
  };

  if (filteredActions.length === 0) return null;

  const getActionItem = (action: { name: string; form?: string }) => {
    switch (action.name) {
      case 'Edit':
        return {
          key: 'edit',
          label: 'Edit',
          icon: <Edit2 size={16} />,
          onClick: () => action.form && handleEdit(action.form),
        };
      case 'Delete':
        return {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 size={16} />,
          danger: true,
          onClick: () => setDeleteRecord(record),
        };
      case 'Details':
        return {
          key: 'details',
          label: 'Details',
          icon: <Eye size={16} />,
          onClick: handleDetails,
        };
      case 'Clone':
        return {
          key: 'clone',
          label: 'Clone',
          icon: <Copy size={16} />,
          onClick: () => action.form && handleClone(action.form),
        };
      default:
        return {
          key: action.name,
          label: action.name,
          icon: <Button style={{border: "none"}}><Eye size={16} /></Button>,
          onClick: () => action.form && handleDetails(),
        };
    }
  };
  
  const isComponentPath = formName?.startsWith('.');
  const CustomComponent = isComponentPath ? componentMap[formName!] : null;
  
  const renderActions = () => {
    const actionItems = filteredActions.map(getActionItem);

    if (window.isMobile() && actionItems.length > 1) {
      // Mobile: Render as a dropdown
      const menu = <Menu items={actionItems} />;
      return (
        <Dropdown overlay={menu} trigger={['click']}>
          <Button icon={<MoreHorizontal size={16} />} />
        </Dropdown>
      );
    } else {
      // Desktop or a single mobile action: Render as individual buttons
      return (
        <Space>
          {actionItems.map(item => (
            <Button
              key={item.key}
              icon={item.icon}
              danger={item.danger}
              onClick={item.onClick}
              title={item.label}
            />
          ))}
        </Space>
      );
    }
  };

  return (
    <>
      {renderActions()}

      {/* Edit/Clone Drawer */}
      <Drawer
        title={`${(currentAction === 'Clone' ? 'Clone' : 'Edit') + ' ' + (record && record[config?.details?.rowTitle] || record?.name)}`}
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        width={window.isMobile() ? '100%' : '50%'}
        styles={{
         body: {
            paddingTop: '5px' // Styles for the drawer body
        }
    }}
      >
        {isComponentPath && CustomComponent ? (
          <Suspense fallback={<div>Loading component...</div>}>
            <CustomComponent editItem={enhancedRecord} rawData={rawData} viewConfig={viewConfig} onFinish={onFinish}/>
          </Suspense>
        ) : formConfig && formName ? (
          <DynamicForm
            schemas={{
              data_schema: formConfig?.data_schema || {},
              ui_schema: formConfig?.ui_schema || {},
              db_schema: formConfig?.db_schema || {},
            }}
            formData={enhancedRecord}
            onFinish={handleSubmit}
          />
        ) : (
          <div>Loading form configuration...</div>
        )}
      </Drawer>

      {/* Details Drawer */}
      <Drawer
        title={`${(record && record[config?.details?.rowTitle] || record?.name||record?.display_id) + ' Details'}`}
        open={isDetailsDrawerVisible}
        onClose={handleDrawerClose}
        width={window.isMobile() ? '100%' : '70%'}
        styles={{
         body: {
            paddingTop: '2px',paddingInline:'15px' // Styles for the drawer body
        }
    }}
      >
        <DetailsView
          config={config}
          entityType={entityType}
          viewConfig={viewConfig}
          editItem={record}
          rawData={rawData}
        />
      </Drawer>

      {/* Mobile Delete ActionSheet */}
      {window.isMobile() && (
        <ActionSheet
          visible={!!deleteRecord}
          actions={[
            {
              text: 'Delete',
              key: 'delete',
              danger: true,
              onClick: () => {
                if (deleteRecord) deleteMutation.mutate(deleteRecord.id);
                setDeleteRecord(null);
              },
            },
            {
              text: 'Cancel',
              key: 'cancel',
              onClick: () => setDeleteRecord(null),
            },
          ]}
          onClose={() => setDeleteRecord(null)}
        />
      )}
      {!window.isMobile() && deleteRecord && handleDeleteConfirm()}
    </>
  );
};

export default RowActions;














// // FOR FUTURE 
// // import React, { useState, lazy, Suspense } from 'react';
// // import { Button, Drawer, Space, message, Modal } from 'antd';
// // import { Edit2, Trash2, Eye, Copy, Settings } from 'lucide-react';
// // import { useMutation, useQueryClient } from '@tanstack/react-query';
// // import { supabase } from '../../lib/supabase';
// // import { useAuthStore } from '../../lib/store';
// // import DynamicForm from '../common/DynamicForm';
// // import DetailsView from '../common/details/DetailsView';
// // import { useFormConfig } from './hooks/useFormConfig';
// // import { ActionSheet } from 'antd-mobile';
// // import { useLocation } from 'react-router-dom';
// // import { isLocationPartition } from '../common/utils/partitionPermissions';
// // import { useNestedContext } from '../../lib/NestedContext';

// // // Define a map of known components for row actions
// // const componentMap: Record<string, React.ComponentType<any>> = {
// //   "../pages/Clients/TicketEdit": lazy(() => import("../pages/Clients/TicketEdit").catch(() => ({ default: () => <div>Component not found</div> }))),
// // };

// // // Add window declaration to satisfy TypeScript for global functions
// // declare global {
// //   interface Window {
// //     isMobile: () => boolean;
// //     isTablet: () => boolean;
// //     isDesktop: () => boolean;
// //   }
// // }

// // interface RowActionsProps {
// //   entityType: string;
// //   record: any;
// //   actions: Array<{ name: string; form?: string }>;
// //   accessConfig?: any;
// //   viewConfig?: any;
// //   rawData?: any[];
// //   config?: any;
// // }

// // // Cache for lazy-loaded components
// // const componentCache = new Map<string, React.ComponentType>();

// // const RowActions: React.FC<RowActionsProps> = ({
// //   entityType,
// //   record,
// //   actions,
// //   accessConfig,
// //   viewConfig,
// //   rawData,
// //   config,
// // }) => {
// //   const [contextId, setContextId] = useState<string | null>(null);
// //   const { openContext, closeContext, contextStack } = useNestedContext();
// //   const { organization, user, location, permissions } = useAuthStore();
// //   const queryClient = useQueryClient();
// //   const [isDrawerVisible, setIsDrawerVisible] = useState(false);
// //   const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
// //   const [deleteRecord, setDeleteRecord] = useState<any | null>(null);
// //   const [formName, setFormName] = useState<string | null>(null);
// //   const [currentAction, setCurrentAction] = useState<'Edit' | 'Clone' | null>(null);
// //   const [enhancedRecord, setEnhancedRecord] = useState(record);
// //   const path = useLocation();

// //   const { data: formConfig } = useFormConfig(formName || '');

// //   const hasAccess = (action: string) => {
// //     if (!accessConfig?.[action]) return true;
// //     const { roles = [], users = [] } = accessConfig[action];
// //     return users.includes(user?.id || '') || roles.includes(user?.role || '');
// //   };

// //   const handleDetails = () => {
// //     setIsDetailsDrawerVisible(true);
// //     const newContextId = openContext({ config, viewConfig, editItem: record });
// //     setContextId(newContextId);
// //   };

// //   const handleDrawerClose = () => {
// //     setIsDetailsDrawerVisible(false);
// //     if (contextId) {
// //       closeContext(contextId);
// //       setContextId(null);
// //     }
// //   };

// //   const filteredActions = (actions || []).filter((action) => {
// //     if (action.name === 'Edit') return hasAccess('edit');
// //     if (action.name === 'Delete') return hasAccess('delete');
// //     if (action.name === 'Clone') return hasAccess('edit');

// //     // --- CHANGE START: Adjust the nesting depth check ---
// //     // REASON: We are changing the rule to allow nesting up to 2 levels deep.
// //     // The "Details" button should only be hidden when the context stack already has 2 or more items.
// //     // contextStack.length === 0 -> Top level (Level 0)
// //     // contextStack.length === 1 -> First drawer (Level 1)
// //     // contextStack.length === 2 -> Second drawer (Level 2), hide the button here.
// //     if (action.name === 'Details') {
// //       if (contextStack.length >= 2) {
// //         return false;
// //       }
// //       return (
// //         hasAccess('details') &&
// //         viewConfig?.detailview &&
// //         Object.keys(viewConfig.detailview).length > 0
// //       );
// //     }
// //     // --- CHANGE END ---
    
// //     // Note: The original logic didn't have a default, so we match that behavior.
// //     // Any action name not explicitly handled above will be filtered out.
// //     return false;
// //   });

// //   // ... The rest of your component's logic and JSX remains unchanged ...
// //   // (handleEdit, handleClone, mutations, etc.)

// //   return (
// //     <>
// //       <Space>
// //         {/*
// //           // --- CONCEPTUAL ENHANCEMENT (Future Implementation) ---
// //           //
// //           // GOAL: Make action handling more data-driven and flexible, removing the need for
// //           //       the hardcoded `if (action.name === '...')` checks below.
// //           //
// //           // PROPOSED ACTION CONFIGURATION (in a config file like viewConfig.json):
// //           // "actions": [
// //           //   {
// //           //     "name": "Edit",
// //           //     "type": "drawer", // Predefined types: 'drawer', 'modal', 'nestedDrawer', 'customComponent'
// //           //     "icon": "Edit2", // Icon from a library like lucide-react
// //           //     "permissions": "edit", // Corresponds to accessConfig key
// //           //     "config": {
// //           //       "formName": "user_edit_form",
// //           //       "drawerTitle": "Edit User",
// //           //       "drawerWidth": "50%"
// //           //     }
// //           //   },
// //           //   {
// //           //     "name": "Delete",
// //           //     "type": "modal",
// //           //     "icon": "Trash2",
// //           //     "permissions": "delete",
// //           //     "config": {
// //           //       "modalTitle": "Confirm Deletion",
// //           //       "modalContent": "Are you sure you want to delete this record?"
// //           //     }
// //           //   },
// //           //   {
// //           //     "name": "View Details",
// //           //     "type": "nestedDrawer",
// //           //     "icon": "Eye",
// //           //     "permissions": "details"
// //           //   }
// //           // ]
// //           //
// //           // IMPLEMENTATION SKETCH:
// //           // 1. Create a single, generic `handleAction(action)` function.
// //           // 2. This function would use a switch on `action.type` to determine what to do:
// //           //    - case 'drawer': Set state to open a standard drawer with a DynamicForm, using details from `action.config`.
// //           //    - case 'modal': Set state to open a confirmation modal (like the existing delete modal).
// //           //    - case 'nestedDrawer': Call the `handleDetails` function.
// //           // 3. The render logic below would become a simple .map() that creates a Button for each
// //           //    action, dynamically renders the correct icon, and wires its `onClick` to `() => handleAction(action)`.
// //           //    This would replace the entire series of `if` statements with a cleaner, more scalable loop.
// //           //
// //         */}
// //         {filteredActions.map((action) => {
// //           if (action.name === 'Edit' && action.form) {
// //             // This is the current, working implementation
// //             return <Button key="edit" icon={<Edit2 size={16} />} onClick={() => { /* handleEdit(action.form!) */ }} />;
// //           }
// //           if (action.name === 'Delete') {
// //             // This is the current, working implementation
// //             return <Button key="delete" icon={<Trash2 size={16} />} danger onClick={() => setDeleteRecord(record)} />;
// //           }
// //           if (action.name === 'Details') {
// //             // This is the current, working implementation
// //             return <Button key="details" icon={<Eye size={16} />} onClick={handleDetails} />;
// //           }
// //           if (action.name === 'Clone' && action.form) {
// //             // This is the current, working implementation
// //             return <Button key="clone" icon={<Copy size={16} />} onClick={() => { /* handleClone(action.form!) */ }} />;
// //           }
// //           return null;
// //         })}
// //       </Space>

// //       {/* Edit/Clone Drawer */}
// //       <Drawer
// //         title={`...`}
// //         open={isDrawerVisible}
// //         onClose={() => setIsDrawerVisible(false)}
// //         width={window.innerWidth <= 768 ? '100%' : '50%'}
// //       >
// //         {/* ... DynamicForm or Custom Component ... */}
// //       </Drawer>

// //       {/* Details Drawer */}
// //       <Drawer
// //         title={`${(record?.name || entityType)} Details`}
// //         open={isDetailsDrawerVisible}
// //         onClose={handleDrawerClose}
// //         width={window.innerWidth <= 768 ? '100%' : '70%'}
// //       >
// //         <DetailsView
// //           config={config}
// //           entityType={entityType}
// //           viewConfig={viewConfig}
// //           editItem={record}
// //           rawData={rawData}
// //         />
// //       </Drawer>
      
// //       {/* Delete Confirmation Modal (example) */}
// //       <Modal
// //         title="Confirm Deletion"
// //         open={!!deleteRecord}
// //         onOk={() => { /* Handle delete mutation */ setDeleteRecord(null); }}
// //         onCancel={() => setDeleteRecord(null)}
// //       >
// //         <p>Are you sure you want to delete this record?</p>
// //       </Modal>

// //       {/* Mobile Delete ActionSheet would go here if needed */}
// //     </>
// //   );
// // };

// // export default RowActions;
