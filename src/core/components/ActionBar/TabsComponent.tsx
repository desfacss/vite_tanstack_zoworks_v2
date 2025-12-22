import React from 'react';
import { Radio, Select, Badge } from 'antd';
import { useDeviceType } from '@/utils/deviceTypeStore';
import { TabsComponentProps } from './types';

/**
 * TabsComponent - Responsive tabs with desktop inline and mobile dropdown
 * 
 * Responsive behavior:
 * - Desktop: Inline pill-style radio buttons
 * - Mobile: Dropdown selector showing active tab
 * 
 * Usage:
 * ```tsx
 * <TabsComponent
 *   tabs={[
 *     { key: 'mine', label: 'My Tickets', count: 5 },
 *     { key: 'all', label: 'All Tickets' },
 *   ]}
 *   activeTab="mine"
 *   onChange={setActiveTab}
 * />
 * ```
 */
export const TabsComponent: React.FC<TabsComponentProps> = ({
    tabs,
    activeTab,
    onChange,
}) => {
    const deviceType = useDeviceType();
    const isMobile = deviceType === 'mobile';

    // Don't render if no tabs
    if (!tabs || tabs.length === 0) return null;

    // Don't render if only one tab
    if (tabs.length === 1) return null;

    // Mobile: Dropdown
    if (isMobile) {
        return (
            <Select
                value={activeTab}
                onChange={onChange}
                className="action-bar-tabs-mobile"
                style={{ minWidth: 140 }}
                popupMatchSelectWidth={false}
            >
                {tabs.map((tab) => (
                    <Select.Option key={tab.key} value={tab.key}>
                        <span className="flex items-center gap-2">
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <Badge count={tab.count} size="small" />
                            )}
                        </span>
                    </Select.Option>
                ))}
            </Select>
        );
    }

    // Desktop: Inline radio buttons
    return (
        <Radio.Group
            value={activeTab}
            onChange={(e) => onChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            className="action-bar-tabs-desktop"
        >
            {tabs.map((tab) => (
                <Radio.Button key={tab.key} value={tab.key}>
                    <span className="flex items-center gap-1">
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && (
                            <Badge count={tab.count} size="small" className="ml-1" />
                        )}
                    </span>
                </Radio.Button>
            ))}
        </Radio.Group>
    );
};

export default TabsComponent;
