import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, notification, Table, Drawer, Form, Input, DatePicker, Grid, message, Modal } from 'antd';
import { PlusOutlined, EditFilled, DeleteOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import dayjs from 'dayjs';
import Utils from './utils';
import { serverErrorParsing } from '../../common/api/serverErrorParsing';
// import { serverErrorParsing } from 'components/util-components/serverErrorParsing';

const { confirm } = Modal;
const { useBreakpoint } = Grid;

interface Location {
  id: string;
  name: string;
  details: {
    pin?: string;
    address?: string;
  };
  holidays: Holiday[];
  organization_id: string;
}

interface Holiday {
  date: string | null;
  name: string;
  optional: boolean;
  day: string;
}

const LocationSettings: React.FC = () => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [editItem, setEditItem] = useState<Location | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [form] = Form.useForm();
  const { organization } = useAuthStore();

  const screens = Utils.getBreakPoint(useBreakpoint());
  const isMobile = screens.length === 0 ? false : !screens.includes('lg');

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .schema('identity').from('locations')
      .select('*')
      .eq('organization_id', organization?.id)
      .order('name', { ascending: true });

    if (error) {
      notification.error({ message: error.message || 'Failed to fetch locations' });
    } else if (data) {
      setLocations(data);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchLocations();
    }
  }, [organization?.id]);

  const handleEdit = (record: Location) => {
    console.log("location",record)
    setEditItem(record);
    form.setFieldsValue({
      name: record.name,
      pin: record.details?.pin,
      address: record.details?.address,
    });
    setHolidays(record.holidays || []);
    setIsDrawerOpen(true);
  };

  const showDeleteConfirm = (record: Location) => {
    confirm({
      title: `Confirm deletion of ${record.name} ?`,
      icon: <ExclamationCircleFilled />,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        const { error } = await supabase
          .schema('identity').from('locations')
          .delete()
          .eq('id', record.id);

        if (error) {
          notification.error({ message: serverErrorParsing(error.message) || 'Failed to delete location' });
        } else {
          notification.success({ message: 'Location deleted' });
          fetchLocations();
        }
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  };

  const handleHolidayChange = (index: number, field: keyof Holiday, value: any) => {
    const updatedHolidays = [...holidays];
    updatedHolidays[index][field] = value;
    if (field === 'date' && value) {
      updatedHolidays[index].date = dayjs(value).format('YYYY-MM-DD');
      updatedHolidays[index].day = dayjs(value).format('dddd');
    }
    setHolidays(updatedHolidays);
  };

  const addHoliday = () => {
    setHolidays(prevHolidays => [
      ...prevHolidays,
      { date: null, name: '', optional: false, day: '' },
    ]);
  };

  const handleHolidayDelete = (index: number) => {
    const updatedHolidays = [...holidays];
    updatedHolidays.splice(index, 1);
    setHolidays(updatedHolidays);
  };

  const handleSubmit = async () => {
    const invalidRow = holidays.some(row => !row.name || !row.date);
    if (invalidRow) {
      message.error('Error: Some rows have empty name or date');
      return;
    }

    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        details: values,
        holidays,
        organization_id: organization?.id,
      };

      if (editItem) {
        const { error } = await supabase
          .schema('identity').from('locations')
          .update(payload)
          .eq('id', editItem.id);

        if (error) {
          notification.error({ message: error.message || 'Failed to update location' });
        } else {
          notification.success({ message: 'Location updated successfully' });
          fetchLocations();
          setIsDrawerOpen(false);
          form.resetFields();
        }
      } else {
        const { error } = await supabase
          .schema('identity').from('locations')
          .insert(payload);

        if (error) {
          notification.error({ message: error.message || 'Failed to add location' });
        } else {
          notification.success({ message: 'Location added successfully' });
          fetchLocations();
          setIsDrawerOpen(false);
          form.resetFields();
        }
      }
    } catch (error) {
      notification.error({ message: 'Failed to validate form' });
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Address',
      dataIndex: ['details', 'address'],
      key: 'address',
    },
    {
      title: 'Pin',
      dataIndex: ['details', 'pin'],
      key: 'pin',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Location) => (
        <div className="d-flex">
          <Button
            type="primary"
            icon={<EditFilled />}
            size="small"
            className="mr-2"
            onClick={() => handleEdit(record)}
          />
          <Button
            type="primary"
            ghost
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => showDeleteConfirm(record)}
          />
        </div>
      ),
    },
  ];

  const holidayColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: Holiday, index: number) => (
        <Input
          value={record.name}
          onChange={(e) => handleHolidayChange(index, 'name', e.target.value)}
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
        />
      ),
    },
    {
      title: 'Day',
      dataIndex: 'day',
      key: 'day',
      render: (_: any, record: Holiday) => (
        <Input value={record.day} disabled />
      ),
    },
    {
      title: 'Optional',
      dataIndex: 'optional',
      key: 'optional',
      render: (_: any, record: Holiday, index: number) => (
        <Input
          type="checkbox"
          checked={record.optional}
          onChange={(e) => handleHolidayChange(index, 'optional', e.target.checked)}
        />
      ),
    },
    {
      title: 'Actions',
      render: (_: any, __: any, index: number) => (
        <Button
          danger
          onClick={() => handleHolidayDelete(index)}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <Card styles={{ body: { padding: '0px' } }}>
      <div
        className="d-flex p-2 justify-content-between align-items-center"
        style={{ marginBottom: '16px' }}
      >
        <h2 style={{ margin: 0 }}>Locations</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
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
          setHolidays([]);
          form.resetFields();
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="pin"
            label="Pin"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="address"
            label="Address"
          >
            <Input />
          </Form.Item>
          <h4>Holidays</h4>
          <Table
            dataSource={holidays}
            columns={holidayColumns}
            rowKey={(_: any, index: number) => index}
            pagination={false}
          />
          <Button
            onClick={addHoliday}
            type="dashed"
            style={{ marginTop: '16px' }}
          >
            Add Holiday
          </Button>
          <div style={{ marginTop: '16px' }}>
            <Button
              type="primary"
              htmlType="submit"
            >
              Save
            </Button>
          </div>
        </Form>
      </Drawer>
    </Card>
  );
};

export default LocationSettings;