
import React, { useState, lazy, Suspense, useMemo } from 'react';
import { Tabs, Spin } from 'antd';
import StatusTab from './StatusTab';
import NotesTab from './NotesTab';
import DetailOverview from './DetailOverview';
import EntityImages from './EntityImages';
import ActivitiesManager from './ActivitiesManager';
import Logs from './Logs';
import { useNestedContext } from '../../lib/NestedContext';
import { registry } from '@/core/registry';

const DynamicComponent = lazy(() => import('./DynamicTab'));

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
  const { contextStack, closeContext } = useNestedContext();

  const getDefaultTabKey = () => {
    const allTabs = [
      ...(viewConfig?.detailview?.staticTabs || []),
      ...(viewConfig?.detailview?.dynamicTabs || []),
    ];
    if (allTabs.length) {
      const sortedTabs = allTabs.sort((a, b) => Number(a.order) - Number(b.order));
      return sortedTabs[0].label.toLowerCase();
    }
    return 'overview';
  };

  const [activeKey, setActiveKey] = useState<string>(getDefaultTabKey());

  const onChange = (key: string) => {
    setActiveKey(key);
  };

  const tabs = useMemo(() => {
    const generatedTabs: { key: string; label: string; children: React.ReactNode; order: number }[] = [];
    const safeEditItem = editItem || {};

    // 1. Static Components Mapping (Core Only)
    const staticComponentMap: Record<string, { component: React.ComponentType<any>; props: any }> = {
      'Overview': { component: DetailOverview, props: { openMessageModal, data: editItem, viewConfig, config } },
      'Status': { component: StatusTab, props: {} },
      'Notes': { component: NotesTab, props: {} },
      'Files': { component: EntityImages, props: { entity_type: entityType, entity_id: editItem?.id } },
      'Activities': { component: ActivitiesManager, props: { entity_name: entityType, entity_id: editItem?.id } },
      'Logs': { component: Logs, props: { entity_type: entityType, entity_id: editItem?.id } },
    };


    // Process viewConfig-based static tabs
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

    // Process viewConfig-based dynamic tabs
    const processedDynamicTabs = (viewConfig?.detailview?.dynamicTabs || []).map((tabConfig: any) => {
      const tabProps = tabConfig.props || {};
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
              parentRecord={editItem}
              activeTabKey={activeKey}
              config={config}
              rawData={rawData}
            />
          </Suspense>
        ),
      };
    });

    // 2. Registry-based Tabs (The future!)
    const registeredTabs = registry.getTabsForEntity(entityType).map(tabDef => {
      const TabComponent = lazy(tabDef.component);
      return {
        key: tabDef.id,
        label: typeof tabDef.label === 'function' ? tabDef.label((s) => s) : tabDef.label,
        order: tabDef.order || 100,
        children: (
          <Suspense fallback={<Spin />}>
            <TabComponent
              entityId={editItem?.id}
              entityType={entityType}
              data={editItem}
            />
          </Suspense>
        )
      };
    });

    generatedTabs.push(...processedStaticTabs, ...processedDynamicTabs, ...registeredTabs);
    generatedTabs.sort((a, b) => a.order - b.order);
    return generatedTabs;

  }, [editItem, entityType, rawData, openMessageModal, viewConfig, config, activeKey]);

  if (!tabs || tabs.length === 0) {
    return <DetailOverview data={editItem} viewConfig={viewConfig} config={config} />;
  }

  if (tabs.length === 1) {
    return <div style={{ padding: '20px' }}>{tabs[0].children}</div>;
  }

  return (
    <div style={{ padding: '0px', margin: '0px' }}>
      <Tabs activeKey={activeKey} onChange={onChange} items={tabs} />
    </div>
  );
};

export default DetailsView;