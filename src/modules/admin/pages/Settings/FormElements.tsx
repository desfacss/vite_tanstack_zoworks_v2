import React from 'react';
import {
    Card,
    Input,
    Select,
    InputNumber,
    DatePicker,
    Space,
    Typography,
    Form,
    Row,
    Col,
    Divider
} from 'antd';
import {
    Type,
    Search,
    Mail,
    Lock,
    Globe,
    Settings,
    User,
    Calendar,
    Hash
} from 'lucide-react';

const { Title, Text } = Typography;
const { Option } = Select;

const FormElementsShowcase: React.FC = () => {
    return (
        <div className="page-container animate-fadeIn">
            <div className="page-header">
                <Title level={2} className="page-title">Form Elements Showcase</Title>
                <Text className="text-subtitle">Testing inclusive borders and primary branding on global form containers.</Text>
            </div>

            <div className="space-y-8">
                <Card title="Standard Inputs">
                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={12}>
                            <Space direction="vertical" className="w-full" size="middle">
                                <div>
                                    <Text strong block className="mb-2">Basic Input</Text>
                                    <Input placeholder="Basic input" />
                                </div>

                                <div>
                                    <Text strong block className="mb-2">With Prefix (Inclusive Border Test)</Text>
                                    <Input prefix={<Type size={16} />} placeholder="Input with prefix" />
                                </div>

                                <div>
                                    <Text strong block className="mb-2">With Suffix</Text>
                                    <Input suffix={<Settings size={16} />} placeholder="Input with suffix" />
                                </div>

                                <div>
                                    <Text strong block className="mb-2">With Prefix & Suffix</Text>
                                    <Input
                                        prefix={<User size={16} />}
                                        suffix={<Mail size={16} />}
                                        placeholder="Input with both"
                                    />
                                </div>
                            </Space>
                        </Col>

                        <Col xs={24} md={12}>
                            <Space direction="vertical" className="w-full" size="middle">
                                <div>
                                    <Text strong block className="mb-2">Password (Affix Wrapper)</Text>
                                    <Input.Password prefix={<Lock size={16} />} placeholder="Password input" />
                                </div>

                                <div>
                                    <Text strong block className="mb-2">Search Input</Text>
                                    <Input.Search prefix={<Search size={16} />} placeholder="Search input" />
                                </div>

                                <div>
                                    <Text strong block className="mb-2">Group Wrapper (Addons)</Text>
                                    <Input addonBefore="https://" addonAfter=".com" defaultValue="mysite" />
                                </div>
                            </Space>
                        </Col>
                    </Row>
                </Card>

                <Card title="Selection & Numbers">
                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={12}>
                            <Space direction="vertical" className="w-full" size="middle">
                                <div>
                                    <Text strong block className="mb-2">Select (Basic)</Text>
                                    <Select className="w-full" placeholder="Select an option">
                                        <Option value="1">Option 1</Option>
                                        <Option value="2">Option 2</Option>
                                    </Select>
                                </div>

                                <div>
                                    <Text strong block className="mb-2">Select with Prefix Icon</Text>
                                    <div className="flex gap-2 items-center">
                                        <Globe size={18} className="text-primary" />
                                        <Select className="w-full" defaultValue="en">
                                            <Option value="en">English</Option>
                                            <Option value="hi">Hindi</Option>
                                        </Select>
                                    </div>
                                    <Text type="secondary" className="text-xs">Testing manual icon + select vs Antd internal prefix if applicable.</Text>
                                </div>
                            </Space>
                        </Col>

                        <Col xs={24} md={12}>
                            <Space direction="vertical" className="w-full" size="middle">
                                <div>
                                    <Text strong block className="mb-2">InputNumber with Suffix (Inclusive Border Test)</Text>
                                    <InputNumber
                                        className="w-full"
                                        prefix={<Hash size={16} />}
                                        suffix="px"
                                        defaultValue={12}
                                    />
                                </div>

                                <div>
                                    <Text strong block className="mb-2">DatePicker</Text>
                                    <DatePicker className="w-full" suffixIcon={<Calendar size={16} />} />
                                </div>
                            </Space>
                        </Col>
                    </Row>
                </Card>

                <Card title="Validation States">
                    <Form layout="vertical">
                        <Row gutter={[24, 24]}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Error State"
                                    validateStatus="error"
                                    help="This is an error message"
                                >
                                    <Input prefix={<Mail size={16} />} placeholder="Error input" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Warning State"
                                    validateStatus="warning"
                                >
                                    <Input prefix={<Settings size={16} />} placeholder="Warning input" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Card>
            </div>
        </div>
    );
};

export default FormElementsShowcase;
