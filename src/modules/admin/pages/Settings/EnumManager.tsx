import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Table, Button, Modal, Input, Space, Tag, message, List, Typography } from 'antd';
import { Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';

const { Title } = Typography;

interface SortableItemProps {
  id: string;
  value: string;
  onRemove: (value: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, value, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '8px',
    border: '1px solid #f0f0f0',
    borderRadius: '4px',
    marginBottom: '8px',
    backgroundColor: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span>{value}</span>
      <Button
        type="text"
        danger
        icon={<Trash2 size={14} />}
        onClick={() => onRemove(value)}
      />
    </div>
  );
};

interface EnumData {
  enum_name: string;
  schema_name: string;
  enum_values: string[];
}

const EnumManager: React.FC = () => {
  const [enums, setEnums] = useState<EnumData[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEnum, setEditingEnum] = useState<string | null>(null);
  const [updatedValues, setUpdatedValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchEnums();
  }, []);

  const fetchEnums = async () => {
    const { data, error } = await supabase.rpc('get_enums');
    if (error) {
      console.error('Error fetching enums:', error);
      message.error('Failed to fetch enum types.');
      return;
    }
    setEnums(data || []);
  };

  const handleEditEnum = (enumData: EnumData) => {
    setEditingEnum(enumData.enum_name);
    setUpdatedValues(enumData.enum_values);
    setIsEditModalOpen(true);
  };

  const handleUpdateEnum = async () => {
    if (updatedValues.length === 0) {
      message.error('Enum must have at least one value.');
      return;
    }

    const invalidValues = updatedValues.filter((value) => !/^[a-zA-Z0-9_]+$/.test(value));
    if (invalidValues.length > 0) {
      message.error(
        `Invalid values detected: ${invalidValues.join(
          ', '
        )}. Values must contain only alphanumeric characters and underscores.`
      );
      return;
    }

    try {
      const { error } = await supabase.rpc('update_enum_type', {
        enum_name: editingEnum,
        new_values: updatedValues,
      });
      if (error) throw error;
      setIsEditModalOpen(false);
      setEditingEnum(null);
      setUpdatedValues([]);
      setNewValue('');
      fetchEnums();
      message.success(`Enum ${editingEnum} updated successfully.`);
    } catch (error: any) {
      console.error('Error updating enum:', error);
      if (error.code === '404') {
        message.error('The update_enum_type function was not found. Please ensure it is created in Supabase.');
      } else {
        message.error('Failed to update enum: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = updatedValues.findIndex((value) => value === active.id);
      const newIndex = updatedValues.findIndex((value) => value === over.id);
      const newOrder = arrayMove(updatedValues, oldIndex, newIndex);
      setUpdatedValues(newOrder);
    }
  };

  const handleAddValue = () => {
    const trimmedValue = newValue.trim();
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedValue)) {
      message.warning('Value must contain only alphanumeric characters and underscores.');
      return;
    }
    if (trimmedValue && !updatedValues.includes(trimmedValue)) {
      setUpdatedValues([...updatedValues, trimmedValue]);
      setNewValue('');
      message.success(`Value "${trimmedValue}" added to ${editingEnum}. Click Save to persist changes.`);
    } else if (!trimmedValue) {
      message.warning('Please enter a value.');
    } else {
      message.warning('Value already exists.');
    }
  };

  const handleRemoveValue = (value: string) => {
    setUpdatedValues(updatedValues.filter((v) => v !== value));
    message.success(`Value "${value}" removed from ${editingEnum}. Click Save to persist changes.`);
  };

  const columns = [
    {
      title: 'Schema',
      dataIndex: 'schema_name',
      key: 'schema_name',
    },
    {
      title: 'Enum Name',
      dataIndex: 'enum_name',
      key: 'enum_name',
    },
    {
      title: 'Values',
      dataIndex: 'enum_values',
      key: 'enum_values',
      render: (values: string[]) => (
        <Space wrap>
          {values.map((value) => (
            <Tag key={value} color="blue">
              {value}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: EnumData) => (
        <Space>
          <Button
            type="primary"
            icon={<Pencil size={14} />}
            onClick={() => handleEditEnum(record)}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1>Manage Enum Types</h1>

      <Table
        dataSource={enums}
        columns={columns}
        rowKey="enum_name"
        locale={{ emptyText: 'No enum types found in the public schema.' }}
      />

      <Modal
        title={`Edit Enum: ${editingEnum}`}
        open={isEditModalOpen}
        onOk={handleUpdateEnum}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingEnum(null);
          setUpdatedValues([]);
          setNewValue('');
        }}
        okText="Save"
        width={600}
      >
        <Title level={4}>Values (Drag to Reorder)</Title>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={updatedValues}
            strategy={verticalListSortingStrategy}
          >
            <List
              dataSource={updatedValues}
              renderItem={(value) => (
                <List.Item style={{ padding: '0', border: 'none' }}>
                  <SortableItem
                    key={value}
                    id={value}
                    value={value}
                    onRemove={handleRemoveValue}
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No values to display.' }}
            />
          </SortableContext>
        </DndContext>
        <Space style={{ marginTop: '16px', width: '100%' }}>
          <Input
            placeholder="Add new value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onPressEnter={handleAddValue}
            style={{ flex: 1 }}
          />
          <Button type="primary" onClick={handleAddValue}>
            Add
          </Button>
        </Space>
      </Modal>
    </div>
  );
};

export default EnumManager;
