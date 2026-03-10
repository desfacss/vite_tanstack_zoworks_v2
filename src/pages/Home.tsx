import { useEffect } from 'react';
import { Button } from "antd";
import {
  LogIn,
  CreditCard
} from "lucide-react";
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // Check for existing session or user and redirect to dashboard
  // BUT: don't redirect if we are in the middle of a recovery or magic link flow
  useEffect(() => {
    // Note: Hash might be cleared by Supabase before this effect runs
    const isAuthFlow = location.hash.includes('access_token=') || 
                       location.hash.includes('type=recovery') || 
                       location.hash.includes('type=magiclink') || 
                       location.hash.includes('type=invite');
    
    if (isAuthFlow) {
      console.log('[Home] 🚩 Auth flow detected in hash, skipping dashboard redirect to allow SessionManager to handle it');
      return;
    }

    const checkAndRedirect = async () => {
      // Small delay to allow SessionManager/AuthGuard to potentially change path first
      await new Promise(r => setTimeout(r, 100));

      const { data: { session } } = await supabase.auth.getSession();
      
      // If we found a session, check if it's a recovery flow from the session itself
      if (session?.user?.app_metadata?.recovery || session?.user?.user_metadata?.recovery) {
          console.log('[Home] 🚩 Session has recovery metadata, skipping dashboard redirect');
          return;
      }

      if (session || user) {
        console.log('[Home] ✅ Session or user found, navigating to /dashboard');
        navigate('/dashboard', { replace: true });
      }
    };
    
    checkAndRedirect();
  }, [user, navigate, location.hash]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-[var(--color-bg-primary)] rounded-[var(--tenant-border-radius,12px)] shadow-md p-8 text-center border-[var(--color-border)]">
          <h1 className="text-h1 mb-6 text-[var(--color-primary)]">
            {t('core.home.label.welcome_title')}
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-8">
            {t('core.home.label.welcome_subtitle')}
          </p>
          <div className="space-y-4">
            <Button type="primary" size="large" block onClick={() => navigate('/login')} icon={<LogIn size={20} />}>
              {t('core.home.action.login')}
            </Button>
            <Button size="large" block onClick={() => navigate('/subscription')} icon={<CreditCard size={20} />} className="bg-[var(--color-background-secondary)]">
              {t('core.home.action.manage_subscription')}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;