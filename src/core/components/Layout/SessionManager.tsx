// src/components/Layout/SessionManager.tsx
// CRITICAL FIX: Ensure JWT has organization_id claim BEFORE any queries execute

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/core/lib/store';
import { useUserSession } from '@/core/hooks/useUserSession';
import { supabase } from '@/lib/supabase';
import { loadTenantTheme } from '@/core/theme/ThemeRegistry';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/core/i18n';

export const SessionManager = () => {
  console.log('[SessionManager] 🧩 Component Rendered');
  const [enabled, setEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    setSession,
    clearUserSession,
    setInitialized,
    setAuthError,
    organization,
    isLoggingOut,
    setIsLoggingOut
  } = useAuthStore(state => ({
    setSession: state.setSession,
    clearUserSession: state.clearUserSession,
    setInitialized: state.setInitialized,
    setAuthError: state.setAuthError,
    organization: state.organization,
    isLoggingOut: state.isLoggingOut,
    setIsLoggingOut: state.setIsLoggingOut
  }));

  const { data, isSuccess, isError, error, isStale } = useUserSession(
    enabled && !isLoggingOut && !isRefreshing,
    organization?.id
  );

  // --- Effect 1: Manage Auth Lifecycle with BLOCKING JWT Refresh ---
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: ensure app initializes after 5 seconds NO MATTER WHAT
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('[SessionManager] ⚠️ Safety timeout triggered! Forcing initialization...');
        setInitialized(true);
      }
    }, 5000);

    const initAuth = async () => {
      console.log('[SessionManager] 🚀 initAuth STARTED');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[SessionManager] Supabase Session Error:', sessionError);
          if (isMounted) setInitialized(true);
          return;
        }

        if (session) {
          const user = session.user;
          const userMetadata = user.user_metadata;
          const appMetadata = user.app_metadata;

          console.log('[SessionManager] Initial Init - User Metadata:', userMetadata);
          console.log('[SessionManager] Initial Init - App Metadata:', appMetadata);

          // Check for org_id in multiple possible locations
          const hasOrgClaim = userMetadata?.org_id ||
            userMetadata?.organization_id ||
            appMetadata?.org_id ||
            appMetadata?.organization_id;

          if (!hasOrgClaim) {
            console.log('[SessionManager] ⚠️ Missing org_id/organization_id in JWT. Refreshing...');
            setIsRefreshing(true);

            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

              if (refreshError) {
                console.error('[SessionManager] ❌ Refresh failed:', refreshError);
                if (isMounted) {
                  setInitialized(true);
                  setIsRefreshing(false);
                }
                return;
              }

              if (refreshData.session) {
                const refreshedUser = refreshData.session.user;
                console.log('[SessionManager] Debug - Refreshed User Metadata:', refreshedUser.user_metadata);
                console.log('[SessionManager] Debug - Refreshed App Metadata:', refreshedUser.app_metadata);

                const newHasOrg = refreshedUser.user_metadata?.org_id ||
                  refreshedUser.user_metadata?.organization_id ||
                  refreshedUser.app_metadata?.org_id ||
                  refreshedUser.app_metadata?.organization_id;

                if (newHasOrg) {
                  console.log('[SessionManager] ✅ Refresh complete. Enabling queries NOW.');
                  if (isMounted) {
                    setIsRefreshing(false);
                    setEnabled(true);
                  }
                } else {
                  console.error('[SessionManager] ❌ Refresh STILL didn\'t add org_id!');
                  console.log('[SessionManager] Full Session User Object:', JSON.stringify(refreshedUser, null, 2));
                  if (isMounted) {
                    setAuthError('Session refresh failed. Please logout and login again.');
                    setInitialized(true);
                    setIsRefreshing(false);
                  }
                }
              }
            } catch (err) {
              console.error('[SessionManager] Unexpected Refresh error:', err);
              if (isMounted) {
                setInitialized(true);
                setIsRefreshing(false);
              }
            }
          } else {
            console.log('[SessionManager] ✅ JWT has org context. Enabling queries.');
            if (isMounted) {
              setEnabled(true);
              // Note: setInitialized(true) will be called by useUserSession -> setSession
            }
          }
        } else {
          console.log('[SessionManager] No session found.');
          if (isMounted) setInitialized(true);
        }
      } catch (err) {
        console.error('[SessionManager] Critical error in initAuth:', err);
        if (isMounted) setInitialized(true);
      } finally {
        clearTimeout(safetyTimer);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === 'SIGNED_IN') {
        setIsLoggingOut(false);
        console.log('[SessionManager] 🔑 SIGNED_IN event detected');
        setEnabled(true);
      }

      if (event === 'SIGNED_OUT') {
        setEnabled(false);
        clearUserSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [clearUserSession, setInitialized, setIsLoggingOut, setAuthError]);

  // --- Effect 2: Sync Data to Store ---
  useEffect(() => {
    if (isLoggingOut) return;

    if (isSuccess && data) {
      if (organization?.id && data.organization.id !== organization.id) {
        return;
      }
      setSession(data);
    }

    if (isError && error) {
      console.error('[SessionManager] Session fetch failed:', error.message);
      setAuthError(error.message);
      setInitialized(true);
    }
  }, [isSuccess, isError, data, setSession, clearUserSession, error, organization?.id, isLoggingOut, setAuthError, isStale, setInitialized]);

  // --- Effect 3: Watch and Apply Theme Configuration ---
  useEffect(() => {
    if (data?.organization?.theme_config) {
      console.log('[SessionManager] Applying org theme_config from database:', data.organization.theme_config);
      loadTenantTheme(data.organization.theme_config as any);
    }
  }, [data?.organization?.theme_config]);

  // --- Effect 4: Watch and Apply Language Configuration ---
  const { i18n } = useTranslation();
  useEffect(() => {
    if (data?.organization) {
      const enabledLangs = data.organization.enabled_languages || ['en'];
      const defaultLang = data.organization.default_language || 'en';

      if (!enabledLangs.includes(i18n.language)) {
        console.log(`[SessionManager] Language ${i18n.language} not enabled for org. Switching to ${defaultLang}.`);
        changeLanguage(defaultLang);
      }
    }
  }, [data?.organization, i18n]);

  return null;
};
