// import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
// import { Space, Radio, Card, message, Tooltip, Typography, Dropdown, Button, Pagination } from 'antd'; // Add Pagination
// import {
//   TableOutlined,
//   AppstoreOutlined,
//   InsertRowAboveOutlined,
//   CalendarOutlined,
//   ProjectOutlined,
//   InfoCircleOutlined,
//   EnvironmentOutlined,
//   DashboardOutlined,
//   MenuOutlined, // Add MenuOutlined for the mobile view button
// } from '@ant-design/icons';
// import { useQuery } from '@tanstack/react-query';
// import { supabase } from '../../lib/supabase';
// import { useAuthStore } from '@/core/lib/store';
// import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
// import { useViewState } from './hooks/useViewState';
// import { loadView, type ViewType } from './registry';
// import dayjs from 'dayjs';
// import GlobalActions from './GlobalActions';
// import GlobalFilters from './GlobalFilters';
// import { useViewConfigEnhanced } from './hooks/useEntityConfig';
// import ImportExportComponent from './ImportExport';
// import { snakeToTitleCase } from '@/core/components/common/utils/casing';
// import MetricsView from './MetricsView';
// import DetailOverview from '@/components/common/details/DetailOverview';
// import { useLocation } from 'react-router-dom';
// import { isLocationPartition } from '@/core/components/common/utils/partitionPermissions';
// import { useNestedContext } from '../../lib/NestedContext';
// import { useDeviceType } from '@/utils/deviceTypeStore';
// import { ZeroStateContent } from './ZeroStateContent';

// /**
//  * @interface DynamicViewsProps
//  * @description Defines the props for the highly configurable DynamicViews component.
//  */
// interface DynamicViewsProps {
//   /** The unique name of the entity to display (e.g., 'tickets', 'users'). */
//   entityType: string;
//   /** The database schema the entity belongs to. Defaults to 'public'. */
//   entitySchema?: string;
//   /** The name of the form to use for creating/editing entities. */
//   formName?: string;
//   /** Configuration for tabs if the view is tabbed. */
//   tabOptions?: Array<{
//     key: string;
//     label: string;
//     condition?: {
//       field: string;
//       value: any;
//       filter_type?: string;
//       valueFromContext?: string;
//       join_table?: string;
//     };
//     hiddenFields?: string[];
//   }>;
//   defaultFilters?: Record<string, any>;
//   searchConfig?: {
//     serverSideFilters: string[];
//     noDataMessage: string;
//     searchButton: React.ReactNode;
//   };
//   /** The schema configuration for forms. */
//   schema?: any;
//   /** A flag for enabling testing configurations. */
//   testing?: boolean;
//   /** A flag indicating if this view is nested inside another component (e.g., a drawer). */
//   detailView?: boolean;
//   /**
//    * The data record of the parent view.
//    * This is crucial for nested views to filter their data based on the parent's context
//    * (e.g., showing orders for a specific customer).
//    */
//   parentRecord?: Record<string, any>;
// }

// /**
//  * @component DynamicViews
//  * @description A powerful, configuration-driven component that can render data in various formats
//  * like tables, grids, calendars, etc. It handles data fetching, filtering, pagination, tabbing,
//  * and state persistence.
//  */
// const DynamicViews: React.FC<DynamicViewsProps> = ({
//   entityType,
//   entitySchema = 'public',
//   formName,
//   tabOptions = [],
//   defaultFilters: propDefaultFilters = {},
//   searchConfig,
//   schema,
//   testing = false,
//   detailView = false,
//   parentRecord,
// }) => {
//   // --- Aliases and Hooks Setup ---
//   const parentEditItem = parentRecord;
//   const { contextStack } = useNestedContext();
//   const isTopLevel = contextStack?.length === 0;
//   const viewContextKey = isTopLevel ? entityType : `${entityType}-${parentRecord?.id || 'new'}`;

//   const deviceType = useDeviceType();
//   const isDesktop = deviceType === 'desktop';

//   const viewOptions = [
//     { value: 'tableview', label: 'Table', icon: <TableOutlined /> },
//     { value: 'gridview', label: 'Grid', icon: <AppstoreOutlined /> },
//     { value: 'kanbanview', label: 'Kanban', icon: <InsertRowAboveOutlined /> },
//     { value: 'calendarview', label: 'Calendar', icon: <CalendarOutlined /> },
//     { value: 'ganttview', label: 'Gantt', icon: <ProjectOutlined /> },
//     { value: 'mapview', label: 'Map', icon: <EnvironmentOutlined /> },
//     { value: 'dashboardview', label: 'Dashboard', icon: <DashboardOutlined /> },
//   ];

//   const printRef = useRef<HTMLDivElement>(null);
//   const displayedMessages = useRef<Set<string>>(new Set());

//   const { user,organization, location, viewPreferences, setViewPreferences, permissions, resetViewPreferences } = useAuthStore();
//   const { setConfig } = useAuthedLayoutConfig();
//   const path = useLocation();

//   const handleClearFilters = () => {
//     // 1. Reset the persistent state first (clears the filters in the store)
//     resetViewPreferences(entityType);

//     // 2. Compute the new initial filters (which will now correctly exclude the old saved filters)
//     // We only want the *propDefaultFilters* and *config* defaults to remain.
//     const newInitialFilters = {
//         ...propDefaultFilters,
//         ...customFilters.reduce((acc, field) => {
//             if (field.defaultValue) {
//                 acc[field.name] = field.defaultValue;
//             }
//             return acc;
//         }, {}),
//     };

//     // 3. Update the local state
//     setFilterValues(newInitialFilters);

//     // 4. Reset pagination to the first page
//     setPagination((prev) => ({ ...prev, current: 1 }));
// };

//   // Correctly destructure the two objects from the hook's returned data
//   const { data, isLoading: isConfigLoading, error: configError } = useViewConfigEnhanced(
//     entityType,
//     entitySchema,
//     testing
//   );
//   const config = data?.config;
//   const viewConfig = data?.viewConfig;

//   const availableViews = config?.available_views || ['tableview'];
//   const defaultView = config?.default_view || 'tableview';
//   const customFilters: any[] = viewConfig?.general?.filters || [];

//   const showMessageOnce = (key: string, content: string) => {
//     if (!displayedMessages.current.has(key)) {
//       message.error(content, 5);
//       displayedMessages.current.add(key);
//     }
//   };

//   useEffect(() => {
//     if (configError) {
//       showMessageOnce('config-error', `Unable to load settings for ${snakeToTitleCase(entityType)}.`);
//     }
//   }, [configError, entityType]);

//   // --- State Management ---
//   const [currentTab, setCurrentTab] = useState(() => {
//     const preferredTab = viewPreferences[entityType]?.currentTab;
//     return tabOptions.some((tab) => tab.key === preferredTab) ? preferredTab : tabOptions[0]?.key || '1';
//   });

//   const [pagination, setPagination] = useState({
//     current: viewPreferences[entityType]?.tabs?.[currentTab]?.currentPage || 1,
//     pageSize: viewPreferences[entityType]?.pageSize || 10,
//     total: 0,
//   });

//   /**
//    * @dev-note CRITICAL FIX: The filter state is now initialized in a single, reliable location.
//    * This prevents race conditions and eliminates the need for complex, bug-prone `useEffect`
//    * hooks that attempted to re-synchronize the state.
//    */
//   const [filterValues, setFilterValues] = useState<Record<string, any>>(() => {
//     const filtersFromProps = { ...propDefaultFilters };
//     if (detailView && parentEditItem) {
//       const currentTabOption = tabOptions.find((t) => t.key === currentTab);
//       if (currentTabOption?.condition?.valueFromContext) {
//         filtersFromProps[currentTabOption.condition.field] =
//           parentEditItem[currentTabOption.condition.valueFromContext];
//       }
//     }
//     const filtersFromConfig = customFilters.reduce((acc, field) => {
//       if (field.defaultValue) {
//         acc[field.name] = field.defaultValue;
//       }
//       return acc;
//     }, {});
//     return {
//       ...filtersFromProps,
//       ...viewPreferences[entityType]?.filters,
//       ...filtersFromConfig,
//     };
//   });

//   const topLevelViews = ['tableview', 'gridview'];
//   const restrictedViews = ['kanbanview', 'ganttview', 'calendarview', 'mapview', 'dashboardview'];
//   const filteredAvailableViews = useMemo(() => {
//     if (isTopLevel) {
//       return availableViews;
//     }
//     return availableViews.filter((view) => !restrictedViews.includes(view));
//   }, [availableViews, isTopLevel]);

//   const { viewType = defaultView, setViewType } = useViewState(entityType, defaultView as ViewType, filteredAvailableViews as ViewType[], viewContextKey);

//   const ViewComponent = useMemo(() => {
//     if (!viewType || !filteredAvailableViews.includes(viewType)) {
//       return loadView('tableview');
//     }
//     return loadView(viewType);
//   }, [viewType, filteredAvailableViews]);

//   // --- Column Visibility State ---
//   const initialVisibleColumns = useMemo(() => {
//     if (viewConfig?.tableview?.fields) {
//       return viewConfig.tableview.fields.map(field => field.fieldPath);
//     }
//     return [];
//   }, [viewConfig]);

//   const [visibleColumns, setVisibleColumns] = useState<string[]>(initialVisibleColumns);

//   useEffect(() => {
//     setVisibleColumns(initialVisibleColumns);
//   }, [initialVisibleColumns]);

//   // Memoize all available columns from metadata
//   const allDisplayableColumns = useMemo(() => {
//     if (!viewConfig?.metadata) return [];
//     return viewConfig.metadata
//       .filter(field => field.is_displayable)
//       .map(field => {
//         const fieldPath = field.foreign_key ? `${field.key}_${field.foreign_key.display_column}` : field.key;
//         return {
//           fieldName: field.display_name,
//           fieldPath: fieldPath,
//         };
//       });
//   }, [viewConfig?.metadata]);

//   const { data: tableData, isLoading: isDataLoading } = useQuery({
//     queryKey: [entityType, organization?.id, location, JSON.stringify(filterValues), pagination.current, pagination.pageSize, currentTab, parentEditItem?.id, viewConfig],
//     queryFn: async () => {
//       if (!organization?.id) return { data: [], total: 0 };
//       if (detailView && !parentEditItem) return { data: [], total: 0 };

//       const filters = [];

//       const allFilters = { ...propDefaultFilters, ...filterValues };
//       for (const key in allFilters) {
//         const value = allFilters[key];
//         if (value === null || value === undefined || key === 'sorter' || key === 'search') continue;

//         const customFieldConfig = customFilters.find(f => f.name === key);
//         const filterType = customFieldConfig?.type || 'eq';
//         const joinTable = customFieldConfig?.join_table;

//         if (filterType === 'date-range' && Array.isArray(value) && value[0] && value[1]) {
//           filters.push({
//             column: key,
//             operator: 'BETWEEN',
//             value: [dayjs(value[0]).startOf('day').format('YYYY-MM-DD'), dayjs(value[1]).endOf('day').format('YYYY-MM-DD')],
//           });
//         } else if (Array.isArray(value)) {
//           filters.push({
//             column: key,
//             operator: 'IN',
//             value: value,
//             ...(joinTable && { join_table: joinTable }),
//           });
//         } else {
//           filters.push({
//             column: key,
//             operator: filterType === 'text' ? 'ILIKE' : '=',
//             value: value,
//             ...(joinTable && { join_table: joinTable }),
//           });
//         }
//       }

//       const currentTabOption = tabOptions.find((tab) => tab.key === currentTab);
//       if (currentTabOption?.condition) {
//         const condition = currentTabOption.condition;
//         const filterValue = condition.valueFromContext
//           ? parentEditItem?.[condition.valueFromContext]
//           : condition.value;

//         if (filterValue !== null && filterValue !== undefined) {
//           filters.push({
//             column: condition.field,
//             operator: condition.filter_type || '=',
//             value: filterValue,
//             ...(condition.join_table && { join_table: condition.join_table }),
//           });
//         }
//       }

//       let search = null;
//       if (filterValues.search) {
//         const searchFilterConfig = customFilters.find((field) => field.name === 'search');
//         search = {
//           value: filterValues.search,
//           columns: searchFilterConfig?.search_columns || ['name'],
//         };
//       }

//       let locationId = undefined;
//       if (location?.id && isLocationPartition(permissions, path?.pathname)) {
//         locationId = location.id;
//       }
//       const tabRpcOverrides = currentTabOption?.queryConfig || {};
//       const rpcConfig = {
//         is_pending_approval_view: false,
//     manager_id: user?.id, 
//     current_time: new Date(),
//     ...tabRpcOverrides,
//         entity_schema: entitySchema,
//         // entity_name: (viewConfig?.v_metadata? "v_":"")+entityType,
//         entity_name: entityType,
//         organization_id: organization.id,
//         sorting: {
//           column: filterValues.sorter?.field || 'updated_at',
//           direction: filterValues.sorter?.order === 'ascend' ? 'ASC' : 'DESC',
//         },
//         pagination: {
//           limit: pagination.pageSize,
//           offset: (pagination.current - 1) * pagination.pageSize,
//         },
//         filters,
//         search, //TODO: Re-enable full search later
//         location_id: locationId,
//         metadata: viewConfig?.v_metadata || viewConfig?.metadata, // TODO:RAVi REVISIT
//         // metadata: viewConfig?.metadata, // Correctly use the specific viewConfig object
//         // include_jsonb:["details"],
//         include_jsonb:true,
//         mode:'fast'
//       };
//       // const { data, error } = await supabase.schema('core').rpc('core_get_entity_data_metadata_v13', {
//       const { data, error } = await supabase.schema('core').rpc('core_get_entity_data_v30', {
//       // const { data, error } = await supabase.schema('core').rpc('core_get_entity_data_details', {
//         config: rpcConfig,
//       });

//       console.log("Payload-Response", rpcConfig,data);
//       if (error || data?.error) {
//         const errorMessage = error?.message || data?.error;
//         message.error(`Error fetching data: ${errorMessage} - Check Metadata or Filters`);
//         throw new Error(errorMessage);
//       }

//       return {
//         data: data?.data || [],
//         total: data?.total_count || 0,
//       };
//     },
//     // onSettled: (result) => {
//     //   setPagination((prev) => ({ ...prev, total: result.total }));
//     // },
//     enabled: !!organization?.id && !!viewConfig && !!config && (!detailView || (detailView && !!parentEditItem)),
//     keepPreviousData: true,
//     staleTime: 0,//1000 * 60,
//     cacheTime: 0//1000 * 60 * 5,
//   });

//   useEffect(() => {
//   if (tableData) {
//     console.log("v17 data", tableData);
//     setPagination((prev) => ({ ...prev, total: tableData.total }));
//   }
// }, [tableData]);

//   const entities = tableData?.data || [];

//   // --- Memoized Elements and Final Effects ---
//   const initialFilters = useMemo(() => ({
//     ...propDefaultFilters,
//     ...viewPreferences[entityType]?.filters,
//     ...customFilters.reduce((acc, field) => {
//       if (field.defaultValue) {
//         acc[field.name] = field.defaultValue;
//       }
//       return acc;
//     }, {}),
//   }), [propDefaultFilters, viewPreferences, customFilters, entityType]);
// console.log("zc",initialFilters,viewPreferences[entityType]?.filters);
//   const globalFiltersElement = useMemo(() => (
//     <GlobalFilters
//     entities={entities}
//       entityType={entityType}
//       entitySchema={entitySchema}
//       defaultFilters={propDefaultFilters}
//       searchConfig={searchConfig}
//       initialFilters={initialFilters}
//       onFilterChange={setFilterValues}
//       onSearch={() => {
//         setPagination((prev) => ({ ...prev, current: 1 }));
//       }}
//       allDisplayableColumns={allDisplayableColumns}
//       visibleColumns={visibleColumns}
//       setVisibleColumns={setVisibleColumns}
//     />
//   ), [tableData,entityType, JSON.stringify(propDefaultFilters), searchConfig, JSON.stringify(initialFilters), allDisplayableColumns, visibleColumns,filterValues]);

//   useEffect(() => {
//     if (detailView) return;
//     setConfig({ searchFilters: globalFiltersElement });
//     return () => setConfig({ searchFilters: undefined });
//   }, [detailView, setConfig, globalFiltersElement]);

//   useEffect(() => {
//     const preferencesToSave = {
//       viewType,
//       currentTab,
//       filters: filterValues,
//       pageSize: pagination.pageSize,
//       tabs: {
//         ...(viewPreferences[viewContextKey]?.tabs || {}),
//         [currentTab]: { currentPage: pagination.current },
//       },
//     };
//     setViewPreferences(viewContextKey, preferencesToSave);
//   }, [viewType, currentTab, filterValues, pagination.pageSize, pagination.current]);

//   // const handleTableChange = (newPagination: any, filters: any, sorter: any) => {
//   //   console.log("vzz",newPagination,filters,sorter,filterValues);
//   //   setPagination(newPagination);
//   //   setFilterValues((prev) => ({
//   //     ...prev,
//   //     sorter: sorter.field ? { field: sorter.field, order: sorter.order } : null,
//   //   }));
//   // };

//   const handleTableChange = (newPagination, filters, sorter) => {
//     if (sorter.field && sorter.field.endsWith('_id_name')) {
//       console.log("Ignoring sort for display field:", sorter.field);
//       return; // Exit the function to prevent state update.
//     }
//   setPagination(newPagination);

//   // Check if the sorted field exists and ends with '_id_name'.
//   // If it does, we don't update the sorter in filterValues.

//   // If the field is a standard one, update the sorter in filterValues.
//   setFilterValues((prev) => ({
//     ...prev,
//     sorter: sorter.field ? { field: sorter.field, order: sorter.order } : null,
//   }));
// };

//   const handleTabChange = (newTab: string) => {
//     setCurrentTab(newTab);
//     const savedPage = viewPreferences[entityType]?.tabs?.[newTab]?.currentPage || 1;
//     setPagination((prev) => ({ ...prev, current: savedPage }));
//   };

//   const handlePaginationChange = (page: number, pageSize?: number) => {
//     setPagination((prev) => ({
//       ...prev,
//       current: page,
//       pageSize: pageSize || prev.pageSize,
//     }));
//   };

//   // New function for mobile view cycle
//   const handleViewCycle = () => {
//     const currentIndex = filteredAvailableViews.indexOf(viewType);
//     const nextIndex = (currentIndex + 1) % filteredAvailableViews.length;
//     setViewType(filteredAvailableViews[nextIndex] as ViewType);
//   };

//   if (isConfigLoading) {
//     return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div></div>;
//   }

//   if (!config || !viewConfig) {
//     return <div className="text-center py-8 text-[var(--color-text-secondary)]"><p>No view configuration found for {entityType}</p></div>;
//   }

//   const globalActionsElement = (
//     <GlobalActions
//       entityType={entityType}
//       entitySchema={entitySchema}
//       config={config}
//       viewConfig={viewConfig}
//       parentEditItem={parentEditItem}
//     />
//   );

//   if (detailView) {
//     return (
//       <DetailOverview
//         data={entities[0]}
//         viewConfig={viewConfig}
//         config={config}
//       />
//     );
//   }

//   // Mobile/Desktop Conditional Rendering
//   const isMobile = !isDesktop;

//   const renderTabs = () => {
//     if (tabOptions.length <= 1) {
//       return (
//         <Typography.Title level={4} className="m-0">
//           {config?.details?.name}
//           {config?.details?.description && (
//             <Tooltip title={config?.details?.description}>
//               <InfoCircleOutlined className="ml-2" />
//             </Tooltip>
//           )}
//         </Typography.Title>
//       );
//     }

//     // Mobile: Dropdown for tabs
//     if (isMobile) {
//       const menuItems = tabOptions.map(tab => ({
//         key: tab.key,
//         label: tab.label,
//         onClick: () => handleTabChange(tab.key),
//       }));

//       return (
//         <Dropdown menu={{ items: menuItems }} trigger={['click']}>
//           <Button>
//             {tabOptions.find(tab => tab.key === currentTab)?.label} <MenuOutlined />
//           </Button>
//         </Dropdown>
//       );
//     }

//     // Desktop: Space for tabs
//     return (
//       <Space>
//         {tabOptions.map((tab) => (
//           <button
//             key={tab.key}
//             className={`px-4 py-2 rounded-md transition-colors ${
//               currentTab === tab.key
//                 ? 'bg-[var(--color-primary)] text-white'
//                 : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
//             }`}
//             onClick={() => handleTabChange(tab.key)}
//           >
//             {tab.label}
//           </button>
//         ))}
//       </Space>
//     );
//   };

//   const renderViewSelector = () => {
//     if (!!isTopLevel && filteredAvailableViews.length > 1) {
//       // Mobile: Single button for cycling views
//       if (isMobile) {
//         const currentView = viewOptions.find(opt => opt.value === viewType);
//         return (
//           <>
//           {/* <Tooltip title={`Change View: ${currentView?.label || 'View'}`}> */}
//             <Button
//               onClick={handleViewCycle}
//               icon={currentView?.icon || <TableOutlined />}
//             />
//           {/* </Tooltip> */}
//           </>
//         );
//       }

//       // Desktop: Radio Group for selecting views
//       return (
//         <Radio.Group
//           value={viewType}
//           onChange={(e) => setViewType(e.target.value as ViewType)}
//           buttonStyle="solid"
//         >
//           {viewOptions.map((option) =>
//             filteredAvailableViews.includes(option.value) && (
//               <Radio.Button key={option.value} value={option.value} title={option.label}>
//                 <span>{option.icon}</span>
//               </Radio.Button>
//             )
//           )}
//         </Radio.Group>
//       );
//     }
//     return null;
//   };

//   const showPagination = pagination.total > pagination.pageSize;

//   return (
//     <div className={!detailView ? 'space-y-4' : ''}>
//       <Card variant={parentEditItem ? 'outlined' : 'borderless'} className={detailView ? 'p-0' : ''} styles={{ body: { padding: isMobile ? 10:'' } }}>
//         {!detailView && (
//           <div className="flex justify-between items-center mb-2">
//             {renderTabs()}

//             { (
//               <Space>
//                 {/* <MetricsView entityType={entityType} entitySchema={entitySchema} viewConfig={viewConfig} /> */}
//                 {/* <GlobalActions
//                   entityType={entityType}
//                   entitySchema={entitySchema}
//                   config={config}
//                   viewConfig={viewConfig}
//                   parentEditItem={parentEditItem}
//                 /> */}
//                 {globalActionsElement}
//                 {renderViewSelector()}
//                 <ImportExportComponent
//                   entityType={entityType}
//                   entitySchema={entitySchema}
//                   viewConfig={viewConfig}
//                   data={entities}
//                   printRef={printRef}
//                   config={config}
//                   visibleColumns={visibleColumns}
//                 />
//               </Space>
//             )}
//           </div>
//         )}

//         <Suspense
//           fallback={
//             <div className="flex justify-center items-center h-64">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
//             </div>
//           }
//         >
//           <div ref={printRef}>
//             {entities.length === 0 && !isDataLoading ? (
//               <ZeroStateContent
//                 entityName={config?.details?.name}
//                 globalFiltersElement={isTopLevel && isDesktop ? globalFiltersElement : null}
//                 globalActionsElement={globalActionsElement}
//                 searchConfig={searchConfig}
//                 hasActiveFilters={Object.keys(filterValues).some(
//                   (key) =>
//                     filterValues[key] !== undefined &&
//                     filterValues[key] !== null &&
//                     (Array.isArray(filterValues[key])
//                       ? filterValues[key].length > 0
//                       : true)
//                 )}
//                 clearFilters={handleClearFilters}
//               />
//             ) : (
//               <>
//                 {!!isTopLevel && isDesktop && globalFiltersElement}
//                 <ViewComponent
//                   entityType={entityType}
//                   entitySchema={entitySchema}
//                   viewConfig={viewConfig}
//                   config={config}
//                   formConfig={schema}
//                   data={entities}
//                   filterValues={filterValues}
//                   pagination={pagination}
//                   onTableChange={handleTableChange}
//                   isLoading={isDataLoading}
//                   currentTab={currentTab}
//                   tabOptions={tabOptions}
//                   allDisplayableColumns={allDisplayableColumns}
//                   visibleColumns={visibleColumns}
//                 />
//                 {showPagination && (
//                   <div className="mt-4 flex justify-end">
//                     <Pagination
//                       current={pagination.current}
//                       pageSize={pagination.pageSize}
//                       total={pagination.total}
//                       showSizeChanger
//                       onChange={handlePaginationChange}
//                       onShowSizeChange={handlePaginationChange}
//                     />
//                   </div>
//                 )}
//               </>
//             )}
//           </div>
//         </Suspense>
//       </Card>
//     </div>
//   );
// };

// export default DynamicViews;


import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { Space, Radio, Card, message, Tooltip, Typography, Dropdown, Button, Pagination } from 'antd';
import {
  TableOutlined,
  AppstoreOutlined,
  InsertRowAboveOutlined,
  CalendarOutlined,
  ProjectOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  DashboardOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
import { useViewState } from './hooks/useViewState';
import { loadView, type ViewType } from './registry';
import dayjs from 'dayjs';
import GlobalActions from './GlobalActions';
import GlobalFilters from './GlobalFilters';
import { useViewConfigEnhanced } from './hooks/useEntityConfig';
import ImportExportComponent from './ImportExport';
import { snakeToTitleCase } from '@/core/components/common/utils/casing';
import MetricsView from './MetricsView';
import DetailOverview from '@/core/components/details/DetailOverview';
import { isLocationPartition } from '@/core/components/common/utils/partitionPermissions';
import { useNestedContext } from '../../lib/NestedContext';
import { useDeviceType } from '@/utils/deviceTypeStore';
import { ZeroStateContent } from './ZeroStateContent';

/**
 * @interface DynamicViewsProps
 * @description Defines the props for the highly configurable DynamicViews component.
 */
interface DynamicViewsProps {
  /** The unique name of the entity to display (e.g., 'tickets', 'users'). */
  entityType: string;
  /** The database schema the entity belongs to. Defaults to 'public'. */
  entitySchema?: string;
  /** The name of the form to use for creating/editing entities. */
  formName?: string;
  /** Configuration for tabs if the view is tabbed. */
  tabOptions?: Array<{
    key: string;
    label: string;
    condition?: {
      field: string;
      value: any;
      filter_type?: string;
      valueFromContext?: string;
      join_table?: string;
    };
    hiddenFields?: string[];
  }>;
  defaultFilters?: Record<string, any>;
  searchConfig?: {
    serverSideFilters: string[];
    noDataMessage: string;
    searchButton: React.ReactNode;
  };
  /** The schema configuration for forms. */
  schema?: any;
  /** A flag for enabling testing configurations. */
  testing?: boolean;
  /** A flag indicating if this view is nested inside another component (e.g., a drawer). */
  detailView?: boolean;
  /**
   * The data record of the parent view.
   * This is crucial for nested views to filter their data based on the parent's context
   * (e.g., showing orders for a specific customer).
   */
  parentRecord?: Record<string, any>;
}

/**
 * @component DynamicViews
 * @description A powerful, configuration-driven component that can render data in various formats
 * like tables, grids, calendars, etc. It handles data fetching, filtering, pagination (cursor-based),
 * tabbing, and state persistence.
 */
const DynamicViews: React.FC<DynamicViewsProps> = ({
  entityType,
  entitySchema = 'public',
  formName,
  tabOptions = [],
  defaultFilters: propDefaultFilters = {},
  searchConfig,
  schema,
  testing = false,
  detailView = false,
  parentRecord,
}) => {
  // --- Aliases and Hooks Setup ---
  const parentEditItem = parentRecord;
  const { contextStack } = useNestedContext();
  const isTopLevel = contextStack?.length === 0;
  const viewContextKey = isTopLevel ? entityType : `${entityType}-${parentRecord?.id || 'new'}`;

  const deviceType = useDeviceType();
  const isDesktop = deviceType === 'desktop';

  const viewOptions = [
    { value: 'tableview', label: 'Table', icon: <TableOutlined /> },
    { value: 'gridview', label: 'Grid', icon: <AppstoreOutlined /> },
    { value: 'kanbanview', label: 'Kanban', icon: <InsertRowAboveOutlined /> },
    { value: 'calendarview', label: 'Calendar', icon: <CalendarOutlined /> },
    { value: 'ganttview', label: 'Gantt', icon: <ProjectOutlined /> },
    { value: 'mapview', label: 'Map', icon: <EnvironmentOutlined /> },
    { value: 'dashboardview', label: 'Dashboard', icon: <DashboardOutlined /> },
  ];

  const printRef = useRef<HTMLDivElement>(null);
  const displayedMessages = useRef<Set<string>>(new Set());

  const { user, organization, location, viewPreferences, setViewPreferences, permissions, resetViewPreferences } = useAuthStore();
  const { setConfig } = useAuthedLayoutConfig();
  const path = useLocation();

  // --- Configuration Query ---
  const { data, isLoading: isConfigLoading, error: configError } = useViewConfigEnhanced(
    entityType,
    entitySchema,
    testing
  );
  const config = data?.config;
  const viewConfig = data?.viewConfig;

  const availableViews = config?.available_views || ['tableview'];
  const defaultView = config?.default_view || 'tableview';
  const customFilters: any[] = viewConfig?.general?.filters || [];

  const showMessageOnce = (key: string, content: string) => {
    if (!displayedMessages.current.has(key)) {
      message.error(content, 5);
      displayedMessages.current.add(key);
    }
  };

  useEffect(() => {
    if (configError) {
      showMessageOnce('config-error', `Unable to load settings for ${snakeToTitleCase(entityType)}.`);
    }
  }, [configError, entityType]);

  // --- State Management ---
  const [currentTab, setCurrentTab] = useState(() => {
    const preferredTab = viewPreferences[entityType]?.currentTab;
    return tabOptions.some((tab) => tab.key === preferredTab) ? preferredTab : tabOptions[0]?.key || '1';
  });

  // --- FILTER STATE ---
  /**
   * @dev-note CRITICAL: Filter state initialized once to prevent race conditions.
   */
  const [filterValues, setFilterValues] = useState<Record<string, any>>(() => {
    const filtersFromProps = { ...propDefaultFilters };
    if (detailView && parentEditItem) {
      const currentTabOption = tabOptions.find((t) => t.key === currentTab);
      if (currentTabOption?.condition?.valueFromContext) {
        filtersFromProps[currentTabOption.condition.field] =
          parentEditItem[currentTabOption.condition.valueFromContext];
      }
    }
    const filtersFromConfig = customFilters.reduce((acc, field) => {
      if (field.defaultValue) {
        acc[field.name] = field.defaultValue;
      }
      return acc;
    }, {});
    return {
      ...filtersFromProps,
      ...viewPreferences[entityType]?.filters,
      ...filtersFromConfig,
    };
  });

  // --- PAGINATION STATE (CURSOR HYBRID) ---
  /**
   * @dev-note CURSOR LOGIC:
   * Instead of simple numbers, we maintain a stack of cursors.
   * Index 0 = Page 1 (No cursor)
   * Index 1 = Page 2 (Cursor returned from Page 1 fetch)
   */
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(viewPreferences[entityType]?.pageSize || 10);
  // We track hasMore to cheat the UI into showing the "Next" arrow
  const [hasMore, setHasMore] = useState(false);

  const handleClearFilters = () => {
    // 1. Reset persistent state
    resetViewPreferences(entityType);

    // 2. Compute new defaults
    const newInitialFilters = {
      ...propDefaultFilters,
      ...customFilters.reduce((acc, field) => {
        if (field.defaultValue) {
          acc[field.name] = field.defaultValue;
        }
        return acc;
      }, {}),
    };

    // 3. Update local state
    setFilterValues(newInitialFilters);

    // 4. Reset Pagination / Cursor Stack
    setCurrentPageIndex(0);
    setCursorStack([null]);
    setHasMore(false);
  };

  const topLevelViews = ['tableview', 'gridview'];
  const restrictedViews = ['kanbanview', 'ganttview', 'calendarview', 'mapview', 'dashboardview'];
  const filteredAvailableViews = useMemo(() => {
    if (isTopLevel) {
      return availableViews;
    }
    return availableViews.filter((view) => !restrictedViews.includes(view));
  }, [availableViews, isTopLevel]);

  const { viewType = defaultView, setViewType } = useViewState(entityType, defaultView as ViewType, filteredAvailableViews as ViewType[], viewContextKey);

  const ViewComponent = useMemo(() => {
    if (!viewType || !filteredAvailableViews.includes(viewType)) {
      return loadView('tableview');
    }
    return loadView(viewType);
  }, [viewType, filteredAvailableViews]);

  // --- Column Visibility ---
  const initialVisibleColumns = useMemo(() => {
    if (viewConfig?.tableview?.fields) {
      return viewConfig.tableview.fields.map(field => field.fieldPath);
    }
    return [];
  }, [viewConfig]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(initialVisibleColumns);

  useEffect(() => {
    setVisibleColumns(initialVisibleColumns);
  }, [initialVisibleColumns]);

  const allDisplayableColumns = useMemo(() => {
    if (!viewConfig?.metadata) return [];
    return viewConfig.metadata
      .filter(field => field.is_displayable)
      .map(field => {
        const fieldPath = field.foreign_key ? `${field.key}_${field.foreign_key.display_column}` : field.key;
        return {
          fieldName: field.display_name,
          fieldPath: fieldPath,
        };
      });
  }, [viewConfig?.metadata]);

  // --- DATA FETCHING (CURSOR BASED) ---
  const { data: tableData, isLoading: isDataLoading } = useQuery({
    // Include currentPageIndex and the specific cursor in the key to trigger refetch on nav
    queryKey: [
      entityType,
      organization?.id,
      location,
      JSON.stringify(filterValues),
      currentPageIndex, // Trigger on page change
      cursorStack[currentPageIndex], // The actual cursor value
      pageSize,
      currentTab,
      parentEditItem?.id,
      viewConfig
    ],
    queryFn: async () => {
      if (!organization?.id) return { data: [], hasMore: false };
      if (detailView && !parentEditItem) return { data: [], hasMore: false };

      const filters = [];

      const allFilters = { ...propDefaultFilters, ...filterValues };
      for (const key in allFilters) {
        const value = allFilters[key];
        if (value === null || value === undefined || key === 'sorter' || key === 'search') continue;

        const customFieldConfig = customFilters.find(f => f.name === key);
        const filterType = customFieldConfig?.type || 'eq';
        const joinTable = customFieldConfig?.join_table;

        if (filterType === 'date-range' && Array.isArray(value) && value[0] && value[1]) {
          filters.push({
            column: key,
            operator: 'BETWEEN',
            value: [dayjs(value[0]).startOf('day').format('YYYY-MM-DD'), dayjs(value[1]).endOf('day').format('YYYY-MM-DD')],
          });
        } else if (Array.isArray(value)) {
          filters.push({
            column: key,
            operator: 'IN',
            value: value,
            ...(joinTable && { join_table: joinTable }),
          });
        } else {
          filters.push({
            column: key,
            operator: filterType === 'text' ? 'ILIKE' : '=',
            value: value,
            ...(joinTable && { join_table: joinTable }),
          });
        }
      }

      const currentTabOption = tabOptions.find((tab) => tab.key === currentTab);
      if (currentTabOption?.condition) {
        const condition = currentTabOption.condition;
        const filterValue = condition.valueFromContext
          ? parentEditItem?.[condition.valueFromContext]
          : condition.value;

        if (filterValue !== null && filterValue !== undefined) {
          filters.push({
            column: condition.field,
            operator: condition.filter_type || '=',
            value: filterValue,
            ...(condition.join_table && { join_table: condition.join_table }),
          });
        }
      }

      let search = null;
      if (filterValues.search) {
        const searchFilterConfig = customFilters.find((field) => field.name === 'search');
        search = {
          value: filterValues.search,
          columns: searchFilterConfig?.search_columns || ['name'],
        };
      }

      let locationId = undefined;
      if (location?.id && isLocationPartition(permissions, path?.pathname)) {
        locationId = location.id;
      }

      const tabRpcOverrides = currentTabOption?.queryConfig || {};

      const rpcConfig = {
        is_pending_approval_view: false,
        manager_id: user?.id,
        current_time: new Date(),
        ...tabRpcOverrides,
        entity_schema: entitySchema,
        entity_name: entityType,
        organization_id: organization.id,
        sorting: {
          column: filterValues.sorter?.field || 'updated_at',
          direction: filterValues.sorter?.order === 'ascend' ? 'ASC' : 'DESC',
        },
        pagination: {
          limit: pageSize,
          // 🚀 CURSOR IMPLEMENTATION: Use the cursor from our stack
          cursor: cursorStack[currentPageIndex] || null
        },
        filters,
        search,
        location_id: locationId,
        metadata: viewConfig?.v_metadata || viewConfig?.metadata,
        include_jsonb: true,
        mode: 'fast'
      };

      // 🚀 UPDATED RPC CALL NAME
      const { data, error } = await supabase.schema('core').rpc('api_fetch_entity_records', {
        config: rpcConfig,
      });

      console.log("Payload-Response", rpcConfig, data);

      if (error || data?.error) {
        const errorMessage = error?.message || data?.error;
        message.error(`Error fetching data: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      // Return structure matches the new v6 cursor logic
      return {
        data: data?.data || [],
        hasMore: data?.hasMore || false,
        nextCursor: data?.nextCursor || null
      };
    },
    enabled: !!organization?.id && !!viewConfig && !!config && (!detailView || (detailView && !!parentEditItem)),
    keepPreviousData: true,
    staleTime: 0, // 1000 * 60,
    cacheTime: 0 // 1000 * 60 * 5,
  });

  // --- Update Pagination State from Data ---
  useEffect(() => {
    if (tableData) {
      setHasMore(tableData.hasMore);
    }
  }, [tableData]);

  const entities = tableData?.data || [];

  // --- Global Filters ---
  const initialFilters = useMemo(() => ({
    ...propDefaultFilters,
    ...viewPreferences[entityType]?.filters,
    ...customFilters.reduce((acc, field) => {
      if (field.defaultValue) {
        acc[field.name] = field.defaultValue;
      }
      return acc;
    }, {}),
  }), [propDefaultFilters, viewPreferences, customFilters, entityType]);

  const globalFiltersElement = useMemo(() => (
    <GlobalFilters
      entities={entities}
      entityType={entityType}
      entitySchema={entitySchema}
      defaultFilters={propDefaultFilters}
      searchConfig={searchConfig}
      initialFilters={initialFilters}
      onFilterChange={(newFilters) => {
        setFilterValues(newFilters);
        // Reset to first page on filter change
        setCurrentPageIndex(0);
        setCursorStack([null]);
      }}
      onSearch={() => {
        setCurrentPageIndex(0);
        setCursorStack([null]);
      }}
      allDisplayableColumns={allDisplayableColumns}
      visibleColumns={visibleColumns}
      setVisibleColumns={setVisibleColumns}
    />
  ), [tableData, entityType, JSON.stringify(propDefaultFilters), searchConfig, JSON.stringify(initialFilters), allDisplayableColumns, visibleColumns, filterValues]);

  useEffect(() => {
    if (detailView) return;
    setConfig({ searchFilters: globalFiltersElement });
    return () => setConfig({ searchFilters: undefined });
  }, [detailView, setConfig, globalFiltersElement]);

  useEffect(() => {
    const preferencesToSave = {
      viewType,
      currentTab,
      filters: filterValues,
      pageSize: pageSize,
      tabs: {
        ...(viewPreferences[viewContextKey]?.tabs || {}),
        [currentTab]: { currentPage: currentPageIndex + 1 }, // Store as human readable 1-based
      },
    };
    setViewPreferences(viewContextKey, preferencesToSave);
  }, [viewType, currentTab, filterValues, pageSize, currentPageIndex]);

  // --- Handlers ---

  const handleTableChange = (newPagination, filters, sorter) => {
    if (sorter.field && sorter.field.endsWith('_id_name')) {
      console.log("Ignoring sort for display field:", sorter.field);
      return;
    }

    // Sort change resets pagination to start
    setFilterValues((prev) => ({
      ...prev,
      sorter: sorter.field ? { field: sorter.field, order: sorter.order } : null,
    }));
    setCurrentPageIndex(0);
    setCursorStack([null]);
  };

  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    // Reset or load saved page logic could go here, but for cursor simplicity
    // we often reset to page 1 on tab change unless we store cursor stacks per tab.
    // For now, resetting to fresh start is safest with cursors.
    setCurrentPageIndex(0);
    setCursorStack([null]);
  };

  /**
   * @dev-note PAGINATION HANDLER (CURSOR HYBRID)
   * Manages the cursor stack. 
   * - Going Forward: Pushes `nextCursor` from the previous fetch into the stack.
   * - Going Back: Just decrements the index (cursor already in stack).
   */
  const handlePaginationChange = (page: number, newPageSize?: number) => {
    // Handle Page Size Change
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPageIndex(0);
      setCursorStack([null]);
      return;
    }

    // Handle Navigation
    const targetIndex = page - 1; // Convert 1-based UI to 0-based index

    if (targetIndex > currentPageIndex) {
      // NEXT Clicked
      const nextCursor = tableData?.nextCursor;
      if (nextCursor) {
        setCursorStack(prev => {
          const newStack = [...prev];
          // Ensure we don't create holes if user clicks fast, though simple mode prevents jump
          newStack[targetIndex] = nextCursor;
          return newStack;
        });
        setCurrentPageIndex(targetIndex);
      }
    } else if (targetIndex < currentPageIndex) {
      // PREV Clicked (Cursor already exists in stack at targetIndex)
      setCurrentPageIndex(targetIndex);
    }
  };

  // New function for mobile view cycle
  const handleViewCycle = () => {
    const currentIndex = filteredAvailableViews.indexOf(viewType);
    const nextIndex = (currentIndex + 1) % filteredAvailableViews.length;
    setViewType(filteredAvailableViews[nextIndex] as ViewType);
  };

  if (isConfigLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div></div>;
  }

  if (!config || !viewConfig) {
    return <div className="text-center py-8 text-[var(--color-text-secondary)]"><p>No view configuration found for {entityType}</p></div>;
  }

  const globalActionsElement = (
    <GlobalActions
      entityType={entityType}
      entitySchema={entitySchema}
      config={config}
      viewConfig={viewConfig}
      parentEditItem={parentEditItem}
    />
  );

  if (detailView) {
    return (
      <DetailOverview
        data={entities[0]}
        viewConfig={viewConfig}
        config={config}
      />
    );
  }

  // Mobile/Desktop Conditional Rendering
  const isMobile = !isDesktop;

  const renderTabs = () => {
    if (tabOptions.length <= 1) {
      return (
        <Typography.Title level={4} className="m-0">
          {config?.details?.name}
          {config?.details?.description && (
            <Tooltip title={config?.details?.description}>
              <InfoCircleOutlined className="ml-2" />
            </Tooltip>
          )}
        </Typography.Title>
      );
    }

    if (isMobile) {
      const menuItems = tabOptions.map(tab => ({
        key: tab.key,
        label: tab.label,
        onClick: () => handleTabChange(tab.key),
      }));

      return (
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button>
            {tabOptions.find(tab => tab.key === currentTab)?.label} <MenuOutlined />
          </Button>
        </Dropdown>
      );
    }

    return (
      <Space>
        {tabOptions.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded-md transition-colors ${currentTab === tab.key
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </Space>
    );
  };

  const renderViewSelector = () => {
    if (!!isTopLevel && filteredAvailableViews.length > 1) {
      if (isMobile) {
        const currentView = viewOptions.find(opt => opt.value === viewType);
        return (
          <Button
            onClick={handleViewCycle}
            icon={currentView?.icon || <TableOutlined />}
          />
        );
      }

      return (
        <Radio.Group
          value={viewType}
          onChange={(e) => setViewType(e.target.value as ViewType)}
          buttonStyle="solid"
        >
          {viewOptions.map((option) =>
            filteredAvailableViews.includes(option.value) && (
              <Radio.Button key={option.value} value={option.value} title={option.label}>
                <span>{option.icon}</span>
              </Radio.Button>
            )
          )}
        </Radio.Group>
      );
    }
    return null;
  };

  // Logic to show/hide pagination
  // If we have more data OR we are past page 1, show pagination
  const showPagination = hasMore || currentPageIndex > 0;

  return (
    <div className={!detailView ? 'space-y-4' : ''}>
      <Card variant={parentEditItem ? 'outlined' : 'borderless'} className={detailView ? 'p-0' : ''} styles={{ body: { padding: isMobile ? 10 : '' } }}>
        {!detailView && (
          <div className="flex justify-between items-center mb-2">
            {renderTabs()}
            {(
              <Space>
                {globalActionsElement}
                {renderViewSelector()}
                <ImportExportComponent
                  entityType={entityType}
                  entitySchema={entitySchema}
                  viewConfig={viewConfig}
                  data={entities}
                  printRef={printRef}
                  config={config}
                  visibleColumns={visibleColumns}
                />
              </Space>
            )}
          </div>
        )}

        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          }
        >
          <div ref={printRef}>
            {entities.length === 0 && !isDataLoading && currentPageIndex === 0 ? (
              <ZeroStateContent
                entityName={config?.details?.name}
                globalFiltersElement={isTopLevel && isDesktop ? globalFiltersElement : null}
                globalActionsElement={globalActionsElement}
                searchConfig={searchConfig}
                hasActiveFilters={Object.keys(filterValues).some(
                  (key) =>
                    filterValues[key] !== undefined &&
                    filterValues[key] !== null &&
                    (Array.isArray(filterValues[key])
                      ? filterValues[key].length > 0
                      : true)
                )}
                clearFilters={handleClearFilters}
              />
            ) : (
              <>
                {!!isTopLevel && isDesktop && globalFiltersElement}
                <ViewComponent
                  entityType={entityType}
                  entitySchema={entitySchema}
                  viewConfig={viewConfig}
                  config={config}
                  formConfig={schema}
                  data={entities}
                  filterValues={filterValues}
                  // Pass simplified pagination prop to child views
                  pagination={{
                    current: currentPageIndex + 1,
                    pageSize: pageSize,
                    total: hasMore ? ((currentPageIndex + 1) * pageSize) + 1 : (currentPageIndex + 1) * pageSize
                  }}
                  onTableChange={handleTableChange}
                  isLoading={isDataLoading}
                  currentTab={currentTab}
                  tabOptions={tabOptions}
                  allDisplayableColumns={allDisplayableColumns}
                  visibleColumns={visibleColumns}
                />
                {showPagination && (
                  <div className="mt-4 flex justify-end">
                    <Pagination
                      simple // 🚀 SIMPLE MODE for Cursor Support
                      current={currentPageIndex + 1}
                      pageSize={pageSize}
                      // 🚀 FAKE TOTAL to enable "Next" button if hasMore is true
                      total={hasMore ? ((currentPageIndex + 1) * pageSize) + 1 : (currentPageIndex + 1) * pageSize}
                      showSizeChanger
                      onChange={handlePaginationChange}
                      onShowSizeChange={handlePaginationChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </Suspense>
      </Card>
    </div>
  );
};

export default DynamicViews;