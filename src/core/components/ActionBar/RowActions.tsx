import React, { useState } from 'react';
import { Dropdown, Button, Tooltip, Space } from 'antd';
import { MoreHorizontal } from 'lucide-react';
import { useDeviceType } from '@/utils/deviceTypeStore';
import { MobileActionSheet, type ActionSheetItem } from './MobileActionSheet';

interface RowActionsProps {
    items: ActionSheetItem[];
    title?: string;
    maxInline?: number; // How many actions to show before collapsing into "More"
}

/**
 * RowActions - Responsive row action menu
 * 
 * Responsive behavior:
 * - Desktop: Inline actions (up to maxInline-1) + "More" dropdown
 * - Mobile: Bottom action sheet (native-like)
 */
export const RowActions: React.FC<RowActionsProps> = ({
    items,
    title = 'Actions',
    maxInline = 3,
}) => {
    const deviceType = useDeviceType();
    const isMobile = deviceType === 'mobile';
    const [sheetOpen, setSheetOpen] = useState(false);

    if (!items || items.length === 0) return null;

    // Mobile: Bottom Sheet
    if (isMobile) {
        return (
            <>
                <Button
                    type="text"
                    icon={<MoreHorizontal size={18} />}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSheetOpen(true);
                    }}
                    className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-black/5"
                />
                <MobileActionSheet
                    open={sheetOpen}
                    onClose={() => setSheetOpen(false)}
                    title={title}
                    items={items}
                />
            </>
        );
    }

    // Desktop: Hybrid (Inline + Overflow)
    // Rule: If items > maxInline, show (maxInline - 1) inline and the rest in overflow
    const shouldOverflow = items.length > maxInline;
    const inlineItems = shouldOverflow ? items.slice(0, maxInline - 1) : items;
    const overflowItems = shouldOverflow ? items.slice(maxInline - 1) : [];

    const menuItems = overflowItems.map((item) => ({
        key: item.key,
        label: (
            <span className={`flex items-center gap-2 ${item.danger ? 'text-red-500' : ''}`}>
                {item.icon}
                {item.label}
            </span>
        ),
        onClick: (e: any) => {
            e?.domEvent?.stopPropagation();
            item.onClick();
        },
        disabled: item.disabled,
    }));

    return (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
            {inlineItems.map((item) => (
                <Tooltip key={item.key} title={item.label} mouseEnterDelay={0.5}>
                    <Button
                        type="text"
                        size="small"
                        icon={item.icon}
                        onClick={(e) => {
                            e.stopPropagation();
                            item.onClick();
                        }}
                        danger={item.danger}
                        disabled={item.disabled}
                        className="flex items-center justify-center h-8 w-8 rounded-full"
                    />
                </Tooltip>
            ))}

            {shouldOverflow && (
                <Dropdown
                    menu={{ items: menuItems }}
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <Button
                        type="text"
                        size="small"
                        icon={<MoreHorizontal size={18} />}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center h-8 w-8 rounded-full"
                    />
                </Dropdown>
            )}
        </Space>
    );
};


export default RowActions;
