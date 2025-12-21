import React, { useState, useEffect } from 'react';
import { Button, Modal, Form as AntDForm, Input, Select, DatePicker, notification, Spin, List, Card, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';
// import DynamicForm from './DynamicForm'; // Assuming DynamicForm is in the same directory or accessible path
// import { supabase } from '../../lib/supabase'; // Adjust path to your Supabase client
// import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs if needed, though Supabase handles it by default
import { supabase } from '../../../lib/supabase';
import DynamicForm from '../DynamicForm';
import { useAuthStore } from '../../../lib/store';

// Define the structure for an Activity record
interface Activity {
  id: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
  // assigned_to?: string;
  entity_name: string;
  entity_id: string;
  activity_type: string;
  priority?: string;
  subject?: string;
  description?: string;
  outcome?: string;
  duration_minutes?: number;
  next_follow_up_at?: string;
  status?: string;
  is_completed: boolean;
  completed_at?: string;
  scheduled_start_at?: string;
  scheduled_end_at?: string;
  actual_start_at?: string;
  actual_end_at?: string;
  details?: any; // JSONB column to store dynamic form data
}

// Props for the ActivitiesManager component
interface ActivitiesManagerProps {
  entity_name: string; // e.g., 'lead', 'ticket', 'leave_request'
  entity_id: string; // The UUID of the specific entity
}

const ActivitiesManager: React.FC<ActivitiesManagerProps> = ({ entity_name, entity_id }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null); // For editing
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  // Form schemas for the DynamicForm, replicating the provided image
  const activityDataSchema = {
    type: "object",
    required: ["activity_type", "subject"],
    properties: {
      activity_type: {
        type: "string",
        title: "Activity Type",
        enum: ["Phone Call", "Email", "Meeting", "Visit", "Note", "Follow-up"],
      },
      priority: {
        type: "string",
        title: "Priority",
        enum: ["Low", "Medium", "High"],
      },
      subject: {
        type: "string",
        title: "Subject",
        minLength: 3,
      },
      description: {
        type: "string",
        title: "Description",
      },
      outcome: {
        type: "string",
        title: "Outcome",
        enum: ["Successful", "No Answer", "Left Voicemail", "Busy", "Cancelled", "Approved", "Rejected", "Other"],
      },
      duration_minutes: {
        type: "integer",
        title: "Duration (minutes)",
        minimum: 0,
      },
      // assigned_to: {
      //   type: "string", // This will be a UUID, but rjsf expects string for select/dropdown
      //   title: "Assigned To",
      //   // The DynamicForm's enum replacement logic will use this to fetch users
      //   enum: { table: "users", column: "name" }, // Assuming 'users' table and 'email' column for display
      // },
      next_follow_up_at: {
        type: "string", // For date-picker, RJSF uses string with 'date' format
        title: "Next Follow-up",
        format: "date",
      },
    },
  };

  const activityUiSchema = {
    activity_type: {
      "ui:placeholder": "Select activity type",
    },
    priority: {
      "ui:placeholder": "Select priority",
    },
    subject: {
      "ui:placeholder": "Brief description of the activity",
    },
    description: {
      "ui:widget": "textarea",
      "ui:placeholder": "Detailed notes about this activity...",
    },
    outcome: {
      "ui:placeholder": "Select outcome",
    },
    // assigned_to: {
    //   "ui:placeholder": "Select user",
    // },
    next_follow_up_at: {
      "ui:widget": "date",
    },
    // Replicating the layout from the image using ui:layout for DynamicForm
    // "ui:layout": [
    //   {
    //     activity_type: { span: 12 },
    //     priority: { span: 12 },
    //   },
    //   {
    //     subject: { span: 24 },
    //   },
    //   {
    //     description: { span: 24 },
    //   },
    //   {
    //     outcome: { span: 12 },
    //     duration_minutes: { span: 12 },
    //   },
    //   {
    //     assigned_to: { span: 12 },
    //     next_follow_up_at: { span: 12 },
    //   },
    // ],
  };

  // Fetch activities for the current entity
  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ent_activities')
      .select('*')
      .eq('entity_name', entity_name)
      .eq('entity_id', entity_id)
      .order('created_at', { ascending: false });

    if (error) {
      notification.error({ message: 'Error fetching activities', description: error.message });
    } else if (data) {
      setActivities(data as Activity[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
    // Set up real-time listener for activities
    const activitySubscription = supabase
      .channel(`activities_for_${entity_name}_${entity_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ent_activities', filter: `entity_name=eq.${entity_name}` }, payload => {
        // Only update if the change is relevant to the current entity_id
        const changedActivity = payload.new || payload.old;
        if (changedActivity && changedActivity.entity_id === entity_id) {
          fetchActivities(); // Re-fetch to ensure data consistency
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activitySubscription);
    };
  }, [entity_name, entity_id]);

  // Handle opening the modal for adding a new activity
  const handleAddActivity = () => {
    setCurrentActivity(null); // Clear any previous activity data
    setIsModalVisible(true);
  };

  // Handle opening the modal for editing an activity
  const handleEditActivity = (activity: Activity) => {
    setCurrentActivity(activity);
    setIsModalVisible(true);
  };

  // Handle deleting an activity
  const handleDeleteActivity = async (id: string) => {
    setLoading(true); // Show loading while deleting
    const { error } = await supabase
      .from('ent_activities')
      .delete()
      .eq('id', id);

    if (error) {
      notification.error({ message: 'Error deleting activity', description: error.message });
    } else {
      notification.success({ message: 'Activity deleted successfully' });
      fetchActivities(); // Refresh the list
    }
    setLoading(false);
  };

  // Handle form submission (add or update)
  const handleFormSubmit = async (formData: any) => {
    setSubmitting(true);
    const userId = (await supabase.auth.getSession()).data.session?.user?.id;

    // Determine common fields from formData
    const commonFields = {
      created_by:user?.id,
      activity_type: formData.activity_type,
      priority: formData.priority,
      subject: formData.subject,
      description: formData.description,
      outcome: formData.outcome,
      duration_minutes: formData.duration_minutes,
      // assigned_to: formData.assigned_to,
      next_follow_up_at: formData.next_follow_up_at,
      // Status handling: if there's a next follow up, it's pending/scheduled. If it's just logged, it's completed.
      status: formData.next_follow_up_at ? 'scheduled' : 'completed',
      is_completed: !formData.next_follow_up_at, // If no follow-up, assume completed
      completed_at: !formData.next_follow_up_at ? new Date().toISOString() : null,
      scheduled_start_at: formData.next_follow_up_at ? moment(formData.next_follow_up_at).startOf('day').toISOString() : null,
      scheduled_end_at: formData.next_follow_up_at ? moment(formData.next_follow_up_at).endOf('day').toISOString() : null,
      actual_start_at: !formData.next_follow_up_at ? new Date().toISOString() : null,
      actual_end_at: !formData.next_follow_up_at ? new Date().toISOString() : null,
      details: formData, // Store the entire form data in the JSONB details column
    };

    if (currentActivity) {
      // Update existing activity
      const { error } = await supabase
        .from('ent_activities')
        .update({
          ...commonFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentActivity.id);

      if (error) {
        notification.error({ message: 'Error updating activity', description: error.message });
      } else {
        notification.success({ message: 'Activity updated successfully' });
        setIsModalVisible(false);
        fetchActivities();
      }
    } else {
      // Add new activity
      const { error } = await supabase
        .from('ent_activities')
        .insert({
          ...commonFields,
          entity_name,
          entity_id,
          created_by: user?.id,
        });

      if (error) {
        notification.error({ message: 'Error adding activity', description: error.message });
      } else {
        notification.success({ message: 'Activity added successfully' });
        setIsModalVisible(false);
        fetchActivities();
      }
    }
    setSubmitting(false);
  };

  const handleCancelModal = () => {
    setIsModalVisible(false);
    setCurrentActivity(null);
  };

  // Function to format date for display
  const formatDate = (dateString?: string) => {
    return dateString ? moment(dateString).format('MMM D, YYYY') : 'N/A';
  };

  return (
    <Card
      // title={`Activities for ${entity_name} (ID: ${entity_id})`}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddActivity}>
          Add Activity
        </Button>
      }
      className="rounded-lg shadow-md"
    >
      <Spin spinning={loading}>
        <List
          itemLayout="horizontal"
          dataSource={activities}
          renderItem={activity => (
            <List.Item
              actions={[
                <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => handleEditActivity(activity)}>Edit</Button>,
                <Popconfirm
                  key="delete"
                  title="Are you sure to delete this activity?"
                  onConfirm={() => handleDeleteActivity(activity.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="link" danger icon={<DeleteOutlined />}>Delete</Button>
                </Popconfirm>,
              ]}
              className="px-4 py-3 border-b last:border-b-0"
            >
              <List.Item.Meta
                title={
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-base">{activity.subject || 'No Subject'}</span>
                    <span className="text-sm text-gray-500">({activity.activity_type})</span>
                  </div>
                }
                description={
                  <>
                    <p className="text-gray-700">{activity.description || 'No description provided.'}</p>
                    <div className="flex flex-wrap gap-x-4 text-sm text-gray-600 mt-2">
                      {activity.priority && <span>Priority: <span className="font-medium">{activity.priority}</span></span>}
                      {activity.outcome && <span>Outcome: <span className="font-medium">{activity.outcome}</span></span>}
                      {activity.duration_minutes !== undefined && <span>Duration: <span className="font-medium">{activity.duration_minutes} mins</span></span>}
                      {activity.next_follow_up_at && <span>Follow-up: <span className="font-medium">{formatDate(activity.next_follow_up_at)}</span></span>}
                      {activity.status && <span>Status: <span className="font-medium capitalize">{activity.status}</span></span>}
                      {activity.is_completed && <span>Completed: <span className="font-medium">{formatDate(activity.completed_at)}</span></span>}
                      <span>Created: {formatDate(activity.created_at)}</span>
                    </div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Spin>

      <Modal
        title={currentActivity ? "Edit Activity" : "Add New Activity"}
        open={isModalVisible}
        onCancel={handleCancelModal}
        footer={null} // DynamicForm provides its own submit button
        width={700} // Adjust width as needed
      >
        <Spin spinning={submitting}>
          <DynamicForm
            schemas={{ data_schema: activityDataSchema, ui_schema: activityUiSchema }}
            formData={currentActivity ? currentActivity.details : undefined} // Pass existing details for editing
            onFinish={handleFormSubmit}
          />
        </Spin>
      </Modal>
    </Card>
  );
};

export default ActivitiesManager;
