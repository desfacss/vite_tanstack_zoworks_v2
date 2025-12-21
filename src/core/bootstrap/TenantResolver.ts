
import { supabase } from '@/core/lib/supabase';

export interface TenantConfig {
    slug: string;
    organization_id: string | null;
    enabled_modules: string[];
    module_config: Record<string, any>;
    theme_config: any;
    enabled_languages: string[];
    default_language: string;
    partition_config: any;
    features: Record<string, boolean>;
    is_demo: boolean;
}

// In-memory cache
const tenantCache = new Map<string, { config: TenantConfig; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const RESERVED_SUBDOMAINS = [
    'www', 'login', 'api', 'admin',
    'crm', 'fsm', 'esm', 'erp',
    'demo', 'docs', 'help'
];

export async function resolveTenant(subdomain: string): Promise<TenantConfig> {
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
        return getSpecialConfig(subdomain);
    }

    const cached = tenantCache.get(subdomain);
    if (cached && cached.expiry > Date.now()) {
        return cached.config;
    }

    // For now, if we don't have a tenant_configs table, we fallback to organization data
    // Or a default config. 
    // Let's implement a robust fallback.

    try {
        const { data, error } = await supabase
            .schema('identity')
            .from('tenant_configs')
            .select('*')
            .eq('subdomain', subdomain)
            .single();

        if (data && !error) {
            tenantCache.set(subdomain, {
                config: data,
                expiry: Date.now() + CACHE_TTL
            });
            return data;
        }
    } catch (e) {
        console.warn('[Tenant] tenant_configs table check failed, using fallback');
    }

    const defaultConfig = getDefaultConfig(subdomain);
    return defaultConfig;
}

function getSpecialConfig(subdomain: string): TenantConfig {
    return {
        ...getDefaultConfig(subdomain),
        slug: subdomain,
    };
}

function getDefaultConfig(subdomain: string): TenantConfig {
    return {
        slug: subdomain,
        organization_id: null,
        enabled_modules: ['core', 'tickets', 'workforce', 'fsm', 'crm', 'admin'], // Enable all by default for migration
        module_config: {},
        theme_config: {
            mode: 'light',
            primaryColor: '#1890ff',
            brandName: 'Zoworks',
        },
        enabled_languages: ['en'],
        default_language: 'en',
        partition_config: {
            organization: { required: true, visible: false },
            location: { required: false, visible: false },
        },
        features: {},
        is_demo: false,
    };
}
