import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Checkbox, Collapse, Button, Typography, message, Spin } from 'antd';
import { Save } from 'lucide-react';

const { Title } = Typography;
const { Panel } = Collapse;

// Define interfaces for type safety
interface SubModule {
  [key: string]: boolean;
}

interface Module {
  sub_modules?: SubModule;
  settings?: any;
}

interface ModuleHierarchy {
  [key: string]: Module;
}

interface ModuleConfigFormProps {
  organization: { id: string; name: string } | null;
  user: { id: string } | null; // Assuming user is needed for created_by/updated_by
}

const ModuleConfigForm: React.FC<ModuleConfigFormProps> = ({ organization, user }) => {
  const [moduleHierarchy, setModuleHierarchy] = useState<ModuleHierarchy>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Fetch module hierarchy and organization configs on mount
  useEffect(() => {
    const fetchModuleData = async () => {
      if (!organization) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Fetch template from modules
        const { data: templateData, error: templateError } = await supabase.rpc('get_module_hierarchy');
        if (templateError) throw templateError;

        // Fetch organization configs
        const { data: configData, error: configError } = await supabase.rpc('get_organization_module_configs', {
          p_organization_id: organization.id,
          p_scope_level: 'organization',
        });
        if (configError) throw configError;

        // Merge configs with template
        const mergedHierarchy: ModuleHierarchy = { ...templateData };
        Object.entries(configData || {}).forEach(([moduleName, configModule]) => {
          mergedHierarchy[moduleName] = {
            sub_modules: configModule.sub_modules || {},
            settings: configModule.settings || mergedHierarchy[moduleName]?.settings || {},
          };
        });

        // Initialize sub_modules for all modules (ensure all available submodules are listed)
        Object.entries(mergedHierarchy).forEach(([moduleName, moduleData]) => {
          const templateSubModules = templateData[moduleName]?.sub_modules || {};
          const currentSubModules = moduleData.sub_modules || {};
          const mergedSubModules: SubModule = {};
          Object.keys(templateSubModules).forEach((subModule) => {
            mergedSubModules[subModule] = currentSubModules[subModule] ?? false;
          });
          mergedHierarchy[moduleName].sub_modules = mergedSubModules;
        });

        setModuleHierarchy(mergedHierarchy);
      } catch (error) {
        console.error('Error fetching module data:', error);
        message.error('Failed to load module configurations');
      } finally {
        setLoading(false);
      }
    };
    fetchModuleData();
  }, [organization]);

  // Handle module checkbox change
  const handleModuleChange = (moduleName: string, checked: boolean) => {
    setModuleHierarchy((prev) => {
      const updated = { ...prev };
      if (checked) {
        updated[moduleName] = {
          sub_modules: updated[moduleName]?.sub_modules || {},
          settings: updated[moduleName]?.settings || {},
        };
      } else {
        delete updated[moduleName];
      }
      return updated;
    });
  };

  // Handle submodule checkbox change
  const handleSubModuleChange = (
    moduleName: string,
    subModuleName: string,
    checked: boolean
  ) => {
    setModuleHierarchy((prev) => {
      const updated = { ...prev };
      if (!updated[moduleName]) {
        updated[moduleName] = {
          sub_modules: {},
          settings: prev[moduleName]?.settings || {},
        };
      }
      updated[moduleName].sub_modules = {
        ...updated[moduleName].sub_modules,
        [subModuleName]: checked,
      };
      // Remove sub_modules if empty (no true values)
      if (
        Object.keys(updated[moduleName].sub_modules).every(
          (key) => !updated[moduleName].sub_modules![key]
        )
      ) {
        delete updated[moduleName].sub_modules;
      }
      // Remove module if no sub_modules
      if (!updated[moduleName].sub_modules) {
        delete updated[moduleName];
      }
      return updated;
    });
  };

  // Save module configurations
  const handleSave = async () => {
    if (!user || !organization) {
      message.error('User or organization not found');
      return;
    }
    try {
      // Clean moduleHierarchy: remove empty modules and false submodules
      const cleanedConfig: ModuleHierarchy = {};
      Object.entries(moduleHierarchy).forEach(([moduleName, moduleData]) => {
        const sub_modules: SubModule = {};
        if (moduleData.sub_modules) {
          Object.entries(moduleData.sub_modules).forEach(([key, value]) => {
            if (value) {
              sub_modules[key] = true;
            }
          });
        }
        if (Object.keys(sub_modules).length > 0) {
          cleanedConfig[moduleName] = {
            sub_modules,
            settings: moduleData.settings,
          };
        }
      });

      const payload = {
        p_organization_id: organization.id,
        p_module_configs: cleanedConfig,
        p_scope_level: 'organization',
        p_location_id: null,
        p_created_by: user.id,
        p_updated_by: user.id,
      };

      setSaving(true);
      const { error } = await supabase.rpc('save_module_configs', payload);
      if (error) throw error;
      message.success('Module configurations saved successfully');
    } catch (error: any) {
      console.error('Error saving module configs:', error);
      message.error(
        error.message.includes('Module not found')
          ? `Invalid module: ${error.message}`
          : 'Failed to save module configurations'
      );
    } finally {
      setSaving(false);
    }
  };

  // Render submodule checkboxes
  const renderSubModules = (moduleName: string, subModules?: SubModule) => {
    if (!subModules) return null;
    return Object.entries(subModules).map(([subModuleName, enabled]) => (
      <div key={subModuleName} style={{ marginLeft: 24 }}>
        <Checkbox
          checked={enabled}
          onChange={(e) =>
            handleSubModuleChange(moduleName, subModuleName, e.target.checked)
          }
        >
          {subModuleName}
        </Checkbox>
      </div>
    ));
  };

  // Render module hierarchy
  const renderModules = () => {
    return Object.entries(moduleHierarchy).map(([moduleName, moduleData]) => (
      <Panel
        header={
          <Checkbox
            checked={!!moduleHierarchy[moduleName]}
            onChange={(e) => handleModuleChange(moduleName, e.target.checked)}
          >
            {moduleName}
          </Checkbox>
        }
        key={moduleName}
      >
        {renderSubModules(moduleName, moduleData.sub_modules)}
      </Panel>
    ));
  };

  if (loading) {
    return <Spin tip="Loading module configurations..." />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <Title level={2}>Module Configurations</Title>
      <Collapse accordion>{renderModules()}</Collapse>
      <Button
        type="primary"
        icon={<Save size={16} />}
        onClick={handleSave}
        loading={saving}
        style={{ marginTop: 24 }}
        disabled={!organization || !user}
      >
        Save Configurations
      </Button>
    </div>
  );
};

export default ModuleConfigForm;