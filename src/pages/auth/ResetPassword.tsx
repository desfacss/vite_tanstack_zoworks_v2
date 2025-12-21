// src/components/auth/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Space, message, Avatar } from 'antd';
import { Lock, LogIn, ArrowRightOutlined } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        message.error('Invalid or expired password reset link.');
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  const handlePasswordUpdate = async (values) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) throw error;
      message.success('Password updated successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Password update error:', error.message);
      message.error('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <Space direction="vertical" size="large" className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-4 sm:p-6">
            <div className="flex justify-center mb-4">
              <Avatar size={48} className="bg-[#bbdefb] dark:bg-[#37474f] border-2 border-[#40c4ff] dark:border-[#4fc3f7]" />
            </div>
            <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
            <p className="text-center mb-6">Enter your new password below.</p>
            <Form
              form={form}
              layout="vertical"
              onFinish={handlePasswordUpdate}
              requiredMark={false}
            >
              <Form.Item
                label="New Password"
                name="password"
                rules={[{ required: true, message: 'Please enter your new password' }]}
              >
                <Input.Password
                  prefix={<Lock className="text-gray-400" size={16} />}
                  placeholder="New Password"
                  size="large"
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                >
                  Update Password
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </motion.div>
      </Space>
    </div>
  );
};

export default ResetPassword;