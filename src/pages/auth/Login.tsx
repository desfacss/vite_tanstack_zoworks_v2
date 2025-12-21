// // import React, { useState, useEffect } from 'react';
// // import { ArrowRightOutlined, GoogleOutlined, GithubOutlined } from '@ant-design/icons';
// // import { Button, Checkbox, Divider, Form, Input, Card, Space, message, Avatar } from 'antd';
// // import { motion } from 'framer-motion';
// // import { useNavigate, Link } from 'react-router-dom';
// // import { Mail, Lock, LogIn } from 'lucide-react';
// // import { supabase } from '../../lib/supabase';
// // import { useAuthStore } from '../../lib/store';

// // const Login = () => {
// //   const navigate = useNavigate();
// //   const [form] = Form.useForm();
// //   const { user, reset } = useAuthStore();
// //   const [isForgotPassword, setIsForgotPassword] = useState(false);
// //   const [loading, setLoading] = useState(false);
// //   useEffect(() => {
// //     const checkSession = async () => {
// //       const { data: { session } } = await supabase.auth.getSession();
// //       if (session) {
// //         navigate('/dashboard');
// //       }
// //     };
// //     checkSession();
// //   }, [navigate]);

// //   // Removed the useEffect that watches for the user state to avoid race conditions.
// //   // The redirection should happen after a successful login via handleLogin.

// //   const handleLogin = async (values) => {
// //     setLoading(true);
// //     try {
// //       const { data, error } = await supabase.auth.signInWithPassword({
// //         email: values.email,
// //         password: values.password,
// //       });

// //       if (error) throw error;
// //       if (data.session) {
// //         message.success('Login successful!...');
// //           navigate('/dashboard');
// //       }
// //     } catch (error) {
// //       console.error('Login error:', error.message);
// //       message.error('Login failed. Please check your credentials.');
// //       reset();
// //     }
// //     setLoading(false);
// //   };

// //   const handleForgotPassword = async (values) => {
// //   setLoading(true); // Start loading
// //   try {
// //     const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
// //       redirectTo: `${window.location.origin}/reset_password`,
// //     });
// //     if (error) throw error;
// //     message.success('Password reset email sent. Please check your inbox.');
// //   } catch (error) {
// //     console.error('Forgot password error:', error.message);
// //     message.error('Failed to send reset email. Please try again.');
// //   } finally {
// //     setLoading(false); // Stop loading, regardless of success or failure
// //   }
// // };

// //   return (
// //     <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
// //       <Space direction="vertical" size="large" className="w-full max-w-md">
// //         <motion.div
// //           initial={{ opacity: 0, y: 20 }}
// //           animate={{ opacity: 1, y: 0 }}
// //           transition={{ duration: 0.5 }}
// //         >
// //           <Card className="p-4 sm:p-6">
// //             <div className="flex justify-center mb-4">
// //               <Avatar size={48} className="bg-[#bbdefb] dark:bg-[#37474f] border-2 border-[#40c4ff] dark:border-[#4fc3f7]" />
// //             </div>
// //             {!isForgotPassword ? (
// //               <>
// //                 <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
// //                 <p className="text-center mb-6">Please enter your details to sign in.</p>
// //                 <Form
// //                   form={form}
// //                   layout="vertical"
// //                   onFinish={handleLogin}
// //                   requiredMark={false}
// //                   // initialValues={{ email: 'ravi@claritiz.com', password: 'Inno@1234' }}
// //                 >
// //                   <Form.Item
// //                     label="Email"
// //                     name="email"
// //                     rules={[
// //                       { required: true, message: 'Please enter your email' },
// //                       { type: 'email', message: 'Please enter a valid email' },
// //                     ]}
// //                   >
// //                     <Input
// //                       prefix={<Mail className="text-gray-400" size={16} />}
// //                       suffix={<ArrowRightOutlined className="text-[#40c4ff] dark:text-[#4fc3f7]" />}
// //                       placeholder="Email"
// //                       size="large"
// //                       autoComplete="email"
// //                     />
// //                   </Form.Item>
// //                   <Form.Item
// //                     label="Password"
// //                     name="password"
// //                     rules={[{ required: true, message: 'Please enter your password' }]}
// //                   >
// //                     <Input.Password
// //                       prefix={<Lock className="text-gray-400" size={16} />}
// //                       placeholder="Password"
// //                       size="large"
// //                       autoComplete="current-password"
// //                     />
// //                   </Form.Item>
// //                   <div className="flex justify-between items-center mb-6">
// //                     {/* <Checkbox>Remember me</Checkbox> */}
// //                     <div></div>
// //                     <Button type="link" onClick={() => setIsForgotPassword(true)}>
// //                       Forgot password?
// //                     </Button>
// //                   </div>
// //                   <Form.Item>
// //                     <Button
// //                       type="primary"
// //                       htmlType="submit"
// //                       size="large"
// //                       block
// //                       disabled={loading}
// //                       loading={loading}
// //                       icon={<LogIn size={20} />}
// //                     >
// //                       Sign In
// //                     </Button>
// //                   </Form.Item>
// //                 </Form>
// //               </>
// //             ) : (
// //               <>
// //                 <h1 className="text-2xl font-bold text-center mb-2">Forgot Password</h1>
// //                 <p className="text-center mb-6">Enter your email to receive a password reset link.</p>
// //                 <Form
// //                   form={form}
// //                   layout="vertical"
// //                   onFinish={handleForgotPassword}
// //                   requiredMark={false}
// //                 >
// //                   <Form.Item
// //                     label="Email"
// //                     name="email"
// //                     rules={[
// //                       { required: true, message: 'Please enter your email' },
// //                       { type: 'email', message: 'Please enter a valid email' },
// //                     ]}
// //                   >
// //                     <Input
// //                       prefix={<Mail className="text-gray-400" size={16} />}
// //                       suffix={<ArrowRightOutlined className="text-[#40c4ff] dark:text-[#4fc3f7]" />}
// //                       placeholder="Email"
// //                       size="large"
// //                     />
// //                   </Form.Item>
// //                   <Form.Item>
// //                     <Button
// //                       type="primary"
// //                       htmlType="submit"
// //                       size="large"
// //                       block
// //                       disabled={loading}
// //                       loading={loading}
// //                       icon={<LogIn size={20} />}
// //                     >
// //                       Send Reset Link
// //                     </Button>
// //                   </Form.Item>
// //                   <p className="text-center mt-4">
// //                     <Button type="link" onClick={() => setIsForgotPassword(false)} loading={loading}>
// //                       Back to Sign In
// //                     </Button>
// //                   </p>
// //                 </Form>
// //               </>
// //             )}
// //           </Card>
// //         </motion.div>
// //       </Space>
// //     </div>
// //   );
// // };

// // export default Login;



// // src/pages/auth/Login.tsx
// import React, { useState, useEffect } from 'react';
// import { ArrowRightOutlined, GoogleOutlined, GithubOutlined } from '@ant-design/icons';
// import { Button, Checkbox, Divider, Form, Input, Card, Space, App, Avatar } from 'antd';
// import { motion } from 'framer-motion';
// import { useNavigate, Link } from 'react-router-dom';
// import { Mail, Lock, LogIn } from 'lucide-react';
// import { supabase } from '../../lib/supabase';
// // 💡 We only need 'reset' from the store, not fetchUserSession
// import { useAuthStore } from '../../lib/store'; 

// const Login = () => {
//   const { message } = App.useApp();
//   const navigate = useNavigate(); // Keep navigate for the checkSession effect
//   const [form] = Form.useForm();
//   // 💡 Only 'reset' is needed here for the error case
//   const { user, reset } = useAuthStore(); 
//   const [isForgotPassword, setIsForgotPassword] = useState(false);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     // This check for an *existing* session on mount is still correct.
//     const checkSession = async () => {
//       console.log('>>> [LoginPage] Checking for existing session...');
//       const { data: { session } } = await supabase.auth.getSession();
//       if (session) {
//         console.log('>>> [LoginPage] Active session found. Redirecting to dashboard.');
//         // This navigation is fine, as it's for an *already authenticated* user.
//         navigate('/dashboard'); 
//       } else {
//         console.log('>>> [LoginPage] No active session found.');
//       }
//     };
//     checkSession();
//   }, [navigate]);

//   const handleLogin = async (values) => {
//     console.log('>>> [LoginPage] Attempting login...');
//     setLoading(true);
//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email: values.email,
//         password: values.password,
//       });

//       if (error) {
//         console.error('>>> [LoginPage] Login API failed:', error.message);
//         throw error;
//       }

//       if (data.session) {
//         console.log('>>> [LoginPage] Login API SUCCESSFUL. Session received.');
//         console.log('>>> [LoginPage] User ID from session:', data.session.user?.id);
//         message.success('Login successful! Loading your workspace...');

//         // ---------------------------------------------------------
//         // 💡 💡 💡 THE FIX 💡 💡 💡
//         // We REMOVE the navigation call from here.
//         // The AuthGuard's 'onAuthStateChange' listener will
//         // now handle fetching the session and navigating.
//         //
//         // navigate('/dashboard'); // <-- REMOVED
//         // ---------------------------------------------------------

//       } else {
//          console.warn('>>> [LoginPage] Login successful but no session data received?');
//       }
//     } catch (error) {
//       console.error('>>> [LoginPage] Unexpected login error:', error.message);
//       message.error('Login failed. Please check your credentials.');
//       reset(); // This is correct, clear state on failure
//     }
//     setLoading(false);
//   };

//   const handleForgotPassword = async (values) => {
//     console.log('>>> [LoginPage] Attempting password reset...');
//     setLoading(true); 
//     try {
//       const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
//         redirectTo: `${window.location.origin}/reset_password`,
//       });
//       if (error) {
//         console.error('>>> [LoginPage] Password reset API failed:', error.message);
//         throw error;
//       }
//       console.log('>>> [LoginPage] Password reset email sent successfully.');
//       message.success('Password reset email sent. Please check your inbox.');
//     } catch (error) {
//       console.error('>>> [LoginPage] Unexpected password reset error:', error.message);
//       message.error('Failed to send reset email. Please try again.');
//     } finally {
//       setLoading(false); 
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
//       <Space direction="vertical" size="large" className="w-full max-w-md">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5 }}
//         >
//           <Card className="p-4 sm:p-6">
//             <div className="flex justify-center mb-4">
//               <Avatar size={48} className="bg-[#bbdefb] dark:bg-[#37474f] border-2 border-[#40c4ff] dark:border-[#4fc3f7]" />
//             </div>
//             {!isForgotPassword ? (
//               <>
//                 <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
//                 <p className="text-center mb-6">Please enter your details to sign in.</p>
//                 <Form
//                   form={form}
//                   layout="vertical"
//                   onFinish={handleLogin}
//                   requiredMark={false}
//                 >
//                   <Form.Item
//                     label="Email"
//                     name="email"
//                     rules={[
//                       { required: true, message: 'Please enter your email' },
//                       { type: 'email', message: 'Please enter a valid email' },
//                     ]}
//                   >
//                     <Input
//                       prefix={<Mail className="text-gray-400" size={16} />}
//                       suffix={<ArrowRightOutlined className="text-[#40c4ff] dark:text-[#4fc3f7]" />}
//                       placeholder="Email"
//                       size="large"
//                       autoComplete="email"
//                     />
//                   </Form.Item>
//                   <Form.Item
//                     label="Password"
//                     name="password"
//                     rules={[{ required: true, message: 'Please enter your password' }]}
//                   >
//                     <Input.Password
//                       prefix={<Lock className="text-gray-400" size={16} />}
//                       placeholder="Password"
//                       size="large"
//                       autoComplete="current-password"
//                     />
//                   </Form.Item>
//                   <div className="flex justify-between items-center mb-6">
//                     <div></div>
//                     <Button type="link" onClick={() => setIsForgotPassword(true)}>
//                       Forgot password?
//                     </Button>
//                   </div>
//                   <Form.Item>
//                     <Button
//                       type="primary"
//                       htmlType="submit"
//                       size="large"
//                       block
//                       disabled={loading}
//                       loading={loading}
//                       icon={<LogIn size={20} />}
//                     >
//                       Sign In
//                     </Button>
//                   </Form.Item>
//                 </Form>
//               </>
//             ) : (
//               // ... (Forgot password form remains the same) ...
//               <>
//                 <h1 className="text-2xl font-bold text-center mb-2">Forgot Password</h1>
//                 <p className="text-center mb-6">Enter your email to receive a password reset link.</p>
//                 <Form
//                   form={form}
//                   layout="vertical"
//                   onFinish={handleForgotPassword}
//                   requiredMark={false}
//                 >
//                   <Form.Item
//                     label="Email"
//                     name="email"
//                     rules={[
//                       { required: true, message: 'Please enter your email' },
//                       { type: 'email', message: 'Please enter a valid email' },
//                     ]}
//                   >
//                     <Input
//                       prefix={<Mail className="text-gray-400" size={16} />}
//                       suffix={<ArrowRightOutlined className="text-[#40c4ff] dark:text-[#4fc3f7]" />}
//                       placeholder="Email"
//                       size="large"
//                     />
//                   </Form.Item>
//                   <Form.Item>
//                     <Button
//                       type="primary"
//                       htmlType="submit"
//                       size="large"
//                       block
//                       disabled={loading}
//                       loading={loading}
//                       icon={<LogIn size={20} />}
//                     >
//                       Send Reset Link
//                     </Button>
//                   </Form.Item>
//                   <p className="text-center mt-4">
//                     <Button type="link" onClick={() => setIsForgotPassword(false)} loading={loading}>
//                       Back to Sign In
//                     </Button>
//                   </p>
//                 </Form>
//               </>
//             )}
//           </Card>
//         </motion.div>
//       </Space>
//     </div>
//   );
// };

// export default Login;


import React, { useState, useEffect } from 'react';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Form, Input, Card, Space, App, Avatar, Spin } from 'antd';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, LogIn, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import {
  isDevelopment,
  getTenantUrl
} from '@/core/bootstrap/TenantResolver';

interface UserOrganization {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string;
}

const Login = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
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
  const handlePostLoginRedirect = (selectedOrg: { subdomain?: string }) => {
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
        if (targetSubdomain === selectedOrg.subdomain) {
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
    });

    // Small delay to let store update
    await new Promise(resolve => setTimeout(resolve, 100));

    handlePostLoginRedirect(org);
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
        message.success('Login successful!');

        // Fetch user's organizations to determine next step
        const { data: sessionData, error: sessionError } = await supabase
          .schema('identity')
          .rpc('jwt_get_user_session');

        if (sessionError) {
          console.error('[Login] Failed to fetch session data:', sessionError);
          throw sessionError;
        }

        const userOrgs: UserOrganization[] = sessionData?.organizations || [];
        console.log(`[Login] User has ${userOrgs.length} organizations`);

        if (userOrgs.length === 0) {
          message.warning('No organizations found for this account');
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
      message.error(error.message || 'Login failed. Please check your credentials.');
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
      message.success('Password reset email sent.');
    } catch (error: any) {
      message.error('Failed to send reset email.');
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
            {selectingOrg ? 'Connecting to workspace...' : 'Syncing workspace...'}
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
              <h1 className="text-2xl font-bold text-center mb-2">Select Workspace</h1>
              <p className="text-center text-gray-500 mb-6">
                You belong to multiple organizations. Choose one to continue.
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
                    <ArrowRightOutlined />
                  </Button>
                ))}
              </div>

              {redirectTo && (
                <p className="text-sm text-gray-400 mt-6 text-center">
                  You'll be redirected after selection
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
                <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
                <p className="text-center mb-6">Please enter your details to sign in.</p>

                {redirectTo && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4 text-sm text-blue-600 dark:text-blue-300">
                    Sign in to continue to your workspace
                  </div>
                )}

                <Form form={form} layout="vertical" onFinish={handleLogin} requiredMark={false}>
                  <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Please enter a valid email' }]}>
                    <Input prefix={<Mail className="text-gray-400" size={16} />} placeholder="Email" size="large" autoComplete="email" />
                  </Form.Item>
                  <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
                    <Input.Password prefix={<Lock className="text-gray-400" size={16} />} placeholder="Password" size="large" autoComplete="current-password" />
                  </Form.Item>
                  <div className="flex justify-between items-center mb-6">
                    <div></div>
                    <Button type="link" onClick={() => setIsForgotPassword(true)}>Forgot password?</Button>
                  </div>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block disabled={loading} loading={loading} icon={<LogIn size={20} />}>Sign In</Button>
                  </Form.Item>
                </Form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-center mb-2">Forgot Password</h1>
                <Form form={form} layout="vertical" onFinish={handleForgotPassword} requiredMark={false}>
                  <Form.Item label="Email" name="email" rules={[{ required: true }, { type: 'email' }]}>
                    <Input prefix={<Mail size={16} />} placeholder="Email" size="large" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>Send Reset Link</Button>
                  </Form.Item>
                  <p className="text-center mt-4">
                    <Button type="link" onClick={() => setIsForgotPassword(false)}>Back to Sign In</Button>
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