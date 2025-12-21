import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import env_def from '@/utils/constants';
import { useAuthStore } from '../../lib/store';

const { Option } = Select;

export const LanguageSelect = () => {
  const { i18n } = useTranslation();
  const { organization } = useAuthStore();
  // if(env_def?.LANGUAGE!=="true") return null; // Return null if LANGUAGE is disabled
  if (organization?.app_settings?.customization?.language !== "true") return null; // Return null if LANGUAGE is disabled

  return (
    <Select
      defaultValue={i18n.language}
      style={{ width: 100 }}
      onChange={(value) => i18n.changeLanguage(value)}
    >
      <Option value="en">English</Option>
      <Option value="fr">Français</Option>
      <Option value="hi">Hindi</Option>
      <Option value="mr">Marathi</Option>
      <Option value="kn">Kannada</Option>
      <Option value="te">Telugu</Option>
      <Option value="ta">Tamil</Option>
    </Select>
  );
};
export default LanguageSelect;
