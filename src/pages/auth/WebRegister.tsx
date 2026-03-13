import { useState, useEffect } from 'react';
import { notification, Row, Col, Spin, message, Card, Form, Input, Button, List, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Building2, User, Mail, Phone, Search, ArrowRight, CheckCircle2, PlusCircle, Globe } from 'lucide-react';

const { Title, Text } = Typography;

interface SearchResult {
  id: string;
  name: string;
  similarity_score: number;
}

const WebRegister: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SearchResult | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // Auto-fill from URL parameters (e.g. from an invite email sent to a unified.contact)
  useEffect(() => {
    const orgId = searchParams.get('org_id');
    const orgName = searchParams.get('org_name') || 'Your Organization';
    if (orgId) {
      setSelectedAccount({ id: orgId, name: orgName, similarity_score: 1 });
      setStep(2);
    }
  }, [searchParams]);

  const handleSearch = async (value: string) => {
    if (!value || value.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('onboard_search_crm_accounts', {
        p_query: value
      });

      if (error) throw error;
      const results: SearchResult[] = data || [];

      // Allow users to register a brand new organization (Vector C) 
      // if their exact spelling isn't found
      if (value.length > 2 && !results.find(r => r.name.toLowerCase() === value.toLowerCase())) {
        results.push({ id: 'NEW', name: value, similarity_score: 1 });
      }

      setSearchResults(results);
    } catch (error: any) {
      console.error('Search Error:', error);
      message.error('Failed to search accounts');
    } finally {
      setSearching(false);
    }
  };

  const onSelectAccount = (account: SearchResult) => {
    setSelectedAccount(account);
    setStep(2);
  };

  // const onFinish = async (values: any) => {
  //   if (!selectedAccount) return;

  //   setLoading(true);
  //   try {
  //     const modulesParam = searchParams.get('modules');
  //     const requestedModulesList = modulesParam ? modulesParam.split(',') : null;

  //     const payload: any = {
  //       p_admin_first_name: values.firstName,
  //       p_admin_last_name: values.lastName,
  //       p_admin_email: values.email,
  //       p_admin_mobile: values.mobile,
  //       p_requested_modules: requestedModulesList,
  //       p_details: {}
  //     };

  //     if (selectedAccount.id === 'NEW') {
  //       payload.p_org_name = selectedAccount.name;
  //       if (values.domain) {
  //         payload.p_details.domain = values.domain;
  //       }
  //     } else {
  //       // payload.p_unified_org_id = selectedAccount.id;
  //       payload.p_org_name = selectedAccount.name;
  //     }

  //     const { error } = await supabase.rpc('onboard_request_zoworks_account', payload);

  //     if (error) throw error;

  //     message.success(t('core.auth.message.registration_request_success') || 'Registration request submitted! Pending admin approval.');
  //     form.resetFields();
  //     setSelectedAccount(null);
  //     setStep(1);
  //   } catch (error: any) {
  //     console.error('Registration Error:', error);
  //     notification.error({
  //       message: 'Registration Error',
  //       description: error.message || 'An error occurred during registration.'
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };

const onFinish = async (values: any) => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      const modulesParam = searchParams.get('modules');
      const requestedModulesList = modulesParam ? modulesParam.split(',') : [];

      let accountId = selectedAccount.id;

      // 1. Vector C: If it's a brand new organization, create the lead account first
      if (accountId === 'NEW') {
        const { data: leadData, error: leadError } = await supabase.rpc('onboard_create_lead_account', {
          p_org_name: selectedAccount.name,
          p_domain: values.domain || null,
          p_industry: null,
          p_details: {}
        });

        if (leadError) throw leadError;
        if (!leadData?.account_id) throw new Error("Failed to generate lead account ID");
        
        accountId = leadData.account_id;
      }

      // 2. Build the exact payload for the realigned RPC
      const payload = {
        p_account_id: accountId,
        p_admin_first_name: values.firstName,
        p_admin_last_name: values.lastName,
        p_admin_email: values.email,
        p_admin_mobile: values.mobile || null,
        p_requested_modules: requestedModulesList,
        p_details: {}
      };

      // 3. Submit the main onboarding request
      const { error } = await supabase.rpc('onboard_request_zoworks_account', payload);

      if (error) throw error;

      message.success("Thanks we will get back - after web registration" ||t('core.auth.message.registration_request_success') || 'Registration request submitted! Pending admin approval.');
      form.resetFields();
      setSelectedAccount(null);
      setStep(1);
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
      <Card className="w-full max-w-lg shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="text-center mb-8">
          <Title level={2}>{t('core.auth.label.registration')}</Title>
          <p className="text-gray-500 mt-2">
            {t('core.auth.label.already_registered')}{' '}
            <Link to={'/login'} className="text-primary hover:underline font-semibold">{t('core.auth.action.login_here')}</Link>
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4">
              <Text className="text-blue-700 flex items-center gap-2">
                <Search size={16} /> Search for your organization to begin registration.
              </Text>
            </div>

            <Input.Search
              placeholder="Enter organization name (e.g. Acme Corp)"
              enterButton={<Button type="primary" icon={<Search size={16} />}>Search</Button>}
              size="large"
              loading={searching}
              onSearch={handleSearch}
              className="mb-4"
            />

            <List
              dataSource={searchResults}
              renderItem={(item) => (
                <List.Item
                  onClick={() => onSelectAccount(item)}
                  className="cursor-pointer hover:bg-gray-50 p-4 rounded-lg border border-gray-100 mb-2 group transition-all"
                  extra={<ArrowRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />}
                >
                  <List.Item.Meta
                    avatar={item.id === 'NEW' ? <PlusCircle className="text-green-500 mt-1" /> : <Building2 className="text-primary mt-1" />}
                    title={<Text strong>{item.id === 'NEW' ? `Register new organization` : item.name}</Text>}
                    description={<Text type="secondary" className="text-xs">{item.id === 'NEW' ? `Establish '${item.name}' as a new tenant` : 'Matched from existing records'}</Text>}
                  />
                </List.Item>
              )}
              locale={{ emptyText: searching ? 'Searching...' : 'Search for an account to start' }}
            />
          </div>
        ) : (
          <Spin spinning={loading}>
            <div className="mb-6">
              {!searchParams.get('org_id') && (
                <Button type="link" onClick={() => setStep(1)} className="p-0 mb-4 text-gray-500 hover:text-primary">
                  ← Back to search
                </Button>
              )}
              <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded shadow-sm">
                    <Building2 size={24} className="text-primary" />
                  </div>
                  <div>
                    <Text strong className="block text-lg">{selectedAccount?.name}</Text>
                    <Text type="secondary" className="text-xs">{selectedAccount?.id === 'NEW' ? 'New Tenant Registration' : 'Selected Organization'}</Text>
                  </div>
                </div>
                <CheckCircle2 size={20} className="text-green-500" />
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              className="mt-4"
            >
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6">
                <h3 className="text-sm font-semibold mb-5 flex items-center gap-2 text-gray-800">
                  <User size={18} className="text-primary" /> Administrator Details
                </h3>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="First Name"
                      name="firstName"
                      rules={[{ required: true, message: 'Please enter first name' }]}
                    >
                      <Input placeholder="John" className="rounded-lg h-10" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Last Name"
                      name="lastName"
                      rules={[{ required: true, message: 'Please enter last name' }]}
                    >
                      <Input placeholder="Doe" className="rounded-lg h-10" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  label="Email Address"
                  name="email"
                  rules={[
                    { required: true, message: 'Please enter email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input prefix={<Mail size={16} className="text-gray-400" />} placeholder="john@example.com" className="rounded-lg h-10" />
                </Form.Item>
                <Form.Item
                  label="Mobile Number"
                  name="mobile"
                  rules={[{ required: false, message: 'Please enter mobile number' }]}
                  className="mb-0"
                >
                  <Input prefix={<Phone size={16} className="text-gray-400" />} placeholder="+1234567890" className="rounded-lg h-10" />
                </Form.Item>

                {selectedAccount?.id === 'NEW' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-gray-800">
                      <Building2 size={18} className="text-primary" /> Organization Details
                    </h3>
                    <Form.Item
                      label="Website Domain"
                      name="domain"
                      rules={[{ required: false, message: 'Please enter company website' }]}
                      className="mb-0"
                    >
                      <Input prefix={<Globe size={16} className="text-gray-400" />} placeholder="acmecorp.com" className="rounded-lg h-10" />
                    </Form.Item>
                  </div>
                )}
              </div>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                  className="h-12 text-md font-semibold rounded-lg shadow-md shadow-primary/20"
                >
                  Submit Registration Request
                </Button>
              </Form.Item>
            </Form>
          </Spin>
        )}
      </Card>
    </div>
  );
};

export default WebRegister;
