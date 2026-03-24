// src/modules/shop/hooks/useShopConfig.ts
// Reads shop_config from org app_settings (same pattern as `timesheet_settings`)
import { useMemo } from 'react';
import { useAuthStore } from '@/lib/authStore';
import type { ShopConfig } from '../types/config';
import { DEFAULT_SHOP_CONFIG } from '../types/config';

export function useShopConfig(): ShopConfig {
  const organization = useAuthStore(s => s.organization);

  return useMemo<ShopConfig>(() => {
    const orgSettings = (organization as any)?.app_settings;
    const shopCfg: Partial<ShopConfig> = orgSettings?.shop_config ?? {};
    return { ...DEFAULT_SHOP_CONFIG, ...shopCfg };
  }, [organization]);
}
