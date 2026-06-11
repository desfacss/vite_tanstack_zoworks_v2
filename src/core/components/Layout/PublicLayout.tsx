// import React from 'react';
// import { Layout, Menu, Space } from 'antd';
// import { motion } from 'framer-motion';
// import { Outlet, Link } from 'react-router-dom';
// import { LanguageSelect } from './LanguageSelect';
// import { InstallPWA } from '../shared/InstallPWA';
// import { ThemeToggle } from './ThemeToggle';

// const { Header, Content } = Layout;

// const PublicLayout = () => {
//   return (
//     <Layout className="min-h-screen bg-[var(--color-background)]">
//       <Header className="flex justify-between items-center px-4 bg-[var(--color-background)] border-b border-[var(--color-border)]">
//         {/* Logo */}
//         <div className="text-2xl font-bold text-[var(--color-text)]">
//           <Link to="/" className="hover:text-[var(--color-primary)]">VKBS</Link>
//         </div>

//         <div className="flex items-center gap-4">
//           {/* Navigation Links */}
//           <Menu
//             mode="horizontal"
//             defaultSelectedKeys={['home']}
//             className="bg-transparent border-0"
//             items={[
//               // {
//               //   key: 'home',
//               //   label: <Link to="/">Home</Link>,
//               // },
//               // {
//               //   key: 'pricing',
//               //   label: <Link to="/pricing">Pricing</Link>,
//               // },
//               // {
//               //   key: 'subscription',
//               //   label: <Link to="/subscription">Subscription</Link>,
//               // },
//               {
//                 key: 'about',
//                 label: <Link to="/about">About</Link>,
//               },
//             ]}
//           />

//           {/* Theme and Language Controls */}
//           <Space>
//             <LanguageSelect />
//             <ThemeToggle />
//           </Space>
//         </div>
//       </Header>

//       <Content className="flex-1 bg-[var(--color-background-secondary)]">
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ duration: 0.5 }}
//         >
//           <Outlet />
//         </motion.div>
//       </Content>

//       <InstallPWA />
//     </Layout>
//   );
// };

// export default PublicLayout;





import { Layout, Menu, Space } from 'antd';
import { motion } from 'framer-motion';
// 🔥 Added useLocation to determine the active menu item
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LanguageSelect } from './LanguageSelect';
import { InstallPWA } from '../shared/InstallPWA';
import { ThemeToggle } from './ThemeToggle';
import { useTranslation } from 'react-i18next';

const { Header, Content } = Layout;

// Helper function to map path to menu key
const pathToKey = (path: string): string => {
  if (path === '/') return 'home';
  if (path.startsWith('/appointments')) return 'appointments';
  if (path.startsWith('/subscriptions')) return 'subscriptions';
  if (path.startsWith('/shop')) return 'shop';
  if (path.startsWith('/login')) return 'login';
  if (path.startsWith('/signup') || path.startsWith('/sign_up') || path.startsWith('/web_register')) return 'signup';
  return '';
};

const PublicLayout = () => {
  const { t } = useTranslation();
  // 🔥 Get the current location
  const location = useLocation();
  // 🔥 Determine the active menu key based on the current path
  const currentKey = pathToKey(location.pathname);

  return (
    // Use Ant Design's Layout component for overall structure
    <Layout className="min-h-screen bg-[var(--color-background)]">
      {/* Header section */}
      <Header className="flex justify-between items-center bg-[var(--color-background)] border-b border-[var(--color-border)] sticky top-0 z-10 w-full header-responsive-padding" style={{ padding: 0 }}> {/* Added sticky header and responsive padding */}
        {/* Logo */}
        <div className="text-2xl font-bold text-[var(--color-text)]">
          <Link to="/" className="hover:text-[var(--color-primary)]">zoworks.ai</Link>
        </div>

        {/* Right side of header: Navigation and controls */}
        <div className="flex items-center gap-4">
          {/* Navigation Links using Ant Design Menu */}
          <Menu
            mode="horizontal"
            // 🔥 Dynamically set selectedKeys based on current route
            selectedKeys={[currentKey]}
            className="bg-transparent border-0 text-[var(--color-text)]" // Ensure menu text color respects theme
            items={[
              {
                key: 'home',
                label: <Link to="/">{t('core.navigation.home', 'Home')}</Link>,
              },
              {
                key: 'appointments',
                label: <Link to="/appointments">{t('core.navigation.appointments', 'Appointments')}</Link>,
              },
              {
                key: 'subscriptions',
                label: <Link to="/subscriptions">{t('core.navigation.subscriptions', 'Subscriptions')}</Link>,
              },
              {
                key: 'shop',
                label: <Link to="/shop">{t('core.navigation.shop', 'Shop')}</Link>,
              },
              {
                key: 'login',
                label: <Link to="/login">{t('core.auth.action.sign_in', 'Sign In')}</Link>,
              },
              {
                key: 'signup',
                label: <Link to="/signup">{t('core.auth.action.sign_up', 'Sign Up')}</Link>,
              },
            ]}
          // Style overrides for menu items if needed (example)
          // style={{ lineHeight: '64px' }} // Adjust based on header height
          />

          {/* Theme and Language Controls */}
          <Space>
            <LanguageSelect />
            <ThemeToggle />
          </Space>
        </div>
      </Header>

      {/* Main content area where child routes are rendered */}
      <Content className="flex-1 bg-[var(--color-background-secondary)] page-container"> {/* Standardized padding via page-container */}
        {/* Animate page transitions */}
        <motion.div
          key={location.pathname} // Add key for route transition animation
          initial={{ opacity: 0, y: 10 }} // Slightly modified animation
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} // Added exit animation
          transition={{ duration: 0.3 }} // Faster transition
        >
          {/* Renders the matched child route component */}
          <Outlet />
        </motion.div>
      </Content>

      {/* PWA Installation component - placed outside content flow */}
      {/* This position is fine and should not cause loops */}
      <InstallPWA />

      {/* Optional: Footer */}
      {/* <Layout.Footer style={{ textAlign: 'center', background: 'var(--color-background)', borderTop: '1px solid var(--color-border)' }}>
          Your Footer Content ©2025
        </Layout.Footer> */}
    </Layout>
  );
};

export default PublicLayout;