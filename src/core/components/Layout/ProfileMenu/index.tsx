import React from 'react';
import { Dropdown, Avatar, Button } from 'antd';
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

export const ProfileMenu: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
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