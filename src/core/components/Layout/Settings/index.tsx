import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Form, Space, Typography, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageSelect } from '../LanguageSelect';
import { useAuthStore } from '@/core/lib/store';
import { supabase } from '@/lib/supabase';
import type { Organization, Location } from '@/core/lib/types';
import { Globe, Grid, Type, ZoomIn } from 'lucide-react';
import { applyAccessibility } from '@/core/theme/ThemeRegistry';

const { Title, Text } = Typography;
const { Option } = Select;

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

/**
 * User Settings Drawer
 * Contains personal preferences only:
 * - Organization/Location switching  
 * - Language selection
 * - Light/Dark mode toggle
 * - Mobile navigation preferences
 * 
 * Admin-level theme customization (colors, logos, presets) has been moved to:
 * Admin > Settings > Branding tab
 */
export const Settings: React.FC<SettingsProps> = ({ open, onClose }) => {
  const auth = useAuthStore();
  const user = auth.user;
  const organization = auth.organization;
  const location = auth.location;
  const navigationItems = auth.navigationItems;
  const setOrganization = auth.setOrganization;
  const setLocation = auth.setLocation;
  const viewPreferences = auth.viewPreferences;
  const setViewPreferences = auth.setViewPreferences;
  const setIsSwitchingOrg = auth.setIsSwitchingOrg;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Org/Location Switching Logic ---
  const [userOrgLocations, setUserOrgLocations] = useState<any[]>([]);
  const [loadingOrgLocs, setLoadingOrgLocs] = useState(false);

  useEffect(() => {
    const fetchOrgAndLocations = async () => {
      if (!user?.id || !open) return;
      setLoadingOrgLocs(true);
      try {
        const { data, error } = await supabase.schema('identity').rpc('get_my_organizations');
        if (error) throw error;
        setUserOrgLocations(data as any[]);
      } catch (error) {
        console.error('[Settings] Error fetching orgs:', error);
      } finally {
        setLoadingOrgLocs(false);
      }
    };
    fetchOrgAndLocations();
  }, [user?.id, open]);

  const handleOrganizationChange = async (orgId: string) => {
    const selectedOrgData = userOrgLocations.find(org => org.organization_id === orgId);
    if (selectedOrgData && user?.id) {
      setIsSwitchingOrg(true);
      message.loading({ content: t('common.message.switching_to', { name: selectedOrgData.organization_name }), key: 'orgSwitch' });

      try {
        setOrganization({ id: selectedOrgData.organization_id, name: selectedOrgData.organization_name } as Organization);
        navigate('/dashboard');
        onClose();

        const newLocations = selectedOrgData.locations;
        let targetLocation: Location | null = null;
        if (newLocations.length > 0) {
          const stickyId = viewPreferences[user?.id || '']?.['global']?.lastLocationByOrg?.[orgId];
          const stickyLoc = newLocations.find((l: any) => l.location_id === stickyId);
          const locData = stickyLoc || newLocations[0];
          targetLocation = { id: locData.location_id, name: locData.location_name } as Location;
        }
        setLocation(targetLocation);

        await supabase.schema('identity').rpc('set_preferred_organization', { new_org_id: orgId });
        await supabase.auth.updateUser({ data: { org_id: orgId } });
        await queryClient.invalidateQueries({ queryKey: ['user-session'] });

        message.success({ content: t('common.message.switched_to', { name: selectedOrgData.organization_name }), key: 'orgSwitch', duration: 2 });
      } catch (err) {
        console.error("[Settings] Org switch error:", err);
        message.error({ content: t('common.message.failed_to_switch'), key: 'orgSwitch', duration: 2 });
      } finally {
        setIsSwitchingOrg(false);
      }
    }
  };

  const handleLocationChange = (locId: string) => {
    if (!organization?.id || !user?.id) return;
    const currentOrgLocs = userOrgLocations.find(o => o.organization_id === organization.id)?.locations || [];
    const selectedLoc = currentOrgLocs.find((loc: any) => loc.location_id === locId);

    if (selectedLoc) {
      setLocation({ id: selectedLoc.location_id, name: selectedLoc.location_name } as Location);
      setViewPreferences(user?.id || '', 'global', {
        lastLocationByOrg: { ...(viewPreferences[user?.id || '']?.['global']?.lastLocationByOrg || {}), [organization.id]: locId },
      });
      message.success(t('common.message.switched_to', { name: selectedLoc.location_name }));
    }
  };

  // --- Accessibility Handlers ---
  const handleAccessibilityChange = (prefs: any) => {
    auth.setAccessibilityPreferences(prefs);
    applyAccessibility({
      baseFontSize: prefs.baseFontSize ?? auth.accessibilityPreferences.baseFontSize,
      viewportZoom: prefs.viewportZoom ?? auth.accessibilityPreferences.viewportZoom,
    });
  };

  const organizationOptions = useMemo(() => userOrgLocations.map(org => ({
    value: org.organization_id,
    label: (<div><span className='font-medium'>{org.organization_name}</span><br /><span className='text-xs text-[var(--color-text-secondary)]'>{org.roles?.join(', ')}</span></div>)
  })), [userOrgLocations]);

  const currentLocations = useMemo(() => {
    if (!organization?.id) return [];
    return userOrgLocations.find(o => o.organization_id === organization.id)?.locations.map((l: any) => ({
      value: l.location_id,
      label: l.location_name,
    })) || [];
  }, [organization?.id, userOrgLocations]);

  return (
    <Drawer
      title={<div className="flex items-center gap-2"><Globe size={20} className="text-primary" /> {t('common.label.settings')}</div>}
      placement="right"
      onClose={onClose}
      open={open}
      width={380}
      className="settings-drawer"
    >
      <div className="space-y-8">
        {/* Context Switching Section - HIDDEN ON DESKTOP */}
        <div className="bg-[var(--color-bg-secondary)] p-4 rounded-xl space-y-4 lg:hidden">
          <Title level={5} className="m-0 text-[var(--color-text-primary)]">{t('core.settings.label.context')}</Title>
          <Form layout="vertical" size="middle">
            <Form.Item label={t('common.label.organization')} className="mb-3">
              <Select
                value={organization?.id}
                onChange={handleOrganizationChange}
                loading={loadingOrgLocs}
                options={organizationOptions}
                className="w-full"
              />
            </Form.Item>
            {currentLocations.length > 0 && (
              <Form.Item label={t('common.label.location')} className="mb-0">
                <Select
                  value={location?.id}
                  onChange={handleLocationChange}
                  loading={loadingOrgLocs}
                  options={currentLocations}
                  className="w-full"
                />
              </Form.Item>
            )}
          </Form>
        </div>

        {/* Appearance Section */}
        <div className="px-1">
          <div className="flex justify-between items-center mb-6">
            <Title level={5} className="m-0 tracking-tight">{t('core.settings.label.appearance')}</Title>
            <ThemeToggle />
          </div>
          <div className="flex justify-between items-center py-1">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-[var(--color-text-secondary)]" />
              <Text className="font-medium text-[var(--color-text-primary)]">{t('core.settings.label.language')}</Text>
            </div>
            <LanguageSelect className="w-[120px] custom-select-flat" />
          </div>
        </div>

        {/* Accessibility Section */}
        <div className="px-1 border-t border-[var(--color-border)] pt-8">
          <Title level={5} className="mb-6 flex items-center gap-2 tracking-tight">
            <Type size={20} className="text-[var(--color-primary)]" />
            Accessibility
          </Title>
          <Space direction="vertical" className="w-full" size="large">
            {/* Viewport Zoom */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ZoomIn size={16} className="text-[var(--color-text-secondary)]" />
                  <Text>Interface Scale</Text>
                </div>
                <Text className="font-mono text-xs">{auth.accessibilityPreferences.viewportZoom}%</Text>
              </div>
              <Select
                value={auth.accessibilityPreferences.viewportZoom}
                onChange={(val) => handleAccessibilityChange({ viewportZoom: val })}
                className="w-full custom-select-flat"
              >
                <Option value={80}>80% (Compact)</Option>
                <Option value={90}>90%</Option>
                <Option value={100}>100% (Standard)</Option>
                <Option value={110}>110%</Option>
                <Option value={120}>120% (Large)</Option>
              </Select>
            </div>

            {/* Base Font Size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Type size={16} className="text-[var(--color-text-secondary)]" />
                  <Text>Base Font Size</Text>
                </div>
                <Text className="font-mono text-xs">{auth.accessibilityPreferences.baseFontSize}px</Text>
              </div>
              <Select
                value={auth.accessibilityPreferences.baseFontSize}
                onChange={(val) => handleAccessibilityChange({ baseFontSize: val })}
                className="w-full custom-select-flat"
              >
                <Option value={12}>12px (Small)</Option>
                <Option value={13}>13px</Option>
                <Option value={14}>14px (Standard)</Option>
                <Option value={15}>15px</Option>
                <Option value={16}>16px (Medium)</Option>
                <Option value={18}>18px</Option>
                <Option value={20}>20px (Large)</Option>
              </Select>
            </div>
          </Space>
        </div>

        {/* Mobile Settings Section */}
        <div className="border-t border-[var(--color-border)] pt-8">
          <Title level={5} className="mb-6 flex items-center gap-2 tracking-tight">
            <Grid size={20} className="text-[var(--color-primary)]" />
            Mobile Navigation
          </Title>
          <div className="space-y-6">
            <div className="flex justify-between items-center py-1">
              <Text className="font-medium text-[var(--color-text-primary)]">Show Bottom Navigation</Text>
              <input
                type="checkbox"
                checked={auth.mobilePreferences?.bottomNavEnabled ?? true}
                onChange={e => auth.setMobilePreferences({ bottomNavEnabled: e.target.checked })}
                className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-transparent cursor-pointer"
              />
            </div>
            {auth.mobilePreferences?.bottomNavEnabled && (
              <div className="pt-2">
                <Text className="text-xs text-[var(--color-text-secondary)] block mb-3 font-medium uppercase tracking-wider">
                  Select up to 5 items for the bottom tab bar
                </Text>
                <Select
                  mode="multiple"
                  maxCount={5}
                  value={auth.mobilePreferences?.bottomNavItems || []}
                  onChange={(keys) => auth.setMobilePreferences({ bottomNavItems: keys })}
                  placeholder="Auto (first 5 items)"
                  className="w-full custom-select-flat"
                  options={navigationItems.reduce((acc: any[], item) => {
                    if (item.children) {
                      return [...acc, ...item.children.map((child: any) => ({
                        value: child.key,
                        label: typeof child.label === 'string' ? child.label : child.key.split('/').pop(),
                      }))];
                    }
                    return [...acc, {
                      value: item.key,
                      label: typeof item.label === 'string' ? item.label : item.key.split('/').pop(),
                    }];
                  }, [])}
                  allowClear
                />
              </div>
            )}
          </div>
        </div>

        {/* Admin Info Notice */}
        <div className="border-t border-[var(--color-border)] pt-6 pb-12">
          <div className="bg-[var(--color-info-bg)] rounded-lg p-3 border border-[var(--color-info-border)]">
            <Text className="text-xs leading-tight block text-[var(--color-info)]">
              🎨 <strong>Looking for theme customization?</strong><br />
              Theme colors, logos, and branding settings are now managed by administrators in <strong>Admin → Settings → Branding</strong>.
            </Text>
          </div>
        </div>
      </div>
    </Drawer>
  );
};