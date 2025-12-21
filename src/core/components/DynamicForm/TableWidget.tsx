import React from "react";
import { Button, Table, Input, Select, Checkbox, DatePicker } from "antd";
import { Plus, Trash2 } from "lucide-react";
import dayjs, { Dayjs } from "dayjs";
import { WidgetProps } from "@rjsf/utils";

// Define additional types
interface UiOptions {
  addable?: boolean;
  removable?: boolean;
  columnOrder?: string[];
}

interface SchemaItem {
  title?: string;
  type: string;
  format?: string;
  enum?: any[];
  enumNames?: string[];
  default?: any;
  properties?: Record<string, SchemaItem>;
}

interface TableSchema {
  items: {
    properties: Record<string, SchemaItem>;
  };
}

const EditableTableWidget: React.FC<WidgetProps & { uiSchema: any; schema: TableSchema }> = ({
  value = [],
  schema,
  uiSchema,
  onChange,
}) => {
  const uiOptions: UiOptions = uiSchema["ui:options"] || {};
  const { addable = true, removable = true, columnOrder = [] } = uiOptions;

  const handleAddRow = (): void => {
    const newRow: Record<string, any> = {};
    Object.keys(schema.items.properties).forEach((key) => {
      newRow[key] = schema.items.properties[key].default || null;
    });
    onChange([...value, newRow]);
  };

  const handleDeleteRow = (index: number): void => {
    const newData = value.filter((_: any, idx: number) => idx !== index);
    onChange(newData);
  };

  const handleChangeCell = (index: number, field: string, newValue: any): void => {
    const newData = [...value];
    newData[index] = { ...newData[index], [field]: newValue };
    onChange(newData);
  };

  const allProperties = schema.items.properties;

  const getColumns = () => {
    // Determine the order of columns to render
    const order = columnOrder.length > 0 ? columnOrder : Object.keys(allProperties);

    const orderedColumns = order.map((key) => {
      const fieldSchema = allProperties[key];
      if (!fieldSchema) return null; // Skip if key doesn't exist in schema

      return {
        title: fieldSchema.title || key,
        dataIndex: key,
        render: (_: any, record: any, index: number) => {
          const cellValue = record[key];

          if (fieldSchema.enum) {
            // New logic to filter out already selected users for 'user_id' field
            if (key === 'user_id') {
              const selectedUserIds = value.map((row: any) => row.user_id).filter(Boolean);
              const availableOptions = fieldSchema.enum.filter(
                (option: string) => !selectedUserIds.includes(option) || option === cellValue
              );

              return (
                <Select
                  showSearch
                  value={cellValue}
                  onChange={(newValue: any) => handleChangeCell(index, key, newValue)}
                  options={availableOptions.map((option, i) => ({
                    label: fieldSchema.enumNames?.[fieldSchema.enum.indexOf(option)] || option,
                    value: option,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              );
            }

            // Existing logic for other enum fields
            return (
              <Select
                showSearch
                value={cellValue}
                onChange={(value: any) => handleChangeCell(index, key, value)}
                options={fieldSchema.enum.map((option, i) => ({
                  label: fieldSchema.enumNames?.[i] || option,
                  value: option,
                }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            );
          }

          if (fieldSchema.format === "date-time") {
            return (
              <DatePicker
                value={cellValue ? dayjs(cellValue) : null}
                onChange={(date: Dayjs | null) =>
                  handleChangeCell(index, key, date ? date.toISOString() : null)
                }
              />
            );
          }

          if (fieldSchema.type === "string") {
            return (
              <Input
                value={cellValue || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChangeCell(index, key, e.target.value)
                }
              />
            );
          }

          if (fieldSchema.type === "boolean") {
            return (
              <Checkbox
                checked={!!cellValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChangeCell(index, key, e.target.checked)
                }
              />
            );
          }

          return <Input value={cellValue || ""} />;
        },
      };
    }).filter(Boolean); // Filter out any null values

    return [
      ...orderedColumns,
      {
        title: "Action",
        key: "action",
        render: (_: any, __: any, index: number) =>
          removable ? (
            <Button
              type="link"
              icon={<Trash2 size={16} />}
              onClick={() => handleDeleteRow(index)}
            />
          ) : null,
      },
    ];
  };

  const columns = getColumns();

  return (
    <div>
      <Table
        dataSource={Array.isArray(value) ? value.map((item: any, index: number) => ({
          ...item,
          key: index,
        })) : []}
        columns={columns}
        pagination={false}
      />
      {addable && (
        <Button
          type="dashed"
          onClick={handleAddRow}
          style={{ marginTop: "10px", width: "100%" }}
          icon={<Plus size={16} />}
        >
          Add Row
        </Button>
      )}
    </div>
  );
};

export default EditableTableWidget;