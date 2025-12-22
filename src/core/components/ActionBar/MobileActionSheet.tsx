import React from 'react';
import { Drawer, Button } from 'antd';
import { X } from 'lucide-react';
import { useDeviceType } from '@/utils/deviceTypeStore';

export interface ActionSheetItem {
    key: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
}

interface MobileActionSheetProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    items: ActionSheetItem[];
}

/**
 * MobileActionSheet - A native-like action sheet that slides up from the bottom
 * 
 * Usage:
 * ```tsx
 * <MobileActionSheet
 *   open={showActions}
 *   onClose={() => setShowActions(false)}
 *   title="Actions"
 *   items={[
 *     { key: 'edit', label: 'Edit', icon: <Pencil />, onClick: handleEdit },
 *     { key: 'delete', label: 'Delete', icon: <Trash />, onClick: handleDelete, danger: true },
 *   ]}
 * />
 * ```
 */
export const MobileActionSheet: React.FC<MobileActionSheetProps> = ({
    open,
    onClose,
    title,
    items,
}) => {
    const deviceType = useDeviceType();
    const isMobile = deviceType === 'mobile';

    // Only render on mobile
    if (!isMobile) return null;

    return (
        <Drawer
            placement="bottom"
            open={open}
            onClose={onClose}
            height="auto"
            closable={false}
            styles={{
                body: {
                    padding: 0,
                    backgroundColor: 'var(--color-background)',
                },
                wrapper: {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    overflow: 'hidden',
                },
                mask: {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                },
            }}
            className="mobile-action-sheet"
        >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            {title && (
                <div className="px-4 py-2 border-b border-[var(--color-border)]">
                    <div className="flex items-center justify-between">
                        <span className="text-base font-medium">{title}</span>
                        <Button
                            type="text"
                            size="small"
                            icon={<X size={20} />}
                            onClick={onClose}
                            className="text-gray-400"
                        />
                    </div>
                </div>
            )}

            {/* Action Items */}
            <div className="py-2">
                {items.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => {
                            item.onClick();
                            onClose();
                        }}
                        disabled={item.disabled}
                        className={`
              w-full px-4 py-3 flex items-center gap-3 text-left
              transition-colors duration-150
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-gray-100'}
              ${item.danger ? 'text-red-500' : 'text-[var(--color-text)]'}
            `}
                    >
                        {item.icon && (
                            <span className={`flex-shrink-0 ${item.danger ? 'text-red-500' : 'text-gray-500'}`}>
                                {item.icon}
                            </span>
                        )}
                        <span className="text-base">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Cancel button */}
            <div className="px-4 pb-4 pt-2 border-t border-[var(--color-border)]">
                <Button
                    block
                    size="large"
                    onClick={onClose}
                    className="rounded-lg"
                >
                    Cancel
                </Button>
            </div>

            {/* Safe area for bottom notch on iOS */}
            <div className="h-safe-area-inset-bottom" />
        </Drawer>
    );
};

export default MobileActionSheet;
