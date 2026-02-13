import React from 'react';
import {
    Card,
    Button,
    Select,
    Input,
    InputNumber,
    Space,
    Typography
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Available fields for segmentation rules
const RULE_FIELDS = [
    { value: 'message_count', label: 'Message Count', type: 'number', source: 'wa' },
    { value: 'days_since_last_message', label: 'Days Since Last Message', type: 'number', source: 'computed' },
    { value: 'conversation_count', label: 'Conversation Count', type: 'number', source: 'wa' },
    { value: 'total_orders', label: 'Total Orders', type: 'number', source: 'erp' },
    { value: 'total_order_value', label: 'Total Order Value', type: 'number', source: 'erp' },
    { value: 'tags', label: 'Has Tag', type: 'contains', source: 'wa' },
];

// Operators by value type
const OPERATORS = {
    number: [
        { value: 'eq', label: '=' },
        { value: 'neq', label: '≠' },
        { value: 'gt', label: '>' },
        { value: 'gte', label: '≥' },
        { value: 'lt', label: '<' },
        { value: 'lte', label: '≤' },
    ],
    contains: [
        { value: 'contains', label: 'contains' },
    ],
    text: [
        { value: 'eq', label: 'equals' },
        { value: 'neq', label: 'not equals' },
        { value: 'contains', label: 'contains' },
    ],
    boolean: [
        { value: 'eq', label: 'is' },
    ]
};

export interface SegmentRule {
    field: string;
    operator: string;
    value: string | number;
    source?: string;
}

interface RuleBuilderProps {
    rules: SegmentRule[];
    onChange: (rules: SegmentRule[]) => void;
    disabled?: boolean;
}

const RuleBuilder: React.FC<RuleBuilderProps> = ({ rules, onChange, disabled }) => {
    const addRule = () => {
        onChange([
            ...rules,
            { field: 'message_count', operator: 'gte', value: 1, source: 'wa' }
        ]);
    };

    const removeRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        onChange(newRules);
    };

    const updateRule = (index: number, field: keyof SegmentRule, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };

        // When field changes, update source and reset operator
        if (field === 'field') {
            const fieldDef = RULE_FIELDS.find(f => f.value === value);
            if (fieldDef) {
                newRules[index].source = fieldDef.source;
                // Reset to first valid operator for this field type
                const ops = OPERATORS[fieldDef.type as keyof typeof OPERATORS] || OPERATORS.number;
                newRules[index].operator = ops[0].value;
            }
        }

        onChange(newRules);
    };

    const getFieldType = (fieldValue: string): string => {
        const fieldDef = RULE_FIELDS.find(f => f.value === fieldValue);
        return fieldDef?.type || 'number';
    };

    const getOperatorsForField = (fieldValue: string) => {
        const type = getFieldType(fieldValue);
        return OPERATORS[type as keyof typeof OPERATORS] || OPERATORS.number;
    };

    return (
        <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong>Segment Rules</Text>
                <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={addRule}
                    disabled={disabled}
                >
                    Add Rule
                </Button>
            </div>

            {rules.length === 0 ? (
                <Card size="small" style={{ background: 'var(--bg-secondary)', textAlign: 'center' }}>
                    <Text type="secondary">No rules defined. Add a rule to create a dynamic segment.</Text>
                </Card>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {rules.map((rule, index) => (
                        <Card key={index} size="small" style={{ background: 'var(--bg-secondary)' }}>
                            <Space wrap style={{ width: '100%' }}>
                                {/* Field selector */}
                                <Select
                                    value={rule.field}
                                    onChange={(val) => updateRule(index, 'field', val)}
                                    style={{ width: 180 }}
                                    disabled={disabled}
                                    options={RULE_FIELDS.map(f => ({
                                        value: f.value,
                                        label: f.label
                                    }))}
                                />

                                {/* Operator selector */}
                                <Select
                                    value={rule.operator}
                                    onChange={(val) => updateRule(index, 'operator', val)}
                                    style={{ width: 100 }}
                                    disabled={disabled}
                                    options={getOperatorsForField(rule.field)}
                                />

                                {/* Value input */}
                                {getFieldType(rule.field) === 'number' ? (
                                    <InputNumber
                                        value={rule.value as number}
                                        onChange={(val) => updateRule(index, 'value', val || 0)}
                                        style={{ width: 100 }}
                                        disabled={disabled}
                                        min={0}
                                    />
                                ) : (
                                    <Input
                                        value={rule.value as string}
                                        onChange={(e) => updateRule(index, 'value', e.target.value)}
                                        style={{ width: 120 }}
                                        disabled={disabled}
                                        placeholder="Value"
                                    />
                                )}

                                {/* Delete button */}
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => removeRule(index)}
                                    disabled={disabled}
                                />
                            </Space>
                        </Card>
                    ))}

                    {rules.length > 1 && (
                        <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                            All rules must match (AND logic)
                        </Text>
                    )}
                </div>
            )}
        </div>
    );
};

export default RuleBuilder;
