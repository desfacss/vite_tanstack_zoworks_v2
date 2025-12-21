import React, { useState } from 'react';
import { Drawer, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';

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
  
  // State to track the currently open submenu keys
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // Function to handle open/close of submenus
  const onOpenChange = (keys: string[]) => {
    // Check if the new open key is a new submenu (not the one being closed)
    const latestOpenKey = keys.find(key => openKeys.indexOf(key) === -1);
    
    // If a new key is found and it corresponds to a root item, set it as the only open key
    if (latestOpenKey) {
      setOpenKeys([latestOpenKey]);
    } else {
      // If a submenu is being closed, clear all open keys
      setOpenKeys([]);
    }
  };

  // Transform navigationItems to ensure proper rendering
  const transformedItems = navigationItems?.map(item => {
    if (item?.children && item.children.length > 0) {
      return {
        ...item,
        label: item.label, // Use label as the collapsible title
        key: item.key, // Use the parent key for the collapsible section
        children: item.children.map(child => ({
          ...child,
          label: child.label,
          key: child.key,
        })),
      };
    }
    return item;
  });

  return (
    <Drawer
      title={t('common.menu')}
      placement="left"
      onClose={onClose}
      open={open}
      styles={{ body: { padding: 0, backgroundColor: '#fff' } }}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={transformedItems}
        onClick={({ key }) => {
          navigate(key);
          onClose();
        }}
        className="custom-mobile-menu"
        style={{ backgroundColor: '#fff', color: '#000' }}
        // Add openKeys and onOpenChange to control submenu expansion
        openKeys={openKeys}
        onOpenChange={onOpenChange}
      />
    </Drawer>
  );
};