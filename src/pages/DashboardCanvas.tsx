// // // // // // import React, { useState, useEffect } from 'react';
// // // // // // import { Responsive, WidthProvider } from 'react-grid-layout';
// // // // // // import { Card, Button, Dropdown, Menu, Popconfirm, Typography } from 'antd';
// // // // // // import { DeleteOutlined, SettingOutlined } from '@ant-design/icons';
// // // // // // import { WidgetWrapper, BaseChart, KPIWidget, TableWidget } from './WidgetRenderers';
// // // // // // import _ from 'lodash';

// // // // // // const ResponsiveGridLayout = WidthProvider(Responsive);
// // // // // // const { Text } = Typography;

// // // // // // interface DashboardCanvasProps {
// // // // // //   widgets: any[];
// // // // // //   widgetData: any;
// // // // // //   widgetDefinitions: any;
// // // // // //   isEditMode: boolean;
// // // // // //   onLayoutChange: (layout: any) => void;
// // // // // //   onRemoveWidget: (id: string) => void;
// // // // // //   onEditWidget: (widget: any) => void;
// // // // // // }

// // // // // // const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
// // // // // //   widgets,
// // // // // //   widgetData,
// // // // // //   widgetDefinitions,
// // // // // //   isEditMode,
// // // // // //   onLayoutChange,
// // // // // //   onRemoveWidget,
// // // // // //   onEditWidget
// // // // // // }) => {
// // // // // //   // RGL Layout State
// // // // // //   const [layouts, setLayouts] = useState<any>({ lg: [] });

// // // // // //   // Sync widgets prop to RGL layout format
// // // // // //   useEffect(() => {
// // // // // //     const layout = widgets.map(w => ({
// // // // // //       i: w.id,
// // // // // //       x: w.position.x,
// // // // // //       y: w.position.y,
// // // // // //       w: w.position.w,
// // // // // //       h: w.position.h,
// // // // // //       minW: 2, minH: 2
// // // // // //     }));
// // // // // //     setLayouts({ lg: layout });
// // // // // //   }, [widgets]);

// // // // // //   // Handle Grid Changes
// // // // // //   const handleLayoutChange = (currentLayout: any) => {
// // // // // //     onLayoutChange(currentLayout);
// // // // // //   };

// // // // // //   // Render Content inside the Grid Item
// // // // // //   const renderWidgetContent = (widget: any) => {
// // // // // //     const def = widgetDefinitions[widget.definitionId];
// // // // // //     const wData = widgetData[widget.id] || { loading: false, data: null, error: null };
    
// // // // // //     if (!def) return <div className="p-4 text-red-500">Definition Missing</div>;

// // // // // //     // Merge widget instance config with template config
// // // // // //     const config = { ...def.config_template, ...widget.config };

// // // // // //     return (
// // // // // //       <WidgetWrapper loading={wData.loading} error={wData.error} data={wData.data}>
// // // // // //         {def.widget_type === 'kpi' && <KPIWidget data={wData.data} config={config} />}
// // // // // //         {def.widget_type === 'line_chart' && <BaseChart type="scatter" data={wData.data} config={config} />}
// // // // // //         {def.widget_type === 'bar_chart' && <BaseChart type="bar" data={wData.data} config={config} />}
// // // // // //         {def.widget_type === 'pie_chart' && <BaseChart type="pie" data={wData.data} config={config} />}
// // // // // //         {def.widget_type === 'table' && <TableWidget data={wData.data} config={config} />}
// // // // // //       </WidgetWrapper>
// // // // // //     );
// // // // // //   };

// // // // // //   return (
// // // // // //     <div className="dashboard-canvas bg-gray-50 min-h-screen p-4 rounded-lg">
// // // // // //       <ResponsiveGridLayout
// // // // // //         className="layout"
// // // // // //         layouts={layouts}
// // // // // //         // Grid settings
// // // // // //         breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
// // // // // //         cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
// // // // // //         rowHeight={60} // Height of one grid unit
// // // // // //         // Behaviors
// // // // // //         isDraggable={isEditMode}
// // // // // //         isResizable={isEditMode}
// // // // // //         onLayoutChange={handleLayoutChange}
// // // // // //         // Drag from outside logic (for Library)
// // // // // //         isDroppable={isEditMode}
// // // // // //         onDrop={(layout, layoutItem, _event) => {
// // // // // //            // The parent handles the actual data addition via the 'drop' event on the container
// // // // // //            // This callback is just for RGL internal state update
// // // // // //         }}
// // // // // //         margin={[16, 16]}
// // // // // //       >
// // // // // //         {widgets.map(widget => (
// // // // // //           <div key={widget.id} className="bg-white shadow-sm rounded border hover:shadow-md transition-shadow flex flex-col">
// // // // // //             {/* Widget Header */}
// // // // // //             <div className={`flex justify-between items-center px-4 py-2 border-b ${isEditMode ? 'cursor-move' : ''}`}>
// // // // // //               <Text strong className="truncate select-none">{widget.title}</Text>
              
// // // // // //               {isEditMode && (
// // // // // //                 <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
// // // // // //                    <Button 
// // // // // //                     type="text" 
// // // // // //                     size="small" 
// // // // // //                     icon={<SettingOutlined />} 
// // // // // //                     onClick={() => onEditWidget(widget)}
// // // // // //                    />
// // // // // //                    <Popconfirm title="Remove widget?" onConfirm={() => onRemoveWidget(widget.id)}>
// // // // // //                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
// // // // // //                    </Popconfirm>
// // // // // //                 </div>
// // // // // //               )}
// // // // // //             </div>
            
// // // // // //             {/* Widget Body */}
// // // // // //             <div className="flex-1 p-2 overflow-hidden relative">
// // // // // //                {renderWidgetContent(widget)}
// // // // // //             </div>
// // // // // //           </div>
// // // // // //         ))}
// // // // // //       </ResponsiveGridLayout>
// // // // // //     </div>
// // // // // //   );
// // // // // // };

// // // // // // export default DashboardCanvas;


// // // // // import React, { useMemo } from 'react';
// // // // // import { Responsive, WidthProvider } from 'react-grid-layout';
// // // // // import { Button, Popconfirm, Typography, Card } from 'antd';
// // // // // import { DeleteOutlined, SettingOutlined, DragOutlined } from '@ant-design/icons';
// // // // // import { WidgetWrapper, BaseChart, KPIWidget, TableWidget } from './WidgetRenderers';
// // // // // import _ from 'lodash';

// // // // // // Vital: Import the CSS for grid layout if not imported globally
// // // // // import 'react-grid-layout/css/styles.css';
// // // // // import 'react-resizable/css/styles.css';

// // // // // const ResponsiveGridLayout = WidthProvider(Responsive);
// // // // // const { Text } = Typography;

// // // // // interface DashboardCanvasProps {
// // // // //   widgets: any[];
// // // // //   widgetData: any;
// // // // //   widgetDefinitions: any;
// // // // //   isEditMode: boolean;
// // // // //   onLayoutChange: (layout: any) => void;
// // // // //   onRemoveWidget: (id: string) => void;
// // // // //   onEditWidget: (widget: any) => void;
// // // // // }

// // // // // const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
// // // // //   widgets,
// // // // //   widgetData,
// // // // //   widgetDefinitions,
// // // // //   isEditMode,
// // // // //   onLayoutChange,
// // // // //   onRemoveWidget,
// // // // //   onEditWidget
// // // // // }) => {

// // // // //   // 1. Transform your DB widgets into RGL layout objects
// // // // //   // We use useMemo to prevent RGL from re-rendering unnecessarily
// // // // //   const layout = useMemo(() => {
// // // // //     return widgets.map(w => ({
// // // // //       i: w.id.toString(), // Ensure ID is a string
// // // // //       x: w.position?.x || 0,
// // // // //       y: w.position?.y || 0,
// // // // //       w: w.position?.w || 4, // Default width if missing
// // // // //       h: w.position?.h || 4, // Default height if missing
// // // // //       minW: 2, 
// // // // //       minH: 2
// // // // //     }));
// // // // //   }, [widgets]);

// // // // //   // 2. The internal callback from RGL
// // // // //   const handleRGLChange = (currentLayout: any[], allLayouts: any) => {
// // // // //     // PREVENT CORRUPTION:
// // // // //     // RGL sometimes fires with 0 width/height on mount. Ignore those.
// // // // //     // Also ignore if the layout array is empty but we have widgets.
// // // // //     if (currentLayout.length === 0 && widgets.length > 0) return;
    
// // // // //     // Pass the raw RGL layout up to the parent
// // // // //     onLayoutChange(currentLayout);
// // // // //   };

// // // // //   const renderWidgetContent = (widget: any) => {
// // // // //     const def = widgetDefinitions[widget.definitionId];
// // // // //     const wData = widgetData[widget.id] || { loading: false, data: null, error: null };
    
// // // // //     if (!def) {
// // // // //       return (
// // // // //         <div className="h-full flex flex-col justify-center items-center bg-red-50 text-red-500 p-2 text-center">
// // // // //           <Text type="danger">Widget Definition Missing</Text>
// // // // //           <Text type="secondary" style={{fontSize: 10}}>{widget.definitionId}</Text>
// // // // //         </div>
// // // // //       );
// // // // //     }

// // // // //     const config = { ...def.config_template, ...widget.config };

// // // // //     return (
// // // // //       <WidgetWrapper loading={wData.loading} error={wData.error} data={wData.data}>
// // // // //         {def.widget_type === 'kpi' && <KPIWidget data={wData.data} config={config} />}
// // // // //         {def.widget_type === 'line_chart' && <BaseChart type="scatter" data={wData.data} config={config} />}
// // // // //         {def.widget_type === 'bar_chart' && <BaseChart type="bar" data={wData.data} config={config} />}
// // // // //         {def.widget_type === 'pie_chart' && <BaseChart type="pie" data={wData.data} config={config} />}
// // // // //         {def.widget_type === 'table' && <TableWidget data={wData.data} config={config} />}
// // // // //       </WidgetWrapper>
// // // // //     );
// // // // //   };

// // // // //   return (
// // // // //     <div className="dashboard-canvas bg-gray-50 p-4 rounded-lg min-h-[600px]">
// // // // //       <ResponsiveGridLayout
// // // // //         className="layout"
// // // // //         // We force the layout prop to match our state
// // // // //         layouts={{ lg: layout, md: layout, sm: layout }} 
// // // // //         breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
// // // // //         cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
// // // // //         rowHeight={60}
        
// // // // //         // Edit Mode Controls
// // // // //         isDraggable={isEditMode}
// // // // //         isResizable={isEditMode}
// // // // //         draggableHandle=".drag-handle" // Only drag from the header
        
// // // // //         // Critical: This callback updates the parent state
// // // // //         onLayoutChange={handleRGLChange}
        
// // // // //         // Visuals
// // // // //         margin={[16, 16]}
// // // // //         containerPadding={[0, 0]}
// // // // //         useCSSTransforms={true}
// // // // //       >
// // // // //         {widgets.map(widget => (
// // // // //           <div key={widget.id} className="bg-white shadow-sm rounded-lg border flex flex-col overflow-hidden hover:shadow-md transition-shadow">
// // // // //             {/* Widget Header */}
// // // // //             <div className={`flex justify-between items-center px-3 py-2 border-b bg-white z-10 ${isEditMode ? 'cursor-move drag-handle bg-gray-50' : ''}`} style={{ height: '40px' }}>
// // // // //               <div className="flex items-center gap-2 overflow-hidden">
// // // // //                 {isEditMode && <DragOutlined className="text-gray-400" />}
// // // // //                 <Text strong className="truncate select-none" style={{ fontSize: '14px' }}>{widget.title}</Text>
// // // // //               </div>
              
// // // // //               {isEditMode && (
// // // // //                 <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
// // // // //                    <Button 
// // // // //                     type="text" 
// // // // //                     size="small" 
// // // // //                     icon={<SettingOutlined />} 
// // // // //                     onClick={() => onEditWidget(widget)}
// // // // //                    />
// // // // //                    <Popconfirm 
// // // // //                      title="Delete this widget?" 
// // // // //                      onConfirm={() => onRemoveWidget(widget.id)}
// // // // //                      okText="Yes"
// // // // //                      cancelText="No"
// // // // //                    >
// // // // //                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
// // // // //                    </Popconfirm>
// // // // //                 </div>
// // // // //               )}
// // // // //             </div>
            
// // // // //             {/* Widget Body */}
// // // // //             <div className="flex-1 p-2 overflow-hidden relative h-full">
// // // // //                {renderWidgetContent(widget)}
// // // // //             </div>
// // // // //           </div>
// // // // //         ))}
// // // // //       </ResponsiveGridLayout>
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // export default DashboardCanvas;


// // // // import React, { useMemo } from 'react';
// // // // import { Responsive, WidthProvider } from 'react-grid-layout';
// // // // import { Button, Popconfirm, Typography } from 'antd';
// // // // import { DeleteOutlined, SettingOutlined, DragOutlined } from '@ant-design/icons';
// // // // import { WidgetWrapper, BaseChart, KPIWidget, TableWidget } from './WidgetRenderers';
// // // // import _ from 'lodash';

// // // // // Ensure styles are imported in your global CSS or here
// // // // import 'react-grid-layout/css/styles.css';
// // // // import 'react-resizable/css/styles.css';

// // // // const ResponsiveGridLayout = WidthProvider(Responsive);
// // // // const { Text } = Typography;

// // // // interface DashboardCanvasProps {
// // // //   widgets: any[];
// // // //   widgetData: any;
// // // //   widgetDefinitions: any;
// // // //   isEditMode: boolean;
// // // //   onLayoutChange: (layout: any) => void;
// // // //   onRemoveWidget: (id: string) => void;
// // // //   onEditWidget: (widget: any) => void;
// // // // }

// // // // const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
// // // //   widgets,
// // // //   widgetData,
// // // //   widgetDefinitions,
// // // //   isEditMode,
// // // //   onLayoutChange,
// // // //   onRemoveWidget,
// // // //   onEditWidget
// // // // }) => {

// // // //   // MEMO: Generate the layout. 
// // // //   // Crucial Fix: We generate a layout for 'lg' and let RGL extrapolate, 
// // // //   // BUT we ensure the item IDs are strings to prevent RGL internal errors.
// // // //   const layout = useMemo(() => {
// // // //     return widgets.map(w => ({
// // // //       i: String(w.id), 
// // // //       x: w.position?.x || 0,
// // // //       y: w.position?.y || 0,
// // // //       w: w.position?.w || 4,
// // // //       h: w.position?.h || 4,
// // // //       minW: 2, 
// // // //       minH: 2
// // // //     }));
// // // //   }, [widgets]);

// // // //   const handleRGLChange = (currentLayout: any[]) => {
// // // //     // Defensive: Prevent updates on empty layouts during mount
// // // //     if (!currentLayout || currentLayout.length === 0) return;
// // // //     onLayoutChange(currentLayout);
// // // //   };

// // // //   const renderWidgetContent = (widget: any) => {
// // // //     const def = widgetDefinitions[widget.definitionId];
// // // //     const wData = widgetData[widget.id] || { loading: false, data: null, error: null };
    
// // // //     if (!def) {
// // // //       return (
// // // //         <div className="h-full flex flex-col justify-center items-center bg-red-50 text-red-500 p-2 text-center border-red-100 border">
// // // //           <Text type="danger" style={{fontSize: '12px'}}>Def Missing</Text>
// // // //         </div>
// // // //       );
// // // //     }

// // // //     const config = { ...def.config_template, ...widget.config };

// // // //     return (
// // // //       <WidgetWrapper loading={wData.loading} error={wData.error} data={wData.data}>
// // // //         {def.widget_type === 'kpi' && <KPIWidget data={wData.data} config={config} />}
// // // //         {def.widget_type === 'line_chart' && <BaseChart type="scatter" data={wData.data} config={config} />}
// // // //         {def.widget_type === 'bar_chart' && <BaseChart type="bar" data={wData.data} config={config} />}
// // // //         {def.widget_type === 'pie_chart' && <BaseChart type="pie" data={wData.data} config={config} />}
// // // //         {def.widget_type === 'table' && <TableWidget data={wData.data} config={config} />}
// // // //       </WidgetWrapper>
// // // //     );
// // // //   };

// // // //   return (
// // // //     <div className="dashboard-canvas bg-gray-50 p-2 sm:p-4 rounded-lg min-h-[80vh]">
// // // //       <ResponsiveGridLayout
// // // //         className="layout"
// // // //         layouts={{ lg: layout, md: layout, sm: layout }} // Force same layout logic across breakpoints to prevent scattering
        
// // // //         // Tablet/Mobile Breakpoints Tuning
// // // //         breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        
// // // //         // Columns: Keeping them divisible helps alignment. 
// // // //         // iPad (md) usually fits 12 cols fine, but 10 is safer for smaller tablets.
// // // //         cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        
// // // //         // Height
// // // //         rowHeight={60}
        
// // // //         // Interactions
// // // //         isDraggable={isEditMode}
// // // //         isResizable={isEditMode}
// // // //         draggableHandle=".drag-handle"
        
// // // //         // Handlers
// // // //         onLayoutChange={handleRGLChange}
        
// // // //         // Visuals
// // // //         margin={[16, 16]}
// // // //         containerPadding={[0, 0]}
// // // //         useCSSTransforms={true} // Keep true for performance
// // // //       >
// // // //         {widgets.map(widget => (
// // // //           <div key={widget.id} className="bg-white shadow-sm rounded-lg border flex flex-col overflow-hidden hover:shadow-md transition-shadow">
// // // //             {/* Widget Header */}
// // // //             <div className={`flex justify-between items-center px-3 border-b bg-white z-10 shrink-0 ${isEditMode ? 'cursor-move drag-handle bg-gray-50' : ''}`} style={{ height: '40px' }}>
// // // //               <div className="flex items-center gap-2 overflow-hidden">
// // // //                 {isEditMode && <DragOutlined className="text-gray-400" />}
// // // //                 <Text strong className="truncate select-none text-xs sm:text-sm">{widget.title}</Text>
// // // //               </div>
              
// // // //               {isEditMode && (
// // // //                 <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
// // // //                    <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => onEditWidget(widget)}/>
// // // //                    <Popconfirm title="Delete?" onConfirm={() => onRemoveWidget(widget.id)} okText="Yes" cancelText="No">
// // // //                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
// // // //                    </Popconfirm>
// // // //                 </div>
// // // //               )}
// // // //             </div>
            
// // // //             {/* Widget Body - Critical: flex-1 ensures it fills height */}
// // // //             <div className="flex-1 p-2 overflow-hidden relative h-full w-full">
// // // //                {renderWidgetContent(widget)}
// // // //             </div>
// // // //           </div>
// // // //         ))}
// // // //       </ResponsiveGridLayout>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default DashboardCanvas;

// // // import React, { useMemo, useState } from 'react';
// // // import { Responsive, WidthProvider } from 'react-grid-layout';
// // // import { Button, Popconfirm, Typography } from 'antd';
// // // import { DeleteOutlined, SettingOutlined, DragOutlined } from '@ant-design/icons';
// // // import { WidgetWrapper, BaseChart, KPIWidget, TableWidget } from './WidgetRenderers';
// // // import _ from 'lodash';

// // // import 'react-grid-layout/css/styles.css';
// // // import 'react-resizable/css/styles.css';

// // // const ResponsiveGridLayout = WidthProvider(Responsive);
// // // const { Text } = Typography;

// // // interface DashboardCanvasProps {
// // //   widgets: any[];
// // //   widgetData: any;
// // //   widgetDefinitions: any;
// // //   isEditMode: boolean;
// // //   onLayoutChange: (layout: any) => void;
// // //   onRemoveWidget: (id: string) => void;
// // //   onEditWidget: (widget: any) => void;
// // // }

// // // const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
// // //   widgets,
// // //   widgetData,
// // //   widgetDefinitions,
// // //   isEditMode,
// // //   onLayoutChange,
// // //   onRemoveWidget,
// // //   onEditWidget
// // // }) => {
// // //   // Track current breakpoint to prevent mobile auto-flow from saving as the permanent desktop layout
// // //   const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');

// // //   // 1. MASTER LAYOUT (12 Columns)
// // //   // This is the source of truth for Desktop (lg) and Tablet Landscape (md)
// // //   const masterLayout = useMemo(() => {
// // //     return widgets.map(w => ({
// // //       i: String(w.id), 
// // //       x: w.position?.x || 0,
// // //       y: w.position?.y || 0,
// // //       w: w.position?.w || 4,
// // //       h: w.position?.h || 4,
// // //       minW: 2, 
// // //       minH: 2
// // //     }));
// // //   }, [widgets]);

// // //   // 2. Handle Layout Changes
// // //   const handleRGLChange = (currentLayout: any[], allLayouts: any) => {
// // //     // CRITICAL FIX: Only save layout changes if we are in a 12-column mode (lg or md).
// // //     // If we save while in 'sm' or 'xs', the auto-flowed single-column coordinates 
// // //     // will overwrite the complex desktop dashboard, destroying it.
// // //     if (currentBreakpoint === 'lg' || currentBreakpoint === 'md') {
// // //        // Defensive: prevent zero-length updates during mount
// // //        if (currentLayout && currentLayout.length > 0) {
// // //          onLayoutChange(currentLayout);
// // //        }
// // //     }
// // //   };

// // //   const renderWidgetContent = (widget: any) => {
// // //     const def = widgetDefinitions[widget.definitionId];
// // //     const wData = widgetData[widget.id] || { loading: false, data: null, error: null };
    
// // //     if (!def) {
// // //       return (
// // //         <div className="h-full flex flex-col justify-center items-center bg-red-50 text-red-500 p-2 text-center border-red-100 border">
// // //           <Text type="danger" style={{fontSize: '12px'}}>Def Missing</Text>
// // //         </div>
// // //       );
// // //     }

// // //     const config = { ...def.config_template, ...widget.config };

// // //     return (
// // //       <WidgetWrapper loading={wData.loading} error={wData.error} data={wData.data}>
// // //         {def.widget_type === 'kpi' && <KPIWidget data={wData.data} config={config} />}
// // //         {def.widget_type === 'line_chart' && <BaseChart type="scatter" data={wData.data} config={config} />}
// // //         {def.widget_type === 'bar_chart' && <BaseChart type="bar" data={wData.data} config={config} />}
// // //         {def.widget_type === 'pie_chart' && <BaseChart type="pie" data={wData.data} config={config} />}
// // //         {def.widget_type === 'table' && <TableWidget data={wData.data} config={config} />}
// // //       </WidgetWrapper>
// // //     );
// // //   };

// // //   return (
// // //     <div className="dashboard-canvas bg-gray-50 p-2 sm:p-4 rounded-lg min-h-[80vh]">
// // //       <ResponsiveGridLayout
// // //         className="layout"
        
// // //         // 3. SMART BREAKPOINTS & COLUMNS
// // //         // md (iPad Landscape) is set to 12 cols to match Desktop. This fixes the "Scattering".
// // //         // sm (iPad Portrait) is 6 cols.
// // //         // xs (Mobile) is 1 col for a clean stack.
// // //         breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
// // //         cols={{ lg: 12, md: 12, sm: 6, xs: 1, xxs: 1 }}
        
// // //         // 4. SELECTIVE LAYOUT INJECTION
// // //         // We ONLY pass the explicit layout for 'lg' and 'md'.
// // //         // We deliberately OMIT 'sm', 'xs', 'xxs'. 
// // //         // This forces the library to auto-generate a packed layout for mobile based on DOM order,
// // //         // fixing the "Gaps" and "Half-displayed" issues.
// // //         layouts={{ lg: masterLayout, md: masterLayout }}
        
// // //         rowHeight={60}
        
// // //         // Interactions
// // //         isDraggable={isEditMode}
// // //         isResizable={isEditMode}
// // //         draggableHandle=".drag-handle"
        
// // //         // Handlers
// // //         onLayoutChange={handleRGLChange}
// // //         onBreakpointChange={(newBreakpoint) => setCurrentBreakpoint(newBreakpoint)}
        
// // //         // Visuals
// // //         margin={[16, 16]}
// // //         containerPadding={[0, 0]}
// // //         useCSSTransforms={true}
// // //       >
// // //         {widgets.map(widget => (
// // //           <div key={widget.id} className="bg-white shadow-sm rounded-lg border flex flex-col overflow-hidden hover:shadow-md transition-shadow">
// // //             {/* Widget Header */}
// // //             <div className={`flex justify-between items-center px-3 border-b bg-white z-10 shrink-0 ${isEditMode ? 'cursor-move drag-handle bg-gray-50' : ''}`} style={{ height: '40px' }}>
// // //               <div className="flex items-center gap-2 overflow-hidden">
// // //                 {isEditMode && <DragOutlined className="text-gray-400" />}
// // //                 <Text strong className="truncate select-none text-xs sm:text-sm">{widget.title}</Text>
// // //               </div>
              
// // //               {isEditMode && (
// // //                 <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
// // //                    <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => onEditWidget(widget)}/>
// // //                    <Popconfirm title="Delete?" onConfirm={() => onRemoveWidget(widget.id)} okText="Yes" cancelText="No">
// // //                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
// // //                    </Popconfirm>
// // //                 </div>
// // //               )}
// // //             </div>
            
// // //             {/* Widget Body */}
// // //             <div className="flex-1 p-2 overflow-hidden relative h-full w-full">
// // //                {renderWidgetContent(widget)}
// // //             </div>
// // //           </div>
// // //         ))}
// // //       </ResponsiveGridLayout>
// // //     </div>
// // //   );
// // // };

// // // export default DashboardCanvas;

// // import React, { useMemo, useState } from 'react';
// // import { Responsive, WidthProvider } from 'react-grid-layout';
// // import { Button, Popconfirm, Typography } from 'antd';
// // import { DeleteOutlined, SettingOutlined, DragOutlined } from '@ant-design/icons';
// // import { WidgetWrapper, BaseChart, KPIWidget, TableWidget } from './WidgetRenderers';
// // import _ from 'lodash';

// // import 'react-grid-layout/css/styles.css';
// // import 'react-resizable/css/styles.css';

// // const ResponsiveGridLayout = WidthProvider(Responsive);
// // const { Text } = Typography;

// // interface DashboardCanvasProps {
// //   widgets: any[];
// //   widgetData: any;
// //   widgetDefinitions: any;
// //   isEditMode: boolean;
// //   onLayoutChange: (layout: any) => void;
// //   onRemoveWidget: (id: string) => void;
// //   onEditWidget: (widget: any) => void;
// // }

// // const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
// //   widgets,
// //   widgetData,
// //   widgetDefinitions,
// //   isEditMode,
// //   onLayoutChange,
// //   onRemoveWidget,
// //   onEditWidget
// // }) => {
// //   const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');

// //   // --- SMART LAYOUT GENERATOR ---
// //   const layouts = useMemo(() => {
// //     // 1. Desktop (lg): Strict fidelity to what is saved in DB
// //     const lg = widgets.map(w => ({
// //       i: String(w.id), 
// //       x: w.position?.x || 0,
// //       y: w.position?.y || 0,
// //       w: w.position?.w || 4,
// //       h: w.position?.h || 4,
// //       minW: 2, minH: 2
// //     }));

// //     // 2. Tablet (md): Smart Expansion
// //     // We sort widgets by their Desktop position (Y then X) to ensure flow order
// //     const sortedWidgets = [...widgets].sort((a, b) => {
// //         return (a.position?.y - b.position?.y) || (a.position?.x - b.position?.x);
// //     });

// //     const md = sortedWidgets.map((w, i) => {
// //       // Logic: If a widget is small (less than half screen) on desktop, 
// //       // expand it to half-screen (6 cols) on tablet.
// //       // If it's already half-screen or more, make it full width (12 cols).
// //       const currentW = w.position?.w || 4;
// //       const smartW = currentW <= 4 ? 6 : 12; // 3-per-row becomes 2-per-row

// //       return {
// //         i: String(w.id),
// //         x: (i % 2) * 6, // Simple alternating placement (0, 6, 0, 6...)
// //         y: Infinity,    // Infinity tells RGL to auto-compact to the next available spot
// //         w: smartW,
// //         h: w.position?.h || 4,
// //         minW: 2, minH: 2
// //       };
// //     });

// //     // 3. Mobile (sm/xs): Full width stack
// //     const sm = sortedWidgets.map((w, i) => ({
// //       i: String(w.id),
// //       x: 0,
// //       y: i, // Stack vertically based on sort order
// //       w: 12, // Full width
// //       h: w.position?.h || 4,
// //       minW: 2, minH: 2
// //     }));

// //     return { lg, md, sm, xs: sm, xxs: sm };
// //   }, [widgets]);


// //   const handleRGLChange = (currentLayout: any[]) => {
// //     // PROTECTION: Only allow saving if we are in Desktop view.
// //     // This prevents the auto-generated "Smart" layouts from overwriting 
// //     // your carefully crafted Desktop design in the database.
// //     if (currentBreakpoint === 'lg') {
// //        if (currentLayout && currentLayout.length > 0) {
// //          onLayoutChange(currentLayout);
// //        }
// //     }
// //   };

// //   const renderWidgetContent = (widget: any) => {
// //     const def = widgetDefinitions[widget.definitionId];
// //     const wData = widgetData[widget.id] || { loading: false, data: null, error: null };
    
// //     if (!def) {
// //       return (
// //         <div className="h-full flex flex-col justify-center items-center bg-red-50 text-red-500 p-2 text-center border-red-100 border">
// //           <Text type="danger" style={{fontSize: '12px'}}>Def Missing</Text>
// //         </div>
// //       );
// //     }

// //     const config = { ...def.config_template, ...widget.config };

// //     return (
// //       <WidgetWrapper loading={wData.loading} error={wData.error} data={wData.data}>
// //         {def.widget_type === 'kpi' && <KPIWidget data={wData.data} config={config} />}
// //         {def.widget_type === 'line_chart' && <BaseChart type="scatter" data={wData.data} config={config} />}
// //         {def.widget_type === 'bar_chart' && <BaseChart type="bar" data={wData.data} config={config} />}
// //         {def.widget_type === 'pie_chart' && <BaseChart type="pie" data={wData.data} config={config} />}
// //         {def.widget_type === 'table' && <TableWidget data={wData.data} config={config} />}
// //       </WidgetWrapper>
// //     );
// //   };

// //   return (
// //     <div className="dashboard-canvas bg-gray-50 p-2 sm:p-4 rounded-lg min-h-[80vh]">
// //       <ResponsiveGridLayout
// //         className="layout"
        
// //         // BREAKPOINTS
// //         // lg: Desktop (1200px+)
// //         // md: iPad Landscape / Small Laptop (996px+)
// //         // sm: iPad Portrait (768px+)
// //         breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        
// //         // COLUMNS
// //         // We keep 12 columns for lg and md to allow the 50% split logic (6/12) to work.
// //         cols={{ lg: 12, md: 12, sm: 12, xs: 1, xxs: 1 }}
        
// //         // LAYOUTS injected from our Smart Generator
// //         layouts={layouts}
        
// //         rowHeight={60}
        
// //         isDraggable={isEditMode}
// //         isResizable={isEditMode}
// //         draggableHandle=".drag-handle"
        
// //         onLayoutChange={handleRGLChange}
// //         onBreakpointChange={(newBreakpoint) => setCurrentBreakpoint(newBreakpoint)}
        
// //         margin={[16, 16]}
// //         containerPadding={[0, 0]}
// //         useCSSTransforms={true}
// //       >
// //         {widgets.map(widget => (
// //           <div key={widget.id} className="bg-white shadow-sm rounded-lg border flex flex-col overflow-hidden hover:shadow-md transition-shadow">
// //             <div className={`flex justify-between items-center px-3 border-b bg-white z-10 shrink-0 ${isEditMode ? 'cursor-move drag-handle bg-gray-50' : ''}`} style={{ height: '40px' }}>
// //               <div className="flex items-center gap-2 overflow-hidden">
// //                 {isEditMode && <DragOutlined className="text-gray-400" />}
// //                 <Text strong className="truncate select-none text-xs sm:text-sm">{widget.title}</Text>
// //               </div>
              
// //               {isEditMode && (
// //                 <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
// //                    <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => onEditWidget(widget)}/>
// //                    <Popconfirm title="Delete?" onConfirm={() => onRemoveWidget(widget.id)} okText="Yes" cancelText="No">
// //                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
// //                    </Popconfirm>
// //                 </div>
// //               )}
// //             </div>
// //             <div className="flex-1 p-2 overflow-hidden relative h-full w-full">
// //                {renderWidgetContent(widget)}
// //             </div>
// //           </div>
// //         ))}
// //       </ResponsiveGridLayout>
// //     </div>
// //   );
// // };

// // export default DashboardCanvas;
// // 
// // ABOVE SMART LAYOUT INSTEAD OF VARIOUS CONFIGS FOR LG< MD< SM< DIDNT WORK
// // NOW USING BIN PACKING LOGIC
// import React, { useMemo, useState } from 'react';
// import { Responsive, WidthProvider } from 'react-grid-layout';
// import { Button, Popconfirm, Typography } from 'antd';
// import { DeleteOutlined, SettingOutlined, DragOutlined } from '@ant-design/icons';
// import { WidgetWrapper, BaseChart, KPIWidget, TableWidget } from './WidgetRenderers';
// import _ from 'lodash';

// import 'react-grid-layout/css/styles.css';
// import 'react-resizable/css/styles.css';

// const ResponsiveGridLayout = WidthProvider(Responsive);
// const { Text } = Typography;

// interface DashboardCanvasProps {
//   widgets: any[];
//   widgetData: any;
//   widgetDefinitions: any;
//   isEditMode: boolean;
//   onLayoutChange: (layout: any) => void;
//   onRemoveWidget: (id: string) => void;
//   onEditWidget: (widget: any) => void;
// }

// const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
//   widgets,
//   widgetData,
//   widgetDefinitions,
//   isEditMode,
//   onLayoutChange,
//   onRemoveWidget,
//   onEditWidget
// }) => {
//   const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');

//   // --- THE SMART LAYOUT ENGINE ---
//   const layouts = useMemo(() => {
//     // 1. Clean & Sort Widgets (Row by Row, then Left to Right)
//     // This ensures we process them in the visual order the user sees
//     const sortedWidgets = [...widgets].sort((a, b) => {
//       // Tolerance of 0.5 to handle slight misalignments in Y
//       if (Math.abs((a.position?.y || 0) - (b.position?.y || 0)) > 0.5) {
//         return (a.position?.y || 0) - (b.position?.y || 0);
//       }
//       return (a.position?.x || 0) - (b.position?.x || 0);
//     });

//     // 2. Desktop (lg): Exact fidelity to DB
//     const lg = widgets.map(w => ({
//       i: String(w.id), 
//       x: w.position?.x || 0,
//       y: w.position?.y || 0,
//       w: w.position?.w || 4,
//       h: w.position?.h || 4,
//       minW: 2, minH: 2
//     }));

//     // 3. Smart Layout Generator
//     // Goal: Fit widgets into 12 columns, but expand them slightly to fill gaps
//     const generateSmartLayout = (baseWidgets: any[], expansionFactor: number) => {
//       let currentRowY = 0;
//       let currentX = 0;
      
//       return baseWidgets.map((w) => {
//         const originalW = w.position?.w || 4;
        
//         // SMART WIDTH CALCULATION
//         // Map desktop widths to tablet widths
//         let newW = originalW;
        
//         if (originalW <= 2) newW = 3;       // 6 items/row -> 4 items/row
//         else if (originalW === 3) newW = 4; // 4 items/row -> 3 items/row
//         else if (originalW === 4) newW = 6; // 3 items/row -> 2 items/row
//         else if (originalW > 4 && originalW < 12) newW = 12; // Medium items -> Full width
//         else newW = 12; // Large items -> Full width

//         // Check if this widget fits in the current row
//         if (currentX + newW > 12) {
//           // Move to next row
//           currentX = 0;
//           currentRowY += (w.position?.h || 4); // Approximate height increment
//         }

//         const item = {
//           i: String(w.id),
//           x: currentX,
//           y: Infinity, // Let RGL compact it upwards, but we provide X to guide order
//           w: newW,
//           h: w.position?.h || 4,
//           minW: 2, minH: 2
//         };

//         // Advance X cursor
//         currentX += newW;
        
//         return item;
//       });
//     };

//     // Generate MD (Laptop/iPad Landscape) layout
//     const md = generateSmartLayout(sortedWidgets, 1.5);

//     // Generate SM (iPad Portrait) layout - More aggressive expansion
//     // Here we force almost everything to be half-width (6) or full-width (12)
//     const sm = sortedWidgets.map(w => {
//         const originalW = w.position?.w || 4;
//         const isSmall = originalW <= 4;
//         return {
//             i: String(w.id),
//             x: 0, // Let RGL handle x placement based on width
//             y: Infinity,
//             w: isSmall ? 6 : 12, // Force 2-col grid
//             h: w.position?.h || 4,
//             minW: 2, minH: 2
//         };
//     });

//     // Mobile: Stack
//     const xs = sortedWidgets.map((w, i) => ({
//       i: String(w.id),
//       x: 0,
//       y: i,
//       w: 12,
//       h: w.position?.h || 4,
//       minW: 2, minH: 2
//     }));

//     return { lg, md, sm, xs, xxs: xs };
//   }, [widgets]);


//   const handleRGLChange = (currentLayout: any[]) => {
//     // PROTECTION: Only save if we are in the "lg" (High Res) view.
//     // We moved "lg" to 1400px to ensure most laptops use the Smart Layout (md),
//     // so we only allow editing/saving on large monitors to preserve the "Master" design.
//     if (currentBreakpoint === 'lg') {
//        if (currentLayout && currentLayout.length > 0) {
//          onLayoutChange(currentLayout);
//        }
//     }
//   };

//   const renderWidgetContent = (widget: any) => {
//     const def = widgetDefinitions[widget.definitionId];
//     const wData = widgetData[widget.id] || { loading: false, data: null, error: null };
    
//     if (!def) {
//       return (
//         <div className="h-full flex flex-col justify-center items-center bg-red-50 text-red-500 p-2 text-center border-red-100 border">
//           <Text type="danger" style={{fontSize: '10px'}}>Def Missing</Text>
//         </div>
//       );
//     }

//     const config = { ...def.config_template, ...widget.config };

//     return (
//       <WidgetWrapper loading={wData.loading} error={wData.error} data={wData.data}>
//         {def.widget_type === 'kpi' && <KPIWidget data={wData.data} config={config} />}
//         {def.widget_type === 'line_chart' && <BaseChart type="scatter" data={wData.data} config={config} />}
//         {def.widget_type === 'bar_chart' && <BaseChart type="bar" data={wData.data} config={config} />}
//         {def.widget_type === 'pie_chart' && <BaseChart type="pie" data={wData.data} config={config} />}
//         {def.widget_type === 'table' && <TableWidget data={wData.data} config={config} />}
//       </WidgetWrapper>
//     );
//   };

//   return (
//     <div className="dashboard-canvas bg-gray-50 p-2 sm:p-4 rounded-lg min-h-[80vh]">
//       <ResponsiveGridLayout
//         className="layout"
        
//         // --- ADJUSTED BREAKPOINTS ---
//         // lg: 1400+ (Desktop Monitors) -> USES DB LAYOUT
//         // md: 900 - 1399 (Laptops, iPad Pro Landscape) -> USES SMART LAYOUT 1 (3 or 2 cols)
//         // sm: 600 - 899 (Tablets Portrait) -> USES SMART LAYOUT 2 (2 cols strict)
//         // xs: < 600 (Mobile) -> USES 1 COL STACK
//         breakpoints={{ lg: 1400, md: 900, sm: 600, xs: 480, xxs: 0 }}
        
//         // All desktop/tablet views utilize 12 columns for granular spacing
//         cols={{ lg: 12, md: 12, sm: 12, xs: 1, xxs: 1 }}
        
//         layouts={layouts}
//         rowHeight={60}
        
//         isDraggable={isEditMode && currentBreakpoint === 'lg'} // Only allow drag on Master View
//         isResizable={isEditMode && currentBreakpoint === 'lg'} // Only allow resize on Master View
//         draggableHandle=".drag-handle"
        
//         onLayoutChange={handleRGLChange}
//         onBreakpointChange={setCurrentBreakpoint}
        
//         margin={[16, 16]}
//         containerPadding={[0, 0]}
//         useCSSTransforms={true}
//         compactType="vertical" // Ensures widgets float up to fill blank spaces
//       >
//         {widgets.map(widget => (
//           <div key={widget.id} className="bg-white shadow-sm rounded-lg border flex flex-col overflow-hidden hover:shadow-md transition-shadow">
//             <div className={`flex justify-between items-center px-3 border-b bg-white z-10 shrink-0 ${isEditMode && currentBreakpoint === 'lg' ? 'cursor-move drag-handle bg-gray-50' : ''}`} style={{ height: '40px' }}>
//               <div className="flex items-center gap-2 overflow-hidden">
//                 {isEditMode && currentBreakpoint === 'lg' && <DragOutlined className="text-gray-400" />}
//                 <Text strong className="truncate select-none text-xs sm:text-sm">{widget.title}</Text>
//               </div>
              
//               {isEditMode && currentBreakpoint === 'lg' && (
//                 <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
//                    <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => onEditWidget(widget)}/>
//                    <Popconfirm title="Delete?" onConfirm={() => onRemoveWidget(widget.id)} okText="Yes" cancelText="No">
//                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
//                    </Popconfirm>
//                 </div>
//               )}
//             </div>
//             <div className="flex-1 p-2 overflow-hidden relative h-full w-full">
//                {renderWidgetContent(widget)}
//             </div>
//           </div>
//         ))}
//       </ResponsiveGridLayout>
//     </div>
//   );
// };
import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Button, Popconfirm, Typography, Badge } from 'antd';
import { DeleteOutlined, SettingOutlined, DragOutlined, TabletOutlined, DesktopOutlined, MobileOutlined } from '@ant-design/icons';
import { WidgetWrapper, BaseChart, KPIWidget, TableWidget } from './WidgetRenderers';
import _ from 'lodash';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
const { Text } = Typography;

interface DashboardCanvasProps {
  widgets: any[];
  widgetData: any;
  widgetDefinitions: any;
  isEditMode: boolean;
  onLayoutChange: (allLayouts: any) => void;
  onRemoveWidget: (id: string) => void;
  onEditWidget: (widget: any) => void;
}

const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
  widgets,
  widgetData,
  widgetDefinitions,
  isEditMode,
  onLayoutChange,
  onRemoveWidget,
  onEditWidget
}) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');
  const [layouts, setLayouts] = useState<any>({ lg: [], md: [], sm: [], xs: [], xxs: [] });

  // --- INITIALIZATION & SMART INHERITANCE ---
  useEffect(() => {
    const generateLayouts = () => {
      const lg: any[] = [];
      const md: any[] = [];
      const sm: any[] = [];
      const xs: any[] = []; // Large Phone / Small Tablet (approx 480px - 768px)
      const xxs: any[] = []; // Tiny Phone (< 480px)

      const sortedWidgets = [...widgets].sort((a, b) => {
         const yA = a.layouts?.lg?.y ?? a.position?.y ?? 0;
         const yB = b.layouts?.lg?.y ?? b.position?.y ?? 0;
         return yA - yB;
      });

      sortedWidgets.forEach((w, i) => {
        const id = String(w.id);
        const lgW = w.layouts?.lg?.w ?? w.position?.w ?? 4;
        const lgH = w.layouts?.lg?.h ?? w.position?.h ?? 4;

        // -- DESKTOP (lg) --
        lg.push({
          i: id,
          x: w.layouts?.lg?.x ?? w.position?.x ?? 0,
          y: w.layouts?.lg?.y ?? w.position?.y ?? 0,
          w: lgW,
          h: lgH,
          minW: 2, minH: 2
        });

        // -- LAPTOP (md) --
        if (w.layouts?.md) {
          md.push({ i: id, ...w.layouts.md, minW: 2, minH: 2 });
        } else {
          md.push({ i: id, x: 0, y: Infinity, w: lgW, h: lgH, minW: 2, minH: 2 });
        }

        // -- TABLET PORTRAIT (sm) --
        if (w.layouts?.sm) {
           sm.push({ i: id, ...w.layouts.sm, minW: 2, minH: 2 });
        } else {
           // Default to full width (12) or half (6) based on size
           sm.push({ i: id, x: 0, y: i, w: 12, h: lgH, minW: 2, minH: 2 });
        }

        // -- LARGE PHONE / SMALL TABLET (xs) -- 
        // We use 6 columns here to allow resizing
        if (w.layouts?.xs) {
           xs.push({ i: id, ...w.layouts.xs, minW: 2, minH: 2 });
        } else {
           // Default to full width (6 out of 6)
           // But since cols=6, the user can resize this to width 3 (50%)
           xs.push({ i: id, x: 0, y: i, w: 6, h: lgH, minW: 2, minH: 2 });
        }

        // -- TINY PHONE (xxs) --
        // Locked to 1 column, no resizing width
        if (w.layouts?.xxs) {
          xxs.push({ i: id, ...w.layouts.xxs, minW: 1, minH: 2 });
        } else {
          xxs.push({ i: id, x: 0, y: i, w: 1, h: lgH, minW: 1, minH: 2 });
        }
      });

      return { lg, md, sm, xs, xxs };
    };

    const newLayouts = generateLayouts();

    if (!_.isEqual(newLayouts, layouts)) {
      setLayouts(newLayouts);
    }
  }, [widgets, layouts]);

  const handleLayoutChange = (currentLayout: any[], allLayouts: any) => {
    setLayouts(allLayouts);
    onLayoutChange(allLayouts);
  };

  const getBreakpointIcon = () => {
    switch(currentBreakpoint) {
      case 'lg': return <DesktopOutlined />;
      case 'md': return <TabletOutlined rotate={90} />;
      case 'sm': return <TabletOutlined />;
      case 'xs': return <MobileOutlined />; // 700px falls here
      default: return <MobileOutlined style={{ opacity: 0.5 }} />;
    }
  };

  const renderWidgetContent = (widget: any) => {
    const def = widgetDefinitions[widget.definitionId];
    const wData = widgetData[widget.id] || { loading: false, data: null, error: null };
    
    if (!def) return <div className="p-2 text-red-500 text-xs">Def Missing</div>;
    const config = { ...def.config_template, ...widget.config };

    return (
      <WidgetWrapper loading={wData.loading} error={wData.error} data={wData.data}>
        {def.widget_type === 'kpi' && <KPIWidget data={wData.data} config={config} />}
        {def.widget_type === 'line_chart' && <BaseChart type="scatter" data={wData.data} config={config} />}
        {def.widget_type === 'bar_chart' && <BaseChart type="bar" data={wData.data} config={config} />}
        {def.widget_type === 'pie_chart' && <BaseChart type="pie" data={wData.data} config={config} />}
        {def.widget_type === 'table' && <TableWidget data={wData.data} config={config} />}
      </WidgetWrapper>
    );
  };

  return (
    <div className="relative">
      {isEditMode && (
        <div className="absolute -top-10 right-0 z-10">
          <Badge count={currentBreakpoint.toUpperCase()} style={{ backgroundColor: '#52c41a' }}>
             <Button shape="circle" icon={getBreakpointIcon()} />
          </Badge>
        </div>
      )}

      <div className="dashboard-canvas bg-gray-50 p-2 sm:p-4 rounded-lg min-h-[80vh]">
        <ResponsiveGridLayout
          className="layout"
          // BREAKPOINTS
          // lg: 1200+ 
          // md: 996 - 1200
          // sm: 768 - 996 (Tablet Portrait)
          // xs: 480 - 768 (Large Phone / Small Tablet - This is your ~700px)
          // xxs: < 480 (Tiny Phone)
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          
          // COLUMNS - THE FIX
          // lg, md, sm: 12 cols (Standard)
          // xs: 6 cols (Allows 50% split or 100% width, enables resizing)
          // xxs: 1 col (Locked stack)
          cols={{ lg: 12, md: 12, sm: 12, xs: 6, xxs: 1 }}
          
          layouts={layouts}
          rowHeight={60}
          
          isDraggable={isEditMode}
          isResizable={isEditMode}
          draggableHandle=".drag-handle"
          
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={setCurrentBreakpoint}
          
          margin={[10, 10]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
        >
          {widgets.map(widget => (
            <div key={widget.id} className="bg-white shadow-sm rounded-lg border flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              <div className={`flex justify-between items-center px-3 border-b bg-white z-10 shrink-0 ${isEditMode ? 'cursor-move drag-handle bg-gray-50' : ''}`} style={{ height: '40px' }}>
                <div className="flex items-center gap-2 overflow-hidden">
                  {isEditMode && <DragOutlined className="text-gray-400" />}
                  <Text strong className="truncate select-none text-xs sm:text-sm">{widget.title}</Text>
                </div>
                
                {isEditMode && (
                  <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
                     <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => onEditWidget(widget)}/>
                     <Popconfirm title="Delete?" onConfirm={() => onRemoveWidget(widget.id)} okText="Yes" cancelText="No">
                       <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                     </Popconfirm>
                  </div>
                )}
              </div>
              <div className="flex-1 p-2 overflow-hidden relative h-full w-full">
                 {renderWidgetContent(widget)}
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
};

export default DashboardCanvas;