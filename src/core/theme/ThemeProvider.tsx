/**
 * Theme Provider - Connects Tenant Config + User Preference
 * 
 * Uses:
 * - TenantThemeConfig (loaded at bootstrap) for colors, branding
 * - useThemeStore (user preference) for light/dark mode
 */

import React, { useEffect } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { getAntdTheme, applyThemeMode, isUserDarkModeAllowed, getTenantDefaultMode, subscribeToTheme } from './ThemeRegistry';
import { useThemeStore } from '@/core/lib/store';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isDarkMode, toggleTheme } = useThemeStore();
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    // Get theme config combining tenant colors + user mode
    const antdTheme = getAntdTheme(isDarkMode);

    // Apply mode-specific styles to document
    useEffect(() => {
        applyThemeMode(isDarkMode);
    }, [isDarkMode]);

    // Subscribe to theme config changes (branding, primary color, etc.)
    useEffect(() => {
        return subscribeToTheme(() => forceUpdate());
    }, []);

    // Initialize user preference from tenant default on first load
    useEffect(() => {
        // Only run once on mount
        const stored = localStorage.getItem('theme-store');
        if (!stored) {
            // No user preference yet, use tenant default
            const tenantDefault = getTenantDefaultMode();
            if (tenantDefault === 'dark' && !isDarkMode) {
                toggleTheme();
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <ConfigProvider theme={antdTheme}>
            <AntApp>
                {children}
            </AntApp>
        </ConfigProvider>
    );
};

/**
 * Hook to get theme toggle functionality
 * Returns null toggle function if tenant disabled user dark mode
 */
export function useThemeToggle() {
    const { isDarkMode, toggleTheme } = useThemeStore();
    const allowToggle = isUserDarkModeAllowed();

    return {
        isDarkMode,
        toggleTheme: allowToggle ? toggleTheme : null,
        canToggle: allowToggle,
    };
}
