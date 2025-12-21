import React, { useMemo } from 'react';
import { Card, Row, Col, Space, message, Tag } from 'antd'; // Import Tag
import { List } from 'antd-mobile';
import { motion } from 'framer-motion';
import { UserIcon } from 'lucide-react';
import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
import dayjs from 'dayjs';
import RowActions from './RowActions';

interface FieldConfig {
  fieldPath: string;
  style?: React.CSSProperties;
  subFields?: Array<{ fieldPath: string }>;
  webLink?: boolean;
  cardSection?: 'title' | 'body' | 'footer';
  order?: number;
  renderType?: 'arrayCount' | string; // Added renderType to interface
}

interface GridViewProps {
  entityType: string;
  viewConfig?: ViewConfig;
  formConfig?: any;
  data: any[];
  isLoading?: boolean;
  filterValues?: Record<string, any>;
  pagination?: { current: number; pageSize: number; total: number };
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
  globalFilters?: React.ReactNode;
  currentTab?: string;
  tabOptions?: Array<{ key: string; hiddenFields?: string[] }>;
}

interface ViewConfig {
  gridview?: {
    layout?: {
      cardsPerRow?: number;
      spacing?: number;
      cardStyle?: React.CSSProperties;
      size?: 'default' | 'small';
      maxWidth?: string;
    };
    groups?: Array<{
      name: string;
      order?: number;
      fields: FieldConfig[];
    }>;
    actions: {
      row?: Array<any>;
      bulk?: Array<{ name: string }>;
    };
  };
  access_config?: any;
}

const GridView: React.FC<GridViewProps> = ({
  entityType,
  viewConfig,
  formConfig,
  data = [],
  isLoading = false,
  filterValues,
  pagination,
  onTableChange,
  config,
  globalFilters,
  currentTab,
  tabOptions,
}) => {
  const isMobile = window.innerWidth <= 768;
  const { setConfig } = useAuthedLayoutConfig();

  if (
    !viewConfig?.gridview ||
    (typeof viewConfig.gridview === 'object' && Object.keys(viewConfig.gridview).length === 0)
  ) {
    message.error('Grid View in y_view_config is not defined');
  }

  console.log('GridView viewConfig:', viewConfig);
  console.log('GridView actions.row:', viewConfig?.gridview?.actions?.row);
  console.log('GridView access_config:', viewConfig?.access_config);
  console.log('GridView data:', data);
  console.log('GridView isMobile:', isMobile, 'window.innerWidth:', window.innerWidth);

  const gridViewConfig = viewConfig?.gridview;
  const { cardsPerRow = 3, spacing = 16, cardStyle = {}, size = 'default', maxWidth = '100%' } =
    gridViewConfig?.layout || {};

  // Get responsive column spans
  const getResponsiveSpans = (cardsPerRow: number) => ({
    xs: 24,
    sm: 24,
    md: cardsPerRow === 1 ? 24 : Math.floor(24 / Math.min(cardsPerRow, 3)),
    lg: cardsPerRow === 1 ? 24 : Math.floor(24 / cardsPerRow),
  });

  const renderField = (record: any, fieldConfig: FieldConfig) => {
  let value = record[fieldConfig.fieldPath];
  const { style = {}, subFields = [], webLink, cardSection, renderType } = fieldConfig;

  // Handle arrayCount renderType
  if (renderType === 'arrayCount' && Array.isArray(value)) {
    const count = value.length || '-';
    return <span style={{ ...style, display: 'block' }}>{count}</span>;
  }

  // Handle arrays of objects or strings, rendering them as Ant Design Tags
  if (Array.isArray(value) && value.length > 0) {
    const tagsToRender = value.map(item => typeof item === 'object' && item !== null ? item.name : item);
    return (
      <Space wrap style={{ ...style, display: 'block' }}>
        {tagsToRender.map((tag, index) => (
          <Tag key={index} color="blue">{tag}</Tag>
        ))}
      </Space>
    );
  }

  // Handle boolean values as Ant Design Tags, only for true values
  if (typeof value === 'boolean') {
    if (value === true) {
      return (
        <Tag color="green" style={{ ...style, display: 'inline-block' }}>
          Yes
        </Tag>
      );
    } else {
      return null;
    }
  }

  // Handle null or undefined values
  if (value === null || value === undefined || value === '') return null;

  // Handle subFields for comma-separated display
  if (subFields.length > 0) {
    value = subFields
      .map((subField) => record[subField.fieldPath])
      .filter((v) => v !== null && v !== undefined && v !== '')
      .join(', ');
  }
  
  // Add the robust date/time formatting logic here
  const isLikelyDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
  if (isLikelyDate && dayjs(value).isValid()) {
      if (value.includes('T') || value.includes(' ')) {
          value = dayjs(value).format('MMM D, YYYY, HH:mm:ss');
      } else {
          value = dayjs(value).format('MMM D, YYYY');
      }
  }

  const textStyle: React.CSSProperties = {
    ...style,
    display: 'block',
    whiteSpace: style.ellipsis ? 'nowrap' : 'normal',
    overflow: style.ellipsis ? 'hidden' : 'visible',
    textOverflow: style.ellipsis ? 'ellipsis' : 'clip',
    fontWeight: style.fontWeight || 'normal',
    fontSize: cardSection === 'title' ? '1.2rem' : style.fontSize || '1rem',
  };

  const content = <span key={fieldConfig?.fieldPath} style={textStyle}>{value}</span>;

  if (webLink) {
    const fullUrl = value?.startsWith('http') ? value : `https://${value}`;
    return (
      <a key={fieldConfig?.fieldPath} href={fullUrl} target="_blank" rel="noopener noreferrer" style={textStyle}>
        {content}
      </a>
    );
  }

  return content;
};

  // All fields sorted by order
  const allFields = useMemo(() => {
    const currentTabConfig = tabOptions?.find(tab => tab.key === currentTab);
    const hiddenFields = currentTabConfig?.hiddenFields || [];
    return (
      gridViewConfig?.groups
        ?.flatMap((group) =>
          group.fields.map((field) => ({
            ...field,
            group: group.name,
            order: field.order ?? group.order ?? 0,
          }))
        )
        .filter(field => !hiddenFields.includes(field.fieldPath))
        .sort((a, b) => a.order - b.order) || []
    );
  }, [gridViewConfig?.groups, currentTab, tabOptions]);

  // Field to display in mobile view (e.g., description field)
  const descriptionField = useMemo(() => {
    const defaultDescriptionField = allFields.find(
      (field) => field.fieldPath.includes('email') || field.fieldPath === 'description'
    )?.fieldPath || allFields[1]?.fieldPath || 'name';
    return defaultDescriptionField;
  }, [allFields]);

  // Action buttons
  const actionButtons = useMemo(() => {
    return (
      gridViewConfig?.actions?.bulk?.map((action) => ({
        name: action.name,
        label: action.name === 'add_' ? 'Add Item' : action.name,
        type: 'primary' as const,
        icon: undefined,
        onClick: () => {},
      })) || []
    );
  }, [gridViewConfig?.actions?.bulk]);

  React.useEffect(() => {
    setConfig((prev) => ({ ...prev, actionButtons }));
  }, [setConfig, actionButtons]);

  if (!viewConfig?.gridview) {
    return <div>No grid view configuration found for {entityType}</div>;
  }

  return (
    <div style={{ maxWidth }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
      {globalFilters && <div className="flex-1 min-w-[300px] pb-4">{globalFilters}</div>}
        {isMobile ? (
          isLoading ? (
            <div>Loading...</div>
          ) : (
            <List>
              {data.map((record) => {
                const titleFields = allFields.filter((f) => f.cardSection === 'title');
                const bodyFields = allFields.filter((f) => !f.cardSection || f.cardSection === 'body');

                return (
                  <List.Item
                    key={record.id}
                    prefix={<UserIcon size={24} />}
                    description={record[descriptionField] || '-'}
                    arrow={false}
                    extra={
                      <RowActions
                        entityType={entityType}
                        record={record}
                        actions={viewConfig.gridview.actions.row || []}
                        accessConfig={viewConfig.access_config}
                        viewConfig={viewConfig}
                        rawData={data}
                        config={config}
                      />
                    }
                  >
                    {/* Render title fields in mobile view. Join with space to avoid tightly packed text. */}
                    {(titleFields.map((field) => renderField(record, field))?.filter(Boolean).length > 0 ?
                       titleFields.map((field) => renderField(record, field)).filter(Boolean) :
                       record.name || '-'
                    )}
                    <div className="text-xs text-gray-500">
                      {record.created_at ? dayjs(record.created_at).format('MMM D, YYYY') : '-'}
                    </div>
                  </List.Item>
                );
              })}
            </List>
          )
        ) : (
          <Row gutter={[spacing, spacing]}>
            {data.map((record) => {
              const titleFields = allFields.filter((f) => f.cardSection === 'title');
              const footerFields = allFields.filter((f) => f.cardSection === 'footer');
              const bodyFields = allFields.filter((f) => !f.cardSection || f.cardSection === 'body');

              return (
                <Col key={record.id} {...getResponsiveSpans(cardsPerRow)}>
                  <Card
                    size={size}
                    style={{ ...cardStyle, height: '100%' }}
                    title={
                      titleFields?.length > 0 && (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {titleFields?.map((field) => renderField(record, field))?.filter(Boolean)}
                        </Space>
                      )
                    }
                    extra={
                      viewConfig?.gridview?.actions?.row?.length > 0 && (
                        <RowActions
                          entityType={entityType}
                          record={record}
                          actions={viewConfig?.gridview?.actions?.row}
                          accessConfig={viewConfig?.access_config}
                          viewConfig={viewConfig}
                          rawData={data}
                          config={config}
                        />
                      )
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {bodyFields.map((field) => renderField(record, field))?.filter(Boolean)}
                    </Space>
                    {footerFields.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <Space wrap>
                          {footerFields.map((field) => renderField(record, field))?.filter(Boolean)}
                        </Space>
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </motion.div>
    </div>
  );
};

export default GridView;