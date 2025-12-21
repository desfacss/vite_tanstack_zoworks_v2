import React from 'react';
import { Button } from 'antd';
import { Sun, Moon } from 'lucide-react';
import { useAuthStore, useThemeStore } from '@/core/lib/store';

export const ThemeToggle = () => {
  const { organization } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  // if(env_def?.THEME!=="true") return null; // Return null if THEME is disabled
  if (organization?.app_settings?.customization?.theme !== "true") return null; // Return null if THEME is disabled

  return (
    <Button
      type="text"
      icon={theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      onClick={toggleTheme}
    />
  );
};
export default ThemeToggle;
