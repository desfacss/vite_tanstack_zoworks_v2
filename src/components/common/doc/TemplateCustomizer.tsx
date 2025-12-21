import React from 'react';
import {
  Drawer,
  Form,
  Input,
  Switch,
  ColorPicker,
  InputNumber,
  Select,
  Card,
  Space,
  Typography,
  Divider,
  Button,
  message,
} from 'antd';
import { DocumentTemplate, DocumentForm } from './types/document';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TemplateCustomizerProps {
  visible: boolean;
  onClose: () => void;
  documentForm: DocumentForm;
  currentTemplate: DocumentTemplate | null;
  onChange: (template: DocumentTemplate) => void;
}

const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  visible,
  onClose,
  documentForm,
  currentTemplate,
  onChange,
}) => {
  const [form] = Form.useForm();

  // Helper function to convert ColorPicker value to hex string
  const toHexColor = (color: any): string => {
    if (typeof color === 'string') return color; // Already a hex string
    if (color && typeof color.toHexString === 'function') {
      return color.toHexString(); // Convert Color object to hex
    }
    if (color && color.metaColor) {
      // Handle metaColor format
      const { r, g, b } = color.metaColor;
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }
    return '#000000'; // Fallback color
  };

  // Preprocess settings to convert color fields to hex
  const preprocessSettings = (settings: any) => {
    const processedSettings = { ...settings };

    // Convert color fields to hex
    if (processedSettings.header) {
      processedSettings.header = {
        ...processedSettings.header,
        backgroundColor: toHexColor(processedSettings.header.backgroundColor),
        textColor: toHexColor(processedSettings.header.textColor),
      };
    }
    if (processedSettings.footer) {
      processedSettings.footer = {
        ...processedSettings.footer,
        backgroundColor: toHexColor(processedSettings.footer.backgroundColor),
        textColor: toHexColor(processedSettings.footer.textColor),
      };
    }
    if (processedSettings.branding) {
      processedSettings.branding = {
        ...processedSettings.branding,
        primaryColor: toHexColor(processedSettings.branding.primaryColor),
        secondaryColor: toHexColor(processedSettings.branding.secondaryColor),
        accentColor: toHexColor(processedSettings.branding.accentColor),
      };
    }

    return processedSettings;
  };

  const handleFormChange = (changedFields: any, allFields: any) => {
    if (!currentTemplate) return;

    const newSettings = { ...currentTemplate.settings };

    // Update nested settings based on form changes
    Object.keys(allFields).forEach((key) => {
      let value = allFields[key];
      const keyParts = key.split('.');

      // Convert ColorPicker values to hex strings
      if (value && (key.includes('Color') || key.includes('color'))) {
        value = toHexColor(value);
      }

      if (keyParts.length === 2) {
        const [section, field] = keyParts;
        if (!newSettings[section]) {
          newSettings[section] = {};
        }
        newSettings[section][field] = value;
      } else if (keyParts.length === 3) {
        const [section, subsection, field] = keyParts;
        if (!newSettings[section]) {
          newSettings[section] = {};
        }
        if (!newSettings[section][subsection]) {
          newSettings[section][subsection] = {};
        }
        newSettings[section][subsection][field] = value;
      }
    });

    const updatedTemplate = {
      ...currentTemplate,
      settings: newSettings,
      updated_at: new Date().toISOString(),
    };

    onChange(updatedTemplate);
  };

  const handleSave = () => {
    message.success('Template settings saved');
    onClose();
  };

  const fontOptions = [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, sans-serif' },
    { label: 'Times New Roman', value: 'Times New Roman, serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: 'Courier New, monospace' },
  ];

  if (!currentTemplate) return null;

  const settings = preprocessSettings(currentTemplate.settings || {});

  return (
    <Drawer
      title={`Customize Template: ${currentTemplate.name}`}
      placement="right"
      width={400}
      open={visible}
      onClose={onClose}
      extra={
        <Button type="primary" onClick={handleSave}>
          Save Changes
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        initialValues={{
          'header.showLogo': settings.header?.showLogo ?? true,
          'header.companyName': settings.header?.companyName || 'Demo Company Inc.',
          'header.tagline': settings.header?.tagline || '',
          'header.backgroundColor': settings.header?.backgroundColor || '#ffffff',
          'header.textColor': settings.header?.textColor || '#000000',
          'footer.showFooter': settings.footer?.showFooter ?? true,
          'footer.text': settings.footer?.text || 'Thank you for your business!',
          'footer.backgroundColor': settings.footer?.backgroundColor || '#f5f5f5',
          'footer.textColor': settings.footer?.textColor || '#666666',
          'layout.margins.top': settings.layout?.margins?.top || 20,
          'layout.margins.bottom': settings.layout?.margins?.bottom || 20,
          'layout.margins.left': settings.layout?.margins?.left || 20,
          'layout.margins.right': settings.layout?.margins?.right || 20,
          'layout.spacing': settings.layout?.spacing || 16,
          'layout.fontSize': settings.layout?.fontSize || 14,
          'layout.fontFamily': settings.layout?.fontFamily || 'Arial, sans-serif',
          'branding.primaryColor': settings.branding?.primaryColor || '#1890ff',
          'branding.secondaryColor': settings.branding?.secondaryColor || '#52c41a',
          'branding.accentColor': settings.branding?.accentColor || '#faad14',
        }}
      >
        {/* Header Settings */}
        <Card size="small" title="Header Settings" style={{ marginBottom: 16 }}>
          <Form.Item name="header.showLogo" valuePropName="checked">
            <Switch checkedChildren="Show Logo" unCheckedChildren="Hide Logo" />
          </Form.Item>

          <Form.Item name="header.companyName" label="Company Name">
            <Input placeholder="Enter company name" />
          </Form.Item>

          <Form.Item name="header.tagline" label="Tagline">
            <Input placeholder="Enter tagline" />
          </Form.Item>

          <Divider size="small" />

          <Form.Item name="header.backgroundColor" label="Background Color">
            <ColorPicker showText format="hex" />
          </Form.Item>

          <Form.Item name="header.textColor" label="Text Color">
            <ColorPicker showText format="hex" />
          </Form.Item>
        </Card>

        {/* Footer Settings */}
        <Card size="small" title="Footer Settings" style={{ marginBottom: 16 }}>
          <Form.Item name="footer.showFooter" valuePropName="checked">
            <Switch checkedChildren="Show Footer" unCheckedChildren="Hide Footer" />
          </Form.Item>

          <Form.Item name="footer.text" label="Footer Text">
            <TextArea rows={2} placeholder="Enter footer text" />
          </Form.Item>

          <Form.Item name="footer.backgroundColor" label="Background Color">
            <ColorPicker showText format="hex" />
          </Form.Item>

          <Form.Item name="footer.textColor" label="Text Color">
            <ColorPicker showText format="hex" />
          </Form.Item>
        </Card>

        {/* Layout Settings */}
        <Card size="small" title="Layout Settings" style={{ marginBottom: 16 }}>
          <Title level={5}>Margins (px)</Title>
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Form.Item name="layout.margins.top" style={{ width: '25%', marginBottom: 0 }}>
              <InputNumber placeholder="Top" min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="layout.margins.right" style={{ width: '25%', marginBottom: 0 }}>
              <InputNumber placeholder="Right" min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="layout.margins.bottom" style={{ width: '25%', marginBottom: 0 }}>
              <InputNumber placeholder="Bottom" min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="layout.margins.left" style={{ width: '25%', marginBottom: 0 }}>
              <InputNumber placeholder="Left" min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="layout.spacing" label="Element Spacing">
            <InputNumber min={0} max={50} addonAfter="px" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="layout.fontSize" label="Base Font Size">
            <InputNumber min={8} max={24} addonAfter="px" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="layout.fontFamily" label="Font Family">
            <Select options={fontOptions} />
          </Form.Item>
        </Card>

        {/* Branding Colors */}
        <Card size="small" title="Branding Colors" style={{ marginBottom: 16 }}>
          <Form.Item name="branding.primaryColor" label="Primary Color">
            <ColorPicker showText format="hex" />
          </Form.Item>

          <Form.Item name="branding.secondaryColor" label="Secondary Color">
            <ColorPicker showText format="hex" />
          </Form.Item>

          <Form.Item name="branding.accentColor" label="Accent Color">
            <ColorPicker showText format="hex" />
          </Form.Item>
        </Card>
      </Form>
    </Drawer>
  );
};

export default TemplateCustomizer;