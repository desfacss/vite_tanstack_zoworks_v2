import { ReactNode } from 'react';

/**
 * Tab configuration for TabsComponent
 */
export interface Tab {
    key: string;
    label: string;
    icon?: ReactNode;
    count?: number;
}

/**
 * Filter configuration for InlineFilters
 */
export interface FilterConfig {
    key: string;
    label: string;
    type: 'select' | 'text' | 'date' | 'daterange' | 'multiselect' | 'search';
    options?: { label: string; value: any }[];
    placeholder?: string;
    width?: number;
    searchColumns?: string[]; // For search type
}

/**
 * View option for ViewToggle
 */
export interface ViewOption {
    key: 'table' | 'grid' | 'calendar' | 'kanban' | 'map' | 'gantt' | 'list';
    label: string;
    icon: ReactNode;
}

/**
 * Menu item for MoreMenu
 */
export interface MenuItem {
    key: string;
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    danger?: boolean;
    divider?: boolean;
    disabled?: boolean;
}

/**
 * Props for PageActionBar
 */
export interface PageActionBarProps {
    children: ReactNode;
    className?: string;
}

/**
 * Props for PageTitle
 */
export interface PageTitleProps {
    title: string;
    description?: string;
    icon?: ReactNode;
}

/**
 * Props for TabsComponent
 */
export interface TabsComponentProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (key: string) => void;
}

/**
 * Props for InlineFilters
 */
export interface InlineFiltersProps {
    filters: FilterConfig[];
    values: Record<string, any>;
    onChange: (values: Record<string, any>) => void;
    maxVisible?: number;
    onClear?: () => void;
}

/**
 * Props for PrimaryAction
 */
export interface PrimaryActionProps {
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
    loading?: boolean;
    disabled?: boolean;
    type?: 'primary' | 'default' | 'text';
    dropdownItems?: MenuItem[]; // Actions for split button dropdown
}


/**
 * Props for ViewToggle
 */
export interface ViewToggleProps {
    views: ViewOption[];
    activeView: string;
    onChange: (view: string) => void;
}

/**
 * Props for MoreMenu
 */
export interface MoreMenuProps {
    items: MenuItem[];
    trigger?: ReactNode;
}
