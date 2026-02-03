import { ThemeConfig, theme } from 'antd';

/**
 * Centralized Ant Design theme configuration
 * Ported from zo_waCRM and adapted for Tenant Awareness.
 * 
 * Key Features:
 * - Touch-friendly controls (44px height)
 * - Detailed Dark Mode optimization
 * - Centralized design tokens
 */
export const DEFAULT_PRIMARY_COLOR = '#47c6e3'; // Zoworks Cyan
export const DEFAULT_SECONDARY_COLOR = '#4F46E5';

export const getAntdTheme = (
    isDark: boolean,
    primaryColor: string = DEFAULT_PRIMARY_COLOR,
    secondaryColor: string = DEFAULT_SECONDARY_COLOR,
    borderRadius: number = 8,
    fontSize: number = 14
): ThemeConfig => {
    const ratio = fontSize / 14;
    const baseControlHeight = Math.round(44 * ratio);
    const lgControlHeight = Math.round(52 * ratio);
    const inputControlHeight = Math.round(46 * ratio);
    const componentRadius = Math.max(3, borderRadius - 2);

    return {
        // Use dark algorithm for dark mode
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,

        // Design tokens - these apply globally
        token: {
            // ===== Colors =====
            colorPrimary: primaryColor,
            colorInfo: primaryColor,
            colorLink: secondaryColor,
            colorSuccess: '#10b981', // Emerald 500
            colorWarning: '#f59e0b', // Amber 500
            colorError: '#ef4444',   // Red 500

            // Secondary color usage
            // We use colorPrimaryContainer or similar for secondary effects

            // Backgrounds (Adaptive based on mode)
            colorBgContainer: 'var(--color-bg-secondary)',
            colorBgElevated: 'var(--color-bg-secondary)',
            colorBgLayout: 'var(--color-bg-primary)',
            colorBgSpotlight: 'var(--color-bg-tertiary)',

            // Text
            colorText: 'var(--color-text-primary)',
            colorTextSecondary: 'var(--color-text-secondary)',
            colorTextTertiary: 'var(--color-text-tertiary)',

            // Borders
            colorBorder: 'var(--color-border)',
            colorBorderSecondary: 'var(--color-border)',

            // ===== Border Radius =====
            borderRadius,
            borderRadiusLG: borderRadius + 4,
            borderRadiusSM: borderRadius - 2,

            // ===== Typography =====
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize,
            controlHeight: baseControlHeight,
            boxShadow: isDark
                ? '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
                : '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
        },

        // ===== Component-specific overrides =====
        components: {
            Layout: {
                bodyBg: 'var(--color-bg-primary)',
                headerBg: 'var(--color-bg-primary)',
                siderBg: 'var(--color-bg-primary)',
                headerHeight: Math.round(64 * ratio),
            },
            Card: {
                borderRadiusLG: borderRadius + 4,
                paddingLG: Math.round(24 * ratio),
                boxShadowTertiary: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            },
            Button: {
                controlHeight: baseControlHeight,
                controlHeightLG: lgControlHeight,
                borderRadius: componentRadius,
                fontWeight: 600,
                // Primary button has subtle gradient
                colorPrimary: primaryColor,
                colorPrimaryHover: primaryColor, // Ant computes hover automatically if not specified
            },
            Input: {
                controlHeight: inputControlHeight,
                borderRadius: componentRadius,
                // Clean look: filled background, no border by default via variant
                // (Variant is set at component level or via ConfigProvider)
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            Select: {
                controlHeight: inputControlHeight,
                borderRadius: componentRadius,
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            InputNumber: {
                controlHeight: inputControlHeight,
                borderRadius: componentRadius,
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            DatePicker: {
                controlHeight: inputControlHeight,
                borderRadius: componentRadius,
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            Menu: {
                itemHeight: baseControlHeight,
                itemBorderRadius: componentRadius,
                itemSelectedBg: 'rgba(var(--color-primary-rgb), 0.1)',
                itemSelectedColor: primaryColor,
            },
            Table: {
                headerBg: 'var(--color-bg-secondary)',
                headerColor: 'var(--color-text-secondary)',
                headerBorderRadius: Math.round(10 * ratio),
                cellPaddingBlock: Math.round(16 * ratio),
                // Row hover - uses primary color with subtle transparency
                rowHoverBg: 'rgba(var(--color-primary-rgb), 0.04)',
                // Explicit row selection colors using primary with transparency
                rowSelectedBg: 'rgba(var(--color-primary-rgb), 0.08)',
                rowSelectedHoverBg: 'rgba(var(--color-primary-rgb), 0.12)',
            },
            Tag: {
                borderRadiusSM: Math.max(2, componentRadius - 2),
            },
            Pagination: {
                borderRadius: componentRadius,
            },
            Checkbox: {
                borderRadiusSM: Math.max(2, componentRadius - 4),
            },
            Radio: {
                borderRadius: componentRadius,
            }
        },
    };
};
