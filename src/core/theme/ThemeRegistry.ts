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
import { THEME_PRESETS } from './presets';

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
    preset?: string;             // NEW: ID of a base preset (e.g., 'glassmorphism')
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

export function loadTenantTheme(config: TenantThemeConfig): void {
    let mergedConfig: TenantThemeConfig = {
        allowUserDarkMode: true,
        defaultMode: 'light' as 'light' | 'dark',
        borderRadius: 8,
        ...config,
    };

    // Apply preset if specified
    if (config.preset && THEME_PRESETS[config.preset]) {
        const presetData = THEME_PRESETS[config.preset];
        mergedConfig = {
            ...presetData,
            ...mergedConfig,
            // Deep merge for light/dark objects
            light: { ...presetData.light, ...mergedConfig.light },
            dark: { ...presetData.dark, ...mergedConfig.dark },
        } as TenantThemeConfig;
    }

    tenantConfig = mergedConfig;
    console.log('[Theme] Merged Config Preset:', mergedConfig.preset);

    // Apply static branding (doesn't change with mode)
    applyStaticBranding(mergedConfig);

    console.log('[Theme] Loaded tenant config:', {
        brandName: mergedConfig.brandName,
        primaryColor: mergedConfig.primaryColor,
        allowUserDarkMode: mergedConfig.allowUserDarkMode,
    });

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
    const lightCard = config.light?.cardBg || '#ffffff';
    const darkCard = config.dark?.cardBg || '#1f1f1f';
    const lightLayout = config.light?.layoutBg || '#f0f2f5';
    const darkLayout = config.dark?.layoutBg || '#141414';

    root.setAttribute('data-light-card', lightCard);
    root.setAttribute('data-dark-card', darkCard);
    root.setAttribute('data-light-layout', lightLayout);
    root.setAttribute('data-dark-layout', darkLayout);

    // Set initial values (assuming light mode default if not specified)
    const isDark = document.documentElement.classList.contains('dark');
    root.style.setProperty('--tenant-card-bg', isDark ? darkCard : lightCard);
    root.style.setProperty('--tenant-layout-bg', isDark ? darkLayout : lightLayout);

    root.style.setProperty('--tenant-card-bg-light', lightCard);
    root.style.setProperty('--tenant-card-bg-dark', config.dark?.cardBg || '#1f1f1f');
    root.style.setProperty('--tenant-layout-bg-light', config.light?.layoutBg || '#f0f2f5');
    root.style.setProperty('--tenant-layout-bg-dark', config.dark?.layoutBg || '#141414');
    root.style.setProperty('--tenant-header-bg-light', config.light?.headerBg || '#ffffff');
    root.style.setProperty('--tenant-header-bg-dark', config.dark?.headerBg || '#141414');
    root.style.setProperty('--tenant-sider-bg-light', config.light?.siderBg || '#ffffff');
    root.style.setProperty('--tenant-sider-bg-dark', config.dark?.siderBg || '#141414');

    // Store raw values for mode-aware switching
    // Cleaned up attribute setting - already handled above in the refactored applyStaticBranding

    // Glassmorphism effects
    console.log('[Theme] Checking preset for glass effect:', config.preset);
    if (config.preset === 'glassmorphism' || config.preset === 'ultra_glass') {
        console.log('[Theme] ACTIVATING GLASS EFFECTS');
        root.style.setProperty('--tenant-backdrop-blur', '15px');
        root.style.setProperty('--tenant-card-border', '1px solid rgba(255, 255, 255, 0.3)');
        root.setAttribute('data-glass-effect', 'true');
    } else {
        console.log('[Theme] DEACTIVATING GLASS EFFECTS');
        root.style.setProperty('--tenant-backdrop-blur', '0px');
        root.style.setProperty('--tenant-card-border', 'none');
        root.removeAttribute('data-glass-effect');
    }
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
            colorBgContainer: 'var(--tenant-card-bg)',
            colorBgLayout: 'var(--tenant-layout-bg)',
            colorText: modeConfig?.textColor || (isDarkMode ? '#e9edef' : 'rgba(0, 0, 0, 0.88)'),
        },
        components: {
            ...baseTheme.components,
            Layout: {
                ...baseTheme.components?.Layout,
                headerBg: 'var(--tenant-card-bg)',
                siderBg: 'var(--tenant-card-bg)',
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
    console.log('[Theme] Switched to', isDarkMode ? 'Dark' : 'Light', 'mode');

    // Update meta theme-color for mobile browsers
    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', isDarkMode ? '#141414' : '#ffffff');
    }

    // Update mode-aware variables
    const cardBg = root.getAttribute(isDarkMode ? 'data-dark-card' : 'data-light-card');
    const layoutBg = root.getAttribute(isDarkMode ? 'data-dark-layout' : 'data-light-layout');

    if (cardBg) root.style.setProperty('--tenant-card-bg', cardBg);
    if (layoutBg) root.style.setProperty('--tenant-layout-bg', layoutBg);
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
