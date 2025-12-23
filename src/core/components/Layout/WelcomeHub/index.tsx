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


            {/* Main Content Area */}
            <div className="main-content">
                <div className="content-body">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: {
                                    staggerChildren: 0.15,
                                    delayChildren: 0.1
                                }
                            }
                        }}
                        className="max-w-7xl mx-auto py-8 md:py-12"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                            {/* Left Section: Value Proposition */}
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0, x: -30 },
                                    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
                                }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <h1 className={`text-5xl md:text-7xl font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {getGreeting()}, <br />
                                        <span className="bg-gradient-to-r from-[var(--color-primary)] to-purple-500 bg-clip-text text-transparent">
                                            {firstName}
                                        </span>
                                    </h1>
                                    <p className={`text-xl md:text-2xl max-w-lg leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {t('core.welcome_hub.label.description')}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(var(--color-primary-rgb), 0.4)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/dashboard')}
                                        className="px-8 py-4 bg-[var(--color-primary)] text-white rounded-2xl font-semibold shadow-xl shadow-[var(--color-primary)]/20 flex items-center gap-2 transition-all hover:brightness-110"
                                    >
                                        {t('core.welcome_hub.action.get_started')}
                                        <ArrowRight size={22} />
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/support/tickets')}
                                        className={`px-8 py-4 rounded-2xl font-semibold border transition-all backdrop-blur-sm
                                            ${isDarkMode
                                                ? 'bg-gray-800/40 border-gray-700 text-gray-300 hover:bg-gray-700'
                                                : 'bg-white/40 border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {t('core.welcome_hub.action.view_tickets')}
                                    </motion.button>
                                </div>

                                <motion.p
                                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                                    className={`text-sm font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                                >
                                    {organization?.name} • {brandName} Platform
                                </motion.p>
                            </motion.div>

                            {/* Right Section: Glassmorphism Feature Card */}
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0, scale: 0.9, y: 30 },
                                    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, ease: "circOut" } }
                                }}
                                className="relative"
                            >
                                {/* Background ambient glow */}
                                <div className="absolute -inset-10 bg-[var(--color-primary)]/10 rounded-full blur-[100px] pointer-events-none" />

                                <div className={`relative p-8 md:p-12 rounded-[2.5rem] border backdrop-blur-2xl transition-all duration-500
                                    ${isDarkMode
                                        ? 'bg-gray-900/60 border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]'
                                        : 'bg-white/70 border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]'
                                    }`}
                                >
                                    <h2 className={`text-3xl font-bold mb-10 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {t('core.welcome_hub.label.whats_included')}
                                    </h2>

                                    <div className="space-y-10">
                                        {[
                                            {
                                                icon: <LayoutDashboard className="text-blue-400" size={24} />,
                                                title: t('core.welcome_hub.feature.analytics_title'),
                                                desc: t('core.welcome_hub.feature.analytics_desc'),
                                                bgColor: 'bg-blue-500/10'
                                            },
                                            {
                                                icon: <Ticket className="text-purple-400" size={24} />,
                                                title: t('core.welcome_hub.feature.support_title'),
                                                desc: t('core.welcome_hub.feature.support_desc'),
                                                bgColor: 'bg-purple-500/10'
                                            },
                                            {
                                                icon: <Calendar className="text-orange-400" size={24} />,
                                                title: t('core.welcome_hub.feature.workflow_title'),
                                                desc: t('core.welcome_hub.feature.workflow_desc'),
                                                bgColor: 'bg-orange-500/10'
                                            }
                                        ].map((feature, i) => (
                                            <motion.div
                                                key={i}
                                                variants={{
                                                    hidden: { opacity: 0, x: 20 },
                                                    visible: { opacity: 1, x: 0 }
                                                }}
                                                className="flex gap-6 group cursor-default"
                                            >
                                                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm
                                                    ${isDarkMode ? 'bg-white/5 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}
                                                >
                                                    {feature.icon}
                                                </div>
                                                <div className="space-y-1.5 py-1">
                                                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {feature.title}
                                                    </h3>
                                                    <p className={`text-base leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {feature.desc}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default WelcomeHub;
