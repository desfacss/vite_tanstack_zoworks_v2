import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
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

    // Feature list for the right card
    const features = [
        {
            icon: <LayoutDashboard className="text-blue-400" size={24} />,
            title: t('core.welcome_hub.feature.analytics_title'),
            desc: t('core.welcome_hub.feature.analytics_desc'),
        },
        {
            icon: <Ticket className="text-purple-400" size={24} />,
            title: t('core.welcome_hub.feature.support_title'),
            desc: t('core.welcome_hub.feature.support_desc'),
        },
        {
            icon: <Calendar className="text-orange-400" size={24} />,
            title: t('core.welcome_hub.feature.workflow_title'),
            desc: t('core.welcome_hub.feature.workflow_desc'),
        }
    ];

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
                    <div className="max-w-7xl mx-auto py-8 md:py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                            {/* Left Section: Value Proposition */}
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h1 className={`text-5xl md:text-7xl font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {getGreeting()}, <br />
                                        <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary,var(--color-primary))] bg-clip-text text-transparent">
                                            {firstName}
                                        </span>
                                    </h1>
                                    <p className={`text-xl md:text-2xl max-w-lg leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {t('core.welcome_hub.label.description')}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={() => navigate('/dashboard')}
                                        icon={<ArrowRight size={18} />}
                                        iconPosition="end"
                                        className="h-12 px-8 rounded-xl font-semibold"
                                    >
                                        {t('core.welcome_hub.action.get_started')}
                                    </Button>

                                    <Button
                                        type="default"
                                        size="large"
                                        onClick={() => navigate('/support/tickets')}
                                        className="h-12 px-8 rounded-xl font-semibold"
                                    >
                                        {t('core.welcome_hub.action.view_tickets')}
                                    </Button>
                                </div>

                                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {organization?.name} • {brandName} Platform
                                </p>
                            </div>

                            {/* Right Section: Feature Card */}
                            <div className="relative">
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
                                        {features.map((feature, i) => (
                                            <div key={i} className="flex gap-6 group cursor-default">
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
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WelcomeHub;
