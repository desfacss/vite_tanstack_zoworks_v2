// src/components/pages/Settings/DetailsAndSettingsForm.tsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Row, Col, Table, Button, DatePicker, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../@/core/lib/store';
const { Title } = Typography;

const { Option } = Select;

interface Holiday {
  date: string | null;
  name: string;
  day: string;
}

interface DetailsAndSettingsFormProps {
  form: any; // Ant Design Form instance
  disabled?: boolean;
  isLocation?: boolean; // 💡 Added isLocation prop
}

const DetailsAndSettingsForm: React.FC<DetailsAndSettingsFormProps> = ({ form, disabled, isLocation }) => {
  const { organization } = useAuthStore();
  console.log('Organization settings:', organization);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Load holidays from form values
  const loadHolidays = () => {
    const formHolidays = form.getFieldValue(['settings', 'holidays']);
    // console.log('Form holidays value:', formHolidays);
    const initialHolidays = Array.isArray(formHolidays)
      ? formHolidays.map((h: any) => ({
          date: h.date || null,
          name: h.name || '',
          day: h.date ? dayjs(h.date, 'YYYY-MM-DD').format('dddd') : '',
        }))
      : [];
    if (JSON.stringify(initialHolidays) !== JSON.stringify(holidays)) {
      setHolidays(initialHolidays);
      // console.log('Initialized holidays:', initialHolidays);
    }
  };

  // Initialize and sync holidays
  useEffect(() => {
    // Load holidays immediately
    loadHolidays();

    // Poll form values to catch async parent updates
    const timer = setInterval(() => {
      const formHolidays = form.getFieldValue(['settings', 'holidays']);
      if (Array.isArray(formHolidays) && formHolidays.length > 0 && holidays.length === 0) {
        // console.log('Polled form holidays:', formHolidays);
        loadHolidays();
      }
    }, 500);

    // Stop polling after 5 seconds
    const stopPolling = setTimeout(() => clearInterval(timer), 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(stopPolling);
    };
  }, [form]);

  // Sync holidays to form when state changes
  useEffect(() => {
    const holidaysForForm = holidays.map(h => ({
      date: h.date,
      name: h.name,
    }));
    form.setFieldsValue({
      settings: {
        holidays: holidaysForForm,
      },
    });
    // console.log('Synced holidays to form:', holidaysForForm);
  }, [holidays]);

  // Debug form field values
  useEffect(() => {
    const holidaysValue = form.getFieldValue(['settings', 'holidays']);
    console.log('Current holidays in form:', holidaysValue);
  }, [form, holidays]);

  const handleHolidayChange = (index: number, field: keyof Holiday, value: any) => {
    const updatedHolidays = [...holidays];
    updatedHolidays[index][field] = value;
    if (field === 'date' && value) {
      updatedHolidays[index].date = dayjs(value).format('YYYY-MM-DD');
      updatedHolidays[index].day = dayjs(value).format('dddd');
    } else if (field === 'date' && !value) {
      updatedHolidays[index].date = null;
      updatedHolidays[index].day = '';
    }
    setHolidays(updatedHolidays);
    // console.log('Changed holiday at index', index, ':', updatedHolidays[index]);
  };

  const addHoliday = () => {
    const newHoliday = { date: null, name: '', day: '' };
    setHolidays([...holidays, newHoliday]);
    // console.log('Added new holiday:', newHoliday);
  };

  const handleHolidayDelete = (index: number) => {
    setHolidays(holidays.filter((_, i) => i !== index));
    // console.log('Deleted holiday at index:', index);
  };

  const holidayColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: Holiday, index: number) => (
        <Input
          value={record.name}
          onChange={(e) => handleHolidayChange(index, 'name', e.target.value)}
          disabled={disabled}
        />
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (_: any, record: Holiday, index: number) => (
        <DatePicker
          value={record.date ? dayjs(record.date, 'YYYY-MM-DD') : null}
          format="YYYY-MM-DD"
          onChange={(date, dateString) => handleHolidayChange(index, 'date', dateString)}
          disabled={disabled}
        />
      ),
    },
    {
      title: 'Day',
      dataIndex: 'day',
      key: 'day',
      render: (_: any, record: Holiday) => <Input value={record.day} disabled />,
    },
    {
      title: 'Actions',
      render: (_: any, __: any, index: number) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleHolidayDelete(index)}
          disabled={disabled}
        />
      ),
    },
  ];

  return (
    <div>
      {/* Hidden Form.Item to track holidays */}
      <Form.Item name={['settings', 'holidays']} noStyle>
        <Input type="hidden" />
      </Form.Item>

      <Title level={4}>Details</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="Address"
            name={['details', 'address']}
            rules={[{ required: true, message: 'Address is required' }]}
          >
            <Input placeholder="Address" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="Zip"
            name={['details', 'zip']}
            rules={[{ required: true, message: 'Zip is required' }]}
          >
            <Input placeholder="Zip" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="Country"
            name={['details', 'country']}
            rules={[{ required: true, message: 'Country is required' }]}
          >
            <Input placeholder="Country" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="Contact Person"
            name={['details', 'contact_person']}
            rules={[{ required: true, message: 'Contact Person is required' }]}
          >
            <Input placeholder="Contact Person" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="Contact Email"
            name={['details', 'contact_email']}
            rules={[
              { required: true, message: 'Contact Email is required' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Contact Email" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="Contact Number"
            name={['details', 'contact_number']}
            rules={[{ required: true, message: 'Contact Number is required' }]}
          >
            <Input placeholder="Contact Number" />
          </Form.Item>
        </Col>
      </Row>

      {/* Conditionally render Settings for Organization and Holidays for Location */}
      {(
        <>
        {!isLocation && (<>
          <Title level={4}>Settings</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Currency"
                name={['settings', 'localization', 'currency']}
                rules={[{ required: true, message: 'Currency is required' }]}
              >
                <Select placeholder="Select currency" disabled={disabled}>
                  <Option value="INR">INR</Option>
                  <Option value="USD">USD</Option>
                  <Option value="GBP">GBP</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Time Zone"
                name={['settings', 'localization', 'time_zone']}
                rules={[{ required: true, message: 'Time Zone is required' }]}
              >
                <Select placeholder="Select time zone" disabled={disabled}>
                  <Option value="GMT+5:30">GMT+5:30</Option>
                  <Option value="UTC">UTC</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Date Format"
                name={['settings', 'localization', 'date_format']}
                rules={[{ required: true, message: 'Date Format is required' }]}
              >
                <Select placeholder="Select date format" disabled={disabled}>
                  <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                  <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Time Format"
                name={['settings', 'localization', 'time_format']}
                rules={[{ required: true, message: 'Time Format is required' }]}
              >
                <Select placeholder="Select time format" disabled={disabled}>
                  <Option value="12-hour">12-hour</Option>
                  <Option value="24-hour">24-hour</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Work Week Start"
                name={['settings', 'localization', 'week_start_day']}
                rules={[{ required: true, message: 'Work Week Start is required' }]}
              >
                <Select placeholder="Select work week start" disabled={disabled}>
                  <Option value="Monday">Monday</Option>
                  <Option value="Sunday">Sunday</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          </>)}
          <Title level={4}>Support</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Email"
                name={['app_settings', 'support', 'email', 'email']}
                rules={[
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input placeholder="Support Email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="From Name"
                name={['app_settings', 'support', 'email', 'fromName']}
              >
                <Input placeholder="Support From Name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="WhatsApp WABA ID"
                name={['app_settings', 'support', 'whatsapp', 'wabaId']}
              >
                <Input placeholder="WhatsApp WABA ID" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="WhatsApp Phone Number ID"
                name={['app_settings', 'support', 'whatsapp', 'phoneNumberId']}
              >
                <Input placeholder="WhatsApp Phone Number ID" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="WhatsApp Display Number"
                name={['app_settings', 'support', 'whatsapp', 'displayPhoneNumber']}
              >
                <Input placeholder="WhatsApp Display Number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="WhatsApp Access Token"
                name={['app_settings', 'support', 'whatsapp', 'accessTokenEncrypted']}
              >
                <Input.Password placeholder="WhatsApp Access Token" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {isLocation && (
        <>
          <Title level={4}>Holidays</Title>
          <Table
            dataSource={holidays}
            columns={holidayColumns}
            rowKey={(record) => `${record.date}-${record.name}`}
            pagination={false}
          />
          <Button
            onClick={addHoliday}
            type="dashed"
            style={{ marginTop: '16px' }}
            disabled={disabled}
          >
            Add Holiday
          </Button>
        </>
      )}
    </div>
  );
};

export default DetailsAndSettingsForm;