// src/pages/SamplePage.tsx
// This is a sample page template for developing new modules

import React from 'react';
import { Typography, Space, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/lib/store';
import { Plus, Settings } from 'lucide-react';
import {
    PageActionBar,
    ActionBarLeft,
    ActionBarRight,
    PageTitle,
    PrimaryAction,
    MoreMenu,
} from '@/core/components/ActionBar';

const { Text, Paragraph } = Typography;

const SamplePage: React.FC = () => {
    const { t } = useTranslation();
    const { user, organization, location } = useAuthStore();

    const handleCreate = () => {
        console.log('Create new item');
    };

    const menuItems = [
        {
            key: 'configure',
            label: t('modules.sample.action.configure'),
            icon: <Settings size={16} />,
            onClick: () => console.log('Configure clicked'),
        },
    ];

    return (
        <div className="page-content layout-canvas">
            {/* Page Header with Action Bar */}
            <PageActionBar>
                <ActionBarLeft>
                    <PageTitle
                        title={t('modules.sample.label.description')}
                    />
                </ActionBarLeft>
                <ActionBarRight>
                    <PrimaryAction
                        label={t('modules.sample.action.create_item')}
                        icon={<Plus size={16} />}
                        onClick={handleCreate}
                    />
                    <MoreMenu items={menuItems} />
                </ActionBarRight>
            </PageActionBar>

            {/* Context Info Card - Uses .page-card for animation */}
            <div className="page-card">
                <h1 className="text-h1 text-center">{t('common.label.session_context')}</h1>
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
            </div>

            {/* Development Notes - Uses .page-card for animation */}
            <div className="page-card">
                <h2 className="text-h2">{t('modules.sample.label.dev_notes')}</h2>
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
            </div>
        </div>
    );

};

export default SamplePage;
