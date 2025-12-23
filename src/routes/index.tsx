// src/routes/index.tsx
// Mini-project routes: auth + dashboard + contacts (dynamic views) + profile + settings

import { Suspense, lazy, useEffect, FC } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/core/lib/store';
import { useTranslation } from 'react-i18next';
import { getNavigationItems } from '@/core/components/Layout/Sider/navigation';

// Direct imports for critical components
import PublicLayout from '../core/components/Layout/PublicLayout';
import AuthGuard from '../core/components/Layout/AuthGuard';
import AuthedLayout from '../core/components/Layout/AuthedLayout';
import { AuthedLayoutProvider } from '../core/components/Layout/AuthedLayoutContext';
import { NotFound } from '../core/components/Layout/NotFound';
import { LoadingFallback } from '../core/components/shared/LoadingFallback';

// Lazy load pages
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/auth/Login'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
const Signup = lazy(() => import('../pages/auth/Signup'));
const WebRegister = lazy(() => import('../pages/auth/WebRegister'));

// Protected pages
const Dashboard = lazy(() => import('../pages/Dashboard'));
const WelcomeHub = lazy(() => import('../core/components/Layout/WelcomeHub'));
const SamplePage = lazy(() => import('../pages/SamplePage'));
const Contacts = lazy(() => import('@/modules/crm/pages/Contacts'));
const Tickets = lazy(() => import('@/modules/tickets/pages/Tickets'));
const ServiceAssets = lazy(() => import('@/modules/external/pages/ServiceAssets'));
const AdminSettings = lazy(() => import('@/modules/admin/pages/Settings'));
const Profile = lazy(() => import('../pages/core/Profile'));
const Settings = lazy(() => import('../pages/core/UserSetting'));

const generateNavItems = (t: (key: string) => string) => {
    // For mini-project, we return a static set of nav items
    // In the full app, this would be dynamically generated based on permissions
    const items = [
        {
            key: '/welcome',
            label: t('core.navigation.home'),
            path: '/welcome',
        },
        {
            key: '/dashboard',
            label: t('core.navigation.dashboard'),
            path: '/dashboard',
        },
        {
            key: '/crm/contacts',
            label: t('core.navigation.contacts'),
            path: '/crm/contacts',
        },
        {
            key: '/sample',
            label: t('core.navigation.sample'),
            path: '/sample',
        },
    ];
    return items;
};

export const AppRoutes: FC = () => {
    const { user, permissions, setNavigationItems } = useAuthStore(state => ({
        user: state.user,
        permissions: state.permissions,
        setNavigationItems: state.setNavigationItems,
    }));
    const { t, i18n } = useTranslation();

    console.log('>>> [AppRoutes] State from store - User:', user ? user.id : 'undefined');

    // Set navigation items when user is authenticated
    useEffect(() => {
        if (permissions && user) {
            console.log('>>> [AppRoutes] Permissions and User exist. Setting Nav Items.');
            const navItems = getNavigationItems(t, permissions, user) || [];
            setNavigationItems(navItems as any);
        } else {
            console.log('>>> [AppRoutes] Permissions or User missing. Clearing nav items.');
            setNavigationItems([]);
        }
    }, [permissions, user, setNavigationItems, t, i18n.language, i18n.isInitialized]);

    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                {/* Public routes */}
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                </Route>

                {/* Auth-protected routes */}
                <Route element={<AuthGuard />}>
                    {/* Auth pages (login, signup, etc.) */}
                    <Route element={<PublicLayout />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/reset_password" element={<ResetPassword />} />
                        <Route path="/web_register" element={<WebRegister />} />
                    </Route>

                    {/* Protected pages with AuthedLayout */}
                    <Route element={<AuthedLayoutProvider><AuthedLayout /></AuthedLayoutProvider>}>
                        <Route index element={<Navigate to="/welcome" replace />} />

                        {/* Welcome Hub - Landing page */}
                        <Route path="/welcome" element={<WelcomeHub />} />

                        {/* Dashboard */}
                        <Route path="/dashboard" element={<Dashboard />} />

                        {/* CRM - Contacts (DynamicViews demo) */}
                        <Route path="/crm/contacts" element={<Contacts />} />

                        {/* Support - Tickets */}
                        <Route path="/support/tickets" element={<Tickets />} />

                        {/* External - Service Assets */}
                        <Route path="/external/service-assets" element={<ServiceAssets />} />

                        {/* Admin - Settings */}
                        <Route path="/admin/settings" element={<AdminSettings />} />

                        {/* Profile & Settings */}
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/settings" element={<Settings />} />

                        {/* Sample page for new module development */}
                        <Route path="/sample" element={<SamplePage />} />

                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Route>

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;
