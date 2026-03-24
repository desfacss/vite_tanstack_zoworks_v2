import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, DatePicker, Row, Col, Typography, Spin, message } from 'antd';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import { useAuthStore } from '@/core/lib/store';
import { useQueryClient } from '@tanstack/react-query';

const { Option } = Select;
const { Title } = Typography;

interface TaskFormProps {
  parentEditItem?: {
    id: string;
    display_id?: string;
    name?: string;
    account_id?: string;
    location_id?: string;
    asset_id?: string;
  };
  entityType?: 'tickets' | 'projects' | 'tasks';
  editItemId?: string;
  onSuccess?: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ parentEditItem, entityType, editItemId, onSuccess }) => {
  const [form] = Form.useForm();
  const [taskType, setTaskType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contextDisplayName, setContextDisplayName] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const { organization, location } = useAuthStore();
  const [dropdownData, setDropdownData] = useState({
    taskTypes: [],
    stages: [],
    users: [],
    technicianUsers: [],
    priorities: [],
    outcomes: [],
    activityTypes: [],
    tickets: [],
    projects: [],
    parentTasks: [],
    resources: [],
    manualOriginId: null
  });
  const queryClient = useQueryClient();
  const formTicketId = Form.useWatch('ticket_id', form);
  const formFieldAgentId = Form.useWatch('assignee_id', form);

  // Fetch all static and dynamic dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        const { data: teamsData } = await supabase.schema('identity').from('teams').select('id').eq('name', 'Technician').single();
        let technicianUsers = [];
        if (teamsData) {
          const { data: userTeamsData } = await supabase.schema('identity').from('user_teams').select('user_id').eq('team_id', teamsData.id);
          if (userTeamsData) {
            const userIds = userTeamsData.map(item => item.user_id);
            const { data: usersData } = await supabase.schema('identity').from('users').select('id, name').in('id', userIds);
            technicianUsers = usersData || [];
          }
        }
        
        const [
          usersRes,
          prioritiesRes,
          outcomesRes,
          activityTypesRes,
          ticketsRes,
          projectsRes,
          parentTasksRes,
          resourcesRes,
          originsRes,
          taskTypesRes
        ] = await Promise.all([
          supabase.schema('identity').from('users').select('id, name'),
          supabase.schema('core').from('enums').select('id, value').eq('value_type', 'priority'),
          supabase.schema('core').from('enums').select('id, value').eq('value_type', 'task_outcome'),
          supabase.schema('core').from('enums').select('id, value').eq('value_type', 'task_activity_type'),
          supabase.schema('public').from('tickets').select('id, display_id, subject, details, account_id, location_id, asset_id, field_agent_id'),
          supabase.schema('blueprint').from('projects').select('id, name'),
          supabase.schema('organization').from('tasks').select('id, name'),
          supabase.schema('organization').from('resources').select('id, name').neq('type', 'User'),
          supabase.schema('core').from('enums').select('id, value').eq('value_type', 'task_origin'),
          supabase.schema('core').from('enums').select('id, value').eq('value_type', 'task_type')
        ]);
        
        const manualOrigin = originsRes?.data?.find(item => item.value === 'Manual');

        setDropdownData({
          taskTypes: taskTypesRes?.data || [],
          users: usersRes.data || [],
          technicianUsers: technicianUsers || [],
          priorities: prioritiesRes.data || [],
          outcomes: outcomesRes.data || [],
          activityTypes: activityTypesRes.data || [],
          tickets: ticketsRes.data || [],
          projects: projectsRes.data || [],
          parentTasks: parentTasksRes.data || [],
          resources: resourcesRes.data || [],
          manualOriginId: manualOrigin?.id
        });
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDropdownData();
  }, []);

  // Handle edit mode: fetch and pre-fill form data
  useEffect(() => {
    if (editItemId) {
        setIsEditMode(true);
        const fetchTaskData = async () => {
            setLoading(true);
            try {
                const { data: task, error } = await supabase
                    .schema('organization')
                    .from('tasks')
                    .select('*')
                    .eq('id', editItemId)
                    .single();

                if (error) {
                    console.error('Error fetching task for editing:', error);
                    message.error('Error fetching task data.');
                    setLoading(false);
                    return;
                }
                
                if (task) {
                    const taskTypeEnum = dropdownData?.taskTypes?.find(tt => tt.id === task.task_type);
                    setTaskType(taskTypeEnum?.value);
                    
                    form.setFieldsValue({
                        ...task,
                        name: task.name,
                        subject: task.name,
                        description: task.description,
                        notes: task.description,
                        event_start_at: task.event_start_at ? dayjs(task.event_start_at) : null,
                        event_end_at: task.event_end_at ? dayjs(task.event_end_at) : null,
                        task_type_selector: taskTypeEnum?.id
                    });
                }
            } catch (err) {
                console.error('Error during fetch for editing:', err);
                message.error('An unexpected error occurred.');
            } finally {
                setLoading(false);
            }
        };
        fetchTaskData();
    } else {
      setIsEditMode(false);
    }
  }, [editItemId, form, dropdownData.taskTypes]);

  // Set initial form values and dynamic title based on parentEditItem
  useEffect(() => {
    if (parentEditItem && entityType && !isEditMode) {
      let displayName = '';
      const initialFields = {};
      let inferredTaskType = null;
      let inferredTaskTypeId = null;

      if (entityType === 'tickets') {
        displayName = parentEditItem.display_id || '';
        initialFields.ticket_id = parentEditItem.id;
        inferredTaskType = 'Work Order';
      } else if (entityType === 'projects') {
        displayName = parentEditItem.name || '';
        initialFields.project_id = parentEditItem.id;
        inferredTaskType = 'Project Task';
      } else if (entityType === 'tasks') {
        displayName = parentEditItem.name || '';
        initialFields.parent_task_id = parentEditItem.id;
        inferredTaskType = 'Project Task';
      }

      inferredTaskTypeId = dropdownData.taskTypes?.find(tt => tt.value === inferredTaskType)?.id;

      setContextDisplayName(displayName);
      setTaskType(inferredTaskType);
      form.setFieldsValue({ ...initialFields, task_type_selector: inferredTaskTypeId });
    }
  }, [parentEditItem, entityType, form, isEditMode, dropdownData.taskTypes]);

  // Fetch stages dynamically and set default assignee based on task type
  useEffect(() => {
    const fetchStagesAndSetDefaults = async () => {
      if (!taskType) return;
      
      const workflowType = taskType === 'Work Order' ? 'Work Order' : null;
      setLoading(true);
      
      try {
        const { data: wfData, error: wfError } = await supabase
          .schema("workflow").from('dynamic_workflow_definitions')
          .select('definitions')
          .eq('entity_type', 'tasks')
          .eq('type', workflowType)
          .single();
        
        if (wfData?.definitions) {
          const stages = wfData.definitions?.stages?.map(stage => ({
            id: stage.id,
            name: stage.name
          })) || [];
          const initialStageId = wfData.definitions?.startStateId;
          setDropdownData(prev => ({ ...prev, stages }));
          if (!isEditMode) {
             form.setFieldsValue({ stage_id: initialStageId });
          }
        } else if (wfError) {
          console.error('Error fetching workflow stages:', wfError);
        }
      } catch (error) {
        console.error('Error fetching stages:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (taskType === 'Activity Log' && currentUserId && !isEditMode) {
      form.setFieldsValue({ assignee_id: currentUserId });
    }
    
    fetchStagesAndSetDefaults();
  }, [taskType, form, currentUserId, isEditMode]);

  const handleTaskTypeChange = (value) => {
    const selectedTaskType = dropdownData.taskTypes?.find(tt => tt.id === value);
    setTaskType(selectedTaskType?.value);
    // form.resetFields();
    if (selectedTaskType?.value === 'Activity Log' && currentUserId) {
      form.setFieldsValue({ assignee_id: currentUserId });
    }
  };
  
  const handleTicketChange = async (ticketId: string) => {
    if (!ticketId) {
      form.setFieldsValue({
        name: null,
        description: null,
        account_id: null,
        location_id: null,
        asset_id: null,
        assignee_id: null,
        event_start_at: null,
        event_end_at: null,
        priority_id: null
      });
      return;
    }

    setLoading(true);
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('subject, details, account_id, location_id, asset_id, field_agent_id')
        .eq('id', ticketId)
        .single();

      if (error) {
        console.error('Error fetching ticket details:', error);
        message.error('Failed to load ticket data.');
        return;
      }
      
      const description = ticket?.details?.description || null;
      const priority_id = ticket?.details?.priority_id || null;
      const schedule = ticket?.details?.schedule ? dayjs(ticket?.details?.schedule) : null;
      
      form.setFieldsValue({
        name: ticket.subject,
        description: description,
        account_id: ticket.account_id,
        location_id: ticket.location_id,
        asset_id: ticket.asset_id,
        assignee_id: ticket.field_agent_id,
        event_start_at: schedule,
        priority_id: priority_id
      });
    } catch (err) {
      console.error('An unexpected error occurred:', err);
      message.error('An unexpected error occurred while fetching ticket data.');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    const selectedTaskTypeEnum = dropdownData?.taskTypes?.find(enumItem => enumItem.id === values.task_type_selector);

    let recordToSave = {
      name: values.name || values.subject,
      description: values.description || values.notes,
      priority_id: values.priority_id,
      activity_type_id: values.activity_type_id,
      outcome_id: values.outcome_id,
      event_start_at: values.event_start_at ? dayjs(values.event_start_at).toISOString() : null,
      event_end_at: values.event_end_at ? dayjs(values.event_end_at).toISOString() : null,
      assignee_id: values.assignee_id,
      resource_id: values.resource_id,
      parent_task_id: values.parent_task_id,
      project_id: values.project_id,
      ticket_id: values.ticket_id||parentEditItem?.id,
      stage_id: values.stage_id,
      is_tentative: values.is_tentative || false,
      completed_at: taskType === 'Activity Log' ? dayjs().toISOString() : null,
      updated_by: currentUserId,
    };
console.log("rzz",recordToSave,parentEditItem);

    if (isEditMode) {
      const { error } = await supabase
        .schema('organization')
        .from('tasks')
        .update(recordToSave)
        .eq('id', editItemId);

      if (error) {
        console.error('Error updating task:', error);
        message.error(`Error updating task: ${error.message}`);
      } else {
        message.success('Task updated successfully!');
        queryClient.invalidateQueries({ queryKey: ["tasks", organization?.id] });
        if (onSuccess) onSuccess(); // Call parent function
      }
    } else {
      recordToSave = {
        ...recordToSave,
        organization_id: organization?.id,
        origin_id: dropdownData.manualOriginId,
        task_type: selectedTaskTypeEnum?.id || null,
        created_by: currentUserId,
        entity_type: entityType,
        account_id: parentEditItem?.account_id,
        location_id: parentEditItem?.location_id||location?.id,
        asset_id: parentEditItem?.asset_id,
      };

      const { data, error } = await supabase
        .schema('organization')
        .from('tasks')
        .insert([recordToSave])
        .select();

      if (error) {
        console.error('Error saving task:', error);
        message.error(`Error saving task: ${error.message}`);
      } else {
        message.success('Task saved successfully!');
        queryClient.invalidateQueries({ queryKey: ["tasks", organization?.id] });
        if (onSuccess) onSuccess(); // Call parent function
      }
      
      // If Work Order is created, update the ticket table
      if (selectedTaskTypeEnum?.value === 'Work Order' && values.ticket_id) {
        const { error: ticketUpdateError } = await supabase
          .from('tickets')
          .update({ 
            field_agent_id: values.assignee_id,
            stage_id: 'Scheduled',
            details: {
              ...dropdownData.tickets.find(t => t.id === values.ticket_id)?.details,
              schedule: values.event_start_at ? dayjs(values.event_start_at).toISOString() : null,
            }
          })
          .eq('id', values.ticket_id);

        if (ticketUpdateError) {
          console.error('Error updating ticket:', ticketUpdateError);
          message.error(`Error updating ticket with schedule info: ${ticketUpdateError.message}`);
        }
      }
    }

    setLoading(false);
    form.resetFields();
    setTaskType(null);
    setContextDisplayName('');
  };

  const renderFormFields = () => {
    const isParentContext = parentEditItem && entityType;

    const renderParentFields = () => {
      if (isParentContext) {
        return (
          <Form.Item name={`${entityType === 'tickets' ? 'ticket_id' : entityType === 'projects' ? 'project_id' : 'parent_task_id'}`} hidden>
            <Input />
          </Form.Item>
        );
      } else {
        return (
          <>
            <Col span={12}>
              <Form.Item name="ticket_id" label="Ticket">
                <Select onChange={handleTicketChange} showSearch loading={loading} filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {dropdownData?.tickets?.map(item => <Option key={item.id} value={item.id}>{item.display_id}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="project_id" label="Project">
                <Select showSearch loading={loading} filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {dropdownData?.projects?.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="parent_task_id" label="Parent Task">
                <Select showSearch loading={loading} filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {dropdownData?.parentTasks?.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </>
        );
      }
    };

    switch (taskType) {
      case 'Project Task':
        const assigneeList = taskType === 'Work Order' ? dropdownData?.technicianUsers : dropdownData?.users;
        return (
          <Row gutter={16}>
            {renderParentFields()}
            <Col span={24}>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stage_id" label="Stage">
                <Select loading={loading}>
                  {dropdownData?.stages?.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority_id" label="Priority">
                <Select loading={loading}>
                  {dropdownData?.priorities?.map(item => <Option key={item.id} value={item.id}>{item.value}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="event_start_at" label="Event Start At">
                <DatePicker showTime={{ format: 'HH:mm',minuteStep: 15 }} format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} needConfirm={false}/>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="event_end_at" label="Event End At">
                <DatePicker showTime={{ format: 'HH:mm',minuteStep: 15 }} format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} needConfirm={false}/>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assignee_id" label="Assigned User">
                <Select showSearch loading={loading} filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {assigneeList?.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="resource_id" label="Assigned Resource">
                <Select showSearch loading={loading} filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {dropdownData?.resources?.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );
      case 'Work Order':
        return (
          <Row gutter={16}>
            {renderParentFields()}
            <Col span={24}>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority_id" label="Priority">
                <Select loading={loading}>
                  {dropdownData?.priorities?.map(item => <Option key={item.id} value={item.id}>{item.value}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stage_id" label="Stage">
                <Select loading={loading}>
                  {dropdownData?.stages?.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            {formTicketId && (
              <>
                <Col span={12}>
                  <Form.Item name="assignee_id" label="Assigned Technician" rules={[{ required: true, message: 'Please select a technician!' }]}>
                    <Select showSearch loading={loading} filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                      {dropdownData?.technicianUsers?.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="event_start_at" label="Scheduled Time" rules={[{ required: true, message: 'Please select a scheduled time!' }]}>
                    <DatePicker showTime={{ format: 'HH:mm', minuteStep: 15 }} format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} needConfirm={false} />
                  </Form.Item>
                </Col>
              </>
            )}
            <Col span={12}>
              <Form.Item name="resource_id" label="Assigned Resource">
                <Select showSearch loading={loading} filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {dropdownData?.resources?.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="event_end_at" label="Event End At">
                <DatePicker showTime={{ format: 'HH:mm',minuteStep: 15 }} format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} needConfirm={false}/>
              </Form.Item>
            </Col>
          </Row>
        );
      case 'Activity Log':
        return (
          <Row gutter={16}>
            {renderParentFields()}
            <Col span={24}>
              <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="activity_type_id" label="Activity Type">
                <Select loading={loading}>
                  {dropdownData?.activityTypes?.map(item => <Option key={item.id} value={item.id}>{item.value}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="outcome_id" label="Outcome">
                <Select loading={loading}>
                  {dropdownData?.outcomes?.map(item => <Option key={item.id} value={item.id}>{item.value}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assignee_id" label="Assigned To">
                <Select showSearch loading={loading} filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {dropdownData?.users?.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    if (isEditMode) {
      return `Edit Task`;
    }
    if (contextDisplayName) {
      return `Create Task for ${contextDisplayName}`;
    }
    return 'Create New Task';
  };

  return (
    <Spin spinning={loading} tip="Loading...">
      <div>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          {!isEditMode && (
            <Form.Item
              label="Task Type"
              name="task_type_selector"
              rules={[{ required: true, message: 'Please select a task type!' }]}
            >
              <Select onChange={handleTaskTypeChange}>
                {dropdownData?.taskTypes?.map(item => (
                  <Option key={item.id} value={item.id}>{item.value}</Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {taskType && renderFormFields()}

          {taskType && (
            <Form.Item>
              <Button type="primary" htmlType="submit" style={{ marginTop: '16px' }}>
                {isEditMode ? 'Update Task' : 'Save Task'}
              </Button>
            </Form.Item>
          )}
        </Form>
      </div>
    </Spin>
  );
};

export default TaskForm;