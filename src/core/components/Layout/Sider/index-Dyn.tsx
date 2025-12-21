// //Sider/index.tsx
// import React from 'react';
// import { Layout, Menu } from 'antd';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
// import { useAuthStore } from '@/core/lib/store';

// const { Sider: AntSider } = Layout;

// interface SiderProps {
//   collapsed: boolean;
// }

// export const Sider: React.FC<SiderProps> = ({ collapsed }) => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const { t } = useTranslation();
//   const { organization, navigationItems } = useAuthStore();

//   return (
//     <AntSider
//       trigger={null}
//       collapsible
//       collapsed={collapsed}
//       className="bg-[var(--color-background)] border-r border-[var(--color-border)]"
//       width={256}
//     >
//       <div className="p-4 text-center border-b border-[var(--color-border)]">
//         <h1 className="text-xl font-bold truncate text-[var(--color-text)]">
//           {organization?.name || 'Enterprise App'}
//         </h1>
//       </div>
//       <Menu
//         mode="inline"
//         selectedKeys={[location.pathname]}
//         items={navigationItems}
//         onClick={({ key }) => navigate(key)}
//         className="bg-transparent"
//       />
//     </AntSider>
//   );
// };



// Sider/index.tsx
import React from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/lib/store';
import { getNavigationItems } from './navigation';

const { Sider: AntSider } = Layout;

interface SiderProps {
  collapsed: boolean;
}

export const Sider: React.FC<SiderProps> = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { organization, permissions } = useAuthStore();

  // Generate navigation items dynamically based on permissions
  const navigationItems = getNavigationItems(permissions);

  return (
    <AntSider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className="bg-[var(--color-background)] border-r border-[var(--color-border)]"
      width={256}
    >
      <div className="p-4 text-center border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold truncate text-[var(--color-text)]">
          {organization?.name || 'Enterprise App'}
        </h1>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={navigationItems}
        onClick={({ key }) => navigate(key)}
        className="bg-transparent"
      />
    </AntSider>
  );
};