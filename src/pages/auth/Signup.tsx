import React from 'react';
import { motion } from 'framer-motion';
import { Form, Input, Button, Divider, message, Space, Card, Avatar } from 'antd';
import { Chrome } from 'lucide-react'; // Using Chrome as Google icon placeholder
import { Mail, Lock, User, Loader2, UserPlus } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useThemeStore } from '@/core/lib/store';
// import { ThemeToggle } from '../../components/Layout/ThemeToggle';
// import { ThemeProvider } from '../../components/shared/ThemeProvider';

const Signup = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { isDarkMode, toggleTheme } = useThemeStore();

  const handleSignup = async (values: { email: string; password: string; name: string }) => {
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

      message.success('Successfully signed up! Please check your email.');
      navigate('/login');
    } catch (error: any) {
      message.error(error.message || 'Failed to sign up');
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      if (error) throw error;
    } catch (error: any) {
      message.error(error.message || 'Failed to sign up with Google');
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

            <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
            <p className="text-center mb-6">Create your account to get started.</p>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSignup}
              requiredMark={false}
            >
              <Form.Item
                label="Full Name"
                name="name"
                rules={[{ required: true, message: 'Please input your name!' }]}
              >
                <Input
                  prefix={<User className="text-gray-400" size={20} />}
                  placeholder="Full Name"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' },
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
                label="Password"
                name="password"
                rules={[
                  { required: true, message: 'Please input your password!' },
                  { min: 6, message: 'Password must be at least 6 characters!' },
                ]}
              >
                <Input.Password
                  prefix={<Lock size={20} className="text-gray-400" />}
                  type="password"
                  placeholder="Password"
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
                  Sign Up
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
                Continue with Google
              </Button>

              <p className="text-center">
                Already have an account?{' '}
                <Link to="/login">Sign in</Link>
              </p>
            </Form>
          </Card>
        </motion.div>
      </Space>
    </div>
  );
};

export default Signup;