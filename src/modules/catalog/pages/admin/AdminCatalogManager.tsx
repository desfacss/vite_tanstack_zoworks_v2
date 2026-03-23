import React, { useState } from 'react';
import {
  Layout,
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Space,
  message,
  Popconfirm,
  Typography,
  Tag,
  Menu,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
  TagsOutlined,
  DollarOutlined,
  GiftOutlined,
  SettingOutlined,
  AppstoreOutlined,
  UserOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/core/lib/store';

const { Sider, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// --- Types ---
type EntityType =
  | 'offerings'
  | 'offering-variants'
  | 'offering-bundles'
  | 'price-lists'
  | 'offering-prices'
  | 'discounts'
  | 'discount-rules'
  | 'customer-segments'
  | 'locations';

const getTableName = (entity: EntityType) => {
  const map: Record<EntityType, string> = {
    'offerings': 'offerings',
    'offering-variants': 'offering_variants',
    'offering-bundles': 'offering_bundles',
    'price-lists': 'price_lists',
    'offering-prices': 'offering_prices',
    'discounts': 'discounts',
    'discount-rules': 'discount_rules',
    'customer-segments': 'customer_segments',
    'locations': 'locations',
  };
  return map[entity] || '';
};

const getSchemaName = (tableName: string) => {
  if (tableName === 'locations') return 'organization';
  if (tableName === 'customer_segments') return 'identity';
  return 'catalog';
};

const menuItems = [
  { key: 'offerings', icon: <ShopOutlined />, label: 'Offerings' },
  { key: 'offering-variants', icon: <TagsOutlined />, label: 'Variants' },
  { key: 'offering-bundles', icon: <AppstoreOutlined />, label: 'Bundles' },
  { key: 'price-lists', icon: <DollarOutlined />, label: 'Price Lists' },
  { key: 'offering-prices', icon: <DollarOutlined />, label: 'Prices' },
  { key: 'discounts', icon: <GiftOutlined />, label: 'Discounts' },
  { key: 'discount-rules', icon: <SettingOutlined />, label: 'Discount Rules' },
  { key: 'customer-segments', icon: <UserOutlined />, label: 'Customer Segments' },
  { key: 'locations', icon: <EnvironmentOutlined />, label: 'Locations' },
];

const AdminCatalogManager: React.FC = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthStore();
  const selectedOrganization = organization?.id || '';

  const [selectedEntity, setSelectedEntity] = useState<EntityType>('offerings');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  // --- Data Fetching ---
  const { data: entityData = [], isLoading } = useQuery({
    queryKey: [selectedEntity, selectedOrganization],
    queryFn: async () => {
      if (!selectedOrganization) return [];
      const tableName = getTableName(selectedEntity);
      const schema = getSchemaName(tableName);
      const { data, error } = await supabase
        .schema(schema)
        .from(tableName)
        .select('*')
        .eq('organization_id', selectedOrganization)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOrganization,
  });

  const { data: offerings = [] } = useQuery({
    queryKey: ['offerings-ref', selectedOrganization],
    queryFn: async () => {
      const { data, error } = await supabase.schema('catalog').from('offerings').select('id,name').eq('organization_id', selectedOrganization).order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOrganization,
  });

  const { data: priceLists = [] } = useQuery({
    queryKey: ['price-lists-ref', selectedOrganization],
    queryFn: async () => {
      const { data, error } = await supabase.schema('catalog').from('price_lists').select('id,name').eq('organization_id', selectedOrganization);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOrganization,
  });

  const { data: discounts = [] } = useQuery({
    queryKey: ['discounts-ref', selectedOrganization],
    queryFn: async () => {
      const { data, error } = await supabase.schema('catalog').from('discounts').select('id,name').eq('organization_id', selectedOrganization);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOrganization,
  });

  const { data: customerSegments = [] } = useQuery({
    queryKey: ['customer-segments-ref', selectedOrganization],
    queryFn: async () => {
      const { data, error } = await supabase.schema('identity').from('customer_segments').select('id,name').eq('organization_id', selectedOrganization);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOrganization,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations-ref', selectedOrganization],
    queryFn: async () => {
      const { data, error } = await supabase.schema('organization').from('locations').select('id,name').eq('organization_id', selectedOrganization);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOrganization,
  });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: async (newRecord: any) => {
      const tableName = getTableName(selectedEntity);
      const schema = getSchemaName(tableName);
      const { error } = await supabase.schema(schema).from(tableName).insert([newRecord]);
      if (error) throw error;
    },
    onSuccess: () => { message.success('Created successfully'); queryClient.invalidateQueries({ queryKey: [selectedEntity] }); },
    onError: () => message.error('Failed to create record'),
  });

  const updateMutation = useMutation({
    mutationFn: async (record: any) => {
      const tableName = getTableName(selectedEntity);
      const schema = getSchemaName(tableName);
      const { error } = await supabase.schema(schema).from(tableName).update(record).eq('id', record.id);
      if (error) throw error;
    },
    onSuccess: () => { message.success('Updated successfully'); queryClient.invalidateQueries({ queryKey: [selectedEntity] }); },
    onError: () => message.error('Failed to update record'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const tableName = getTableName(selectedEntity);
      const schema = getSchemaName(tableName);
      const { error } = await supabase.schema(schema).from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { message.success('Deleted successfully'); queryClient.invalidateQueries({ queryKey: [selectedEntity] }); },
    onError: () => message.error('Failed to delete record'),
  });

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    const formatted = { ...record };
    if (selectedEntity === 'offering-variants' && typeof record.attributes === 'object') {
      formatted.attributes = JSON.stringify(record.attributes, null, 2);
    }
    form.setFieldsValue(formatted);
    setDrawerVisible(true);
  };

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const now = new Date().toISOString();
      let baseRecord: any = { ...values, organization_id: selectedOrganization, updated_at: now };

      if (selectedEntity === 'offering-variants' && typeof values.attributes === 'string') {
        try { baseRecord.attributes = JSON.parse(values.attributes); }
        catch { message.error('Invalid JSON for attributes'); return; }
      }

      if (editingRecord) {
        updateMutation.mutate({ ...baseRecord, id: editingRecord.id });
      } else {
        createMutation.mutate({ id: uuidv4(), ...baseRecord, created_at: now });
      }
      setDrawerVisible(false);
      form.resetFields();
    } catch (_) { /* validation errors */ }
  };

  const actionColumn = (label: string) => ({
    title: 'Actions',
    key: 'actions',
    width: 100,
    fixed: 'right' as const,
    render: (record: any) => (
      <Space>
        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
        <Popconfirm title={`Delete this ${label}?`} onConfirm={() => deleteMutation.mutate(record.id)} okText="Yes" cancelText="No">
          <Button type="link" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    ),
  });

  const getColumns = () => {
    const actionCol = actionColumn(selectedEntity);
    switch (selectedEntity) {
      case 'offerings':
        return [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
          { title: 'Short Code', dataIndex: 'short_code', key: 'short_code', width: 120 },
          { title: 'Type', dataIndex: 'type', key: 'type', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: 'Unit', dataIndex: 'unit_of_measure', key: 'unit_of_measure', width: 100 },
          { title: 'Active', dataIndex: 'is_active', key: 'is_active', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
          { title: 'Digital', dataIndex: 'is_digital', key: 'is_digital', width: 80, render: (v: boolean) => v ? <Tag color="purple">Digital</Tag> : '-' },
          actionCol,
        ];
      case 'offering-variants':
        return [
          { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 150 },
          { title: 'Offering', dataIndex: 'offering_id', key: 'offering_id', width: 180, render: (id: string) => offerings.find(o => o.id === id)?.name || id },
          { title: 'Attributes', dataIndex: 'attributes', key: 'attributes', width: 250, render: (v: any) => <span style={{ fontSize: 11, color: '#666' }}>{JSON.stringify(v)}</span> },
          { title: 'Active', dataIndex: 'is_active', key: 'is_active', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
          actionCol,
        ];
      case 'offering-bundles':
        return [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
          { title: 'Offering', dataIndex: 'offering_id', key: 'offering_id', width: 180, render: (id: string) => offerings.find(o => o.id === id)?.name || id },
          { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
          actionCol,
        ];
      case 'price-lists':
        return [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
          { title: 'Short Code', dataIndex: 'short_code', key: 'short_code', width: 120 },
          { title: 'Active', dataIndex: 'is_active', key: 'is_active', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
          actionCol,
        ];
      case 'offering-prices':
        return [
          { title: 'Offering', dataIndex: 'offering_id', key: 'offering_id', width: 180, render: (id: string) => offerings.find(o => o.id === id)?.name || id },
          { title: 'Price List', dataIndex: 'price_list_id', key: 'price_list_id', width: 140, render: (id: string) => priceLists.find(p => p.id === id)?.name || id },
          { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 80 },
          { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 100, render: (v: number) => v?.toFixed(2) },
          { title: 'Min Qty', dataIndex: 'min_quantity', key: 'min_quantity', width: 80 },
          { title: 'Segment', dataIndex: 'customer_segment_id', key: 'customer_segment_id', width: 140, render: (id: string) => id ? (customerSegments.find(s => s.id === id)?.name || id) : '-' },
          actionCol,
        ];
      case 'discounts':
        return [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
          { title: 'Short Code', dataIndex: 'short_code', key: 'short_code', width: 120 },
          { title: 'Type', dataIndex: 'type', key: 'type', width: 140, render: (v: string) => <Tag color="purple">{v}</Tag> },
          { title: 'Value', dataIndex: 'value', key: 'value', width: 100, render: (v: number, r: any) => r.type === 'percentage' ? `${(v * 100).toFixed(0)}%` : v?.toFixed(2) },
          { title: 'Active', dataIndex: 'is_active', key: 'is_active', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
          actionCol,
        ];
      case 'discount-rules':
        return [
          { title: 'Discount', dataIndex: 'discount_id', key: 'discount_id', width: 180, render: (id: string) => discounts.find(d => d.id === id)?.name || id },
          { title: 'Rule Type', dataIndex: 'rule_type', key: 'rule_type', width: 130, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: 'Target ID', dataIndex: 'target_id', key: 'target_id', width: 200 },
          { title: 'Min Qty', dataIndex: 'min_quantity', key: 'min_quantity', width: 80 },
          actionCol,
        ];
      case 'customer-segments':
        return [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
          { title: 'Short Code', dataIndex: 'short_code', key: 'short_code', width: 150 },
          { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
          actionCol,
        ];
      case 'locations':
        return [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
          { title: 'Short Code', dataIndex: 'short_code', key: 'short_code', width: 150 },
          { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
          actionCol,
        ];
      default:
        return [];
    }
  };

  const getFormFields = () => {
    switch (selectedEntity) {
      case 'offerings':
        return (<>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="short_code" label="Short Code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select>
              {['product', 'service', 'subscription', 'bundle', 'digital'].map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description"><TextArea rows={3} /></Form.Item>
          <Form.Item name="unit_of_measure" label="Unit of Measure"><Input placeholder="e.g. piece, kg, hour" /></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="is_digital" label="Digital" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="is_service" label="Service" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="is_physical" label="Physical" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="is_inventory_tracked" label="Track Inventory" valuePropName="checked"><Switch /></Form.Item>
        </>);
      case 'offering-variants':
        return (<>
          <Form.Item name="offering_id" label="Offering" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {offerings.map(o => <Option key={o.id} value={o.id}>{o.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="attributes" label="Attributes (JSON)"><TextArea rows={4} placeholder='{"color":"red","size":"XL"}' /></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>);
      case 'offering-bundles':
        return (<>
          <Form.Item name="offering_id" label="Offering" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {offerings.map(o => <Option key={o.id} value={o.id}>{o.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="Bundle Name" rules={[{ required: true }]}><Input /></Form.Item>
        </>);
      case 'price-lists':
        return (<>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="short_code" label="Short Code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>);
      case 'offering-prices':
        return (<>
          <Form.Item name="offering_id" label="Offering" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {offerings.map(o => <Option key={o.id} value={o.id}>{o.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="price_list_id" label="Price List" rules={[{ required: true }]}>
            <Select>{priceLists.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}</Select>
          </Form.Item>
          <Form.Item name="currency" label="Currency" rules={[{ required: true }]}><Input placeholder="INR" /></Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="min_quantity" label="Min Quantity"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="max_quantity" label="Max Quantity"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="customer_segment_id" label="Customer Segment">
            <Select allowClear>{customerSegments.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}</Select>
          </Form.Item>
          <Form.Item name="location_id" label="Location">
            <Select allowClear>{locations.map(l => <Option key={l.id} value={l.id}>{l.name}</Option>)}</Select>
          </Form.Item>
        </>);
      case 'discounts':
        return (<>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="short_code" label="Short Code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select>
              {['percentage', 'fixed_amount', 'buy_x_get_y_free'].map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="value" label="Value" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>);
      case 'discount-rules':
        return (<>
          <Form.Item name="discount_id" label="Discount" rules={[{ required: true }]}>
            <Select>{discounts.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}</Select>
          </Form.Item>
          <Form.Item name="rule_type" label="Rule Type" rules={[{ required: true }]}>
            <Select>
              {['offering', 'customer_segment', 'location'].map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="target_id" label="Target ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="min_quantity" label="Min Quantity"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </>);
      case 'customer-segments':
        return (<>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="short_code" label="Short Code" rules={[{ required: true }]}><Input /></Form.Item>
        </>);
      case 'locations':
        return (<>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="short_code" label="Short Code" rules={[{ required: true }]}><Input /></Form.Item>
        </>);
      default:
        return null;
    }
  };

  const currentMenu = menuItems.find(m => m.key === selectedEntity);

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0', background: '#fff' }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={5} style={{ margin: 0 }}>Commerce</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedEntity]}
          items={menuItems}
          onClick={({ key }) => setSelectedEntity(key as EntityType)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Content style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            {currentMenu?.label}
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add {currentMenu?.label}
          </Button>
        </div>

        {!selectedOrganization && (
          <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
            No organization selected. Please log in with an organization context.
          </div>
        )}

        <Table
          dataSource={entityData}
          columns={getColumns()}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />

        <Drawer
          title={`${editingRecord ? 'Edit' : 'Add'} ${currentMenu?.label}`}
          open={drawerVisible}
          onClose={() => { setDrawerVisible(false); form.resetFields(); }}
          width={480}
          footer={
            <Space style={{ float: 'right' }}>
              <Button onClick={() => { setDrawerVisible(false); form.resetFields(); }}>Cancel</Button>
              <Button type="primary" onClick={handleSave}>Save</Button>
            </Space>
          }
        >
          <Form form={form} layout="vertical">
            {getFormFields()}
          </Form>
        </Drawer>
      </Content>
    </Layout>
  );
};

export default AdminCatalogManager;
