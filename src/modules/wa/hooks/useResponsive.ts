import { Grid } from 'antd';

// Responsive configuration for consistent spacing and sizing
const RESPONSIVE_CONFIG = {
    paddingMobile: 12,
    paddingTablet: 16,
    paddingDesktop: 24,
    drawerWidthMobile: '85%',
    drawerWidthTablet: 400,
    drawerWidthDesktop: 480,
    cardMinWidthMobile: '100%',
    cardMinWidthTablet: 280,
    cardMinWidthDesktop: 320,
};

/**
 * Centralized responsive hook for consistent breakpoint detection
 * Uses Ant Design's Grid.useBreakpoint() under the hood
 * 
 * @returns Responsive state and derived values
 * 
 * @example
 * const { isMobile, isTablet, padding, drawerWidth } = useResponsive();
 */
export const useResponsive = () => {
    const screens = Grid.useBreakpoint();

    // Breakpoint flags
    const isMobile = !screens.md;                    // < 768px
    const isTablet = screens.md && !screens.lg;      // 768px - 991px
    const isDesktop = screens.lg;                    // >= 992px
    const isSmallMobile = !screens.sm;               // < 576px (very small phones)
    const isWideScreen = screens.xl;                 // >= 1200px

    // Derived responsive values
    const padding = isMobile
        ? RESPONSIVE_CONFIG.paddingMobile
        : isTablet
            ? RESPONSIVE_CONFIG.paddingTablet
            : RESPONSIVE_CONFIG.paddingDesktop;

    const drawerWidth = isMobile
        ? RESPONSIVE_CONFIG.drawerWidthMobile
        : isTablet
            ? RESPONSIVE_CONFIG.drawerWidthTablet
            : RESPONSIVE_CONFIG.drawerWidthDesktop;

    const sidebarWidth = isMobile
        ? '100%'
        : isTablet
            ? 320
            : 380;

    const cardMinWidth = isMobile
        ? RESPONSIVE_CONFIG.cardMinWidthMobile
        : isTablet
            ? RESPONSIVE_CONFIG.cardMinWidthTablet
            : RESPONSIVE_CONFIG.cardMinWidthDesktop;

    // Grid columns for different layouts
    const gridColumns = isMobile
        ? 1
        : isTablet
            ? 2
            : isWideScreen
                ? 4
                : 3;

    return {
        // Breakpoint flags
        isMobile,
        isTablet,
        isDesktop,
        isSmallMobile,
        isWideScreen,

        // Derived values
        padding,
        drawerWidth,
        sidebarWidth,
        cardMinWidth,
        gridColumns,

        // Raw screens object for advanced use
        screens,
    };
};
