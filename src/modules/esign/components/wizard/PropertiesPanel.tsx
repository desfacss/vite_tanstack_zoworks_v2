import React from 'react';
import { Form, Input, Select, Switch, Empty } from 'antd';
import type { FieldPlacement, RecipientFormData } from '../../types';

interface PropertiesPanelProps {
    selectedField?: FieldPlacement;
    recipients: RecipientFormData[];
    updateFieldPlacement: (id: string, updates: Partial<FieldPlacement>) => void;
}

export function PropertiesPanel({ selectedField, recipients, updateFieldPlacement }: PropertiesPanelProps) {
    if (!selectedField) {
        return (
            <div className="h-full flex items-center justify-center">
                <Empty description="Select a field to edit properties" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Field Properties</h3>

            <Form layout="vertical">
                <Form.Item label="Assign to Recipient">
                    <Select
                        value={selectedField.recipientId}
                        onChange={(value) => updateFieldPlacement(selectedField.id, { recipientId: value })}
                        options={recipients.map((r) => ({
                            value: r.email,
                            label: `${r.name} (${r.email})`,
                        }))}
                    />
                </Form.Item>

                <Form.Item label="Field Label">
                    <Input
                        value={selectedField.fieldLabel}
                        onChange={(e) => updateFieldPlacement(selectedField.id, { fieldLabel: e.target.value })}
                    />
                </Form.Item>

                <Form.Item label="Required Field" valuePropName="checked">
                    <Switch
                        checked={selectedField.isRequired}
                        onChange={(checked) => updateFieldPlacement(selectedField.id, { isRequired: checked })}
                    />
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                    <Form.Item label="Width (px)">
                        <Input
                            type="number"
                            value={selectedField.width}
                            onChange={(e) => updateFieldPlacement(selectedField.id, { width: parseInt(e.target.value) || 0 })}
                        />
                    </Form.Item>
                    <Form.Item label="Height (px)">
                        <Input
                            type="number"
                            value={selectedField.height}
                            onChange={(e) => updateFieldPlacement(selectedField.id, { height: parseInt(e.target.value) || 0 })}
                        />
                    </Form.Item>
                </div>
            </Form>
        </div>
    );
}
