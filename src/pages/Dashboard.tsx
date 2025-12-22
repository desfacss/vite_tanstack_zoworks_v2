import { useState, useEffect, useCallback } from 'react';
import { Select, Button, message, Drawer, Empty, Spin, Card } from 'antd';
import { Save, Plus, Pencil, Eye, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/lib/store';
import { supabase } from '../lib/supabase';
import DashboardCanvas from './DashboardCanvas';
import _ from 'lodash';
import {
  PageActionBar,
  ActionBarLeft,
  ActionBarRight,
  PrimaryAction,
} from '@/core/components/ActionBar';

const { Option } = Select;



const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const organization = useAuthStore((state) => state.organization);
  const location = useAuthStore((state) => state.location);

  const [dashboards, setDashboards] = useState<any[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<any | null>(null);
  const [widgetDefinitions, setWidgetDefinitions] = useState<any>({});
  const [widgetData, setWidgetData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Init
  useEffect(() => {
    if (!organization?.id) return;
    const init = async () => {
      setLoading(true);
      try {
        const { data: defs } = await supabase.schema('core').from('widget_definitions').select('*').eq('is_active', true);
        setWidgetDefinitions(_.keyBy(defs, 'id'));

        const { data: dashData } = await supabase.schema('core').from('user_dashboards').select('*');
        if (dashData && dashData.length > 0) {
          setDashboards(dashData);
          const defaultDash = dashData.find(d => d.name === 'Operations Command Center') || dashData[0];
          setCurrentDashboard(defaultDash);
        }
      } catch (e) {
        message.error(t('common.message.error'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [organization?.id]);

  // 2. Data Fetching
  const fetchMetricData = useCallback(async (widgets: any[], forceRefresh = false) => {
    if (!organization?.id || !widgets?.length) return;
    if (forceRefresh) setLoading(true);

    const promises = widgets.map(async (widget) => {
      const def = widgetDefinitions[widget.definitionId];
      if (!def) return;
      try {
        const { data, error } = await supabase
          .schema('analytics')
          .rpc('fn_get_or_calc_metric_data_v4', {
            p_view_name: def.entity_type,
            p_org_id: organization.id,
            p_loc_id: location?.id,
            p_force_refresh: forceRefresh
          });
        setWidgetData((prev: any) => ({
          ...prev,
          [widget.id]: { data: data?.data || [], loading: false, error: error?.message }
        }));
      } catch (e: any) { console.error(e); }
    });

    await Promise.all(promises);
    if (forceRefresh) setLoading(false);
  }, [organization, location, widgetDefinitions]);

  useEffect(() => {
    if (currentDashboard?.widgets && !_.isEmpty(widgetDefinitions)) {
      fetchMetricData(currentDashboard.widgets);
    }
  }, [currentDashboard?.id, widgetDefinitions, location]);

  // 3. Layout Handler
  const handleLayoutChange = (allLayouts: any) => {
    if (!currentDashboard || !isEditMode) return;

    setCurrentDashboard((prev: any) => {
      const updatedWidgets = prev.widgets.map((widget: any) => {
        const newLayouts: any = { ...(widget.layouts || {}) };

        Object.keys(allLayouts).forEach(breakpoint => {
          const item = allLayouts[breakpoint].find((l: any) => String(l.i) === String(widget.id));
          if (item) {
            newLayouts[breakpoint] = {
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h
            };
          }
        });

        const lgItem = allLayouts.lg?.find((l: any) => String(l.i) === String(widget.id));
        const basePos = lgItem ? { x: lgItem.x, y: lgItem.y, w: lgItem.w, h: lgItem.h } : widget.position;

        return {
          ...widget,
          position: basePos,
          layouts: newLayouts
        };
      });

      if (!_.isEqual(prev.widgets, updatedWidgets)) {
        setIsDirty(true);
        return { ...prev, widgets: updatedWidgets };
      }
      return prev;
    });
  };

  // 4. Save Handler
  const handleSave = async () => {
    if (!currentDashboard) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .schema('core')
        .from('user_dashboards')
        .update({
          widgets: currentDashboard.widgets,
          updated_at: new Date()
        })
        .eq('id', currentDashboard.id);

      if (error) throw error;

      setDashboards(prev => prev.map(d => d.id === currentDashboard.id ? { ...d, widgets: currentDashboard.widgets } : d));
      message.success(t('common.message.save_success'));
      setIsDirty(false);
      setIsEditMode(false);
    } catch (e: any) {
      message.error(`${t('common.message.save_failed')}: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Widget Actions
  const addWidget = (defId: string) => {
    const def = widgetDefinitions[defId];
    if (!currentDashboard || !def) return;

    const maxY = Math.max(0, ...currentDashboard.widgets.map((w: any) => (w.position?.y || 0) + (w.position?.h || 0)));

    const newWidget = {
      id: `w-${Date.now()}`,
      definitionId: defId,
      title: def.name,
      position: { x: 0, y: maxY, w: 4, h: 4 },
      layouts: {
        lg: { x: 0, y: maxY, w: 4, h: 4 },
        md: { x: 0, y: maxY, w: 4, h: 4 },
        sm: { x: 0, y: maxY, w: 12, h: 4 }
      },
      config: {}
    };

    const newWidgets = [...currentDashboard.widgets, newWidget];
    setCurrentDashboard({ ...currentDashboard, widgets: newWidgets });
    setIsDirty(true);
    fetchMetricData([newWidget]);
    message.success(t('common.message.widget_added'));
  };

  const removeWidget = (widgetId: string) => {
    setCurrentDashboard((prev: any) => ({
      ...prev,
      widgets: prev.widgets.filter((w: any) => w.id !== widgetId)
    }));
    setIsDirty(true);
  };

  if (loading && !currentDashboard) return <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]"><Spin size="large" /></div>;

  return (
    <>
      {/* Page Header - Action Bar */}
      <PageActionBar>
        <ActionBarLeft>
          <Select
            value={currentDashboard?.id}
            style={{ width: 200 }}
            onChange={(id) => {
              const d = dashboards.find(x => x.id === id);
              if (d) setCurrentDashboard(d);
            }}
            disabled={isEditMode}
          >
            {dashboards.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
          </Select>
          {isDirty && <span className="hidden sm:inline-block text-amber-600 text-xs font-bold">● {t('common.message.unsaved_changes')}</span>}
        </ActionBarLeft>

        <ActionBarRight>
          {!isEditMode ? (
            <>
              <Button icon={<RefreshCw size={16} />} onClick={() => fetchMetricData(currentDashboard?.widgets || [], true)}>{t('common.action.refresh')}</Button>
              <PrimaryAction
                label={t('common.action.design')}
                icon={<Pencil size={16} />}
                onClick={() => { setIsEditMode(true); setIsLibraryOpen(true); }}
              />
            </>
          ) : (
            <>
              <Button icon={<Eye size={16} />} onClick={() => {
                const original = dashboards.find(d => d.id === currentDashboard.id);
                setCurrentDashboard(original);
                setIsEditMode(false);
                setIsDirty(false);
              }}>{t('common.action.cancel')}</Button>
              <Button icon={<Plus size={16} />} onClick={() => setIsLibraryOpen(true)}>{t('common.action.add_widget')}</Button>
              <PrimaryAction
                label={t('common.action.save')}
                icon={<Save size={16} />}
                onClick={handleSave}
                loading={saving}
              />
            </>
          )}
        </ActionBarRight>
      </PageActionBar>


      {/* Main Content - White Card */}
      <div className="main-content">
        <div className="content-body">
          {currentDashboard ? (
            <DashboardCanvas
              widgets={currentDashboard.widgets || []}
              widgetData={widgetData}
              widgetDefinitions={widgetDefinitions}
              isEditMode={isEditMode}
              onLayoutChange={handleLayoutChange}
              onRemoveWidget={removeWidget}
              onEditWidget={(w) => console.log(w)}
            />
          ) : (
            <Empty description={t('common.message.no_dashboard_selected')} className="mt-20" />
          )}
        </div>
      </div>

      <Drawer
        title={t('common.action.add_widget')}
        placement="right"
        open={isEditMode && isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        mask={false}
        width={320}
      >
        <div className="space-y-3">
          {_.map(widgetDefinitions, (def) => (
            <Card
              key={def.id}
              size="small"
              hoverable
              className="cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500 bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
              onClick={() => addWidget(def.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">{def.name}</div>
                  <div className="text-xs text-gray-400">{def.widget_type}</div>
                </div>
                <Plus size={16} className="text-blue-500" />
              </div>
            </Card>
          ))}
        </div>
      </Drawer>
    </>
  );

};

export default DashboardPage;