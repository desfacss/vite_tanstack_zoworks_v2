
import React, { createContext, useContext, useEffect, useState } from 'react';
import { TenantConfig, resolveTenant } from './TenantResolver';
import { loadModules } from './ModuleLoader';
import { loadTheme } from '@/core/theme/ThemeRegistry';

interface TenantContextType {
    config: TenantConfig | null;
    loading: boolean;
}

const TenantContext = createContext<TenantContextType>({ config: null, loading: true });

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<TenantConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initTenant = async () => {
            const hostname = window.location.hostname;
            console.log(`[TenantProvider] Initializing for host: ${hostname}`);
            const tenantConfig = await resolveTenant(hostname);
            console.log(`[TenantProvider] Received config:`, tenantConfig);

            // Load modules
            await loadModules(tenantConfig);

            // Apply Theme/Branding
            loadTheme(tenantConfig.theme_config);

            setConfig(tenantConfig);
            setLoading(false);
        };

        initTenant();
    }, []);

    return (
        <TenantContext.Provider value={{ config, loading }}>
            {!loading ? children : <div>Loading Experience...</div>}
        </TenantContext.Provider>
    );
};
