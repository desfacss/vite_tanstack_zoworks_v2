import React, { useEffect, useState } from 'react';
import { notification, Row, Col, Spin, message } from 'antd';
import { useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import DynamicForm from '../../core/components/DynamicForm';

interface FormSchema {
  id: string;
  name: string;
  [key: string]: any;
}

interface Role {
  id: string;
  role_name: string;
  [key: string]: any;
}

interface FormValues {
  email: string;
  password: string;
  retypePassword?: string;
  orgName?: string;
  role?: string;
  mobile?: string | number;
  workspace?: string;
  [key: string]: any;
}

const WebRegister: React.FC = () => {
  const location = useLocation();
  const [signIn, setSignIn] = useState<boolean>(false);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const getForms = async () => {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('name', 'web_admin_registration_form')
      .single();

    if (error) {
      console.error('Error fetching form schema:', error);
      return;
    }
    if (data) {
      setSchema(data);
    }
  };

  const getRoles = async () => {
    const { data, error } = await supabase.schema('identity').from('roles').select('*');
    console.log("rol", data);
    if (error) {
      console.error('Error fetching roles:', error);
      return;
    }
    if (data) {
      setRoles(data);
    }
  };

  useEffect(() => {
    getForms();
    getRoles();
  }, []);

  const surveyLayout = location.pathname.startsWith('/survey');
  //   const PREFIX_PATH = surveyLayout ? SURVEY_PREFIX_PATH : APP_PREFIX_PATH;

  const onFinish = async (values: FormValues) => {
    if (values?.password !== values?.retypePassword) {
      message.error("Password doesn't match");
      return;
    }
    setLoading(true);

    let user_id: string | null = null;
    let org_id: string | null = null;
    const orgName = values?.orgName;
    const userName = orgName ? `${orgName} ${values?.role}` : 'User';

    try {
      // Step 1: Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: values?.email,
        password: values?.password,
        options: {
          data: {
            display_name: userName,
            phone: values?.mobile ? String(values.mobile) : '',
            email_confirmed_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        setSignIn(true);
        notification.error({ message: error.message || 'Registration Error' });
        return;
      }

      if (data?.user) {
        user_id = data.user.id;

        // Step 2: Insert organization
        const { data: orgData, error: insertError2 } = await supabase
          .schema('identity').from('organizations')
          .insert([
            {
              auth_id: user_id,
              name: orgName || 'Dev',
              subdomain: values?.workspace?.toLowerCase() || 'dev',
              details: { name: orgName || '' },
              app_settings: {
                name: orgName?.toLowerCase().replace(/\s+/g, '_') || 'dev',
                workspace: values?.workspace?.toLowerCase() || 'dev',
              },
            },
          ])
          .select();

        if (insertError2) {
          throw new Error(insertError2.message || 'Error inserting organization');
        }

        if (orgData?.length > 0) {
          org_id = orgData[0].id;

          // Step 3: Insert user
          const { error: insertError3 } = await supabase.schema('identity').from('users').insert([
            {
              id: user_id,
              auth_id: user_id,
              organization_id: org_id,
              details: { ...values, user_name: orgName },
              name: userName,
              role_id: roles?.find((i) => i.name === values?.role)?.id,
              // role_type: values?.role,
              password_confirmed: true,
            },
          ]);

          if (insertError3) {
            throw new Error(insertError3.message || 'Error inserting user');
          }
        }

        message.success('Successfully registered!');
      }
    } catch (error: any) {
      // Rollback logic
      if (user_id) {
        // Delete the authenticated user
        await supabase.rpc('auth_user_rollback', { user_id });
        console.log('Rollback auth');

        // Delete the organization if it was created
        if (org_id) {
          console.log('Rollback org');
          // await supabase.from('organizations').delete().eq('id', org_id);
          await supabase.schema('identity').from('organizations').delete().eq('id', org_id);
        }

        console.log('Rollback user');
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) {
          notification.error({ message: 'Error signing out' });
          return;
        }
        await supabase.schema('identity').from('users').delete().eq('id', user_id);
      }

      notification.error({ message: error.message || 'Registration Error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <Row>
          <Col offset={10}>
            <Spin size="large" />
          </Col>
        </Row>
      ) : (
        <>
          <h2 className="mb-4">User Registration</h2>
          <p>
            Already Registered?{' '}
            <Link to={'/login'}>Login here...</Link>
          </p>
          {schema ? (
            <DynamicForm schemas={schema} onFinish={onFinish} />
          ) : (
            <Row>
              <Col offset={10}>
                <Spin size="large" />
              </Col>
            </Row>
          )}
          {signIn && (
            <>
              User email already added! Please{' '}
              <Link to={'/login'}>Login and Continue</Link>
              <br />
              <br />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default WebRegister;