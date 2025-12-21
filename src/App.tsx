import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp } from 'antd';
import AppRoutes from './routes';
import './i18n';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import './App.css';
import { NestedProvider } from './lib/NestedContext';
import { supabase } from './lib/supabase';
import { SessionManager } from './core/components/Layout/SessionManager';
import { GlobalSessionWatcher } from './core/components/Layout/GlobalSessionWatcher';
import { TenantProvider } from '@/core/bootstrap/TenantProvider';
import { ThemeProvider as CoreThemeProvider } from '@/core/theme/ThemeProvider';

const isDev = import.meta.env.DEV;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: isDev ? 10 : 1000 * 60 * 5,
      gcTime: isDev ? 10 : 1000 * 60 * 30,
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

if (!isDev) {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'QUERY_CACHE',
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  });
}

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

export default App;