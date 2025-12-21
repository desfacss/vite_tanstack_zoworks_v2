import React, { useEffect } from 'react';
import { ConfigProvider, App } from 'antd';
import { useThemeStore } from '@/core/lib/store';
import { getAntdTheme } from '@/core/theme/settings';

// TODO: In future, get primaryColor from TenantConfig
const PREDEFINED_TENANT_COLOR = '#1890ff';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  useEffect(() => {
    // Update documentElement class for global dark mode styling
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const currentTheme = getAntdTheme(isDarkMode, PREDEFINED_TENANT_COLOR);

  return (
    <ConfigProvider theme={currentTheme}>
      <App className={isDarkMode ? 'dark' : ''}>
        {children}
      </App>
    </ConfigProvider>
  );
};