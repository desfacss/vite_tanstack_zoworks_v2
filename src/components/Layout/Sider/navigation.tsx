import React from 'react';
import {
  Home,
  Users,
  Building2,
  CreditCard,
  FileText,
  Settings,
  Briefcase,
  Layers,
  BarChart2,
  ListTodo,
  Truck,
  Building,
  ClipboardList,
  Calendar,
  Clock,
  Users2,
  FolderOpen,
  ClipboardCheck,
  Code,
  MapPin,
  Workflow,
  Clipboard,
  Package,
  Headset, // For support
  Shield, // For admin
  Bell, // For notifications
  BookOpen, // For catalog
  ShoppingCart, // For shopping
  ScrollText, // For reports
  Receipt, // For invoices
} from 'lucide-react';
import type { MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import menuConfig from '../../../config/menuConfig.json';

// Icon mapping based on logical association
const iconMap: Record<string, React.ReactNode> = {
  dashboard: <Home size={20} />,
  users: <Users size={20} />,
  organizations: <Building2 size={20} />,
  subscriptions: <CreditCard size={20} />,
  businesses: <Briefcase size={20} />,
  settings: <Settings size={20} />,
  support: <ClipboardList size={20} />, // Support tickets
  fsm: <Truck size={20} />, // Field service management
  contracts: <ClipboardCheck size={20} />, // Contracts
  workforce: <Users2 size={20} />, // Workforce
  tickets: <ListTodo size={20} />, // Tickets
  'service-reports': <FileText size={20} />, // Service reports
  projects: <FolderOpen size={20} />, // Projects
  process: <Workflow size={20} />, // Processes
  analytics: <BarChart2 size={20} />, // Analytics/reports
  tracking: <MapPin size={20} />, // GPS/Location tracking
  'my-tickets': <ListTodo size={20} />, // My tickets
  'service-types': <Layers size={20} />, // Replaced BriefcaseMedical
  'service-offerings': <Package size={20} />, // Service offerings
  'service-contracts': <ClipboardCheck size={20} />, // Service contracts
  'service-categories': <Layers size={20} />, // Service categories
  'service-assets': <Clipboard size={20} />, // Service assets
  clients: <Building size={20} />, // Clients
  'client-contacts': <Users size={20} />, // Client contacts
  teams: <Users2 size={20} />, // Teams
  leaves: <Calendar size={20} />, // Leaves/time-off
  workflow: <Workflow size={20} />, // Workflow
  config: <Code size={20} />, // Configuration
  'user-settings': <Settings size={20} />,
  'support-service': <Headset size={20} />,
  admin: <Shield size={20} />,
  notifications: <Bell size={20} />,
  catalog: <BookOpen size={20} />,
  shopping: <ShoppingCart size={20} />,
  reports: <ScrollText size={20} />,
  invoices: <Receipt size={20} />,
  default: <FileText size={20} />, // Default fallback icon
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
console.log("rz",routes);
  return routes;
};