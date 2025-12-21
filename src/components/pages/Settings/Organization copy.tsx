import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, message, Row, Col } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

const { Option } = Select;

interface OrganizationDetails {
  name: string;
  details?: {
    organizationLogo?: string | null;
    organizationAddress?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    primaryContact?: {
      contactName?: string;
      email?: string;
      phone?: string;
    };
    domainSettings?: {
      customDomain?: string;
      loginURL?: string;
      logoutRedirectURL?: string;
    };
    regionalSettings?: {
      baseCurrency?: string;
      supportedCurrencies?: string[];
      baseTimezone?: string;
      allowedTimezones?: string[];
      dateFormat?: string;
      timeFormat?: string;
      workWeekStartDay?: string;
    };
  };
}

const OrganizationSetup: React.FC = () => {
  const { organization } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [organizationData, setOrganizationData] = useState<OrganizationDetails | null>(null);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!organization?.id) return;

      const { data, error } = await supabase
        .schema('identity').from('organizations')
        .select('*')
        .eq('id', organization.id)
        .single();
console.log("org",data)
      if (error) {
        message.error('Error fetching organization data');
      } else {
        setOrganizationData(data);
        form.setFieldsValue({
          name: data.name,
          street: data.details?.organizationAddress?.street,
          city: data.details?.organizationAddress?.city,
          state: data.details?.organizationAddress?.state,
          country: data.details?.organizationAddress?.country,
          postalCode: data.details?.organizationAddress?.postalCode,
          contactName: data.details?.primaryContact?.contactName,
          email: data.details?.primaryContact?.email,
          phone: data.details?.primaryContact?.phone,
          customDomain: data.details?.domainSettings?.customDomain,
          baseCurrency: data.details?.regionalSettings?.baseCurrency,
          baseTimezone: data.details?.regionalSettings?.baseTimezone,
          workWeekStartDay: data.details?.regionalSettings?.workWeekStartDay,
        });
      }
    };

    fetchOrganizationData();
  }, [organization?.id, form]);

  const onFinish = async (values: any) => {
    setLoading(true);

    const organizationDetails = {
      name: values.name,
      organizationAddress: {
        street: values.street,
        city: values.city,
        state: values.state,
        country: values.country,
        postalCode: values.postalCode,
      },
      primaryContact: {
        contactName: values.contactName,
        email: values.email,
        phone: values.phone,
      },
      domainSettings: {
        customDomain: values.customDomain,
      },
      regionalSettings: {
        baseCurrency: values.baseCurrency,
        baseTimezone: values.baseTimezone,
        workWeekStartDay: values.workWeekStartDay,
      },
    };

    const { error } = await supabase
      .schema('identity').from('organizations')
      .update({
        name: values.name,
        details: organizationDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organization?.id);

    setLoading(false);

    if (error) {
      message.error('Error updating organization');
    } else {
      message.success('Organization updated successfully');
    }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="Organization Name"
            name="name"
            rules={[{ required: true, message: 'Please input the organization name' }]}
          >
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="Street"
            name="street"
            rules={[{ required: true, message: 'Street is required' }]}
          >
            <Input placeholder="Street" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="City"
            name="city"
            rules={[{ required: true, message: 'City is required' }]}
          >
            <Input placeholder="City" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="State"
            name="state"
            rules={[{ required: true, message: 'State is required' }]}
          >
            <Input placeholder="State" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="Country"
            name="country"
            rules={[{ required: true, message: 'Country is required' }]}
          >
            <Input placeholder="Country" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="Postal Code"
            name="postalCode"
            rules={[{ required: true, message: 'Postal Code is required' }]}
          >
            <Input placeholder="Postal Code" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="Contact Name"
            name="contactName"
            rules={[{ required: true, message: 'Contact Name is required' }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="Email Address"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Please input a valid email address' }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="Phone Number"
            name="phone"
            rules={[{ required: true, message: 'Phone Number is required' }]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Custom Domain" name="customDomain">
            <Input disabled placeholder="e.g., orgname.appdomain.com or customdomain.com" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="Base Currency"
            name="baseCurrency"
            rules={[{ required: true, message: 'Please select the base currency' }]}
          >
            <Select disabled placeholder="Select currency">
              <Option value="GBP">GBP</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="Base Timezone"
            name="baseTimezone"
            rules={[{ required: true, message: 'Please select the base timezone' }]}
          >
            <Select disabled placeholder="Select timezone">
              <Option value="UK">UK</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Work Week Start Day" name="workWeekStartDay">
            <Select disabled>
              <Option value="Monday">Mon</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save
        </Button>
      </Form.Item>
    </Form>
  );
};

export default OrganizationSetup;