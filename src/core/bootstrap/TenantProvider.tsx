
import React, { createContext, useContext, useEffect, useState } from 'react';
import { TenantConfig, resolveTenant } from './TenantResolver';
import { loadModules } from './ModuleLoader';

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
            const subdomain = window.location.hostname.split('.')[0];
            const tenantConfig = await resolveTenant(subdomain);

            // Load modules
            await loadModules({ enabledModules: tenantConfig.enabled_modules });

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
