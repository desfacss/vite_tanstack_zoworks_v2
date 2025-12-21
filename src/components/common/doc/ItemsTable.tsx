import React, { useState } from 'react';
import { Table, Button, Input, InputNumber, Space, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ItemsTableProps {
  items: any[];
  onChange: (items: any[]) => void;
  schema: any;
  disabled?: boolean;
}

const ItemsTable: React.FC<ItemsTableProps> = ({ items, onChange, schema, disabled = false }) => {
  const [editingKey, setEditingKey] = useState<string>('');

  const isEditing = (record: any) => record.key === editingKey;

  const edit = (record: any) => {
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey('');
  };

  const save = async (key: string) => {
    setEditingKey('');
  };

  const addNewItem = () => {
    if (disabled) return;
    
    const newItem = {
      key: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      expectedDelivery: '',
    };
    onChange([...items, newItem]);
    setEditingKey(newItem.key);
  };

  const deleteItem = (key: string) => {
    if (disabled) return;
    onChange(items.filter(item => item.key !== key));
  };

  const updateItem = (key: string, field: string, value: any) => {
    if (disabled) return;
    const newItems = items.map(item => {
      if (item.key === key) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onChange(newItems);
  };

  const calculateTotal = (quantity: number, unitPrice: number) => {
    return (quantity * unitPrice).toFixed(2);
  };

  const columns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '30%',
      render: (text: string, record: any) => {
        const editing = isEditing(record);
        return editing ? (
          <Input
            value={text}
            disabled={disabled}
            onChange={(e) => updateItem(record.key, 'description', e.target.value)}
            onPressEnter={() => save(record.key)}
          />
        ) : (
          <div onClick={() => !disabled && edit(record)} style={{ cursor: disabled ? 'default' : 'pointer', minHeight: 32, padding: '4px 0' }}>
            {text || <Text type="secondary">Click to edit</Text>}
          </div>
        );
      },
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: '15%',
      render: (value: number, record: any) => {
        const editing = isEditing(record);
        return editing ? (
          <InputNumber
            min={0}
            disabled={disabled}
            value={value}
            onChange={(val) => updateItem(record.key, 'quantity', val || 0)}
            onPressEnter={() => save(record.key)}
            style={{ width: '100%' }}
          />
        ) : (
          <div onClick={() => !disabled && edit(record)} style={{ cursor: disabled ? 'default' : 'pointer', minHeight: 32, padding: '4px 0' }}>
            {value || 0}
          </div>
        );
      },
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: '15%',
      render: (value: number, record: any) => {
        const editing = isEditing(record);
        return editing ? (
          <InputNumber
            min={0}
            disabled={disabled}
            precision={2}
            value={value}
            onChange={(val) => updateItem(record.key, 'unitPrice', val || 0)}
            onPressEnter={() => save(record.key)}
            style={{ width: '100%' }}
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
          />
        ) : (
          <div onClick={() => !disabled && edit(record)} style={{ cursor: disabled ? 'default' : 'pointer', minHeight: 32, padding: '4px 0' }}>
            ${(value || 0).toFixed(2)}
          </div>
        );
      },
    },
    {
      title: 'Total',
      key: 'total',
      width: '15%',
      render: (_: any, record: any) => (
        <Text strong>${calculateTotal(record.quantity || 0, record.unitPrice || 0)}</Text>
      ),
    },
  ];

  // Add Expected Delivery column for purchase orders
  if (schema?.properties?.expectedDelivery) {
    columns.splice(3, 0, {
      title: 'Expected Delivery',
      dataIndex: 'expectedDelivery',
      key: 'expectedDelivery',
      width: '20%',
      render: (value: string, record: any) => {
        const editing = isEditing(record);
        return editing ? (
          <Input
            type="date"
            disabled={disabled}
            value={value}
            onChange={(e) => updateItem(record.key, 'expectedDelivery', e.target.value)}
            onPressEnter={() => save(record.key)}
          />
        ) : (
          <div onClick={() => !disabled && edit(record)} style={{ cursor: disabled ? 'default' : 'pointer', minHeight: 32, padding: '4px 0' }}>
            {value || <Text type="secondary">Click to edit</Text>}
          </div>
        );
      },
    });
  }

  // Add Actions column
  columns.push({
    title: 'Actions',
    key: 'actions',
    width: '10%',
    render: (_: any, record: any) => {
      const editing = isEditing(record);
      return editing ? (
        <Space>
          <Button type="link" onClick={() => save(record.key)} size="small" disabled={disabled}>
            Save
          </Button>
          <Button type="link" onClick={cancel} size="small" disabled={disabled}>
            Cancel
          </Button>
        </Space>
      ) : (
        <Space>
          <Button type="link" onClick={() => edit(record)} size="small" disabled={disabled}>
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this item?"
            onConfirm={() => deleteItem(record.key)}
            okText="Yes"
            cancelText="No"
            disabled={disabled}
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />} disabled={disabled} />
          </Popconfirm>
        </Space>
      );
    },
  });

  const dataSource = items.map((item, index) => ({
    ...item,
    key: item.key || index.toString(),
  }));

  const grandTotal = items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);

  return (
    <div className="editable-table">
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        footer={() => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button type="dashed" onClick={addNewItem} icon={<PlusOutlined />} disabled={disabled}>
              Add Item
            </Button>
            <Text strong style={{ fontSize: 16 }}>
              Grand Total: ${grandTotal.toFixed(2)}
            </Text>
          </div>
        )}
      />
    </div>
  );
};

export default ItemsTable;