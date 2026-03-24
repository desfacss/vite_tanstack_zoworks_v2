import React, { createContext, useContext, useMemo } from 'react';
import { useAuthStore } from '@/lib/authStore';
import type { ShopConfig } from '../types/config';
import { DEFAULT_SHOP_CONFIG } from '../types/config';

interface ShopContextType {
  orgId: string;
  config: ShopConfig;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const organization = useAuthStore(s => s.organization);

  const value = useMemo(() => {
    // Priority 1: Current session organization ID
    // Priority 2: Public Organization ID from environment
    const resolvedOrgId = (organization as any)?.id || import.meta.env.VITE_PUBLIC_ORG_ID;
    
    // Resolve configuration from organization app_settings or defaults
    const orgSettings = (organization as any)?.app_settings;
    const shopCfg: Partial<ShopConfig> = orgSettings?.shop_config ?? {};
    
    return {
      orgId: resolvedOrgId,
      config: { ...DEFAULT_SHOP_CONFIG, ...shopCfg }
    };
  }, [organization]);

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
