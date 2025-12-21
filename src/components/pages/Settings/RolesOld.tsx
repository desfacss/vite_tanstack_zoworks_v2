import React, { useState, useEffect } from 'react';
import { Table, Checkbox, Button, message, Modal, Form, InputNumber, Input, Space, Drawer } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
// import { camelCaseToTitleCase } from 'components/util-components/utils';
import { DeleteOutlined, EditOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import OrganizationFeatureEdit from './OrganizationFeatures';
import { camelCaseToTitleCase } from '../../common/utils/casing';
import ModuleForm from './ModuleForm';

interface Role {
  id: string;
  name: string;
  feature: Record<string, boolean>;
  ui_order: number;
  organization_id: string;
}

const RoleFeatureEdit: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'delete'>('add');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [rowSelections, setRowSelections] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();
  const { organization } = useAuthStore();

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .schema('identity').from('roles')
      .select('id, feature, ui_order')
      // .neq('is_superadmin', true)
      .eq('organization_id', organization?.id)
      .order('ui_order', { ascending: true });

    if (error) {
      message.error('Failed to fetch roles');
    } else {
      setRoles(data || []);
    }
  };

  const fetchOrganizationFeatures = async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .schema('identity').from('organizations')
      .select('module_features')
      .eq('id', organization.id)
      .single();

    if (error) {
      message.error('Failed to fetch organization features.');
    } else {
      const moduleFeatures = data?.module_features || {};
      const enabledFeatures = Object.keys(moduleFeatures).filter(key => moduleFeatures[key]);
      setFeatures(enabledFeatures);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) {
        setLoading(false);
        return;
      }
      await fetchRoles();
      await fetchOrganizationFeatures();
      setLoading(false);
    };

    fetchData();
  }, [organization?.id]);

  const handleFeatureChange = (featureKey: string, roleId: string, checked: boolean) => {
    const updatedRoles = roles.map((role) => {
      if (role.id === roleId) {
        return {
          ...role,
          feature: {
            ...role.feature,
            [featureKey]: checked,
          },
        };
      }
      return role;
    });

    setRoles(updatedRoles);

    const allCheckedInRow = updatedRoles.every(role => role.feature[featureKey]);
    setRowSelections(prev => ({
      ...prev,
      [featureKey]: allCheckedInRow,
    }));
  };

  const handleSaveChanges = async () => {
    for (const role of roles) {
      const { error } = await supabase
        .schema('identity').from('roles')
        .update({ feature: role.feature })
        .eq('id', role.id);

      if (error) {
        message.error('Error updating role');
      }
    }
    message.success('Changes saved successfully!');
    fetchRoles();
  };

  const showModal = (type: 'add' | 'edit' | 'delete', role: Role | null = null) => {
    setModalType(type);
    setSelectedRole(role);
    form.resetFields();
    if (role && type !== 'delete') {
      form.setFieldsValue({
        name: role.name,
        ui_order: role.ui_order,
      });
    }
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      if (modalType !== 'delete') {
        const values = await form.validateFields();
        if (modalType === 'add') {
          const { error } = await supabase.from('roles').insert([
            {
              name: values.name,
              ui_order: values.ui_order,
              feature: {},
              organization_id: organization?.id,
            },
          ]);
          if (error) throw error;
          message.success('Role added successfully!');
        } else if (modalType === 'edit') {
          const { error } = await supabase
            .schema('identity').from('roles')
            .update({
              name: values.name,
              ui_order: values.ui_order,
            })
            .eq('id', selectedRole?.id);
          if (error) throw error;
          message.success('Role updated successfully!');
        }
      } else if (modalType === 'delete' && selectedRole) {
        const { error } = await supabase.schema('identity').from('roles').delete().eq('id', selectedRole.id);
        if (error) throw error;
        message.success('Role deleted successfully!');
      }
      fetchRoles();
      setModalVisible(false);
    } catch (error) {
      message.error((error as Error).message || 'Failed to perform action.');
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
  };

  const handleAddRoleColumn = () => {
    showModal('add');
  };

  const handleEditRoleColumn = (role: Role) => {
    showModal('edit', role);
  };

  const handleDeleteRoleColumn = (role: Role) => {
    showModal('delete', role);
  };

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  const handleRowToggle = (featureKey: string, checked: boolean) => {
    setRowSelections(prev => ({
      ...prev,
      [featureKey]: checked,
    }));

    const updatedRoles = roles.map(role => ({
      ...role,
      feature: {
        ...role.feature,
        [featureKey]: checked,
      },
    }));
    setRoles(updatedRoles);
  };

  const handleColumnToggle = (roleId: string, checked: boolean) => {
    const updatedRoles = roles.map(role => {
      if (role.id === roleId) {
        const newFeatures: Record<string, boolean> = {};
        features.forEach(feature => {
          newFeatures[feature] = checked;
        });
        return {
          ...role,
          feature: newFeatures,
        };
      }
      return role;
    });
    setRoles(updatedRoles);

    const newRowSelections: Record<string, boolean> = {};
    features.forEach(feature => {
      newRowSelections[feature] = updatedRoles.every(role => role.feature[feature]);
    });
    setRowSelections(newRowSelections);
  };

  const columns = [
    {
      title: (
        <Space>
          Feature
          <Button onClick={handleAddRoleColumn} icon={<PlusOutlined />}>
            Add Role
          </Button>
        </Space>
      ),
      dataIndex: 'feature',
      key: 'feature',
      render: (text: string) => (
        <Space>
          <Checkbox
            checked={rowSelections[text] || false}
            onChange={(e) => handleRowToggle(text, e.target.checked)}
          />
          {camelCaseToTitleCase(text)}
        </Space>
      ),
    },
    ...roles.map((role) => ({
      key: role.id,
      title: (
        <Space>
          {camelCaseToTitleCase(role?.name)}
          <Checkbox
            checked={features.every(feature => role.feature[feature])}
            onChange={(e) => handleColumnToggle(role.id, e.target.checked)}
          />
          <Button
            type="link"
            size="small"
            onClick={() => handleEditRoleColumn(role)}
            icon={<EditOutlined />}
          />
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDeleteRoleColumn(role)}
            icon={<DeleteOutlined />}
          />
        </Space>
      ),
      render: (_: any, record: { feature: string }) => (
        <Checkbox
          checked={role.feature[record.feature] || false}
          onChange={(e) => handleFeatureChange(record.feature, role.id, e.target.checked)}
        />
      ),
    })),
  ];

  return (
    <div>
      <ModuleForm/>
      <Table
        size="small"
        dataSource={features.map(feature => ({ feature }))}
        scroll={{ x: 'max-content', y: 400 }}
        loading={loading}
        pagination={false}
        rowKey="feature"
        columns={columns}
      />

      <Space style={{ marginTop: 16, justifyContent: 'space-between', display: 'flex' }}>
        <Button type="primary" onClick={handleSaveChanges}>
          Save Changes
        </Button>
        <Button onClick={showDrawer} icon={<SettingOutlined />}>
          Manage Org Features
        </Button>
      </Space>

      <Modal
        title={`${camelCaseToTitleCase(modalType)} Role`}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Please enter role name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="ui_order"
            label="UI Order"
            rules={[{ required: true, message: 'Please enter UI order' }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Organization Features"
        placement="right"
        closable={true}
        onClose={closeDrawer}
        open={drawerVisible}
        width="30%"
      >
        <OrganizationFeatureEdit onSave={() => {
          fetchOrganizationFeatures();
          setDrawerVisible(false);
        }} />
      </Drawer>
    </div>
  );
};

export default RoleFeatureEdit;