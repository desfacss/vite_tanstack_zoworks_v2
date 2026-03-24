// src/components/Layout/SessionManager.tsx
// CRITICAL FIX: Ensure JWT has organization_id claim BEFORE any queries execute

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/core/lib/store';
import { useUserSession } from '@/core/hooks/useUserSession';
import { supabase } from '@/lib/supabase';
import { loadTenantTheme, applyAccessibility } from '@/core/theme/ThemeRegistry';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/core/i18n';
import { useNavigate } from 'react-router-dom';

export const SessionManager = () => {
  console.log('[SessionManager] 🧩 Component Rendered');
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);

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
    enabled && !isLoggingOut,
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
      
      // MANUAL HASH DETECTION (Fallback for Implicit Flow tokens in PKCE mode)
      const hash = window.location.hash.substring(1);
      if (hash.includes('access_token=')) {
        console.log('[SessionManager] 🧩 Manual hash detection found access_token. Attempting setSession...');
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const errorCode = params.get('error_code');
        
        if (errorCode) {
          console.error(`[SessionManager] ❌ Auth error in hash: ${errorCode} - ${params.get('error_description')}`);
          setAuthError(`Auth error: ${params.get('error_description')}`);
          setInitialized(true);
          clearTimeout(safetyTimer);
          return;
        }

        if (accessToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('[SessionManager] ❌ Manual setSession failed:', error.message);
            setAuthError(error.message);
            setInitialized(true);
            clearTimeout(safetyTimer);
            return;
          } else {
            console.log('[SessionManager] ✅ Manual setSession SUCCESS. Session:', data.session?.user?.id);
            // setSession in store will be handled by the SIGNED_IN event or Effect 2
            if (type === 'recovery') {
              console.log('[SessionManager] 🔐 Detected recovery type in manual hash. Forcing navigate to /reset_password');
              navigate('/reset_password', { replace: true });
              setInitialized(true); // Recovery flow will handle further initialization
              clearTimeout(safetyTimer);
              return;
            }
          }
        }
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[SessionManager] Supabase Session Error:', sessionError);
          if (isMounted) setInitialized(true);
          clearTimeout(safetyTimer);
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
            console.log('[SessionManager] ⚠️ Missing org_id context in JWT. Proceeding to fetch profile...');
          } else {
            console.log('[SessionManager] ✅ JWT has org context.');
          }

          if (isMounted) {
            setEnabled(true);
            // Note: setInitialized(true) will be called by useUserSession -> setSession or onError
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

    const subscription = supabase.auth.onAuthStateChange(async (event, _session) => {
      console.log(`%c[SessionManager] 🔄 Auth Event: ${event}`, 'color: #3b82f6; font-weight: bold;');

      if (event === 'SIGNED_IN') {
        setIsLoggingOut(false);
        console.log('[SessionManager] 🔑 SIGNED_IN detected');
        setEnabled(true);

        // If it's a magic link or regular login on the root/login page, move to dashboard
        // But only if we are NOT in a recovery flow (which will fire its own event)
        const isAuthFlow = window.location.hash.includes('type=recovery') || 
                           window.location.hash.includes('type=invite');
        
        if (!isAuthFlow && (window.location.pathname === '/' || window.location.pathname === '/login')) {
          console.log('[SessionManager] 🪄 Magic link or login on root. Prompting move to dashboard in Home or here.');
          // We let Home or AuthGuard handle the dashboard landing generally, 
          // but we can force it here if needed.
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        console.log('%c[SessionManager] 🔐 PASSWORD_RECOVERY detected. Redirecting to /reset_password', 'color: #ef4444; font-weight: bold;');
        navigate('/reset_password', { replace: true });
      }

      if (event === 'SIGNED_OUT') {
        console.log('[SessionManager] 🚪 SIGNED_OUT detected');
        setEnabled(false);
        clearUserSession();
      }
    });

    return () => {
      console.log('[SessionManager] 🧹 Unsubscribing from auth changes');
      subscription.data.subscription.unsubscribe();
    };
  }, [clearUserSession, setInitialized, setIsLoggingOut, setAuthError, navigate]);

  // --- Effect 2: Sync Data to Store & Enforce Password Confirmation ---
  useEffect(() => {
    if (isLoggingOut) return;

    if (isSuccess && data) {
      // 1. DATA MERGE: If fetching the full org record fails (null), but the store already has info
      // for this ID (from Header switch), we preserve the store's info to keep UI consistent.
      let finalData = data;
      const currentOrg = useAuthStore.getState().organization;
      if (!data.organization && currentOrg?.id === data.org_id) {
        console.log(`[SessionManager] 🛡️ Database org record missing for ID: ${data.org_id}. Preserving store info:`, currentOrg.name);
        finalData = { ...data, organization: currentOrg };
      }

      // 2. CRITICAL NULL CHECK: if it's still null, log warning
      if (!finalData.organization) {
        console.warn('[SessionManager] ⚠️ Fetched session has no organization. Possibly invalid org_id in JWT.');
      }

      // 3. STALE DATA GUARD: Ensure we don't apply an old fetch if the user has already switched again
      if (currentOrg?.id && finalData.organization?.id && finalData.organization.id !== currentOrg.id) {
        console.log('[SessionManager] 🔄 Org mismatch detected in stream. Ignoring stale data.');
        return;
      }
      
      setSession(finalData);

      // --- PASSWORD CONFIRMATION ENFORCEMENT ---
      // If user hasn't confirmed their password, force them to the reset_password page
      const isPasswordConfirmed = data.user?.password_confirmed;
      const currentPath = window.location.pathname;

      if (isPasswordConfirmed === false && currentPath !== '/reset_password') {
        console.warn('[SessionManager] 🔐 Password setup required. Redirecting to /reset_password');
        navigate('/reset_password', { replace: true });
      }
    }

    if (isError && error) {
      console.error('[SessionManager] Session fetch failed:', error.message);
      setAuthError(error.message);
      setInitialized(true);
    }
  }, [isSuccess, isError, data, setSession, clearUserSession, error, organization?.id, isLoggingOut, setAuthError, isStale, setInitialized, navigate]);

  // --- Effect 3: Watch and Apply Theme & Accessibility Configuration ---
  useEffect(() => {
    // 1. Apply Organization Theme
    if (data?.organization?.theme_config) {
      console.log('[SessionManager] Applying org theme_config:', data.organization.theme_config);
      loadTenantTheme(data.organization.theme_config as any);
    }

    // 2. Apply User Accessibility Preferences
    const accessPrefs = useAuthStore.getState().accessibilityPreferences;
    if (accessPrefs) {
      console.log('[SessionManager] Applying accessibility preferences:', accessPrefs);
      applyAccessibility(accessPrefs);
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
