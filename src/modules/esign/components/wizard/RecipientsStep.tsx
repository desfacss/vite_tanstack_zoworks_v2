import React from 'react';
import { Button, Form, Input, Select, Switch, Card, Space } from 'antd';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useESignWizardStore } from '../../stores/esignStore';
import type { RecipientFormData } from '../../types';

export function RecipientsStep() {
    const {
        recipients,
        requiresSigningOrder,
        setRequiresSigningOrder,
        addRecipient,
        updateRecipient,
        removeRecipient,
        setCurrentStep,
    } = useESignWizardStore();

    const handleAddRecipient = () => {
        const newRecipient: RecipientFormData = {
            name: '',
            email: '',
            phone: '',
            role: 'signer',
            authMethod: 'email',
            signingOrder: requiresSigningOrder ? recipients.length + 1 : undefined,
        };
        addRecipient(newRecipient);
    };

    const handleUpdateRecipient = (index: number, field: keyof RecipientFormData, value: any) => {
        const updated = { ...recipients[index], [field]: value };
        updateRecipient(index, updated);
    };

    const handleNext = () => {
        const hasValidRecipients = recipients.every((r) => r.name && r.email);
        if (hasValidRecipients && recipients.length > 0) {
            setCurrentStep(2);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Add Recipients</h2>
                <Space>
                    <span className="text-sm text-gray-400">Require signing order?</span>
                    <Switch
                        checked={requiresSigningOrder}
                        onChange={setRequiresSigningOrder}
                    />
                </Space>
            </div>

            <div className="space-y-4 mb-6">
                {recipients.map((recipient, index) => (
                    <Card key={index} size="small" className="shadow-sm">
                        <div className="flex items-start gap-4">
                            {requiresSigningOrder && (
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-semibold">
                                    {index + 1}
                                </div>
                            )}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Form.Item label="Name" className="mb-0" required>
                                    <Input
                                        placeholder="Full name"
                                        value={recipient.name}
                                        onChange={(e) => handleUpdateRecipient(index, 'name', e.target.value)}
                                    />
                                </Form.Item>

                                <Form.Item label="Email" className="mb-0" required>
                                    <Input
                                        type="email"
                                        placeholder="email@example.com"
                                        value={recipient.email}
                                        onChange={(e) => handleUpdateRecipient(index, 'email', e.target.value)}
                                    />
                                </Form.Item>

                                <Form.Item label="Phone" className="mb-0">
                                    <Input
                                        placeholder="+1234567890"
                                        value={recipient.phone}
                                        onChange={(e) => handleUpdateRecipient(index, 'phone', e.target.value)}
                                    />
                                </Form.Item>

                                <Form.Item label="Role" className="mb-0">
                                    <Select
                                        value={recipient.role}
                                        onChange={(value) => handleUpdateRecipient(index, 'role', value)}
                                        options={[
                                            { value: 'signer', label: 'Signer' },
                                            { value: 'viewer', label: 'Viewer (CC)' },
                                            { value: 'approver', label: 'Approver' },
                                        ]}
                                    />
                                </Form.Item>

                                <Form.Item label="Authentication" className="mb-0">
                                    <Select
                                        value={recipient.authMethod}
                                        onChange={(value) => handleUpdateRecipient(index, 'authMethod', value)}
                                        options={[
                                            { value: 'email', label: 'Email Link' },
                                            { value: 'whatsapp_otp', label: 'WhatsApp OTP' },
                                            { value: 'access_code', label: 'Access Code' },
                                            { value: 'none', label: 'None' },
                                        ]}
                                    />
                                </Form.Item>
                            </div>

                            <Button
                                danger
                                icon={<Trash2 size={16} />}
                                onClick={() => removeRecipient(index)}
                            />
                        </div>
                    </Card>
                ))}
            </div>

            <Button
                type="dashed"
                block
                icon={<Plus size={16} />}
                onClick={handleAddRecipient}
                className="mb-8"
            >
                Add Recipient
            </Button>

            <div className="flex justify-between gap-3">
                <Button
                    size="large"
                    icon={<ArrowLeft size={16} />}
                    onClick={() => setCurrentStep(0)}
                >
                    Previous
                </Button>
                <Button
                    type="primary"
                    size="large"
                    onClick={handleNext}
                    disabled={recipients.length === 0 || !recipients.every((r) => r.name && r.email)}
                >
                    Next: Place Fields
                </Button>
            </div>
        </div>
    );
}
