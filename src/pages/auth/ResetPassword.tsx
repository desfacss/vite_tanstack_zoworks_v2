import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Space, message, Avatar } from 'antd';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
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

    const handlePasswordUpdate = async (values: any) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: values.password,
            });

            if (error) throw error;
            message.success('Password updated successfully!');
            navigate('/dashboard');
        } catch (error: any) {
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
                        <div className="flex justify-between items-center mb-8">
                            <Link to="/auth/login" className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                <ArrowLeft size={16} className="mr-2" />
                                Back to log in
                            </Link>
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
                                <Input.Password />
                            </Form.Item>
                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    block
                                    size="large"
                                    loading={loading}
                                    icon={loading ? <Loader2 className="animate-spin" size={20} /> : undefined}
                                    className="h-12 bg-blue-600 hover:bg-blue-700 font-semibold text-lg"
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