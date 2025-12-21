import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../lib/store';

const { Sider: AntSider } = Layout;

interface SiderProps {
  collapsed: boolean;
}

export const Sider: React.FC<SiderProps> = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { organization, navigationItems } = useAuthStore();
  
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
  const handleMenuClick = ({ key, domEvent }: { key: string, domEvent: React.MouseEvent<HTMLElement> }) => {
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
        zIndex: 10, // Ensure it's above other content if needed
      }}
      className="border-r border-[var(--color-border)]"
      width={256}
    >
      <div className="p-4 pl-7">
        <h1 className="text-xl font-bold truncate text-white">
          {organization?.name || 'Enterprise App'}
        </h1>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={navigationItems}
        // --- USE THE NEW HANDLER HERE ---
        onClick={handleMenuClick} 
        // --------------------------------
        className="bg-transparent"
        openKeys={openKeys}
        onOpenChange={onOpenChange}
      />
    </AntSider>
  );
};