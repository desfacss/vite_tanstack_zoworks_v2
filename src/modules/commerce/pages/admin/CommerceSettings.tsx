import React from 'react';
import { Form, Input, Button, Card, Switch, Divider, Typography, InputNumber, Select, Space, message } from 'antd';
import { Save, Shield, Truck, CreditCard, Percent } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;

const CommerceSettings: React.FC = () => {
    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        console.log('Settings updated:', values);
        message.success('Commerce settings updated successfully!');
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <Title level={4}>Commerce Settings</Title>
                <Paragraph type="secondary">
                    Configure your store's business logic, tax rules, and integration preferences.
                </Paragraph>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                    tax_enabled: true,
                    tax_rate: 18,
                    currency: 'USD',
                    free_shipping_threshold: 99,
                    guest_checkout: true,
                    payment_methods: ['card', 'upi']
                }}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    <Card 
                        title={<Space><Percent size={18} /><span>Tax & Currency</span></Space>} 
                        bordered={false} 
                        className="shadow-sm"
                    >
                        <Form.Item name="currency" label="Base Currency">
                            <Select options={[
                                { label: 'US Dollar ($)', value: 'USD' },
                                { label: 'Euro (€)', value: 'EUR' },
                                { label: 'Indian Rupee (₹)', value: 'INR' },
                            ]} />
                        </Form.Item>
                        <Form.Item name="tax_enabled" label="Enable Automatic Tax Calculation" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                        <Form.Item name="tax_rate" label="Default Tax Rate (%)">
                            <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                    </Card>

                    <Card 
                        title={<Space><Truck size={18} /><span>Shipping & Delivery</span></Space>} 
                        bordered={false} 
                        className="shadow-sm"
                    >
                        <Form.Item name="free_shipping_enabled" label="Enable Free Shipping Threshold" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                        <Form.Item name="free_shipping_threshold" label="Minimum amount for free shipping">
                            <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="shipping_methods" label="Enabled Carriers">
                            <Select mode="multiple" placeholder="Select carriers" options={[
                                { label: 'FedEx', value: 'fedex' },
                                { label: 'UPS', value: 'ups' },
                                { label: 'DHL', value: 'dhl' },
                                { label: 'Local Pickup', value: 'local' },
                            ]} />
                        </Form.Item>
                    </Card>

                    <Card 
                        title={<Space><CreditCard size={18} /><span>Payment Methods</span></Space>} 
                        bordered={false} 
                        className="shadow-sm"
                    >
                        <Form.Item name="payment_methods" label="Active Payment Gateways">
                            <Select mode="multiple" options={[
                                { label: 'Stripe (Cards)', value: 'stripe' },
                                { label: 'Razorpay (UPI/EMI)', value: 'razorpay' },
                                { label: 'PayPal', value: 'paypal' },
                                { label: 'Cash on Delivery', value: 'cod' },
                            ]} />
                        </Form.Item>
                        <Form.Item name="guest_checkout" label="Allow Guest Checkout" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Card>

                    <Card 
                        title={<Space><Shield size={18} /><span>Compliance & Policy</span></Space>} 
                        bordered={false} 
                        className="shadow-sm"
                    >
                        <Form.Item name="return_policy_days" label="Return Window (Days)">
                            <InputNumber min={0} max={365} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="terms_required" label="Require Terms Acceptance" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Card>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Space>
                        <Button>Discard Changes</Button>
                        <Button type="primary" htmlType="submit" icon={<Save size={16} />}>
                            Save Settings
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );
};

export default CommerceSettings;
