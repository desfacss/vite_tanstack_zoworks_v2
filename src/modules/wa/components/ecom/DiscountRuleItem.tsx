// src/components/ecom/DiscountRuleItem.tsx

import React from 'react';
import { Form, InputNumber, Select, Space } from 'antd';
import { MinusCircleOutlined } from '@ant-design/icons';
import { Offering, CustomerSegment, Location } from '../../types/ecom';

const { Option } = Select;

interface DiscountRuleItemProps {
    name: number;
    form: any;
    restField: any;
    remove: (index: number) => void;
    offerings: Offering[];
    customerSegments: CustomerSegment[];
    locations: Location[];
}

const getTargetOptions = (ruleType: string, offerings: Offering[], customerSegments: CustomerSegment[], locations: Location[]) => {
    switch (ruleType) {
        case 'offering':
            return offerings.map(o => ({ key: o.id, label: o.name, value: o.id }));
        case 'customer_segment':
            return customerSegments.map(cs => ({ key: cs.id, label: cs.name, value: cs.id }));
        case 'location':
            return locations.map(l => ({ key: l.id, label: l.name, value: l.id }));
        default:
            return [];
    }
};

const DiscountRuleItem: React.FC<DiscountRuleItemProps> = ({ name, form, restField, remove, offerings, customerSegments, locations }) => {
    const ruleType = Form.useWatch(['rules', name, 'rule_type'], form);

    return (
        <Space key={name} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
            <Form.Item name={[name, 'id']} hidden />
            <Form.Item
                {...restField}
                name={[name, 'rule_type']}
                rules={[{ required: true, message: 'Missing rule type' }]}
            >
                <Select placeholder="Rule Type" style={{ width: 120 }}>
                    <Option value="offering">Offering</Option>
                    <Option value="customer_segment">Customer Segment</Option>
                    <Option value="location">Location</Option>
                </Select>
            </Form.Item>
            <Form.Item
                {...restField}
                name={[name, 'target_id']}
                rules={[{ required: true, message: 'Missing target' }]}
            >
                <Select
                    placeholder="Select Target"
                    style={{ minWidth: 200 }}
                    options={getTargetOptions(ruleType, offerings, customerSegments, locations)}
                />
            </Form.Item>
            <Form.Item {...restField} name={[name, 'min_quantity']}>
                <InputNumber placeholder="Min Qty" min={1} />
            </Form.Item>
            <MinusCircleOutlined onClick={() => remove(name)} />
        </Space>
    );
};

export default DiscountRuleItem;
