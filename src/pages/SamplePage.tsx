// src/pages/SamplePage.tsx
// This is a sample page template for developing new modules

import React from 'react';
import { Card, Typography, Button, Space, Divider } from 'antd';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/lib/store';
import { Plus, Settings } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;

const SamplePage: React.FC = () => {
    const { t } = useTranslation();
    const { user, organization, location } = useAuthStore();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 md:p-6"
        >
            {/* Page Header */}
            <div className="mb-6">
                <Title level={2}>{t('modules.sample.label.title')}</Title>
                <Text type="secondary">
                    {t('modules.sample.label.description')}
                </Text>
            </div>

            {/* Context Info Card */}
            <Card className="mb-6" title={t('modules.sample.label.context')}>
                <Space direction="vertical" className="w-full">
                    <div>
                        <Text strong>{t('common.label.users')}: </Text>
                        <Text>{user?.name || 'N/A'}</Text>
                    </div>
                    <div>
                        <Text strong>{t('common.label.organization')}: </Text>
                        <Text>{organization?.name || 'N/A'}</Text>
                    </div>
                    <div>
                        <Text strong>{t('common.label.location')}: </Text>
                        <Text>{location?.name || t('common.label.all_locations')}</Text>
                    </div>
                </Space>
            </Card>

            {/* Action Buttons */}
            <Card className="mb-6" title={t('core.welcome_hub.label.quick_actions')}>
                <Space wrap>
                    <Button type="primary" icon={<Plus size={16} />}>
                        {t('modules.sample.action.create_item')}
                    </Button>
                    <Button icon={<Settings size={16} />}>
                        {t('modules.sample.action.configure')}
                    </Button>
                </Space>
            </Card>

            {/* Development Notes */}
            <Card title={t('modules.sample.label.dev_notes')}>
                <Paragraph>
                    <Text strong>{t('modules.sample.label.available_features')}:</Text>
                </Paragraph>
                <ul className="list-disc pl-6 space-y-2">
                    <li>{t('modules.sample.feature.auth')}</li>
                    <li>{t('modules.sample.feature.switching')}</li>
                    <li>{t('modules.sample.feature.themes')}</li>
                    <li>{t('modules.sample.feature.i18n')}</li>
                    <li>{t('modules.sample.feature.views')}</li>
                    <li>{t('modules.sample.feature.forms')}</li>
                    <li>{t('modules.sample.feature.dashboard')}</li>
                    <li>{t('modules.sample.feature.settings')}</li>
                </ul>

                <Divider />

                <Paragraph>
                    <Text strong>{t('modules.sample.label.next_steps')}:</Text>
                </Paragraph>
                <ol className="list-decimal pl-6 space-y-2">
                    <li>{t('modules.sample.label.step_route')}</li>
                    <li>{t('modules.sample.label.step_components')}</li>
                    <li>{t('modules.sample.label.step_views')}</li>
                    <li>{t('modules.sample.label.step_forms')}</li>
                    <li>{t('modules.sample.label.step_supabase')}</li>
                </ol>
            </Card>
        </motion.div>
    );
};

export default SamplePage;
