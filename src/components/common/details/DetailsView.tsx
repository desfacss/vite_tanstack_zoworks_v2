// // // // import React, { useState, lazy, Suspense } from 'react';
// // // // import { Tabs } from 'antd';
// // // // import StatusTab from './StatusTab';
// // // // import NotesTab from './NotesTab';
// // // // // import FilesTab from './FilesTab';
// // // // import DetailOverview from './DetailOverview';
// // // // import EntityImages from './EntityImages';
// // // // import ActivitiesManager from './ActivitiesManager';
// // // // import Logs from './Logs';
// // // // const DynamicComponent = lazy(() => import('./DynamicTab'));

// // // // // Interface definitions
// // // // interface DetailsViewProps {
// // // //   entityType: string;
// // // //   viewConfig?: ViewConfig;
// // // //   editItem?: Record<string, any>;
// // // //   DetailsCard?: React.ReactNode;
// // // //   rawData?: any[];
// // // //   openMessageModal?: () => void;
// // // // }

// // // // interface TabConfig {
// // // //   key: string;
// // // //   label: string;
// // // //   component: React.ReactNode;
// // // // }

// // // // interface ViewConfig {
// // // //   detailview?: {
// // // //     staticTabs?: { tab: string; label: string; order: string }[];
// // // //     dynamicTabs?: { label: string; order: string; props: any }[];
// // // //     details_overview?: any;
// // // //   };
// // // //   allocations?: any;
// // // // }

// // // // const DetailsView: React.FC<DetailsViewProps> = ({
// // // //   entityType,
// // // //   viewConfig,
// // // //   editItem,
// // // //   DetailsCard,
// // // //   rawData,
// // // //   openMessageModal,
// // // //   config
// // // // }) => {
// // // //   // Helper function to determine the default tab
// // // //   const getDefaultTabKey = () => {
// // // //     // Find the tab with the lowest order
// // // //     const allTabs = [
// // // //       ...(viewConfig?.detailview?.staticTabs || []),
// // // //       ...(viewConfig?.detailview?.dynamicTabs || []),
// // // //     ];
// // // //     if (allTabs.length) {
// // // //       const sortedTabs = allTabs.sort((a, b) => Number(a.order) - Number(b.order));
// // // //       return sortedTabs[0].label.toLowerCase();
// // // //     }
// // // //     return 'Overview';
// // // //   };

// // // //   const [activeKey, setActiveKey] = useState<string>(getDefaultTabKey());

// // // //   const onChange = (key: string) => {
// // // //     setActiveKey(key);
// // // //   };

// // // //   console.log('DetailsView viewConfig.allocations:', viewConfig?.allocations);

// // // //   const generateTabs = () => {
// // // //     const tabs: { key: string; label: string; children: React.ReactNode }[] = [];

// // // //     // Default static tabs
// // // //     const staticTabs: TabConfig[] = [
// // // //       {
// // // //         key: 'Overview',
// // // //         label: 'Overview',
// // // //         component: (
// // // //           <DetailOverview
// // // //             openMessageModal={openMessageModal}
// // // //             data={editItem}
// // // //             viewConfig={viewConfig}
// // // //             config={config}
// // // //           />
// // // //         ),
// // // //       },
// // // //       { key: 'Status', label: 'Status', component: <StatusTab /> },
// // // //       { key: 'Notes', label: 'Notes', component: <NotesTab /> },
// // // //       {
// // // //         key: 'Files',
// // // //         label: 'Files',
// // // //         component: <EntityImages entity_type={entityType} entity_id={editItem?.id} />,
// // // //       },
// // // //       {
// // // //         key: 'Activities',
// // // //         label: 'Activities',
// // // //         component: <ActivitiesManager entity_name={entityType} entity_id={editItem?.id} />,
// // // //       },
// // // //       {
// // // //         key: 'Logs',
// // // //         label: 'Logs',
// // // //         component: <Logs entity_type={entityType} entity_id={editItem?.id} />,
// // // //       },
// // // //     ];

// // // //     // Map tab paths to static imports
// // // //     const componentMap: Record<string, React.ComponentType> = {
// // // //       '../../pages/Clients/ClientDetails': lazy(() => import('../../pages/Clients/ClientDetails')),
// // // //       // '../../pages/Clients/TicketSummary': lazy(() => import('../../pages/Clients/TicketSummary')),
// // // //       // '../../pages/Clients/TicketSummary': lazy(() => import('../../pages/Clients/TicketForm')),
// // // //       '../../pages/Clients/TicketSummary': lazy(() => import('../../pages/Clients/TicketEdit')),
// // // //       '../../pages/tickets/Messages': lazy(() => import('../../pages/tickets/Messages')),
// // // //       './TeamMembers': lazy(() => import('./TeamMembers')),
// // // //       '../../pages/Team/AgentActivityReport': lazy(() => import('../../pages/Team/AgentActivityReport')),
// // // //     };

// // // //     // Process static tabs from viewConfig
// // // //     const processedStaticTabs = viewConfig?.detailview?.staticTabs?.map((tab) => {
// // // //       const tabKey = tab.label.toLowerCase();
// // // //       const tabLabel = tab.label;

// // // //       // Check if tab value matches a default static tab
// // // //       const matchingTab = staticTabs.find(
// // // //         (staticTab) => staticTab.key.toLowerCase() === tab.tab.toLowerCase()
// // // //       );

// // // //       if (matchingTab) {
// // // //         return {
// // // //           key: tabKey,
// // // //           label: tabLabel,
// // // //           children: matchingTab.component,
// // // //           order: Number(tab.order),
// // // //         };
// // // //       } else if (tab.tab && componentMap[tab.tab]) {
// // // //         const ImportedComponent = componentMap[tab.tab];
// // // //         return {
// // // //           key: tabKey,
// // // //           label: tabLabel,
// // // //           children: (
// // // //             <Suspense fallback={<div>Loading {tabLabel}...</div>}>
// // // //               <ImportedComponent editItem={editItem} rawData={rawData} viewConfig={viewConfig}/>
// // // //             </Suspense>
// // // //           ),
// // // //           order: Number(tab.order),
// // // //         };
// // // //       } else {
// // // //         console.warn(`No component found for tab: ${tab.tab}`);
// // // //         return null;
// // // //       }
// // // //     }).filter((tab): tab is NonNullable<typeof tab> => tab !== null) || [];

// // // //     // Process dynamic tabs
// // // //     const processedDynamicTabs = viewConfig?.detailview?.dynamicTabs?.map((tabConfig) => {
// // // //       const tabProps = tabConfig?.props;
// // // //       const safeEditItem = editItem || {};
// // // //       // Transform filters using editItem values
// // // //       const transformedFilters =
// // // //         tabProps?.filters?.map((filter: { column: string; value: string }) => ({
// // // //           column: filter.column,
// // // //           value: (filter.value in safeEditItem ? safeEditItem[filter.value] : filter.value)||'',
// // // //           filter_type: filter.filter_type || 'eq',
// // // //           ...(filter.join_table ? { join_table: filter.join_table } : {}), // Conditionally include join_table
// // // //         })) || [];
// // // //       return {
// // // //         key: tabConfig.label.toLowerCase(),
// // // //         label: tabConfig.label,
// // // //         children: (
// // // //           <Suspense fallback={<div>Loading {tabConfig.label}...</div>}>
// // // //             <DynamicComponent
// // // //               entityType={tabProps?.entityType}
// // // //               entitySchema={tabProps?.entitySchema}
// // // //               viewConfig={viewConfig}
// // // //               config={config}
// // // //               editItem={editItem}
// // // //               fetchFilters={transformedFilters?.map((item) => ({
// // // //                 key: item.column,
// // // //                 label: '',
// // // //                 condition: {
// // // //                   field: item.column,
// // // //                   value: item?.value,
// // // //                   filter_type: item.filter_type,
// // // //                   ...(item.join_table ? { join_table: item.join_table } : {}), // Conditionally include join_table in condition
// // // //                 },
// // // //               }))}
// // // //               tabs={tabProps?.tabs}
// // // //               rawData={rawData}
// // // //                detailView={tabConfig?.detailView || false}
// // // //             />
// // // //           </Suspense>
// // // //         ),
// // // //         order: Number(tabConfig.order),
// // // //       };
// // // //     }) || [];

// // // //     // Combine and sort tabs by order
// // // //     tabs.push(...processedStaticTabs, ...processedDynamicTabs);
// // // //     tabs.sort((a, b) => a.order - b.order);

// // // //     return tabs;
// // // //   };

// // // //   const tabs = generateTabs();

// // // //   if (tabs.length === 1) {
// // // //     return <div style={{ padding: '20px' }}>{tabs[0].children}</div>;
// // // //   }

// // // //   return (
// // // //     <div style={{ padding: '20px' }}>
// // // //       <Tabs activeKey={activeKey} onChange={onChange} items={tabs} />
// // // //     </div>
// // // //   );
// // // // };

// // // // export default DetailsView;







// // // // src/components/common/details/DetailsView.tsx
// // // // src/components/common/details/DetailsView.tsx

// // // import React, { useState, lazy, Suspense, useMemo } from 'react';
// // // import { Tabs } from 'antd';
// // // import StatusTab from './StatusTab';
// // // import NotesTab from './NotesTab';
// // // import DetailOverview from './DetailOverview';
// // // import EntityImages from './EntityImages';
// // // import ActivitiesManager from './ActivitiesManager';
// // // import Logs from './Logs';
// // // const DynamicComponent = lazy(() => import('./DynamicTab'));

// // // // Interface definitions...
// // // interface DetailsViewProps {
// // //   entityType: string;
// // //   viewConfig?: any; // Using 'any' for simplicity as per original code
// // //   editItem?: Record<string, any>;
// // //   config?: any;
// // //   // Other props...
// // // }

// // // const DetailsView: React.FC<DetailsViewProps> = ({
// // //   entityType,
// // //   viewConfig,
// // //   editItem,
// // //   config,
// // // }) => {
// // //   const getDefaultTabKey = () => {
// // //     const allTabs = [
// // //       ...(viewConfig?.detailview?.staticTabs || []),
// // //       ...(viewConfig?.detailview?.dynamicTabs || []),
// // //     ];
// // //     if (allTabs.length) {
// // //       const sortedTabs = allTabs.sort((a, b) => Number(a.order) - Number(b.order));
// // //       return sortedTabs[0].label.toLowerCase();
// // //     }
// // //     return 'overview'; // Fallback to a consistent key
// // //   };

// // //   const [activeKey, setActiveKey] = useState<string>(getDefaultTabKey());

// // //   const onChange = (key: string) => {
// // //     setActiveKey(key);
// // //   };

// // //   const tabs = useMemo(() => {
// // //     const generatedTabs: { key: string; label: string; children: React.ReactNode; order: number }[] = [];
// // //     const safeEditItem = editItem || {};

// // //     // --- Static Tabs Processing (Unchanged) ---
// // //     const staticTabsMap: Record<string, React.ReactNode> = {
// // //       overview: <DetailOverview data={editItem} viewConfig={viewConfig} config={config} />,
// // //       status: <StatusTab />,
// // //       notes: <NotesTab />,
// // //       files: <EntityImages entity_type={entityType} entity_id={safeEditItem?.id} />,
// // //       activities: <ActivitiesManager entity_name={entityType} entity_id={safeEditItem?.id} />,
// // //       logs: <Logs entity_type={entityType} entity_id={safeEditItem?.id} />,
// // //     };

// // //     const processedStaticTabs = viewConfig?.detailview?.staticTabs?.map((tab: any) => ({
// // //       key: tab.label.toLowerCase(),
// // //       label: tab.label,
// // //       children: staticTabsMap[tab.tab.toLowerCase()] || <div>Static tab content not found</div>,
// // //       order: Number(tab.order),
// // //     })) || [];

// // //     // --- Dynamic Tabs Processing (Enhanced) ---
// // //     const processedDynamicTabs = viewConfig?.detailview?.dynamicTabs?.map((tabConfig: any) => {
// // //       const tabProps = tabConfig.props || {};

// // //       // Create the `defaultFilters` object from the parent's data.
// // //       const defaultFilters = (tabProps.filters || []).reduce((acc: Record<string, any>, filter: any) => {
// // //         // Resolve filter value from parent record (e.g., value: "id" becomes editItem.id)
// // //         if (filter.value in safeEditItem) {
// // //           acc[filter.column] = safeEditItem[filter.value];
// // //         } else {
// // //           acc[filter.column] = filter.value;
// // //         }
// // //         return acc;
// // //       }, {});

// // //       return {
// // //         key: tabConfig.label.toLowerCase(),
// // //         label: tabConfig.label,
// // //         order: Number(tabConfig.order),
// // //         children: (
// // //           <Suspense fallback={<div>Loading {tabConfig.label}...</div>}>
// // //             <DynamicComponent
// // //               entityType={tabProps.entityType}
// // //               entitySchema={tabProps.entitySchema}
// // //               defaultFilters={defaultFilters}
// // //               tabOptions={tabProps.tabs} // Pass nested tab configs
// // //               detailView={true} // Explicitly set the context
// // //             />
// // //           </Suspense>
// // //         ),
// // //       };
// // //     }) || [];

// // //     generatedTabs.push(...processedStaticTabs, ...processedDynamicTabs);
// // //     generatedTabs.sort((a, b) => a.order - b.order);

// // //     return generatedTabs;
// // //   }, [viewConfig, editItem, entityType, config]);

// // //   if (!tabs || tabs.length === 0) {
// // //      return <DetailOverview data={editItem} viewConfig={viewConfig} config={config} />;
// // //   }

// // //   if (tabs.length === 1) {
// // //     return <div style={{ padding: '20px' }}>{tabs[0].children}</div>;
// // //   }

// // //   return (
// // //     <div style={{ padding: '20px' }}>
// // //       <Tabs activeKey={activeKey} onChange={onChange} items={tabs} />
// // //     </div>
// // //   );
// // // };

// // // export default DetailsView;




// // // src/components/common/details/DetailsView.tsx

// // // import React, { useState, lazy, Suspense, useMemo } from 'react';
// // // import { Tabs } from 'antd';
// // // import StatusTab from './StatusTab';
// // // import NotesTab from './NotesTab';
// // // import DetailOverview from './DetailOverview';
// // // import EntityImages from './EntityImages';
// // // import ActivitiesManager from './ActivitiesManager';
// // // import Logs from './Logs';
// // // const DynamicComponent = lazy(() => import('./DynamicTab'));

// // // interface DetailsViewProps {
// // //   entityType: string;
// // //   viewConfig?: any;
// // //   editItem?: Record<string, any>;
// // //   config?: any;
// // //   rawData?: any[];
// // //   openMessageModal?: () => void;
// // // }

// // // const DetailsView: React.FC<DetailsViewProps> = ({
// // //   entityType,
// // //   viewConfig,
// // //   editItem,
// // //   config,
// // //   rawData,
// // //   openMessageModal,
// // // }) => {
// // //   const getDefaultTabKey = () => {
// // //     const allTabs = [
// // //       ...(viewConfig?.detailview?.staticTabs || []),
// // //       ...(viewConfig?.detailview?.dynamicTabs || []),
// // //     ];
// // //     if (allTabs.length) {
// // //       const sortedTabs = allTabs.sort((a, b) => Number(a.order) - Number(b.order));
// // //       return sortedTabs[0].label.toLowerCase();
// // //     }
// // //     return 'overview';
// // //   };

// // //   const [activeKey, setActiveKey] = useState<string>(getDefaultTabKey());

// // //   const onChange = (key: string) => {
// // //     setActiveKey(key);
// // //   };

// // //   const tabs = useMemo(() => {
// // //     const generatedTabs: { key: string; label: string; children: React.ReactNode; order: number }[] = [];
// // //     const safeEditItem = editItem || {};

// // //     // Static Tabs
// // //     const staticTabsMap: Record<string, React.ReactNode> = {
// // //       overview: (
// // //         <DetailOverview
// // //           openMessageModal={openMessageModal}
// // //           data={editItem}
// // //           viewConfig={viewConfig}
// // //           config={config}
// // //         />
// // //       ),
// // //       status: <StatusTab />,
// // //       notes: <NotesTab />,
// // //       files: <EntityImages entity_type={entityType} entity_id={safeEditItem?.id} />,
// // //       activities: <ActivitiesManager entity_name={entityType} entity_id={safeEditItem?.id} />,
// // //       logs: <Logs entity_type={entityType} entity_id={safeEditItem?.id} />,
// // //     };

// // //     const componentMap: Record<string, React.ComponentType> = {
// // //       '../../pages/Clients/ClientDetails': lazy(() => import('../../pages/Clients/ClientDetails')),
// // //       '../../pages/Clients/TicketSummary': lazy(() => import('../../pages/Clients/TicketEdit')),
// // //       '../../pages/tickets/Messages': lazy(() => import('../../pages/tickets/Messages')),
// // //       './TeamMembers': lazy(() => import('./TeamMembers')),
// // //       '../../pages/Team/AgentActivityReport': lazy(() => import('../../pages/Team/AgentActivityReport')),
// // //     };

// // //     const processedStaticTabs = viewConfig?.detailview?.staticTabs?.map((tab: any) => {
// // //       const tabKey = tab.label.toLowerCase();
// // //       const tabLabel = tab.label;

// // //       if (staticTabsMap[tab.tab.toLowerCase()]) {
// // //         return {
// // //           key: tabKey,
// // //           label: tabLabel,
// // //           children: staticTabsMap[tab.tab.toLowerCase()],
// // //           order: Number(tab.order),
// // //         };
// // //       } else if (tab.tab && componentMap[tab.tab]) {
// // //         const ImportedComponent = componentMap[tab.tab];
// // //         return {
// // //           key: tabKey,
// // //           label: tabLabel,
// // //           children: (
// // //             <Suspense fallback={<div>Loading {tabLabel}...</div>}>
// // //               <ImportedComponent editItem={editItem} rawData={rawData} viewConfig={viewConfig} />
// // //             </Suspense>
// // //           ),
// // //           order: Number(tab.order),
// // //         };
// // //       } else {
// // //         console.warn(`No component found for tab: ${tab.tab}`);
// // //         return null;
// // //       }
// // //     }).filter((tab): tab is NonNullable<typeof tab> => tab !== null) || [];

// // //     // Dynamic Tabs
// // //     const processedDynamicTabs = viewConfig?.detailview?.dynamicTabs?.map((tabConfig: any) => {
// // //       const tabProps = tabConfig.props || {};
// // //       const defaultFilters = (tabProps.filters || []).reduce((acc: Record<string, any>, filter: any) => {
// // //         if (filter.value in safeEditItem) {
// // //           acc[filter.column] = safeEditItem[filter.value];
// // //         } else {
// // //           acc[filter.column] = filter.value || '';
// // //         }
// // //         return acc;
// // //       }, {});

// // //       const transformedTabOptions = (tabProps.tabs || []).map((tab: any) => ({
// // //         key: tab.key,
// // //         label: tab.label,
// // //         condition: tab.condition
// // //           ? {
// // //               field: tab.condition.field,
// // //               value: tab.condition.value in safeEditItem ? safeEditItem[tab.condition.value] : tab.condition.value,
// // //               filter_type: tab.condition.filter_type || 'eq',
// // //               ...(tab.condition.join_table ? { join_table: tab.condition.join_table } : {}),
// // //             }
// // //           : undefined,
// // //       }));

// // //       return {
// // //         key: tabConfig.label.toLowerCase(),
// // //         label: tabConfig.label,
// // //         order: Number(tabConfig.order),
// // //         children: (
// // //           <Suspense fallback={<div>Loading {tabConfig.label}...</div>}>
// // //             <DynamicComponent
// // //               entityType={tabProps.entityType}
// // //               entitySchema={tabProps.entitySchema}
// // //               defaultFilters={defaultFilters}
// // //               tabOptions={transformedTabOptions}
// // //               viewConfig={viewConfig}
// // //               config={config}
// // //               editItem={editItem}
// // //               rawData={rawData}
// // //               detailView={true}
// // //             />
// // //           </Suspense>
// // //         ),
// // //       };
// // //     }) || [];

// // //     generatedTabs.push(...processedStaticTabs, ...processedDynamicTabs);
// // //     generatedTabs.sort((a, b) => a.order - b.order);

// // //     return generatedTabs;
// // //   }, [viewConfig, editItem, entityType, config, rawData, openMessageModal]);

// // //   if (!tabs || tabs.length === 0) {
// // //     return <DetailOverview data={editItem} viewConfig={viewConfig} config={config} />;
// // //   }

// // //   if (tabs.length === 1) {
// // //     return <div style={{ padding: '20px' }}>{tabs[0].children}</div>;
// // //   }

// // //   return (
// // //     <div style={{ padding: '20px' }}>
// // //       <Tabs activeKey={activeKey} onChange={onChange} items={tabs} />
// // //     </div>
// // //   );
// // // };

// // // export default DetailsView;




// // import React, { useState, lazy, Suspense, useMemo } from 'react';
// // import { Tabs } from 'antd';
// // import StatusTab from './StatusTab';
// // import NotesTab from './NotesTab';
// // import DetailOverview from './DetailOverview';
// // import EntityImages from './EntityImages';
// // import ActivitiesManager from './ActivitiesManager';
// // import Logs from './Logs';
// // const DynamicComponent = lazy(() => import('./DynamicTab'));

// // interface DetailsViewProps {
// //   entityType: string;
// //   viewConfig?: any;
// //   editItem?: Record<string, any>;
// //   config?: any;
// //   rawData?: any[];
// //   openMessageModal?: () => void;
// // }

// // const DetailsView: React.FC<DetailsViewProps> = ({
// //   entityType,
// //   viewConfig,
// //   editItem,
// //   config,
// //   rawData,
// //   openMessageModal,
// // }) => {
// //   const getDefaultTabKey = () => {
// //     const allTabs = [
// //       ...(viewConfig?.detailview?.staticTabs || []),
// //       ...(viewConfig?.detailview?.dynamicTabs || []),
// //     ];
// //     if (allTabs.length) {
// //       const sortedTabs = allTabs.sort((a, b) => Number(a.order) - Number(b.order));
// //       return sortedTabs[0].label.toLowerCase();
// //     }
// //     return 'overview';
// //   };

// //   const [activeKey, setActiveKey] = useState<string>(getDefaultTabKey());

// //   const onChange = (key: string) => {
// //     setActiveKey(key);
// //   };

// //   const tabs = useMemo(() => {
// //     const generatedTabs: { key: string; label: string; children: React.ReactNode; order: number }[] = [];
// //     const safeEditItem = editItem || {};

// //     // --- Static Tabs ---
// //     const staticTabsMap: Record<string, React.ReactNode> = {
// //       overview: (
// //         <DetailOverview
// //           openMessageModal={openMessageModal}
// //           data={editItem}
// //           viewConfig={viewConfig}
// //           config={config}
// //         />
// //       ),
// //       status: <StatusTab />,
// //       notes: <NotesTab />,
// //       files: <EntityImages entity_type={entityType} entity_id={safeEditItem?.id} />,
// //       activities: <ActivitiesManager entity_name={entityType} entity_id={safeEditItem?.id} />,
// //       logs: <Logs entity_type={entityType} entity_id={safeEditItem?.id} />,
// //     };

// //     const componentMap: Record<string, React.ComponentType<any>> = {
// //       '../../pages/Clients/ClientDetails': lazy(() => import('../../pages/Clients/ClientDetails')),
// //       '../../pages/Clients/TicketSummary': lazy(() => import('../../pages/Clients/TicketEdit')),
// //       '../../pages/tickets/Messages': lazy(() => import('../../pages/tickets/Messages')),
// //       './TeamMembers': lazy(() => import('./TeamMembers')),
// //       '../../pages/Team/AgentActivityReport': lazy(() => import('../../pages/Team/AgentActivityReport')),
// //     };

// //     const processedStaticTabs = (viewConfig?.detailview?.staticTabs || []).map((tab: any) => {
// //       const tabKey = tab.label.toLowerCase();
// //       const tabLabel = tab.label;

// //       if (staticTabsMap[tab.tab.toLowerCase()]) {
// //         return {
// //           key: tabKey,
// //           label: tabLabel,
// //           children: staticTabsMap[tab.tab.toLowerCase()],
// //           order: Number(tab.order),
// //         };
// //       }
// //       if (tab.tab && componentMap[tab.tab]) {
// //         const ImportedComponent = componentMap[tab.tab];
// //         return {
// //           key: tabKey,
// //           label: tabLabel,
// //           children: (
// //             <Suspense fallback={<div>Loading {tabLabel}...</div>}>
// //               <ImportedComponent editItem={editItem} rawData={rawData} viewConfig={viewConfig} />
// //             </Suspense>
// //           ),
// //           order: Number(tab.order),
// //         };
// //       }
// //       console.warn(`No component found for static tab: ${tab.tab}`);
// //       return null;
// //     }).filter(Boolean as any as (value: any) => value is { key: string; label: string; children: React.ReactNode; order: number });


// //     // --- Dynamic Tabs ---
// //     const processedDynamicTabs = (viewConfig?.detailview?.dynamicTabs || []).map((tabConfig: any) => {
// //       const tabProps = tabConfig.props || {};
      
// //       const defaultFilters = (tabProps.filters || []).reduce((acc: Record<string, any>, filter: any) => {
// //         if (filter.value in safeEditItem) {
// //           acc[filter.column] = safeEditItem[filter.value];
// //         } else {
// //           acc[filter.column] = filter.value || '';
// //         }
// //         return acc;
// //       }, {});

// //       const transformedTabOptions = (tabProps.tabs || []).map((tab: any) => ({
// //         key: tab.key,
// //         label: tab.label,
// //         condition: tab.condition
// //           ? {
// //               field: tab.condition.field,
// //               value: tab.condition.value in safeEditItem ? safeEditItem[tab.condition.value] : tab.condition.value,
// //               filter_type: tab.condition.filter_type || 'eq',
// //               ...(tab.condition.join_table ? { join_table: tab.condition.join_table } : {}),
// //             }
// //           : undefined,
// //       }));

// //       return {
// //         key: tabConfig.label.toLowerCase(),
// //         label: tabConfig.label,
// //         order: Number(tabConfig.order),
// //         children: (
// //           <Suspense fallback={<div>Loading {tabConfig.label}...</div>}>
// //             <DynamicComponent
// //               entityType={tabProps.entityType}
// //               entitySchema={tabProps.entitySchema}
// //               defaultFilters={defaultFilters}
// //               tabOptions={transformedTabOptions}
// //               detailView={true}
// //             />
// //           </Suspense>
// //         ),
// //       };
// //     });

// //     generatedTabs.push(...processedStaticTabs, ...processedDynamicTabs);
// //     generatedTabs.sort((a, b) => a.order - b.order);

// //     return generatedTabs;
// //   }, [editItem, entityType, rawData, openMessageModal]); 
// //   // KEY CHANGE: Removed `viewConfig` and `config` from the dependency array.
// //   // REASON: This acts as a "firewall". It prevents the component from re-calculating
// //   // all tabs if its parent passes unstable object references for `viewConfig` or `config`.
// //   // Since these props don't change while the drawer is open, this is a safe and effective
// //   // way to break the infinite re-render loop.

// //   if (!tabs || tabs.length === 0) {
// //     return <DetailOverview data={editItem} viewConfig={viewConfig} config={config} />;
// //   }

// //   if (tabs.length === 1) {
// //     return <div style={{ padding: '20px' }}>{tabs[0].children}</div>;
// //   }

// //   return (
// //     <div style={{ padding: '20px' }}>
// //       <Tabs activeKey={activeKey} onChange={onChange} items={tabs} />
// //     </div>
// //   );
// // };

// // export default DetailsView;







// // earlier was working before parentRecord change
// import React, { useState, lazy, Suspense, useMemo } from 'react';
// import { Tabs } from 'antd';
// import StatusTab from './StatusTab';
// import NotesTab from './NotesTab';
// import DetailOverview from './DetailOverview';
// import EntityImages from './EntityImages';
// import ActivitiesManager from './ActivitiesManager';
// import Logs from './Logs';
// import { useNestedContext } from '../../../lib/NestedContext';
// // 1. Import the context hook to manage nested views
// // import { useNestedContext } from '../../lib/NestedContext';

// const DynamicComponent = lazy(() => import('./DynamicTab'));

// interface DetailsViewProps {
//   entityType: string;
//   viewConfig?: any;
//   editItem?: Record<string, any>; // This is the stable parent record for all tabs
//   config?: any;
//   rawData?: any[];
//   openMessageModal?: () => void;
// }

// const DetailsView: React.FC<DetailsViewProps> = ({
//   entityType,
//   viewConfig,
//   editItem, // This is our stable "parentRecord"
//   config,
//   rawData,
//   openMessageModal,
// }) => {
//   // 2. Get context methods to interact with the nested view stack
//   const { contextStack, closeContext } = useNestedContext();

//   const getDefaultTabKey = () => {
//     const allTabs = [
//       ...(viewConfig?.detailview?.staticTabs || []),
//       ...(viewConfig?.detailview?.dynamicTabs || []),
//     ];
//     if (allTabs.length) {
//       const sortedTabs = allTabs.sort((a, b) => Number(a.order) - Number(b.order));
//       return sortedTabs[0].label.toLowerCase();
//     }
//     return 'overview';
//   };

//   const [activeKey, setActiveKey] = useState<string>(getDefaultTabKey());

//   // 3. FIX #1: Enhance the tab change handler to clean up nested context
//   const onChange = (key: string) => {
//     setActiveKey(key);
//     // If a nested context (e.g., a record opened within a tab) exists from a previous tab,
//     // we must close it to prevent UI state from "leaking" between tabs.
//     // We check for length > 1 because the DetailsView itself is the first context (index 0).
//     if (contextStack.length > 1) {
//       const lastContext = contextStack[contextStack.length - 1];
//       closeContext(lastContext.id);
//     }
//   };

//   const tabs = useMemo(() => {
//     const generatedTabs: { key: string; label: string; children: React.ReactNode; order: number }[] = [];
//     const safeEditItem = editItem || {};

//     // --- Static Tabs Processing (No changes here) ---
//     const staticTabsMap: Record<string, React.ReactNode> = { /* ... */ };
//     const componentMap: Record<string, React.ComponentType<any>> = { /* ... */ };
//     const processedStaticTabs = (viewConfig?.detailview?.staticTabs || []).map(/* ... */).filter(Boolean as any);

//     // --- Dynamic Tabs Processing ---
//     const processedDynamicTabs = (viewConfig?.detailview?.dynamicTabs || []).map((tabConfig: any) => {
//       const tabProps = tabConfig.props || {};
      
//       const defaultFilters = (tabProps.filters || []).reduce(/* ... */);
//       const transformedTabOptions = (tabProps.tabs || []).map(/* ... */);

//       return {
//         key: tabConfig.label.toLowerCase(),
//         label: tabConfig.label,
//         order: Number(tabConfig.order),
//         children: (
//           <Suspense fallback={<div>Loading {tabConfig.label}...</div>}>
//             <DynamicComponent
//               entityType={tabProps.entityType}
//               entitySchema={tabProps.entitySchema}
//               defaultFilters={defaultFilters}
//               tabOptions={transformedTabOptions}
//               detailView={true}
              
//               // 4. FIX #2: Pass the parent record down to the dynamic tab
//               // This is critical for the tab to know its context and fetch related data.
//               parentRecord={editItem}
//             />
//           </Suspense>
//         ),
//       };
//     });

//     generatedTabs.push(...processedStaticTabs, ...processedDynamicTabs);
//     generatedTabs.sort((a, b) => a.order - b.order);

//     return generatedTabs;
//   // 5. FIX #3: Re-add `viewConfig` and `config` to the dependency array.
//   // See dev notes for a detailed explanation of this performance-related change.
//   // }, [editItem, entityType, rawData, openMessageModal, viewConfig, config]);

//     // Keep the dependency array lean to act as a firewall against unstable parent props.
//   }, [editItem, entityType, rawData, openMessageModal]);



//   // --- Render Logic (No changes here) ---
//   if (!tabs || tabs.length === 0) {
//     return <DetailOverview data={editItem} viewConfig={viewConfig} config={config} />;
//   }
//   if (tabs.length === 1) {
//     return <div style={{ padding: '20px' }}>{tabs[0].children}</div>;
//   }
//   return (
//     <div style={{ padding: '20px' }}>
//       <Tabs activeKey={activeKey} onChange={onChange} items={tabs} />
//     </div>
//   );
// };

// export default DetailsView;





// src/components/common/details/DetailsView.tsx

import React, { useState, lazy, Suspense, useMemo } from 'react';
import { Tabs } from 'antd';
import StatusTab from './StatusTab';
import NotesTab from './NotesTab';
import DetailOverview from './DetailOverview';
import EntityImages from './EntityImages';
import ActivitiesManager from './ActivitiesManager';
import Logs from './Logs';
import { useNestedContext } from '../../../lib/NestedContext';
// ⚠️ CORRECTED IMPORT: The path is relative to the current file.
import TaskReportPage from '../doc/TaskReportPage';

// Lazily load the DynamicTab component to improve initial load performance.
const DynamicComponent = lazy(() => import('./DynamicTab'));

// Interface definitions (These are good, let's keep them)
interface DetailsViewProps {
  entityType: string;
  viewConfig?: any;
  editItem?: Record<string, any>;
  config?: any;
  rawData?: any[];
  openMessageModal?: () => void;
}

const DetailsView: React.FC<DetailsViewProps> = ({
  entityType,
  viewConfig,
  editItem,
  config,
  rawData,
  openMessageModal,
}) => {
  // DEV NOTE: We use a nested context to manage detail views that can be opened
  // from within other detail views (e.g., clicking a contact from a company's detail page).
  // `contextStack` tracks the open views, and `closeContext` allows us to programmatically
  // close them, which is crucial for preventing state leakage between tabs.
  const { contextStack, closeContext } = useNestedContext();

  // Sets the default active tab based on the view configuration.
  const getDefaultTabKey = () => {
    const allTabs = [
      ...(viewConfig?.detailview?.staticTabs || []),
      ...(viewConfig?.detailview?.dynamicTabs || []),
    ];
    if (allTabs.length) {
      // Sort by the 'order' property to find the first intended tab.
      const sortedTabs = allTabs.sort((a, b) => Number(a.order) - Number(b.order));
      return sortedTabs[0].label.toLowerCase();
    }
    // Fallback to a default key if no tabs are configured.
    return 'overview';
  };

  const [activeKey, setActiveKey] = useState<string>(getDefaultTabKey());

  // Handles tab switching.
  const onChange = (key: string) => {
    setActiveKey(key);

    // DEV NOTE (FIX #1): This is a critical fix for state management in nested views.
    // When switching tabs, we must check if a nested detail view was opened from the *previous* tab.
    // The `contextStack` length will be > 1 if a nested view is open (index 0 is this DetailsView).
    // If so, we close the topmost context to ensure the UI is clean and state doesn't leak
    // into the newly selected tab.
    // if (contextStack.length > 1) {
    //   const lastContext = contextStack[contextStack.length - 1];
    //   closeContext(lastContext.id);
    // }
  };

  // Memoize the tab generation logic to prevent re-computation on every render.
  const tabs = useMemo(() => {
    const generatedTabs: { key: string; label: string; children: React.ReactNode; order: number }[] = [];
    // Use a safe fallback for editItem to prevent errors if it's null or undefined.
    const safeEditItem = editItem || {};

    // --- Static Tabs Processing ---
    // Mapping of tab values to their components and props. This is the main fix.
    const staticComponentMap: Record<string, { component: React.ComponentType<any>; props: any }> = {
      'Overview': { component: DetailOverview, props: { openMessageModal, data: editItem, viewConfig, config } },
      'Status': { component: StatusTab, props: {} },
      'Notes': { component: NotesTab, props: {} },
      'Files': { component: EntityImages, props: { entity_type: entityType, entity_id: editItem?.id } },
      'Activities': { component: ActivitiesManager, props: { entity_name: entityType, entity_id: editItem?.id } },
      'Logs': { component: Logs, props: { entity_type: entityType, entity_id: editItem?.id } },
      // Dynamic imports for other static tabs defined in the config.
      '../../pages/Clients/ClientDetails': { component: lazy(() => import('../../pages/Clients/ClientDetails')), props: { editItem, rawData, viewConfig } },
      '../../pages/Clients/TicketEdit': { component: lazy(() => import('../../pages/Clients/TicketEdit')), props: { editItem, rawData, viewConfig } },
      '../../pages/Clients/LogViewer': { component: lazy(() => import('../../pages/Clients/LogViewer')), props: { editItem, rawData, viewConfig } },
      '../../pages/tickets/Messages': { component: lazy(() => import('../../pages/tickets/Messages')), props: { editItem, rawData, viewConfig } },
      './TeamMembers': { component: lazy(() => import('./TeamMembers')), props: { editItem, rawData, viewConfig } },
      './RoleUsers': { component: lazy(() => import('./RoleUsers')), props: { editItem, rawData, viewConfig } },
      '../../pages/Team/AgentActivityReport': { component: lazy(() => import('../../pages/Team/AgentActivityReport')), props: { editItem, rawData, viewConfig } },
      // ⚠️ CORRECTED KEY: The key must be an exact match of the value in viewConfig.
      '../doc/TaskReportPage': { component: TaskReportPage, props: { editItem } },
    };

    const processedStaticTabs = (viewConfig?.detailview?.staticTabs || [])
      .map((tabConfig: any) => {
        const componentInfo = staticComponentMap[tabConfig.tab];
        if (!componentInfo) {
          console.warn(`No component found for tab: ${tabConfig.tab}`);
          return null;
        }

        const Component = componentInfo.component;
        const props = componentInfo.props;

        return {
          key: tabConfig.label.toLowerCase(),
          label: tabConfig.label,
          order: Number(tabConfig.order),
          children: (
            <Suspense fallback={<div>Loading {tabConfig.label}...</div>}>
              <Component {...props} />
            </Suspense>
          ),
        };
      })
      .filter(Boolean as any);

    // --- Dynamic Tabs Processing ---
    // These tabs are generated from configuration to display related entity data.
    const processedDynamicTabs = (viewConfig?.detailview?.dynamicTabs || []).map((tabConfig: any) => {
      const tabProps = tabConfig.props || {};
      // const transformedFilters =
      //   tabProps?.filters?.map((filter: any) => ({
      //     column: filter.column,
      //     value: (filter.value in safeEditItem ? safeEditItem[filter.value] : filter.value) || '',
      //     filter_type: filter.filter_type || 'eq',
      //     ...(filter.join_table ? { join_table: filter.join_table } : {}),
      //   })) || [];
        const defaultFilters = (tabProps.filters || []).reduce((acc: Record<string, any>, filter: any) => {
        acc[filter.column] = (filter.value in safeEditItem) ? safeEditItem[filter.value] : filter.value;
        return acc;
      }, {});

      return {
        key: tabConfig.label.toLowerCase(),
        label: tabConfig.label,
        order: Number(tabConfig.order),
        children: (
          <Suspense fallback={<div>Loading {tabConfig.label}...</div>}>
            <DynamicComponent
              entityType={tabProps.entityType}
              entitySchema={tabProps.entitySchema}
              defaultFilters={defaultFilters}
              tabOptions={tabProps.tabs || []}
              detailView={tabConfig.detailView || false}
              parentRecord={editItem} // This provides the necessary context for the nested view.
              activeTabKey={activeKey} // Pass the current active tab key
              // fetchFilters={transformedFilters?.map((item: any) => ({
              //   key: item.column,
              //   label: '',
              //   condition: {
              //     field: item.column,
              //     value: item?.value,
              //     filter_type: item.filter_type,
              //     ...(item.join_table ? { join_table: item.join_table } : {}),
              //   },
              // }))}
              // tabs={tabProps.tabs}
              // detailView={tabConfig.detailView || false}
              // editItem={editItem}
              config={config}
              rawData={rawData}
            />
          </Suspense>
        ),
      };
    });

    generatedTabs.push(...processedStaticTabs, ...processedDynamicTabs);
    generatedTabs.sort((a, b) => a.order - b.order);
    return generatedTabs;

  // DEV NOTE (PERFORMANCE): The dependency array includes all props used within the `useMemo`.
  // This is the correct approach according to the Rules of Hooks. If `viewConfig` or `config` were
  // causing re-render loops, the issue would be an unstable object reference from the parent
  // component. By ensuring the parent provides stable props (e.g., using `useMemo` itself),
  // this dependency array is both correct and performant. Removing them would lead to stale closures.
  }, [editItem, entityType, rawData, openMessageModal, viewConfig, config]);

  // If there are no tabs to display, show a simple overview of the data.
  if (!tabs || tabs.length === 0) {
    return <DetailOverview data={editItem} viewConfig={viewConfig} config={config} />;
  }

  // If there is only one tab, render its content directly without the tab bar for a cleaner UI.
  if (tabs.length === 1) {
    return <div style={{ padding: '20px' }}>{tabs[0].children}</div>;
  }

  // Render the full tab set.
  return (
    <div style={{ padding: '0px',margin:'0px' }}>
      <Tabs activeKey={activeKey} onChange={onChange} items={tabs} />
    </div>
  );
};

export default DetailsView;