import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Form, InputNumber, Space, Typography, ColorPicker, Input, Button, message, Select, Modal, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageSelect } from '../LanguageSelect';
import { useAuthStore } from '@/core/lib/store';
import { getTenantThemeConfig, updateTenantTheme, TenantThemeConfig } from '@/core/theme/ThemeRegistry';
import { THEME_PRESETS, getPresetOptions } from '@/core/theme/presets';
import { supabase } from '@/lib/supabase';
import type { Organization, Location } from '@/core/lib/types';
import { Palette, Globe, Image as ImageIcon, Type, Sparkles, Upload as UploadIcon, Move } from 'lucide-react';
import PublitioAPI from 'publitio_js_sdk';

const { Title, Text } = Typography;

// Helper to extract hex string from ColorPicker value (can be Color object or string)
const getColorString = (value: any): string => {
  if (!value) return '#1890ff';
  if (typeof value === 'string') return value;
  if (typeof value?.toHexString === 'function') return value.toHexString();
  if (typeof value?.metaColor?.toHexString === 'function') return value.metaColor.toHexString();
  return '#1890ff';
};


interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ open, onClose }) => {
  const auth = useAuthStore();
  const user = auth.user;
  const organization = auth.organization;
  const location = auth.location;
  const setOrganization = auth.setOrganization;
  const setLocation = auth.setLocation;
  const viewPreferences = auth.viewPreferences;
  const setViewPreferences = auth.setViewPreferences;
  const setIsSwitchingOrg = auth.setIsSwitchingOrg;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      console.group(`% c[Settings] Switch to ${selectedOrgData.organization_name} `, 'color: #1890ff');
      setIsSwitchingOrg(true);
      message.loading({ content: t('common.message.switching_to', { name: selectedOrgData.organization_name }), key: 'orgSwitch' });

      try {
        setOrganization({ id: selectedOrgData.organization_id, name: selectedOrgData.organization_name } as Organization);
        navigate('/dashboard');
        onClose(); // Close settings drawer on switch

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
      setViewPreferences(user?.id || '', 'global', {
        lastLocationByOrg: { ...(viewPreferences[user?.id || '']?.['global']?.lastLocationByOrg || {}), [organization.id]: locId },
      });
      message.success(t('common.message.switched_to', { name: selectedLoc.location_name }));
    }
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

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Theme preset options from centralized helper
  const themePresetsOptions = useMemo(() => getPresetOptions(), []);

  // Handle reset to preset defaults
  const handleResetToPreset = () => {
    const currentPresetId = form.getFieldValue('preset') || themeConfig?.preset || 'base';
    const preset = THEME_PRESETS[currentPresetId];
    if (!preset) return;

    Modal.confirm({
      title: 'Reset to Preset Defaults?',
      content: `This will wipe all manual color overrides and restore the original ${currentPresetId} style.`,
      onOk: () => {
        const newValues = {
          borderRadius: preset.borderRadius || 8,
          baseFontSize: preset.baseFontSize || 14,
          containerPadding: preset.containerPadding || 24,
          // Use preset colors strictly, only fall back to system defaults, never to (potentially corrupted) current themeConfig
          light_primaryColor: preset.light?.primaryColor || '#1890ff',
          dark_primaryColor: preset.dark?.primaryColor || '#1890ff',
          light_secondaryColor: preset.light?.secondaryColor || preset.light?.primaryColor || '#1890ff',
          dark_secondaryColor: preset.dark?.secondaryColor || preset.dark?.primaryColor || '#1890ff',
          light_cardBg: preset.light?.cardBg || '#ffffff',
          light_layoutBg: preset.light?.layoutBg || '#f0f2f5',
          light_headerBg: preset.light?.headerBg || '#ffffff',
          light_siderBg: preset.light?.siderBg || '#ffffff',
          dark_cardBg: preset.dark?.cardBg || '#1f1f1f',
          dark_layoutBg: preset.dark?.layoutBg || '#141414',
          dark_headerBg: preset.dark?.headerBg || '#141414',
          dark_siderBg: preset.dark?.siderBg || '#141414',
        };
        form.setFieldsValue(newValues);
        // Explicitly pass newValues to ensure handleValuesChange doesn't use stale getFieldsValue()
        handleValuesChange(null, { ...form.getFieldsValue(true), ...newValues });
        message.success(`Reset to ${currentPresetId} defaults`);
      }
    } as any);
  };


  // --- Branding Logic ---
  // Priority: Database values (tenant customizations) > Preset defaults
  useEffect(() => {
    if (open && themeConfig) {
      // Preset is fallback only when database doesn't have custom values
      const preset = themeConfig.preset ? THEME_PRESETS[themeConfig.preset] : null;

      form.setFieldsValue({
        preset: themeConfig.preset,
        brandName: themeConfig.brandName,
        faviconUrl: themeConfig.faviconUrl,
        borderRadius: themeConfig.borderRadius || preset?.borderRadius || 8,
        // Database values WIN - preset is only fallback
        light_primaryColor: themeConfig.light?.primaryColor || themeConfig.primaryColor || preset?.light?.primaryColor,
        light_secondaryColor: themeConfig.light?.secondaryColor || themeConfig.secondaryColor || preset?.light?.secondaryColor,
        light_logoUrl: themeConfig.light?.logoUrl || themeConfig.logoUrl,
        light_cardBg: themeConfig.light?.cardBg || preset?.light?.cardBg || '#ffffff',
        light_layoutBg: themeConfig.light?.layoutBg || preset?.light?.layoutBg || '#f0f2f5',
        light_headerBg: themeConfig.light?.headerBg || preset?.light?.headerBg || '#ffffff',
        light_siderBg: themeConfig.light?.siderBg || preset?.light?.siderBg || '#ffffff',
        dark_primaryColor: themeConfig.dark?.primaryColor || themeConfig.primaryColor || preset?.dark?.primaryColor,
        dark_secondaryColor: themeConfig.dark?.secondaryColor || themeConfig.secondaryColor || preset?.dark?.secondaryColor,
        dark_logoUrl: themeConfig.dark?.logoUrl || themeConfig.logoUrl,
        dark_cardBg: themeConfig.dark?.cardBg || preset?.dark?.cardBg || '#1f1f1f',
        dark_layoutBg: themeConfig.dark?.layoutBg || preset?.dark?.layoutBg || '#141414',
        dark_headerBg: themeConfig.dark?.headerBg || preset?.dark?.headerBg || '#141414',
        dark_siderBg: themeConfig.dark?.siderBg || preset?.dark?.siderBg || '#141414',
        baseFontSize: themeConfig.baseFontSize || preset?.baseFontSize || 14,
        containerPadding: themeConfig.containerPadding || preset?.containerPadding || 24,
        defaultMode: themeConfig.defaultMode || 'light',
        allowUserDarkMode: themeConfig.allowUserDarkMode !== undefined ? themeConfig.allowUserDarkMode : true,
      });
    }
  }, [open, themeConfig, form]);

  const handleValuesChange = (_: any, allValues: any) => {
    // Merge provided changes with all current values (including unmounted fields via true)
    const currentValues = { ...form.getFieldsValue(true), ...allValues };

    const updatedConfig: Partial<TenantThemeConfig> = {
      preset: currentValues.preset,
      brandName: currentValues.brandName,
      faviconUrl: currentValues.faviconUrl,
      borderRadius: currentValues.borderRadius,
      primaryColor: getColorString(currentValues.light_primaryColor),
      secondaryColor: getColorString(currentValues.light_secondaryColor),
      light: {
        primaryColor: getColorString(currentValues.light_primaryColor),
        secondaryColor: getColorString(currentValues.light_secondaryColor),
        logoUrl: currentValues.light_logoUrl,
        cardBg: getColorString(currentValues.light_cardBg),
        layoutBg: getColorString(currentValues.light_layoutBg),
        headerBg: getColorString(currentValues.light_headerBg),
        siderBg: getColorString(currentValues.light_siderBg),
      },
      dark: {
        primaryColor: getColorString(currentValues.dark_primaryColor),
        secondaryColor: getColorString(currentValues.dark_secondaryColor),
        logoUrl: currentValues.dark_logoUrl,
        cardBg: getColorString(currentValues.dark_cardBg),
        layoutBg: getColorString(currentValues.dark_layoutBg),
        headerBg: getColorString(currentValues.dark_headerBg),
        siderBg: getColorString(currentValues.dark_siderBg),
      },
      baseFontSize: currentValues.baseFontSize,
      containerPadding: currentValues.containerPadding,
      defaultMode: currentValues.defaultMode,
      allowUserDarkMode: currentValues.allowUserDarkMode,
    };
    updateTenantTheme(updatedConfig);
  };

  const handleSaveBranding = async () => {
    if (!organization?.id) return;
    setSaving(true);
    try {
      // Use true to get all fields including unmounted ones (Inactive tabs/Advanced section)
      const values = form.getFieldsValue(true);
      const payload: Partial<TenantThemeConfig> = {
        ...themeConfig,
        preset: values.preset,
        brandName: values.brandName,
        faviconUrl: values.faviconUrl,
        borderRadius: values.borderRadius,
        primaryColor: getColorString(values.light_primaryColor),
        secondaryColor: getColorString(values.light_secondaryColor),
        light: {
          primaryColor: getColorString(values.light_primaryColor),
          secondaryColor: getColorString(values.light_secondaryColor),
          logoUrl: values.light_logoUrl,
          cardBg: getColorString(values.light_cardBg),
          layoutBg: getColorString(values.light_layoutBg),
          headerBg: getColorString(values.light_headerBg),
          siderBg: getColorString(values.light_siderBg),
        },
        dark: {
          primaryColor: getColorString(values.dark_primaryColor),
          secondaryColor: getColorString(values.dark_secondaryColor),
          logoUrl: values.dark_logoUrl,
          cardBg: getColorString(values.dark_cardBg),
          layoutBg: getColorString(values.dark_layoutBg),
          headerBg: getColorString(values.dark_headerBg),
          siderBg: getColorString(values.dark_siderBg),
        },
        baseFontSize: values.baseFontSize,
        containerPadding: values.containerPadding,
        defaultMode: values.defaultMode,
        allowUserDarkMode: values.allowUserDarkMode,
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

  // --- Logo Upload ---
  const handleLogoUpload = async (file: File, mode: 'light' | 'dark') => {
    setUploading(mode);
    setSelectedFiles(prev => ({ ...prev, [mode]: file.name }));
    try {
      const result = await publitio.uploadFile(file, 'file', { title: `logo - ${mode} -${organization?.id} ` });
      if (result.success === false) throw new Error(result.error?.message || 'Upload failed');
      const logoUrl = result.url_preview;
      form.setFieldValue(`${mode} _logoUrl`, logoUrl);
      handleValuesChange(null, form.getFieldsValue());
      message.success(`${mode} logo uploaded successfully!`);
      setSelectedFiles(prev => ({ ...prev, [mode]: undefined }));
    } catch (err: any) {
      console.error('Logo upload error:', err);
      message.error(`Failed to upload ${mode} logo: ${err.message} `);
      setSelectedFiles(prev => ({ ...prev, [mode]: undefined }));
    } finally {
      setUploading(null);
    }
  };

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
        {/* Context Switching Section */}
        <div className="bg-[var(--color-bg-secondary)] p-4 rounded-xl space-y-4">
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
          <div className="flex justify-between items-center mb-4">
            <Title level={5} className="m-0">{t('core.settings.label.appearance')}</Title>
            <ThemeToggle />
          </div>
          <Space direction="vertical" className="w-full" size="middle">
            <div className="flex justify-between items-center bg-[var(--color-bg-primary)] p-3 rounded-lg border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-[var(--color-text-secondary)]" />
                <Text>{t('core.settings.label.language')}</Text>
              </div>
              <LanguageSelect />
            </div>
          </Space>
        </div>

        {/* Theme Editing Section */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between mb-4 px-1">
            <Title level={5} className="flex items-center gap-2 m-0">
              <Sparkles size={18} className="text-[var(--color-warning)]" />
              {t('core.settings.label.theme_editing')}
            </Title>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-quaternary)] font-bold">Advanced</span>
              <ThemeToggle />
              <input
                type="checkbox"
                checked={showAdvanced}
                onChange={e => setShowAdvanced(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          <Form
            layout="vertical"
            form={form}
            onValuesChange={handleValuesChange}
            size="small"
            className="px-1"
            preserve={true}
          >
            <div className="flex gap-2 items-end">
              <Form.Item name="preset" label="Theme Style Preset" className="flex-1 mb-0">
                <Select
                  options={themePresetsOptions}
                  placeholder="Select a style..."
                  className="w-full h-9"
                />
              </Form.Item>
              <Button
                onClick={handleResetToPreset}
                icon={<Sparkles size={14} />}
                className="h-9 text-xs"
                title="Reset manual overrides to preset defaults"
              >
                Reset
              </Button>
            </div>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="line"
              className="theme-settings-tabs"
              items={[
                {
                  key: 'general',
                  label: <span className="flex items-center gap-1"><Type size={14} /> Brand</span>,
                  children: (
                    <div className="pt-4 space-y-4">
                      <Form.Item name="brandName" label={t('core.settings.label.brand_name')}>
                        <Input placeholder="e.g. Zoworks" prefix={<Type size={14} className="text-[var(--color-text-quaternary)]" />} />
                      </Form.Item>
                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="borderRadius" label="Rounding">
                          <InputNumber min={0} max={24} className="w-full" precision={0} />
                        </Form.Item>
                        <Form.Item
                          name="containerPadding"
                          label={<span className="flex items-center gap-1"><Move size={12} /> Padding</span>}
                        >
                          <InputNumber min={16} max={48} className="w-full" precision={0} />
                        </Form.Item>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="defaultMode" label="Default Mode">
                          <Select options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
                        </Form.Item>
                        <Form.Item name="allowUserDarkMode" label="User Toggle" valuePropName="checked">
                          <Select options={[{ value: true, label: 'Enabled' }, { value: false, label: 'Disabled' }]} />
                        </Form.Item>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="light_primaryColor" label="Primary (Light)">
                          <ColorPicker showText size="small" />
                        </Form.Item>
                        <Form.Item name="dark_primaryColor" label="Primary (Dark)">
                          <ColorPicker showText size="small" />
                        </Form.Item>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'typography',
                  label: <span className="flex items-center gap-1"><Type size={14} /> Typography</span>,
                  children: (
                    <div className="pt-4 space-y-4">
                      <Form.Item name="baseFontSize" label="Base Font Size (Zoom)">
                        <div className="space-y-2">
                          <InputNumber
                            min={12}
                            max={20}
                            className="w-full"
                            addonAfter="px"
                            precision={0}
                          />
                          <Text type="secondary" className="text-[11px] block italic leading-tight">
                            Increasing this will proportionally zoom the entire UI (typography, margins, and button heights).
                          </Text>
                        </div>
                      </Form.Item>
                    </div>
                  )
                },
                {
                  key: 'light',
                  label: <span className="flex items-center gap-1"><Palette size={14} /> Light Mode</span>,
                  children: (
                    <div className="pt-4 space-y-4">
                      <Form.Item name="light_logoUrl" label="Logo URL">
                        <div className="space-y-2">
                          <Space.Compact className="w-full">
                            <Input placeholder="https://..." prefix={<ImageIcon size={14} />} className="flex-1" />
                            <input
                              type="file"
                              id="light-logo-upload"
                              hidden
                              accept="image/*"
                              onChange={(e) => {
                                e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'light')
                              }}
                            />
                            <Button
                              icon={<UploadIcon size={14} />}
                              onClick={() => document.getElementById('light-logo-upload')?.click()}
                            />
                          </Space.Compact>
                        </div>
                      </Form.Item>

                      {showAdvanced && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <Form.Item name="light_secondaryColor" label="Secondary Color">
                            <ColorPicker showText size="small" />
                          </Form.Item>
                          <Form.Item name="light_cardBg" label="Card Background">
                            <ColorPicker showText size="small" />
                          </Form.Item>
                          <Form.Item name="light_layoutBg" label="Page Background">
                            <ColorPicker showText size="small" />
                          </Form.Item>
                          <Form.Item name="light_headerBg" label="Header Background">
                            <ColorPicker showText size="small" />
                          </Form.Item>
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'dark',
                  label: <span className="flex items-center gap-1"><Palette size={14} /> Dark Mode</span>,
                  children: (
                    <div className="pt-4 space-y-4">
                      <Form.Item name="dark_logoUrl" label="Logo URL">
                        <div className="space-y-2">
                          <Space.Compact className="w-full">
                            <Input placeholder="https://..." prefix={<ImageIcon size={14} />} className="flex-1" />
                            <input
                              type="file"
                              id="dark-logo-upload"
                              hidden
                              accept="image/*"
                              onChange={(e) => {
                                e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'dark')
                              }}
                            />
                            <Button
                              icon={<UploadIcon size={14} />}
                              onClick={() => document.getElementById('dark-logo-upload')?.click()}
                            />
                          </Space.Compact>
                        </div>
                      </Form.Item>

                      {showAdvanced && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <Form.Item name="dark_secondaryColor" label="Secondary Color">
                            <ColorPicker showText size="small" />
                          </Form.Item>
                          <Form.Item name="dark_cardBg" label="Card Background">
                            <ColorPicker showText size="small" />
                          </Form.Item>
                          <Form.Item name="dark_layoutBg" label="Page Background">
                            <ColorPicker showText size="small" />
                          </Form.Item>
                          <Form.Item name="dark_headerBg" label="Header Background">
                            <ColorPicker showText size="small" />
                          </Form.Item>
                        </div>
                      )}
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
              className="mt-6 h-10 shadow-sm font-semibold"
            >
              Update Brand Identity
            </Button>
          </Form>
        </div>

        {/* Accessibility Section */}
        <div className="border-t border-gray-100 pt-6 pb-12">
          <Title level={5} className="mb-4">{t('core.settings.label.accessibility')}</Title>
          <div className="bg-[var(--color-warning-bg)] rounded-lg p-3 border border-[var(--color-warning-border)] mb-4">
            <Text className="text-xs leading-tight block text-[var(--color-warning)]">
              Global typography and zoom are now managed at the <strong>Tenant Level</strong> in the Brand tab above to ensure consistency for all users.
            </Text>
          </div>
          <Space direction="vertical" className="w-full" size="middle">
            <div className="flex justify-between items-center bg-[var(--color-bg-primary)] p-3 rounded-lg border border-[var(--color-border)] shadow-sm opacity-50 grayscale">
              <div className="flex items-center gap-2">
                <Type size={16} className="text-[var(--color-text-secondary)]" />
                <Text>Per-User Scaling (Disabled)</Text>
              </div>
            </div>
          </Space>
        </div>
      </div>
    </Drawer>
  );
};