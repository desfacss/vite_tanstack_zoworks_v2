import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Button,
  message,
  Select,
  Table,
  Space,
  Typography,
  Tooltip,
  Alert,
  Form,
  Input,
  DatePicker, // 1. IMPORT DatePicker
} from 'antd';
import {
  DownloadOutlined,
  UploadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { SupabaseClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import dayjs from 'dayjs'; // 2. IMPORT dayjs

const { Option } = Select;
const { Text } = Typography;

interface EntityMetadata {
  key: string;
  type: string;
  display_name: string;
  is_displayable: boolean;
  is_template: boolean;
  is_mandatory: boolean;
  foreign_key?: {
    source_table: string;
    source_column: string;
    display_column: string;
  };
}

interface ForeignOptions {
  [key: string]: Array<{ label: string; value: string }>;
}

interface ParsedRow {
  [key: string]: any;
  _key: number;
  _errors?: string[];
}

interface BulkUploadProps {
  supabase: SupabaseClient;
}

// --- Editable Cell Component (Defined outside for memoization) ---

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
    record: ParsedRow;
    dataIndex: string;
    metadata: EntityMetadata;
    foreignKeyOptions: Array<{ label: string; value: string }>;
    children: React.ReactNode;
    form: any; // Passed down from BulkUpload
}

const EditableCell: React.FC<EditableCellProps> = ({
  record,
  dataIndex,
  metadata,
  children,
  foreignKeyOptions,
  form,
  ...restProps
}) => {

  // Function to handle changes in the editable cell
  // It handles both simple inputs (string) and DatePicker (dayjs object)
  const handleChange = (value: any) => {
    // For DatePicker, value is a dayjs object, convert it to a string (ISO 8601 for Supabase)
    const normalizedValue = dayjs.isDayjs(value) ? value.format('YYYY-MM-DD') : value;
    
    // Get the current row's data
    const currentRow = form.getFieldValue(record._key);
    let newErrors = currentRow._errors ? [...currentRow._errors] : [];
    
    // Check if the mandatory field error exists and if the new value is valid
    if (metadata.is_mandatory) {
        const errorText = `${metadata.display_name} is mandatory.`;
        // Check if the normalized value is considered filled
        const isNowFilled = normalizedValue !== null && normalizedValue !== undefined && String(normalizedValue).trim() !== '';

        if (isNowFilled) {
            // Remove the mandatory error if it was filled
            newErrors = newErrors.filter(err => err !== errorText);
        } else {
             // Re-add the error if it's mandatory but still empty
             if (!newErrors.includes(errorText)) {
                 newErrors.push(errorText);
             }
        }
    }
    
    // Update the form state for the whole row to reflect the new errors
    form.setFieldsValue({
        [record._key]: {
            ...currentRow,
            [dataIndex]: normalizedValue, // Update the actual cell value
            _errors: newErrors.length > 0 ? newErrors : undefined, // Update the errors array
        }
    });
  };
    
  const isForeignKey = !!metadata?.foreign_key;
  const isDateType = metadata?.type === 'date' || metadata?.type?.includes('timestamp');
  
  let inputNode;

  if (isForeignKey) {
    inputNode = (
      <Select
        options={foreignKeyOptions}
        showSearch
        optionFilterProp="label"
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        onChange={handleChange}
      />
    );
  } else if (isDateType) {
      // 3. DatePicker for date fields
    inputNode = (
        <DatePicker
            onChange={handleChange}
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
        />
    );
  } else {
    // Default to Input for all other types (text, numeric, etc.)
    inputNode = (
      <Input onChange={(e) => handleChange(e.target.value)} />
    );
  }

  // Value formatting for Antd Form.Item (to display the value correctly)
  // The DatePicker expects a dayjs object for its value
  const valuePropName = isDateType ? 'value' : 'value';

  // Function to transform the form value for the component (dayjs object for DatePicker)
  const getValueProps = (value: any) => {
    if (isDateType && value) {
        // Convert the string value back to a dayjs object for the DatePicker to display
        // Handle cases where the value might be 'null' or empty string from parsing
        const dateString = String(value).trim();
        return { value: dateString ? dayjs(dateString) : null };
    }
    return { value };
  };


  return (
    <td {...restProps}>
      <Form.Item
        name={[record?._key, dataIndex]}
        style={{ margin: 0 }}
        // Use the custom value transformer for DatePicker
        getValueProps={getValueProps} 
        // Antd validation rules for mandatory fields
        rules={[
          {
            required: metadata?.is_mandatory,
            message: `The ${metadata?.display_name} is required.`,
            validator: (_, value) => {
                 // Check both the normalized string/uuid value AND the raw dayjs object for DatePicker
                 const normalizedValue = dayjs.isDayjs(value) ? value.format('YYYY-MM-DD') : value;

                if (metadata?.is_mandatory && (!normalizedValue || String(normalizedValue).trim() === '' || normalizedValue === null)) {
                    return Promise.reject(new Error(`The ${metadata?.display_name} is required.`));
                }
                return Promise.resolve();
            }
          }
        ]}
      >
        {inputNode}
      </Form.Item>
    </td>
  );
};


const BulkUpload: React.FC<BulkUploadProps> = ({ supabase }) => {
  const [form] = Form.useForm();
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<ParsedRow[]>([]);
  const [foreignKeyOptions, setForeignKeyOptions] = useState<ForeignOptions>(
    {},
  );

  const fetchEntities = async () => {
    const { data, error } = await supabase
      .schema('core')
      .from('entities')
      .select('*');

    if (error) {
      message.error('Failed to load entities.');
      console.error(error);
      return;
    }
    setEntities(data);
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchForeignKeyOptions = async (metadata: EntityMetadata[]) => {
    const foreignKeys = metadata.filter((col) => col.foreign_key);
    const newOptions: ForeignOptions = {};

    await Promise.all(
      foreignKeys.map(async (col) => {
        const fullSourceTable = col.foreign_key!.source_table;
        const [source_schema, source_table] = fullSourceTable.includes('.')
          ? fullSourceTable.split('.')
          : [selectedEntity.entity_schema, fullSourceTable];
        const { display_column } = col.foreign_key!;

        const { data, error } = await supabase
          .schema(source_schema)
          .from(source_table)
          .select(`${display_column}, id`);

        if (!error) {
          newOptions[col.key] = data.map((item) => ({
            label: item[display_column],
            value: item.id,
          }));
        } else {
          console.error(
            `Failed to fetch options for ${fullSourceTable}:`,
            error,
          );
        }
      }),
    );
    setForeignKeyOptions(newOptions);
  };

  useEffect(() => {
    if (selectedEntity) {
      fetchForeignKeyOptions(selectedEntity.metadata);
    }
  }, [selectedEntity]);

  const parseFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };

  const transformDataKeys = (
    parsedData: any[],
    metadata: EntityMetadata[],
  ) => {
    return parsedData.map((row) => {
      const newRow: any = {};
      metadata.forEach((col) => {
        const csvKey =
          Object.keys(row).find(
            (key) =>
              key.toLowerCase().replace(/ /g, '_') === col.key.toLowerCase() ||
              key.toLowerCase().replace(/ /g, '_') === col.display_name.toLowerCase().replace(/ /g, '_') ||
              key.toLowerCase().includes(col.key.toLowerCase()) ||
              key.toLowerCase().includes(col.display_name.toLowerCase())
          ) || col.display_name;

        if (row[csvKey] !== undefined) {
          newRow[col.key] = row[csvKey];
        }
      });
      return newRow;
    });
  };

  // IMPORTANT: Added check for date fields to normalize to YYYY-MM-DD
  const mapDisplayToUuids = (data: ParsedRow[], metadata: EntityMetadata[]) => {
    return data.map((row) => {
      const newRow: ParsedRow = { ...row };
      newRow._errors = []; // Initialize errors array
      metadata.forEach(col => {
        let value = newRow[col.key];

        // 4. Date normalization for initial parsing
        if (col.type === 'date' || col.type.includes('timestamp')) {
            if (value && String(value).trim() !== '') {
                // Try to parse the date from the CSV string, assuming various formats
                const date = dayjs(value);
                value = date.isValid() ? date.format('YYYY-MM-DD') : value; // Keep original if invalid
                newRow[col.key] = value;
            }
        }
        
        // Mandatory check during file parsing
        if (col.is_mandatory && (!value || String(value).trim() === '')) {
            newRow._errors!.push(`${col.display_name} is mandatory.`);
        }

        if (String(value).trim() === "") {
          newRow[col.key] = null;
        } else if (col.foreign_key && value) {
          const matchingOption = (foreignKeyOptions[col.key] || []).find(
            (option) => option.label === value,
          );
          if (matchingOption) {
            newRow[col.key] = matchingOption.value;
          } else {
            // Only add error if it's not a mandatory error (to avoid double reporting)
            if (!newRow._errors!.some(err => err.includes(col.display_name) && err.includes('mandatory'))) {
                newRow._errors!.push(`Invalid ${col.display_name}: '${value}' not found.`);
            }
          }
        }
      });
      if (newRow._errors!.length === 0) {
        delete newRow._errors; // Remove empty errors array
      }
      return newRow;
    });
  };

  const unflattenObject = (obj: any) => {
    const result: any = {};
    for (const i in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;

      if (i.includes('.')) {
        const keys = i.split('.');
        let current: any = result;
        for (let j = 0; j < keys.length; j++) {
          const key = keys[j];
          if (j === keys.length - 1) {
            current[key] = obj[i];
          } else {
            if (!current[key]) {
              current[key] = {};
            }
            current = current[key];
          }
        }
      } else {
        result[i] = obj[i];
      }
    }
    return result;
  };

  const removeNullValues = (obj: any) => {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null) {
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          const cleaned = removeNullValues(obj[key]);
          if (Object.keys(cleaned).length > 0) {
            newObj[key] = cleaned;
          }
        } else {
          newObj[key] = obj[key];
        }
      }
    }
    return newObj;
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    message.loading('Processing file...', 0);

    try {
      const parsedData = await parseFile(file);
      const transformedData = transformDataKeys(
        parsedData,
        selectedEntity.metadata,
      );

      const dataWithUuidsAndErrors = mapDisplayToUuids(
        transformedData,
        selectedEntity.metadata,
      );

      const initialData = dataWithUuidsAndErrors.map((row, index) => ({
        ...row,
        _key: index,
      }));

      const valuesForForm = initialData.reduce((acc, current) => {
        acc[current._key] = current;
        return acc;
      }, {});
      // Set the values including initial errors
      form.setFieldsValue(valuesForForm);

      setData(initialData);

      message.destroy();
      setUploading(false);

      const totalErrors = initialData.filter(row => row._errors && row._errors.length > 0).length;
      if (totalErrors > 0) {
        message.warning(`File parsed, but found ${totalErrors} rows with errors. Please correct them below.`);
      } else {
        message.success('File parsed and validated successfully!');
      }
    } catch (error) {
      message.destroy();
      message.error('File processing failed.');
      console.error(error);
      setUploading(false);
    }
    return false;
  };

  const getColumns = (): ColumnsType<ParsedRow> => {
    if (!selectedEntity || data.length === 0) return [];
    const metadata = selectedEntity.metadata as EntityMetadata[];

    const templateColumns = metadata.filter(
      (col) => col.is_displayable && col.is_template,
    );

    const columns: ColumnsType<ParsedRow> = templateColumns.map((col) => {
      return {
        title: (
            <Text style={{ color: col.is_mandatory ? 'red' : 'inherit' }}>
                {col.display_name}
                {col.is_mandatory && ' *'}
            </Text>
        ),
        dataIndex: col.key,
        key: col.key,
        onCell: (record) => ({
          record,
          dataIndex: col.key,
          metadata: col,
          foreignKeyOptions: foreignKeyOptions[col.key] || [],
          form: form, // Pass the form instance down
        }),
      };
    });

    columns.push({
      title: 'Errors',
      key: 'errors',
      render: (_, record) => {
        // Use form.getFieldValue to get the latest, potentially edited, values and errors
        const recordWithErrors = form.getFieldValue(record._key);
        if (recordWithErrors && recordWithErrors._errors?.length > 0) {
          return (
            <Tooltip
              title={recordWithErrors._errors.join('; ')}
              color="red"
            >
              <WarningOutlined style={{ color: 'red' }} />
            </Tooltip>
          );
        }
        return null;
      },
    });

    return columns;
  };

  const components = {
    body: {
      cell: EditableCell, // Uses the separate EditableCell component
    },
  };

  // The logic inside handleBulkUpload is now simpler because EditableCell manages clearing the _errors for mandatory fields
  const handleBulkUpload = async () => {
    try {
      setUploading(true);
      
      // 1. Trigger all Ant Design client-side validations
      await form.validateFields();
      
      // 2. Get the final, valid values from the form
      const values = form.getFieldsValue(true);
      
      // 3. Filter out rows with *any* remaining errors (from parsing or validation)
      const rowsToUpload = Object.values(values)
        .filter((row: any) => !row._errors || row._errors.length === 0)
        .filter((row: any) => {
             // Filter out rows that are empty objects or contain only empty values
             return row && Object.entries(row).some(([key, value]) => 
                 key !== '_key' && key !== '_errors' && value !== null && value !== '' && value !== undefined
             );
        })
        .map(
          ({ _key, _errors, ...rest }: any) => {
            // Unflatten and remove nulls for the database
            const unflattened = unflattenObject({...rest});
            return removeNullValues(unflattened);
          },
        );

      // Check if there is any data to upload after filtering
      if (rowsToUpload.length === 0) {
        message.warning('No valid data to upload.');
        setUploading(false);
        return;
      }

      const { error } = await supabase.rpc('core_bulk_upsert_data', {
        table_name: `${selectedEntity.entity_schema}.${selectedEntity.entity_type}`,
        data: rowsToUpload,
      });

      setUploading(false);

      if (error) {
        message.error(`Upload failed: ${error.message}`);
      } else {
        message.success('Data uploaded successfully!');
        setData([]);
        setSelectedEntity(null);
      }
    } catch (err: any) {
      // This block catches validation errors from form.validateFields()
      console.error(err);
      if (err.errorFields) {
          message.error('Validation failed. Please correct all errors in the table.');
      } else {
          message.error('An unexpected error occurred during upload.');
      }
      setUploading(false);
    }
  };

  return (
    <Space
      direction="vertical"
      size="large"
      style={{ width: '100%', padding: 24 }}
    >
      <Typography.Title level={3}>Bulk Upload</Typography.Title>
      <Select
        placeholder="Select an entity to upload"
        style={{ width: 300 }}
        onChange={(value) => {
          const entity = entities.find((e) => e.entity_type === value);
          setSelectedEntity(entity);
          setData([]);
          setForeignKeyOptions({});
        }}
        value={selectedEntity?.entity_type}
      >
        {entities.map((e) => (
          <Option key={e.entity_type} value={e.entity_type}>
            {e.entity_type}
          </Option>
        ))}
      </Select>
      <Button icon={<DownloadOutlined />} disabled={!selectedEntity}>
        Download Template
      </Button>

      <Upload
        accept=".csv, .xlsx"
        beforeUpload={handleFileUpload}
        showUploadList={false}
        disabled={!selectedEntity || uploading}
      >
        <Button
          icon={<UploadOutlined />}
          loading={uploading}
          disabled={!selectedEntity || uploading}
        >
          {uploading ? 'Processing...' : 'Select File'}
        </Button>
      </Upload>

      {data.length > 0 && (
        <>
          <Typography.Title level={4}>Preview & Validate</Typography.Title>
          <Form
            form={form}
            component={false}
          >
            <Table
              components={components}
              dataSource={data}
              columns={getColumns()}
              rowKey="_key"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 'max-content' }}
              rowClassName="editable-row"
            />
          </Form>

          <Button
            type="primary"
            onClick={handleBulkUpload}
            loading={uploading}
          >
            Confirm and Upload
          </Button>
        </>
      )}
    </Space>
  );
};

export default BulkUpload;