import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Form, InputNumber, Space, Typography, ColorPicker, Input, Button, message, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageSelect } from '../LanguageSelect';
import { useSettings } from '@/core/hooks/useSettings';
import { useAuthStore } from '@/core/lib/store';
import { getTenantThemeConfig, updateTenantTheme, TenantThemeConfig } from '@/core/theme/ThemeRegistry';
import { supabase } from '@/lib/supabase';
import type { Organization, Location } from '@/core/lib/types';
import { Tabs } from 'antd';
import { Palette, Globe, Image as ImageIcon, Type, Sparkles, Upload as UploadIcon } from 'lucide-react';
import PublitioAPI from 'publitio_js_sdk';

const { Title, Text } = Typography;

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ open, onClose }) => {
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    fontSize,
    setFontSize,
    zoom,
    setZoom
  } = useSettings();

  const themeConfig = getTenantThemeConfig();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ light?: string; dark?: string }>({});

  const publitio = useMemo(() => new PublitioAPI('xr7tJHfDaqk5ov18TkJX', 'aApiZqz6Di1eacmemfof14xwN63lyJHG'), []);

  // Flattened form state for easier handling
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('general');

  // --- Org/Location Switching Logic (Shared with Header) ---
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
      console.group(`%c[Settings] Switch to ${selectedOrgData.organization_name}`, 'color: #1890ff');
      setIsSwitchingOrg(true);
      message.loading({ content: t('common.message.switching_to', { name: selectedOrgData.organization_name }), key: 'orgSwitch' });

      try {
        setOrganization({ id: selectedOrgData.organization_id, name: selectedOrgData.organization_name } as Organization);
        navigate('/dashboard');
        onClose(); // Close settings drawer on switch

        const newLocations = selectedOrgData.locations;
        let targetLocation: Location | null = null;
        if (newLocations.length > 0) {
          const stickyId = viewPreferences[user.id]?.['global']?.lastLocationByOrg?.[orgId];
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
        console.groupEnd();
      }
    }
  };

  const handleLocationChange = (locId: string) => {
    if (!organization?.id || !user?.id) return;
    const currentOrgLocs = userOrgLocations.find(o => o.organization_id === organization.id)?.locations || [];
    const selectedLoc = currentOrgLocs.find((loc: any) => loc.location_id === locId);

    if (selectedLoc) {
      setLocation({ id: selectedLoc.location_id, name: selectedLoc.location_name } as Location);
      setViewPreferences(user.id, 'global', {
        lastLocationByOrg: { ...(viewPreferences[user.id]?.['global']?.lastLocationByOrg || {}), [organization.id]: locId },
      });
      message.success(t('common.message.switched_to', { name: selectedLoc.location_name }));
    }
  };

  const organizationOptions = useMemo(() => userOrgLocations.map(org => ({
    value: org.organization_id,
    label: (<div><span className='font-medium'>{org.organization_name}</span><br /><span className='text-xs text-gray-500'>{org.roles?.join(', ')}</span></div>)
  })), [userOrgLocations]);

  const currentLocations = useMemo(() => {
    if (!organization?.id) return [];
    return userOrgLocations.find(o => o.organization_id === organization.id)?.locations.map((l: any) => ({
      value: l.location_id,
      label: l.location_name,
    })) || [];
  }, [organization?.id, userOrgLocations]);

  // --- Branding Logic ---
  useEffect(() => {
    if (open && themeConfig) {
      form.setFieldsValue({
        brandName: themeConfig.brandName,
        faviconUrl: themeConfig.faviconUrl,
        borderRadius: themeConfig.borderRadius || 8,
        light_primaryColor: themeConfig.light?.primaryColor || themeConfig.primaryColor,
        light_logoUrl: themeConfig.light?.logoUrl || themeConfig.logoUrl,
        light_cardBg: themeConfig.light?.cardBg || '#ffffff',
        light_layoutBg: themeConfig.light?.layoutBg || '#f0f2f5',
        light_headerBg: themeConfig.light?.headerBg || '#ffffff',
        light_siderBg: themeConfig.light?.siderBg || '#ffffff',
        dark_primaryColor: themeConfig.dark?.primaryColor || themeConfig.primaryColor,
        dark_logoUrl: themeConfig.dark?.logoUrl || themeConfig.logoUrl,
        dark_cardBg: themeConfig.dark?.cardBg || '#1f1f1f',
        dark_layoutBg: themeConfig.dark?.layoutBg || '#141414',
        dark_headerBg: themeConfig.dark?.headerBg || '#141414',
        dark_siderBg: themeConfig.dark?.siderBg || '#141414',
      });
    }
  }, [open, themeConfig, form]);
  const getColorString = (color: any) => {
    if (!color) return undefined;
    if (typeof color === 'string') return color;
    return color.toHexString?.() || color.hex || String(color);
  };

  const handleValuesChange = (_: any, allValues: any) => {
    // Optimistically update theme registry for immediate feedback
    const updatedConfig: Partial<TenantThemeConfig> = {
      brandName: allValues.brandName,
      faviconUrl: allValues.faviconUrl,
      borderRadius: allValues.borderRadius,
      primaryColor: getColorString(allValues.light_primaryColor),
      light: {
        primaryColor: getColorString(allValues.light_primaryColor),
        logoUrl: allValues.light_logoUrl,
        cardBg: getColorString(allValues.light_cardBg),
        layoutBg: getColorString(allValues.light_layoutBg),
        headerBg: getColorString(allValues.light_headerBg),
        siderBg: getColorString(allValues.light_siderBg),
      },
      dark: {
        primaryColor: getColorString(allValues.dark_primaryColor),
        logoUrl: allValues.dark_logoUrl,
        cardBg: getColorString(allValues.dark_cardBg),
        layoutBg: getColorString(allValues.dark_layoutBg),
        headerBg: getColorString(allValues.dark_headerBg),
        siderBg: getColorString(allValues.dark_siderBg),
      }
    };
    updateTenantTheme(updatedConfig);
  };

  const handleSaveBranding = async () => {
    if (!organization?.id) return;
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      const payload: Partial<TenantThemeConfig> = {
        ...themeConfig,
        brandName: values.brandName,
        faviconUrl: values.faviconUrl,
        borderRadius: values.borderRadius,
        primaryColor: getColorString(values.light_primaryColor),
        light: {
          primaryColor: getColorString(values.light_primaryColor),
          logoUrl: values.light_logoUrl,
          cardBg: getColorString(values.light_cardBg),
          layoutBg: getColorString(values.light_layoutBg),
          headerBg: getColorString(values.light_headerBg),
          siderBg: getColorString(values.light_siderBg),
        },
        dark: {
          primaryColor: getColorString(values.dark_primaryColor),
          logoUrl: values.dark_logoUrl,
          cardBg: getColorString(values.dark_cardBg),
          layoutBg: getColorString(values.dark_layoutBg),
          headerBg: getColorString(values.dark_headerBg),
          siderBg: getColorString(values.dark_siderBg),
        }
      };

      const { error } = await supabase
        .schema('identity')
        .from('organizations')
        .update({
          theme_config: payload
        })
        .eq('id', organization.id);

      if (error) throw error;
      message.success(t('core.settings.message.branding_saved'));
    } catch (error: any) {
      console.error('[Settings] Save error:', error);
      message.error(error.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  // Always show branding options for now as per user request
  const canEditBranding = true; // permissions?.organizations?.includes('update') || organization?.app_settings?.customization?.theme === "true";

  const handleLogoUpload = async (file: File, mode: 'light' | 'dark') => {
    setUploading(mode);
    setSelectedFiles(prev => ({ ...prev, [mode]: file.name }));
    try {
      const result = await publitio.uploadFile(file, 'file', { title: `logo-${mode}-${organization?.id}` });
      if (result.success === false) throw new Error(result.error?.message || 'Upload failed');

      const logoUrl = result.url_preview;
      form.setFieldValue(`${mode}_logoUrl`, logoUrl);

      // Trigger theme update
      handleValuesChange(null, form.getFieldsValue());
      message.success(`${mode} logo uploaded successfully!`);
      setSelectedFiles(prev => ({ ...prev, [mode]: undefined })); // Clear after success
    } catch (err: any) {
      console.error('Logo upload error:', err);
      message.error(`Failed to upload ${mode} logo: ${err.message}`);
      setSelectedFiles(prev => ({ ...prev, [mode]: undefined })); // Clear on error
    } finally {
      setUploading(null);
    }
  };

  return (
    <Drawer
      title={t('common.label.settings')}
      placement="right"
      onClose={onClose}
      open={open}
      width={350}
    >
      <div className="space-y-8">
        {/* Context Switching Section (Critical for Mobile) */}
        <div>
          <Title level={5}>{t('core.settings.label.context')}</Title>
          <Form layout="vertical">
            <Form.Item label={t('common.label.organization')}>
              <Select
                placeholder={t('common.label.organization')}
                value={organization?.id}
                onChange={handleOrganizationChange}
                loading={loadingOrgLocs}
                options={organizationOptions}
                disabled={loadingOrgLocs}
                className="w-full"
              />
            </Form.Item>
            {currentLocations.length > 0 && (
              <Form.Item label={t('common.label.location')}>
                <Select
                  placeholder={t('common.label.location')}
                  value={location?.id}
                  onChange={handleLocationChange}
                  loading={loadingOrgLocs}
                  options={currentLocations}
                  disabled={loadingOrgLocs}
                  className="w-full"
                />
              </Form.Item>
            )}
          </Form>
        </div>

        {/* Appearance Section */}
        <div>
          <Title level={5}>{t('core.settings.label.appearance')}</Title>
          <Space direction="vertical" className="w-full" size="middle">
            <div className="flex justify-between items-center">
              <Text>{t('core.settings.label.theme_mode')}</Text>
              <ThemeToggle />
            </div>
            <div className="flex justify-between items-center">
              <Text>{t('core.settings.label.language')}</Text>
              <LanguageSelect />
            </div>
          </Space>
        </div>

        {/* Theme Editing (Branding) Section */}
        {canEditBranding && (
          <div className="border-t border-b border-gray-100 py-6">
            <Title level={5} className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-amber-500" />
              {t('core.settings.label.theme_editing')}
            </Title>

            <Form
              layout="vertical"
              form={form}
              onValuesChange={handleValuesChange}
              size="small"
              className="px-1"
            >
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                className="theme-settings-tabs"
                items={[
                  {
                    key: 'general',
                    label: <span className="flex items-center gap-1"><Globe size={14} /> {t('core.settings.label.general')}</span>,
                    children: (
                      <div className="pt-4 space-y-4">
                        <Form.Item name="brandName" label={t('core.settings.label.brand_name')}>
                          <Input placeholder="e.g. Zoworks" prefix={<Type size={14} />} />
                        </Form.Item>
                        <Form.Item name="faviconUrl" label="Favicon URL">
                          <Input placeholder="https://..." prefix={< Globe size={14} />} />
                        </Form.Item>
                        <Form.Item name="borderRadius" label="Border Radius">
                          <InputNumber min={0} max={24} className="w-full" />
                        </Form.Item>
                      </div>
                    )
                  },
                  {
                    key: 'light',
                    label: <span className="flex items-center gap-1"><Palette size={14} /> {t('core.settings.label.light')}</span>,
                    children: (
                      <div className="pt-4 space-y-4">
                        <Form.Item name="light_primaryColor" label={t('core.settings.label.primary_color')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="light_cardBg" label={t('core.settings.label.card_bg')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="light_layoutBg" label={t('core.settings.label.layout_bg')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="light_headerBg" label={t('core.settings.label.header_bg')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="light_siderBg" label={t('core.settings.label.sider_bg')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="light_logoUrl" label={t('core.settings.label.logo')}>
                          <div className="space-y-2">
                            <Space.Compact className="w-full">
                              <Input placeholder="https://..." prefix={<ImageIcon size={14} />} className="flex-1" />
                              <input
                                type="file"
                                id="light-logo-upload"
                                hidden
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'light')}
                              />
                              <Button
                                icon={<UploadIcon size={14} />}
                                loading={uploading === 'light'}
                                onClick={() => document.getElementById('light-logo-upload')?.click()}
                              >
                                {t('common.action.upload')}
                              </Button>
                            </Space.Compact>
                            {selectedFiles.light && (
                              <Text type="secondary" className="text-xs block">
                                📎 {t('core.settings.message.uploading')} {selectedFiles.light}
                              </Text>
                            )}
                          </div>
                        </Form.Item>
                      </div>
                    )
                  },
                  {
                    key: 'dark',
                    label: <span className="flex items-center gap-1"><Palette size={14} /> {t('core.settings.label.dark')}</span>,
                    children: (
                      <div className="pt-4 space-y-4">
                        <Form.Item name="dark_primaryColor" label={t('core.settings.label.primary_color')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="dark_cardBg" label={t('core.settings.label.card_bg')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="dark_layoutBg" label={t('core.settings.label.layout_bg')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="dark_headerBg" label={t('core.settings.label.header_bg')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="dark_siderBg" label={t('core.settings.label.sider_bg')}>
                          <ColorPicker showText className="w-full" />
                        </Form.Item>
                        <Form.Item name="dark_logoUrl" label={t('core.settings.label.logo')}>
                          <div className="space-y-2">
                            <Space.Compact className="w-full">
                              <Input placeholder="https://..." prefix={<ImageIcon size={14} />} className="flex-1" />
                              <input
                                type="file"
                                id="dark-logo-upload"
                                hidden
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'dark')}
                              />
                              <Button
                                icon={<UploadIcon size={14} />}
                                loading={uploading === 'dark'}
                                onClick={() => document.getElementById('dark-logo-upload')?.click()}
                              >
                                {t('common.action.upload')}
                              </Button>
                            </Space.Compact>
                            {selectedFiles.dark && (
                              <Text type="secondary" className="text-xs block">
                                📎 {t('core.settings.message.uploading')} {selectedFiles.dark}
                              </Text>
                            )}
                          </div>
                        </Form.Item>
                      </div>
                    )
                  }
                ]}
              />

              <Button
                type="primary"
                onClick={handleSaveBranding}
                loading={saving}
                block
                className="mt-6 h-10 shadow-sm"
              >
                {t('core.settings.action.save_branding')}
              </Button>
            </Form>
          </div>
        )}

        {/* Accessibility Section */}
        <Form layout="vertical">
          <Title level={5}>{t('core.settings.label.accessibility')}</Title>
          <Form.Item label={t('core.settings.label.font_size')}>
            <InputNumber
              min={12}
              max={24}
              value={fontSize}
              onChange={(value) => setFontSize(value || 16)}
              formatter={(value) => `${value}px`}
              className="w-full"
            />
          </Form.Item>

          <Form.Item label={t('core.settings.label.zoom')}>
            <InputNumber
              min={50}
              max={200}
              value={zoom}
              onChange={(value) => setZoom(value || 100)}
              formatter={(value) => `${value}%`}
              className="w-full"
            />
          </Form.Item>
        </Form>
      </div>
    </Drawer>
  );
};