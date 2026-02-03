import React, { useState, useEffect, useMemo } from 'react';
import { Form, InputNumber, Space, Typography, ColorPicker, Input, Button, message, Select, Modal, Tabs, Card } from 'antd';
import { useTranslation } from 'react-i18next';
import { getTenantThemeConfig, updateTenantTheme, TenantThemeConfig } from '@/core/theme/ThemeRegistry';
import { THEME_PRESETS, getPresetOptions } from '@/core/theme/presets';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { DEFAULT_PRIMARY_COLOR } from '@/core/theme/ThemeRegistry';
import { Palette, ImageIcon, Upload as UploadIcon, Type, Sparkles, Grid, Move, RefreshCw } from 'lucide-react';
import PublitioAPI from 'publitio_js_sdk';
import { ThemeToggle } from '@/core/components/Layout/ThemeToggle';

const { Title, Text } = Typography;

// Helper to extract hex string from ColorPicker value
const getColorString = (value: any): string => {
    if (!value) return DEFAULT_PRIMARY_COLOR;
    if (typeof value === 'string') return value;
    if (typeof value?.toHexString === 'function') return value.toHexString();
    if (typeof value?.metaColor?.toHexString === 'function') return value.metaColor.toHexString();
    return DEFAULT_PRIMARY_COLOR;
};

/**
 * Admin-only Branding Configuration Page
 * Allows SassAdmin/Superadmin to configure organization theme settings
 */
const Branding: React.FC = () => {
    const { organization } = useAuthStore();
    const { t } = useTranslation();
    const themeConfig = getTenantThemeConfig();

    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<'light' | 'dark' | null>(null);
    const [activeTab, setActiveTab] = useState('brand');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const publitio = useMemo(() => new PublitioAPI(
        import.meta.env.VITE_PUBLITIO_API_KEY,
        import.meta.env.VITE_PUBLITIO_API_SECRET
    ), []);

    const themePresetsOptions = useMemo(() => getPresetOptions(), []);

    // Initialize form with current theme config
    useEffect(() => {
        if (themeConfig) {
            const preset = themeConfig.preset ? THEME_PRESETS[themeConfig.preset] : null;

            form.setFieldsValue({
                preset: themeConfig.preset,
                brandName: themeConfig.brandName,
                faviconUrl: themeConfig.faviconUrl,
                borderRadius: themeConfig.borderRadius || preset?.borderRadius || 8,
                light_primaryColor: themeConfig.light?.primaryColor || themeConfig.primaryColor || preset?.light?.primaryColor,
                light_secondaryColor: themeConfig.light?.secondaryColor || themeConfig.secondaryColor || preset?.light?.secondaryColor,
                light_logoUrl: themeConfig.light?.logoUrl || themeConfig.logoUrl,
                light_logoIconUrl: themeConfig.light?.logoIconUrl || themeConfig.logoIconUrl,
                light_cardBg: themeConfig.light?.cardBg || preset?.light?.cardBg || '#ffffff',
                light_layoutBg: themeConfig.light?.layoutBg || preset?.light?.layoutBg || '#f0f2f5',
                light_headerBg: themeConfig.light?.headerBg || preset?.light?.headerBg || '#ffffff',
                light_siderBg: themeConfig.light?.siderBg || preset?.light?.siderBg || '#ffffff',
                dark_primaryColor: themeConfig.dark?.primaryColor || themeConfig.primaryColor || preset?.dark?.primaryColor,
                dark_secondaryColor: themeConfig.dark?.secondaryColor || themeConfig.secondaryColor || preset?.dark?.secondaryColor,
                dark_logoUrl: themeConfig.dark?.logoUrl || themeConfig.logoUrl,
                dark_logoIconUrl: themeConfig.dark?.logoIconUrl || themeConfig.logoIconUrl,
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
    }, [themeConfig, form]);

    // Live preview on value change
    const handleValuesChange = (_: any, allValues: any) => {
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
                logoIconUrl: currentValues.light_logoIconUrl,
                cardBg: getColorString(currentValues.light_cardBg),
                layoutBg: getColorString(currentValues.light_layoutBg),
                headerBg: getColorString(currentValues.light_headerBg),
                siderBg: getColorString(currentValues.light_siderBg),
            },
            dark: {
                primaryColor: getColorString(currentValues.dark_primaryColor),
                secondaryColor: getColorString(currentValues.dark_secondaryColor),
                logoUrl: currentValues.dark_logoUrl,
                logoIconUrl: currentValues.dark_logoIconUrl,
                cardBg: getColorString(currentValues.dark_cardBg),
                layoutBg: getColorString(currentValues.dark_layoutBg),
                headerBg: getColorString(currentValues.dark_headerBg),
                siderBg: getColorString(currentValues.dark_siderBg),
            },
            baseFontSize: currentValues.baseFontSize,
            containerPadding: currentValues.containerPadding,
            defaultMode: currentValues.defaultMode,
            allowUserDarkMode: currentValues.allowUserDarkMode,
            // Layout Flags
            heroHeader: currentValues.heroHeader,
            compactMode: currentValues.compactMode,
            fontFamily: currentValues.fontFamily,
            headingFontFamily: currentValues.headingFontFamily,
        };
        updateTenantTheme(updatedConfig);
    };

    // Reset to preset defaults
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
                    light_primaryColor: preset.light?.primaryColor || DEFAULT_PRIMARY_COLOR,
                    dark_primaryColor: preset.dark?.primaryColor || DEFAULT_PRIMARY_COLOR,
                    light_secondaryColor: preset.light?.secondaryColor || preset.light?.primaryColor || DEFAULT_PRIMARY_COLOR,
                    dark_secondaryColor: preset.dark?.secondaryColor || preset.dark?.primaryColor || DEFAULT_PRIMARY_COLOR,
                    light_logoUrl: preset.light?.logoUrl || '',
                    dark_logoUrl: preset.dark?.logoUrl || '',
                    light_logoIconUrl: preset.light?.logoIconUrl || '',
                    dark_logoIconUrl: preset.dark?.logoIconUrl || '',
                    light_cardBg: preset.light?.cardBg || '#ffffff',
                    light_layoutBg: preset.light?.layoutBg || '#f0f2f5',
                    light_headerBg: preset.light?.headerBg || '#ffffff',
                    light_siderBg: preset.light?.siderBg || '#ffffff',
                    dark_cardBg: preset.dark?.cardBg || '#1f1f1f',
                    dark_layoutBg: preset.dark?.layoutBg || '#141414',
                    dark_headerBg: preset.dark?.headerBg || '#141414',
                    dark_siderBg: preset.dark?.siderBg || '#141414',
                    // Optional flags - explicitly reset to preset or default
                    heroHeader: preset.heroHeader || false,
                    compactMode: preset.compactMode || false,
                    fontFamily: preset.fontFamily || undefined,
                    headingFontFamily: preset.headingFontFamily || undefined,
                };
                form.setFieldsValue(newValues);
                handleValuesChange(null, { ...form.getFieldsValue(true), ...newValues });
                message.success(`Reset to ${currentPresetId} defaults`);
            }
        } as any);
    };

    // Save to database
    const handleSaveBranding = async () => {
        if (!organization?.id) return;
        setSaving(true);
        try {
            const values = form.getFieldsValue(true);
            const payload: Partial<TenantThemeConfig> = {
                // DO NOT spread old themeConfig - leads to stale flags like heroHeader sticking around
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
                    logoIconUrl: values.light_logoIconUrl,
                    cardBg: getColorString(values.light_cardBg),
                    layoutBg: getColorString(values.light_layoutBg),
                    headerBg: getColorString(values.light_headerBg),
                    siderBg: getColorString(values.light_siderBg),
                },
                dark: {
                    primaryColor: getColorString(values.dark_primaryColor),
                    secondaryColor: getColorString(values.dark_secondaryColor),
                    logoUrl: values.dark_logoUrl,
                    logoIconUrl: values.dark_logoIconUrl,
                    cardBg: getColorString(values.dark_cardBg),
                    layoutBg: getColorString(values.dark_layoutBg),
                    headerBg: getColorString(values.dark_headerBg),
                    siderBg: getColorString(values.dark_siderBg),
                },
                baseFontSize: values.baseFontSize,
                containerPadding: values.containerPadding,
                defaultMode: values.defaultMode,
                allowUserDarkMode: values.allowUserDarkMode,
                // Layout Flags
                heroHeader: values.heroHeader,
                compactMode: values.compactMode,
                fontFamily: values.fontFamily,
                headingFontFamily: values.headingFontFamily,
            };

            const { error } = await supabase
                .schema('identity')
                .from('organizations')
                .update({ theme_config: payload })
                .eq('id', organization.id);

            if (error) throw error;
            message.success(t('core.settings.message.branding_saved'));
        } catch (error: any) {
            console.error('[Branding] Save error:', error);
            message.error(error.message || 'Failed to save branding');
        } finally {
            setSaving(false);
        }
    };

    // Logo upload
    const handleLogoUpload = async (file: File, mode: 'light' | 'dark', type: 'logo' | 'icon' = 'logo') => {
        const fieldName = `${mode}_${type === 'logo' ? 'logoUrl' : 'logoIconUrl'}`;
        setUploading(mode);
        const hide = message.loading(`Uploading ${type} to Publitio...`, 0);
        try {
            const result = await publitio.uploadFile(file, 'file', {
                title: `${type} - ${mode} - ${organization?.name || 'unknown'}`,
                public_id: `branding_${organization?.id}_${mode}_${type}_${Date.now()}`
            });

            if (result.success === false) {
                throw new Error(result.error?.message || 'Publitio upload failed');
            }

            const publicUrl = result.url_preview;
            form.setFieldsValue({ [fieldName]: publicUrl });
            handleValuesChange(null, form.getFieldsValue(true));
            message.success(`${type} uploaded successfully!`);
        } catch (error: any) {
            console.error('[Branding] Upload error:', error);
            message.error(`Failed to upload ${type}: ` + error.message);
        } finally {
            hide();
            setUploading(null);
        }
    };

    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Title level={4} className="m-0 flex items-center gap-2">
                        <Sparkles size={20} className="text-[var(--color-warning)]" />
                        Organization Branding
                    </Title>
                    <Text type="secondary">Configure theme, colors, and logos for all users in this organization</Text>
                </div>
                <div className="flex items-center gap-3">
                    <Text type="secondary" className="text-xs">Preview Mode:</Text>
                    <ThemeToggle />
                </div>
            </div>

            <Card>
                <Form
                    layout="vertical"
                    form={form}
                    onValuesChange={handleValuesChange}
                    size="middle"
                    preserve={true}
                >
                    {/* Preset Selection */}
                    <div className="flex gap-3 items-end mb-6">
                        <Form.Item name="preset" label="Theme Style Preset" className="flex-1 mb-0">
                            <Select
                                options={themePresetsOptions}
                                placeholder="Select a style..."
                                className="w-full"
                            />
                        </Form.Item>
                        <Button
                            onClick={handleResetToPreset}
                            icon={<RefreshCw size={14} />}
                            title="Reset manual overrides to preset defaults"
                        >
                            Reset to Preset
                        </Button>
                    </div>

                    {/* Advanced Toggle */}
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="advanced-toggle"
                            checked={showAdvanced}
                            onChange={e => setShowAdvanced(e.target.checked)}
                            className="w-4 h-4 rounded"
                        />
                        <label htmlFor="advanced-toggle" className="text-sm text-[var(--color-text-secondary)] cursor-pointer">
                            Show Advanced Color Options
                        </label>
                    </div>

                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        type="card"
                        items={[
                            {
                                key: 'brand',
                                label: <span className="flex items-center gap-1"><Type size={14} /> Brand</span>,
                                children: (
                                    <div className="pt-4 space-y-6">
                                        <Form.Item name="brandName" label="Brand Name">
                                            <Input placeholder="e.g. Zoworks" prefix={<Type size={14} className="text-[var(--color-text-quaternary)]" />} />
                                        </Form.Item>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <Form.Item name="borderRadius" label="Border Rounding">
                                                <InputNumber min={0} max={24} className="w-full" precision={0} addonAfter="px" />
                                            </Form.Item>
                                            <Form.Item name="containerPadding" label={<span className="flex items-center gap-1"><Move size={12} /> Padding</span>}>
                                                <InputNumber min={16} max={48} className="w-full" precision={0} addonAfter="px" />
                                            </Form.Item>
                                            <Form.Item name="defaultMode" label="Default Mode">
                                                <Select options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
                                            </Form.Item>
                                            <Form.Item name="allowUserDarkMode" label="Allow User Toggle">
                                                <Select options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} />
                                            </Form.Item>
                                        </div>

                                        <Form.Item name="baseFontSize" label="Base Font Size (UI Zoom)">
                                            <div className="space-y-2">
                                                <InputNumber min={12} max={20} className="w-32" addonAfter="px" precision={0} />
                                                <Text type="secondary" className="text-xs block">
                                                    Proportionally scales all UI elements (typography, margins, buttons)
                                                </Text>
                                            </div>
                                        </Form.Item>
                                    </div>
                                )
                            },
                            {
                                key: 'colors',
                                label: <span className="flex items-center gap-1"><Palette size={14} /> Colors</span>,
                                children: (
                                    <div className="pt-4 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <Title level={5} className="m-0">Light Mode</Title>
                                                <Form.Item name="light_primaryColor" label="Primary Color">
                                                    <ColorPicker showText />
                                                </Form.Item>
                                                {showAdvanced && (
                                                    <>
                                                        <Form.Item name="light_secondaryColor" label="Secondary Color">
                                                            <ColorPicker showText />
                                                        </Form.Item>
                                                        <Form.Item name="light_cardBg" label="Card Background">
                                                            <ColorPicker showText />
                                                        </Form.Item>
                                                        <Form.Item name="light_layoutBg" label="Page Background">
                                                            <ColorPicker showText />
                                                        </Form.Item>
                                                        <Form.Item name="light_headerBg" label="Header Background">
                                                            <ColorPicker showText />
                                                        </Form.Item>
                                                    </>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                <Title level={5} className="m-0">Dark Mode</Title>
                                                <Form.Item name="dark_primaryColor" label="Primary Color">
                                                    <ColorPicker showText />
                                                </Form.Item>
                                                {showAdvanced && (
                                                    <>
                                                        <Form.Item name="dark_secondaryColor" label="Secondary Color">
                                                            <ColorPicker showText />
                                                        </Form.Item>
                                                        <Form.Item name="dark_cardBg" label="Card Background">
                                                            <ColorPicker showText />
                                                        </Form.Item>
                                                        <Form.Item name="dark_layoutBg" label="Page Background">
                                                            <ColorPicker showText />
                                                        </Form.Item>
                                                        <Form.Item name="dark_headerBg" label="Header Background">
                                                            <ColorPicker showText />
                                                        </Form.Item>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'logos',
                                label: <span className="flex items-center gap-1"><ImageIcon size={14} /> Logos</span>,
                                children: (
                                    <div className="pt-4 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <Title level={5} className="m-0">Light Mode</Title>
                                                <Form.Item name="light_logoUrl" label="Horizontal Logo">
                                                    <Space.Compact className="w-full">
                                                        <Input placeholder="https://..." prefix={<ImageIcon size={14} />} className="flex-1" />
                                                        <input type="file" id="light-logo-upload" hidden accept="image/*"
                                                            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'light', 'logo')} />
                                                        <Button icon={<UploadIcon size={14} />} loading={uploading === 'light'}
                                                            onClick={() => document.getElementById('light-logo-upload')?.click()} />
                                                    </Space.Compact>
                                                </Form.Item>
                                                <Form.Item name="light_logoIconUrl" label="Square Icon">
                                                    <Space.Compact className="w-full">
                                                        <Input placeholder="https://..." prefix={<Grid size={14} />} className="flex-1" />
                                                        <input type="file" id="light-icon-upload" hidden accept="image/*"
                                                            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'light', 'icon')} />
                                                        <Button icon={<UploadIcon size={14} />} loading={uploading === 'light'}
                                                            onClick={() => document.getElementById('light-icon-upload')?.click()} />
                                                    </Space.Compact>
                                                </Form.Item>
                                            </div>
                                            <div className="space-y-4">
                                                <Title level={5} className="m-0">Dark Mode</Title>
                                                <Form.Item name="dark_logoUrl" label="Horizontal Logo">
                                                    <Space.Compact className="w-full">
                                                        <Input placeholder="https://..." prefix={<ImageIcon size={14} />} className="flex-1" />
                                                        <input type="file" id="dark-logo-upload" hidden accept="image/*"
                                                            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'dark', 'logo')} />
                                                        <Button icon={<UploadIcon size={14} />} loading={uploading === 'dark'}
                                                            onClick={() => document.getElementById('dark-logo-upload')?.click()} />
                                                    </Space.Compact>
                                                </Form.Item>
                                                <Form.Item name="dark_logoIconUrl" label="Square Icon">
                                                    <Space.Compact className="w-full">
                                                        <Input placeholder="https://..." prefix={<Grid size={14} />} className="flex-1" />
                                                        <input type="file" id="dark-icon-upload" hidden accept="image/*"
                                                            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'dark', 'icon')} />
                                                        <Button icon={<UploadIcon size={14} />} loading={uploading === 'dark'}
                                                            onClick={() => document.getElementById('dark-icon-upload')?.click()} />
                                                    </Space.Compact>
                                                </Form.Item>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        ]}
                    />

                    <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                        <Button
                            type="primary"
                            onClick={handleSaveBranding}
                            loading={saving}
                            size="large"
                            className="font-semibold"
                        >
                            Save Branding Settings
                        </Button>
                        <Text type="secondary" className="ml-4 text-xs">
                            Changes preview in real-time. Save to persist for all users.
                        </Text>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default Branding;
