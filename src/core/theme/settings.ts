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
export const getAntdTheme = (
    isDark: boolean,
    primaryColor: string = '#1890ff',
    secondaryColor: string = '#4F46E5'
): ThemeConfig => {
    // Generate derived colors from primary for hover states etc.
    // In a real app we might use tinycolor2 or similar, but for now we rely on internal algorithm

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
            colorBgContainer: 'var(--color-bg-primary)',
            colorBgElevated: isDark ? '#1e293b' : '#ffffff',
            colorBgLayout: 'var(--color-bg-primary)',
            colorBgSpotlight: isDark ? '#334155' : '#0f172a',

            // Text
            colorText: isDark ? '#f8fafc' : '#0f172a',
            colorTextSecondary: isDark ? '#94a3b8' : '#64748b',
            colorTextTertiary: isDark ? '#64748b' : '#94a3b8',

            // Borders
            colorBorder: 'var(--color-border)',
            colorBorderSecondary: 'var(--color-border)',

            // ===== Border Radius =====
            borderRadius: 10,
            borderRadiusLG: 14,
            borderRadiusSM: 8,

            // ===== Typography =====
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: 14,
            controlHeight: 44,
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
                headerHeight: 64,
            },
            Card: {
                borderRadiusLG: 16,
                paddingLG: 24,
                boxShadowTertiary: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            },
            Button: {
                controlHeight: 44,
                controlHeightLG: 52,
                borderRadius: 10,
                fontWeight: 600,
                // Primary button has subtle gradient
                colorPrimary: primaryColor,
                colorPrimaryHover: primaryColor, // Ant computes hover automatically if not specified
            },
            Input: {
                controlHeight: 46,
                borderRadius: 10,
                // Clean look: filled background, no border by default via variant
                // (Variant is set at component level or via ConfigProvider)
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            Select: {
                controlHeight: 46,
                borderRadius: 10,
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            InputNumber: {
                controlHeight: 46,
                borderRadius: 10,
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            DatePicker: {
                controlHeight: 46,
                borderRadius: 10,
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            Menu: {
                itemHeight: 44,
                itemBorderRadius: 8,
                itemSelectedBg: 'rgba(var(--color-primary-rgb), 0.1)',
                itemSelectedColor: primaryColor,
            },
            Table: {
                headerBg: 'var(--color-bg-secondary)',
                headerColor: 'var(--color-text-secondary)',
                headerBorderRadius: 10,
                cellPaddingBlock: 16,
            }
        },
    };
};
