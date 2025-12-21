// src/components/Layout/AuthGuard.tsx
import React from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { LoadingFallback } from '../shared/LoadingFallback';
import {
  isHubHost,
  isLoginPortal,
  isDevelopment,
  getLoginUrl,
  getTenantUrl,
  getCurrentUrlForRedirect
} from '@/core/bootstrap/TenantResolver';

/**
 * @component AuthGuard
 * @description A component that protects routes based on the global authentication state.
 *
 * @returns {React.ReactElement} Either a loading fallback, a redirect, or the child routes.
 *
 * @details
 * This component handles multi-tenant authentication flow:
 * 
 * 1. **Login Portal (login.zoworks.com)**: Handles all authentication - no redirect needed
 * 2. **Hub Portal (app.zoworks.com/localhost)**: Can show login form, handles org selection
 * 3. **Tenant Subdomain (vkbs.zoworks.com)**: Redirects to login portal if not authenticated
 * 
 * Uses the centralized TenantResolver utilities for URL building and portal detection.
 */
const AuthGuard: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Select the necessary state from the Zustand store.
  const { initialized, user, organization, viewPreferences } = useAuthStore(state => ({
    initialized: state.initialized,
    user: state.user,
    organization: state.organization,
    viewPreferences: state.viewPreferences,
  }));

  const hostname = window.location.hostname;
  const isHub = isHubHost(hostname) || isDevelopment();
  const isLogin = isLoginPortal();
  const isAuthPage = ['/login', '/signup', '/reset_password', '/web_register'].includes(location.pathname);

  // Get redirect parameter (from login portal)
  const redirectParam = searchParams.get('redirect');

  console.log(`>>> [AuthGuard] RENDERING. Initialized: ${initialized}, User: ${user ? user.id : 'null'}, Path: ${location.pathname}, isHub: ${isHub}`);

  // 1. If the store is not yet initialized, show a loading fallback.
  if (!initialized) {
    return <LoadingFallback />;
  }

  // 2. LOGIN PORTAL POLICY
  // If we are on the login portal (login.zoworks.com), let the login page handle everything
  if (isLogin) {
    // Already on login portal - no redirects needed
    if (user && !isAuthPage) {
      // User is authenticated on login portal, redirect to their org
      const targetUrl = organization?.subdomain
        ? getTenantUrl(organization.subdomain, '/dashboard')
        : '/dashboard';

      if (!isDevelopment() && organization?.subdomain) {
        window.location.href = targetUrl;
        return <LoadingFallback />;
      }
      return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
  }

  // 3. TENANT SUBDOMAIN - NOT AUTHENTICATED
  // If on a tenant subdomain (not hub) and NOT logged in, redirect to centralized login
  if (!user && !isHub && !isAuthPage) {
    console.log('[AuthGuard] On tenant subdomain without auth, redirecting to login portal');
    const loginUrl = getLoginUrl(getCurrentUrlForRedirect());
    window.location.href = loginUrl;
    return <LoadingFallback />;
  }

  // 4. TENANT SUBDOMAIN - ON AUTH PAGE WITHOUT USER
  // If on tenant subdomain auth page, redirect to hub for auth (avoid non-existent login page on tenant)
  if (!user && !isHub && isAuthPage) {
    console.log('[AuthGuard] On tenant auth page, redirecting to login portal');
    const loginUrl = getLoginUrl(getCurrentUrlForRedirect());
    window.location.href = loginUrl;
    return <LoadingFallback />;
  }

  // 5. HUB/DEV - NOT AUTHENTICATED - ON PROTECTED ROUTE
  if (!user && !isAuthPage) {
    // On hub/dev mode and not on auth page - redirect to local login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 6. AUTHENTICATED - ON AUTH PAGE
  if (user && isAuthPage) {
    // Handle redirect parameter from login portal
    if (redirectParam) {
      try {
        const redirectUrl = new URL(redirectParam);
        // Security: Validate it's a valid zoworks subdomain before redirecting
        if (redirectUrl.hostname.endsWith('.zoworks.com') ||
          redirectUrl.hostname.endsWith('.zoworks.ai') ||
          redirectUrl.hostname === 'localhost') {
          console.log(`[AuthGuard] Redirecting to original URL: ${redirectParam}`);
          window.location.href = redirectParam;
          return <LoadingFallback />;
        }
      } catch {
        // Invalid URL, ignore and proceed with normal flow
      }
    }

    // If on hub and user has an org, redirect to their subdomain
    if (isHub && !isDevelopment() && organization?.subdomain) {
      const tenantUrl = getTenantUrl(organization.subdomain, '/dashboard');
      console.log(`[AuthGuard] Handing over to tenant: ${tenantUrl}`);
      window.location.href = tenantUrl;
      return <LoadingFallback />;
    }

    // Normal redirect to dashboard
    const targetPath = (viewPreferences?.[user.id]?.lastPath || '/dashboard').split('?')[0];
    return <Navigate to={targetPath} replace />;
  }

  // 7. VALID STATE - Render child routes
  console.log('>>> [AuthGuard] Render: State is valid, rendering Outlet.');
  return <Outlet />;
};

export default AuthGuard;