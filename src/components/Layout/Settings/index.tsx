import React from 'react';
import { Drawer, Form, InputNumber, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageSelect } from '../LanguageSelect';
import { useSettings } from '../../../hooks/useSettings';
import env_def from '../../../utils/constants';
import { useAuthStore } from '../@/core/lib/store';

const { Title, Text } = Typography;

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ open, onClose }) => {
  const { organization } = useAuthStore();
  const { t } = useTranslation();
  const { 
    fontSize, 
    setFontSize,
    zoom,
    setZoom
  } = useSettings();

  return (
    <Drawer
      title={t('common.settings')}
      placement="right"
      onClose={onClose}
      open={open}
      width={320}
    >
      <div className="space-y-8">
        {(organization?.app_settings?.customization?.theme==="true"||organization?.app_settings?.customization?.language==="true") && <div>
          <Title level={5}>{t('settings.appearance')}</Title>
          <Space direction="vertical" className="w-full">
            {organization?.app_settings?.customization?.theme==="true" && <div className="flex justify-between items-center">
              <Text>{t('settings.theme')}</Text>
              <ThemeToggle />
            </div>}
            {organization?.app_settings?.customization?.language==="true" && <div className="flex justify-between items-center">
              <Text>{t('settings.language')}</Text>
              <LanguageSelect />
            </div>}
          </Space>
        </div>}

        <Form layout="vertical">
          <Form.Item label={t('settings.fontSize')}>
            <InputNumber
              min={12}
              max={24}
              value={fontSize}
              onChange={(value) => setFontSize(value || 16)}
              formatter={(value) => `${value}px`}
              className="w-full"
            />
          </Form.Item>

          <Form.Item label={t('settings.zoom')}>
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