import { useState } from 'react';
import { notification, Row, Col, Spin, message, Card, Form, Input, Button } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Building2, User, Mail, Phone, Globe } from 'lucide-react';

const PREFILL_DATA = {
  orgName: "Testing Org " + Math.floor(Math.random() * 1000),
  workspace: "testorg" + Math.floor(Math.random() * 1000),
  fullName: "John Tester",
  email: `test${Math.floor(Math.random() * 1000)}@example.com`,
  mobile: "919999999999"
};

const WebRegister: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);

  const onFinish = async (values: typeof PREFILL_DATA) => {
    setLoading(true);
    try {
      // Step 1: Create a "Shell" organization in identity.organizations
      // This is necessary to satisfy foreign key constraints in crm.accounts
      const { data: orgData, error: orgError } = await supabase
        .schema('identity')
        .from('organizations')
        .insert([
          {
            name: values.orgName,
            subdomain: values.workspace.toLowerCase(),
            is_active: false, // Inactive until approved
            details: {
              registration_source: 'web_register',
              requested_at: new Date().toISOString(),
              admin_contact: {
                fullName: values.fullName,
                email: values.email,
                mobile: values.mobile
              }
            }
          }
        ])
        .select()
        .single();

      if (orgError) throw orgError;

      const orgId = orgData.id;

      // Step 1.5: Create record in unified.organizations (To satisfy crm.accounts FK)
      const { error: unifiedError } = await supabase
        .schema('unified')
        .from('organizations')
        .insert([
          {
            id: orgId,
            organization_id: orgId,
            name: values.orgName,
            status: 'requested',
            details: {
              registration_source: 'web_register',
              requested_at: new Date().toISOString()
            }
          }
        ]);

      if (unifiedError) throw unifiedError;

      // Step 2: Insert into crm.accounts (Linked to the shell organization)
      const { data: accountData, error: accountError } = await supabase
        .schema('crm')
        .from('accounts')
        .insert([
          {
            id: orgId, // Use the same ID if possible, or link via organization_id
            name: values.orgName,
            organization_id: orgId,
            short_code: values.workspace.toLowerCase(),
            status: 'requested',
            intent_category: 'ONBOARDING_PENDING',
            details: {
              source: 'web_register',
              requested_at: new Date().toISOString()
            }
          }
        ])
        .select()
        .single();

      if (accountError) throw accountError;

      // Step 3: Insert into crm.contacts (Linked to the shell organization)
      const { error: contactError } = await supabase
        .schema('crm')
        .from('contacts')
        .insert([
          {
            name: values.fullName,
            email: values.email,
            phone: values.mobile,
            account_id: accountData.id,
            organization_id: orgId,
            status: 'requested',
            intent_category: 'ONBOARDING_PENDING',
            details: {
              source: 'web_register',
              requested_at: new Date().toISOString()
            }
          }
        ]);

      if (contactError) throw contactError;

      message.success(t('core.auth.message.registration_request_success') || 'Registration request submitted successfully! Pending admin approval.');
      form.resetFields();
    } catch (error: any) {
      console.error('Registration Error:', error);
      notification.error({ 
        message: 'Registration Error',
        description: error.message || 'An error occurred during registration.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg shadow-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">{t('core.auth.label.registration')}</h2>
          <p className="text-gray-500 mt-2">
            {t('core.auth.label.already_registered')}{' '}
            <Link to={'/login'} className="text-primary hover:underline">{t('core.auth.action.login_here')}</Link>
          </p>
        </div>

        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={PREFILL_DATA}
            requiredMark={false}
          >
            <div className="bg-gray-50/50 p-4 rounded-lg mb-6 border border-gray-100">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Building2 size={16} /> Organization Information
              </h3>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Organization Name"
                    name="orgName"
                    rules={[{ required: true, message: 'Please enter organization name' }]}
                  >
                    <Input prefix={<Building2 size={16} className="text-gray-400" />} placeholder="Acme Inc" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Workspace (Subdomain)"
                    name="workspace"
                    rules={[{ required: true, message: 'Please enter workspace name' }]}
                  >
                    <Input prefix={<Globe size={16} className="text-gray-400" />} placeholder="acme" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-lg mb-6 border border-gray-100">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <User size={16} /> Admin User Information
              </h3>
              <Form.Item
                label="Full Name"
                name="fullName"
                rules={[{ required: true, message: 'Please enter full name' }]}
              >
                <Input prefix={<User size={16} className="text-gray-400" />} placeholder="John Doe" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Email Address"
                    name="email"
                    rules={[
                      { required: true, message: 'Please enter email' },
                      { type: 'email', message: 'Please enter a valid email' }
                    ]}
                  >
                    <Input prefix={<Mail size={16} className="text-gray-400" />} placeholder="john@example.com" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Mobile Number"
                    name="mobile"
                    rules={[{ required: true, message: 'Please enter mobile number' }]}
                  >
                    <Input prefix={<Phone size={16} className="text-gray-400" />} placeholder="919999999999" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                Submit Registration Request
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default WebRegister;
