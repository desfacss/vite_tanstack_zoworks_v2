import React from 'react';
import { Dropdown, Button } from 'antd';
import { MoreHorizontal } from 'lucide-react';
import { MoreMenuProps } from './types';

/**
 * MoreMenu - Overflow menu for secondary actions
 * 
 * Contains actions like Import, Export, Print, etc.
 * Consistent on desktop and mobile.
 * 
 * Usage:
 * ```tsx
 * <MoreMenu
 *   items={[
 *     { key: 'import', label: 'Import CSV', icon: <Upload />, onClick: handleImport },
 *     { key: 'export', label: 'Export CSV', icon: <Download />, onClick: handleExport },
 *     { key: 'delete', label: 'Delete All', icon: <Trash />, onClick: handleDelete, danger: true },
 *   ]}
 * />
 * ```
 */
export const MoreMenu: React.FC<MoreMenuProps> = ({
    items,
    trigger,
}) => {
    // Don't render if no items
    if (!items || items.length === 0) return null;

    // Convert items to Dropdown menu format
    const menuItems = items.map((item) => {
        if (item.divider) {
            return { type: 'divider' as const, key: `divider-${item.key}` };
        }
        return {
            key: item.key,
            label: (
                <span className={`flex items-center gap-2 ${item.danger ? 'text-red-500' : ''}`}>
                    {item.icon}
                    {item.label}
                </span>
            ),
            onClick: item.onClick,
            disabled: item.disabled,
        };
    });

    return (
        <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
        >
            {trigger || (
                <Button
                    icon={<MoreHorizontal size={16} />}
                    className="action-bar-more"
                    aria-label="More actions"
                />
            )}
        </Dropdown>
    );
};

export default MoreMenu;
