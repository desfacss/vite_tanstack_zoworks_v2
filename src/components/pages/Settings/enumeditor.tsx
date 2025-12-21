import React, { useState, useEffect } from 'react';
import { Select, Button, Input, Form, Row, Col, message, Modal, List, Popconfirm } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

const { Option } = Select;

interface EnumItem {
  id: string;
  name: string;
  options: string[];
  organization_id: string;
  is_active: boolean;
}

const EnumEditor: React.FC = () => {
  const [enumData, setEnumData] = useState<EnumItem[]>([]);
  const [selectedEnum, setSelectedEnum] = useState<EnumItem | null>(null);
  const [newOption, setNewOption] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [modalEnumName, setModalEnumName] = useState<string>('');
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const { organization } = useAuthStore();

  useEffect(() => {
    if (organization?.id) {
      getEnums(organization.id);
    }
  }, [organization?.id]);

  const getEnums = async (orgId: string) => {
    const { data, error } = await supabase
      .from('enums')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (error) {
      message.error('Failed to fetch enums');
    } else {
      setEnumData(data || []);
    }
  };

  const handleAddOption = () => {
    if (!newOption) {
      message.error('Option cannot be empty');
      return;
    }
    if (selectedEnum) {
      const updatedOptions = [...selectedEnum.options, newOption];
      updateEnum(selectedEnum.id, updatedOptions);
      setNewOption('');
    }
  };

  const handleDeleteOption = (option: string) => {
    if (selectedEnum) {
      const updatedOptions = selectedEnum.options.filter(opt => opt !== option);
      updateEnum(selectedEnum.id, updatedOptions);
    }
  };

  const handleEditOption = (option: string) => {
    setEditingOption(option);
    setEditingValue(option);
  };

  const handleSaveEdit = () => {
    if (!editingValue) {
      message.error('Option cannot be empty');
      return;
    }
    if (selectedEnum) {
      const updatedOptions = selectedEnum.options.map(opt =>
        opt === editingOption ? editingValue : opt
      );
      updateEnum(selectedEnum.id, updatedOptions);
      setEditingOption(null);
      setEditingValue('');
    }
  };

  const updateEnum = async (enumId: string, updatedOptions: string[]) => {
    const { error } = await supabase
      .from('enums')
      .update({ options: updatedOptions })
      .eq('id', enumId);

    if (error) {
      message.error('Failed to update enum');
      console.error('Error updating enum:', error);
    } else {
      message.success('Enum updated successfully');
      if (organization?.id) {
        await getEnums(organization.id);
      }
      setSelectedEnum(prev => prev ? { ...prev, options: updatedOptions } : null);
    }
  };

  const handleCreateEnum = async () => {
    if (!modalEnumName) {
      message.error('Enum name is required');
      return;
    }

    const { error } = await supabase
      .from('enums')
      .insert([
        {
          name: modalEnumName,
          options: [],
          organization_id: organization?.id,
        },
      ]);

    if (error) {
      message.error('Failed to create enum');
    } else {
      message.success('Enum created successfully');
      setIsModalVisible(false);
      setModalEnumName('');
      if (organization?.id) {
        getEnums(organization.id);
      }
    }
  };

  return (
    <div>
      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Select Enum">
              <Select
                value={selectedEnum?.id}
                onChange={(value) => setSelectedEnum(enumData.find(e => e.id === value) || null)}
                placeholder="Select Enum"
                allowClear
              >
                {enumData.map((enumItem) => (
                  <Option key={enumItem.id} value={enumItem.id}>
                    {enumItem.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedEnum && (
          <div>
            <List
              bordered
              dataSource={selectedEnum.options}
              renderItem={(option) => (
                <List.Item
                  actions={[
                    editingOption === option ? (
                      <Button type="primary" onClick={handleSaveEdit}>
                        Save
                      </Button>
                    ) : (
                      <Button onClick={() => handleEditOption(option)}>Edit</Button>
                    ),
                    <Popconfirm
                      title="Are you sure you want to delete this option?"
                      onConfirm={() => handleDeleteOption(option)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button danger>Delete</Button>
                    </Popconfirm>,
                  ]}
                >
                  {editingOption === option ? (
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      placeholder="Edit option"
                    />
                  ) : (
                    option
                  )}
                </List.Item>
              )}
            />

            <Row gutter={16}>
              <Col span={8}>
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Enter new option"
                />
              </Col>
              <Col span={8}>
                <Button type="primary" onClick={handleAddOption}>
                  Add Option
                </Button>
              </Col>
            </Row>
          </div>
        )}

        <Button type="dashed" onClick={() => setIsModalVisible(true)}>
          Create New Enum
        </Button>

        <Modal
          title="Create New Enum"
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          onOk={handleCreateEnum}
        >
          <Form layout="vertical">
            <Form.Item label="Enum Name">
              <Input
                value={modalEnumName}
                onChange={(e) => setModalEnumName(e.target.value)}
                placeholder="Enter enum name"
              />
            </Form.Item>
          </Form>
        </Modal>
      </Form>
    </div>
  );
};

export default EnumEditor;