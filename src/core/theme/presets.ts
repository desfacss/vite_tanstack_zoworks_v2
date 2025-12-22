import { TenantThemeConfig } from './ThemeRegistry';

export const THEME_PRESETS: Record<string, Partial<TenantThemeConfig>> = {
    glassmorphism: {
        borderRadius: 16,
        light: {
            primaryColor: '#007AFF', // Apple Blue
            secondaryColor: '#5856D6', // Apple Purple
            cardBg: 'rgba(255, 255, 255, 0.7)',
            layoutBg: '#f5f5f7',
            headerBg: 'rgba(255, 255, 255, 0.8)',
            siderBg: 'rgba(255, 255, 255, 0.8)',
            textColor: '#1d1d1f',
        },
        dark: {
            primaryColor: '#0A84FF', // Apple Dark Blue
            secondaryColor: '#5E5CE6', // Apple Dark Purple
            cardBg: 'rgba(28, 28, 30, 0.7)',
            layoutBg: '#000000',
            headerBg: 'rgba(28, 28, 30, 0.8)',
            siderBg: 'rgba(28, 28, 30, 0.8)',
            textColor: '#f5f5f7',
        }
    },

    // Gradient Card Layout - modern gradient header with white card content
    gradient_card: {
        borderRadius: 16,
        heroHeader: true,
        light: {
            primaryColor: '#4F46E5', // Indigo
            secondaryColor: '#10B981', // Emerald - gorgeous teal/green mix
            cardBg: '#ffffff',
            layoutBg: '#f8fafc',
            headerBg: '#4F46E5',
            siderBg: '#ffffff',
            textColor: '#0f172a',
        },
        dark: {
            primaryColor: '#6366F1',
            secondaryColor: '#34D399',
            cardBg: '#1e293b',
            layoutBg: '#0f172a',
            headerBg: '#312e81',
            siderBg: '#0f172a',
            textColor: '#f8fafc',
        }
    },

    // Branded Header (VKBS/Red variant)
    branded_header: {
        borderRadius: 16,
        heroHeader: true,
        light: {
            primaryColor: '#EF4444', // Red 500
            secondaryColor: '#F59E0B', // Amber 500
            cardBg: '#ffffff',
            layoutBg: '#fdf2f2',
            headerBg: '#EF4444',
            siderBg: '#ffffff',
            textColor: '#1a1a1a',
        },
        dark: {
            primaryColor: '#F87171',
            secondaryColor: '#FBBF24',
            cardBg: '#1e1e1e',
            layoutBg: '#111827',
            headerBg: '#991B1B',
            siderBg: '#1e1e1e',
            textColor: '#ffffff',
        }
    },

    // Corporate/Enterprise theme
    corporate: {
        borderRadius: 4,
        light: {
            primaryColor: '#1e40af', // Blue 800
            secondaryColor: '#1e3a8a',
            cardBg: '#ffffff',
            layoutBg: '#f1f5f9',
            headerBg: '#1e40af',
            siderBg: '#0f172a',
            textColor: '#1e293b',
        },
        dark: {
            primaryColor: '#3b82f6',
            secondaryColor: '#2563eb',
            cardBg: '#1e293b',
            layoutBg: '#0f172a',
            headerBg: '#1e3a8a',
            siderBg: '#020617',
            textColor: '#f8fafc',
        }
    },

    ultra_glass: {
        borderRadius: 24,
        heroHeader: true,
        dark: {
            primaryColor: '#8B5CF6', // Violet
            secondaryColor: '#EC4899', // Pink
            cardBg: 'rgba(255, 255, 255, 0.05)',
            layoutBg: 'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #581c87 100%)',
            textColor: '#f8fafc',
        }
    }
};
