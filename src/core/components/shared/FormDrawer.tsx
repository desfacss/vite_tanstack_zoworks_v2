import React from 'react';
import { Drawer } from 'antd';
import { useThemeStore } from '../../lib/store';

interface FormDrawerProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const FormDrawer: React.FC<FormDrawerProps> = ({
  title,
  open,
  onClose,
  children,
}) => {
  const isMobile = window.innerWidth <= 768;
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  return (
    <Drawer
      title={title}
      placement="right"
      onClose={onClose}
      open={open}
      width={isMobile ? '100%' : 600}
      styles={{
        header: {
          background: isDarkMode ? 'var(--copper-800)' : 'var(--blue-50)',
        },
        body: {
          background: isDarkMode ? 'var(--copper-900)' : 'var(--blue-100)',
          padding: '24px',
        },
      }}
    >
      {children}
    </Drawer>
  );
};