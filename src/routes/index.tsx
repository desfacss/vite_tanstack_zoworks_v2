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
const AdminBranding = lazy(() => import('@/modules/admin/pages/Settings/Branding'));
const AdminFormElements = lazy(() => import('@/modules/admin/pages/Settings/FormElements'));
const Profile = lazy(() => import('../pages/core/Profile'));
const Settings = lazy(() => import('../pages/core/UserSetting'));
const WaInbox = lazy(() => import('@/modules/wa/pages/InboxPage'));
const WaSequences = lazy(() => import('@/modules/wa/pages/SequencesPage'));
const WaTemplates = lazy(() => import('@/modules/wa/pages/TemplatesPage'));
const WaQuickReplies = lazy(() => import('@/modules/wa/pages/QuickRepliesPage'));
const WaContacts = lazy(() => import('@/modules/wa/pages/ContactsPage'));
const WaSegments = lazy(() => import('@/modules/wa/pages/SegmentsPage'));
const WaCampaigns = lazy(() => import('@/modules/wa/pages/WaCampaignsPage'));
const WaCatalog = lazy(() => import('@/modules/wa/pages/CatalogPage'));
const WaSettings = lazy(() => import('@/modules/wa/pages/SettingsPage'));
const WaVariables = lazy(() => import('@/modules/wa/pages/VariablesPage'));
const DripCampaignBuilder = lazy(() => import('@/modules/wa/pages/DripCampaignBuilder'));
const WaTemplateEditor = lazy(() => import('@/modules/wa/pages/TemplateEditor'));
const WaLayout = lazy(() => import('@/modules/wa/components/WaLayout'));
const SettingsConfig = lazy(() => import('@/modules/settings/pages/Config'));

// Workforce pages
const WorkforceLeaves = lazy(() => import('@/modules/workforce/pages/Leaves'));
const WorkforceTimesheets = lazy(() => import('@/modules/workforce/pages/Timesheets'));
const WorkforceExpenses = lazy(() => import('@/modules/workforce/pages/Expenses'));
const TeamsUsers = lazy(() => import('@/modules/workforce/pages/TeamsUsers'));

// Tickets & Documents
const ServiceReports = lazy(() => import('@/modules/workforce/pages/ServiceReports'));
const ServiceInvoices = lazy(() => import('@/modules/workforce/pages/ServiceInvoices'));
const Invoices = lazy(() => import('@/modules/erp/pages/Invoices'));

// AI Module
const AIWorkbench = lazy(() => import('@/modules/ai/pages/AIWorkbench'));
const GenericDynamicPage = lazy(() => import('@/core/components/DynamicViews/GenericDynamicPage'));

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

                        {/* Service Reports */}
                        <Route path="/support/service-reports" element={<ServiceReports />} />

                        {/* Service Invoices */}
                        <Route path="/support/service-invoices" element={<ServiceInvoices />} />

                        {/* ERP - Invoices */}
                        <Route path="/erp/invoices" element={<Invoices />} />

                        {/* External - Service Assets */}
                        <Route path="/external/service-assets" element={<ServiceAssets />} />

                        {/* WhatsApp */}
                        <Route element={<WaLayout />}>
                            <Route path="/wa/inbox" element={<WaInbox />} />
                            <Route path="/wa/sequences" element={<WaSequences />} />
                            <Route path="/wa/sequences/:id" element={<DripCampaignBuilder />} />
                            <Route path="/wa/templates" element={<WaTemplates />} />
                            <Route path="/wa/templates/:id" element={<WaTemplateEditor onSubmit={async () => {}} />} />
                            <Route path="/wa/quick-replies" element={<WaQuickReplies />} />
                            <Route path="/wa/contacts" element={<WaContacts />} />
                            <Route path="/wa/segments" element={<WaSegments />} />
                            <Route path="/wa/campaigns" element={<WaCampaigns />} />
                            <Route path="/wa/catalog" element={<WaCatalog />} />
                            <Route path="/wa/settings" element={<WaSettings />} />
                            <Route path="/wa/variables" element={<WaVariables />} />
                        </Route>
                        <Route path="/settings/config" element={<SettingsConfig />} />

                        {/* Workforce */}
                        <Route path="/workforce/leaves" element={<WorkforceLeaves />} />
                        <Route path="/workforce/timesheets" element={<WorkforceTimesheets />} />
                        <Route path="/workforce/expenses" element={<WorkforceExpenses />} />
                        <Route path="/workforce/teams-users" element={<TeamsUsers />} />

                        {/* Admin - Settings & Branding */}
                        <Route path="/admin/settings" element={<AdminSettings />} />
                        <Route path="/admin/branding" element={<AdminBranding />} />
                        <Route path="/admin/form-elements" element={<AdminFormElements />} />

                        {/* Profile & Settings */}
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/settings" element={<Settings />} />

                        {/* Sample page for new module development */}
                        <Route path="/sample" element={<SamplePage />} />

                        {/* Dynamic routes for schemas */}
                        <Route path="/external/:entity" element={<GenericDynamicPage schema="external" />} />
                        <Route path="/hr/:entity" element={<GenericDynamicPage schema="hr" />} />
                        <Route path="/unified/:entity" element={<GenericDynamicPage schema="unified" />} />
                        <Route path="/identity/:entity" element={<GenericDynamicPage schema="identity" />} />

                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                    </Route>

                    {/* Special Routes - Authenticated but no permission checks */}
                    <Route element={<AuthedLayoutProvider><AuthedLayout /></AuthedLayoutProvider>}>
                        {/* AI Workbench - accessible to all authenticated users */}
                        <Route path="/ai/workbench" element={<AIWorkbench />} />
                    </Route>
                </Route>

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;
