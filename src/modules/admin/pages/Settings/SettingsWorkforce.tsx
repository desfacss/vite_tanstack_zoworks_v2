import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Checkbox, Row, Col, Typography, Button, message, Collapse, Badge, Popconfirm } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { Trash2 } from 'lucide-react';

const { Option } = Select;
const { Title } = Typography;

// Utility to flatten nested objects for form fields
const flattenObject = (obj: any, prefix = ''): Record<string, any> =>
  Object.keys(obj || {}).reduce((acc: Record<string, any>, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      return { ...acc, ...flattenObject(obj[key], prefixedKey) };
    }
    return { ...acc, [prefixedKey]: obj[key] };
  }, {});

// Utility to unflatten form values back to nested structure
const unflattenObject = (flatObj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  Object.keys(flatObj).forEach((key) => {
    const parts = key.split('.');
    let current: any = result;
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = current[parts[i]] || {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = flatObj[key];
  });
  return result;
};

interface ModuleConfig {
  id: string;
  name: string;
  settings: any;
  isConfigured: boolean;
  configId?: string;
  defaultSettings: any;
}

const SettingsWorkforce: React.FC = () => {
  const [modules, setModules] = useState<ModuleConfig[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { organization, user } = useAuthStore();

  useEffect(() => {
    const fetchModules = async () => {
      if (!organization?.id) return;

      setLoading(true);

      const { data: modulesData, error: modulesError } = await supabase
        .schema('core')
        .from('modules')
        .select('id, name, settings')
        .eq('is_active', true)
        .not('settings', 'is', null);

      if (modulesError) {
        console.error('Error fetching modules:', modulesError);
        message.error('Failed to load modules');
        setLoading(false);
        return;
      }

      const { data: moduleConfigsData, error: configError } = await supabase
        .schema('identity').from('org_module_configs')
        .select('id, module_id, settings')
        .eq('organization_id', organization.id);

      if (configError) {
        console.error('Error fetching module configurations:', configError);
        message.error('Failed to load module configurations');
        setLoading(false);
        return;
      }

      const combinedModules = (modulesData || []).map((module: any) => {
        const config = (moduleConfigsData || []).find((c: any) => c.module_id === module.id);
        const hasCustomSettings = config && config.settings !== null;

        return {
          id: module.id,
          name: module.name,
          settings: hasCustomSettings ? config.settings : module.settings,
          isConfigured: hasCustomSettings ?? false,
          configId: config?.id,
          defaultSettings: module.settings
        };
      });

      setModules(combinedModules);

      if (combinedModules.length > 0) {
        setSelectedModuleId(combinedModules[0].id);
        form.setFieldsValue(flattenObject(combinedModules[0].settings));
      }

      setLoading(false);
    };

    fetchModules();
  }, [organization?.id, form]);

  useEffect(() => {
    if (selectedModuleId) {
      const module = modules.find((m) => m.id === selectedModuleId);
      if (module) {
        form.setFieldsValue(flattenObject(module.settings));
      }
    }
  }, [selectedModuleId, modules, form]);

  const renderSettingField = (key: string, value: any): React.ReactNode => {
    if (key.split('.').pop() === 'schema') {
      return null;
    }

    const label = (key.split('.').pop() || '').replace(/_/g, ' ');
    switch (typeof value) {
      case 'string':
        return (
          <Form.Item label={label} name={key} key={key}>
            <Input />
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item label={label} name={key} key={key}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        );
      case 'boolean':
        return (
          <Form.Item name={key} valuePropName="checked" key={key}>
            <Checkbox>{label}</Checkbox>
          </Form.Item>
        );
      case 'object':
        if (Array.isArray(value)) {
          return (
            <Form.Item label={label} name={key} key={key}>
              <Select mode="tags" style={{ width: '100%' }} tokenSeparators={[',']}>
                {value.map((item) => (
                  <Option key={item} value={item}>
                    {item}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          );
        } else if (value === null) {
          return null;
        } else {
          return Object.entries(value).map(([subKey, subValue]) => {
            if (typeof subValue === 'object' && subValue !== null && !Array.isArray(subValue)) {
              return (
                <div key={subKey} style={{ marginBottom: 16 }}>
                  <Title level={5}>{subKey.replace(/_/g, ' ')}</Title>
                  {Object.entries(subValue as Record<string, any>).map(([deepKey, deepValue]) =>
                    renderSettingField(`${key}.${subKey}.${deepKey}`, deepValue)
                  )}
                </div>
              );
            }
            return renderSettingField(`${key}.${subKey}`, subValue);
          });
        }
      default:
        return null;
    }
  };

  const handleFinish = async (values: any) => {
    setLoading(true);
    const selected = modules.find((m) => m.id === selectedModuleId);

    if (!selected) {
      message.error('Selected module not found');
      setLoading(false);
      return;
    }

    if (!selected.configId) {
      message.error('Module configuration row not found. Please contact support.');
      setLoading(false);
      return;
    }

    const currentSettings = selected.settings;
    const newSettingsFromForm = unflattenObject(values);

    const updatedSettings = JSON.parse(JSON.stringify(currentSettings));

    const deepMerge = (target: any, source: any) => {
      for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
          Object.assign(source[key], deepMerge(target[key], source[key]));
        }
      }
      Object.assign(target || {}, source);
      return target;
    };

    deepMerge(updatedSettings, newSettingsFromForm);

    const { error } = await supabase
      .schema('identity').from('org_module_configs')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq('id', selected.configId);

    if (error) {
      console.error('Error updating settings:', error);
      message.error('Failed to save settings');
    } else {
      message.success('Settings updated successfully');
      setModules((prev) =>
        prev.map((module) =>
          module.id === selectedModuleId
            ? { ...module, settings: updatedSettings, isConfigured: true }
            : module
        )
      );
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    const selected = modules.find((m) => m.id === selectedModuleId);
    if (!selected || !selected.configId) {
      message.error('Cannot delete configuration for a module without a config row.');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .schema('identity').from('org_module_configs')
      .update({
        settings: null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq('id', selected.configId);

    if (error) {
      console.error('Error deleting module configuration:', error);
      message.error('Failed to delete module configuration');
    } else {
      message.success('Module configuration reset to default successfully');

      const defaultSettings = selected.defaultSettings;

      if (!defaultSettings) {
        message.error('Failed to find default settings for reset.');
        setLoading(false);
        return;
      }

      setModules((prev) =>
        prev.map((m) =>
          m.id === selectedModuleId
            ? { ...m, settings: defaultSettings, isConfigured: false }
            : m
        )
      );
      form.setFieldsValue(flattenObject(defaultSettings));
    }
    setLoading(false);
  };

  const currentSettings = modules.find((m) => m.id === selectedModuleId)?.settings || {};

  const collapseItems = Object.entries(currentSettings)
    .filter(([key]) => key !== 'schema')
    .map(([key, value]) => ({
      key: key,
      label: key.replace(/_/g, ' ').toUpperCase(),
      children: typeof value === 'object' && value !== null && !Array.isArray(value)
        ? Object.entries(value as Record<string, any>).map(([subKey, subValue]) => {
            if (typeof subValue === 'object' && subValue !== null && !Array.isArray(subValue)) {
              return (
                <div key={subKey} style={{ marginBottom: 16 }}>
                  <Title level={5}>{subKey.replace(/_/g, ' ')}</Title>
                  {Object.entries(subValue as Record<string, any>).map(([deepKey, deepValue]) =>
                    renderSettingField(`${key}.${subKey}.${deepKey}`, deepValue)
                  )}
                </div>
              );
            }
            return renderSettingField(`${key}.${subKey}`, subValue);
          })
        : renderSettingField(key, value),
    }));

  return (
    <div>
      <Row gutter={16} align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Module Settings</Title>
        </Col>
        <Col>
          <Select
            value={selectedModuleId}
            onChange={setSelectedModuleId}
            style={{ width: 200 }}
            loading={loading}
            placeholder="Select a module"
          >
            {modules.map((module) => (
              <Option key={module.id} value={module.id}>
                <span>
                  {module.name.replace(/_/g, ' ').toUpperCase()}
                  {!module.isConfigured && (
                    <Badge
                      count="Default"
                      style={{ backgroundColor: '#fa8c16', marginLeft: 8 }}
                    />
                  )}
                </span>
              </Option>
            ))}
          </Select>
        </Col>
      </Row>

      {selectedModuleId && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={flattenObject(currentSettings)}
        >
          <Collapse
            items={collapseItems}
            defaultActiveKey={Object.keys(currentSettings).filter(key => key !== 'schema')[0]}
            style={{ marginBottom: 24 }}
          />

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
              Save Settings
            </Button>
            {modules.find((m) => m.id === selectedModuleId)?.isConfigured && (
              <Popconfirm
                title="Are you sure you want to revert to default settings?"
                onConfirm={handleDelete}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  danger
                  icon={<Trash2 size={14} />}
                  loading={loading}
                >
                  Revert to Default
                </Button>
              </Popconfirm>
            )}
          </Form.Item>
        </Form>
      )}
    </div>
  );
};

export default SettingsWorkforce;
