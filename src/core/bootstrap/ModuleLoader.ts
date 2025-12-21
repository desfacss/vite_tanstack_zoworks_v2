
import { registry } from '@/core/registry';

export interface TenantConfig {
    enabled_modules: string[];
    module_config?: Record<string, any>;
}

// Module manifest - maps module IDs to lazy imports
const MODULE_MANIFEST: Record<string, () => Promise<{ register: (config?: any) => void }>> = {
    core: () => import('@/modules/core'),
    tickets: () => import('@/modules/tickets'),
    workforce: () => import('@/modules/workforce'),
    fsm: () => import('@/modules/fsm'),
    crm: () => import('@/modules/crm'),
    contracts: () => import('@/modules/contracts'),
    admin: () => import('@/modules/admin'),
    wa: () => import('@/modules/wa'),
    catalog: () => import('@/modules/catalog'),
    erp: () => import('@/modules/erp'),
    esm: () => import('@/modules/esm'),
    wms: () => import('@/modules/wms'),
    pos: () => import('@/modules/pos'),
    landing: () => import('@/modules/landing'),
};

export async function loadModules(config: TenantConfig) {
    console.log('[ModuleLoader] Loading modules:', config.enabled_modules);

    const loadPromises = config.enabled_modules
        .filter(moduleId => MODULE_MANIFEST[moduleId])
        .map(async moduleId => {
            try {
                const startTime = performance.now();
                const module = await MODULE_MANIFEST[moduleId]();

                // Pass module-specific configuration if available
                const moduleSpecificConfig = config.module_config?.[moduleId] || {};
                module.register(moduleSpecificConfig);

                const duration = Math.round(performance.now() - startTime);
                console.log(`[ModuleLoader] ✓ ${moduleId} loaded in ${duration}ms`);
            } catch (error) {
                console.error(`[ModuleLoader] ✗ Failed to load ${moduleId}:`, error);
            }
        });

    await Promise.all(loadPromises);
    console.log('[ModuleLoader] All enabled modules loaded');
}
