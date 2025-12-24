/**
 * Centralized cache configuration for TanStack Query.
 *
 * - Development: No caching (always fetch fresh data)
 * - Production: 30-day cache with version-based invalidation
 *
 * @see docs/architecture/config_loading_strategy.md
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.VITE_APP_ENV === 'production';

interface CacheConfig {
  /** How long data is considered "fresh" - no refetch during this time */
  staleTime: number;
  /** How long inactive queries stay in memory */
  gcTime: number;
  /** How long persisted cache survives browser restart */
  persistMaxAge: number;
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  development: {
    staleTime: 0,
    gcTime: 0,
    persistMaxAge: 0,
  },
  production: {
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    gcTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    persistMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

/**
 * Get cache configuration based on environment.
 * Returns development config (no caching) if DEV mode or VITE_APP_ENV !== 'production'.
 */
export const getCacheConfig = (): CacheConfig => {
  if (isDev || !isProduction) {
    return CACHE_CONFIGS.development;
  }
  return CACHE_CONFIGS.production;
};

/**
 * Check if running in development mode.
 */
export const isDevMode = (): boolean => isDev || !isProduction;

/**
 * localStorage key for storing the config version the client has seen.
 */
export const CONFIG_VERSION_KEY = 'zo_config_version';
