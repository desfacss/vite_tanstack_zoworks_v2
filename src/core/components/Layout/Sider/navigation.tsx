import {
  Home,
  Users,
  Building2,
  CreditCard,
  FileText,
  Settings,
  Briefcase,
  LayoutGrid,
  BarChart3,
  LayoutDashboard,
  List,
  Car,
  Building,
  Headphones,
  Calendar,
  Clock,
  UserPlus,
  FolderOpen,
  FileCheck,
  Code,
  MapPin,
  GitBranch,
  Package,
  HeadphonesIcon,
  ShieldCheck,
  Bell,
  BookOpen,
  Store,
  FileBadge,
  Shield
} from 'lucide-react';
import type { MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import menuConfig from '@/config/menuConfig.json';

// Icon mapping based on logical association using Lucide Icons
const iconMap: Record<string, React.ReactNode> = {
  home: <Home size={18} />,
  dashboard: <LayoutDashboard size={18} />,
  users: <Users size={18} />,
  organizations: <Building2 size={18} />,
  subscriptions: <CreditCard size={18} />,
  businesses: <Briefcase size={18} />,
  settings: <Settings size={18} />,
  support: <Headphones size={18} />,
  fsm: <Car size={18} />,
  contracts: <FileCheck size={18} />,
  workforce: <UserPlus size={18} />,
  tickets: <List size={18} />,
  'service-reports': <FileText size={18} />,
  projects: <FolderOpen size={18} />,
  process: <GitBranch size={18} />,
  analytics: <BarChart3 size={18} />,
  tracking: <MapPin size={18} />,
  'my-tickets': <List size={18} />,
  'service-types': <LayoutGrid size={18} />,
  'service-offerings': <Package size={18} />,
  'service-contracts': <FileCheck size={18} />,
  'service-categories': <LayoutGrid size={18} />,
  'service-assets': <FileText size={18} />,
  clients: <Building size={18} />,
  'client-contacts': <Users size={18} />,
  teams: <Users size={18} />,
  leaves: <Calendar size={18} />,
  workflow: <GitBranch size={18} />,
  config: <Code size={18} />,
  'user-settings': <Settings size={18} />,
  'support-service': <HeadphonesIcon size={18} />,
  admin: <ShieldCheck size={18} />,
  notifications: <Bell size={18} />,
  catalog: <BookOpen size={18} />,
  shopping: <Store size={18} />,
  reports: <FileBadge size={18} />,
  invoices: <FileText size={18} />,
  default: <FileText size={18} />,
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
//       label: t(`common.label.${route.translationKey}`),
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
//             label: t(`common.label.${route.translationKey}`), // Use common.<key>
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
      label: t(`common.label.${route.translationKey}`),
    });
  });

  // Add module items with their children
  Object.entries(menuConfig.modules).forEach(([module, routes]) => {
    // // The SassAdmin check (commented out in your original) remains here if needed
    // if (module === 'settings' && user?.role_id?.name !== 'SassAdmin') {
    //   return;
    // }

    const moduleItems: MenuProps['items'] = [];

    // Check if module has permissions defined
    const modulePerms = permissions?.[module];

    routes.forEach(route => {
      const feature = route.key.replace('-view', '');
      const perms = modulePerms?.[feature];

      // Show item if:
      // 1. Has explicit read permission ['r', ...], OR
      // 2. No permission check exists for this module (fallback to show)
      const hasReadPermission = Array.isArray(perms) && perms.includes('r');
      const noPermissionDefined = !modulePerms;

      if (hasReadPermission || noPermissionDefined) {
        moduleItems.push({
          key: route.routePath,
          icon: iconMap[route.key.replace('-view', '')] || iconMap.default,
          label: t(`common.label.${route.translationKey}`),
        });
      }
    });

    // Only add module if it has visible items
    if (moduleItems.length > 0) {
      items.push({
        key: module,
        icon: iconMap[module] || iconMap.default,
        label: t(`common.label.${module}`),
        children: moduleItems,
      });
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


export const getAllowedRoutes = (permissions: any, _user: any): string[] => {
  const routes = [...menuConfig.root.map((route) => route.routePath)];

  Object.entries(menuConfig.modules).forEach(([module, moduleRoutes]) => {
    const modulePerms = permissions?.[module];

    moduleRoutes.forEach(route => {
      const feature = route.key.replace('-view', '');
      const perms = modulePerms?.[feature];

      // Allow route if has read permission OR no permissions defined
      const hasReadPermission = Array.isArray(perms) && perms.includes('r');
      const noPermissionDefined = !modulePerms;

      if (hasReadPermission || noPermissionDefined) {
        routes.push(route.routePath);
      }
    });
  });
  console.log("rz", routes);
  return routes;
};