import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, reset } = useAuthStore();

  // Handle invite link with access_token and refresh_token
  useEffect(() => {
    const handleInviteLink = async () => {
      const hashParams = new URLSearchParams(location.hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('token_type');
      const expiresIn = hashParams.get('expires_in');

      if (accessToken && refreshToken && tokenType && expiresIn) {
        try {
          console.log('Processing invite link with tokens...');
          // Set the session in Supabase
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session from invite link:', error.message);
            message.error('Failed to authenticate with invite link.');
            reset();
            navigate('/login', { replace: true, state: { from: location.pathname } });
            return;
          }

          // Check if the session is established
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('Session established from invite link, navigating to /dashboard');
            navigate('/dashboard', { replace: true });
          } else {
            console.error('No session established after setting tokens');
            message.error('Authentication failed. Please try again.');
            reset();
            navigate('/login', { replace: true, state: { from: location.pathname } });
          }
        } catch (error: any) {
          console.error('Invite link processing error:', error.message);
          message.error('Failed to process invite link.');
          reset();
          navigate('/login', { replace: true, state: { from: location.pathname } });
        }
      }
    };

    handleInviteLink();
  }, [location, navigate, reset]);

  // Check for existing session or user
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Existing session found, navigating to /dashboard');
        navigate('/dashboard', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      console.log('User found in store, navigating to /dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-[var(--color-background)] rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold text-[var(--color-text)] mb-6">
            Welcome to Enterprise
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-8">
            Experience the power of our application with advanced features and intuitive design.
          </p>
          <div className="space-y-4">
            <Button
              type="primary"
              size="large"
              block
              icon={<LogIn size={20} />}
              onClick={() => navigate('/login')}
            >
              {t('auth.login')}
            </Button>
            {/* <Button
              size="large"
              block
              icon={<CreditCard size={20} />}
              onClick={() => navigate('/subscriptions')}
              className="bg-[var(--color-background-secondary)]"
            >
              {t('subscriptions.list')}
            </Button> */}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;