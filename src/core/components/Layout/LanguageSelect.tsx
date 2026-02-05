import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/lib/store';
import { changeLanguage } from '@/core/i18n';

const { Option } = Select;

const ALL_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'fr', label: 'Français' },
];

export const LanguageSelect = ({ className }: { className?: string }) => {
  const { i18n } = useTranslation();
  const { organization } = useAuthStore();

  const enabledLanguages = organization?.enabled_languages || ['en'];
  const filteredLanguages = ALL_LANGUAGES.filter(lang =>
    enabledLanguages.includes(lang.value)
  );

  return (
    <Select
      value={i18n.language}
      className={className}
      onChange={(value) => changeLanguage(value)}
    >
      {filteredLanguages.map(lang => (
        <Option key={lang.value} value={lang.value}>{lang.label}</Option>
      ))}
    </Select>
  );
};

export default LanguageSelect;
