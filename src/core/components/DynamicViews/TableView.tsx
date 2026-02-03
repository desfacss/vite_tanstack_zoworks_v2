import React, { useMemo, useEffect } from 'react';
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
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
  config?: any; 
  currentTab?: string;
  tabOptions?: Array<{ key: string; hiddenFields?: string[] }>;
  allDisplayableColumns: { fieldName: string; fieldPath: string }[];
  visibleColumns: string[];
  globalFilters?: React.ReactNode;
}

interface ViewConfig {
  tableview?: {
    fields: Array<{
      fieldName: string;
      fieldPath: string;
      order: number;
      renderType?: 'arrayCount' | string;
      isPrimaryDisplay?: boolean; 
      dataType?: string;
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
  onTableChange,
  config,
  currentTab,
  tabOptions,
  allDisplayableColumns,
  visibleColumns,
  globalFilters,
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
    const currentTabConfig = tabOptions?.find(tab => tab.key === currentTab);
    const hiddenFields = currentTabConfig?.hiddenFields || [];

    const fields = viewConfig.tableview.fields || [];
    const firstDisplayFieldPath = [...fields]
      .sort((a, b) => a.order - b.order)[0]?.fieldPath;

    const combinedFields = [
      ...fields,
      ...allDisplayableColumns.filter(field =>
        !fields.some(f => f.fieldPath === field.fieldPath)
      )
    ];

    const tableColumns = combinedFields
      .filter(field => visibleColumns.includes(field.fieldPath))
      .filter(field => !hiddenFields.includes(field.fieldPath))
      .map((field: any) => ({
        title: field.fieldName,
        dataIndex: field.fieldPath,
        key: field.fieldPath,
        sorter: viewConfig?.tableview?.showFeatures ? viewConfig.tableview.showFeatures.includes('sorting') : true,
        sortOrder: filterValues?.sorter?.field === field.fieldPath ? (filterValues?.sorter?.order || null) : null,
        render: (value: any) => {
          const autoRenderer = getAutoRenderer(field.fieldPath, field.dataType);
          if (autoRenderer) {
            const rendered = autoRenderer(value);
            if (field.fieldPath === firstDisplayFieldPath && value !== null && value !== undefined && value !== '') {
              return (
                <span className="font-semibold display-id-text" style={{ color: 'var(--tenant-primary)', whiteSpace: 'nowrap' }}>
                  {React.isValidElement(rendered) ? rendered : (typeof rendered === 'object' && rendered !== null ? JSON.stringify(rendered) : rendered)}
                </span>
              );
            }
            return rendered;
          }

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
            return (
              <span className="font-semibold display-id-text" style={{ color: 'var(--tenant-primary)', whiteSpace: 'nowrap' }}>
                {React.isValidElement(content) ? content : (typeof content === 'object' && content !== null ? JSON.stringify(content) : content)}
              </span>
            );
          }
          
          // Final safety check for objects to prevent React crash
          if (typeof content === 'object' && content !== null) {
            return <span className="text-xs opacity-70 italic">{JSON.stringify(content)}</span>;
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
  }, [viewConfig, entityType, currentTab, tabOptions, allDisplayableColumns, visibleColumns, data, config, filterValues]);

  const actionButtons = useMemo(() => {
    return (
      viewConfig?.tableview?.actions?.bulk?.map((action: any) => ({
        name: action.name,
        label: action.name === 'add_' ? 'Add Item' : action.name,
        type: 'primary' as const,
        icon: undefined,
        onClick: () => { },
      })) || []
    );
  }, [viewConfig]);

  useEffect(() => {
    const formattedButtons = actionButtons.map(btn => ({
      icon: btn.icon,
      tooltip: btn.label,
      onClick: btn.onClick
    }));
    setConfig({ actionButtons: formattedButtons });
  }, [setConfig, actionButtons]);

  const descriptionField = useMemo(() => {
    const fields = viewConfig?.tableview?.fields;
    if (!fields) return 'name';
    const defaultDescriptionField = fields.find(
      (field: any) => field.fieldPath.includes('email') || field.fieldPath === 'description'
    )?.fieldPath || fields[1]?.fieldPath || 'name';
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
                    title={record.name || (viewConfig?.tableview?.fields ? record[viewConfig.tableview.fields[0].fieldPath] : '-')}
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