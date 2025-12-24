import React from 'react';
import { Drawer } from 'antd';

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

  return (
    <Drawer
      title={title}
      placement="right"
      onClose={onClose}
      open={open}
      width={isMobile ? '100%' : 600}
      styles={{
        header: {
          background: 'var(--color-bg-secondary)',
        },
        body: {
          background: 'var(--color-bg-primary)',
          padding: '24px',
        },
      }}
    >
      {children}
    </Drawer>
  );
};