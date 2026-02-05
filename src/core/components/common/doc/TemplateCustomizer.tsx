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

  const toHexColor = (color: any): string => {
    if (typeof color === 'string') return color;
    if (color && typeof color.toHexString === 'function') {
      return color.toHexString();
    }
    return '#000000';
  };

  const preprocessSettings = (settings: any) => {
    const processedSettings = { ...settings };
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
    Object.keys(allFields).forEach((key) => {
      let value = allFields[key];
      const keyParts = key.split('.');

      if (value && (key.includes('Color') || key.includes('color'))) {
        value = toHexColor(value);
      }

      if (keyParts.length === 2) {
        const [section, field] = keyParts;
        if (!newSettings[section]) newSettings[section] = {};
        newSettings[section][field] = value;
      } else if (keyParts.length === 3) {
        const [section, subsection, field] = keyParts;
        if (!newSettings[section]) newSettings[section] = {};
        if (!newSettings[section][subsection]) newSettings[section][subsection] = {};
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
          Save
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
        <Card size="small" title="Header" style={{ marginBottom: 16 }}>
          <Form.Item name="header.showLogo" valuePropName="checked">
            <Switch checkedChildren="Show Logo" unCheckedChildren="Hide Logo" />
          </Form.Item>
          <Form.Item name="header.companyName" label="Company Name">
            <Input />
          </Form.Item>
          <Form.Item name="header.tagline" label="Tagline">
            <Input />
          </Form.Item>
          <Form.Item name="header.backgroundColor" label="BG Color">
            <ColorPicker showText format="hex" />
          </Form.Item>
          <Form.Item name="header.textColor" label="Text Color">
            <ColorPicker showText format="hex" />
          </Form.Item>
        </Card>

        <Card size="small" title="Footer" style={{ marginBottom: 16 }}>
          <Form.Item name="footer.showFooter" valuePropName="checked">
            <Switch checkedChildren="Show Footer" unCheckedChildren="Hide Footer" />
          </Form.Item>
          <Form.Item name="footer.text" label="Footer Text">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="footer.backgroundColor" label="BG Color">
            <ColorPicker showText format="hex" />
          </Form.Item>
          <Form.Item name="footer.textColor" label="Text Color">
            <ColorPicker showText format="hex" />
          </Form.Item>
        </Card>

        <Card size="small" title="Layout" style={{ marginBottom: 16 }}>
          <Form.Item name="layout.spacing" label="Spacing (px)">
            <InputNumber min={0} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="layout.fontSize" label="Font Size (px)">
            <InputNumber min={8} max={24} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="layout.fontFamily" label="Font Family">
            <Select options={fontOptions} />
          </Form.Item>
        </Card>

        <Card size="small" title="Branding" style={{ marginBottom: 16 }}>
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
