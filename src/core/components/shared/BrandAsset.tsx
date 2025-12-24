import React from 'react';
import { useThemeStore } from '@/core/lib/store';
import { getTenantLogoUrl, getTenantLogoIconUrl, getTenantBrandName } from '@/core/theme/ThemeRegistry';

interface BrandAssetProps {
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Standardized Brand Logo (Full Horizontal Version)
 * Fallback: Brand Name as styled text
 */
export const BrandLogo: React.FC<BrandAssetProps> = ({ className, style }) => {
    const { isDarkMode } = useThemeStore();
    const logoUrl = getTenantLogoUrl(isDarkMode);
    const brandName = getTenantBrandName();

    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={brandName}
                className={`h-8 w-auto max-w-full object-contain ${className || ''}`}
                style={style}
            />
        );
    }

    return (
        <h1
            className={`text-xl font-bold truncate text-[var(--tenant-primary)] m-0 ${className || ''}`}
            style={style}
        >
            {brandName}
        </h1>
    );
};

/**
 * Standardized Brand Icon (Square Version)
 * Fallback: First Letter in a 4px rounded square with border
 */
export const BrandIcon: React.FC<BrandAssetProps> = ({ className, style }) => {
    const { isDarkMode } = useThemeStore();
    const iconUrl = getTenantLogoIconUrl(isDarkMode);
    const brandName = getTenantBrandName();

    if (iconUrl) {
        return (
            <img
                src={iconUrl}
                alt={brandName}
                className={`h-8 w-8 object-contain rounded-[4px] ${className || ''}`}
                style={style}
            />
        );
    }

    // Fallback: 4px rounded square with first letter
    return (
        <div
            className={`flex items-center justify-center h-8 w-8 min-w-[32px] rounded-[4px] border-2 border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-bold text-lg select-none ${className || ''}`}
            style={style}
        >
            {brandName.charAt(0).toUpperCase()}
        </div>
    );
};
