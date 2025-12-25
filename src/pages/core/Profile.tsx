// Profile page
import { Card } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  PageActionBar,
  ActionBarLeft,
  PageTitle,
} from '@/core/components/ActionBar';

const Profile = () => {
  const { t } = useTranslation();

  return (
    <div className="page-content layout-canvas">
      <PageActionBar>
        <ActionBarLeft>
          <PageTitle title={t('common.label.profile')} />
        </ActionBarLeft>
      </PageActionBar>

      <div className="page-card">
        <Card>
          <p className="text-subtitle">{t('common.message.coming_soon')}</p>
        </Card>
      </div>
    </div>
  );
};

export default Profile;