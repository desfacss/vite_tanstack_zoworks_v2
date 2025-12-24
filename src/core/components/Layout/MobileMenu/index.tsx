import React, { useState } from 'react';
import { Drawer, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';
import { BrandLogo } from '@/core/components/shared/BrandAsset';
import { ProfileWelcomeCard } from '../Profile';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  navigationItems: MenuProps['items'];
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  open,
  onClose,
  navigationItems,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // State to track the currently open submenu keys
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // Function to handle open/close of submenus
  const onOpenChange = (keys: string[]) => {
    const latestOpenKey = keys.find(key => openKeys.indexOf(key) === -1);

    if (latestOpenKey) {
      setOpenKeys([latestOpenKey]);
    } else {
      setOpenKeys([]);
    }
  };

  // Transform navigationItems to ensure proper rendering
  const transformedItems: ItemType[] | undefined = navigationItems?.map((item: any) => {
    if (item?.children && item.children.length > 0) {
      return {
        ...item,
        label: item.label,
        key: item.key || '',
        children: item.children.map((child: any) => ({
          ...child,
          label: child.label,
          key: child.key || '',
        })),
      };
    }
    return item;
  }) as ItemType[];

  return (
    <Drawer
      placement="left"
      onClose={onClose}
      open={open}
      styles={{
        body: { padding: 0, backgroundColor: 'var(--tenant-sider-bg)' },
        header: { display: 'none' }
      }}
    >
      {/* Custom Header with Logo and Welcome Card */}
      <div className="border-b border-[var(--color-border)]" style={{ padding: '24px 24px 20px 24px' }}>
        <div className="flex items-center gap-3 mb-6">
          <BrandLogo />
        </div>

        {/* Profile Welcome Card (Level 3) */}
        <ProfileWelcomeCard />
      </div>



      {/* Navigation Menu */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={transformedItems}
        onClick={({ key }) => {
          navigate(key);
          onClose();
        }}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        style={{ backgroundColor: 'var(--tenant-sider-bg)' }}
        className="custom-mobile-menu border-none"
      />
    </Drawer>
  );
};