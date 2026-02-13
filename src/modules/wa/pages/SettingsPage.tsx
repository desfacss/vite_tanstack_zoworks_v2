import React, { useState } from 'react';
import { Card, Form, Input, Button, Switch, Typography, Space, Divider, Avatar, Upload, message, Select } from 'antd';
import { useResponsive } from '../hooks';
import { useSetPageHeader } from '../contexts/PageHeaderContext';
import { ActionBar } from '../components/common/ActionBar';
import { usePageTour } from '../help';
import { settingsTour } from '../help/tours';
import {
    UserOutlined,
    WhatsAppOutlined,
    BellOutlined,
    TeamOutlined,
    LockOutlined,
    UploadOutlined,
    SaveOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const SettingsPage: React.FC = () => {
    const { isMobile } = useResponsive();
    const [activeTab, setActiveTab] = useState('profile');
    const [profileForm] = Form.useForm();
    const [whatsappForm] = Form.useForm();

    // Set page header - title only
    useSetPageHeader({
        title: 'Settings',
    }, []);
    const handleSaveProfile = () => {
        profileForm.validateFields().then((values) => {
            message.success('Profile saved successfully!');
        });
    };

    const handleSaveWhatsApp = () => {
        whatsappForm.validateFields().then((values) => {
            message.success('WhatsApp settings saved!');
        });
    };

    const tabItems = [
        {
            key: 'profile',
            label: <span><UserOutlined /> Profile</span>,
            children: (
                <Card data-tour="profile-section">
                    <Form form={profileForm} layout="vertical" initialValues={{ name: 'Admin User', email: 'admin@company.com' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }} data-tour="profile-avatar">
                            <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#25D366' }} />
                            <div>
                                <Upload showUploadList={false}>
                                    <Button icon={<UploadOutlined />}>Change Avatar</Button>
                                </Upload>
                                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                                    JPG or PNG. Max size 2MB.
                                </Text>
                            </div>
                        </div>

                        <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                            <Input placeholder="Your name" className="input-mobile" data-tour="profile-name" />
                        </Form.Item>

                        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                            <Input placeholder="your@email.com" className="input-mobile" data-tour="profile-email" />
                        </Form.Item>

                        <Form.Item name="phone" label="Phone Number">
                            <Input placeholder="+1234567890" className="input-mobile" />
                        </Form.Item>

                        <Form.Item name="bio" label="Bio">
                            <TextArea placeholder="A short bio about yourself..." rows={3} />
                        </Form.Item>

                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveProfile} className={isMobile ? 'w-full' : ''} data-tour="profile-save">
                            Save Changes
                        </Button>
                    </Form>
                </Card>
            ),
        },
        {
            key: 'whatsapp',
            label: <span><WhatsAppOutlined /> WhatsApp</span>,
            children: (
                <Card data-tour="whatsapp-section">
                    <Title level={5}>WhatsApp Business API Configuration</Title>
                    <Paragraph type="secondary">
                        Connect your WhatsApp Business account to send and receive messages.
                    </Paragraph>

                    <Form form={whatsappForm} layout="vertical" style={{ marginTop: 24 }}>
                        <Form.Item name="phoneNumberId" label="Phone Number ID" rules={[{ required: true }]}>
                            <Input placeholder="Enter your WhatsApp Phone Number ID" className="input-mobile" data-tour="wa-phone-id" />
                        </Form.Item>

                        <Form.Item name="wabaId" label="WhatsApp Business Account ID" rules={[{ required: true }]}>
                            <Input placeholder="Enter your WABA ID" className="input-mobile" data-tour="wa-business-id" />
                        </Form.Item>

                        <Form.Item name="accessToken" label="Access Token" rules={[{ required: true }]}>
                            <Input.Password placeholder="Enter your access token" data-tour="wa-token" />
                        </Form.Item>

                        <Form.Item name="webhookToken" label="Webhook Verify Token">
                            <Input placeholder="Custom token for webhook verification" className="input-mobile" />
                        </Form.Item>

                        <Divider />

                        <Title level={5}>Message Settings</Title>

                        <Form.Item name="defaultReplyTime" label="Auto-reply Delay (seconds)">
                            <Input type="number" placeholder="0" style={{ width: isMobile ? '100%' : 200 }} className="input-mobile" />
                        </Form.Item>

                        <Form.Item name="autoResponse" label="Enable Auto-Response" valuePropName="checked">
                            <Switch />
                        </Form.Item>

                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveWhatsApp} className={isMobile ? 'w-full' : ''} data-tour="wa-save">
                            Save Configuration
                        </Button>
                    </Form>
                </Card>
            ),
        },
        {
            key: 'notifications',
            label: <span><BellOutlined /> Notifications</span>,
            children: (
                <Card data-tour="notifications-section">
                    <Title level={5}>Notification Preferences</Title>
                    <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-tour="notif-messages">
                            <div>
                                <Text strong>New Message Alerts</Text>
                                <Text type="secondary" style={{ display: 'block' }}>Get notified when you receive new messages</Text>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Divider style={{ margin: '8px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-tour="notif-assigned">
                            <div>
                                <Text strong>Assignment Notifications</Text>
                                <Text type="secondary" style={{ display: 'block' }}>Get notified when conversations are assigned to you</Text>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Divider style={{ margin: '8px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Text strong>Email Digest</Text>
                                <Text type="secondary" style={{ display: 'block' }}>Receive a daily summary of your inbox</Text>
                            </div>
                            <Switch />
                        </div>
                        <Divider style={{ margin: '8px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Text strong>Sound Notifications</Text>
                                <Text type="secondary" style={{ display: 'block' }}>Play a sound when new messages arrive</Text>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </Space>
                </Card>
            ),
        },
        {
            key: 'team',
            label: <span><TeamOutlined /> Team</span>,
            children: (
                <Card data-tour="team-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <Title level={5} style={{ margin: 0 }}>Team Members</Title>
                            <Text type="secondary">Manage your team and their permissions</Text>
                        </div>
                        <Button type="primary" icon={<UserOutlined />} data-tour="team-invite">Invite Member</Button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-tour="team-list">
                        {[
                            { name: 'John Smith', email: 'john@company.com', role: 'Admin' },
                            { name: 'Alice Brown', email: 'alice@company.com', role: 'Agent' },
                            { name: 'Bob Wilson', email: 'bob@company.com', role: 'Agent' },
                        ].map((member, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Avatar style={{ backgroundColor: '#25D366' }}>{member.name[0]}</Avatar>
                                    <div>
                                        <Text strong>{member.name}</Text>
                                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{member.email}</Text>
                                    </div>
                                </div>
                                <Select defaultValue={member.role} style={{ width: 120 }}>
                                    <Select.Option value="Admin">Admin</Select.Option>
                                    <Select.Option value="Agent">Agent</Select.Option>
                                    <Select.Option value="Viewer">Viewer</Select.Option>
                                </Select>
                            </div>
                        ))}
                    </div>
                </Card>
            ),
        },
        {
            key: 'security',
            label: <span><LockOutlined /> Security</span>,
            children: (
                <Card data-tour="security-section">
                    <Title level={5}>Change Password</Title>
                    <Form layout="vertical" style={{ maxWidth: 400, marginTop: 16 }} data-tour="security-password">
                        <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}>
                            <Input.Password placeholder="Enter current password" />
                        </Form.Item>
                        <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 8 }]}>
                            <Input.Password placeholder="Enter new password" />
                        </Form.Item>
                        <Form.Item name="confirmPassword" label="Confirm New Password" rules={[{ required: true }]}>
                            <Input.Password placeholder="Confirm new password" />
                        </Form.Item>
                        <Button type="primary">Update Password</Button>
                    </Form>

                    <Divider />

                    <div data-tour="security-2fa">
                        <Title level={5}>Two-Factor Authentication</Title>
                        <Paragraph type="secondary">Add an extra layer of security to your account</Paragraph>
                        <Button>Enable 2FA</Button>
                    </div>
                </Card>
            ),
        },
    ];

    // Action bar tabs (just labels, not children)
    const actionBarTabs = tabItems.map(t => ({
        key: t.key,
        label: t.label,
    }));

    // Find active tab content
    const activeContent = tabItems.find(t => t.key === activeTab)?.children;

    // Register help tour
    const { startTour: startSettingsTour } = usePageTour(settingsTour);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Action Bar with Tabs */}
            <ActionBar
                tabs={actionBarTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                secondaryActions={[
                    {
                        key: 'help',
                        label: 'Show Help Tour',
                        icon: <QuestionCircleOutlined />,
                        onClick: startSettingsTour,
                    },
                ]}
            />

            {/* Content */}
            <div style={{ padding: isMobile ? 12 : 24, flex: 1, overflow: 'auto' }}>
                {activeContent}
            </div>
        </div>
    );
};

export default SettingsPage;

