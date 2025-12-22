import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, Form, Input, Card, Space, App, Avatar, Spin } from 'antd';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, LogIn, Building2, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import {
  isDevelopment,
  getTenantUrl
} from '@/core/bootstrap/TenantResolver';
import env_def from '@/core/lib/env';

interface UserOrganization {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string;
}

import { useTranslation } from 'react-i18next';

const Login = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  // Get redirect URL from query params (used when redirected from tenant subdomain)
  const redirectTo = searchParams.get('redirect');

  // Get user from store to know when to redirect
  const { user, organization, setOrganization, reset } = useAuthStore();

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  // Organization selection state
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [showOrgSelect, setShowOrgSelect] = useState(false);
  const [selectingOrg, setSelectingOrg] = useState(false);

  // 1. REACTIVE REDIRECT: Watch the Store
  // If SessionManager successfully hydrates the user, handle redirect
  useEffect(() => {
    if (user && organization && !showOrgSelect) {
      console.log('>>> [LoginPage] User and org detected. Handling redirect...');
      handlePostLoginRedirect(organization);
    }
  }, [user, organization, showOrgSelect]);

  // 2. INITIAL CHECK: Look for existing session
  useEffect(() => {
    const checkSession = async () => {
      console.log('>>> [LoginPage] Checking for existing session...');
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        console.log('>>> [LoginPage] Found session token. Waiting for Store hydration...');
        setIsSyncing(true);
      } else {
        console.log('>>> [LoginPage] No session found. Ready for user input.');
        setIsSyncing(false);
      }
    };
    checkSession();
  }, []);

  /**
   * Handle redirect after login/org selection
   */
  const handlePostLoginRedirect = (selectedOrg: { subdomain?: string | null }) => {
    // In development mode, just navigate to dashboard
    if (isDevelopment()) {
      console.log('[Login] Dev mode - navigating to dashboard');
      navigate('/dashboard', { replace: true });
      return;
    }

    // If we have a redirect URL, validate and use it
    if (redirectTo) {
      try {
        const redirectUrl = new URL(redirectTo);
        const targetSubdomain = redirectUrl.hostname.split('.')[0];

        // Security: If redirect matches the selected org's subdomain, use it
        if (targetSubdomain === (selectedOrg.subdomain || undefined)) {
          console.log(`[Login] Redirecting to original URL: ${redirectTo}`);
          window.location.href = redirectTo;
          return;
        }
      } catch {
        // Invalid URL, fall through to default redirect
      }
    }

    // Default: Redirect to org's subdomain dashboard
    if (selectedOrg.subdomain) {
      const tenantUrl = getTenantUrl(selectedOrg.subdomain, '/dashboard');
      console.log(`[Login] Redirecting to tenant: ${tenantUrl}`);
      window.location.href = tenantUrl;
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  /**
   * Handle organization selection
   */
  const handleOrgSelect = async (org: UserOrganization) => {
    setSelectingOrg(true);
    console.log(`[Login] User selected org: ${org.name} (${org.subdomain})`);

    // Update the store with selected org
    setOrganization({
      id: org.id,
      name: org.name,
      subdomain: org.subdomain,
    } as any);

    // Small delay to let store update
    await new Promise(resolve => setTimeout(resolve, 100));

    handlePostLoginRedirect({ ...org, subdomain: org.subdomain || undefined });
  };

  const handleLogin = async (values: any) => {
    console.log('>>> [LoginPage] Attempting login...');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      if (data.session) {
        console.log('>>> [LoginPage] Login API Success.');
        message.success(t('core.auth.message.login_success'));

        // Step 1: Fetch user's organizations list (no org param required)
        const { data: orgsData, error: orgsError } = await supabase
          .schema('identity')
          .rpc('get_my_organizations');

        if (orgsError) {
          console.error('[Login] Failed to fetch organizations:', orgsError);
          throw orgsError;
        }

        const userOrgs: UserOrganization[] = (orgsData || []).map((org: any) => ({
          id: org.organization_id,
          name: org.organization_name,
          subdomain: org.subdomain || org.organization_name?.toLowerCase().replace(/\s+/g, '-'),
          logo_url: org.logo_url,
        }));

        console.log(`[Login] User has ${userOrgs.length} organizations`);

        if (userOrgs.length === 0) {
          message.warning(t('core.auth.message.no_orgs'));
          setLoading(false);
          return;
        }

        if (userOrgs.length === 1) {
          // Single org - redirect immediately
          await handleOrgSelect(userOrgs[0]);
        } else {
          // Multiple orgs - show selection UI
          setOrganizations(userOrgs);
          setShowOrgSelect(true);
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('>>> [LoginPage] Error:', error.message);
      message.error(error.message || t('core.auth.message.login_failed'));
      reset();
      setLoading(false);
    }
  };

  const handleForgotPassword = async (values: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset_password`,
      });
      if (error) throw error;
      message.success(t('core.auth.message.reset_email_sent'));
    } catch (error: any) {
      message.error(t('common.message.error'));
    } finally {
      setLoading(false);
    }
  };

  // 3. RENDER: Show Loading while checking/syncing
  if ((isSyncing && !user) || selectingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <span className="text-gray-500">
            {selectingOrg ? t('common.label.loading') : t('common.label.loading')}
          </span>
        </Space>
      </div>
    );
  }

  // 4. RENDER: Organization Selection
  if (showOrgSelect && organizations.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <Space direction="vertical" size="large" className="w-full max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="p-4 sm:p-6">
              <div className="flex justify-center mb-4">
                <Avatar size={48} icon={<Building2 size={24} />} className="bg-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-center mb-2">{t('core.auth.label.select_workspace')}</h1>
              <p className="text-center text-gray-500 mb-6">
                {t('core.auth.label.multiple_orgs')}
              </p>

              <div className="space-y-3">
                {organizations.map(org => (
                  <Button
                    key={org.id}
                    size="large"
                    block
                    className="h-auto py-3 flex items-center justify-between"
                    onClick={() => handleOrgSelect(org)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        size={32}
                        src={org.logo_url}
                        className="bg-gray-100"
                      >
                        {org.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <div className="text-left">
                        <div className="font-medium">{org.name}</div>
                        <div className="text-xs text-gray-400">
                          {org.subdomain}.zoworks.com
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={16} />
                  </Button>
                ))}
              </div>

              {redirectTo && (
                <p className="text-sm text-gray-400 mt-6 text-center">
                  {t('common.message.coming_soon')}
                </p>
              )}
            </Card>
          </motion.div>
        </Space>
      </div>
    );
  }

  // 5. RENDER: Login Form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <Space direction="vertical" size="large" className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="p-4 sm:p-6">
            <div className="flex justify-center mb-4">
              <Avatar size={48} className="bg-[#bbdefb] dark:bg-[#37474f] border-2 border-[#40c4ff] dark:border-[#4fc3f7]" />
            </div>
            {!isForgotPassword ? (
              <>
                <h1 className="text-2xl font-bold text-center mb-2">{t('core.auth.label.title')}</h1>
                <p className="text-center mb-6">{t('core.auth.label.subtitle')}</p>

                {redirectTo && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4 text-sm text-blue-600 dark:text-blue-300">
                    {t('core.auth.label.workspace_title')}
                  </div>
                )}

                <Form form={form} layout="vertical" onFinish={handleLogin} requiredMark={false}>
                  <Form.Item label={t('common.label.email')} name="email" rules={[{ required: true, message: t('core.auth.message.email_required') }, { type: 'email', message: t('core.auth.message.email_invalid') }]}>
                    <Input
                      prefix={<Mail className="text-gray-400" size={20} />}
                      placeholder={t('common.label.email')}
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: t('core.auth.message.password_required') }]}
                  >
                    <Input.Password
                      prefix={<Lock className="text-gray-400" size={20} />}
                      type="password"
                      placeholder={t('common.label.password')}
                      size="large"
                    />
                  </Form.Item>

                  {/* Org ID input only shown for non-prod */}
                  {env_def.IS_DEV_MODE && (
                    <Form.Item
                      name="organization_id"
                      label={t('common.label.organization')}
                    >
                      <Input
                        prefix={<Building className="text-gray-400" size={20} />}
                        placeholder={t('common.label.organization')}
                      />
                    </Form.Item>
                  )}

                  <Form.Item>
                    <Button type="primary" htmlType="submit" className="w-full" size="large" loading={loading} icon={<LogIn size={20} />}>
                      {t('core.auth.action.sign_in')}</Button>
                  </Form.Item>
                  <div className="flex justify-between items-center mb-6">
                    <div></div>
                    <Button type="link" onClick={() => setIsForgotPassword(true)}>{t('core.auth.label.forgot_password')}</Button>
                  </div>
                </Form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-center mb-2">{t('auth.forgot_password_title')}</h1>
                <Form form={form} layout="vertical" onFinish={handleForgotPassword} requiredMark={false}>
                  <Form.Item label={t('auth.email')} name="email" rules={[{ required: true }, { type: 'email' }]}>
                    <Input prefix={<Mail size={16} />} placeholder={t('auth.email')} size="large" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>{t('auth.send_reset_link')}</Button>
                  </Form.Item>
                  <p className="text-center mt-4">
                    <Button type="link" onClick={() => setIsForgotPassword(false)}>{t('common.action.back')}</Button>
                  </p>
                </Form>
              </>
            )}
          </Card>
        </motion.div>
      </Space>
    </div>
  );
};

export default Login;