import React, { useEffect, useState } from 'react';
import { Card, Switch, Form, message } from 'antd';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

const UserSettings = () => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const { data: settings } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('identity').from('users')
        .select('details')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      return data?.details?.settings || {
        onlineVisibility: true,
        emailSubscription: true,
        pushNotifications: false
      };
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase
        .schema('identity').from('users')
        .update({
          details: {
            ...user?.details,
            settings: values
          }
        })
        .eq('id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      message.success('Settings updated successfully');
    },
    onError: () => {
      message.error('Failed to update settings');
    }
  });

  const handlePushNotifications = async (checked: boolean) => {
    if (!checked) {
      form.setFieldValue('pushNotifications', false);
      updateMutation.mutate({ ...form.getFieldsValue(), pushNotifications: false });
      return;
    }

    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        
        if (permission === 'granted') {
          form.setFieldValue('pushNotifications', true);
          updateMutation.mutate({ ...form.getFieldsValue(), pushNotifications: true });
        } else {
          message.warning('Push notifications permission denied');
          form.setFieldValue('pushNotifications', false);
        }
      } catch (error) {
        message.error('Error requesting notification permission');
        form.setFieldValue('pushNotifications', false);
      }
    } else {
      message.warning('Push notifications not supported in this browser');
      form.setFieldValue('pushNotifications', false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto p-4"
    >
      <Card title="Notification Settings">
        <Form
          form={form}
          layout="vertical"
          initialValues={settings}
          onValuesChange={(_, values) => updateMutation.mutate(values)}
        >
          <Form.Item
            name="onlineVisibility"
            label="Online Visibility"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="emailSubscription"
            label="Email Notifications"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="pushNotifications"
            label="Push Notifications"
            valuePropName="checked"
          >
            <Switch onChange={handlePushNotifications} />
          </Form.Item>
        </Form>
      </Card>
    </motion.div>
  );
};

export default UserSettings;