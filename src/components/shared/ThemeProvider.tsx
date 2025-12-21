import React, { useEffect } from 'react';
import { ConfigProvider, App } from 'antd';
import { useThemeStore } from '../../lib/store';
import { lightTheme, darkTheme } from '../../lib/theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  useEffect(() => {
    // Update documentElement class for global dark mode styling
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <ConfigProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <App className={isDarkMode ? 'dark' : ''}>
        {children}
      </App>
    </ConfigProvider>
  );
};