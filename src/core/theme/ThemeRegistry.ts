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
// CONSTANTS
// ============================================================================

import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from './settings';
export { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR };

// ============================================================================
// TYPES
// ============================================================================

/**
 * Mode-specific theme parameters
 */
export interface ThemeModeConfig {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    logoIconUrl?: string;
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
    logoIconUrl?: string;        // New: Square/Favicon asset
    loginBgImage?: string;       // Custom login page background

    // Typography (Advanced tenants)
    fontFamily?: string;         // e.g., "Poppins, sans-serif"

    // Layout Preferences
    compactMode?: boolean;       // Denser UI for power users
    borderRadius: number;        // 0=sharp, 16=very rounded
    containerPadding?: number;   // Layout horizontal padding (px)
    baseFontSize?: number;       // Base font size for zoom (default 14)
    globalGutter?: number;      // Grid/Gap spacing (default 16)

    // Feature Flags
    allowUserDarkMode?: boolean; // Default true
    defaultMode?: ThemeMode;     // Tenant's default, user can override (now supports 'system')
    preset?: string;             // ID of a base preset (e.g., 'glassmorphism')
    heroHeader?: boolean;        // NEW: Enable branded hero-style header
}

/**
 * Theme mode options
 * - 'light': Always light mode
 * - 'dark': Always dark mode
 * - 'system': Auto-detect from OS preference
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Get the user's OS color scheme preference
 */
export function getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve theme mode to actual light/dark
 */
export function resolveThemeMode(mode: ThemeMode): boolean {
    if (mode === 'system') {
        return getSystemPreference() === 'dark';
    }
    return mode === 'dark';
}

/**
 * Listen to OS theme preference changes (for system mode)
 * Returns cleanup function
 */
export function listenToSystemThemeChanges(callback: (isDark: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => { };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => callback(e.matches);

    // Modern browsers
    if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }

    // Legacy browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
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
    // 1. Resolve preset (Strict fallback to 'base')
    const presetKey = (config.preset && THEME_PRESETS[config.preset]) ? config.preset : 'base';
    const presetData = THEME_PRESETS[presetKey];

    // 2. Perform resilient merge: Default -> Preset -> Config
    let mergedConfig: TenantThemeConfig = {
        allowUserDarkMode: true,
        defaultMode: 'light',
        ...presetData,
        ...config,
        // Carry forward the resolved preset key
        preset: presetKey,
    };

    // 3. SPECIAL: If using 'base' preset and primary color is an old default, migrate to new brand color
    // This allows code-level updates to the base theme to reflect for existing tenants
    if (presetKey === 'base') {
        const isOldDefault = (
            mergedConfig.primaryColor === '#1890ff' ||
            mergedConfig.primaryColor === '#1677ff' ||
            mergedConfig.light?.primaryColor === '#1890ff' ||
            mergedConfig.light?.primaryColor === '#1677ff'
        );

        if (isOldDefault) {
            const newPrimary = presetData.light?.primaryColor || '#47c6e3';
            mergedConfig.primaryColor = newPrimary;
            if (mergedConfig.light) mergedConfig.light.primaryColor = newPrimary;
            // Also update dark mode if it was the old default
            if (mergedConfig.dark?.primaryColor === '#1890ff') {
                mergedConfig.dark.primaryColor = presetData.dark?.primaryColor || newPrimary;
            }
        }
    }

    // 4. Deep merge mode-specific settings to ensure partial overrides don't wipe preset defaults
    mergedConfig.light = { ...presetData.light, ...config.light, ...mergedConfig.light };
    mergedConfig.dark = { ...presetData.dark, ...config.dark, ...mergedConfig.dark };

    // Standardize border radius
    if (config.borderRadius === undefined && presetData.borderRadius !== undefined) {
        mergedConfig.borderRadius = presetData.borderRadius;
    }

    tenantConfig = mergedConfig;
    console.log(`[Theme] Loaded: ${mergedConfig.brandName} (Preset: ${presetKey})`);

    // Apply static branding
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
 * Convert hex color to RGB values (e.g., "#00E599" -> "0, 229, 153")
 * Used for CSS rgba() variables
 */
export function hexToRgb(hex: string): string {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Handle 3-digit hex (e.g., #0E9)
    if (cleanHex.length === 3) {
        const r = parseInt(cleanHex[0] + cleanHex[0], 16);
        const g = parseInt(cleanHex[1] + cleanHex[1], 16);
        const b = parseInt(cleanHex[2] + cleanHex[2], 16);
        return `${r}, ${g}, ${b}`;
    }

    // Parse 6-digit hex values
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    // Return as comma-separated string for CSS
    return `${r}, ${g}, ${b}`;
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
    root.setAttribute('data-theme-preset', config.preset || 'base');
    root.style.setProperty('--tenant-primary', config.primaryColor);
    root.style.setProperty('--tenant-secondary', config.secondaryColor || config.primaryColor);
    root.style.setProperty('--tenant-brand-name', config.brandName);
    const standardRadius = config.borderRadius ?? 12;
    const componentRadius = Math.max(3, standardRadius - 2);
    root.style.setProperty('--tenant-border-radius', `${standardRadius}px`);
    root.style.setProperty('--tenant-border-radius-interactive', `${componentRadius}px`);

    // Zoom & Typography
    const baseSize = config.baseFontSize || 14;
    const zoomFactor = baseSize / 14;
    root.style.setProperty('--tenant-font-size', `${baseSize}px`);
    root.style.setProperty('--tenant-zoom-factor', `${zoomFactor}`);

    // Layout Padding centralization
    const padding = (config.containerPadding !== undefined ? config.containerPadding : 24) * zoomFactor;
    root.style.setProperty('--layout-padding', `${padding}px`);
    root.style.setProperty('--layout-padding-mobile', `${Math.max(16, padding - 8)}px`);
    root.style.setProperty('--layout-padding-desktop', `${padding}px`);

    // Global Gutter & Spacing
    const gutter = config.globalGutter || 16;
    root.style.setProperty('--tenant-gutter', `${gutter * zoomFactor}px`);

    // Dynamic UI Variables for components
    const lightPrimary = config.light?.primaryColor || config.primaryColor;
    const darkPrimary = config.dark?.primaryColor || config.primaryColor;
    const lightSecondary = config.light?.secondaryColor || config.secondaryColor || lightPrimary;
    const darkSecondary = config.dark?.secondaryColor || config.secondaryColor || darkPrimary;

    const lightCard = config.light?.cardBg || '#ffffff';
    const darkCard = config.dark?.cardBg || '#1f1f1f';
    const lightLayout = config.light?.layoutBg || '#f0f2f5';
    const darkLayout = config.dark?.layoutBg || '#141414';

    root.setAttribute('data-light-primary', lightPrimary);
    root.setAttribute('data-dark-primary', darkPrimary);
    root.setAttribute('data-light-secondary', lightSecondary);
    root.setAttribute('data-dark-secondary', darkSecondary);
    root.setAttribute('data-light-card', lightCard);
    root.setAttribute('data-dark-card', darkCard);
    root.setAttribute('data-light-layout', lightLayout);
    root.setAttribute('data-dark-layout', darkLayout);

    // Initial variable set
    const isDark = document.documentElement.classList.contains('dark');
    const currentPrimary = isDark ? darkPrimary : lightPrimary;
    const currentSecondary = isDark ? darkSecondary : lightSecondary;
    const currentCard = isDark ? darkCard : lightCard;
    const currentLayout = isDark ? darkLayout : lightLayout;

    root.style.setProperty('--tenant-primary', currentPrimary);
    root.style.setProperty('--tenant-secondary', currentSecondary);
    root.style.setProperty('--tenant-card-bg', currentCard);
    root.style.setProperty('--tenant-layout-bg', currentLayout);
    root.style.setProperty('--tenant-sider-bg', isDark ? (config.dark?.siderBg || '#141414') : (config.light?.siderBg || '#ffffff'));

    // RGB values for rgba() support in CSS (enables dynamic glow/glass effects)
    root.style.setProperty('--color-primary-rgb', hexToRgb(currentPrimary));
    root.style.setProperty('--color-secondary-rgb', hexToRgb(currentSecondary));
    root.style.setProperty('--color-bg-primary-rgb', hexToRgb(currentLayout));
    root.style.setProperty('--color-bg-secondary-rgb', hexToRgb(currentCard));

    root.style.setProperty('--tenant-card-bg-light', lightCard);
    root.style.setProperty('--tenant-card-bg-dark', darkCard);
    root.style.setProperty('--tenant-layout-bg-light', lightLayout);
    root.style.setProperty('--tenant-layout-bg-dark', darkLayout);
    root.style.setProperty('--tenant-header-bg-light', config.light?.headerBg || '#ffffff');
    root.style.setProperty('--tenant-header-bg-dark', config.dark?.headerBg || '#141414');
    root.style.setProperty('--tenant-sider-bg-light', config.light?.siderBg || '#ffffff');
    root.style.setProperty('--tenant-sider-bg-dark', config.dark?.siderBg || '#141414');

    // Glassmorphism effects
    if (config.preset === 'glassmorphism' || config.preset === 'ultra_glass') {
        root.style.setProperty('--tenant-backdrop-blur', '15px');
        root.style.setProperty('--tenant-card-border', '1px solid rgba(255, 255, 255, 0.3)');
        root.setAttribute('data-glass-effect', 'true');
        root.removeAttribute('data-theme-layout');
        root.removeAttribute('data-hero-header');
    } else {
        root.style.setProperty('--tenant-backdrop-blur', '0px');
        root.style.setProperty('--tenant-card-border', 'none');
        root.removeAttribute('data-glass-effect');
    }

    // Gradient Card Layout
    if (config.preset === 'gradient_card' || config.preset === 'branded_header' || config.heroHeader) {
        root.setAttribute('data-theme-layout', 'gradient-card');
        root.setAttribute('data-hero-header', 'true');
    } else {
        root.removeAttribute('data-theme-layout');
        root.removeAttribute('data-hero-header');
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
    const primaryColor = modeConfig?.primaryColor || tenantConfig?.primaryColor || DEFAULT_PRIMARY_COLOR;
    const secondaryColor = modeConfig?.secondaryColor || tenantConfig?.secondaryColor || primaryColor;
    const borderRadius = tenantConfig?.borderRadius ?? 12; // Use 12 as default
    const fontSize = tenantConfig?.baseFontSize || 14;
    const componentRadius = Math.max(3, borderRadius - 2);

    // Use the comprehensive theme settings from settings.ts
    const baseTheme = getBaseTheme(isDarkMode, primaryColor, secondaryColor, borderRadius, fontSize);

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
            Button: {
                ...baseTheme.components?.Button,
                borderRadius: componentRadius,
                fontWeight: 600,
                // Primary button has subtle gradient
                colorPrimary: primaryColor,
                colorPrimaryHover: primaryColor, // Ant computes hover automatically if not specified
            },
            Input: {
                ...baseTheme.components?.Input,
                borderRadius: componentRadius,
                // Clean look: filled background, no border by default via variant
                // (Variant is set at component level or via ConfigProvider)
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            Select: {
                ...baseTheme.components?.Select,
                borderRadius: componentRadius,
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            InputNumber: {
                ...baseTheme.components?.InputNumber,
                borderRadius: componentRadius,
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            DatePicker: {
                ...baseTheme.components?.DatePicker,
                borderRadius: componentRadius,
                colorBgContainer: 'var(--color-bg-secondary)',
            },
            Card: {
                borderRadiusLG: borderRadius + 4,
                paddingLG: 24,
                boxShadowTertiary: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            },
            Table: {
                ...baseTheme.components?.Table,
                // Row selection uses primary color with transparency
            },
            Layout: {
                ...baseTheme.components?.Layout,
                headerBg: 'var(--tenant-card-bg)',
                siderBg: 'var(--tenant-card-bg)',
            },
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
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', isDarkMode ? '#141414' : '#ffffff');
    }

    // Update mode-aware variables
    const primary = root.getAttribute(isDarkMode ? 'data-dark-primary' : 'data-light-primary');
    const secondary = root.getAttribute(isDarkMode ? 'data-dark-secondary' : 'data-light-secondary');
    const cardBg = root.getAttribute(isDarkMode ? 'data-dark-card' : 'data-light-card');
    const layoutBg = root.getAttribute(isDarkMode ? 'data-dark-layout' : 'data-light-layout');

    if (primary) {
        root.style.setProperty('--tenant-primary', primary);
        root.style.setProperty('--color-primary-rgb', hexToRgb(primary));
    }
    if (secondary) {
        root.style.setProperty('--tenant-secondary', secondary);
        root.style.setProperty('--color-secondary-rgb', hexToRgb(secondary));
    }
    if (cardBg) {
        root.style.setProperty('--tenant-card-bg', cardBg);
        root.style.setProperty('--color-bg-secondary-rgb', hexToRgb(cardBg));
    }
    if (layoutBg) {
        root.style.setProperty('--tenant-layout-bg', layoutBg);
        root.style.setProperty('--color-bg-primary-rgb', hexToRgb(layoutBg));
    }

    // Update sider background
    const siderBg = isDarkMode ? (tenantConfig?.dark?.siderBg || '#141414') : (tenantConfig?.light?.siderBg || '#ffffff');
    root.style.setProperty('--tenant-sider-bg', siderBg);
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
export function getTenantDefaultMode(): ThemeMode {
    return tenantConfig?.defaultMode || 'system';
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
    return tenantConfig?.primaryColor || DEFAULT_PRIMARY_COLOR;
}

/**
 * Get tenant brand name
 */
export function getTenantBrandName(): string {
    return tenantConfig?.brandName || 'Zoworks';
}

/**
 * Get tenant logo URL based on current mode
 */
export function getTenantLogoUrl(isDarkMode: boolean = false): string | undefined {
    const modeConfig = isDarkMode ? tenantConfig?.dark : tenantConfig?.light;
    const logoUrl = modeConfig?.logoUrl || tenantConfig?.logoUrl;
    return validateAssetUrl(logoUrl);
}

/**
 * Get tenant logo ICON (square) URL based on current mode
 */
export function getTenantLogoIconUrl(isDarkMode: boolean = false): string | undefined {
    const modeConfig = isDarkMode ? tenantConfig?.dark : tenantConfig?.light;
    const logoIconUrl = modeConfig?.logoIconUrl || tenantConfig?.logoIconUrl;
    return validateAssetUrl(logoIconUrl);
}

/**
 * Validates and filters out junk fake paths from browser uploads 
 * Returns undefined for invalid URLs (e.g., c:\fakepath\)
 */
function validateAssetUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    if (url.toLowerCase().includes('fakepath')) {
        console.warn('[Theme] Invalid asset URL detected (contains fakepath):', url);
        return undefined;
    }
    // Handle standard URLs or relative paths
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('data:')) {
        console.warn('[Theme] Invalid asset URL detected (not a valid URL):', url);
        return undefined;
    }

    return url;
}
