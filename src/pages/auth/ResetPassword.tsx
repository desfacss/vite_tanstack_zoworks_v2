import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Space, message } from 'antd';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

const ResetPassword = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                message.error(t('core.auth.message.invalid_link'));
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

            // --- CONFIRM PASSWORD STATUS ---
            // Tell the backend that the user has successfully set their password.
            const { error: rpcError } = await supabase
                .schema('identity')
                .rpc('confirm_user_password');

            if (rpcError) {
                console.warn('Failed to confirm password status:', rpcError.message);
                // We don't throw here to avoid blocking the user if the RPC fails 
                // but the password was actually updated in auth.
            }

            // --- REFRESH SESSION DATA ---
            // Invalidate the cache to ensure SessionManager sees the new status
            await queryClient.invalidateQueries({ queryKey: ['user-session'] });

            message.success(t('core.auth.message.reset_success'));
            
            // Navigate to dashboard - SessionManager should now allow it
            navigate('/dashboard', { replace: true });
        } catch (error: any) {
            console.error('Password update error:', error.message);
            message.error(t('core.auth.message.reset_failed'));
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
                                {t('common.action.back')}
                            </Link>
                        </div>
                        <h1 className="text-h2 text-center mb-2">{t('core.auth.label.reset_password')}</h1>
                        <p className="text-center mb-6">{t('core.auth.label.reset_password_desc')}</p>
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handlePasswordUpdate}
                            requiredMark={false}
                        >
                            <Form.Item
                                label={t('core.auth.label.new_password')}
                                name="password"
                                rules={[{ required: true, message: t('core.auth.message.password_required') }]}
                            >
                                <Input.Password size="large" />
                            </Form.Item>
                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    block
                                    size="large"
                                    loading={loading}
                                    icon={loading ? <Loader2 className="animate-spin" size={20} /> : undefined}
                                    className="h-10 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                                >
                                    {t('core.auth.action.reset_password')}
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