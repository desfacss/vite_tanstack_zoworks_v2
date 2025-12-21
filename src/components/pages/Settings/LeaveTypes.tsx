import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Select } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { EditFilled } from '@ant-design/icons';
import EnumManager from '../../common/EnumManager';

const { Option } = Select;

interface LeaveType {
  id: string;
  name: string;
  organization_id: string;
}

const LeaveTypes: React.FC = () => {
  const [types, setTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRow, setEditingRow] = useState<LeaveType | null>(null);
  const [form] = Form.useForm();
  const { organization } = useAuthStore();

  const formatTitle = (str: string): string => {
    return str
      ?.split('_')
      ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
      ?.join(' ') || str;
  };

  const fetchLeaveTypes = async () => {
    if (!selectedType) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(selectedType)
        .select('id, name')
        .eq('organization_id', organization?.id);

      if (error) throw error;
      setLeaveTypes(data || []);
    } catch (error) {
      message.error(`Failed to fetch ${selectedType} types.`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enums')
        .select('options')
        .eq('name', 'types_crud')
        .eq('organization_id', organization?.id);

      if (error) throw error;
      setTypes(data[0]?.options || []);
    } catch (error) {
      message.error('Failed to fetch leave types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchTypes();
    }
  }, [organization?.id]);

  useEffect(() => {
    if (selectedType) {
      fetchLeaveTypes();
    }
  }, [selectedType]);

  const handleAdd = () => {
    setEditingRow(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: LeaveType) => {
    setEditingRow(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleSave = async (values: { name: string }) => {
    try {
      if (!selectedType) throw new Error('No type selected');

      if (editingRow) {
        const { error } = await supabase
          .from(selectedType)
          .update({ name: values.name })
          .eq('id', editingRow.id);

        if (error) throw error;
        message.success('Leave type updated successfully.');
      } else {
        const { error } = await supabase.from(selectedType).insert({
          name: values.name,
          organization_id: organization?.id,
        });

        if (error) throw error;
        message.success(`${formatTitle(selectedType)} added successfully.`);
      }

      fetchLeaveTypes();
      setIsModalOpen(false);
    } catch (error) {
      message.error(`Failed to save ${formatTitle(selectedType)}.`);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: LeaveType) => (
        <Button
          icon={<EditFilled />}
          type="primary"
          onClick={() => handleEdit(record)}
        />
      ),
    },
  ];

  return (
    <div>
      <EnumManager/>
      {types && (
        <Select
          placeholder="Select Type"
          style={{ width: 200 }}
          onChange={(value: string) => setSelectedType(value)}
          value={selectedType}
        >
          {types.map(type => (
            <Option value={type} key={type}>
              {formatTitle(type)}
            </Option>
          ))}
        </Select>
      )}
      {selectedType && (
        <div>
          <Button
            type="primary"
            onClick={handleAdd}
            style={{ marginBottom: 16, marginTop: 10 }}
          >
            Add {formatTitle(selectedType)}
          </Button>
          <Table
            dataSource={leaveTypes}
            columns={columns}
            rowKey="id"
            loading={loading}
          />
          <Modal
            title={editingRow ? `Edit ${formatTitle(selectedType)}` : `Add ${formatTitle(selectedType)}`}
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            onOk={() => form.submit()}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
            >
              <Form.Item
                name="name"
                label={`${formatTitle(selectedType)} Name`}
                rules={[{ required: true, message: `Please enter the ${formatTitle(selectedType)} name.` }]}
              >
                <Input />
              </Form.Item>
            </Form>
          </Modal>
        </div>
      )}
    </div>
  );
};

export default LeaveTypes;