import React, { useMemo } from 'react';
import { message, Table, Tag } from 'antd';
import { motion } from 'framer-motion';
import { UserIcon } from 'lucide-react';
import { List } from 'antd-mobile';
import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
import dayjs from 'dayjs';
import RowActions from './RowActions';
import { lightTheme } from '../../lib/theme';

interface TableViewProps {
  entityType: string;
  viewConfig?: ViewConfig;
  data: any[];
  isLoading?: boolean;
  filterValues?: Record<string, any>;
  pagination?: { current: number; pageSize: number; total: number };
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
  schema?: any;
  globalFilters?: React.ReactNode;
  config?: any; // Ensure config is passed if used by RowActions
  currentTab?: string;
  tabOptions?: Array<{ key: string; hiddenFields?: string[] }>;
  allDisplayableColumns: { fieldName: string; fieldPath: string }[];
  visibleColumns: string[];
}

// Define ViewConfig for TableView as well for clarity if not already done globally
interface ViewConfig {
  tableview?: {
    fields: Array<{
      fieldName: string;
      fieldPath: string;
      order: number;
      renderType?: 'arrayCount' | string;
      isPrimaryDisplay?: boolean; // Added for making a field bold as primary display
    }>;
    showFeatures?: string[];
    actions: {
      row?: Array<any>;
      bulk?: Array<{ name: string }>;
    };
  };
  access_config?: any;
}


const TableView: React.FC<TableViewProps> = ({
  entityType,
  viewConfig,
  data = [],
  isLoading = false,
  filterValues,
  pagination,
  onTableChange,
  schema,
  config, // Added config prop
  globalFilters,
  currentTab,
  tabOptions,
  allDisplayableColumns,
  visibleColumns,
}) => {
  const isMobile = window.innerWidth <= 768;
  const { setConfig } = useAuthedLayoutConfig();

  if (
    !viewConfig?.tableview ||
    (typeof viewConfig.tableview === 'object' && Object.keys(viewConfig.tableview).length === 0)
  ) {
    message.error('Table View in y_view_config is not defined');
  }

  const columns = useMemo(() => {
    if (!viewConfig?.tableview?.fields) return [];
    // Get the configuration for the current tab from props
    const currentTabConfig = tabOptions?.find(tab => tab.key === currentTab);
    const hiddenFields = currentTabConfig?.hiddenFields || [];

    // Identify the first primary display field or just the first field for styling purposes
    const firstDisplayFieldPath = viewConfig.tableview.fields
      .sort((a, b) => a.order - b.order)[0]?.fieldPath;

    // Combine initially configured fields and selected fields from metadata
    const combinedFields = [
      ...viewConfig.tableview.fields,
      ...allDisplayableColumns.filter(field =>
        !viewConfig.tableview.fields.some(f => f.fieldPath === field.fieldPath)
      )
    ];

    return combinedFields
      .filter(field => visibleColumns.includes(field.fieldPath))
      .filter(field => !hiddenFields.includes(field.fieldPath)) // Filter out hidden fields
      .map((field) => ({
        title: field.fieldName,
        dataIndex: field.fieldPath,
        key: field.fieldPath,
        sorter: viewConfig?.tableview?.showFeatures?.includes('sorting'),
        // Inside the columns useMemo hook, within the .map() and render:
        render: (value: any) => {
    // Handle arrayCount renderType
// console.log("vx",typeof value,value,field.renderType);
    if (field.renderType === 'arrayCount' && Array.isArray(value)) {
      return value.length || '-';
    }
  
    // Handle arrays that are NOT arrayCount, rendering as tags
    if (Array.isArray(value) && value.length > 0) {
      // Check if the array contains objects, and if so, extract the 'name'
            const tagsToRender = value.map(item => typeof item === 'object' && item !== null ? item.name : item);
            return (
              <>
                {tagsToRender.map((tag, index) => (
                  <Tag key={index} color="blue">
                    {tag}
                  </Tag>
                ))}
              </>
            );
    } else if (Array.isArray(value) && value.length === 0) {
      return '-';
    }
  
    // Define a simple regex to check for common date/time patterns (e.g., YYYY-MM-DD or ISO 8601)
    const isLikelyDate = /^\d{4}-\d{2}-\d{2}/.test(value);
  
    // Handle date/time fields only if the string looks like a date and is a valid date object
    if (typeof value === 'string' && isLikelyDate && dayjs(value).isValid()) {
      // Check for the presence of a time component (e.g., 'T' in ISO 8601)
      if (value.includes('T')) {
        return dayjs(value).format('MMM D, YYYY, HH:mm:ss');
      } else {
        // If it's just a date, format without the time
        return dayjs(value).format('MMM D, YYYY');
      }
    }
  
    // Handle boolean fields as Ant Design Tags
    if (typeof value === 'boolean') {
      return (
        <Tag color={value ? 'green' : 'red'}>
          {value ? 'Yes' : 'No'}
        </Tag>
      );
    }
  
    // Default rendering for other values
    const content = value !== null && value !== undefined && value !== '' ? value : '-';
    return field.fieldPath === firstDisplayFieldPath && content !== '-'
      ? <span style={{ color: lightTheme?.token?.colorPrimary, whiteSpace: 'nowrap' }}>{content}</span>
      : content;
  },
      }))
      .concat(...(viewConfig?.tableview?.actions?.row?.length > 0
        ? [{
          title: 'Actions',
          key: 'actions',
          render: (_: any, record: any) => (
            <RowActions
              entityType={entityType}
              record={record}
              actions={viewConfig?.tableview?.actions.row}
              accessConfig={viewConfig?.access_config}
              viewConfig={viewConfig}
              rawData={data}
              config={config}
            />
          ),
        }]
        : []));
  }, [viewConfig, entityType, currentTab, tabOptions, allDisplayableColumns, visibleColumns, data, config]);

  const actionButtons = useMemo(() => {
    return (
      viewConfig?.tableview.actions.bulk?.map((action) => ({
        name: action.name,
        label: action.name === 'add_' ? 'Add Item' : action.name,
        type: 'primary' as const,
        icon: undefined,
        onClick: () => { },
      })) || []
    );
  }, [viewConfig]);

  React.useEffect(() => {
    setConfig((prev) => ({ ...prev, actionButtons }));
  }, [setConfig, actionButtons]);

  // Field to display in mobile view (e.g., description field)
  const descriptionField = useMemo(() => {
    // Use a fallback field like 'details.email' or the first field with a display-friendly value
    const defaultDescriptionField = viewConfig?.tableview?.fields.find(
      (field) => field.fieldPath.includes('email') || field.fieldPath === 'description'
    )?.fieldPath || viewConfig?.tableview?.fields[1]?.fieldPath || 'name';
    return defaultDescriptionField;
  }, [viewConfig]);

  if (!viewConfig) {
    return <div>No view configuration found for {entityType}</div>;
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
        {globalFilters && <div className="flex-1 min-w-[300px] pb-4">{globalFilters}</div>}
        {isMobile ? (
          isLoading ? (
            <div>Loading...</div>
          ) : (
            <List>
              {data.map((record) => (
                <List.Item
                  key={record.id}
                  prefix={<UserIcon size={24} />}
                  description={record[descriptionField] || '-'}
                  arrow={false}
                  extra={
                    <RowActions
                      entityType={entityType}
                      record={record}
                      actions={viewConfig?.tableview?.actions.row || []}
                      accessConfig={viewConfig?.access_config}
                      viewConfig={viewConfig}
                      rawData={data}
                      config={config}
                    />
                  }
                >
                  {/* For mobile, you might want a specific field to be the main title.
                     Here, it tries 'name', or the first displayable field, then renders it normally. */}
                  {record.name || (viewConfig?.tableview?.fields[0] ? record[viewConfig.tableview.fields[0].fieldPath] : '-')}
                  <div className="text-xs text-gray-500">
                    {record.created_at ? dayjs(record.created_at).format('MMM D, YYYY') : '-'}
                  </div>
                </List.Item>
              ))}
            </List>
          )
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            loading={isLoading}
            rowKey="id"
            pagination={false} 
            onChange={onTableChange}
            scroll={{ x: 'max-content' }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TableView;