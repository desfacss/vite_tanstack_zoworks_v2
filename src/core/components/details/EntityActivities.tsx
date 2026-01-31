import React, { useState, useEffect } from 'react';
import { message, Spin, Button, Modal, Typography, Space, Tag, Timeline } from 'antd';
import { Clock, User, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import dayjs from 'dayjs';
import DynamicForm from '../DynamicForm';

const { Text } = Typography;

interface ActivityRecord {
  id: string;
  activity_type: string;
  subject: string;
  description: string;
  outcome: string;
  metadata: any;
  performed_by: string;
  performed_by_name: string;
  created_at: string;
}

interface EntityActivitiesProps {
  entity_id: string;
}

const EntityActivities: React.FC<EntityActivitiesProps> = ({ entity_id }) => {
  const { user, organization } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activityDataSchema = {
    type: "object",
    required: ["activity_type", "subject"],
    properties: {
      activity_type: {
        type: "string",
        title: "Activity Type",
        enum: ["Phone Call", "Email", "Meeting", "Visit", "Note", "System Change"],
      },
      subject: {
        type: "string",
        title: "Subject",
      },
      description: {
        type: "string",
        title: "Description",
      },
      outcome: {
        type: "string",
        title: "Outcome",
        enum: ["Success", "Pending", "Failed", "N/A"],
      },
    },
  };

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        let query = supabase
          .schema('core')
          .from('object_activities')
          .select('*')
          .eq('object_id', entity_id);

        const org_id = user?.organization_id || organization?.id;
        if (org_id) {
          query = query.eq('organization_id', org_id);
        }

        const { data: records, error: fetchError } = await query.order('created_at', { ascending: false });

        if (fetchError) {
          message.error('Failed to fetch activities.');
          console.error(fetchError);
          return;
        }

        const performerIds = [...new Set((records || []).map(a => a.performed_by || a.created_by).filter(Boolean))];
        const userMap: Record<string, string> = {};

        if (performerIds.length > 0) {
          const { data: users, error: userError } = await supabase
            .schema('identity')
            .from('users')
            .select('id, name')
            .in('id', performerIds);

          if (!userError && users) {
            users.forEach(u => {
              userMap[u.id] = u.name;
            });
          }
        }

        setActivities(
          (records || []).map((item: any) => ({
            id: item.id,
            activity_type: item.activity_type,
            subject: item.subject,
            description: item.description,
            outcome: item.outcome,
            metadata: item.metadata,
            performed_by: item.performed_by || item.created_by,
            performed_by_name: userMap[item.performed_by || item.created_by] || 'System',
            created_at: item.created_at,
          }))
        );
      } catch (err) {
        message.error('An unexpected error occurred.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (entity_id) {
      fetchActivities();
    }
  }, [entity_id, user?.organization_id]);

  const handleFormSubmit = async (formData: any) => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const org_id = user?.organization_id || organization?.id;
      const { data, error } = await supabase
        .schema('core')
        .from('object_activities')
        .insert({
          object_id: entity_id,
          organization_id: org_id,
          activity_type: formData.activity_type,
          subject: formData.subject,
          description: formData.description,
          outcome: formData.outcome,
          performed_by: user.id,
          metadata: formData,
        })
        .select()
        .single();

      if (error) throw error;

      const newActivity: ActivityRecord = {
        id: data.id,
        activity_type: data.activity_type,
        subject: data.subject,
        description: data.description,
        outcome: data.outcome,
        metadata: data.metadata,
        performed_by: data.performed_by || data.created_by,
        performed_by_name: user.name || 'Unknown',
        created_at: data.created_at,
      };

      setActivities(prev => [newActivity, ...prev]);
      setIsModalVisible(false);
      message.success('Activity logged!');
    } catch (err) {
      console.error(err);
      message.error('Failed to log activity.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .schema('core')
        .from('object_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setActivities(prev => prev.filter(a => a.id !== id));
      message.success('Activity deleted.');
    } catch (err) {
      console.error(err);
      message.error('Failed to delete activity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsModalVisible(true)}
          >
            Log Activity
          </Button>
        </div>

        <Spin spinning={loading}>
          <Timeline
            mode="left"
            items={activities.map(activity => ({
              label: dayjs(activity.created_at).format('MMM D, YYYY'),
              children: (
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: '16px' }}>{activity.subject}</Text>
                      <Tag color="processing">{activity.activity_type}</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <Space>
                        <User size={12} /> {activity.performed_by_name}
                        <Clock size={12} /> {dayjs(activity.created_at).format('HH:mm')}
                      </Space>
                    </Text>
                    {activity.description && <Text>{activity.description}</Text>}
                    {activity.outcome && <Tag color={activity.outcome === 'Success' ? 'success' : 'default'}>{activity.outcome}</Tag>}
                    
                    {user?.id === activity.performed_by && (
                      <Button 
                        type="text" 
                        danger 
                        size="small" 
                        icon={<Trash2 size={12} />} 
                        onClick={() => handleDeleteActivity(activity.id)}
                        style={{ position: 'absolute', right: -40, top: 0 }}
                      />
                    )}
                  </Space>
                </div>
              ),
            }))}
          />
        </Spin>
      </Space>

      <Modal
        title="Log New Activity"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Spin spinning={submitting}>
          <DynamicForm
            schemas={{ data_schema: activityDataSchema }}
            onFinish={handleFormSubmit}
          />
        </Spin>
      </Modal>
    </div>
  );
};

export default EntityActivities;
