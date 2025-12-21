
import {
    ModuleDefinition,
    ActionDefinition,
    TabDefinition,
    ViewTypeDefinition,
    DetailComponentDefinition
} from './types';

class AppRegistry {
    private modules: Map<string, ModuleDefinition> = new Map();
    private actions: Map<string, ActionDefinition[]> = new Map();
    private tabs: Map<string, TabDefinition[]> = new Map();
    private viewTypes: Map<string, ViewTypeDefinition> = new Map();
    private detailComponents: Map<string, DetailComponentDefinition> = new Map();

    // Module registration
    registerModule(module: ModuleDefinition) {
        this.modules.set(module.id, module);
    }

    getModule(id: string): ModuleDefinition | undefined {
        return this.modules.get(id);
    }

    getAllModules(): ModuleDefinition[] {
        return Array.from(this.modules.values());
    }

    // Action registration
    registerAction(action: ActionDefinition) {
        action.entityTypes.forEach(entityType => {
            const existing = this.actions.get(entityType) || [];
            // Avoid duplicates
            if (!existing.find(a => a.id === action.id)) {
                this.actions.set(entityType, [...existing, action]);
            }
        });
    }

    // Tab registration
    registerTab(tab: TabDefinition) {
        tab.entityTypes.forEach(entityType => {
            const existing = this.tabs.get(entityType) || [];
            // Avoid duplicates
            if (!existing.find(t => t.id === tab.id)) {
                this.tabs.set(entityType, [...existing, tab]);
            }
        });
    }

    // View Type registration
    registerViewType(viewType: ViewTypeDefinition) {
        this.viewTypes.set(viewType.id, viewType);
    }

    // Detail Component registration (for Expensesheet, Timesheet, etc.)
    registerDetailComponent(component: DetailComponentDefinition) {
        this.detailComponents.set(component.id, component);
    }

    getDetailComponent(id: string): DetailComponentDefinition | undefined {
        return this.detailComponents.get(id);
    }

    // Get actions for an entity (called by DynamicViews)
    getActionsForEntity(entityType: string, position: 'row' | 'global' | 'both'): ActionDefinition[] {
        const allForEntity = this.actions.get(entityType) || [];
        if (position === 'both') return allForEntity;
        return allForEntity.filter(a => a.position === position || a.position === 'both');
    }

    // Get tabs for an entity (called by DetailsView)
    getTabsForEntity(entityType: string): TabDefinition[] {
        return (this.tabs.get(entityType) || [])
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    getViewType(id: string): ViewTypeDefinition | undefined {
        return this.viewTypes.get(id);
    }
}

export const registry = new AppRegistry();
