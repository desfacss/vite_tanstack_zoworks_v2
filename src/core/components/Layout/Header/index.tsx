import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Button, Drawer, Select, message, Dropdown } from 'antd';
import { Menu, Search, Settings, Bell, Building, ChevronDown } from 'lucide-react';
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
  isMobile: boolean;
  unreadCount: number;
  setShowNotifications: (show: boolean) => void;
  setShowMobileMenu: (show: boolean) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
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

  const organizationOptions = useMemo(() => userOrgLocations
    .sort((a, b) => a.organization_name.localeCompare(b.organization_name))
    .map(org => ({
    value: org.organization_id,
    label: (
      <div>
        <span className='font-medium'>{org.organization_name}</span>
        <br />
        <span className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>{org.roles?.join(', ')}</span>
      </div>
    )
  })), [userOrgLocations]);

  const currentLocations = useMemo(() => {
    if (!organization?.id) return [];
    const locs = userOrgLocations.find(o => o.organization_id === organization.id)?.locations || [];
    return locs
      .sort((a, b) => a.location_name.localeCompare(b.location_name))
      .map(l => ({
        value: l.location_id,
        label: l.location_name,
      }));
  }, [organization?.id, userOrgLocations]);

  const isFetchingSession = useIsFetching({ queryKey: ['user-session'] }) > 0;
  useEffect(() => {
    if (!isFetchingSession) setIsSwitchingOrg(false);
  }, [isFetchingSession, setIsSwitchingOrg]);

  return (
    <AntHeader
      className="sticky top-0 z-50 bg-[var(--color-background)] border-b border-[var(--color-border)] header-responsive-padding"
      style={{
        height: 'var(--header-height)',
        width: '100%',
      }}
    >
      <div className="flex justify-between items-center h-full">

        {/* Left side: Hamburger (mobile only) + Page Title */}
        <div className="flex items-center gap-2 shrink-0 overflow-hidden min-w-0">
          {/* Hamburger menu - mobile only (desktop uses sidebar toggle) */}
          {isMobile && (
            <Button
              type="text"
              icon={<Menu size={20} />}
              onClick={() => setShowMobileMenu(true)}
              className="header-icon-btn edge-left"
            />
          )}

          {/* Page title - shows when sidebar is not visible (small screens < 1024px) */}
          {pageTitle && (
            <span className="text-base font-semibold whitespace-nowrap truncate max-w-[160px]">
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


        {/* Right side: Properly grouped containers */}
        <div className="flex items-center gap-0 md:gap-4 flex-shrink-0">

          {/* Group 1: Organization Switcher (desktop only) */}
          {!isMobile && organizationOptions.length > 1 && (
            <Dropdown
              menu={{
                items: userOrgLocations.map(org => ({
                  key: org.organization_id,
                  label: (
                    <div className="flex items-center gap-3 py-1">
                      <div className="org-switcher-icon">
                        <Building size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold">{org.organization_name}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                          {org.roles?.join(', ')}
                        </span>
                      </div>
                    </div>
                  ),
                  onClick: () => handleOrganizationChange(org.organization_id),
                })),
              }}
              trigger={['click']}
              placement="bottomLeft"
            >
              <div className="org-switcher">
                <div className="org-switcher-icon">
                  <Building size={18} />
                </div>
                <div className="org-switcher-text">
                  <span className="org-switcher-name">{organization?.name || 'Select Org'}</span>
                  {currentLocations.length > 1 && (
                    <span className="org-switcher-type">{location?.name || 'Location'}</span>
                  )}
                </div>
                <ChevronDown size={16} className="org-switcher-arrow" />
              </div>
            </Dropdown>
          )}

          {/* Separator between org/loc and icons */}
          <div className="header-divider" />

          {/* Group 2: Icon Buttons - Styled with backgrounds */}
          <div className="header-icon-group">
            {/* Search - mobile only */}
            {isMobile && config.searchFilters && (
              <Button type="text" icon={<Search size={20} />} onClick={() => setShowSearch(true)} className="header-icon-styled" />
            )}
            {/* Notifications - count badge at top-right corner */}
            <Button
              type="text"
              onClick={() => setShowNotifications(true)}
              className="header-icon-styled"
              style={{ position: 'relative' }}
            >
              <Bell size={20} style={{ color: 'var(--color-text-secondary)' }} />
              {(unreadCount || 3) > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px'
                }}>
                  {(unreadCount || 3) > 99 ? '99+' : (unreadCount || 3)}
                </span>
              )}
            </Button>
            {/* Settings - with activity indicator */}
            <Button
              type="text"
              onClick={() => setGlobalShowSettings(true)}
              className="header-icon-styled has-activity"
            >
              <Settings size={20} style={{ color: 'var(--color-text-secondary)' }} />
            </Button>
          </div>

          {/* Separator between icons and profile */}
          <div className="header-divider" />

          {/* Group 3: Profile */}
          <div className="edge-right">
            <ProfileMenu />
          </div>
        </div>
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