import React from 'react';
import {
  HomeOutlined,
  TeamOutlined,
  BankOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  SettingOutlined,
  BriefcaseOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  CarOutlined,
  BuildOutlined,
  SolutionOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UsergroupAddOutlined,
  FolderOpenOutlined,
  AuditOutlined,
  CodeOutlined,
  EnvironmentOutlined,
  NodeIndexOutlined,
  ContainerOutlined,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
  ReadOutlined,
  ShopOutlined,
  FileDoneOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import menuConfig from '@/config/menuConfig.json';

// Icon mapping based on logical association using Ant Design Icons
const iconMap: Record<string, React.ReactNode> = {
  dashboard: <HomeOutlined />,
  users: <TeamOutlined />,
  organizations: <BankOutlined />,
  subscriptions: <CreditCardOutlined />,
  businesses: <BriefcaseOutlined />,
  settings: <SettingOutlined />,
  support: <SolutionOutlined />, // Support tickets
  fsm: <CarOutlined />, // Field service management (Truck -> Car/Vehicle)
  contracts: <AuditOutlined />, // Contracts
  workforce: <UsergroupAddOutlined />, // Workforce
  tickets: <UnorderedListOutlined />, // Tickets
  'service-reports': <FileTextOutlined />, // Service reports
  projects: <FolderOpenOutlined />, // Projects
  process: <NodeIndexOutlined />, // Processes (Workflow)
  analytics: <BarChartOutlined />, // Analytics/reports
  tracking: <EnvironmentOutlined />, // GPS/Location tracking
  'my-tickets': <UnorderedListOutlined />, // My tickets
  'service-types': <AppstoreOutlined />,
  'service-offerings': <ContainerOutlined />, // Service offerings (Package)
  'service-contracts': <AuditOutlined />, // Service contracts
  'service-categories': <AppstoreOutlined />, // Service categories
  'service-assets': <FileTextOutlined />, // Service assets
  clients: <BuildOutlined />, // Clients
  'client-contacts': <TeamOutlined />, // Client contacts
  teams: <TeamOutlined />, // Teams
  leaves: <CalendarOutlined />, // Leaves/time-off
  workflow: <NodeIndexOutlined />, // Workflow
  config: <CodeOutlined />, // Configuration
  'user-settings': <SettingOutlined />,
  'support-service': <CustomerServiceOutlined />,
  admin: <SafetyCertificateOutlined />,
  notifications: <BellOutlined />,
  catalog: <ReadOutlined />,
  shopping: <ShopOutlined />,
  reports: <FileDoneOutlined />,
  invoices: <FileTextOutlined />,
  default: <FileTextOutlined />, // Default fallback icon
};

// export const getNavigationItems = (
//   t: TFunction,
//   permissions: any,
//   user: any,
// ): MenuProps['items'] => {
//   const items: MenuProps['items'] = [];
//   // Add root level items (like Dashboard)
//   menuConfig?.root?.forEach(route => {
//     items.push({
//       key: route.routePath,
//       icon: iconMap[route.key] || iconMap.default,
//       label: t(`common.${route.translationKey}`),
//     });
//   });

//   // Add module items with their children
//   Object.entries(menuConfig.modules).forEach(([module, routes]) => {
//     // Include "settings" module only if user is SassAdmin
//     // console.log("zxq",module,user?.role_id?.name);
//     // if (module === 'settings' && user?.role_id?.name !== 'SassAdmin') {
//     //   return;
//     // }

//     const moduleItems: MenuProps['items'] = [];
// console.log("zz1",permissions);
//     if (permissions?.[module]?.permissions) {
//       routes.forEach(route => {
//         const feature = route.key.replace('-view', '');
//         const perms = permissions[module].permissions[feature];

//         if (Array.isArray(perms) && perms.includes('r')) {
//           moduleItems.push({
//             key: route.routePath,
//             icon: iconMap[route.key.replace('-view', '')] || iconMap.default,
//             label: t(`common.${route.translationKey}`), // Use common.<key>
//           });
//         }
//       });

//       // Only add module if it has visible items
//       if (moduleItems.length > 0) {
//         items.push({
//           key: module,
//           icon: iconMap[module] || iconMap.default,
//           label: t(`common.${module}`), // Use common.<module>
//           children: moduleItems,
//         });
//       }
//     }
//   });

//   return items;
// };

export const getNavigationItems = (
  t: TFunction,
  permissions: any, // This now holds the 'new' structure
  user: any,
): MenuProps['items'] => {
  const items: MenuProps['items'] = [];
  // Add root level items (like Dashboard)
  menuConfig?.root?.forEach(route => {
    // Assuming root routes are always allowed or checked elsewhere
    items.push({
      key: route.routePath,
      icon: iconMap[route.key] || iconMap.default,
      label: t(`common.${route.translationKey}`),
    });
  });

  // Add module items with their children
  Object.entries(menuConfig.modules).forEach(([module, routes]) => {
    // // The SassAdmin check (commented out in your original) remains here if needed
    // if (module === 'settings' && user?.role_id?.name !== 'SassAdmin') {
    //   return;
    // }

    const moduleItems: MenuProps['items'] = [];
    // console.log("zz1",permissions); // Permissions object should be the 'new' structure

    // 🚩 FIX: Check for the module key directly in the permissions object.
    if (permissions?.[module]) {
      routes.forEach(route => {
        const feature = route.key.replace('-view', '');

        // 🚩 FIX: Access the feature permissions directly under the module key.
        const perms = permissions[module][feature];

        // Check for read ('r') permission
        if (Array.isArray(perms) && perms.includes('r')) {
          moduleItems.push({
            key: route.routePath,
            icon: iconMap[route.key.replace('-view', '')] || iconMap.default,
            label: t(`common.${route.translationKey}`),
          });
        }
      });

      // Only add module if it has visible items
      if (moduleItems.length > 0) {
        items.push({
          key: module,
          icon: iconMap[module] || iconMap.default,
          label: t(`common.${module}`),
          children: moduleItems,
        });
      }
    }
  });

  return items;
};

// export const getAllowedRoutes = (permissions: any, user: any): string[] => {
//   const routes = [...menuConfig.root.map((route) => route.routePath)];

//   Object.entries(menuConfig.modules).forEach(([module, moduleRoutes]) => {
//     // Include "settings" module only if user is SassAdmin
//     // if (module === 'settings' && user?.role_id?.name !== 'SassAdmin') {
//     //   return;
//     // }

//     if (permissions?.[module]?.permissions) {
//       moduleRoutes.forEach(route => {
//         const feature = route.key.replace('-view', '');
//         const perms = permissions[module].permissions[feature];

//         if (Array.isArray(perms) && perms.includes('r')) {
//           routes.push(route.routePath);
//         }
//       });
//     }
//   });
// console.log("rrz",routes);
//   return routes;
// };


export const getAllowedRoutes = (permissions: any, user: any): string[] => {
  const routes = [...menuConfig.root.map((route) => route.routePath)];

  Object.entries(menuConfig.modules).forEach(([module, moduleRoutes]) => {
    // 1. Check if the module exists in the new permissions structure
    if (permissions?.[module]) {
      moduleRoutes.forEach(route => {
        // 2. Derive the feature key (e.g., 'tickets' from 'tickets-view')
        const feature = route.key.replace('-view', '');

        // 3. Directly access the permissions array using the new structure
        const perms = permissions[module][feature]; // <<< CHANGED LINE

        // 4. Check for read ('r') permission
        if (Array.isArray(perms) && perms.includes('r')) {
          routes.push(route.routePath);
        }
      });
    }
  });
  console.log("rz", routes);
  return routes;
};