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
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

const Login = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  // Get user from store to know when to redirect
  const { user, reset } = useAuthStore(); 
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true); // New state to track session check

  // 1. REACTIVE REDIRECT: Watch the Store
  // If SessionManager successfully hydrates the user, send them to dashboard automatically.
  useEffect(() => {
    if (user) {
      console.log('>>> [LoginPage] User detected in store. Redirecting to dashboard.');
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // 2. INITIAL CHECK: Look for existing session
  useEffect(() => {
    const checkSession = async () => {
      console.log('>>> [LoginPage] Checking for existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Active session found in Supabase!
        // DO NOT Redirect yet. Wait for SessionManager to sync data to the Store.
        // logic above (Effect #1) will handle the redirect when 'user' appears.
        console.log('>>> [LoginPage] Found session token. Waiting for Store hydration...');
        setIsSyncing(true); 
      } else {
        // No session, show login form.
        console.log('>>> [LoginPage] No session found. Ready for user input.');
        setIsSyncing(false);
      }
    };
    checkSession();
  }, []);

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
        // We do NOT navigate here. 
        // SessionManager will detect the new session, fetch data, update Store.
        // Effect #1 will then trigger the navigation.
      }
    } catch (error: any) {
      console.error('>>> [LoginPage] Error:', error.message);
      message.error('Login failed. Please check your credentials.');
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
  if (isSyncing && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <span className="text-gray-500">Syncing workspace...</span>
        </Space>
      </div>
    );
  }

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
                <Form form={form} layout="vertical" onFinish={handleLogin} requiredMark={false} initialValues={{ email: 'ravi@claritiz.com', password: 'Inno@1234' }}>
                  <Form.Item label="Email" name="email"  rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Please enter a valid email' }]}>
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