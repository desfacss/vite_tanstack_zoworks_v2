import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  notification,
  Table,
  Drawer,
  Form,
  Modal,
  Grid,
  Input,
} from 'antd';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import DetailsAndSettingsForm from './DetailsAndSettingsForm';
import Utils from './utils';

const { confirm } = Modal;
const { useBreakpoint } = Grid;

interface Location {
  id: string;
  name: string;
  short_code?: string;
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
  app_settings: {
    support?: {
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
  organization_id: string;
}

const LocationSettings: React.FC = () => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [editItem, setEditItem] = useState<Location | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [form] = Form.useForm();
  const { organization } = useAuthStore();

  const screens = Utils.getBreakPoint(useBreakpoint());
  const isMobile = screens.length === 0 ? false : !screens.includes('lg');

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .schema('identity')
      .from('locations')
      .select('*, app_settings')
      .eq('organization_id', organization?.id)
      .order('name', { ascending: true });

    if (error) {
      notification.error({ message: error.message || 'Failed to fetch locations' });
    } else if (data) {
      console.log('Fetched locations:', data);
      setLocations(data);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchLocations();
    }
  }, [organization?.id]);

  const handleEdit = (record: Location) => {
    setEditItem(record);
    const initialValues = {
      name: record?.name,
      short_code: record?.short_code,
      details: record?.details || {},
      settings: {
        localization: record?.settings?.localization || {},
        holidays: record?.settings?.holidays || [],
      },
      app_settings: record?.app_settings || {},
    };
    form.setFieldsValue(initialValues);
    console.log('Set form values for edit:', initialValues);
    setIsDrawerOpen(true);
  };

  const showDeleteConfirm = (record: Location) => {
    confirm({
      title: `Confirm deletion of ${record.name} ?`,
      icon: <AlertCircle size={20} style={{ color: '#faad14' }} />,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        const { error } = await supabase
          .schema('identity')
          .from('locations')
          .delete()
          .eq('id', record.id);

        if (error) {
          notification.error({ message: error.message || 'Failed to delete location' });
        } else {
          notification.success({ message: 'Location deleted' });
          fetchLocations();
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('Form values on submit:', values);

      const { data: currentLocation, error: fetchError } = await supabase
        .schema('identity')
        .from('locations')
        .select('app_settings, settings, details')
        .eq('id', editItem?.id)
        .single();

      if (fetchError) {
        notification.error({
          message: 'Failed to fetch current location data: ' + fetchError.message,
        });
        return;
      }

      const holidays = values?.settings?.holidays || [];

      const mergedAppSettings = {
        ...(currentLocation?.app_settings || {}),
        ...values.app_settings,
      };

      const mergedSettings = {
        ...(currentLocation?.settings || {}),
        localization: {
          ...(currentLocation?.settings?.localization || {}),
          ...values.settings?.localization,
        },
        holidays: holidays,
      };

      const mergedDetails = {
        ...(currentLocation?.details || {}),
        ...values.details,
      };

      const payload = {
        name: values.name,
        short_code: values?.short_code,
        details: mergedDetails,
        settings: mergedSettings,
        app_settings: mergedAppSettings,
        organization_id: organization?.id,
      };

      console.log('Submitting payload:', payload);

      if (editItem) {
        const { error } = await supabase
          .schema('identity')
          .from('locations')
          .update(payload)
          .eq('id', editItem.id);

        if (error) {
          console.error('Supabase error:', error);
          notification.error({
            message: error.message || 'Failed to update location',
          });
        } else {
          notification.success({ message: 'Location updated successfully' });
          fetchLocations();
          setIsDrawerOpen(false);
          form.resetFields();
        }
      } else {
        const { error } = await supabase
          .schema('identity')
          .from('locations')
          .insert(payload);

        if (error) {
          console.error('Supabase error:', error);
          notification.error({ message: error.message || 'Failed to add location' });
        } else {
          notification.success({ message: 'Location added successfully' });
          fetchLocations();
          setIsDrawerOpen(false);
          form.resetFields();
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      notification.error({
        message: 'Failed to validate form. Please check all fields.',
      });
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Short Code',
      dataIndex: 'short_code',
      key: 'short_code',
    },
    {
      title: 'Address',
      dataIndex: ['details', 'address'],
      key: 'address',
    },
    {
      title: 'Zip',
      dataIndex: ['details', 'zip'],
      key: 'zip',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Location) => (
        <div className="d-flex" style={{ gap: 8 }}>
          <Button
            type="primary"
            icon={<Pencil size={14} />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button
            type="primary"
            ghost
            icon={<Trash2 size={14} />}
            size="small"
            onClick={() => showDeleteConfirm(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <Card styles={{ body: { padding: '0px' } }}>
      <div
        className="d-flex p-2 justify-content-between align-items-center"
        style={{ marginBottom: '16px' }}
      >
        <h2 className="text-h2 !m-0">Locations</h2>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setIsDrawerOpen(true)}
        >
          Add Location
        </Button>
      </div>
      <div className="table-responsive" ref={componentRef}>
        <Table
          size="small"
          columns={columns}
          dataSource={locations}
          rowKey={(record) => record.id}
          loading={!locations.length}
          pagination={false}
        />
      </div>
      <Drawer
        footer={null}
        width={isMobile ? '100%' : '50%'}
        title={editItem ? 'Edit Location' : 'Add Location'}
        open={isDrawerOpen}
        maskClosable={false}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditItem(null);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="short_code"
            label="Short Code"
          >
            <Input />
          </Form.Item>
          <DetailsAndSettingsForm form={form} disabled={false} isLocation={true} />
          <div style={{ marginTop: '16px' }}>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
          </div>
        </Form>
      </Drawer>
    </Card>
  );
};

export default LocationSettings;
