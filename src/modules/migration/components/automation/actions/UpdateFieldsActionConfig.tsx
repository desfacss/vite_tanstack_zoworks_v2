import React, { useState, useEffect } from 'react';
import { Button, Select, Input, Card, Row, Col, Typography, Space, Empty, Form } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { WorkflowRule, ViewConfig, TableMetadata } from '../types';

const { Text } = Typography;

interface FieldUpdate {
  id: string;
  field: string;
  value: any;
  valueType: 'static' | 'dynamic' | 'expression';
}

interface UpdateFieldsActionConfigProps {
  configuration: any;
  onChange: (config: any) => void;
  workflow: Partial<WorkflowRule>;
  availableTables: ViewConfig[];
}

export function UpdateFieldsActionConfig({
  configuration,
  onChange,
  workflow,
  availableTables,
}: UpdateFieldsActionConfigProps) {
  const [fieldUpdates, setFieldUpdates] = useState<FieldUpdate[]>([]);
  const [tableMetadata, setTableMetadata] = useState<TableMetadata[]>([]);

  useEffect(() => {
    const table = availableTables.find(t => t.entity_type === workflow.trigger_table);
    if (table && table.metadata) setTableMetadata(table.metadata);
  }, [workflow.trigger_table, availableTables]);

  useEffect(() => {
    if (configuration.updates && Array.isArray(configuration.updates)) {
      setFieldUpdates(configuration.updates.map((u: any, i: number) => ({ id: `u-${i}`, ...u })));
    }
  }, [configuration.updates]);

  const updateParent = (updates: FieldUpdate[]) => {
    onChange({ ...configuration, updates: updates.map(({ id, ...u }) => u) });
  };

  const handleUpdate = (id: string, partial: Partial<FieldUpdate>) => {
    const next = fieldUpdates.map(u => u.id === id ? { ...u, ...partial } : u);
    setFieldUpdates(next);
    updateParent(next);
  };

  const addField = () => {
    const next = [...fieldUpdates, { id: `u-${Date.now()}`, field: '', value: '', valueType: 'static' as const }];
    setFieldUpdates(next);
    updateParent(next);
  };

  const updatableFields = tableMetadata.filter(f => !['id', 'created_at', 'updated_at'].includes(f.key));

  return (
    <Space direction="vertical" className="w-full" size="small">
      {fieldUpdates.length === 0 ? (
        <Empty description="No fields selected" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button type="primary" onClick={addField}>Add Field</Button>
        </Empty>
      ) : (
        <>
          {fieldUpdates.map((u) => (
            <div key={u.id} className="mb-2 p-2 bg-gray-50 rounded border">
              <Row gutter={8} align="middle">
                <Col span={8}>
                  <Select value={u.field} onChange={v => handleUpdate(u.id, { field: v })} className="w-full" placeholder="Field">
                    {updatableFields.map(f => <Select.Option key={f.key} value={f.key}>{f.display_name}</Select.Option>)}
                  </Select>
                </Col>
                <Col span={14}>
                  <Input value={u.value} onChange={e => handleUpdate(u.id, { value: e.target.value })} placeholder="New value" />
                </Col>
                <Col span={2}>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => {
                    const next = fieldUpdates.filter(curr => curr.id !== u.id);
                    setFieldUpdates(next);
                    updateParent(next);
                  }} />
                </Col>
              </Row>
            </div>
          ))}
          <Button type="dashed" block icon={<PlusOutlined />} onClick={addField}>Add Another Field</Button>
        </>
      )}
    </Space>
  );
}
