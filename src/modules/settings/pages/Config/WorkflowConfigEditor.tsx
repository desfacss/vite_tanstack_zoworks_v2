import React, { useState, useEffect } from 'react';
import { supabase } from '@/core/lib/supabase';
import { Button, Form, Input, Modal, Table, Select, InputNumber, Switch, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface WorkflowConfiguration {
  id: string;
  name: string;
  entity_type: string;
  details: {
    stages: Stage[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

interface Stage {
  name: string;
  color: string;
  sequence: number;
  general_state: string;
  estimated_duration?: number;
  responsible_department?: string;
  entry_criteria?: Criteria;
  exit_criteria?: Criteria;
}

interface Criteria {
  rules: Rule[];
  combinator: 'and' | 'or';
}

interface Rule {
  field: string;
  operator: string;
  value: any;
}

interface WorkflowConfigEditorProps {
  entityType: string;
  organizationId: string;
}

const WorkflowConfigEditor: React.FC<WorkflowConfigEditorProps> = ({ entityType, organizationId }) => {
  const [form] = Form.useForm();
  const [data, setData] = useState<WorkflowConfiguration[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(false);
console.log("et",entityType,organizationId);
  // Fetch workflow configurations
  const fetchData = async () => {
    setLoading(true);
    const { data: workflows, error } = await supabase
      .from('workflow_configurations')
      .select('*')
      .eq('entity_type', entityType)
      .eq('organization_id', organizationId);

    if (error) {
      message.error('Failed to fetch configurations');
      console.error(error);
    } else {
      setData(workflows || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [entityType, organizationId]);

  // Handle stage edit/add
  const showModal = (record: WorkflowConfiguration, stage?: Stage, index?: number) => {
    if (stage) {
      form.setFieldsValue({
        ...stage,
        entry_combinator: stage.entry_criteria?.combinator,
        exit_combinator: stage.exit_criteria?.combinator,
      });
      setEditingStage({ ...stage, index });
    } else {
      form.resetFields();
      setEditingStage(null);
    }
    setIsModalVisible(true);
  };

  // Save stage
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const selectedConfig = data[0]; // Assuming single config for simplicity

      const updatedStages = [...(selectedConfig.details.stages || [])];
      const newStage: Stage = {
        name: values.name,
        color: values.color,
        sequence: values.sequence,
        general_state: values.general_state,
        estimated_duration: values.estimated_duration,
        responsible_department: values.responsible_department,
        entry_criteria: values.entry_combinator
          ? { rules: values.entry_rules || [], combinator: values.entry_combinator }
          : undefined,
        exit_criteria: values.exit_combinator
          ? { rules: values.exit_rules || [], combinator: values.exit_combinator }
          : undefined,
      };

      if (editingStage && editingStage.index !== undefined) {
        updatedStages[editingStage.index] = newStage;
      } else {
        updatedStages.push(newStage);
      }

      // Update Supabase
      const { error } = await supabase
        .from('workflow_configurations')
        .update({ details: { stages: updatedStages } })
        .eq('id', selectedConfig.id);

      if (error) {
        message.error('Failed to update configuration');
        console.error(error);
      } else {
        message.success('Configuration updated successfully');
        fetchData();
        setIsModalVisible(false);
        form.resetFields();
      }
    } catch (error) {
      message.error('Validation failed');
    }
  };

  // Delete stage
  const handleDelete = async (record: WorkflowConfiguration, stageIndex: number) => {
    const updatedStages = record.details.stages.filter((_, index) => index !== stageIndex);
    const { error } = await supabase
      .from('workflow_configurations')
      .update({ details: { stages: updatedStages } })
      .eq('id', record.id);

    if (error) {
      message.error('Failed to delete stage');
      console.error(error);
    } else {
      message.success('Stage deleted successfully');
      fetchData();
    }
  };

  // Table columns for stages
  const columns: ColumnsType<Stage> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Color', dataIndex: 'color', key: 'color' },
    { title: 'Sequence', dataIndex: 'sequence', key: 'sequence' },
    { title: 'General State', dataIndex: 'general_state', key: 'general_state' },
    { title: 'Duration (hrs)', dataIndex: 'estimated_duration', key: 'estimated_duration' },
    { title: 'Department', dataIndex: 'responsible_department', key: 'responsible_department' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, stage, index) =>
        data[0] && (
          <>
            <Button
              icon={<EditOutlined />}
              onClick={() => showModal(data[0], stage, index)}
              style={{ marginRight: 8 }}
            />
            <Popconfirm
              title="Are you sure to delete this stage?"
              onConfirm={() => handleDelete(data[0], index)}
            >
              <Button icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </>
        ),
    },
  ];

  return (
    <div>
      {data[0] && (
        <>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal(data[0])}
            style={{ marginBottom: 16 }}
          >
            Add Stage
          </Button>
          <Table
            columns={columns}
            dataSource={data[0].details.stages}
            rowKey="sequence"
            loading={loading}
            pagination={false}
          />
        </>
      )}

      <Modal
        title={editingStage ? 'Edit Stage' : 'Add Stage'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Stage Name"
            rules={[{ required: true, message: 'Please input stage name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="color"
            label="Color"
            rules={[{ required: true, message: 'Please input color' }]}
          >
            <Input type="color" />
          </Form.Item>
          <Form.Item
            name="sequence"
            label="Sequence"
            rules={[{ required: true, message: 'Please input sequence' }]}
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            name="general_state"
            label="General State"
            rules={[{ required: true, message: 'Please select general state' }]}
          >
            <Select>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="in_progress">In Progress</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="estimated_duration" label="Estimated Duration (hrs)">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="responsible_department" label="Responsible Department">
            <Input />
          </Form.Item>
          {/* Simplified criteria input for demo - extend as needed */}
          <Form.Item name="entry_combinator" label="Entry Criteria Combinator">
            <Select allowClear>
              <Select.Option value="and">AND</Select.Option>
              <Select.Option value="or">OR</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="exit_combinator" label="Exit Criteria Combinator">
            <Select allowClear>
              <Select.Option value="and">AND</Select.Option>
              <Select.Option value="or">OR</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkflowConfigEditor;
