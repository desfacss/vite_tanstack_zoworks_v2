// src/components/Layout/AuthGuard.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { LoadingFallback } from '../shared/LoadingFallback';

/**
 * @component AuthGuard
 * @description A component that protects routes based on the global authentication state.
 *
 * @returns {React.ReactElement} Either a loading fallback, a redirect, or the child routes.
 *
 * @details
 * This component has been simplified to be purely presentational. It no longer contains any data-fetching logic itself.
 * Its responsibilities are:
 * 1.  **Display Loading State**: It shows a loading indicator until the `initialized` flag in the Zustand store is `true`. This flag is set by the `SessionManager` after the initial session check is complete.
 * 2.  **Handle Unauthorized Access**: If the state is initialized and there is no user, it redirects any access to protected routes to the `/login` page.
 * 3.  **Handle Authenticated Access to Auth Pages**: If the state is initialized and a user exists, it redirects them away from public authentication pages (like `/login`) to their dashboard.
 * 4.  **Render Child Routes**: If the authentication state is valid for the current location, it renders the nested routes via `<Outlet />`.
 */
const AuthGuard: React.FC = () => {
  const location = useLocation();
  
  // Select the necessary state from the Zustand store.
  // These values are reliably updated by the SessionManager.
  const { initialized, user, viewPreferences } = useAuthStore(state => ({
    initialized: state.initialized,
    user: state.user,
    viewPreferences: state.viewPreferences,
  }));

  console.log(`>>> [AuthGuard] RENDERING. Initialized: ${initialized}, User: ${user ? user.id : 'null'}, Path: ${location.pathname}`);

  // 1. If the store is not yet initialized, show a loading fallback.
  if (!initialized) {
    console.log('>>> [AuthGuard] Render: Not initialized, showing LoadingFallback.');
    return <LoadingFallback />;
  }

  // 2. If initialized and there is NO user, redirect to login from protected routes.
  const isAuthPage = ['/login', '/signup', '/reset_password', '/web_register'].includes(location.pathname);
  if (!user && !isAuthPage) {
    console.log('>>> [AuthGuard] Render: No user, not on auth page -> Redirecting to /login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If initialized and there IS a user, redirect away from auth pages.
  if (user && isAuthPage) {
    const targetPath = (viewPreferences?.[user.id]?.lastPath || '/dashboard').split('?')[0];
    console.log(`>>> [AuthGuard] Render: User exists, but on auth page -> Redirecting to ${targetPath}.`);
    return <Navigate to={targetPath} replace />;
  }

  // If state is valid for the current location, render the child routes.
  console.log('>>> [AuthGuard] Render: State is valid, rendering Outlet.');
  return <Outlet />;
};

export default AuthGuard;