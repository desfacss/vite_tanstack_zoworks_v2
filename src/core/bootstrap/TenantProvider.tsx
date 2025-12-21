/**
 * Tenant Provider - Bootstrap Entry Point
 * 
 * Initializes tenant-specific configuration:
 * 1. Resolves tenant from subdomain
 * 2. Loads enabled modules (lazy)
 * 3. Initializes i18n with enabled languages
 * 4. Applies tenant theme/branding
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { TenantConfig, resolveTenant } from './TenantResolver';
import { loadModules } from './ModuleLoader';
import { loadTenantTheme } from '@/core/theme/ThemeRegistry';
import { initI18n } from '@/core/i18n';

interface TenantContextType {
    config: TenantConfig | null;
    loading: boolean;
}

const TenantContext = createContext<TenantContextType>({ config: null, loading: true });

/**
 * Hook to access tenant configuration
 */
export const useTenant = () => useContext(TenantContext);

/**
 * Provider that bootstraps tenant-specific configuration
 */
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<TenantConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initTenant = async () => {
            try {
                const hostname = window.location.hostname;
                console.log(`[TenantProvider] Initializing for host: ${hostname}`);

                // 1. Resolve tenant configuration
                const tenantConfig = await resolveTenant(hostname);
                console.log(`[TenantProvider] Resolved tenant:`, {
                    subdomain: tenantConfig.subdomain,
                    modules: tenantConfig.enabled_modules,
                    languages: tenantConfig.enabled_languages,
                });

                // 2. Initialize i18n with tenant languages (BEFORE modules for translated labels)
                await initI18n(
                    tenantConfig.enabled_languages,
                    tenantConfig.default_language
                );

                // 3. Load enabled modules
                await loadModules(tenantConfig);

                // 4. Apply tenant theme/branding
                loadTenantTheme({
                    ...tenantConfig.theme_config,
                    defaultMode: tenantConfig.theme_config.mode || 'light',
                } as any);

                setConfig(tenantConfig);
                setLoading(false);
                console.log('[TenantProvider] ✓ Bootstrap complete');

            } catch (err) {
                console.error('[TenantProvider] Bootstrap failed:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize tenant');
                setLoading(false);
            }
        };

        initTenant();
    }, []);

    // Error state
    if (error) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h2>Configuration Error</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh'
            }}>
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <TenantContext.Provider value={{ config, loading }}>
            {children}
        </TenantContext.Provider>
    );
};

/**
 * Hook to get specific tenant config values
 */
export function useTenantConfig<K extends keyof TenantConfig>(key: K): TenantConfig[K] | undefined {
    const { config } = useTenant();
    return config?.[key];
}

/**
 * Hook to check if a module is enabled for the current tenant
 */
export function useIsModuleEnabled(moduleId: string): boolean {
    const { config } = useTenant();
    return config?.enabled_modules?.includes(moduleId) ?? false;
}
