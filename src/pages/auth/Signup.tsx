import { useState } from 'react';
import { motion } from 'framer-motion';
import { Form, Input, Button, Divider, message, Space, Card, Avatar } from 'antd';
import { Chrome, Mail, Lock, User, UserPlus } from 'lucide-react'; // Removed Chrome duplicate and Loader2
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useThemeStore } from '@/core/lib/store';
// import { ThemeToggle } from '../../components/Layout/ThemeToggle';
// import { ThemeProvider } from '../../components/shared/ThemeProvider';

const Signup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { isDarkMode } = useThemeStore();
  const [loading, setLoading] = useState(false);

  const handleSignup = async (values: { email: string; password: string; name: string }) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
          },
        },
      });

      if (error) throw error;

      message.success(t('core.auth.message.signup_success'));
      navigate('/login');
    } catch (error: any) {
      message.error(error.message || t('core.auth.message.signup_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      if (error) throw error;
    } catch (error: any) {
      message.error(error.message || t('core.auth.message.signup_failed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <Space direction="vertical" size="large" className="w-full max-w-md">
        {/* Theme Toggle Button */}
        <div className="flex justify-end">
          {/* <Button
              shape="circle"
              icon={isDarkMode ? <span>☀️</span> : <span>🌙</span>}
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
            /> */}
          {/* <ThemeToggle/> */}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="p-4 sm:p-6">
            {/* Icon at the Top */}
            <div className="flex justify-center mb-4">
              <Avatar
                size={48}
                style={{
                  backgroundColor: isDarkMode ? '#37474f' : '#bbdefb',
                  border: `2px solid ${isDarkMode ? '#4fc3f7' : '#40c4ff'}`,
                }}
              />
            </div>

            <h1 className="text-2xl font-bold text-center mb-2">{t('core.auth.label.create_account')}</h1>
            <p className="text-center mb-6">{t('core.auth.label.signup_desc')}</p>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSignup}
              requiredMark={false}
            >
              <Form.Item
                label={t('common.label.name')}
                name="name"
                rules={[{ required: true, message: t('core.auth.message.name_required') }]}
              >
                <Input
                  prefix={<User className="text-gray-400" size={20} />}
                  placeholder="Full Name"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label={t('common.label.email')}
                name="email"
                rules={[
                  { required: true, message: t('core.auth.message.email_required') },
                  { type: 'email', message: t('core.auth.message.email_invalid') },
                ]}
              >
                <Input
                  prefix={<Mail className="text-gray-400" size={20} />}
                  type="email"
                  placeholder="Email"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label={t('common.label.password')}
                name="password"
                rules={[
                  { required: true, message: t('core.auth.message.password_required') },
                  { min: 6, message: t('core.auth.message.password_too_short') },
                ]}
              >
                <Input.Password
                  prefix={<Lock size={20} className="text-gray-400" />}
                  type="password"
                  placeholder={t('common.label.password')}
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  icon={<UserPlus size={20} />}
                  className="max-w-[300px] mx-auto"
                  loading={loading}
                >
                  {t('core.auth.action.signup')}
                </Button>
              </Form.Item>

              <Divider>OR</Divider>

              <Button
                block
                size="large"
                onClick={handleGoogleSignup}
                icon={<Chrome size={20} />}
                className="max-w-[300px] mx-auto mb-4"
              >
                {t('core.auth.action.google_signup')}
              </Button>

              <p className="text-center">
                {t('core.auth.label.already_have_account')}{' '}
                <Link to="/login">{t('core.auth.action.sign_in')}</Link>
              </p>
            </Form>
          </Card>
        </motion.div>
      </Space>
    </div>
  );
};

export default Signup;