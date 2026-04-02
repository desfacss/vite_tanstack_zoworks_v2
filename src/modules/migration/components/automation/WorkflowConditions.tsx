import React, { useState, useEffect } from 'react';
import { Card, Select, Input, Button, Space, Row, Col, Typography, Empty, Alert, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import type { ViewConfig, TableMetadata } from './types';

const { Title, Paragraph, Text } = Typography;

interface WorkflowCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

interface WorkflowConditionsProps {
  workflow: {
    id?: string;
    conditions?: any;
    trigger_table?: string;
  };
  onUpdate: (conditions: any) => void;
  availableTables?: ViewConfig[];
}

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_null', label: 'Is Null' },
  { value: 'is_not_null', label: 'Is Not Null' },
];

export function WorkflowConditions({ workflow, onUpdate, availableTables = [] }: WorkflowConditionsProps) {
  const [conditions, setConditions] = useState<WorkflowCondition[]>([]);
  const [tableMetadata, setTableMetadata] = useState<TableMetadata[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  useEffect(() => {
    if (workflow.conditions && Array.isArray(workflow.conditions)) {
      setConditions(workflow.conditions);
    } else {
      setConditions([]);
    }
  }, [workflow.conditions]);

  useEffect(() => {
    if (workflow.trigger_table) {
      loadTableMetadata();
    }
  }, [workflow.trigger_table, availableTables]);

  const loadTableMetadata = async () => {
    setLoadingMetadata(true);
    try {
      const tableConfig = availableTables.find(table => table.entity_type === workflow.trigger_table);
      if (tableConfig && tableConfig.metadata) {
        setTableMetadata(tableConfig.metadata);
      } else {
        const { data } = await supabase
          .from('y_view_config' as any)
          .select('metadata')
          .eq('entity_type', workflow.trigger_table)
          .eq('is_active', true)
          .maybeSingle();
        if (data?.metadata) {
          setTableMetadata(data.metadata);
        }
      }
    } catch (err) {
      console.error('Error loading metadata:', err);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const addCondition = () => {
    const newCondition: WorkflowCondition = {
      id: Date.now().toString(),
      field: '',
      operator: 'equals',
      value: '',
      logicalOperator: conditions.length > 0 ? 'AND' : undefined
    };
    const updated = [...conditions, newCondition];
    setConditions(updated);
    onUpdate(updated);
  };

  const updateCondition = (id: string, field: keyof WorkflowCondition, value: string) => {
    const updated = conditions.map(c => c.id === id ? { ...c, [field]: value } : c);
    setConditions(updated);
    onUpdate(updated);
  };

  const removeCondition = (id: string) => {
    const updated = conditions.filter(c => c.id !== id);
    setConditions(updated);
    onUpdate(updated);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={4}>Workflow Conditions</Title>
        <Paragraph type="secondary">Define when this workflow should execute</Paragraph>
      </div>

      {!workflow.trigger_table && (
        <Alert message="No Target Table Selected" type="warning" showIcon />
      )}

      {workflow.trigger_table && loadingMetadata ? (
        <div className="text-center p-8"><Spin /></div>
      ) : workflow.trigger_table && (
        <>
          {conditions.length === 0 ? (
            <Empty
              image={<FilterOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              description="No conditions set"
            >
              <Button type="primary" onClick={addCondition}>Add Condition</Button>
            </Empty>
          ) : (
            <Space direction="vertical" size="middle" className="w-full">
              {conditions.map((condition, index) => (
                <Card key={condition.id} size="small">
                  <Row gutter={8} align="middle">
                    {index > 0 && (
                      <Col span={3}>
                        <Select value={condition.logicalOperator} onChange={v => updateCondition(condition.id, 'logicalOperator', v as any)} style={{ width: '100%' }}>
                          <Select.Option value="AND">AND</Select.Option>
                          <Select.Option value="OR">OR</Select.Option>
                        </Select>
                      </Col>
                    )}
                    <Col span={index > 0 ? 7 : 10}>
                      <Select placeholder="Field" value={condition.field} onChange={v => updateCondition(condition.id, 'field', v)} style={{ width: '100%' }} showSearch>
                        {tableMetadata.map(f => (
                          <Select.Option key={f.key} value={f.key}>{f.display_name}</Select.Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={6}>
                      <Select value={condition.operator} onChange={v => updateCondition(condition.id, 'operator', v)} style={{ width: '100%' }}>
                        {operators.map(op => <Select.Option key={op.value} value={op.value}>{op.label}</Select.Option>)}
                      </Select>
                    </Col>
                    <Col span={7}>
                      <Input value={condition.value} onChange={e => updateCondition(condition.id, 'value', e.target.value)} placeholder="Value" />
                    </Col>
                    <Col span={1}>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeCondition(condition.id)} />
                    </Col>
                  </Row>
                </Card>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={addCondition} block>Add Another Condition</Button>
            </Space>
          )}
        </>
      )}
    </Space>
  );
}
