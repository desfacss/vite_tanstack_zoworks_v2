import React, { useState } from 'react';
import { Drawer, Menu, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';
import { useAuthStore, useThemeStore } from '@/core/lib/store';
import { getTenantLogoUrl, getTenantBrandName } from '@/core/theme/ThemeRegistry';

const { Text } = Typography;

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
  const { t } = useTranslation();
  const { user, organization } = useAuthStore();
  const { isDarkMode } = useThemeStore();

  // Get branding
  const logoUrl = getTenantLogoUrl(isDarkMode);
  const brandName = getTenantBrandName();

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

  // Get user's display name from store
  const userName = user?.name || t('common.label.user');

  return (
    <Drawer
      placement="left"
      onClose={onClose}
      open={open}
      styles={{
        body: { padding: 0, backgroundColor: 'var(--color-background)' },
        header: { display: 'none' }
      }}
    >
      {/* Custom Header with Logo and Welcome Message */}
      <div className="p-4 border-b border-[var(--color-border)]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName}
              className="h-8 w-auto max-w-full object-contain"
            />
          ) : (
            <h1 className="text-xl font-bold text-[var(--color-primary)] m-0">
              {brandName}
            </h1>
          )}
        </div>

        {/* Welcome Message */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <Text className="block text-xs text-gray-500">{t('common.label.welcome')}</Text>
            <Text strong className="block text-sm">{userName}</Text>
            {organization?.name && (
              <Text className="block text-xs text-gray-400">{organization.name}</Text>
            )}
          </div>
        </div>
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
        className="custom-mobile-menu border-none"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
      />
    </Drawer>
  );
};