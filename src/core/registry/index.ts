
import {
    ModuleDefinition,
    ActionDefinition,
    TabDefinition,
    ViewTypeDefinition,
    DetailComponentDefinition,
    RouteDefinition,
    NavItemDefinition
} from './types';

class AppRegistry {
    private modules: Map<string, ModuleDefinition> = new Map();
    private actions: Map<string, ActionDefinition[]> = new Map();
    private tabs: Map<string, TabDefinition[]> = new Map();
    private viewTypes: Map<string, ViewTypeDefinition> = new Map();
    private detailComponents: Map<string, DetailComponentDefinition> = new Map();
    private routes: RouteDefinition[] = [];
    private navigationItems: NavItemDefinition[] = [];
    private listeners: (() => void)[] = [];

    // Listener management
    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emitChange() {
        this.listeners.forEach(l => l());
    }

    // Module registration
    registerModule(module: ModuleDefinition) {
        this.modules.set(module.id, module);
        this.emitChange();
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
        this.emitChange();
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
        this.emitChange();
    }

    // View Type registration
    registerViewType(viewType: ViewTypeDefinition) {
        this.viewTypes.set(viewType.id, viewType);
        this.emitChange();
    }

    registerDetailComponent(component: DetailComponentDefinition) {
        this.detailComponents.set(component.id, component);
        this.emitChange();
    }

    registerRoute(route: RouteDefinition) {
        this.routes.push(route);
        this.emitChange();
    }

    registerNavItem(item: NavItemDefinition) {
        if (!this.navigationItems.find(n => n.key === item.key)) {
            this.navigationItems.push(item);
            this.emitChange();
        }
    }

    getRoutes(): RouteDefinition[] {
        return this.routes;
    }

    getNavItems(): NavItemDefinition[] {
        return this.navigationItems;
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

    // New helper to get any action by ID (useful for custom overrides)
    getActionById(id: string): ActionDefinition | undefined {
        for (const actions of this.actions.values()) {
            const found = actions.find(a => a.id === id);
            if (found) return found;
        }
        return undefined;
    }
}

export const registry = new AppRegistry();
