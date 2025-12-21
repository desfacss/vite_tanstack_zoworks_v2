
import { TFunction } from 'i18next';

export interface ModuleDefinition {
    id: string;                    // e.g., 'tickets', 'workforce'
    name: string;                  // Display name
    requiredPermissions?: string[];
    routes?: RouteDefinition[];
    navigationItems?: NavItemDefinition[];
    initialize?: (config?: any) => Promise<void>;  // Called when module loads
}

export interface RouteDefinition {
    path: string;
    component: () => Promise<any>;
    exact?: boolean;
}

export interface NavItemDefinition {
    key: string;
    label: string;
    path: string;
    icon?: string;
    parentId?: string;
}

export interface ActionDefinition {
    id: string;
    entityTypes: string[];         // Which entities show this action
    position: 'row' | 'global' | 'both';
    label: string | ((t: TFunction) => string);
    component: () => Promise<any>;  // Dynamic import
    condition?: (context: any) => boolean;
}

export interface TabDefinition {
    id: string;
    entityTypes: string[];         // Which entities show this tab
    label: string | ((t: TFunction) => string);
    component: () => Promise<any>;  // Dynamic import
    order?: number;
    condition?: (context: any) => boolean;
}

export interface ViewTypeDefinition {
    id: string;                    // e.g., 'gantt', 'kanban', 'calendar'
    component: () => Promise<any>;
    requiredModules?: string[];    // e.g., gantt requires 'fsm' module
}
