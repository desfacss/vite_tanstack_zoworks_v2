import React from 'react';
import { Table, Button, Popconfirm, Space, Divider, Typography, Tag, Badge } from 'antd';
import { Plus, Trash2, GripVertical, Settings, Users } from 'lucide-react';
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
import { AssignmentConfig } from './AssignmentEditor';


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
  onEdit: (stage: Stage) => void;
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

const StageManager: React.FC<StageManagerProps> = ({ stages, onChange, categories, onEdit }) => {
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
            onClick={() => onEdit(record)}
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
    </div>
  );
};

export default StageManager;
