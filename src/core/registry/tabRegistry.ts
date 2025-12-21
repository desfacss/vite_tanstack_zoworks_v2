
import { registry } from './index';
import { TabDefinition } from './types';

export const registerTab = (tab: TabDefinition) => {
    registry.registerTab(tab);
};

export const getTabsForEntity = (entityType: string) => {
    return registry.getTabsForEntity(entityType);
};
