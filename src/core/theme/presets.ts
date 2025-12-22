import { TenantThemeConfig } from './ThemeRegistry';

export const THEME_PRESETS: Record<string, Partial<TenantThemeConfig>> = {
    glassmorphism: {
        borderRadius: 16,
        light: {
            primaryColor: '#007AFF', // Apple Blue
            cardBg: 'rgba(255, 255, 255, 0.7)',
            layoutBg: 'rgba(240, 242, 245, 0.5)',
            headerBg: 'rgba(255, 255, 255, 0.8)',
            siderBg: 'rgba(255, 255, 255, 0.8)',
            textColor: '#1d1d1f',
        },
        dark: {
            primaryColor: '#0A84FF', // Apple Dark Blue
            cardBg: 'rgba(28, 28, 30, 0.7)',
            layoutBg: 'rgba(32, 32, 35, 0.8)',
            headerBg: 'rgba(28, 28, 30, 0.8)',
            siderBg: 'rgba(28, 28, 30, 0.8)',
            textColor: '#f5f5f7',
        }
    },
    ultra_glass: {
        borderRadius: 24,
        dark: {
            primaryColor: '#ff00ff',
            cardBg: 'rgba(255, 255, 255, 0.1)',
            layoutBg: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        }
    }
};
