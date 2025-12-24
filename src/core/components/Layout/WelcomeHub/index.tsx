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
import { BrandLogo } from '@/core/components/shared/BrandAsset';
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
                    <BrandLogo />
                </ActionBarLeft>
                <ActionBarRight>
                    <div className={`text-sm flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock className="w-4 h-4" />
                        {formatDate()}
                    </div>
                </ActionBarRight>
            </PageActionBar>


            {/* Main Content Area - Canvas layout (no border) */}
            <div className="layout-canvas entry-animate">
                <div className="content-body">
                    <div className="max-w-7xl mx-auto py-8 md:py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center entry-animate-container">

                            {/* Left Section: Value Proposition */}
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h1 className="text-h1 md:text-[5rem] !leading-[1.1]">
                                        {getGreeting()}, <br />
                                        <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary,var(--color-primary))] bg-clip-text text-transparent">
                                            {firstName}
                                        </span>
                                    </h1>
                                    <p className="text-subtitle !text-xl md:!text-2xl max-w-lg">
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
                                        className="px-8 font-semibold"
                                    >
                                        {t('core.welcome_hub.action.get_started')}
                                    </Button>

                                    <Button
                                        type="default"
                                        size="large"
                                        onClick={() => navigate('/support/tickets')}
                                        className="px-8 font-semibold"
                                    >
                                        {t('core.welcome_hub.action.view_tickets')}
                                    </Button>
                                </div>

                                <p className="text-subtitle !text-sm">
                                    {organization?.name} • {brandName} Platform
                                </p>
                            </div>

                            {/* Right Section: Feature Card */}
                            <div className="relative">
                                {/* Background ambient glow */}
                                <div className="absolute -inset-10 bg-[var(--color-primary)]/10 rounded-full blur-[100px] pointer-events-none" />

                                <div className={`relative p-8 md:p-12 rounded-[var(--tenant-border-radius,12px)] border backdrop-blur-2xl transition-all duration-500
                                    ${isDarkMode
                                        ? 'bg-slate-950/40 border-slate-800/50 shadow-2xl'
                                        : 'bg-white/80 border-slate-200/50 shadow-xl'}
                                `} style={{ boxShadow: isDarkMode ? '0 25px 50px -12px rgba(var(--color-primary-rgb), 0.15)' : undefined }}>
                                    <h2 className="text-h2 mb-10">
                                        {t('core.welcome_hub.label.whats_included')}
                                    </h2>

                                    <div className="space-y-10 entry-animate-container">
                                        {features.map((feature, i) => (
                                            <div key={i} className="flex gap-6 group cursor-default">
                                                <div className={`flex-shrink-0 w-14 h-14 rounded-[var(--tenant-border-radius-interactive,8px)] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm
                                                    ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-50 border border-slate-100'}
                                                `}>
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
