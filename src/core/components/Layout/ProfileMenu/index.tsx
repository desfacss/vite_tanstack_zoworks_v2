import React, { useState } from 'react';
import { Dropdown, Avatar } from 'antd';
import {
  User,
  Settings,
  LogOut,
  Building,
  CreditCard,
  HelpCircle,
  FileText,
  Palette
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/core/lib/store';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAuthedLayoutConfig } from '../AuthedLayoutContext';
import { MobileActionSheet, type ActionSheetItem } from '../../shared/MobileActionSheet';

// Simple mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

export const ProfileMenu: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showActionSheet, setShowActionSheet] = useState(false);

  const { user, organization, clearUserSession, setIsLoggingOut } = useAuthStore();
  const queryClient = useQueryClient();
  const { setShowSettings } = useAuthedLayoutConfig();
  const { t } = useTranslation();

  // Check if user has admin role
  const roleName = user?.roles?.name || (user?.role_id as any)?.name;
  const isAdmin = roleName === 'SassAdmin' || roleName === 'Superadmin';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    console.log('>>> [ProfileMenu] Cancelling queries & Logging out...');
    await queryClient.cancelQueries();
    queryClient.clear();
    clearUserSession();

    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn('Supabase signOut warning:', error.message);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  // Menu items for Desktop Dropdown
  const menuItems = {
    items: [
      { key: 'profile', label: t('common.label.profile'), icon: <User size={16} />, onClick: () => navigate('/profile') },
      { key: 'settings', label: t('common.label.settings'), icon: <Settings size={16} />, onClick: () => setShowSettings(true) },
      { key: 'billing', label: t('common.label.billing'), icon: <CreditCard size={16} />, onClick: () => navigate('/billing') },
      { type: 'divider' },
      { key: 'organization', label: t('common.label.organization_settings'), icon: <Building size={16} />, onClick: () => navigate('/settings?tab=organization') },
      { key: 'team', label: t('common.label.management'), icon: <User size={16} />, onClick: () => navigate('/settings?tab=team') },
      // Branding - only for admin roles
      ...(isAdmin ? [{ key: 'branding', label: 'Branding', icon: <Palette size={16} />, onClick: () => navigate('/admin/branding') }] : []),
      { type: 'divider' },
      { key: 'help', label: t('common.label.help_support'), icon: <HelpCircle size={16} />, onClick: () => window.open('https://help.zoworks.com', '_blank') },
      { key: 'docs', label: t('common.label.documentation'), icon: <FileText size={16} />, onClick: () => window.open('https://docs.zoworks.com', '_blank') },
      { type: 'divider' },
      { key: 'logout', label: t('core.auth.action.sign_out'), icon: <LogOut size={16} />, danger: true, onClick: handleLogout },
    ],
  };

  // Action sheet items for Mobile
  const actionSheetItems: ActionSheetItem[] = [
    { key: 'profile', label: t('common.label.profile'), icon: <User size={20} />, onClick: () => navigate('/profile') },
    { key: 'settings', label: t('common.label.settings'), icon: <Settings size={20} />, onClick: () => setShowSettings(true) },
    { key: 'billing', label: t('common.label.billing'), icon: <CreditCard size={20} />, onClick: () => navigate('/billing') },
    { key: 'divider1', label: '' },
    { key: 'organization', label: t('common.label.organization_settings'), icon: <Building size={20} />, onClick: () => navigate('/settings?tab=organization') },
    { key: 'team', label: t('common.label.management'), icon: <User size={20} />, onClick: () => navigate('/settings?tab=team') },
    // Branding - only for admin roles
    ...(isAdmin ? [{ key: 'branding', label: 'Branding', icon: <Palette size={20} />, onClick: () => navigate('/admin/branding') }] : []),
    { key: 'divider2', label: '' },
    { key: 'help', label: t('common.label.help_support'), icon: <HelpCircle size={20} />, onClick: () => window.open('https://help.zoworks.com', '_blank') },
    { key: 'docs', label: t('common.label.documentation'), icon: <FileText size={20} />, onClick: () => window.open('https://docs.zoworks.com', '_blank') },
    { key: 'divider3', label: '' },
    { key: 'logout', label: t('core.auth.action.sign_out'), icon: <LogOut size={20} />, danger: true, onClick: handleLogout },
  ];

  const avatarElement = (
    <Avatar
      size={32}
      style={{
        background: 'var(--color-primary)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
    </Avatar>
  );

  // Mobile: Avatar only + Action Sheet
  if (isMobile) {
    return (
      <>
        <div
          className="header-profile-section"
          onClick={() => setShowActionSheet(true)}
        >
          {avatarElement}
        </div>
        <MobileActionSheet
          open={showActionSheet}
          onClose={() => setShowActionSheet(false)}
          items={actionSheetItems}
          title={user?.name || 'Account'}
        />
      </>
    );
  }

  // Desktop: Dropdown with name + role + avatar
  return (
    <Dropdown menu={menuItems as any} placement="bottomRight" trigger={['click']}>
      <div className="header-profile-section">
        <div className="header-profile-info">
          <span className="header-profile-name">
            {user?.name || 'User'}
          </span>
          <span className="header-profile-role">
            {organization?.name || 'Member'}
          </span>
        </div>
        {avatarElement}
      </div>
    </Dropdown>
  );
};