// Settings page
import { Card, Switch, Form, message } from 'antd';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/core/lib/store';

import { useTranslation } from 'react-i18next';

const Settings = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [form] = Form.useForm();

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
      message.success(t('common.message.update_success'));
    },
    onError: () => {
      message.error(t('common.message.update_failed'));
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

        if (permission === 'granted') {
          form.setFieldValue('pushNotifications', true);
          updateMutation.mutate({ ...form.getFieldsValue(), pushNotifications: true });
        } else {
          message.warning(t('common.message.permission_denied'));
          form.setFieldValue('pushNotifications', false);
        }
      } catch (error) {
        message.error(t('common.message.error'));
        form.setFieldValue('pushNotifications', false);
      }
    } else {
      message.warning(t('common.message.not_supported'));
      form.setFieldValue('pushNotifications', false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto p-4"
    >
      <Card title={t('common.label.notification_settings')}>
        <Form
          form={form}
          layout="vertical"
          initialValues={settings}
          onValuesChange={(_, values) => updateMutation.mutate(values)}
        >
          <Form.Item
            name="onlineVisibility"
            label={t('common.label.online_visibility')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="emailSubscription"
            label={t('common.label.email_notifications')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="pushNotifications"
            label={t('common.label.push_notifications')}
            valuePropName="checked"
          >
            <Switch onChange={handlePushNotifications} />
          </Form.Item>
        </Form>
      </Card>
    </motion.div>
  );
};

export default Settings;