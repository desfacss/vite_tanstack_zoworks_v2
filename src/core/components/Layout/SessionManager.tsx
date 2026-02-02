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
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const claims = session.user.user_metadata;
        const hasOrgClaim = claims?.org_id || claims?.organization_id;

        if (!hasOrgClaim) {
          console.log('[SessionManager] ⚠️ Missing org_id. Refreshing BEFORE enabling queries...');
          setIsRefreshing(true);

          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
              console.error('[SessionManager] ❌ Refresh failed:', refreshError);
              setInitialized(true);
              setIsRefreshing(false);
              return;
            }

            if (refreshData.session) {
              const newClaims = refreshData.session.user.user_metadata;
              if (newClaims?.organization_id || newClaims?.org_id) {
                console.log('[SessionManager] ✅ Refresh complete. Enabling queries NOW.');
                setIsRefreshing(false);
                setEnabled(true);
              } else {
                console.error('[SessionManager] ❌ Refresh didn\'t add org_id!');
                setAuthError('Session refresh failed. Please logout and login again.');
                setInitialized(true);
                setIsRefreshing(false);
              }
            }
          } catch (err) {
            console.error('[SessionManager] Refresh error:', err);
            setInitialized(true);
            setIsRefreshing(false);
          }
        } else {
          console.log('[SessionManager] ✅ JWT already has org_id. Enabling queries.');
          setEnabled(true);
        }
      } else {
        setInitialized(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        setIsLoggingOut(false);

        if (session) {
          const claims = session.user.user_metadata;
          if (!(claims?.org_id || claims?.organization_id)) {
            console.log('[SessionManager] New sign-in missing org. Refreshing...');
            setIsRefreshing(true);
            const { data: refreshData } = await supabase.auth.refreshSession();
            setIsRefreshing(false);
            if (refreshData.session) {
              console.log('[SessionManager] Sign-in refresh complete.');
            }
          }
        }

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
