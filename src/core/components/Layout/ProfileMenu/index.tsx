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

export const ProfileMenu: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const navigate = useNavigate();
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
      { key: 'profile', label: 'My Profile', icon: <User size={16} />, onClick: () => navigate('/profile') }, // Navigate to profile
      { key: 'settings', label: 'Settings', icon: <Settings size={16} />, onClick: () => navigate('/settings') },
      { key: 'billing', label: 'Billing & Plans', icon: <CreditCard size={16} />, onClick: () => navigate('/billing') },
      { type: 'divider' },
      { key: 'organization', label: 'Organization Settings', icon: <Building size={16} />, onClick: () => navigate('/settings/organization') },
      { key: 'team', label: 'Team Management', icon: <User size={16} />, onClick: () => navigate('/settings/team') },
      { type: 'divider' },
      { key: 'help', label: 'Help & Support', icon: <HelpCircle size={16} />, onClick: () => window.open('https://help.zoworks.com', '_blank') },
      { key: 'docs', label: 'Documentation', icon: <FileText size={16} />, onClick: () => window.open('https://docs.zoworks.com', '_blank') },
      { type: 'divider' },
      { key: 'logout', label: 'Sign Out', icon: <LogOut size={16} />, danger: true, onClick: handleLogout },
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