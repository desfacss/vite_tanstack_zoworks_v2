import React from 'react';
import { Button } from 'antd';
import { Sun, Moon } from 'lucide-react';
import { useAuthStore, useThemeStore } from '../../lib/store';
import env_def from '../../utils/constants';

export const ThemeToggle = () => {
  const { organization } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  // if(env_def?.THEME!=="true") return null; // Return null if THEME is disabled
  if(organization?.app_settings?.customization?.theme!=="true") return null; // Return null if THEME is disabled

  return (
    <Button
      type="text"
      icon={isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      onClick={toggleTheme}
    />
  );
};