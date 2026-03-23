import React from 'react';
import { Card, Row, Col, Button, Tag, Space } from 'antd';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Subscription } from '@/lib/types';

export const getSubscriptions = async () => {
  const { data, error } = await supabase
    .schema('public')
    .from('subscriptions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Subscription[];
};

const Subscriptions = () => {
  const { t } = useTranslation();
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['public-subscriptions'],
    queryFn: getSubscriptions,
  });

  return (
    <div className="py-12 px-4 sm:px-6">
      <Space direction="vertical" size="large" className="w-full max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-[var(--color-text)] mb-4">{t('subscriptions.list')}</h1>
          <p className="text-lg text-[var(--color-text-secondary)]">{t('subscriptions.title')}</p>
        </motion.div>

        <Row gutter={[24, 24]}>
          {subscriptions.map((subscription, index) => (
            <Col xs={24} md={8} key={subscription.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  title={subscription.name}
                  className="h-full bg-[var(--color-background)] border-[var(--color-border)]"
                  actions={[
                    <Button key="subscribe" className="bg-[var(--color-background-secondary)]">
                      {t('common.add')}
                    </Button>,
                  ]}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-[var(--color-text)]">{t('subscriptions.moduleFeatures')}</h4>
                      <div className="space-x-2">
                        {subscription.module_features.map((feature) => (
                          <Tag key={feature} className="bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]">
                            {feature}
                          </Tag>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 text-[var(--color-text)]">{t('subscriptions.limits')}</h4>
                      <ul className="list-disc list-inside text-[var(--color-text-secondary)]">
                        {Object.entries(subscription.limits || {}).map(([key, value]) => (
                          <li key={key}>
                            {key}: {String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </Space>
    </div>
  );
};

export default Subscriptions;