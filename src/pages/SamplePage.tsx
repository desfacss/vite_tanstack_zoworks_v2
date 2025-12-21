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
                <Title level={2}>Sample Module Page</Title>
                <Text type="secondary">
                    This is your starting point for developing a new module.
                    The full auth flow, org/location switching, themes, and i18n are already working.
                </Text>
            </div>

            {/* Context Info Card */}
            <Card className="mb-6" title="Current Session Context">
                <Space direction="vertical" className="w-full">
                    <div>
                        <Text strong>User: </Text>
                        <Text>{user?.name || 'N/A'}</Text>
                    </div>
                    <div>
                        <Text strong>Organization: </Text>
                        <Text>{organization?.name || 'N/A'}</Text>
                    </div>
                    <div>
                        <Text strong>Location: </Text>
                        <Text>{location?.name || 'All Locations'}</Text>
                    </div>
                </Space>
            </Card>

            {/* Action Buttons */}
            <Card className="mb-6" title="Quick Actions">
                <Space wrap>
                    <Button type="primary" icon={<Plus size={16} />}>
                        Create New Item
                    </Button>
                    <Button icon={<Settings size={16} />}>
                        Configure Module
                    </Button>
                </Space>
            </Card>

            {/* Development Notes */}
            <Card title="Development Notes">
                <Paragraph>
                    <Text strong>Available Features:</Text>
                </Paragraph>
                <ul className="list-disc pl-6 space-y-2">
                    <li>✅ Authentication (Login, Logout, Session Management)</li>
                    <li>✅ Organization & Location Switching</li>
                    <li>✅ Theme Toggle (Light/Dark mode)</li>
                    <li>✅ Language Switching (i18n)</li>
                    <li>✅ DynamicViews (Table, Grid, Kanban, Calendar)</li>
                    <li>✅ DynamicForms (RJSF-based forms)</li>
                    <li>✅ Dashboard with widgets</li>
                    <li>✅ User Settings/Profile page</li>
                </ul>

                <Divider />

                <Paragraph>
                    <Text strong>Next Steps:</Text>
                </Paragraph>
                <ol className="list-decimal pl-6 space-y-2">
                    <li>Add your new route to <code>src/routes/index.tsx</code></li>
                    <li>Create your page components in <code>src/pages/</code></li>
                    <li>Use DynamicViews for list pages</li>
                    <li>Use DynamicForm for create/edit forms</li>
                    <li>Connect to Supabase tables for data</li>
                </ol>
            </Card>
        </motion.div>
    );
};

export default SamplePage;
