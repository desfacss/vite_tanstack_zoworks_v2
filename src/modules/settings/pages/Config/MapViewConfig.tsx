import React, { useState, useEffect, useMemo } from 'react';
import { Button, Select, Table, Checkbox, Row, Col, Input, message, Typography, Card, Form } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

interface FieldConfig {
  fieldPath: string;
  style?: React.CSSProperties;
  webLink?: boolean;
  mapSection?: 'title' | 'body' | 'footer';
  order?: number;
}

interface Action {
  form: string;
  name: string;
  label?: string;
}

interface ConfigData {
  fields?: FieldConfig[];
  locationFields?: {
    lat: string;
    lng: string;
    geofence?: {
      field: string;
      sourceTable?: string;
      rpc?: string;
      srid?: string;
    };
    trackField?: string;
  };
  layout?: {
    zoom?: number;
    markerIcon?: string;
    showTracks?: boolean;
    showGeofences?: boolean;
    maxWidth?: string;
  };
  actions?: {
    row?: Action[];
    bulk?: Action[];
  };
}

interface MetadataItem {
  key: string;
  display_name: string;
  is_displayable?: boolean;
}

interface MapViewConfigProps {
  configData: ConfigData;
  onSave: (data: ConfigData) => void;
  metadata?: MetadataItem[];
  entityType?: string;
}

const MapViewConfig: React.FC<MapViewConfigProps> = ({ configData, onSave, metadata }) => {
  const [fields, setFields] = useState<FieldConfig[]>(configData?.fields || []);
  const [locationFields, setLocationFields] = useState(configData?.locationFields || { lat: '', lng: '', geofence: { field: '' } });
  const [layout, setLayout] = useState(configData?.layout || { zoom: 13, showGeofences: true, showTracks: false });
  const [actions, setActions] = useState(configData?.actions || { row: [], bulk: [] });

  const transformedColumns = useMemo(() => {
    return metadata?.filter(col => col.is_displayable !== false).map((col: any) => col.key) || [];
  }, [metadata]);

  useEffect(() => {
    if (configData) {
      setFields(configData.fields || []);
      setLocationFields(configData.locationFields || { lat: '', lng: '', geofence: { field: '' } });
      setLayout(configData.layout || { zoom: 13, showGeofences: true, showTracks: false });
      setActions(configData.actions || { row: [], bulk: [] });
    }
  }, [configData]);

  const handleSave = () => {
    onSave({ fields, locationFields, layout, actions });
    message.success('Map View configuration saved!');
  };

  const handleAddField = () => {
    setFields([...fields, { fieldPath: '', mapSection: 'body', order: fields.length + 1 }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const fieldColumns = [
    {
      title: 'Field',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
      render: (text: string, _: FieldConfig, index: number) => (
        <Select
          showSearch
          style={{ width: '100%' }}
          value={text}
          onChange={(val) => {
            const newFields = [...fields];
            newFields[index].fieldPath = val;
            setFields(newFields);
          }}
        >
          {transformedColumns.map((col: any) => <Option key={col} value={col}>{col}</Option>)}
        </Select>
      )
    },
    {
      title: 'Section',
      dataIndex: 'mapSection',
      key: 'mapSection',
      render: (text: string, _: FieldConfig, index: number) => (
        <Select
          style={{ width: '100%' }}
          value={text || 'body'}
          onChange={(val) => {
            const newFields = [...fields];
            newFields[index].mapSection = val as any;
            setFields(newFields);
          }}
        >
          <Option value="title">Title</Option>
          <Option value="body">Body</Option>
          <Option value="footer">Footer</Option>
        </Select>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, __: any, index: number) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveField(index)} />
      )
    }
  ];

  const handleAddAction = (type: 'row' | 'bulk') => {
    const newActions = { ...actions };
    if (!newActions[type]) newActions[type] = [];
    newActions[type].push({ form: '', name: '' });
    setActions(newActions);
  };

  const handleRemoveAction = (type: 'row' | 'bulk', index: number) => {
    const newActions = { ...actions };
    newActions[type] = (newActions[type] || []).filter((_, i) => i !== index);
    setActions(newActions);
  };

  const handleActionChange = (type: 'row' | 'bulk', index: number, key: keyof Action, val: string) => {
    const newActions = { ...actions };
    if (newActions[type]) {
      newActions[type][index][key] = val;
      setActions(newActions);
    }
  };

  const renderActionTable = (type: 'row' | 'bulk') => (
    <Table
      dataSource={(actions[type] || []).map((a, i) => ({ ...a, key: i }))}
      pagination={false}
      size="small"
      columns={[
        {
          title: 'Form',
          dataIndex: 'form',
          render: (text: string, _: any, index: number) => (
            <Input value={text} onChange={(e) => handleActionChange(type, index, 'form', e.target.value)} />
          )
        },
        {
          title: 'Name',
          dataIndex: 'name',
          render: (text: string, _: any, index: number) => (
            <Input value={text} onChange={(e) => handleActionChange(type, index, 'name', e.target.value)} />
          )
        },
        {
          title: 'Actions',
          render: (_: any, __: any, index: number) => (
            <Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveAction(type, index)} />
          )
        }
      ]}
    />
  );

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Map View Configuration</Title>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          Save Configuration
        </Button>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="Location Fields" style={{ marginBottom: 24 }}>
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Latitude Field">
                    <Select
                      value={locationFields.lat}
                      onChange={(val) => setLocationFields({ ...locationFields, lat: val })}
                      showSearch
                    >
                      {transformedColumns.map((col: any) => <Option key={col} value={col}>{col}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Longitude Field">
                    <Select
                      value={locationFields.lng}
                      onChange={(val) => setLocationFields({ ...locationFields, lng: val })}
                      showSearch
                    >
                      {transformedColumns.map((col: any) => <Option key={col} value={col}>{col}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Geofence Field">
                    <Select
                      value={locationFields.geofence?.field}
                      onChange={(val) => setLocationFields({
                        ...locationFields,
                        geofence: { ...locationFields.geofence, field: val }
                      })}
                      showSearch
                    >
                      <Option value="">None</Option>
                      {transformedColumns.map((col: any) => <Option key={col} value={col}>{col}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Track Field">
                    <Select
                      value={locationFields.trackField}
                      onChange={(val) => setLocationFields({ ...locationFields, trackField: val })}
                      showSearch
                    >
                      <Option value="">None</Option>
                      {transformedColumns.map((col: any) => <Option key={col} value={col}>{col}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <Card title="Popup Information" style={{ marginBottom: 24 }}>
            <Table
              dataSource={fields.map((f, i) => ({ ...f, key: i }))}
              columns={fieldColumns}
              pagination={false}
              size="small"
            />
            <Button
              type="dashed"
              onClick={handleAddField}
              block
              icon={<PlusOutlined />}
              style={{ marginTop: 16 }}
            >
              Add Popup Field
            </Button>
          </Card>

          <Card title="Row Actions" style={{ marginBottom: 24 }}>
            {renderActionTable('row')}
            <Button type="dashed" onClick={() => handleAddAction('row')} block icon={<PlusOutlined />} style={{ marginTop: 16 }}>
              Add Row Action
            </Button>
          </Card>

          <Card title="Bulk Actions">
            {renderActionTable('bulk')}
            <Button type="dashed" onClick={() => handleAddAction('bulk')} block icon={<PlusOutlined />} style={{ marginTop: 16 }}>
              Add Bulk Action
            </Button>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Layout & Defaults">
            <Form layout="vertical">
              <Form.Item label="Default Zoom">
                <Input
                  type="number"
                  value={layout.zoom}
                  onChange={(e) => setLayout({ ...layout, zoom: parseInt(e.target.value) })}
                />
              </Form.Item>
              <Form.Item label="Marker Icon URL">
                <Input
                  value={layout.markerIcon}
                  onChange={(e) => setLayout({ ...layout, markerIcon: e.target.value })}
                  placeholder="/marker-icon.png"
                />
              </Form.Item>
              <Form.Item>
                <Checkbox
                  checked={layout.showGeofences}
                  onChange={(e) => setLayout({ ...layout, showGeofences: e.target.checked })}
                >
                  Show Geofences by Default
                </Checkbox>
              </Form.Item>
              <Form.Item>
                <Checkbox
                  checked={layout.showTracks}
                  onChange={(e) => setLayout({ ...layout, showTracks: e.target.checked })}
                >
                  Show Tracks by Default
                </Checkbox>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MapViewConfig;
