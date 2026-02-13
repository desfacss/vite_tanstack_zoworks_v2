import { useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'wacrm-theme';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Centralized theme management hook
 * - Persists theme preference to localStorage
 * - Detects and responds to system preference changes
 * - Applies .dark class to document for Tailwind CSS
 * 
 * @returns Theme state and controls
 * 
 * @example
 * const { isDarkMode, themeMode, setTheme, toggleTheme } = useTheme();
 */
export const useTheme = () => {
    // Initialize theme mode from localStorage or default to 'system'
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return (stored as ThemeMode) || 'system';
    });

    // Determine if dark mode should be active
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (themeMode === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return themeMode === 'dark';
    });

    // Listen to system preference changes when theme is set to 'system'
    useEffect(() => {
        if (themeMode !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            setIsDarkMode(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [themeMode]);

    // Apply/remove .dark class to document root for Tailwind CSS
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    /**
     * Set theme mode and persist to localStorage
     */
    const setTheme = (mode: ThemeMode) => {
        setThemeMode(mode);
        localStorage.setItem(THEME_STORAGE_KEY, mode);

        if (mode === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDarkMode(systemPrefersDark);
        } else {
            setIsDarkMode(mode === 'dark');
        }
    };

    /**
     * Toggle between light and dark mode (ignores system preference)
     */
    const toggleTheme = () => {
        const newMode = isDarkMode ? 'light' : 'dark';
        setTheme(newMode);
    };

    return {
        /** Current theme mode: 'light' | 'dark' | 'system' */
        themeMode,

        /** Whether dark mode is currently active */
        isDarkMode,

        /** Set theme mode explicitly */
        setTheme,

        /** Toggle between light and dark */
        toggleTheme,
    };
};
