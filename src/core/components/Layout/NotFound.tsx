import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/core/lib/store';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleNavigate = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Result
        status="404"
        title="Page Not Found"
        subTitle="Sorry, the page you visited does not exist or you don't have permission to access it."
        extra={[
          <Button type="primary" size="large" onClick={() => navigate('/')} icon={<Home size={20} />}>
            Go Home
          </Button>,
          <Button size="large" onClick={() => navigate(-1)} icon={<ArrowLeft size={20} />}>
            Go Back
          </Button>,
        ]}
      />
    </div>
  );
};

export default NotFound;