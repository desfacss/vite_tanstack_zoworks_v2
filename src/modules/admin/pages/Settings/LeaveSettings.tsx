import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, notification, Table, Drawer, Form, Modal } from 'antd';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import DynamicForm from '@/core/components/DynamicForm';

const { confirm } = Modal;

interface Leave {
  id: string;
  name: string;
  description: string;
  allocated: number;
  leave_type: string;
  level: string;
  location_id: string | null;
  location?: {
    name: string;
  };
  organization_id: string;
}

interface ProjectLeave {
  id: string;
  project_name: string;
  organization_id: string;
}

interface FormSchema {
  id: string;
  name: string;
  data_schema: any;
  ui_schema?: any;
  db_schema?: {
    table: string;
    column: string;
    multiple_rows?: boolean;
  };
  [key: string]: any;
}

const LeaveSettings: React.FC = () => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [projectLeaves, setProjectLeaves] = useState<ProjectLeave[]>([]);
  const [editItem, setEditItem] = useState<Partial<Leave> | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [schema, setSchema] = useState<FormSchema | undefined>();
  const [form] = Form.useForm();
  const { organization } = useAuthStore();

  const getForms = async () => {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('name', 'leaves_add_edit_form')
      .single();

    if (error) {
      notification.error({ message: error.message || 'Failed to fetch form schema' });
    } else if (data) {
      setSchema(data);
    }
  };

  const fetchProjectLeaves = async () => {
    const { data, error } = await supabase
      .from('projects_leaves')
      .select('*')
      .eq('organization_id', organization?.id);

    if (error) {
      notification.error({ message: error.message || 'Failed to fetch project leaves' });
    } else if (data) {
      setProjectLeaves(data);
    }
  };

  const fetchLeaves = async () => {
    const { data, error } = await supabase
      .from('leaves')
      .select('*, location:location_id (*)')
      .eq('organization_id', organization?.id);

    if (error) {
      notification.error({ message: error.message || 'Failed to fetch leaves' });
    } else if (data) {
      setLeaves(data);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      getForms();
      fetchLeaves();
      fetchProjectLeaves();
    }
  }, [organization?.id]);

  const handleAddOrEdit = async (values: any) => {
    const payload = {
      ...values,
      location_id: values.level === 'location' ? values.location_id : null,
      organization_id: organization?.id,
    };

    if (editItem) {
      const { id, ...updatePayload } = payload;
      const { data, error } = await supabase
        .from('leaves')
        .update(updatePayload)
        .eq('id', editItem.id);

      if (error) {
        notification.error({ message: error.message || 'Failed to update leave' });
      } else if (data) {
        notification.success({ message: 'Leave updated successfully' });
        setEditItem(null);
      }
    } else {
      const { data, error } = await supabase
        .from('leaves')
        .insert([payload]);

      if (error) {
        notification.error({ message: error.message || 'Failed to add leave' });
      } else if (data) {
        notification.success({ message: 'Leave added successfully' });
      }
    }

    fetchLeaves();
    setIsDrawerOpen(false);
    form.resetFields();
    setEditItem(null);
  };

  const handleEdit = (record: Leave) => {
    const item = {
      id: record.id,
      name: record.name,
      description: record.description,
      allocated: record.allocated,
      leave_type: record.leave_type,
      level: record.level,
      location_id: record.location_id,
    };
    form.setFieldsValue(item);
    setEditItem(item);
    setIsDrawerOpen(true);
  };

  const showDeleteConfirm = async (record: Leave) => {
    const projectLeave = projectLeaves.find(pl => pl.project_name === record.leave_type);
    const projectId = projectLeave?.id;

    if (projectId) {
      const { data, error } = await supabase.rpc('get_project_details_with_project_users_v2', { projectid: projectId });

      if (error || (data?.project_name && data?.details?.project_users?.length > 0)) {
        notification.error({
          message: `Failed to delete, since ${data?.project_name || 'project'} has allocated users`,
        });
        return;
      }
    }

    confirm({
      title: `Confirm deletion of ${record.leave_type} ?`,
      icon: <AlertCircle size={20} style={{ color: '#faad14' }} />,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        const { error } = await supabase
          .from('leaves')
          .delete()
          .eq('id', record.id);

        if (error) {
          notification.error({ message: error.message || 'Failed to delete leave' });
        } else {
          notification.success({ message: 'Leave deleted successfully' });
          fetchLeaves();
        }
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'leave_type',
      key: 'leave_type',
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      render: (_: any, record: Leave) => (
        <div>
          {record.level} {record.level === 'location' && record.location ? `( ${record.location.name} )` : ''}
        </div>
      ),
    },
    {
      title: 'Allocated',
      dataIndex: 'allocated',
      key: 'allocated',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Leave) => (
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
        <h2 style={{ margin: 0 }}>Leaves</h2>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setIsDrawerOpen(true)}
        >
          Add Leave
        </Button>
      </div>
      <div className="table-responsive" ref={componentRef}>
        <Table
          size="small"
          columns={columns}
          dataSource={leaves}
          rowKey={(record) => record.id}
          loading={!leaves}
          pagination={false}
        />
      </div>
      <Drawer
        footer={null}
        title={editItem ? 'Edit Leave' : 'Add Leave'}
        open={isDrawerOpen}
        maskClosable={false}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditItem(null);
        }}
      >
        {schema && (
          <DynamicForm
            schemas={schema}
            onFinish={handleAddOrEdit}
            formData={editItem}
          />
        )}
      </Drawer>
    </Card>
  );
};

export default LeaveSettings;
