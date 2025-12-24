import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/lib/store';
import { BrandLogo, BrandIcon } from '@/core/components/shared/BrandAsset';

const { Sider: AntSider } = Layout;

interface SiderProps {
  collapsed: boolean;
  navigationItems?: any[];
}

export const Sider: React.FC<SiderProps> = ({ collapsed, navigationItems: propNavigationItems }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { navigationItems: storeNavigationItems } = useAuthStore();

  const navigationItems = propNavigationItems || storeNavigationItems;

  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const onOpenChange = (keys: string[]) => {
    const latestOpenKey = keys.find(key => openKeys.indexOf(key) === -1);

    if (latestOpenKey) {
      setOpenKeys([latestOpenKey]);
    } else {
      setOpenKeys([]);
    }
  };

  // --- NEW HANDLER FOR NAVIGATION ---
  const handleMenuClick = ({ key, domEvent }: any) => {
    // Check if the key starts with a forward slash (to distinguish routes from submenu keys like 'support')
    if (key.startsWith('/')) {

      // Check for Ctrl (Windows/Linux) or Command (macOS) key press
      if (domEvent.ctrlKey || domEvent.metaKey) {
        // Open in a new tab
        window.open(key, '_blank');
      } else {
        // Default navigation for a single click
        navigate(key);
      }
    }
  };
  // ----------------------------------

  // if (!i18n.isInitialized) {
  //   return null;
  // }
  //   if (!i18n.isInitialized || !navigationItems || navigationItems.length === 0) {
  //   return null; // or a loading skeleton
  // }
  // const { isDarkMode } = useThemeStore();
  // const logoUrl = getTenantLogoUrl(isDarkMode);
  // const brandName = getTenantBrandName();

  return (
    <AntSider
      trigger={null}
      collapsible
      collapsed={collapsed}
      // Add the fixed position and height styles
      style={{
        overflow: 'auto', // Enable internal scrolling
        height: '100vh', // Take up full viewport height
        position: 'fixed', // Pin it to the viewport
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000, // Ensure it's above the header if they ever overlap
      }}
      className="border-r border-[var(--color-border)]"
      width="var(--sidebar-width-expanded, 256px)"
    >
      {/* Sider header - aligned with app header */}
      <div
        className="flex items-center gap-3 overflow-hidden border-b border-[var(--color-border)]"
        style={{
          minHeight: 'var(--header-height, 56px)',
          padding: `0 var(--layout-padding, 24px)`, // Sync with global layout padding
        }}
      >
        {!collapsed ? (
          <BrandLogo
            className="transition-all duration-300"
          />
        ) : (
          <div className="flex justify-center w-full">
            <BrandIcon
              className="transition-all duration-300"
            />
          </div>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={navigationItems as any}
        // --- USE THE NEW HANDLER HERE ---
        onClick={handleMenuClick}
        // --------------------------------
        className="bg-transparent"
        openKeys={collapsed ? [] : openKeys}
        onOpenChange={onOpenChange}
      />
    </AntSider>
  );
};