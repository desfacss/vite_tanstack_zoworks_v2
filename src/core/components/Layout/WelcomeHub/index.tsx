import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Ticket,
    Calendar,
    Clock,
    ArrowRight,
} from 'lucide-react';
import { useAuthStore, useThemeStore } from '@/core/lib/store';
import { getTenantBrandName, getTenantLogoUrl } from '@/core/theme/ThemeRegistry';
import { useTranslation } from 'react-i18next';
import {
    PageActionBar,
    ActionBarLeft,
    ActionBarRight,
} from '@/core/components/ActionBar';

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    description: string;
    path: string;
    gradient: string;
}

/**
 * WelcomeHub - Landing page for authenticated users
 * Uses consistent page layout pattern with page-header and main-content
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

    // Quick actions with gradients
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
        <>
            {/* Page Header - Left: Brand, Right: Date */}
            <PageActionBar>
                <ActionBarLeft>
                    {logoUrl ? (
                        <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
                    ) : (
                        <span className="text-xl font-bold text-[var(--color-primary)]">
                            {brandName}
                        </span>
                    )}
                </ActionBarLeft>
                <ActionBarRight>
                    <div className={`text-sm flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock className="w-4 h-4" />
                        {formatDate()}
                    </div>
                </ActionBarRight>
            </PageActionBar>


            {/* Main Content - White Card */}
            <div className="main-content">
                <div className="content-body">
                    {/* Welcome Section */}
                    <motion.div
                        className="mb-8"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {getGreeting()}, <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">{firstName}</span>!
                        </h1>
                        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {t('core.welcome_hub.label.description')}
                        </p>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {t('core.welcome_hub.label.quick_actions')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {quickActions.map((action, index) => (
                                <motion.button
                                    key={action.path}
                                    onClick={() => navigate(action.path)}
                                    className={`group relative p-5 rounded-xl text-left transition-all duration-200
                                        ${isDarkMode
                                            ? 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700'
                                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white mb-3`}>
                                        {action.icon}
                                    </div>
                                    <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {action.label}
                                    </h3>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {action.description}
                                    </p>
                                    <ArrowRight className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-200 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default WelcomeHub;
