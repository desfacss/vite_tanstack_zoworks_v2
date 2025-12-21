import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, message, Row, Col, Typography } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import DetailsAndSettingsForm from './DetailsAndSettingsForm';
const { Title } = Typography;
const { Option } = Select;

interface OrganizationDetails {
  id: string;
  name: string;
  app_settings: {
    name?: string;
    workspace?: string;
    custom_domain?: string;
    multi_branch?: {
      enabled?: boolean;
      branch_count?: number;
    };
    business_user_count?: number;
    support?: { // 💡 Added support object
      email?: {
        email?: string;
        fromName?: string;
      };
      whatsapp?: {
        wabaId?: string;
        phoneNumberId?: string;
        displayPhoneNumber?: string;
        accessTokenEncrypted?: string;
      };
    };
  };
  details: {
    zip?: number;
    address?: string;
    country?: string;
    contact_email?: string;
    contact_number?: number;
    contact_person?: string;
  };
  settings: {
    localization: {
      currency?: string;
      time_zone?: string;
      date_format?: string;
      time_format?: string;
      week_start_day?: string;
    };
    holidays?: { date: string; name: string }[];
  };
}

const OrganizationSetup: React.FC = () => {
  const { organization, user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [organizationData, setOrganizationData] = useState<OrganizationDetails | null>(null);

  const isSassAdmin = user?.roles?.name === 'SassAdmin';

  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!organization?.id) return;

      const { data, error } = await supabase
        .schema('identity').from('organizations')
        .select('*')
        .eq('id', organization.id)
        .single();

      if (error) {
        message.error('Error fetching organization data');
      } else {
        console.log('Fetched organization data:', data);
        setOrganizationData(data);
        const initialValues = {
          name: data.name,
          app_settings: data.app_settings || {},
          details: data.details || {},
          settings: {
            localization: data.settings?.localization || {},
            holidays: data.settings?.holidays || [],
          },
        };
        form.setFieldsValue(initialValues);
        console.log('Set form values:', initialValues);
      }
    };

    fetchOrganizationData();
  }, [organization?.id, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    console.log('Form values on submit:', values);

    // 💡 Fetch current data to merge with
    const { data: currentOrg, error: fetchError } = await supabase
      .schema('identity').from('organizations')
      .select('app_settings, settings, details')
      .eq('id', organization?.id)
      .single();

    if (fetchError) {
      setLoading(false);
      console.error('Supabase fetch error:', fetchError);
      message.error('Error fetching current organization data: ' + fetchError.message);
      return;
    }

    const holidays = values.settings?.holidays || [];

    // 💡 Merge current app_settings with new form values
    const mergedAppSettings = {
      ...(currentOrg?.app_settings || {}),
      ...values.app_settings,
    };
    
    // 💡 Merge current settings with new form values
    const mergedSettings = {
        ...(currentOrg?.settings || {}),
        localization: {
            ...(currentOrg?.settings?.localization || {}),
            ...values.settings?.localization,
        },
        holidays: holidays,
    };
    
    // 💡 Merge current details with new form values
    const mergedDetails = {
        ...(currentOrg?.details || {}),
        ...values.details,
    };

    const payload: Partial<OrganizationDetails> = {
      name: values.name,
      updated_at: new Date().toISOString(),
      details: mergedDetails,
      settings: mergedSettings,
      app_settings: mergedAppSettings,
    };

    console.log('Submitting payload:', payload);

    const { error } = await supabase
      .schema('identity').from('organizations')
      .update(payload)
      .eq('id', organization?.id);

    setLoading(false);

    if (error) {
      console.error('Supabase error:', error);
      message.error('Error updating organization: ' + error.message);
    } else {
      message.success('Organization updated successfully');
      const { data } = await supabase
        .schema('identity').from('organizations')
        .select('*')
        .eq('id', organization?.id)
        .single();
      console.log('Post-update data:', data);
    }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>

      {/* App Settings Section */}
      <div>
        <Title level={4}>App Settings</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="App Name"
              name={['app_settings', 'name']}
              rules={[{ required: isSassAdmin, message: 'App Name is required' }]}
            >
              <Input placeholder="App Name" disabled={!isSassAdmin} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Workspace"
              name={['app_settings', 'workspace']}
              rules={[{ required: isSassAdmin, message: 'Workspace is required' }]}
            >
              <Input placeholder="Workspace" disabled={!isSassAdmin} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Custom Domain"
              name={['app_settings', 'custom_domain']}
            >
              <Input placeholder="Custom Domain" disabled={!isSassAdmin} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Multi Branch Enabled"
              name={['app_settings', 'multi_branch', 'enabled']}
            >
              <Select disabled={!isSassAdmin}>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Branch Count"
              name={['app_settings', 'multi_branch', 'branch_count']}
            >
              <Input type="number" disabled={!isSassAdmin} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Business User Count"
              name={['app_settings', 'business_user_count']}
            >
              <Input type="number" disabled={!isSassAdmin} />
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* Details and Settings Section */}
      <DetailsAndSettingsForm form={form} disabled={!isSassAdmin} isLocation={false} />

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save
        </Button>
      </Form.Item>
    </Form>
  );
};

export default OrganizationSetup;