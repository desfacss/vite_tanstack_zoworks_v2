import { useState, useEffect, useCallback } from 'react';
import { Select, Button, message, Drawer, Empty, Card } from 'antd';
import { Save, Plus, Pencil, Eye, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/lib/store';
import { supabase } from '../lib/supabase';
import DashboardCanvas from './DashboardCanvas';
import keyBy from 'lodash/keyBy';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import map from 'lodash/map';
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
        setWidgetDefinitions(keyBy(defs, 'id'));

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
    if (currentDashboard?.widgets && !isEmpty(widgetDefinitions)) {
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

      if (!isEqual(prev.widgets, updatedWidgets)) {
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

  if (loading && !currentDashboard) {
    return (
      <div className="space-y-4 entry-animate">
        {/* Shimmer Header */}
        <div className="h-14 w-full content-shimmer rounded-lg" />

        {/* Shimmer Content */}
        <div className="layout-canvas">
          <div className="content-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 w-full content-shimmer rounded-[var(--tenant-border-radius,12px)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content layout-canvas">
      {/* Page Header - Action Bar */}
      <PageActionBar>
        <ActionBarLeft>
          <Select
            value={currentDashboard?.id}
            style={{ width: 220 }}
            onChange={(id) => {
              const d = dashboards.find(x => x.id === id);
              if (d) setCurrentDashboard(d);
            }}
            disabled={isEditMode}
            className="shadow-sm overflow-hidden"
          >
            {dashboards.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
          </Select>
          {isDirty && <span className="hidden lg:inline-block text-amber-500 text-xs font-bold animate-pulse whitespace-nowrap">● {t('common.message.unsaved_changes')}</span>}
        </ActionBarLeft>

        <ActionBarRight>
          {!isEditMode ? (
            <>
              <Button
                variant="outlined"
                icon={<RefreshCw size={16} />}
                onClick={() => fetchMetricData(currentDashboard?.widgets || [], true)}
                className="hover:scale-105 transition-transform"
                style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
              >
                {t('common.action.refresh')}
              </Button>
              <PrimaryAction
                label={t('common.action.design')}
                icon={<Pencil size={16} />}
                onClick={() => { setIsEditMode(true); setIsLibraryOpen(true); }}
              />
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                icon={<Eye size={16} />}
                onClick={() => {
                  const original = dashboards.find(d => d.id === currentDashboard.id);
                  setCurrentDashboard(original);
                  setIsEditMode(false);
                  setIsDirty(false);
                }}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('common.action.cancel')}
              </Button>
              <Button
                variant="outlined"
                icon={<Plus size={16} />}
                onClick={() => setIsLibraryOpen(true)}
                style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
              >
                {t('common.action.add_widget')}
              </Button>
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

      {/* Main Content Area - Canvas layout */}
      <div className="page-card page-card-flush">
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

      <Drawer
        title={t('common.action.add_widget')}
        placement="right"
        open={isEditMode && isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        mask={false}
        width={320}
      >
        <div className="space-y-3">
          {map(widgetDefinitions, (def) => (
            <Card
              key={def.id}
              size="small"
              hoverable
              className="cursor-pointer border-l-4 border-l-transparent hover:border-l-[var(--color-primary)] bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
              onClick={() => addWidget(def.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">{def.name}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{def.widget_type}</div>
                </div>
                <Plus size={16} style={{ color: 'var(--color-primary)' }} />
              </div>
            </Card>
          ))}
        </div>
      </Drawer>
    </div>
  );

};

export default DashboardPage;