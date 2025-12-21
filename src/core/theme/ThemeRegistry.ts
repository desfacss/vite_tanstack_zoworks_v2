
import { theme as antTheme } from 'antd';

export interface TenantTheme {
    mode: 'light' | 'dark';
    primaryColor: string;
    brandName: string;
    borderRadius?: number;
}

let currentTheme: TenantTheme | null = null;

export function loadTheme(config: TenantTheme) {
    currentTheme = Object.freeze(config);

    document.title = config.brandName || 'Zoworks';

    const root = document.documentElement;
    root.style.setProperty('--primary-color', config.primaryColor);

    const isDark = config.mode === 'dark';
    root.classList.toggle('dark', isDark);
}

export function getAntdTheme() {
    if (!currentTheme) {
        return {
            algorithm: antTheme.defaultAlgorithm,
            token: { colorPrimary: '#1890ff', borderRadius: 8 },
        };
    }

    return {
        algorithm: currentTheme.mode === 'dark'
            ? antTheme.darkAlgorithm
            : antTheme.defaultAlgorithm,
        token: {
            colorPrimary: currentTheme.primaryColor,
            borderRadius: currentTheme.borderRadius || 8,
        },
    };
}
