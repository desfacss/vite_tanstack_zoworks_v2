import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Ticket,
    Users,
    Settings,
    Clock,
    TrendingUp,
    Sparkles,
    ArrowRight,
    Calendar,
    MessageSquare,
    HelpCircle,
    Zap
} from 'lucide-react';
import { useAuthStore, useThemeStore } from '@/core/lib/store';
import { getTenantBrandName, getTenantLogoUrl } from '@/core/theme/ThemeRegistry';
import { useTranslation } from 'react-i18next';

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    description: string;
    path: string;
    gradient: string;
}

/**
 * WelcomeHub - A visually stunning landing page for authenticated users
 * 
 * Features:
 * - Personalized welcome message
 * - Time-based greeting (Good morning/afternoon/evening)
 * - Quick action cards with gradients
 * - Auto-redirect to default page (configurable)
 * - Beautiful abstract background design
 */
export const WelcomeHub: React.FC = () => {
    const navigate = useNavigate();
    const { user, organization } = useAuthStore();
    const { isDarkMode } = useThemeStore();
    const { t, i18n } = useTranslation();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Get branding
    const logoUrl = getTenantLogoUrl(isDarkMode);
    const brandName = getTenantBrandName();

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Get appropriate greeting based on time
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return t('core.welcome_hub.label.greeting_morning');
        if (hour < 17) return t('core.welcome_hub.label.greeting_afternoon');
        return t('core.welcome_hub.label.greeting_evening');
    };

    // Get user's first name
    const firstName = user?.name?.split(' ')[0] || t('common.label.user_placeholder');

    // Quick actions with beautiful gradients
    const quickActions: QuickAction[] = [
        {
            icon: <LayoutDashboard size={24} />,
            label: t('core.welcome_hub.action.dashboard'),
            description: t('core.welcome_hub.action.dashboard_desc'),
            path: '/dashboard',
            gradient: 'from-blue-500 to-cyan-400',
        },
        {
            icon: <Ticket size={24} />,
            label: t('core.welcome_hub.action.tickets'),
            description: t('core.welcome_hub.action.tickets_desc'),
            path: '/tickets',
            gradient: 'from-purple-500 to-pink-400',
        },
        {
            icon: <Calendar size={24} />,
            label: t('core.welcome_hub.action.tasks'),
            description: t('core.welcome_hub.action.tasks_desc'),
            path: '/tasks',
            gradient: 'from-orange-500 to-amber-400',
        },
        {
            icon: <Users size={24} />,
            label: t('core.welcome_hub.action.clients'),
            description: t('core.welcome_hub.action.clients_desc'),
            path: '/clients',
            gradient: 'from-green-500 to-emerald-400',
        },
        {
            icon: <MessageSquare size={24} />,
            label: t('core.welcome_hub.action.messages'),
            description: t('core.welcome_hub.action.messages_desc'),
            path: '/inbox',
            gradient: 'from-indigo-500 to-blue-400',
        },
        {
            icon: <Settings size={24} />,
            label: t('core.welcome_hub.action.settings'),
            description: t('core.welcome_hub.action.settings_desc'),
            path: '/settings',
            gradient: 'from-slate-500 to-zinc-400',
        },
    ];

    // Format date
    const formatDate = () => {
        return currentTime.toLocaleDateString(i18n.language === 'kn' ? 'kn-IN' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className={`min-h-screen relative overflow-hidden glass-layout-blur ${isDarkMode ? 'bg-[var(--tenant-layout-bg)]' : 'bg-[var(--tenant-layout-bg)]'}`} style={{ background: 'var(--tenant-layout-bg)' }}>
            {/* Abstract Background Design */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Orbs */}
                <motion.div
                    className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
                    style={{
                        background: isDarkMode
                            ? 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                        x: [0, 20, 0],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
                    style={{
                        background: isDarkMode
                            ? 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
                    }}
                    animate={{
                        scale: [1, 1.15, 1],
                        y: [0, -30, 0],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full opacity-10"
                    style={{
                        background: isDarkMode
                            ? 'radial-gradient(circle, rgba(34,197,94,0.5) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)',
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(${isDarkMode ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#fff' : '#000'} 1px, transparent 1px)`,
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
                {/* Header with Logo */}
                <motion.header
                    className="mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {logoUrl ? (
                                <img src={logoUrl} alt={brandName} className="h-10 w-auto" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Zap className="w-8 h-8 text-blue-500" />
                                    <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {brandName}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Clock className="inline-block w-4 h-4 mr-1" />
                            {formatDate()}
                        </div>
                    </div>
                </motion.header>

                {/* Welcome Section */}
                <motion.section
                    className="mb-16 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <motion.div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                        style={{
                            background: isDarkMode
                                ? 'rgba(59, 130, 246, 0.2)'
                                : 'rgba(59, 130, 246, 0.1)',
                            border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                        }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                            {organization?.name || t('common.label.workspace_placeholder')}
                        </span>
                    </motion.div>

                    <h1 className={`text-5xl md:text-6xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getGreeting()}, <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">{firstName}</span>!
                    </h1>

                    <p className={`text-xl max-w-2xl mx-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {t('core.welcome_hub.label.description')}
                    </p>
                </motion.section>

                {/* Quick Actions Grid */}
                <motion.section
                    className="mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <h2 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('core.welcome_hub.label.quick_actions')}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {quickActions.map((action, index) => (
                            <motion.button
                                key={action.path}
                                onClick={() => navigate(action.path)}
                                className={`group relative p-6 rounded-2xl text-left transition-all duration-300 glass-card
                                    ${isDarkMode
                                        ? 'bg-[var(--tenant-card-bg)] hover:bg-[var(--color-bg-tertiary)] border-[var(--color-border)]'
                                        : 'bg-[var(--tenant-card-bg)] hover:bg-[var(--color-bg-secondary)] border-[var(--color-border)] shadow-sm hover:shadow-lg'
                                    }`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Gradient Icon Background */}
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white mb-4 shadow-lg`}>
                                    {action.icon}
                                </div>

                                <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {action.label}
                                </h3>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {action.description}
                                </p>

                                {/* Arrow on hover */}
                                <ArrowRight className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            </motion.button>
                        ))}
                    </div>
                </motion.section>

                {/* Stats Preview */}
                <motion.section
                    className={`p-6 rounded-2xl glass-card ${isDarkMode ? 'bg-[var(--color-bg-secondary)]/30 border-[var(--color-border)]' : 'bg-[var(--color-bg-primary)]/60 border-[var(--color-border)]'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {t('core.welcome_hub.label.today_overview')}
                            </h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {t('core.welcome_hub.label.activity_glance')}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: t('core.welcome_hub.label.stat_open_tickets'), value: '—', color: 'text-blue-500' },
                            { label: t('core.welcome_hub.label.stat_pending_tasks'), value: '—', color: 'text-purple-500' },
                            { label: t('core.welcome_hub.label.stat_due_today'), value: '—', color: 'text-orange-500' },
                            { label: t('core.welcome_hub.label.stat_completed'), value: '—', color: 'text-green-500' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* Help Section */}
                <motion.footer
                    className="mt-12 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1 }}
                >
                    <button
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDarkMode
                            ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                    >
                        <HelpCircle size={18} />
                        <span>{t('core.welcome_hub.label.need_help')}</span>
                    </button>
                </motion.footer>
            </div>
        </div>
    );
};

export default WelcomeHub;
