import React, { useState } from 'react';
import { Table, Button, Input, Select, Popconfirm, ColorPicker, Drawer, Form, Space, Divider, Typography, Row, Col, InputNumber, Collapse, Tag, Badge, Card } from 'antd';
import { Plus, Trash2, GripVertical, Settings, Users, Clock, DollarSign, Layout, Shield } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AssignmentEditor, { AssignmentConfig } from './AssignmentEditor';

const { Title, Text } = Typography;

interface Stage {
  id: string;
  name: string;
  category: string;
  description?: string;
  color?: string;
  sequence?: number;
  raci?: {
    responsible?: AssignmentConfig;
    accountable?: AssignmentConfig;
    consulted?: AssignmentConfig;
    informed?: AssignmentConfig;
  };
  time_estimates?: {
    optimistic_hours?: number;
    most_likely_hours?: number;
    pessimistic_hours?: number;
    pert_expected_hours?: number;
  };
  cost_estimates?: {
    fixed_cost?: number;
    cost_center?: string;
    labor_cost_per_hour?: number;
  };
}

interface StageManagerProps {
  stages: Stage[];
  onChange: (stages: Stage[]) => void;
  categories: string[];
}

interface DraggableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

const DraggableRow = ({ children, ...props }: DraggableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    cursor: isDragging ? 'grabbing' : 'auto',
    ...(isDragging ? { position: 'relative', zIndex: 9999, background: '#fafafa' } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === 'sort') {
          return React.cloneElement(child as React.ReactElement, {
            children: (
              <GripVertical
                size={16}
                {...listeners}
                style={{ cursor: 'grab', color: '#bfbfbf' }}
              />
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

const StageManager: React.FC<StageManagerProps> = ({ stages, onChange, categories }) => {
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = stages.findIndex((i) => i.id === active.id);
      const newIndex = stages.findIndex((i) => i.id === over?.id);
      const newStages = arrayMove(stages, oldIndex, newIndex).map((s, idx) => ({
        ...s,
        sequence: idx + 1
      }));
      onChange(newStages);
    }
  };

  const handleAdd = () => {
    const newId = `stage_${stages.length + 1}`;
    const newStage: Stage = {
      id: newId,
      name: 'New Stage',
      category: categories[0] || 'NEW',
      color: '#1677ff',
      sequence: stages.length + 1
    };
    onChange([...stages, newStage]);
  };

  const handleDelete = (id: string) => {
    onChange(stages.filter(s => s.id !== id));
  };

  const openStageEditor = (stage: Stage) => {
    setEditingStage(stage);
    form.setFieldsValue(stage);
    setDrawerVisible(true);
  };

  const saveStageDetails = () => {
    form.validateFields().then(values => {
      const newStages = stages.map(s => s.id === editingStage?.id ? { ...s, ...values } : s);
      onChange(newStages);
      setDrawerVisible(false);
      setEditingStage(null);
    });
  };

  const calculatePERT = () => {
    const vals = form.getFieldsValue();
    const o = vals.time_estimates?.optimistic_hours || 0;
    const m = vals.time_estimates?.most_likely_hours || 0;
    const p = vals.time_estimates?.pessimistic_hours || 0;
    const pert = (o + 4 * m + p) / 6;
    form.setFieldValue(['time_estimates', 'pert_expected_hours'], parseFloat(pert.toFixed(2)));
  };

  const columns = [
    {
      key: 'sort',
      width: 40,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Stage) => (
        <Space>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: record.color || '#1677ff' }} />
          <Text strong>{text}</Text>
          <Badge count={record.category} style={{ backgroundColor: '#f5f5f5', color: '#8c8c8c', fontSize: '10px' }} />
        </Space>
      )
    },
    {
      title: 'Details',
      key: 'details',
      render: (_: any, record: Stage) => (
        <Space split={<Divider type="vertical" />}>
          {record.description && <Text type="secondary" ellipsis={{ tooltip: record.description }} style={{ maxWidth: 150, fontSize: '12px' }}>{record.description}</Text>}
          {record.raci?.responsible && (
            <Tag icon={<Users size={12} />} color="blue">
              {record.raci.responsible.method === 'round_robin' ? 'Round Robin' : 'Direct'}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: any, record: Stage) => (
        <Space>
          <Button 
            type="text" 
            size="small" 
            icon={<Settings size={16} />} 
            onClick={() => openStageEditor(record)}
          />
          <Popconfirm 
            title="Delete this stage?" 
            onConfirm={() => handleDelete(record.id)}
            disabled={record.id === 'new'}
          >
            <Button 
              type="text" 
              size="small" 
              danger 
              icon={<Trash2 size={16} />} 
              disabled={record.id === 'new'}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="stage-manager">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5} style={{ margin: 0 }}>Lifecycle Stages</Title>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
          Add Stage
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stages.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <Table
            components={{
              body: {
                row: DraggableRow,
              },
            }}
            rowKey="id"
            columns={columns}
            dataSource={stages}
            pagination={false}
            size="small"
            bordered
          />
        </SortableContext>
      </DndContext>

      <Drawer
        title={
          <Space>
            <Layout size={18} />
            Edit Stage: {editingStage?.name}
          </Space>
        }
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={saveStageDetails}>Save Changes</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Stage ID (Key)" name="id" rules={[{ required: true }]}>
                <Input placeholder="e.g. drafting" disabled={editingStage?.id === 'new'} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Display Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Drafting Phase" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select>
                  {categories.map(cat => (
                    <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Color" name="color">
                <ColorPicker />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Briefly describe what happens in this stage..." />
          </Form.Item>

          <Divider orientation="left">Role Assignment (RACI)</Divider>
          
          <Collapse 
            defaultActiveKey={['responsible']} 
            ghost
            items={[
              {
                key: 'responsible',
                label: <Space><Users size={16} /> <Text strong>Responsible (The Doer)</Text></Space>,
                children: (
                  <Form.Item name={['raci', 'responsible']}>
                    <AssignmentEditor label="Who is responsible for completing this stage?" onChange={(val) => form.setFieldValue(['raci', 'responsible'], val)} />
                  </Form.Item>
                )
              },
              {
                key: 'others',
                label: <Space><Shield size={16} /> <Text>Accountable, Consulted, Informed</Text></Space>,
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                        <Form.Item label="Accountable (The Owner)" name={['raci', 'accountable']}>
                          <AssignmentEditor label="Ultimately answerable for the correct completion" onChange={(val) => form.setFieldValue(['raci', 'accountable'], val)} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Consulted" name={['raci', 'consulted']}>
                          <AssignmentEditor label="Opinion is sought before action" onChange={(val) => form.setFieldValue(['raci', 'consulted'], val)} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Informed" name={['raci', 'informed']}>
                          <AssignmentEditor label="Kept up-to-date on progress" onChange={(val) => form.setFieldValue(['raci', 'informed'], val)} />
                        </Form.Item>
                    </Col>
                  </Row>
                )
              }
            ]}
          />

          <Divider orientation="left">Performance & Cost</Divider>

          <Row gutter={16}>
            <Col span={16}>
              <Card size="small" title={<Space><Clock size={16} /> Time Estimates (Hours)</Space>}>
                <Row gutter={8}>
                  <Col span={8}>
                    <Form.Item label="Optimistic" name={['time_estimates', 'optimistic_hours']}>
                      <InputNumber style={{ width: '100%' }} min={0} onChange={calculatePERT} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Most Likely" name={['time_estimates', 'most_likely_hours']}>
                      <InputNumber style={{ width: '100%' }} min={0} onChange={calculatePERT} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Pessimistic" name={['time_estimates', 'pessimistic_hours']}>
                      <InputNumber style={{ width: '100%' }} min={0} onChange={calculatePERT} />
                    </Form.Item>
                  </Col>
                </Row>
                <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>PERT Expected Duration: </Text>
                  <Form.Item name={['time_estimates', 'pert_expected_hours']} noStyle>
                    <Text strong style={{ color: '#1677ff' }}>0</Text>
                  </Form.Item>
                  <Text type="secondary" style={{ fontSize: '12px' }}> hours</Text>
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title={<Space><DollarSign size={16} /> Cost Estimates</Space>}>
                <Form.Item label="Fixed Cost" name={['cost_estimates', 'fixed_cost']}>
                  <InputNumber style={{ width: '100%' }} min={0} prefix="$" />
                </Form.Item>
                <Form.Item label="Cost Center" name={['cost_estimates', 'cost_center']}>
                  <Input placeholder="e.g. OP-2024" />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </div>
  );
};

export default StageManager;
