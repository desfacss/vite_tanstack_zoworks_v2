import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Drawer, FloatButton } from 'antd';
import { TabBar } from 'antd-mobile';
import { motion } from 'framer-motion';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Users,
  Building2,
  Menu as MenuIcon,
  LogOut,
  CreditCard,
  Users2,
  Search,
  Plus,
  Filter
} from 'lucide-react';
import { useAuthStore } from '@/core/lib/store';
import { supabase, getCurrentOrganization, getCurrentUser} from '../../lib/supabase';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelect } from './LanguageSelect';
import { useThemeStore } from '@/core/lib/store';
import { SearchDateFilter } from '../shared/SearchDateFilter';

const { Header, Sider, Content } = Layout;
const workspace = import.meta.env.VITE_WORKSPACE || 'mep';

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { organization, user, setOrganization, setUser } = useAuthStore();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const isMobile = window.innerWidth <= 768;

  console.log("aa", user, organization);

  useEffect(() => {
    async function initializeData() {
      if (workspace === 'dev') {
        // New logic for dev workspace
        const userData = await getCurrentUser();
        if (!userData) {
          navigate('/login');
          return;
        }

        const orgData = await getCurrentOrganization(userData);
        if (!orgData) {
          navigate('/login');
          return;
        }

        // const modules = await getModules();

        setOrganization(orgData);
        setUser(userData);

        // const availableModules = modules?.filter(module => 
        //   orgData.module_features.includes(module.prefix)
        // ) || [];
        
        const items = [
          { key: '/dashboard', icon: <Home size={20} />, label: t('common.dashboard') }
        ];

        const moduleMap = new Set();

        // availableModules.forEach(module => {
        //   if (module.sub_modules?.users && !moduleMap.has('users')) {
        //     moduleMap.add('users');
        //     items.push({ key: '/admin/users', icon: <Users size={20} />, label: t('common.users') });
        //   }
        //   if (module.sub_modules?.organizations && !moduleMap.has('organizations')) {
        //     moduleMap.add('organizations');
        //     items.push({ key: '/admin/organizations', icon: <Building2 size={20} />, label: t('common.organizations') });
        //   }
        //   if (module.sub_modules?.subscriptions && !moduleMap.has('subscriptions')) {
        //     moduleMap.add('subscriptions');
        //     items.push({ key: '/admin/subscriptions', icon: <CreditCard size={20} />, label: t('common.subscriptions') });
        //   }
        //   if (module.sub_modules?.teams && !moduleMap.has('teams')) {
        //     moduleMap.add('teams');
        //     items.push({ key: '/admin/teams', icon: <Users2 size={20} />, label: t('common.teams') });
        //   }
        // });

        setMenuItems(items);
      } else {
        // Original logic for non-dev workspaces
        const [org, user, modules] = await Promise.all([
          getCurrentOrganization(),
          getCurrentUser(),
          // getModules()
        ]);

        if (org && user) {
          setOrganization(org);
          setUser(user);

          // const availableModules = modules?.filter(module => 
          //   org.module_features.includes(module.prefix)
          // ) || [];

          const items = [
            { key: '/dashboard', icon: <Home size={20} />, label: t('common.dashboard') }
          ];

          const moduleMap = new Set();

          // availableModules.forEach(module => {
          //   if (module.sub_modules?.users && !moduleMap.has('users')) {
          //     moduleMap.add('users');
          //     items.push({ key: '/admin/users', icon: <Users size={20} />, label: t('common.users') });
          //   }
          //   if (module.sub_modules?.organizations && !moduleMap.has('organizations')) {
          //     moduleMap.add('organizations');
          //     items.push({ key: '/admin/organizations', icon: <Building2 size={20} />, label: t('common.organizations') });
          //   }
          //   if (module.sub_modules?.subscriptions && !moduleMap.has('subscriptions')) {
          //     moduleMap.add('subscriptions');
          //     items.push({ key: '/admin/subscriptions', icon: <CreditCard size={20} />, label: t('common.subscriptions') });
          //   }
          //   if (module.sub_modules?.teams && !moduleMap.has('teams')) {
          //     moduleMap.add('teams');
          //     items.push({ key: '/admin/teams', icon: <Users2 size={20} />, label: t('common.teams') });
          //   }
          // });

          setMenuItems(items);
        }
      }
    }

    initializeData();
  }, [setOrganization, setUser, t, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOrganization(null);
    setUser(null);
    navigate('/login');
  };

  const headerBgColor = isDarkMode ? 'bg-copper-900' : 'bg-blue-50';
  const contentBgColor = isDarkMode ? 'bg-copper-800' : 'bg-blue-100';

  if (!organization) return null;

  return (
    <Layout className="min-h-screen">
      {!isMobile && (
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={collapsed}
          className={isDarkMode ? 'bg-copper-800' : 'bg-blue-50'}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-4 text-center">
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-copper-200' : 'text-blue-900'}`}>
                {organization.app_settings.name}
              </h1>
            </div>
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              className={isDarkMode ? 'bg-copper-800' : 'bg-blue-50'}
            />
          </motion.div>
        </Sider>
      )}
      
      <Layout>
        <Header className={`p-0 ${headerBgColor} transition-colors duration-300`}>
          <div className="flex justify-between items-center px-4 h-full">
            <div className="flex items-center">
              {!isMobile && (
                <Button
                  type="text"
                  icon={<MenuIcon size={20} />}
                  onClick={() => setCollapsed(!collapsed)}
                  className="mr-4"
                />
              )}
              {isMobile && (
                <>
                  <Button
                    type="text"
                    icon={<Search size={20} />}
                    onClick={() => setShowSearch(true)}
                  />
                  <Button
                    type="text"
                    icon={<Filter size={20} />}
                    onClick={() => setShowActions(true)}
                    className="ml-2"
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelect />
              <ThemeToggle />
              <Button
                type="text"
                icon={<LogOut size={20} />}
                onClick={handleSignOut}
              />
            </div>
          </div>
        </Header>
        
        <Content className={`m-4 p-6 ${contentBgColor} rounded-lg transition-colors duration-300`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Outlet />
          </motion.div>
        </Content>
      </Layout>

      {isMobile && (
        <>
          <TabBar
            activeKey={location.pathname}
            onChange={(key) => navigate(key)}
            className={isDarkMode ? 'bg-copper-900' : 'bg-blue-50'}
          >
            {menuItems.map((item) => (
              <TabBar.Item
                key={item.key}
                icon={item.icon}
                title={item.label}
              />
            ))}
          </TabBar>

          <FloatButton.Group
            trigger="click"
            type="primary"
            style={{ right: 24, bottom: 80 }}
            icon={<Plus />}
          >
            <FloatButton icon={<Users />} tooltip="Add User" />
            <FloatButton icon={<Building2 />} tooltip="Add Organization" />
            <FloatButton icon={<CreditCard />} tooltip="Add Subscription" />
            <FloatButton icon={<Users2 />} tooltip="Add Team" />
          </FloatButton.Group>

          <Drawer
            title="Search"
            placement="right"
            open={showSearch}
            onClose={() => setShowSearch(false)}
          >
            <SearchDateFilter
              onSearch={(value) => console.log('Search:', value)}
              onDateChange={(dates) => console.log('Dates:', dates)}
            />
          </Drawer>

          <Drawer
            title="Actions"
            placement="right"
            open={showActions}
            onClose={() => setShowActions(false)}
          >
            <div className="space-y-4">
              <Button type="primary" icon={<Users />} block>Add User</Button>
              <Button type="primary" icon={<Building2 />} block>Add Organization</Button>
              <Button type="primary" icon={<CreditCard />} block>Add Subscription</Button>
              <Button type="primary" icon={<Users2 />} block>Add Team</Button>
            </div>
          </Drawer>
        </>
      )}
    </Layout>
  );
};

export default DashboardLayout;