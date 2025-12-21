import React, { useState, useMemo, Suspense } from 'react';
import { Layout, Drawer } from 'antd';
// import { TabBar } from 'antd-mobile';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
// import { PanelLeft, Plus } from 'lucide-react';
import { Header } from './Header';
import { Sider } from './Sider';
import { NotificationsDrawer } from './NotificationsDrawer';
import { MobileMenu } from './MobileMenu';
import { Settings } from './Settings';
import { useAuthStore } from '@/core/lib/store';
import { supabase } from '../../lib/supabase';
import type { Notification } from '../../lib/types';
import { useTranslation } from 'react-i18next';
import { useAuthedLayoutConfig } from './AuthedLayoutContext';
import { LoadingFallback } from '../shared/LoadingFallback';
import { useDeviceType } from '@/utils/deviceTypeStore';
import { GlobalLoader } from '../shared/GlobalLoader';
// import ContextDebug from '../shared/ContextDebug';

const { Content } = Layout;

// Define the Sider widths
const SIDER_WIDTH = 256;
const COLLAPSED_SIDER_WIDTH = 80; // Ant Design's default collapsed width

export const AuthedLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  // const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();
  // const navigate = useNavigate();
  const { t } = useTranslation();
  const { organization, user, navigationItems } = useAuthStore();
  const { config, showSettings, setShowSettings } = useAuthedLayoutConfig();

  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile';

  // Memoize bottomNavItems to prevent recalculation
  // const bottomNavItems = useMemo(() => {
  //   return navigationItems
  //     .reduce((acc: any[], item) => {
  //       if (item.children) {
  //         return [...acc, ...item.children];
  //       }
  //       return [...acc, item];
  //     }, [])
  //     .slice(0, 4);
  // }, [navigationItems]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', organization?.id],
    queryFn: async () => {
      if (!organization?.id || !user?.id) return [];

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organization?.id)
        .eq('is_active', true)
        .contains('users', [user?.id])
        .order('created_at', { ascending: false })
        .limit(10);

      return data as Notification[];
    },
    enabled: !!organization?.id && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => {
      const expiryDate = n.expiry ? new Date(n.expiry) : null;
      const startDate = n.start ? new Date(n.start) : null;
      const now = new Date();
      return (!expiryDate || expiryDate > now) && (!startDate || startDate <= now);
    }).length;
  }, [notifications]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/admin')) {
      const section = path.split('/')[2];
      return section.charAt(0).toUpperCase() + section.slice(1);
    }
    if (path.startsWith('/core')) {
      const section = path.split('/')[2];
      return section.charAt(0).toUpperCase() + section.slice(1);
    }
    return '';
  };

  // Calculate the dynamic left margin for the main content
  const contentMarginLeft = useMemo(() => {
    if (isMobile) {
      return 0;
    }
    return collapsed ? COLLAPSED_SIDER_WIDTH : SIDER_WIDTH;
  }, [collapsed, isMobile]);

  // Calculate the dynamic left margin for the header
  const headerMarginLeft = useMemo(() => {
    return isMobile ? 0 : contentMarginLeft;
  }, [contentMarginLeft, isMobile]);

  return (
    <Layout className="min-h-screen bg-[var(--color-background)]">
      <GlobalLoader />
      {/* <ContextDebug /> */}
      {!isMobile && (
        <Sider
          collapsed={collapsed}
          navigationItems={navigationItems}
        />
      )}

      <Layout className="bg-transparent">
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: headerMarginLeft,
            right: 0,
            zIndex: 11,
            transition: 'left 0.2s',
          }}
        >
          <Header
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            isMobile={isMobile}
            unreadCount={unreadCount}
            setShowNotifications={setShowNotifications}
            setShowMobileMenu={setShowMobileMenu}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            pageTitle={getPageTitle()}
          />
        </div>

        {/* Add a top padding/margin to the content to prevent it from going under the fixed header */}
        <Content className="m-0 p-0 bg-[var(--color-background)] rounded-lg shadow-sm" style={{ marginTop: 64, marginLeft: contentMarginLeft, transition: 'margin-left 0.2s' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Suspense fallback={<LoadingFallback />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </Content>

        {isMobile && (
          <>
            {/*             <TabBar
              activeKey={location.pathname}
              onChange={key => navigate(key)}
              className="border-t border-[var(--color-border)]"
            >
              {bottomNavItems.map((item: any) => (
                <TabBar.Item
                  key={item.key}
                  icon={item.icon}
                  title={item.label}
                />
              ))}
            </TabBar>

            <FloatButton
              icon={<Plus />}
              type="primary"
              style={{ right: 24, bottom: 80 }}
            /> */}

            <MobileMenu
              open={showMobileMenu}
              onClose={() => setShowMobileMenu(false)}
              navigationItems={navigationItems as any}
            />

            {config.searchFilters && (
              <Drawer
                title={t('common.search')}
                placement="right"
                open={showSearch}
                onClose={() => setShowSearch(false)}
                className="bg-[var(--color-background)]"
              >
                {config.searchFilters}
              </Drawer>
            )}
          </>
        )}
      </Layout>

      <NotificationsDrawer
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
      />

      <Settings
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </Layout>
  );
};

export default React.memo(AuthedLayout);