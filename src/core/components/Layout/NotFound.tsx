import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/core/lib/store';
import { useTranslation } from 'react-i18next';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Result
        status="404"
        title={t('common.label.page_not_found')}
        subTitle={t('common.message.page_not_found_desc')}
        extra={[
          <Button
            key="home"
            type="primary"
            size="large"
            onClick={() => navigate(user ? '/dashboard' : '/')}
            icon={<Home size={20} />}
          >
            {t('common.action.go_home')}
          </Button>,
          <Button
            key="back"
            size="large"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft size={20} />}
          >
            {t('common.action.go_back')}
          </Button>,
        ]}
      />
    </div>
  );
};

export default NotFound;