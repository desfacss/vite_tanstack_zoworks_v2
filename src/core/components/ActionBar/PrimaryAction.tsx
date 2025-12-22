import React from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Dropdown, Button } from 'antd';
import { useDeviceType } from '@/utils/deviceTypeStore';
import { PrimaryActionProps } from './types';

/**
 * PrimaryAction - Primary action button with responsive sizing
 * 
 * Supports:
 * 1. Single Primary Button (Standard)
 * 2. Split Button (Primary + Dropdown)
 * 3. Icon-only (Mobile)
 */
export const PrimaryAction: React.FC<PrimaryActionProps> = ({
    label,
    icon = <Plus size={18} />,
    onClick,
    loading = false,
    disabled = false,
    type = 'primary',
    dropdownItems = []
}) => {
    const deviceType = useDeviceType();
    const isMobile = deviceType === 'mobile';

    const hasDropdown = dropdownItems.length > 0;

    const menuItems = dropdownItems.map(item => ({
        key: item.key,
        label: (
            <div className="flex items-center gap-2">
                {item.icon}
                <span>{item.label}</span>
            </div>
        ),
        onClick: item.onClick,
        danger: item.danger,
        disabled: item.disabled
    }));

    // Mobile: Icon-only button (If dropdown exists, we might show a sheet or just use the first action)
    if (isMobile) {
        if (hasDropdown && !onClick) {
            // Dropdown-only button on mobile
            return (
                <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                    <Button
                        type={type}
                        icon={icon}
                        loading={loading}
                        disabled={disabled}
                        className="flex items-center justify-center h-10 w-10 p-0 rounded-lg shadow-sm border-none"
                    />
                </Dropdown>
            );
        }

        return (
            <Button
                type={type}
                icon={icon}
                onClick={onClick}
                loading={loading}
                disabled={disabled}
                className="flex items-center justify-center h-10 w-10 p-0 rounded-lg shadow-sm border-none"
                aria-label={label}
            />
        );
    }

    // Desktop
    if (hasDropdown) {
        // Use Ant Design's Dropdown.Button for Split Button effect
        return (
            <Dropdown.Button
                type={type}
                loading={loading}
                disabled={disabled}
                onClick={onClick}
                menu={{ items: menuItems }}
                icon={<ChevronDown size={16} />}
                className="action-bar-primary-split"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{label}</span>
                </div>
            </Dropdown.Button>
        );
    }

    return (
        <Button
            type={type}
            icon={icon}
            onClick={onClick}
            loading={loading}
            disabled={disabled}
            className="flex items-center gap-2 h-10 px-4 rounded-lg font-medium shadow-sm border-none transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
            {label}
        </Button>
    );
};


export default PrimaryAction;
