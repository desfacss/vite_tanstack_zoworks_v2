// src/modules/archive/utils/formsAndUtils.tsx
import React from 'react';
import { Form, Input, InputNumber, Select, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

// Utility Functions
export const hoursToUnit = (hours: number | undefined, unit: 'days' | 'hours' | 'minutes'): number | undefined => {
  if (hours === undefined) return undefined;
  switch (unit) {
    case 'days':
      return hours / 24;
    case 'minutes':
      return hours * 60;
    case 'hours':
    default:
      return hours;
  }
};

export const convertToUnit = (value: number | undefined, fromUnit: 'days' | 'hours' | 'minutes', toUnit: 'days' | 'hours' | 'minutes'): number | undefined => {
  if (value === undefined) return undefined;
  let hours: number;
  switch (fromUnit) {
    case 'days':
      hours = value * 24;
      break;
    case 'minutes':
      hours = value / 60;
      break;
    case 'hours':
    default:
      hours = value;
      break;
  }
  return hoursToUnit(hours, toUnit);
};

// PERTInput Component
interface PERTInputProps {
  optimistic: number;
  likely: number;
  pessimistic: number;
  aspirational?: number;
  reasons: string[];
  timeDisplay: 'days' | 'hours' | 'minutes';
  onChange: (field: string, value: any) => void;
  onUnitChange: (unit: 'days' | 'hours' | 'minutes') => void;
}

export const PERTInput: React.FC<PERTInputProps> = ({ optimistic, likely, pessimistic, aspirational, reasons, timeDisplay, onChange, onUnitChange }) => {
  return (
    <div>
      <Form.Item label={`Optimistic Time (${timeDisplay})`}>
        <InputNumber value={optimistic} onChange={(value) => onChange('optimistic', value)} min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label={`Most Likely Time (${timeDisplay})`}>
        <InputNumber value={likely} onChange={(value) => onChange('likely', value)} min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label={`Pessimistic Time (${timeDisplay})`}>
        <InputNumber value={pessimistic} onChange={(value) => onChange('pessimistic', value)} min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label={`Aspirational Time (${timeDisplay})`}>
        <InputNumber value={aspirational} onChange={(value) => onChange('aspirational', value)} min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label="Reasons">
        <Input.TextArea
          value={reasons.join('\n')}
          onChange={(e) => onChange('reasons', e.target.value.split('\n').filter((r) => r.trim()))}
          rows={3}
        />
      </Form.Item>
      <Form.Item label="Time Unit">
        <Select value={timeDisplay} onChange={onUnitChange} style={{ width: '100%' }}>
          <Option value="days">Days</Option>
          <Option value="hours">Hours</Option>
          <Option value="minutes">Minutes</Option>
        </Select>
      </Form.Item>
    </div>
  );
};

// RACIInput Component
interface RACIInputProps {
  raci: { responsible: string[]; accountable: string[]; consulted: string[]; informed: string[] };
  onChange: (raci: { responsible: string[]; accountable: string[]; consulted: string[]; informed: string[] }) => void;
}

export const RACIInput: React.FC<RACIInputProps> = ({ raci, onChange }) => {
  return (
    <div>
      <Form.Item label="Responsible">
        <Select mode="tags" value={raci.responsible} onChange={(value) => onChange({ ...raci, responsible: value })} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label="Accountable">
        <Select mode="tags" value={raci.accountable} onChange={(value) => onChange({ ...raci, accountable: value })} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label="Consulted">
        <Select mode="tags" value={raci.consulted} onChange={(value) => onChange({ ...raci, consulted: value })} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label="Informed">
        <Select mode="tags" value={raci.informed} onChange={(value) => onChange({ ...raci, informed: value })} style={{ width: '100%' }} />
      </Form.Item>
    </div>
  );
};

// AutomationActionForm Component
interface AutomationActionFormProps {
  allStageIds: string[];
}

export const AutomationActionForm: React.FC<AutomationActionFormProps> = ({ allStageIds }) => {
  return (
    <Form.List name="automation">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true, message: 'Missing type' }]}>
                <Input placeholder="Automation Type" />
              </Form.Item>
              <Form.Item {...restField} name={[name, 'description']}>
                <Input placeholder="Description" />
              </Form.Item>
              <Button type="link" onClick={() => remove(name)}>
                Remove
              </Button>
            </Space>
          ))}
          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
            Add Automation
          </Button>
        </>
      )}
    </Form.List>
  );
};

// DependencyForm Component
interface DependencyFormProps {
  allStageIds: string[];
}

export const DependencyForm: React.FC<DependencyFormProps> = ({ allStageIds }) => {
  return (
    <Form.List name="dependencies">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Form.Item {...restField} name={[name, 'task_id']} rules={[{ required: true, message: 'Missing task ID' }]}>
                <Input placeholder="Task ID" />
              </Form.Item>
              <Form.Item {...restField} name={[name, 'type']}>
                <Input placeholder="Type" />
              </Form.Item>
              <Button type="link" onClick={() => remove(name)}>
                Remove
              </Button>
            </Space>
          ))}
          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
            Add Dependency
          </Button>
        </>
      )}
    </Form.List>
  );
};

// ConditionForm Component
export const ConditionForm: React.FC = () => {
  return (
    <div>
      <Form.Item label="Rule" name="rule">
        <Input placeholder="Enter condition rule" />
      </Form.Item>
      <Form.Item label="Type" name="type" rules={[{ required: true, message: 'Please select a type' }]}>
        <Select style={{ width: '100%' }}>
          <Option value="expression">Expression</Option>
        </Select>
      </Form.Item>
      <Form.Item label="Description" name="description">
        <Input.TextArea rows={2} placeholder="Enter condition description" />
      </Form.Item>
    </div>
  );
};
