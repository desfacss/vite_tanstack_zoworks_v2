import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp } from 'antd';
import AppRoutes from './routes';
import './i18n';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import './App.css';
import { NestedProvider } from '@/core/lib/NestedContext';
import { supabase } from '@/core/lib/supabase';
import { SessionManager } from './core/components/Layout/SessionManager';
import { GlobalSessionWatcher } from './core/components/Layout/GlobalSessionWatcher';
import { TenantProvider } from '@/core/bootstrap/TenantProvider';
import { ThemeProvider as CoreThemeProvider } from '@/core/theme/ThemeProvider';
import { getCacheConfig, isDevMode, CONFIG_VERSION_KEY } from '@/core/lib/cacheConfig';

const cacheConfig = getCacheConfig();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: cacheConfig.staleTime,
      gcTime: cacheConfig.gcTime,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Setup localStorage persistence for production only
if (!isDevMode()) {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'QUERY_CACHE',
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: cacheConfig.persistMaxAge, // 30 days in production
  });
}

/**
 * Check config version from core.meta_config and invalidate cache if newer version exists.
 * Uses version-based invalidation: each client stores last seen version in localStorage.
 * When DB version > local version, cache is invalidated and local version is updated.
 *
 * @see docs/architecture/config_loading_strategy.md
 */
const checkConfigVersion = async () => {
  // Skip in development mode
  if (isDevMode()) return;

  try {
    const { data, error } = await supabase
      .schema('core')
      .from('meta_config')
      .select('config_value')
      .eq('config_key', 'config_version')
      .single();

    if (error || !data) {
      // Config version not set in DB, skip check
      return;
    }

    // config_value is JSONB, extract version number
    const dbVersion = typeof data.config_value === 'object'
      ? (data.config_value as { version?: number }).version || 1
      : parseInt(String(data.config_value), 10) || 1;

    const localVersion = parseInt(localStorage.getItem(CONFIG_VERSION_KEY) || '0', 10);

    if (dbVersion > localVersion) {
      console.log(`[Cache] Config version changed ${localVersion} → ${dbVersion}, invalidating cache`);

      // Invalidate all config-related queries
      queryClient.invalidateQueries({ queryKey: ['viewConfigEnhanced'] });
      queryClient.invalidateQueries({ queryKey: ['FormConfig'] });

      // Clear persisted cache from localStorage
      localStorage.removeItem('QUERY_CACHE');

      // Update local version to prevent repeated invalidation
      localStorage.setItem(CONFIG_VERSION_KEY, dbVersion.toString());
    }
  } catch (e) {
    console.warn('[Cache] Could not check config version', e);
  }
};

// Check config version on module load (before React renders)
checkConfigVersion();

function App() {
  useEffect(() => {
    if (window.ReactNativeWebView) {
      console.log('Detected React Native WebView environment. Starting handshake.');
      const handleWebViewMessage = async (event: MessageEvent) => {
        try {
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            if (message.type === 'SESSION_DATA' && message.session) {
              console.log('Received session data from React Native:', message.session);
              const { error } = await supabase.auth.setSession(message.session);
              if (error) {
                console.error('Error setting session in Supabase:', error);
              } else {
                console.log('Session successfully set in web app.');
              }
            }
          }
        } catch (error) {
          console.warn('Error processing message from RN WebView:', error);
        }
      };
      window.addEventListener('message', handleWebViewMessage);
      console.log('Requesting session from React Native...');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SESSION' }));
      return () => {
        console.log('Cleaning up RN WebView message listener.');
        window.removeEventListener('message', handleWebViewMessage);
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <CoreThemeProvider>
          <AntApp>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <SessionManager />
              <GlobalSessionWatcher />
              <NestedProvider>
                <AppRoutes />
              </NestedProvider>
            </BrowserRouter>
          </AntApp>
        </CoreThemeProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}

export default App