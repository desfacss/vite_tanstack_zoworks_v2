import React, { useMemo } from 'react';
import { message, Table, Tag, List } from 'antd';
import { motion } from 'framer-motion';
import { UserIcon } from 'lucide-react';

import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
import dayjs from 'dayjs';
import RowActions from './RowActions';
import { getAutoRenderer } from '@/core/components/utils/columnRenderers';

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

    const tableColumns = combinedFields
      .filter(field => visibleColumns.includes(field.fieldPath))
      .filter(field => !hiddenFields.includes(field.fieldPath))
      .map((field: any) => ({
        title: field.fieldName,
        dataIndex: field.fieldPath,
        key: field.fieldPath,
        sorter: viewConfig?.tableview?.showFeatures?.includes('sorting'),
        render: (value: any) => {
          // Try smart auto-renderer first based on field name and data type
          const autoRenderer = getAutoRenderer(field.fieldPath, field.dataType);
          if (autoRenderer) {
            const rendered = autoRenderer(value);
            // If it's the first display field and has content, apply primary styling
            if (field.fieldPath === firstDisplayFieldPath && value !== null && value !== undefined && value !== '') {
              return <span className="font-semibold display-id-text" style={{ color: 'var(--tenant-primary)', whiteSpace: 'nowrap' }}>{rendered}</span>;
            }
            return rendered;
          }

          // Fallback to existing manual logic for fields not matched by auto-renderer
          if (field.renderType === 'arrayCount' && Array.isArray(value)) {
            return value.length || '-';
          }
          if (Array.isArray(value)) {
            if (value.length === 0) return '-';
            const tags = value.map(item => typeof item === 'object' && item !== null ? item.name : item);
            return (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, i) => <Tag key={i}>{tag}</Tag>)}
              </div>
            );
          }
          const isDateStr = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
          if (isDateStr && dayjs(value).isValid()) {
            return value.includes('T') ? dayjs(value).format('MMM D, YYYY, HH:mm') : dayjs(value).format('MMM D, YYYY');
          }
          if (typeof value === 'boolean') {
            return <Tag color={value ? 'success' : 'error'}>{value ? 'Yes' : 'No'}</Tag>;
          }
          const content = (value !== null && value !== undefined && value !== '') ? value : '-';
          if (field.fieldPath === firstDisplayFieldPath && content !== '-') {
            return <span className="font-semibold display-id-text" style={{ color: 'var(--tenant-primary)', whiteSpace: 'nowrap' }}>{content}</span>
          }
          return content;
        },
      })) as any[];

    if ((viewConfig?.tableview?.actions?.row?.length || 0) > 0) {
      tableColumns.push({
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: any) => (
          <RowActions
            entityType={entityType}
            record={record}
            actions={viewConfig?.tableview?.actions.row || []}
            accessConfig={viewConfig?.access_config}
            viewConfig={viewConfig}
            rawData={data}
            config={config}
          />
        ),
      });
    }

    return tableColumns;
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
            <List
              dataSource={data}
              renderItem={(record) => (
                <List.Item
                  key={record.id}
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
                  <List.Item.Meta
                    avatar={<UserIcon size={24} />}
                    title={record.name || (viewConfig?.tableview?.fields[0] ? record[viewConfig.tableview.fields[0].fieldPath] : '-')}
                    description={
                      <div>
                        <div>{record[descriptionField] || '-'}</div>
                        <div className="text-xs text-gray-500">
                          {record.created_at ? dayjs(record.created_at).format('MMM D, YYYY') : '-'}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
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