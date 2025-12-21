import { Button } from 'antd';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/core/lib/store';

export const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();

  return (
    <Button
      type="text"
      icon={isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      onClick={toggleTheme}
    />
  );
};
export default ThemeToggle;
