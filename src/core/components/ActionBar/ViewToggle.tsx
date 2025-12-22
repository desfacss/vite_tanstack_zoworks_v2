import React from 'react';
import { Radio, Button, Tooltip } from 'antd';
import { useDeviceType } from '@/utils/deviceTypeStore';
import { ViewToggleProps } from './types';

/**
 * ViewToggle - Responsive view selector
 * 
 * Responsive behavior:
 * - If only 1 view: Hide completely (both desktop and mobile)
 * - Desktop (>1 view): Radio group showing all view icons
 * - Mobile (>1 view): Single button showing current view icon, click cycles through
 * 
 * Usage:
 * ```tsx
 * <ViewToggle
 *   views={[
 *     { key: 'table', label: 'Table', icon: <Table /> },
 *     { key: 'grid', label: 'Grid', icon: <Grid /> },
 *   ]}
 *   activeView="table"
 *   onChange={setActiveView}
 * />
 * ```
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({
    views,
    activeView,
    onChange,
}) => {
    const deviceType = useDeviceType();
    const isMobile = deviceType === 'mobile';

    // Don't render if no views or only 1 view
    if (!views || views.length <= 1) return null;

    // Get current view
    const currentViewIndex = views.findIndex((v) => v.key === activeView);
    const currentView = views[currentViewIndex] || views[0];

    // Mobile: Single button that cycles through views
    if (isMobile) {
        const handleCycle = () => {
            const nextIndex = (currentViewIndex + 1) % views.length;
            onChange(views[nextIndex].key);
        };

        return (
            <Tooltip title={currentView.label}>
                <Button
                    icon={currentView.icon}
                    onClick={handleCycle}
                    className="action-bar-view-mobile"
                    aria-label={`Current view: ${currentView.label}. Click to change.`}
                />
            </Tooltip>
        );
    }

    // Desktop: Radio group with all views
    return (
        <Radio.Group
            value={activeView}
            onChange={(e) => onChange(e.target.value)}
            optionType="button"
            className="action-bar-view-desktop"
        >
            {views.map((view) => (
                <Tooltip key={view.key} title={view.label}>
                    <Radio.Button value={view.key} aria-label={view.label}>
                        {view.icon}
                    </Radio.Button>
                </Tooltip>
            ))}
        </Radio.Group>
    );
};

export default ViewToggle;
