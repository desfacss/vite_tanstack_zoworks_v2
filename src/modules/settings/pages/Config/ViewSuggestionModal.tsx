import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Button,
  Space,
  Tag,
  Table,
  Collapse,
  Checkbox,
  Typography,
  Descriptions,
  Empty,
  Divider,
} from 'antd';
import {
  TableOutlined,
  AppstoreOutlined,
  ProjectOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Text } = Typography;

interface ViewSuggestionModalProps {
  visible: boolean;
  onClose: () => void;
  suggestedConfigs: any;
  onApplyAll: () => void;
  onApplySelected: (selectedViews: string[]) => void;
  loading?: boolean;
  entityName?: string;
}

const VIEW_ICONS: Record<string, React.ReactNode> = {
  tableview: <TableOutlined />,
  gridview: <AppstoreOutlined />,
  kanbanview: <ProjectOutlined />,
  detailview: <UnorderedListOutlined />,
  calendarview: <CalendarOutlined />,
  mapview: <EnvironmentOutlined />,
  metricsview: <BarChartOutlined />,
};

const VIEW_LABELS: Record<string, string> = {
  tableview: 'Table View',
  gridview: 'Grid View',
  kanbanview: 'Kanban View',
  detailview: 'Detail View',
  calendarview: 'Calendar View',
  mapview: 'Map View',
  metricsview: 'Metrics View',
};

const ViewSuggestionModal: React.FC<ViewSuggestionModalProps> = ({
  visible,
  onClose,
  suggestedConfigs,
  onApplyAll,
  onApplySelected,
  loading = false,
  entityName = 'Entity',
}) => {
  const [selectedViews, setSelectedViews] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('tableview');

  // Get available views from meta
  const availableViews = suggestedConfigs?._meta?.applicable_views || [];

  const handleViewToggle = (viewName: string, checked: boolean) => {
    if (checked) {
      setSelectedViews([...selectedViews, viewName]);
    } else {
      setSelectedViews(selectedViews.filter((v) => v !== viewName));
    }
  };

  const handleSelectAll = () => {
    setSelectedViews([...availableViews]);
  };

  const handleDeselectAll = () => {
    setSelectedViews([]);
  };

  // Render TableView Preview
  const renderTableViewPreview = () => {
    const config = suggestedConfigs?.tableview;
    if (!config) return <Empty description="TableView not generated" />;

    const fields = config.fields || [];
    const columns = [
      { title: '#', dataIndex: 'order', key: 'order', width: 50 },
      { title: 'Field Name', dataIndex: 'fieldName', key: 'fieldName' },
      { title: 'Field Path', dataIndex: 'fieldPath', key: 'fieldPath' },
    ];

    return (
      <div>
        <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Default Sort">
            <Tag color="blue">{config.defaultSort || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Features">
            {(config.showFeatures || []).map((f: string) => (
              <Tag key={f}>{f}</Tag>
            ))}
          </Descriptions.Item>
        </Descriptions>
        <Table
          dataSource={fields}
          columns={columns}
          size="small"
          pagination={false}
          rowKey="order"
        />
      </div>
    );
  };

  // Render GridView Preview
  const renderGridViewPreview = () => {
    const config = suggestedConfigs?.gridview;
    if (!config) return <Empty description="GridView not generated" />;

    const cardFields = config.cardFields || {};

    return (
      <div>
        <Descriptions size="small" column={2} bordered>
          <Descriptions.Item label="Title Field">
            <Tag color="green">{cardFields.title || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Subtitle Field">
            <Tag color="cyan">{cardFields.subtitle || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Tags Field">
            <Tag>{cardFields.tags || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Badge Field">
            <Tag color="orange">{cardFields.badge || 'N/A'}</Tag>
          </Descriptions.Item>
        </Descriptions>
        <Divider orientation="left">Layout</Divider>
        <Space>
          <Text>Cards per row: {config.layout?.cardsPerRow || 3}</Text>
          <Text>Size: {config.layout?.cardSize || 'medium'}</Text>
        </Space>
      </div>
    );
  };

  // Render DetailView Preview
  const renderDetailViewPreview = () => {
    const config = suggestedConfigs?.detailview;
    if (!config) return <Empty description="DetailView not generated" />;

    const groups = config.groups || [];

    return (
      <Collapse defaultActiveKey={['0']}>
        {groups.map((group: any, idx: number) => (
          <Panel header={`${group.groupName} (${group.fields?.length || 0} fields)`} key={idx}>
            <Space wrap>
              {(group.fields || []).map((field: any) => (
                <Tag key={field.fieldPath}>{field.fieldName}</Tag>
              ))}
            </Space>
          </Panel>
        ))}
      </Collapse>
    );
  };

  // Render KanbanView Preview
  const renderKanbanViewPreview = () => {
    const config = suggestedConfigs?.kanbanview;
    if (!config) return <Empty description="KanbanView not applicable (no stage_id found)" />;

    const cardFields = config.cardFields || {};

    return (
      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="Group By">
          <Tag color="purple">{config.groupBy?.field || 'stage_id'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Title Field">
          <Tag color="green">{cardFields.title || 'N/A'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Description Field">
          <Tag>{cardFields.description || 'N/A'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Assignee Field">
          <Tag color="blue">{cardFields.assignee || 'N/A'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Due Date Field">
          <Tag color="red">{cardFields.dueDate || 'N/A'}</Tag>
        </Descriptions.Item>
      </Descriptions>
    );
  };

  // Render CalendarView Preview
  const renderCalendarViewPreview = () => {
    const config = suggestedConfigs?.calendarview;
    if (!config) return <Empty description="CalendarView not applicable (no temporal fields found)" />;

    return (
      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="Title Field">
          <Tag color="green">{config.titleField || 'N/A'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Start Field">
          <Tag color="blue">{config.startField || 'N/A'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="End Field">
          <Tag color="cyan">{config.endField || 'N/A'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="All-Day Field">
          <Tag>{config.allDayField || 'N/A'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Color Field">
          <Tag color="orange">{config.colorField || 'N/A'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Default View">
          <Tag>{config.defaultView || 'month'}</Tag>
        </Descriptions.Item>
      </Descriptions>
    );
  };

  // Render MapView Preview
  const renderMapViewPreview = () => {
    const config = suggestedConfigs?.mapview;
    if (!config) return <Empty description="MapView not applicable (no geo fields found)" />;

    return (
      <div>
        <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Latitude Field">
            <Tag color="geekblue">{config.latField || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Longitude Field">
            <Tag color="geekblue">{config.lngField || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Geometry Field">
            <Tag>{config.geometryField || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Title Field">
            <Tag color="green">{config.titleField || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Clustering">
            <Tag color={config.clusterEnabled ? 'green' : 'default'}>
              {config.clusterEnabled ? 'Enabled' : 'Disabled'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
        <Text strong>Popup Fields:</Text>{' '}
        {(config.popupFields || []).map((f: string) => (
          <Tag key={f}>{f}</Tag>
        ))}
      </div>
    );
  };

  // Render MetricsView Preview
  const renderMetricsViewPreview = () => {
    const config = suggestedConfigs?.metricsview;
    if (!config) return <Empty description="MetricsView not generated" />;

    const measures = config.measures || [];
    const dimensions = config.dimensions || [];

    return (
      <div>
        <Divider orientation="left">Measures</Divider>
        <Space wrap>
          {measures.map((m: any) => (
            <Tag key={m.field} color="green">
              {m.displayName} ({m.aggregation})
            </Tag>
          ))}
        </Space>
        <Divider orientation="left">Dimensions</Divider>
        <Space wrap>
          {dimensions.map((d: any) => (
            <Tag key={d.field} color="blue">
              {d.displayName}
            </Tag>
          ))}
        </Space>
        <Divider orientation="left">Time Dimension</Divider>
        <Tag color="purple">{config.timeDimension || 'N/A'}</Tag>
        <Divider orientation="left">Default Charts</Divider>
        <Space wrap>
          {(config.defaultCharts || []).map((c: any, idx: number) => (
            <Tag key={idx} color="orange">
              {c.type}: {c.title}
            </Tag>
          ))}
        </Space>
      </div>
    );
  };

  const renderViewContent = (viewName: string) => {
    switch (viewName) {
      case 'tableview':
        return renderTableViewPreview();
      case 'gridview':
        return renderGridViewPreview();
      case 'detailview':
        return renderDetailViewPreview();
      case 'kanbanview':
        return renderKanbanViewPreview();
      case 'calendarview':
        return renderCalendarViewPreview();
      case 'mapview':
        return renderMapViewPreview();
      case 'metricsview':
        return renderMetricsViewPreview();
      default:
        return <Empty description={`No preview for ${viewName}`} />;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <span>🪄 Generated View Configurations</span>
          <Tag color="blue">{entityName}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onApplySelected(selectedViews)}
            disabled={selectedViews.length === 0}
          >
            Apply Selected ({selectedViews.length})
          </Button>
          <Button type="primary" onClick={onApplyAll} loading={loading}>
            Apply All Views
          </Button>
        </Space>
      }
    >
      {/* Summary */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <Space>
          <Text strong>Available Views:</Text>
          {availableViews.map((v: string) => (
            <Tag
              key={v}
              icon={suggestedConfigs?.[v] ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              color={suggestedConfigs?.[v] ? 'success' : 'default'}
            >
              {VIEW_LABELS[v] || v}
            </Tag>
          ))}
        </Space>
      </div>

      {/* Selection Controls */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text>Select views to apply:</Text>
          <Button size="small" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button size="small" onClick={handleDeselectAll}>
            Deselect All
          </Button>
        </Space>
      </div>

      {/* Tabs with Previews */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {availableViews.map((viewName: string) => (
          <TabPane
            tab={
              <Space>
                <Checkbox
                  checked={selectedViews.includes(viewName)}
                  onChange={(e) => handleViewToggle(viewName, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                {VIEW_ICONS[viewName]}
                {VIEW_LABELS[viewName] || viewName}
              </Space>
            }
            key={viewName}
          >
            {renderViewContent(viewName)}
          </TabPane>
        ))}
      </Tabs>

      {/* Meta Info */}
      {suggestedConfigs?._meta && (
        <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
          Generated at: {suggestedConfigs._meta.generated_at}
          {suggestedConfigs._meta.generator_version && ` | v${suggestedConfigs._meta.generator_version}`}
        </div>
      )}
    </Modal>
  );
};

export default ViewSuggestionModal;
