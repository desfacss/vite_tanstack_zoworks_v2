
import { supabase } from '@/core/lib/supabase';
import env_def from '@/core/lib/env';

/**
 * Tenant configuration resolved from identity.v_organizations.
 * This represents the "Hydrated" state of an organization, merged with 
 * system-wide base configurations.
 */
export interface TenantConfig {
    subdomain: string;
    organization_id: string;
    organization_name: string;
    enabled_modules: string[];         // Merged list of active module keys
    module_config: Record<string, any>; // Inherited & specific module settings
    theme_config: {
        mode?: 'light' | 'dark';
        primaryColor: string;
        brandName: string;
        logoUrl?: string;
        borderRadius?: number;
        light?: {
            primaryColor: string;
            logoUrl?: string;
            cardBg?: string;
            layoutBg?: string;
            headerBg?: string;
            siderBg?: string;
            inputBg?: string;
            textColor?: string;
        };
        dark?: {
            primaryColor: string;
            logoUrl?: string;
            cardBg?: string;
            layoutBg?: string;
            headerBg?: string;
            siderBg?: string;
            inputBg?: string;
            textColor?: string;
        };
        preset?: string;
    };
    enabled_languages: string[];
    default_language: string;
    is_demo: boolean;
    is_login_portal: boolean;          // NEW: Is this the login portal?
    is_hub: boolean;                   // NEW: Is this the hub/app portal?
    details: Record<string, any>;      // Organizational details (address, etc.)
    app_settings: Record<string, any>; // Merged application settings (secrets, tokens, flags)
}

// In-memory cache for ultra-fast subsequent lookups
const tenantCache = new Map<string, { config: TenantConfig; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Subdomains reserved for authentication portal
const AUTH_SUBDOMAINS = ['login', 'auth', 'sso', 'signin'];

// Subdomains reserved for hub/app portal (no specific tenant)
const HUB_SUBDOMAINS = ['app', 'www', 'hub', ''];

// Other reserved subdomains
const RESERVED_SUBDOMAINS = [...AUTH_SUBDOMAINS, ...HUB_SUBDOMAINS, 'api', 'admin', 'demo', 'docs', 'help'];

// ============================================================================
// HOSTNAME & SUBDOMAIN UTILITIES
// ============================================================================

/**
 * Checks if we're in development mode (localhost)
 */
export function isDevelopment(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        env_def.IS_DEV_MODE === true;
}

/**
 * Extracts subdomain from current hostname
 */
export function getSubdomain(): string {
    const hostname = window.location.hostname;

    // Development mode - allow override via ?tenant=XXX for testing
    // http://localhost:5174/welcome?tenant=vkbs&preset=glassmorphism
    if (isDevelopment()) {
        const params = new URLSearchParams(window.location.search);
        const tenant = params.get('tenant');
        if (tenant) return tenant;
        return 'hub';
    }

    const parts = hostname.split('.');
    // hostname like vkbs.zoworks.com -> ['vkbs', 'zoworks', 'com']
    // hostname like zoworks.com -> ['zoworks', 'com']
    return parts.length >= 3 ? parts[0] : 'hub';
}

/**
 * Checks if current hostname is the centralized login portal
 */
export function isLoginPortal(): boolean {
    if (isDevelopment()) return false; // Dev mode handles login inline
    const subdomain = getSubdomain();
    return AUTH_SUBDOMAINS.includes(subdomain.toLowerCase());
}

/**
 * Checks if current hostname is the hub (no specific tenant)
 */
export function isHubPortal(): boolean {
    if (isDevelopment()) return true; // Dev mode is always hub
    const subdomain = getSubdomain();
    return HUB_SUBDOMAINS.includes(subdomain.toLowerCase()) || subdomain === 'hub';
}

/**
 * Detects if the current hostname is the Centralized Hub (no tenant).
 */
export function isHubHost(hostname: string): boolean {
    const parts = hostname.split('.');
    const appUrl = env_def.APP_URL || 'localhost:5174';
    const baseHost = appUrl.replace(/^https?:\/\//, '').split(':')[0];

    return hostname === baseHost ||
        parts.length <= 1 ||
        hostname.startsWith('app.') ||
        hostname.startsWith('www.') ||
        isDevelopment();
}

// ============================================================================
// URL BUILDERS
// ============================================================================

/**
 * Builds the URL to the centralized login portal
 * @param redirectTo - URL to redirect to after successful login
 */
export function getLoginUrl(redirectTo?: string): string {
    const baseAuthUrl = env_def.AUTH_BASE_URL || 'https://login.zoworks.com';

    // In dev mode, use local login route
    if (isDevelopment()) {
        const localUrl = `${window.location.origin}/login`;
        if (redirectTo) {
            return `${localUrl}?redirect=${encodeURIComponent(redirectTo)}`;
        }
        return localUrl;
    }

    if (redirectTo) {
        return `${baseAuthUrl}/login?redirect=${encodeURIComponent(redirectTo)}`;
    }
    return `${baseAuthUrl}/login`;
}

/**
 * Builds a URL for a specific tenant subdomain
 * @param subdomain - Tenant subdomain (e.g., 'vkbs')
 * @param path - Path within the app (e.g., '/dashboard')
 */
export function getTenantUrl(subdomain: string, path: string = '/'): string {
    const baseDomain = env_def.APP_BASE_DOMAIN || 'zoworks.com';

    // Development mode - stay on localhost
    if (isDevelopment()) {
        return `${window.location.origin}${path}`;
    }

    const protocol = window.location.protocol;
    return `${protocol}//${subdomain}.${baseDomain}${path}`;
}

/**
 * Gets the current page URL for redirect purposes
 */
export function getCurrentUrlForRedirect(): string {
    return window.location.href;
}

// ============================================================================
// TENANT RESOLUTION
// ============================================================================

/**
 * Resolves the tenant's identity and capabilities in a single database hit
 * from the identity.v_organizations view.
 */
export async function resolveTenant(hostname: string): Promise<TenantConfig> {
    const isHub = isHubHost(hostname);
    const isLogin = isLoginPortal();
    const parts = hostname.split('.');

    // If it's a tenant, the first part is the subdomain (e.g. vkbs in vkbs.zoworks.ai)
    // If it's the hub, we treat it as 'hub' context
    const subdomain = isHub ? 'hub' : parts[0];

    // Login portal or hub - return minimal config
    if (isLogin) {
        return getLoginPortalConfig();
    }

    if (isHub || RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
        return getEmergencyDefaults(subdomain);
    }

    // Check cache
    const cached = tenantCache.get(subdomain);
    if (cached && cached.expiry > Date.now()) {
        return cached.config;
    }

    try {
        // Query the hydrated view - handles inheritance (Base -> Org)
        const { data, error } = await supabase
            .schema('identity')
            .from('v_organizations')
            .select('*')
            .eq('subdomain', subdomain)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            const config: TenantConfig = {
                ...data,
                is_login_portal: false,
                is_hub: false,
            };

            // Theme is now fully driven by database - no code overrides

            console.log(`[Tenant] Resolved config for ${subdomain}:`, config);
            tenantCache.set(subdomain, {
                config,
                expiry: Date.now() + CACHE_TTL
            });
            return config;
        }
    } catch (e) {
        console.error('[Tenant] Custom resolution failed:', e);
    }

    return getEmergencyDefaults(subdomain);
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Config for the login portal subdomain
 */
function getLoginPortalConfig(): TenantConfig {
    return {
        subdomain: 'login',
        organization_id: '',
        organization_name: 'Zoworks Login',
        enabled_modules: ['core'],
        module_config: {},
        theme_config: {
            mode: 'light',
            primaryColor: '#1890ff',
            brandName: 'Zoworks',
        },
        enabled_languages: ['en'],
        default_language: 'en',
        is_demo: false,
        is_login_portal: true,
        is_hub: false,
        details: {},
        app_settings: {
            platform_name: 'Zoworks Login',
            is_login_portal: true,
        }
    };
}

/**
 * Factory defaults used for reserved domains or during database outages.
 */
function getEmergencyDefaults(subdomain: string): TenantConfig {
    const isHub = HUB_SUBDOMAINS.includes(subdomain) || subdomain === 'hub';

    return {
        subdomain,
        organization_id: '',
        organization_name: 'Zoworks',
        enabled_modules: ['core', 'tickets'],
        module_config: {},
        theme_config: {
            mode: 'light',
            primaryColor: '#1890ff',
            brandName: 'Zoworks',
            // No preset - theme is fully driven by database
        },
        enabled_languages: ['en', 'kn'],
        default_language: 'en',
        is_demo: false,
        is_login_portal: false,
        is_hub: isHub,
        details: {},
        app_settings: {
            support_email: 'support@zoworks.ai',
            platform_name: isHub ? 'Zoworks Hub' : 'Zoworks',
            is_hub: isHub,
        }
    };
}


