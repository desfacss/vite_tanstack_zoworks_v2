import React, { useState, useEffect } from 'react';
import { Button, Input, Form, Select, Row, Col, Card, message, Tabs, Table, Typography, Modal, Space, Tag, Tooltip } from 'antd';
import { SaveOutlined, HistoryOutlined, SettingOutlined, EyeOutlined, CodeOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import ReactDiffViewer from 'react-diff-viewer-continued';

const { Option } = Select;
const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface MetricView {
  id: string;
  rule_name: string;
  description: string;
  dependencies: string[];
  definition: string;
  is_active: boolean;
  module: string;
  updated_at: string;
}

interface MetricViewHistory {
  id: string;
  metric_view_id: string;
  rule_name: string;
  data: any;
  version: number;
  created_at: string;
}

interface MetricViewConfigProps {
  metricViewId?: string;
  onSaveSuccess?: () => void;
}

const MetricViewConfig: React.FC<MetricViewConfigProps> = ({ metricViewId, onSaveSuccess }) => {
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [metricView, setMetricView] = useState<Partial<MetricView>>({});
  const [history, setHistory] = useState<MetricViewHistory[]>([]);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<MetricViewHistory | null>(null);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  
  const [form] = Form.useForm();

  useEffect(() => {
    if (metricViewId) {
      fetchMetricView();
    } else {
      resetForm();
    }
  }, [metricViewId]);

  const resetForm = () => {
    const defaults: Partial<MetricView> = {
      rule_name: '',
      description: '',
      module: 'mep_esm',
      is_active: true,
      definition: '-- Enter SQL definition here\nSELECT * FROM ...',
      dependencies: []
    };
    setMetricView(defaults);
    form.setFieldsValue({
      ...defaults,
      dependencies: defaults.dependencies?.join(', ')
    });
    setHistory([]);
  };

  const fetchMetricView = async () => {
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('metric_views')
        .select('*')
        .eq('id', metricViewId)
        .single();

      if (error) throw error;

      if (data) {
        setMetricView(data);
        form.setFieldsValue({
          ...data,
          dependencies: data.dependencies?.join(', ')
        });
        fetchHistory(data.id);
      }
    } catch (error: any) {
      console.error('Error fetching metric view:', error);
      message.error('Failed to load metric view configuration');
    }
  };

  const fetchHistory = async (id: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('metric_view_history')
        .select('*')
        .eq('metric_view_id', id)
        .order('version', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching metric view history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        dependencies: values.dependencies ? values.dependencies.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        updated_at: new Date().toISOString()
      };

      if (metricViewId) {
        const { data, error } = await supabase
          .schema('core')
          .from('metric_views')
          .update(payload)
          .eq('id', metricViewId)
          .select()
          .single();

        if (error) throw error;
        message.success('Metric view updated successfully');
        setMetricView(data);
        fetchHistory(data.id);
      } else {
        const { data, error } = await supabase
          .schema('core')
          .from('metric_views')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        message.success('Metric view created successfully');
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (error: any) {
      console.error('Error saving metric view:', error);
      message.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = (record: MetricViewHistory) => {
    const historicalData = record.data;
    form.setFieldsValue({
      ...historicalData,
      dependencies: historicalData.dependencies?.join(', ')
    });
    message.success(`Version ${record.version} loaded. Click Save to persist.`);
    setIsHistoryModalVisible(false);
  };

  const historyColumns = [
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (v: number) => <Tag color="blue">v{v}</Tag>
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString()
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      render: (_: any, record: MetricViewHistory) => (
        <Space>
          <Tooltip title="Compare with Current">
            <Button size="small" icon={<EyeOutlined />} onClick={() => {
              setSelectedHistoryRecord(record);
              setIsHistoryModalVisible(true);
            }}>Compare</Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Card bordered={false} bodyStyle={{ padding: '0 24px 24px' }}>
      <Tabs defaultActiveKey="general" items={[
        {
          key: 'general',
          label: (<span><SettingOutlined /> General</span>),
          children: (
            <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 20 }}>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="rule_name" label="Rule Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g., kpi_user_retention" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="module" label="Module">
                    <Select>
                      <Option value="mep_esm">MEP ESM</Option>
                      <Option value="payroll">Payroll</Option>
                      <Option value="crm">CRM</Option>
                      <Option value="identity">Identity</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="Description">
                <TextArea rows={2} placeholder="Explain what this metric calculates..." />
              </Form.Item>
              <Form.Item name="dependencies" label="Dependencies (comma-separated)">
                <Input placeholder="e.g., payroll.run_deductions, identity.users" />
              </Form.Item>
              <Form.Item name="is_active" label="Status" valuePropName="checked">
                <Select>
                  <Option value={true}>Active</Option>
                  <Option value={false}>Inactive</Option>
                </Select>
              </Form.Item>
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} htmlType="submit">
                  Save Configuration
                </Button>
              </div>
            </Form>
          )
        },
        {
          key: 'definition',
          label: (<span><CodeOutlined /> SQL Definition</span>),
          children: (
            <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 20 }}>
              <Form.Item name="definition" label="SQL Query" rules={[{ required: true }]}>
                <TextArea 
                  rows={20} 
                  style={{ fontFamily: 'monospace', fontSize: '13px', background: '#f8f9fa' }} 
                  placeholder="WITH ..." 
                />
              </Form.Item>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} htmlType="submit">
                  Save SQL Definition
                </Button>
              </div>
            </Form>
          )
        },
        {
          key: 'history',
          label: (<span><HistoryOutlined /> History</span>),
          children: (
            <div style={{ marginTop: 20 }}>
              <Table 
                dataSource={history} 
                columns={historyColumns} 
                loading={historyLoading} 
                rowKey="id"
                size="middle"
              />
            </div>
          )
        }
      ]} />

      <Modal
        title={`Compare Version ${selectedHistoryRecord?.version} with Current`}
        open={isHistoryModalVisible}
        onCancel={() => setIsHistoryModalVisible(false)}
        width="95%"
        style={{ top: 20 }}
        footer={[
          <Button key="back" onClick={() => setIsHistoryModalVisible(false)}>Close</Button>,
          <Button key="restore" type="primary" danger onClick={() => selectedHistoryRecord && handleRestore(selectedHistoryRecord)}>
            Restore This Version
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Tag color="orange">Historical (Left)</Tag>
          <Tag color="green">Current (Right)</Tag>
        </div>
        <div style={{ height: '70vh', overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
          <ReactDiffViewer
            oldValue={selectedHistoryRecord?.data?.definition || ''}
            newValue={metricView?.definition || ''}
            splitView={true}
            leftTitle={`Version ${selectedHistoryRecord?.version}`}
            rightTitle="Current Implementation"
          />
        </div>
      </Modal>
    </Card>
  );
};

export default MetricViewConfig;
