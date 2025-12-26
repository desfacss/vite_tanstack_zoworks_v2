import React from 'react';
import { Dropdown, Button } from 'antd';
import {
  User,
  Settings,
  LogOut,
  Building,
  CreditCard,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/core/lib/store';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAuthedLayoutConfig } from '../AuthedLayoutContext';
import { ProfileAvatar } from '../Profile/index';

export const ProfileMenu: React.FC = () => {
  const navigate = useNavigate();
  // Get setIsLoggingOut from store
  const { user, clearUserSession, setIsLoggingOut } = useAuthStore();
  const queryClient = useQueryClient();
  const { setShowSettings } = useAuthedLayoutConfig();

  const { t } = useTranslation();

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
      { key: 'profile', label: t('common.label.profile'), icon: <User size={16} />, onClick: () => navigate('/profile') },
      { key: 'settings', label: t('common.label.settings'), icon: <Settings size={16} />, onClick: () => setShowSettings(true) },
      { key: 'billing', label: t('common.label.billing'), icon: <CreditCard size={16} />, onClick: () => navigate('/billing') },
      { type: 'divider' },
      { key: 'organization', label: t('common.label.organization_settings'), icon: <Building size={16} />, onClick: () => navigate('/settings?tab=organization') },
      { key: 'team', label: t('common.label.management'), icon: <User size={16} />, onClick: () => navigate('/settings?tab=team') },
      { type: 'divider' },
      { key: 'help', label: t('common.label.help_support'), icon: <HelpCircle size={16} />, onClick: () => window.open('https://help.zoworks.com', '_blank') },
      { key: 'docs', label: t('common.label.documentation'), icon: <FileText size={16} />, onClick: () => window.open('https://docs.zoworks.com', '_blank') },
      { type: 'divider' },
      { key: 'logout', label: t('core.auth.action.sign_out'), icon: <LogOut size={16} />, danger: true, onClick: handleLogout },
    ],
  };

  return (
    <Dropdown menu={menuItems as any} placement="bottomRight" trigger={['click']}>
      <Button
        type="text"
        className="header-icon-btn !w-auto !h-auto"
      >
        {/* Desktop: Avatar + Name */}
        <div className="hidden md:flex items-center gap-2">
          {/* Avatar sized to header-icon-size */}
          <div style={{ width: 'var(--header-icon-size)', height: 'var(--header-icon-size)' }}>
            <ProfileAvatar size={28} className="!w-full !h-full" />
          </div>
          <span className="text-sm font-medium max-w-20 truncate">
            {user?.name || 'User'}
          </span>
        </div>
        {/* Mobile: Avatar only - offset to balance with hamburger */}
        <div
          className="flex md:hidden items-center justify-center"
          style={{ marginRight: 'calc(-1 * var(--header-icon-offset))' }}
        >
          <ProfileAvatar size={28} />
        </div>
      </Button>
    </Dropdown>
  );
};