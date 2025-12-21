// // // ProfileMenu.tsx
// // import React from 'react';
// // import { Dropdown, Avatar, Button } from 'antd';
// // import { useNavigate } from 'react-router-dom';
// // import { LogOut, User, Settings } from 'lucide-react';
// // import { useTranslation } from 'react-i18next';
// // import { useQueryClient } from '@tanstack/react-query';
// // import { useAuthStore } from '../@/core/lib/store';
// // import { supabase } from '../../../lib/supabase';

// // export const ProfileMenu: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
// //   const navigate = useNavigate();
// //   const { t } = useTranslation();
// //   const { user, clearUserSession } = useAuthStore();
// //   const queryClient = useQueryClient();

// //   const handleLogout = async () => {
// //     // 1. Immediately clear the Zustand state.
// //     // This provides an instant UI update to the logged-out state.
// //     console.log('>>> [ProfileMenu] Logging out: Clearing Zustand session...');
// //     clearUserSession();

// //     try {
// //       // 2. Attempt to sign out from Supabase.
// //       // This will fail gracefully if the auth token was already removed (e.g., cleared local storage).
// //       console.log('>>> [ProfileMenu] Attempting to sign out from Supabase...');
// //       const { error } = await supabase.auth.signOut();
// //       if (error) {
// //         console.warn('>>> [ProfileMenu] Supabase signOut error (might be expected if token is gone):', error.message);
// //       } else {
// //         console.log('>>> [ProfileMenu] Supabase signOut successful.');
// //       }
// //     } catch (error: any) {
// //       console.error('>>> [ProfileMenu] An unexpected error occurred during Supabase signOut:', error.message);
// //     } finally {
// //       // 3. Clear the TanStack Query cache.
// //       // This removes all cached data, including the 'user-session' query.
// //       console.log('>>> [ProfileMenu] Clearing TanStack Query cache...');
// //       queryClient.clear();

// //       // 4. Navigate to the login page.
// //       // The `replace: true` option prevents the user from navigating back to the protected route.
// //       console.log('>>> [ProfileMenu] Navigating to /login.');
// //       navigate('/login', { replace: true });
// //     }
// //   };

// //   const menuItems = {
// //     items: [
// //       {
// //         key: 'profile',
// //         icon: <User size={16} />,
// //         label: t('common.profile'),
// //         onClick: () => navigate('/profile'),
// //       },
// //       {
// //         key: 'settings',
// //         icon: <Settings size={16} />,
// //         label: t('common.settings'),
// //         onClick: () => navigate('/user-settings'),
// //       },
// //       {
// //         type: 'divider',
// //       },
// //       {
// //         key: 'logout',
// //         icon: <LogOut size={16} />,
// //         label: t('common.logout'),
// //         onClick: handleLogout,
// //       },
// //     ],
// //   };

// //   // Mobile Trigger: Just the Avatar, which is smaller
// //   const mobileTrigger = (
// //     <Button type="text" className="p-0">
// //       <Avatar icon={<User size={20} />} />
// //     </Button>
// //   );

// //   // Desktop Trigger: Avatar and User Name
// //   const desktopTrigger = (
// //     <Button type="text" className="flex items-center">
// //       <Avatar icon={<User size={20} />} />
// //       <span className={`ml-2 ${isMobile ? 'hidden' : 'hidden md:inline'}`}>{user?.name}</span>
// //     </Button>
// //   );

// //   return (
// //     <Dropdown menu={menuItems} placement="bottomRight" trigger={['click']}>
// //       {isMobile ? mobileTrigger : desktopTrigger}
// //     </Dropdown>
// //   );
// // };

// // ProfileMenu.tsx
// import React from 'react';
// import { Dropdown, Avatar, Button } from 'antd';
// import { useNavigate } from 'react-router-dom';
// import { LogOut, User, Settings } from 'lucide-react';
// import { useTranslation } from 'react-i18next';
// import { useQueryClient } from '@tanstack/react-query';
// import { useAuthStore } from '../@/core/lib/store';
// import { supabase } from '../../../lib/supabase';

// export const ProfileMenu: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
//   const navigate = useNavigate();
//   const { t } = useTranslation();
//   const { user, clearUserSession, setIsLoggingOut } = useAuthStore(); // <--- UPDATED
//   const queryClient = useQueryClient();

//   const handleLogout = async () => {
//     // 0. Set the global logging-out flag.
//     // This prevents the SessionManager from trying to re-fetch/restore the session
//     // when the store is cleared.
//     setIsLoggingOut(true); // <--- ADDED

//     // 1. Stop any ongoing queries immediately.
//     // This prevents race conditions where a query finishes *after* we clear the session.
//     console.log('>>> [ProfileMenu] Cancelling ongoing queries...');
//     await queryClient.cancelQueries(); // <--- ADDED

//     // 2. Immediately clear the Zustand state.
//     // This provides an instant UI update to the logged-out state.
//     console.log('>>> [ProfileMenu] Logging out: Clearing Zustand session...');
//     clearUserSession();

//     try {
//       // 3. Attempt to sign out from Supabase.
//       // This will fail gracefully if the auth token was already removed.
//       console.log('>>> [ProfileMenu] Attempting to sign out from Supabase...');
//       const { error } = await supabase.auth.signOut();
//       if (error) {
//         console.warn('>>> [ProfileMenu] Supabase signOut error (might be expected if token is gone):', error.message);
//       } else {
//         console.log('>>> [ProfileMenu] Supabase signOut successful.');
//       }
//     } catch (error: any) {
//       console.error('>>> [ProfileMenu] An unexpected error occurred during Supabase signOut:', error.message);
//     } finally {
//       // 4. Clear the TanStack Query cache.
//       console.log('>>> [ProfileMenu] Clearing TanStack Query cache...');
//       queryClient.clear();

//       // 5. Navigate to the login page.
//       console.log('>>> [ProfileMenu] Navigating to /login.');
//       navigate('/login', { replace: true });
//     }
//   };

//   const menuItems = {
//     items: [
//       {
//         key: 'profile',
//         icon: <User size={16} />,
//         label: t('common.profile'),
//         onClick: () => navigate('/profile'),
//       },
//       {
//         key: 'settings',
//         icon: <Settings size={16} />,
//         label: t('common.settings'),
//         onClick: () => navigate('/user-settings'),
//       },
//       {
//         type: 'divider',
//       },
//       {
//         key: 'logout',
//         icon: <LogOut size={16} />,
//         label: t('common.logout'),
//         onClick: handleLogout,
//       },
//     ],
//   };

//   // Mobile Trigger: Just the Avatar, which is smaller
//   const mobileTrigger = (
//     <Button type="text" className="p-0">
//       <Avatar icon={<User size={20} />} />
//     </Button>
//   );

//   // Desktop Trigger: Avatar and User Name
//   const desktopTrigger = (
//     <Button type="text" className="flex items-center">
//       <Avatar icon={<User size={20} />} />
//       <span className={`ml-2 ${isMobile ? 'hidden' : 'hidden md:inline'}`}>{user?.name}</span>
//     </Button>
//   );

//   return (
//     <Dropdown menu={menuItems} placement="bottomRight" trigger={['click']}>
//       {isMobile ? mobileTrigger : desktopTrigger}
//     </Dropdown>
//   );
// };


import React from 'react';
import { Dropdown, Avatar, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../@/core/lib/store';
import { supabase } from '../../../lib/supabase';

export const ProfileMenu: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Get setIsLoggingOut from store
  const { user, clearUserSession, setIsLoggingOut } = useAuthStore();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    // 1. Set Guard: Prevents SessionManager from accepting new data
    setIsLoggingOut(true);

    // 2. Stop React Query: Cancel any in-flight fetches immediately
    console.log('>>> [ProfileMenu] Cancelling queries & Logging out...');
    await queryClient.cancelQueries();
    queryClient.clear(); 

    // 3. Clear Store
    clearUserSession();

    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn('Supabase signOut warning:', error.message);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 4. Force Navigation
      navigate('/login', { replace: true });
    }
  };

  const menuItems = {
    items: [
      {
        key: 'profile',
        icon: <User size={16} />,
        label: t('common.profile'),
        onClick: () => navigate('/profile'),
      },
      {
        key: 'settings',
        icon: <Settings size={16} />,
        label: t('common.settings'),
        onClick: () => navigate('/user-settings'),
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogOut size={16} />,
        label: t('common.logout'),
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Dropdown menu={menuItems} placement="bottomRight" trigger={['click']}>
      {isMobile ? (
        <Button type="text" className="p-0"><Avatar icon={<User size={20} />} /></Button>
      ) : (
        <Button type="text" className="flex items-center">
          <Avatar icon={<User size={20} />} />
          <span className={`ml-2 ${isMobile ? 'hidden' : 'hidden md:inline'}`}>{user?.name}</span>
        </Button>
      )}
    </Dropdown>
  );
};