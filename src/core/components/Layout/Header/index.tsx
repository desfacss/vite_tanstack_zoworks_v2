import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Button, Space, Drawer, Select, Badge, message } from 'antd';
import { Menu, Search, Settings, Bell } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ProfileMenu } from '../ProfileMenu';
import { useAuthedLayoutConfig } from '../AuthedLayoutContext';
import { useAuthStore } from '@/core/lib/store';
import { supabase } from '@/lib/supabase';
import type { Organization, Location } from '@/lib/types';

const { Header: AntHeader } = Layout;

interface UserOrgLocationData {
  organization_id: string;
  organization_name: string;
  roles: string[];
  locations: { location_id: string; location_name: string; }[];
  default_location_id: string | null;
  default_location_name: string | null;
}

interface HeaderProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  unreadCount: number;
  setShowNotifications: (show: boolean) => void;
  setShowMobileMenu: (show: boolean) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  collapsed,
  setCollapsed,
  isMobile,
  unreadCount,
  setShowNotifications,
  setShowMobileMenu,
  showSearch,
  setShowSearch,
  pageTitle,
}) => {
  const { t } = useTranslation();
  const { config, setShowSettings: setGlobalShowSettings } = useAuthedLayoutConfig();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    user,
    organization,
    location,
    setOrganization,
    setLocation,
    viewPreferences,
    setViewPreferences,
    setIsSwitchingOrg
  } = useAuthStore();

  const [userOrgLocations, setUserOrgLocations] = useState<UserOrgLocationData[]>([]);
  const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

  // 1. Fetch Options
  useEffect(() => {
    const fetchOrgAndLocations = async () => {
      if (!user?.id) return;
      setLoadingOrgLocs(true);
      try {
        const { data, error } = await supabase.schema('identity').rpc('get_my_organizations');
        if (error) throw error;
        setUserOrgLocations(data as UserOrgLocationData[]);
      } catch (error) {
        console.error('[Header] Error:', error);
      } finally {
        setLoadingOrgLocs(false);
      }
    };
    if (user?.id) fetchOrgAndLocations();
  }, [user?.id]);

  // 1b. Set default location if no location is selected
  useEffect(() => {
    if (!location?.id && organization?.id && userOrgLocations.length > 0) {
      const currentOrgData = userOrgLocations.find(o => o.organization_id === organization.id);
      if (currentOrgData?.default_location_id) {
        setLocation({
          id: currentOrgData.default_location_id,
          name: currentOrgData.default_location_name || t('common.label.default')
        } as Location);
      }
    }
  }, [location?.id, organization?.id, userOrgLocations, setLocation]);

  // 2. Switching Logic (Reactive)
  const handleOrganizationChange = async (orgId: string) => {
    const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);

    if (selectedOrgData && user?.id) {
      setIsSwitchingOrg(true);
      message.loading({
        content: t('common.message.switching_to', { name: selectedOrgData.organization_name }),
        key: 'orgSwitch'
      });

      try {
        setOrganization({
          id: selectedOrgData.organization_id,
          name: selectedOrgData.organization_name
        } as Organization);

        navigate('/dashboard');

        const newLocations = selectedOrgData.locations;
        let targetLocation: Location | null = null;
        if (newLocations.length > 0) {
          const stickyId = viewPreferences[user.id]?.['global']?.lastLocationByOrg?.[orgId];
          const stickyLoc = newLocations.find(l => l.location_id === stickyId);
          const locData = stickyLoc || newLocations[0];
          targetLocation = { id: locData.location_id, name: locData.location_name } as Location;
        }
        setLocation(targetLocation);

        await supabase.schema('identity').rpc('set_preferred_organization', { new_org_id: orgId });
        await supabase.auth.updateUser({
          data: { org_id: orgId }
        });

        await queryClient.invalidateQueries({ queryKey: ['user-session'] });

        message.success({
          content: t('common.message.switched_to', { name: selectedOrgData.organization_name }),
          key: 'orgSwitch',
          duration: 2
        });
      } catch (err) {
        console.error("[Header] Switch error:", err);
        message.error({
          content: t('common.message.failed_to_switch'),
          key: 'orgSwitch',
          duration: 2
        });
      } finally {
        setIsSwitchingOrg(false);
      }
    }
  };

  const handleLocationChange = (locId: string) => {
    if (!organization?.id || !user?.id) return;
    const currentOrgLocs = userOrgLocations.find(o => o.organization_id === organization.id)?.locations || [];
    const selectedLoc = currentOrgLocs.find(loc => loc.location_id === locId);

    if (selectedLoc) {
      setLocation({ id: selectedLoc.location_id, name: selectedLoc.location_name } as Location);
      setViewPreferences(user.id, 'global', {
        lastLocationByOrg: { ...(viewPreferences[user.id]?.['global']?.lastLocationByOrg || {}), [organization.id]: locId },
      });
    }
  };

  const organizationOptions = useMemo(() => userOrgLocations.map(org => ({
    value: org.organization_id,
    label: (
      <div>
        <span className='font-medium'>{org.organization_name}</span>
        <br />
        <span className='text-xs text-gray-500'>{org.roles?.join(', ')}</span>
      </div>
    )
  })), [userOrgLocations]);

  const currentLocations = useMemo(() => {
    if (!organization?.id) return [];
    return userOrgLocations.find(o => o.organization_id === organization.id)?.locations.map(l => ({
      value: l.location_id,
      label: l.location_name,
    })) || [];
  }, [organization?.id, userOrgLocations]);

  const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;
  useEffect(() => {
    if (!isFetchingSession) setIsSwitchingOrg(false);
  }, [isFetchingSession, setIsSwitchingOrg]);

  return (
    <AntHeader
      className="sticky top-0 z-50 bg-[var(--color-background)] border-b border-[var(--color-border)]"
      style={{
        paddingRight: `var(--layout-padding)`,
        paddingLeft: `var(--layout-padding)`,
        height: 'var(--header-height)',
        width: '100%',
      }}
    >
      <div className="flex justify-between items-center h-full">

        {/* Left side: Hamburger/Toggle + Page Title */}
        <div className="flex items-center gap-2 shrink-0 overflow-hidden min-w-0">
          <Button
            type="text"
            icon={<Menu size={20} />}
            onClick={() => (isMobile ? setShowMobileMenu(true) : setCollapsed(!collapsed))}
            className="flex-shrink-0 flex items-center justify-center p-0"
            style={{
              width: 32,
              height: 32,
              marginLeft: -6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />

          {/* Page title - shows on MOBILE only in the header */}
          {isMobile && pageTitle && (
            <span className="text-base font-semibold whitespace-nowrap truncate max-w-[160px] ml-1">
              {pageTitle}
            </span>
          )}
        </div>




        {/* Center: Location selector (mobile only, if multiple locations) */}
        {isMobile && currentLocations.length > 1 && (
          <Select
            placeholder={t('common.label.location')}
            value={location?.id}
            onChange={handleLocationChange}
            loading={loadingOrgLocs}
            style={{ width: 120 }}
            options={currentLocations}
            disabled={loadingOrgLocs}
            className="mx-2"
            size="small"
          />
        )}


        {/* Right side: Icons */}
        <Space size={isMobile ? 4 : 8} className="flex-shrink-0">
          {/* Organization selector - desktop only */}
          {!isMobile && organizationOptions.length > 1 && (
            <Select
              placeholder={t('common.label.organization')}
              value={organization?.id}
              onChange={handleOrganizationChange}
              loading={loadingOrgLocs}
              style={{ width: 180 }}
              options={organizationOptions}
              disabled={loadingOrgLocs}
            />
          )}

          {/* Location selector - desktop only */}
          {!isMobile && currentLocations.length > 1 && (
            <Select
              placeholder={t('common.label.location')}
              value={location?.id}
              onChange={handleLocationChange}
              loading={loadingOrgLocs}
              style={{ width: 140 }}
              options={currentLocations}
              disabled={loadingOrgLocs}
            />
          )}

          {/* Search - mobile only (opens drawer) */}
          {isMobile && config.searchFilters && (
            <Button type="text" icon={<Search size={20} />} onClick={() => setShowSearch(true)} />
          )}

          {/* Notifications */}
          <Button
            type="text"
            className="flex items-center justify-center p-0"
            icon={
              <Badge
                count={unreadCount}
                size="small"
                offset={[6, 0]}
                style={{ verticalAlign: 'middle' }}
              >
                <Bell size={20} style={{ verticalAlign: 'middle' }} />
              </Badge>
            }
            onClick={() => setShowNotifications(true)}
          />


          {/* Settings */}
          <Button type="text" icon={<Settings size={20} />} onClick={() => setGlobalShowSettings(true)} />

          {/* Profile */}
          <ProfileMenu isMobile={isMobile} />
        </Space>
      </div>

      {isMobile && (
        <Drawer
          title={t('common.label.search')}
          onClose={() => setShowSearch(false)}
          open={showSearch}
          width={320}
        >
          {config.searchFilters}
        </Drawer>
      )}
    </AntHeader>
  );
};