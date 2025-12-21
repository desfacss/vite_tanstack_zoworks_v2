/**
 * Theme Registry - Tenant Colors with User Mode Toggle
 * 
 * Design:
 * - Tenant provides: primaryColor, brandName, logoUrl, etc.
 * - User controls: light/dark mode (persisted in useThemeStore)
 * - Theme is computed from both at render time
 */

import { ThemeConfig } from 'antd';
import { getAntdTheme as getBaseTheme } from './settings';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Mode-specific theme parameters
 */
export interface ThemeModeConfig {
    primaryColor: string;
    secondaryColor?: string;
    logoUrl?: string;
    cardBg?: string;      // Background color for cards (e.g., colorBgContainer)
    layoutBg?: string;    // Background color for main background (e.g., colorBgLayout)
    headerBg?: string;    // Background color for Top Header
    siderBg?: string;     // Background color for Sider
    inputBg?: string;     // Background color for input fields
    textColor?: string;   // Primary text color
}

/**
 * Tenant-level theme configuration (from identity.organizations.theme_config)
 */
export interface TenantThemeConfig {
    // Branding Assets
    brandName: string;           // e.g., "VKBS"
    faviconUrl?: string;         // Browser tab icon

    // Mode-specific overrides
    light?: ThemeModeConfig;
    dark?: ThemeModeConfig;

    // Backward Compatibility / Common fields
    primaryColor: string;        // Fallback or Light primary
    secondaryColor?: string;
    logoUrl?: string;
    loginBgImage?: string;       // Custom login page background

    // Typography (Advanced tenants)
    fontFamily?: string;         // e.g., "Poppins, sans-serif"

    // Layout Preferences
    compactMode?: boolean;       // Denser UI for power users
    borderRadius?: number;       // 0=sharp, 16=very rounded

    // Feature Flags
    allowUserDarkMode?: boolean; // Default true
    defaultMode?: 'light' | 'dark'; // Tenant's default, user can override
}

// ============================================================================
// STATE
// ============================================================================

// Tenant configuration (set once at bootstrap, but can be updated via theme editing)
let tenantConfig: TenantThemeConfig | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach(l => l());
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Load tenant theme configuration.
 * Called once during app bootstrap with data from identity.v_organizations.
 */
export function loadTenantTheme(config: TenantThemeConfig): void {
    tenantConfig = {
        allowUserDarkMode: true, // Default to allowing user toggle
        defaultMode: 'light',
        borderRadius: 8,
        ...config,
    };

    console.log('[Theme] Loaded tenant config:', {
        brandName: config.brandName,
        primaryColor: config.primaryColor,
        allowUserDarkMode: tenantConfig.allowUserDarkMode,
    });

    // Apply static branding (doesn't change with mode)
    applyStaticBranding(tenantConfig);
    notifyListeners();
}

/**
 * Update tenant theme configuration dynamically (e.g., from settings)
 */
export function updateTenantTheme(config: Partial<TenantThemeConfig>): void {
    if (!tenantConfig) return;
    tenantConfig = {
        ...tenantConfig,
        ...config,
    };
    applyStaticBranding(tenantConfig);
    notifyListeners();
}

/**
 * Subscribe to theme configuration changes
 */
export function subscribeToTheme(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Apply branding that doesn't change with light/dark mode
 */
function applyStaticBranding(config: TenantThemeConfig): void {
    // Document title
    document.title = config.brandName || 'Zoworks';

    // Favicon
    if (config.faviconUrl) {
        updateFavicon(config.faviconUrl);
    }

    // CSS Variables for custom styles
    const root = document.documentElement;
    root.style.setProperty('--tenant-primary', config.primaryColor);
    root.style.setProperty('--tenant-secondary', config.secondaryColor || config.primaryColor);
    root.style.setProperty('--tenant-brand-name', config.brandName);
    root.style.setProperty('--tenant-border-radius', `${config.borderRadius || 8}px`);

    // Also update antd primary color if needed via global CSS if not using ConfigProvider
    // But we are using ConfigProvider, so getAntdTheme will handle it.

    if (config.fontFamily) {
        root.style.setProperty('--tenant-font-family', config.fontFamily);
    }

    // Dynamic UI Variables for components
    root.style.setProperty('--tenant-card-bg-light', config.light?.cardBg || '#ffffff');
    root.style.setProperty('--tenant-card-bg-dark', config.dark?.cardBg || '#1f1f1f');
    root.style.setProperty('--tenant-layout-bg-light', config.light?.layoutBg || '#f0f2f5');
    root.style.setProperty('--tenant-layout-bg-dark', config.dark?.layoutBg || '#141414');
    root.style.setProperty('--tenant-header-bg-light', config.light?.headerBg || '#ffffff');
    root.style.setProperty('--tenant-header-bg-dark', config.dark?.headerBg || '#141414');
    root.style.setProperty('--tenant-sider-bg-light', config.light?.siderBg || '#ffffff');
    root.style.setProperty('--tenant-sider-bg-dark', config.dark?.siderBg || '#141414');
}

/**
 * Update favicon dynamically
 */
function updateFavicon(faviconUrl: string): void {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
    }
    link.type = 'image/x-icon';
    link.href = faviconUrl;
}

// ============================================================================
// THEME GENERATION
// ============================================================================

/**
 * Get Ant Design theme config.
 * Combines tenant colors with user's mode preference.
 * 
 * @param isDarkMode - User's mode preference (from useThemeStore)
 */
export function getAntdTheme(isDarkMode: boolean = false): ThemeConfig {
    // Pick mode-specific config or fall back to global
    const modeConfig = isDarkMode ? tenantConfig?.dark : tenantConfig?.light;
    const primaryColor = modeConfig?.primaryColor || tenantConfig?.primaryColor || '#1890ff';
    const borderRadius = tenantConfig?.borderRadius ?? 8;

    // Use the comprehensive theme settings from settings.ts
    const baseTheme = getBaseTheme(isDarkMode, primaryColor);

    // Merge in tenant-specific overrides
    return {
        ...baseTheme,
        token: {
            ...baseTheme.token,
            borderRadius,
            colorBgContainer: modeConfig?.cardBg || (isDarkMode ? '#1f1f1f' : '#ffffff'),
            colorBgLayout: modeConfig?.layoutBg || (isDarkMode ? '#141414' : '#f0f2f5'),
            colorText: modeConfig?.textColor || (isDarkMode ? '#e9edef' : 'rgba(0, 0, 0, 0.88)'),
        },
        components: {
            ...baseTheme.components,
            Layout: {
                ...baseTheme.components?.Layout,
                headerBg: modeConfig?.headerBg || (isDarkMode ? '#141414' : '#ffffff'),
                siderBg: modeConfig?.siderBg || (isDarkMode ? '#141414' : '#ffffff'),
            },
            Input: {
                ...baseTheme.components?.Input,
                colorBgContainer: modeConfig?.inputBg || (isDarkMode ? '#1f1f1f' : '#ffffff'),
            }
        }
    };
}

/**
 * Apply mode-specific styles to document
 */
export function applyThemeMode(isDarkMode: boolean): void {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);

    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', isDarkMode ? '#141414' : '#ffffff');
    }
}

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Check if user dark mode toggle is allowed for this tenant
 */
export function isUserDarkModeAllowed(): boolean {
    return tenantConfig?.allowUserDarkMode ?? true;
}

/**
 * Get tenant's default mode preference
 */
export function getTenantDefaultMode(): 'light' | 'dark' {
    return tenantConfig?.defaultMode || 'light';
}

/**
 * Get tenant configuration (read-only)
 */
export function getTenantThemeConfig(): TenantThemeConfig | null {
    return tenantConfig;
}

/**
 * Get tenant primary color
 */
export function getTenantPrimaryColor(): string {
    return tenantConfig?.primaryColor || '#1890ff';
}

/**
 * Get tenant brand name
 */
export function getTenantBrandName(): string {
    return tenantConfig?.brandName || 'Zoworks';
}

/**
 * Get tenant logo URL based on current mode
 * Returns undefined for invalid URLs (e.g., c:\fakepath\)
 */
export function getTenantLogoUrl(isDarkMode: boolean = false): string | undefined {
    const modeConfig = isDarkMode ? tenantConfig?.dark : tenantConfig?.light;
    const logoUrl = modeConfig?.logoUrl || tenantConfig?.logoUrl;

    // Validate the URL - filter out invalid paths like "c:\fakepath\"
    if (!logoUrl) return undefined;
    if (logoUrl.toLowerCase().includes('fakepath')) {
        console.warn('[Theme] Invalid logo URL detected (contains fakepath):', logoUrl);
        return undefined;
    }
    if (!logoUrl.startsWith('http://') && !logoUrl.startsWith('https://') && !logoUrl.startsWith('/')) {
        console.warn('[Theme] Invalid logo URL detected (not a valid URL):', logoUrl);
        return undefined;
    }

    return logoUrl;
}
