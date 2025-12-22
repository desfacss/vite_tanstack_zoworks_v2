import { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Button, Popconfirm, Typography, Badge } from 'antd';
import { Trash2, Settings, GripVertical, Tablet, Monitor, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');
  const [layouts, setLayouts] = useState<any>({ lg: [], md: [], sm: [], xs: [], xxs: [] });

  // --- INITIALIZATION & SMART INHERITANCE ---
  useEffect(() => {
    const generateLayouts = () => {
      const lg: any[] = [];
      const md: any[] = [];
      const sm: any[] = [];
      const xs: any[] = [];
      const xxs: any[] = [];

      const sortedWidgets = [...widgets].sort((a, b) => {
        const yA = a.layouts?.lg?.y ?? a.position?.y ?? 0;
        const yB = b.layouts?.lg?.y ?? b.position?.y ?? 0;
        return yA - yB;
      });

      sortedWidgets.forEach((w, i) => {
        const id = String(w.id);
        const lgW = w.layouts?.lg?.w ?? w.position?.w ?? 4;
        const lgH = w.layouts?.lg?.h ?? w.position?.h ?? 4;

        lg.push({
          i: id,
          x: w.layouts?.lg?.x ?? w.position?.x ?? 0,
          y: w.layouts?.lg?.y ?? w.position?.y ?? 0,
          w: lgW,
          h: lgH,
          minW: 2, minH: 2
        });

        if (w.layouts?.md) {
          md.push({ i: id, ...w.layouts.md, minW: 2, minH: 2 });
        } else {
          md.push({ i: id, x: 0, y: Infinity, w: lgW, h: lgH, minW: 2, minH: 2 });
        }

        if (w.layouts?.sm) {
          sm.push({ i: id, ...w.layouts.sm, minW: 2, minH: 2 });
        } else {
          sm.push({ i: id, x: 0, y: i, w: 12, h: lgH, minW: 2, minH: 2 });
        }

        if (w.layouts?.xs) {
          xs.push({ i: id, ...w.layouts.xs, minW: 2, minH: 2 });
        } else {
          xs.push({ i: id, x: 0, y: i, w: 6, h: lgH, minW: 2, minH: 2 });
        }

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

  const handleLayoutChange = (_currentLayout: any[], allLayouts: any) => {
    setLayouts(allLayouts);
    onLayoutChange(allLayouts);
  };

  const getBreakpointIcon = () => {
    switch (currentBreakpoint) {
      case 'lg': return <Monitor size={16} />;
      case 'md': return <Tablet size={16} style={{ transform: 'rotate(90deg)' }} />;
      case 'sm': return <Tablet size={16} />;
      case 'xs': return <Smartphone size={16} />;
      default: return <Smartphone size={16} style={{ opacity: 0.5 }} />;
    }
  };

  const renderWidgetContent = (widget: any) => {
    const def = widgetDefinitions[widget.definitionId];
    const wData = widgetData[widget.id] || { loading: false, data: null, error: null };

    if (!def) return <div className="p-2 text-red-500 text-xs">{t('common.message.definition_missing')}</div>;
    const config = { ...def.config_template, ...widget.config };

    return (
      <WidgetWrapper loading={wData.loading} error={wData.error} data={wData.data}>
        {def.widget_type === 'kpi' && <KPIWidget data={wData.data} config={config} />}
        {def.widget_type === 'line_chart' && <BaseChart type="line" data={wData.data} config={config} />}
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

      <div className="dashboard-canvas p-2 sm:p-4 rounded-lg min-h-[80vh] bg-[var(--color-bg-primary)]">
        <ResponsiveGridLayout
          className="layout"
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
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
            <div key={widget.id} className="shadow-sm rounded-lg border flex flex-col overflow-hidden hover:shadow-md transition-shadow bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
              <div className={`flex justify-between items-center px-3 border-b z-10 shrink-0 bg-[var(--color-bg-secondary)] border-[var(--color-border)] ${isEditMode ? 'cursor-move drag-handle opacity-80' : ''}`} style={{ height: '40px' }}>
                <div className="flex items-center gap-2 overflow-hidden">
                  {isEditMode && <GripVertical size={16} className="text-gray-400" />}
                  <Text strong className="truncate select-none text-xs sm:text-sm">{widget.title}</Text>
                </div>

                {isEditMode && (
                  <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
                    <Button type="text" size="small" icon={<Settings size={14} />} onClick={() => onEditWidget(widget)} />
                    <Popconfirm
                      title={t('common.message.delete_confirm')}
                      onConfirm={() => onRemoveWidget(widget.id)}
                      okText={t('common.action.yes')}
                      cancelText={t('common.action.no')}
                    >
                      <Button type="text" danger size="small" icon={<Trash2 size={14} />} />
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