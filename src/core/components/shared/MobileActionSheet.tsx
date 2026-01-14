import React from 'react';
import { Drawer } from 'antd';

export interface ActionSheetItem {
    key: string;
    label: string;
    icon?: React.ReactNode;
    danger?: boolean;
    onClick?: () => void;
}

interface MobileActionSheetProps {
    open: boolean;
    onClose: () => void;
    items: ActionSheetItem[];
    title?: string;
}

/**
 * MobileActionSheet - Native-style bottom action sheet for mobile
 * 
 * Usage:
 * ```tsx
 * <MobileActionSheet
 *   open={showSheet}
 *   onClose={() => setShowSheet(false)}
 *   items={[
 *     { key: 'edit', label: 'Edit', icon: <Edit size={20} />, onClick: handleEdit },
 *     { key: 'delete', label: 'Delete', danger: true, onClick: handleDelete },
 *   ]}
 * />
 * ```
 */
export const MobileActionSheet: React.FC<MobileActionSheetProps> = ({
    open,
    onClose,
    items,
    title,
}) => {
    const handleItemClick = (item: ActionSheetItem) => {
        item.onClick?.();
        onClose();
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="bottom"
            height="auto"
            closable={false}
            className="mobile-action-sheet"
            styles={{
                body: { padding: 0 },
                wrapper: { borderRadius: '16px 16px 0 0' },
            }}
        >
            <div className="action-sheet-container">
                {/* Handle bar for swipe gesture hint */}
                <div className="action-sheet-handle">
                    <div className="action-sheet-handle-bar" />
                </div>

                {/* Optional title */}
                {title && (
                    <div className="action-sheet-title">{title}</div>
                )}

                {/* Action items */}
                <div className="action-sheet-items">
                    {items.map((item) => {
                        if (item.key === 'divider') {
                            return <div key={item.key} className="action-sheet-divider" />;
                        }
                        return (
                            <button
                                key={item.key}
                                className={`action-sheet-item ${item.danger ? 'danger' : ''}`}
                                onClick={() => handleItemClick(item)}
                            >
                                {item.icon && (
                                    <span className="action-sheet-item-icon">{item.icon}</span>
                                )}
                                <span className="action-sheet-item-label">{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Cancel button */}
                <button className="action-sheet-cancel" onClick={onClose}>
                    Cancel
                </button>
            </div>
        </Drawer>
    );
};
