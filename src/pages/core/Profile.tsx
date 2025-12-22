// Profile page
import { Card } from 'antd';
import { useTranslation } from 'react-i18next';

const Profile = () => {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <Card title={t('common.label.profile')}>
        <p>{t('common.message.coming_soon')}</p>
      </Card>
    </div>
  );
};

export default Profile;