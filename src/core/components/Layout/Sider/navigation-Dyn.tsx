// Sider/navigation.tsx
import React from 'react';
import { Home, Users, Building2, CreditCard, FileText, Settings, Briefcase } from 'lucide-react';
import type { MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import menuConfig from '../../../config/menuConfig.json';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  dashboard: <Home size={20} />,
  users: <Users size={20} />,
  organizations: <Building2 size={20} />,
  subscriptions: <CreditCard size={20} />,
  businesses: <Briefcase size={20} />,
  settings: <Settings size={20} />,
  default: <FileText size={20} />
};

export const getNavigationItems = (t: TFunction, permissions: any): MenuProps['items'] => {
  const items: MenuProps['items'] = [];

  // Add root level items (like Dashboard)
  menuConfig.root.forEach(route => {
    items.push({
      key: route.routePath,
      icon: iconMap[route.key] || iconMap.default,
      label: t(`common.${route.translationKey}`),
    });
  });

  // Add module items with their children
  Object.entries(menuConfig.modules).forEach(([module, routes]) => {
    const moduleItems: MenuProps['items'] = [];

    routes.forEach(route => {
      // Check if module exists in permissions
      if (permissions?.[module]?.permissions) {
        const feature = route.key.replace('-view', ''); // Handle cases like users-view -> users
        const perms = permissions[module].permissions[feature];

        // Add route if permissions exist and include read access
        if (Array.isArray(perms) && perms.includes('r')) {
          moduleItems.push({
            key: route.routePath,
            icon: iconMap[route.key.replace('-view', '')] || iconMap.default,
            label: t(`common.${route.translationKey}`),
          });
        }
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
  });

  return items;
};

export const getAllowedRoutes = (permissions: any): string[] => {
  const routes = [...menuConfig.root.map(route => route.routePath)];
console.log("permissions - menuConfig",permissions,menuConfig);
  Object.entries(menuConfig.modules).forEach(([module, moduleRoutes]) => {
    if (permissions?.[module]?.permissions) {
      moduleRoutes.forEach(route => {
        const feature = route.key.replace('-view', '');
        const perms = permissions[module].permissions[feature];
        
        if (Array.isArray(perms) && perms.includes('r')) {
          routes.push(route.routePath);
        }
      });
    }
  });

  return routes;
};



// // Sider/navigation.tsx
// import React from 'react';
// import { FileText } from 'lucide-react';
// import type { MenuProps } from 'antd';
// import menuConfig from '../../../config/menuConfig.json';

// // Dynamically import pageMeta for each route
// const loadPageMeta = (filePath: string) => {
//   try {
//     // Convert filePath to module path (e.g., src/pages/core/UsersView.tsx -> ../pages/core/UsersView)
//     const modulePath = filePath.replace(/^src\//, '../').replace(/\.tsx$/, '');
//     return require(modulePath).pageMeta || {};
//   } catch (error) {
//     console.warn(`Failed to load pageMeta for ${filePath}:`, error);
//     return {};
//   }
// };

// // Default icon for fallback
// const defaultIcon = <FileText size={20} />;

// // Helper to derive a fallback title from translationKey
// const getFallbackTitle = (translationKey: string) => {
//   // Capitalize and replace hyphens with spaces for readability
//   return translationKey
//     .split('-')
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//     .join(' ');
// };

// export const getNavigationItems = (permissions: any): MenuProps['items'] => {
//   const items: MenuProps['items'] = [];

//   // Add root level items
//   menuConfig.root.forEach((route) => {
//     const pageMeta = loadPageMeta(route.filePath);
//     items.push({
//       key: route.routePath,
//       icon: pageMeta.icon || defaultIcon,
//       label: pageMeta.title || getFallbackTitle(route.translationKey),
//     });
//   });

//   // Add module items with their children
//   Object.entries(menuConfig.modules).forEach(([module, routes]) => {
//     const moduleItems: MenuProps['items'] = [];

//     routes.forEach((route) => {
//       // Check if module and submodule exist in permissions
//       if (permissions?.[module]?.[route.submoduleKey]) {
//         const perms = permissions[module][route.submoduleKey];
//         // Add route if permissions include read access
//         if (Array.isArray(perms) && perms.includes('r')) {
//           const pageMeta = loadPageMeta(route.filePath);
//           moduleItems.push({
//             key: route.routePath,
//             icon: pageMeta.icon || defaultIcon,
//             label: pageMeta.title || getFallbackTitle(route.translationKey),
//           });
//         }
//       }
//     });

//     // Only add module if it has visible items
//     if (moduleItems.length > 0) {
//       items.push({
//         key: module,
//         icon: defaultIcon, // Module-level icon (customize if needed)
//         label: getFallbackTitle(module), // Capitalize module name
//         children: moduleItems,
//       });
//     }
//   });

//   return items;
// };

// export const getAllowedRoutes = (permissions: any): string[] => {
//   const routes = [...menuConfig.root.map((route) => route.routePath)];

//   Object.entries(menuConfig.modules).forEach(([module, moduleRoutes]) => {
//     if (permissions?.[module]) {
//       moduleRoutes.forEach((route) => {
//         const perms = permissions[module][route.submoduleKey];
//         if (Array.isArray(perms) && perms.includes('r')) {
//           routes.push(route.routePath);
//         }
//       });
//     }
//   });

//   return routes;
// };