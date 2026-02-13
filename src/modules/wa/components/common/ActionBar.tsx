import React, { useState, ReactNode } from 'react';
import { Button, Space, Tabs, Dropdown, Drawer, Input, theme, Select } from 'antd';
import { SearchOutlined, MoreOutlined, FilterOutlined } from '@ant-design/icons';
import type { MenuProps, TabsProps } from 'antd';
import { useResponsive } from '../../hooks/useResponsive';

export interface ActionBarProps {
    // Tab configuration
    tabs?: TabsProps['items'];
    activeTab?: string;
    onTabChange?: (key: string) => void;

    // View mode filter (My/Community dropdown)
    viewModeFilter?: {
        value: string;
        onChange: (value: string) => void;
        options: { value: string; label: ReactNode }[];
    };

    // Primary action (always visible)
    primaryAction?: {
        label: string;
        icon?: ReactNode;
        onClick: () => void;
        loading?: boolean;
    };

    // Secondary actions (in dropdown on mobile)
    secondaryActions?: {
        key: string;
        label: string;
        icon?: ReactNode;
        onClick: () => void;
        danger?: boolean;
    }[];

    // Search configuration
    search?: {
        placeholder?: string;
        value: string;
        onChange: (value: string) => void;
        onSearch?: (value: string) => void;
    };

    // Filter configuration
    filters?: ReactNode;

    // Extra content (date picker, etc.)
    extra?: ReactNode;
}

export const ActionBar: React.FC<ActionBarProps> = ({
    tabs,
    activeTab,
    onTabChange,
    viewModeFilter,
    primaryAction,
    secondaryActions,
    search,
    filters,
    extra,
}) => {
    const { isMobile } = useResponsive();
    const { token } = theme.useToken();
    const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

    // Build secondary actions menu
    const secondaryMenuItems: MenuProps['items'] = secondaryActions?.map(action => ({
        key: action.key,
        label: action.label,
        icon: action.icon,
        danger: action.danger,
        onClick: action.onClick,
    }));

    // Left side content (tabs or view mode dropdown)
    const renderLeftContent = () => (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
            {tabs ? (
                <Tabs
                    activeKey={activeTab}
                    onChange={onTabChange}
                    items={tabs}
                    size="small"
                    style={{ marginBottom: 0, flex: 1 }}
                    tabBarStyle={{ marginBottom: 0 }}
                />
            ) : (
                <>
                    {/* View mode dropdown */}
                    {viewModeFilter && (
                        <Select
                            value={viewModeFilter.value}
                            onChange={viewModeFilter.onChange}
                            options={viewModeFilter.options}
                            style={{ minWidth: isMobile ? 130 : 160 }}
                            size="small"
                            data-tour="view-mode-filter"
                        />
                    )}

                    {/* Inline search on desktop */}
                    {!isMobile && search && (
                        <Input.Search
                            placeholder={search.placeholder || 'Search...'}
                            value={search.value}
                            onChange={(e) => search.onChange(e.target.value)}
                            onSearch={search.onSearch}
                            style={{ maxWidth: 240 }}
                            size="small"
                            allowClear
                            data-tour="search-input"
                        />
                    )}

                    {/* Extra content on desktop */}
                    {!isMobile && extra}
                </>
            )}
        </div>
    );

    // Actions section
    const renderActions = () => (
        <Space size="small" wrap={false}>
            {/* Search trigger (mobile only when search is defined) */}
            {isMobile && search && (
                <Button
                    type="text"
                    icon={<SearchOutlined />}
                    onClick={() => setSearchDrawerOpen(true)}
                    size="small"
                    data-tour="search-trigger"
                />
            )}

            {/* Filter trigger */}
            {filters && (
                <Button
                    type="text"
                    icon={<FilterOutlined />}
                    onClick={() => setFilterDrawerOpen(true)}
                    size="small"
                    data-tour="filter-trigger"
                />
            )}

            {/* Primary action */}
            {primaryAction && (
                <Button
                    type="primary"
                    icon={primaryAction.icon}
                    onClick={primaryAction.onClick}
                    loading={primaryAction.loading}
                    size="small"
                    data-tour="primary-action"
                >
                    {isMobile ? '' : primaryAction.label}
                </Button>
            )}

            {/* Secondary actions dropdown */}
            {secondaryActions && secondaryActions.length > 0 && (
                <Dropdown menu={{ items: secondaryMenuItems }} trigger={['click']}>
                    <Button icon={<MoreOutlined />} size="small" data-tour="more-actions" />
                </Dropdown>
            )}
        </Space>
    );

    return (
        <>
            <div
                style={{
                    padding: isMobile ? '8px 12px' : '8px 24px',
                    background: token.colorBgContainer,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    minHeight: 48,
                }}
            >
                {/* Left side (tabs or dropdown + search) */}
                {renderLeftContent()}

                {/* Actions */}
                {renderActions()}
            </div>

            {/* Search Drawer (mobile only) */}
            {search && (
                <Drawer
                    title="Search"
                    placement="top"
                    height="auto"
                    open={searchDrawerOpen}
                    onClose={() => setSearchDrawerOpen(false)}
                    styles={{ body: { padding: 16 } }}
                >
                    <Input.Search
                        placeholder={search.placeholder || 'Search...'}
                        value={search.value}
                        onChange={(e) => search.onChange(e.target.value)}
                        onSearch={(v) => {
                            search.onSearch?.(v);
                            setSearchDrawerOpen(false);
                        }}
                        enterButton
                        size="large"
                        autoFocus
                    />
                </Drawer>
            )}

            {/* Filter Drawer */}
            {filters && (
                <Drawer
                    title="Filters"
                    placement="right"
                    width={320}
                    open={filterDrawerOpen}
                    onClose={() => setFilterDrawerOpen(false)}
                    styles={{ body: { padding: 16 } }}
                >
                    {filters}
                </Drawer>
            )}
        </>
    );
};

export default ActionBar;

