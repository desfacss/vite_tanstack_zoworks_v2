import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuthStore } from '../../lib/store';

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
        extra={
          <Button
            type="primary"
            icon={<Home size={16} />}
            onClick={handleNavigate}
          >
            {user ? 'Back to Dashboard' : 'Back to Home'}
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;