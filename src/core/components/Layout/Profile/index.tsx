import React from 'react';
import { Avatar, Typography } from 'antd';
import { useAuthStore } from '@/core/lib/store';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

/**
 * Level 1: ProfileAvatar
 * Base component with primary/secondary tenant colors
 */
export const ProfileAvatar: React.FC<{ size?: number; className?: string }> = ({
    size = 32,
    className = ""
}) => {
    const { user } = useAuthStore();
    const initials = user?.name ? user.name.charAt(0).toUpperCase() : '?';

    return (
        <Avatar
            size={size}
            className={`flex-shrink-0 border-none transition-all duration-300 hover:scale-105 ${className}`}
            style={{
                background: 'linear-gradient(135deg, var(--tenant-primary) 0%, var(--tenant-secondary) 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size > 40 ? '1.1rem' : '0.85rem',
                fontWeight: 700,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                border: '2px solid var(--tenant-card-bg)', // Glass effect ring
            }}
        >
            {initials}
        </Avatar>
    );
};


/**
 * Level 2: ProfileIdentity
 * Groups Avatar and User Name
 */
export const ProfileIdentity: React.FC<{
    showName?: boolean;
    showAvatar?: boolean;
    size?: number;
    className?: string;
}> = ({
    showName = true,
    showAvatar = true,
    size = 32,
    className = ""
}) => {
        const { user } = useAuthStore();
        const { t } = useTranslation();

        return (
            <div className={`flex items-center gap-3 ${className}`}>
                {showAvatar && <ProfileAvatar size={size} />}
                {showName && (
                    <div className="flex flex-col min-w-0">
                        <Text strong className="text-sm leading-tight truncate">
                            {user?.name || t('common.label.user')}
                        </Text>
                    </div>
                )}
            </div>
        );
    };

/**
 * Level 3: ProfileWelcomeCard
 * Full nested component with Welcome label and Location
 * Designed for Mobile Sider / Desktop Profile Sections
 */
export const ProfileWelcomeCard: React.FC<{ className?: string }> = ({ className = "" }) => {
    const { location } = useAuthStore();
    const { t } = useTranslation();

    return (
        <div className={`flex items-center gap-4 ${className}`}>
            <ProfileAvatar size={48} />
            <div className="flex flex-col min-w-0">
                <Text className="text-[10px] uppercase tracking-widest opacity-60 font-bold leading-none mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('common.label.welcome')}
                </Text>
                <ProfileIdentity showName={true} showAvatar={false} className="!gap-0" />
                {location?.name && (
                    <Text className="text-[11px] opacity-80 mt-1 leading-none font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {location.name}
                    </Text>
                )}
            </div>
        </div>
    );
};


