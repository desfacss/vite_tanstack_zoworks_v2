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
export const getAntdTheme = (isDark: boolean, primaryColor: string = '#1890ff'): ThemeConfig => ({
    // Use dark algorithm for dark mode
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,

    // Design tokens - these apply globally
    token: {
        // ===== Colors =====
        colorPrimary: primaryColor,
        colorSuccess: '#52c41a',
        colorWarning: '#faad14',
        colorError: '#ff4d4f',
        colorInfo: '#1890ff',

        // Backgrounds (Adaptive based on mode)
        colorBgContainer: 'var(--tenant-card-bg)',
        colorBgElevated: 'var(--tenant-card-bg)',
        colorBgLayout: 'var(--tenant-layout-bg)',
        colorBgSpotlight: isDark ? '#2a2a2a' : '#fafafa',

        // Text
        colorText: isDark ? '#e9edef' : 'rgba(0, 0, 0, 0.88)',
        colorTextSecondary: isDark ? '#8696a0' : 'rgba(0, 0, 0, 0.65)',
        colorTextTertiary: isDark ? '#667781' : 'rgba(0, 0, 0, 0.45)',
        colorTextQuaternary: isDark ? '#515c64' : 'rgba(0, 0, 0, 0.25)',

        // Borders
        colorBorder: isDark ? '#303030' : '#d9d9d9',
        colorBorderSecondary: isDark ? '#404040' : '#f0f0f0',

        // ===== Border Radius =====
        borderRadius: 8,
        borderRadiusLG: 12,
        borderRadiusSM: 6,
        borderRadiusXS: 4,

        // ===== Spacing =====
        padding: 16,
        paddingLG: 24,
        paddingMD: 16,
        paddingSM: 12,
        paddingXS: 8,
        paddingXXS: 4,

        margin: 16,
        marginLG: 24,
        marginMD: 16,
        marginSM: 12,
        marginXS: 8,
        marginXXS: 4,

        // ===== Control Heights (Touch-friendly 44px) =====
        controlHeight: 44,
        controlHeightLG: 48,
        controlHeightSM: 36,
        controlHeightXS: 28,

        // ===== Typography =====
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        fontSize: 14,
        fontSizeLG: 16,
        fontSizeSM: 12,
        fontSizeXL: 20,
        fontSizeHeading1: 38,
        fontSizeHeading2: 30,
        fontSizeHeading3: 24,
        fontSizeHeading4: 20,
        fontSizeHeading5: 16,

        lineHeight: 1.5715,
        lineHeightLG: 1.5,
        lineHeightSM: 1.66,

        // ===== Shadows =====
        boxShadow: isDark
            ? '0 2px 8px rgba(0, 0, 0, 0.45)'
            : '0 2px 8px rgba(0, 0, 0, 0.15)',
    },

    // ===== Component-specific overrides =====
    components: {
        Layout: {
            siderBg: 'var(--tenant-card-bg)',
            bodyBg: 'var(--tenant-layout-bg)',
            headerBg: 'var(--tenant-card-bg)',
            headerHeight: 64,
            headerPadding: '0 16px',
            footerBg: 'var(--tenant-card-bg)',
            footerPadding: '24px 16px',
        },
        Card: {
            borderRadiusLG: 12,
            paddingLG: 24,
            headerBg: 'transparent',
            headerFontSize: 16,
            headerFontSizeSM: 14,
            headerHeight: 48,
            headerHeightSM: 36,
            actionsBg: isDark ? '#1f1f1f' : '#fafafa',
        },
        Button: {
            // Remove primaryColor override to allow tenant color to take effect via token.colorPrimary
            borderRadius: 8,
            borderRadiusLG: 10,
            borderRadiusSM: 6,
            controlHeight: 44,
            controlHeightLG: 48,
            controlHeightSM: 36,
            fontWeight: 500,
            paddingContentHorizontal: 16,
        },
        Input: {
            controlHeight: 44,
            controlHeightLG: 48,
            controlHeightSM: 36,
            borderRadius: 8,
            paddingBlock: 10,
            paddingInline: 12,
        },
        Select: {
            controlHeight: 44,
            controlHeightLG: 48,
            controlHeightSM: 36,
            borderRadius: 8,
            optionSelectedBg: isDark ? '#1a3a1a' : '#e6f7e6', // Should probably derive from primary, but keeping simple
            optionActiveBg: isDark ? '#2a2a2a' : '#f5f5f5',
        },
        Menu: {
            itemBg: 'transparent',
            itemHoverBg: isDark ? '#2a2a2a' : '#f0f0f0',
            itemSelectedBg: isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)',
            itemSelectedColor: primaryColor,
            itemActiveBg: isDark ? '#2a2a2a' : '#f0f0f0',
            itemHeight: 48,
            itemBorderRadius: 6,
            itemMarginBlock: 4,
            itemMarginInline: 8,
            popupBg: 'var(--tenant-card-bg)',
        },
        Table: {
            headerBg: 'var(--tenant-card-bg)',
            headerColor: isDark ? '#e9edef' : 'rgba(0, 0, 0, 0.88)',
            rowHoverBg: 'rgba(0, 0, 0, 0.02)',
            headerSplitColor: isDark ? '#303030' : '#f0f0f0',
            borderColor: isDark ? '#303030' : '#f0f0f0',
            cellPaddingBlock: 16,
            cellPaddingInline: 16,
        },
        Tabs: {
            itemColor: isDark ? '#8696a0' : 'rgba(0, 0, 0, 0.65)',
            itemSelectedColor: primaryColor,
            itemHoverColor: primaryColor,
            itemActiveColor: primaryColor,
            inkBarColor: primaryColor,
        },
    },
});
