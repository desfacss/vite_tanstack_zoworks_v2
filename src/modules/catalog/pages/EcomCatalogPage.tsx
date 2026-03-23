import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Card,
  Input,
  Select,
  Button,
  Modal,
  Descriptions,
  Tag,
  Typography,
  Space,
  Row,
  Col,
  Divider,
  Badge,
  Alert,
  Spin,
  Empty,
  message
} from 'antd';
import {
  SearchOutlined,
  ShoppingCartOutlined,
  EyeOutlined,
  FilterOutlined,
  TagOutlined,
  DollarOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Location {
  id: string;
  organization_id: string;
  name: string;
  short_code: string;
  created_at: string;
  updated_at: string;
}

interface CustomerSegment {
  id: string;
  organization_id: string;
  name: string;
  short_code: string;
  created_at: string;
  updated_at: string;
}

interface Offering {
  id: string;
  organization_id: string;
  name: string;
  short_code: string;
  type: 'product' | 'service' | 'subscription' | 'bundle' | 'digital';
  description: string;
  unit_of_measure: string;
  is_active: boolean;
  is_digital?: boolean;
  is_service?: boolean;
  is_configurable?: boolean;
  is_physical?: boolean;
  is_inventory_tracked?: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

interface OfferingVariant {
  id: string;
  offering_id: string;
  sku: string;
  attributes: Record<string, any>;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
  version: number;
}

interface OfferingBundle {
  id: string;
  offering_id: string;
  organization_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  version: number;
}

interface BundleItem {
  bundle_id: string;
  component_offering_id: string;
  quantity: number;
  organization_id: string;
  is_required: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

interface PriceList {
  id: string;
  organization_id: string;
  name: string;
  short_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OfferingPrice {
  id: string;
  organization_id: string;
  offering_id: string;
  offering_variant_id?: string;
  price_list_id: string;
  currency: string;
  amount: number;
  customer_segment_id?: string;
  location_id?: string;
  min_quantity: number;
  max_quantity?: number;
  created_at: string;
  updated_at: string;
}

interface Discount {
  id: string;
  organization_id: string;
  name: string;
  short_code: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y_free';
  value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DiscountRule {
  id: string;
  discount_id: string;
  organization_id: string;
  rule_type: 'offering' | 'customer_segment' | 'location';
  target_id: string;
  min_quantity?: number;
  created_at: string;
  updated_at: string;
}

const { Content, Header } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface CatalogData {
  offerings: Offering[];
  prices: OfferingPrice[];
  discounts: Discount[];
  discountRules: DiscountRule[];
  bundles: OfferingBundle[];
  bundleItems: BundleItem[];
  variants: OfferingVariant[];
  priceLists: PriceList[];
  customerSegments: CustomerSegment[];
  locations: Location[];
}

const EcomCatalogPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [digitalFilter, setDigitalFilter] = useState<string | undefined>(undefined);
  const [serviceFilter, setServiceFilter] = useState<string | undefined>(undefined);
  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrganization) {
      loadCatalogData();
    }
  }, [selectedOrganization]);

  const loadOrganizations = async () => {
    try {
      const publicOrgId = import.meta.env.VITE_PUBLIC_ORG_ID;
      
      if (publicOrgId) {
        // If we have a public org ID in env, use it directly
        const { data, error } = await supabase.schema('identity').from('organizations').select('*').eq('id', publicOrgId);
        if (error) throw error;
        setOrganizations(data || []);
        if (data && data.length > 0 && !selectedOrganization) {
          setSelectedOrganization(publicOrgId);
        }
        return;
      }

      const { data, error } = await supabase
        .schema('identity') // Correct schema definition
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
      
      // Set default organization if available
      if (data && data.length > 0 && !selectedOrganization) {
        setSelectedOrganization(data[0].id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      message.error('Failed to load organizations');
    }
  };

  const loadCatalogData = async () => {
    setLoading(true);
    try {
      // Load all catalog data for the selected organization
      const [
        offeringsResult,
        pricesResult,
        discountsResult,
        discountRulesResult,
        bundlesResult,
        bundleItemsResult,
        variantsResult,
        priceListsResult,
        customerSegmentsResult,
        locationsResult
      ] = await Promise.all([
        supabase
          .schema('catalog') // Correct schema definition
          .from('offerings')
          .select('*')
          .eq('organization_id', selectedOrganization)
          .eq('is_active', true),
        supabase
          .schema('catalog') // Correct schema definition
          .from('offering_prices')
          .select('*')
          .eq('organization_id', selectedOrganization),
        supabase
          .schema('catalog') // Correct schema definition
          .from('discounts')
          .select('*')
          .eq('organization_id', selectedOrganization)
          .eq('is_active', true),
        supabase
          .schema('catalog') // Correct schema definition
          .from('discount_rules')
          .select('*')
          .eq('organization_id', selectedOrganization),
        supabase
          .schema('catalog') // Correct schema definition
          .from('offering_bundles')
          .select('*')
          .eq('organization_id', selectedOrganization),
        supabase
          .schema('catalog') // Correct schema definition
          .from('bundle_items')
          .select('*')
          .eq('organization_id', selectedOrganization),
        supabase
          .schema('catalog') // Correct schema definition
          .from('offering_variants')
          .select('*')
          .eq('organization_id', selectedOrganization)
          .eq('is_active', true),
        supabase
          .schema('catalog') // Correct schema definition
          .from('price_lists')
          .select('*')
          .eq('organization_id', selectedOrganization)
          .eq('is_active', true),
        supabase
          .schema('identity') // Correct schema definition
          .from('customer_segments')
          .select('*')
          .eq('organization_id', selectedOrganization),
        supabase
          .schema('organization') // Correct schema definition
          .from('locations')
          .select('*')
          .eq('organization_id', selectedOrganization)
      ]);

      // Check for errors in critical data only — locations/segments are optional
      const criticalResults = [
        offeringsResult, pricesResult, discountsResult, discountRulesResult,
        bundlesResult, bundleItemsResult, variantsResult, priceListsResult,
      ];

      for (const result of criticalResults) {
        if (result.error) throw result.error;
      }

      // Warn but don't throw for optional context data
      if (customerSegmentsResult.error) console.warn('[Shop] Could not load customer segments:', customerSegmentsResult.error.message);
      if (locationsResult.error) console.warn('[Shop] Could not load locations:', locationsResult.error.message);

      setCatalogData({
        offerings: offeringsResult.data || [],
        prices: pricesResult.data || [],
        discounts: discountsResult.data || [],
        discountRules: discountRulesResult.data || [],
        bundles: bundlesResult.data || [],
        bundleItems: bundleItemsResult.data || [],
        variants: variantsResult.data || [],
        priceLists: priceListsResult.data || [],
        customerSegments: customerSegmentsResult.data || [],
        locations: locationsResult.data || []
      });
    } catch (error) {
      console.error('Error loading catalog data:', error);
      message.error('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  };


  const filteredOfferings = useMemo(() => {
    if (!catalogData) return [];

    return catalogData.offerings.filter(offering => {
      const matchesSearch = !searchTerm ||
        offering.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offering.short_code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter.length === 0 || typeFilter.includes(offering.type);

      const matchesDigital = digitalFilter === undefined ||
        (digitalFilter === 'true' && offering.is_digital) ||
        (digitalFilter === 'false' && !offering.is_digital);

      const matchesService = serviceFilter === undefined ||
        (serviceFilter === 'true' && offering.is_service) ||
        (serviceFilter === 'false' && !offering.is_service);

      return matchesSearch && matchesType && matchesDigital && matchesService;
    });
  }, [catalogData, searchTerm, typeFilter, digitalFilter, serviceFilter]);

  const getOfferingPrice = (offeringId: string, variantId?: string) => {
    if (!catalogData) return null;

    // Find prices for this offering
    const prices = catalogData.prices.filter(p =>
      p.offering_id === offeringId &&
      (!variantId || p.offering_variant_id === variantId)
    );

    if (prices.length === 0) return null;

    // Prioritize prices without customer segment or location, then with min_quantity = 1
    const standardPrice = prices.find(p => !p.customer_segment_id && !p.location_id && p.min_quantity === 1);
    if (standardPrice) return standardPrice;

    // Fallback to first available price
    return prices[0];
  };

  const getOfferingDiscounts = (offeringId: string) => {
    if (!catalogData) return [];

    const applicableDiscounts = catalogData.discounts.filter(discount => {
      const rules = catalogData.discountRules.filter(rule => rule.discount_id === discount.id);
      return rules.some(rule =>
        rule.rule_type === 'offering' && rule.target_id === offeringId
      );
    });

    return applicableDiscounts;
  };

  const getOfferingBundle = (offeringId: string) => {
    if (!catalogData) return null;
    return catalogData.bundles.find(b => b.offering_id === offeringId);
  };

  const getBundleItems = (bundleId: string) => {
    if (!catalogData) return [];
    return catalogData.bundleItems.filter(bi => bi.bundle_id === bundleId);
  };

  const getOfferingVariants = (offeringId: string) => {
    if (!catalogData) return [];
    return catalogData.variants.filter(v => v.offering_id === offeringId);
  };

  const formatAttributes = (attributes: Record<string, any>) => {
    return Object.entries(attributes).map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  const handleAddToCart = (offering: Offering, quantity: number = 1) => {
    console.log('Add to cart:', { offeringId: offering.id, quantity });
    message.success(`Added ${offering.name} to cart (Quantity: ${quantity})`);
  };

  const openDetailModal = (offering: Offering) => {
    setSelectedOffering(offering);
    setDetailModalVisible(true);
  };

  const renderOfferingCard = (offering: Offering) => {
    const price = getOfferingPrice(offering.id);
    const discounts = getOfferingDiscounts(offering.id);
    const bundle = getOfferingBundle(offering.id);

    return (
      <Card
        key={offering.id}
        hoverable
        actions={[
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => openDetailModal(offering)}
            size="small"
          >
            <span className="hidden sm:inline">View Details</span>
            <span className="sm:hidden">Details</span>
          </Button>,
          <Button
            type="default"
            icon={<ShoppingCartOutlined />}
            onClick={() => handleAddToCart(offering)}
            size="small"
          >
            <span className="hidden sm:inline">Add to Cart</span>
            <span className="sm:hidden">Cart</span>
          </Button>
        ]}
        style={{ height: '100%' }}
      >
        <Card.Meta
          title={
            <Space>
              {offering.name}
              <Tag color="blue">{offering.short_code}</Tag>
            </Space>
          }
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">{offering.description}</Text>
              <Space wrap>
                <Tag color="green">{offering.type}</Tag>
                {offering.is_digital && <Tag color="purple">Digital</Tag>}
                {offering.is_service && <Tag color="orange">Service</Tag>}
                {offering.is_configurable && <Tag color="cyan">Configurable</Tag>}
                {bundle && <Tag color="gold">Bundle</Tag>}
              </Space>
              <Space>
                <Text strong>Unit:</Text>
                <Text>{offering.unit_of_measure}</Text>
              </Space>
              {price && (
                <Space>
                  <DollarOutlined />
                  <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                    {price.currency} {price.amount.toFixed(2)}
                  </Text>
                  {price.min_quantity > 1 && (
                    <Text type="secondary">(Min: {price.min_quantity})</Text>
                  )}
                </Space>
              )}
              {discounts.length > 0 && (
                <Badge count={discounts.length} size="small">
                  <Tag color="red" icon={<GiftOutlined />}>
                    Discounts Available
                  </Tag>
                </Badge>
              )}
            </Space>
          }
        />
      </Card>
    );
  };

  const renderDetailModal = () => {
    if (!selectedOffering || !catalogData) return null;

    const prices = catalogData.prices.filter(p => p.offering_id === selectedOffering.id);
    const discounts = getOfferingDiscounts(selectedOffering.id);
    const bundle = getOfferingBundle(selectedOffering.id);
    const bundleItems = bundle ? getBundleItems(bundle.id) : [];
    const variants = getOfferingVariants(selectedOffering.id);

    return (
      <Modal
        title={
          <Space>
            {selectedOffering.name}
            <Tag color="blue">{selectedOffering.short_code}</Tag>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width="90%"
        style={{ maxWidth: 800 }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="cart"
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => {
              handleAddToCart(selectedOffering);
              setDetailModalVisible(false);
            }}
          >
            Add to Cart
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Descriptions title="Offering Details" bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Name">{selectedOffering.name}</Descriptions.Item>
            <Descriptions.Item label="Short Code">{selectedOffering.short_code}</Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="green">{selectedOffering.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Unit of Measure">{selectedOffering.unit_of_measure}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {selectedOffering.description}
            </Descriptions.Item>
            <Descriptions.Item label="Features">
              <Space wrap>
                {selectedOffering.is_digital && <Tag color="purple">Digital</Tag>}
                {selectedOffering.is_service && <Tag color="orange">Service</Tag>}
                {selectedOffering.is_configurable && <Tag color="cyan">Configurable</Tag>}
                {selectedOffering.is_physical && <Tag color="blue">Physical</Tag>}
                {selectedOffering.is_inventory_tracked && <Tag color="magenta">Inventory Tracked</Tag>}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          {prices.length > 0 && (
            <>
              <Divider>Pricing</Divider>
              <Row gutter={[16, 16]}>
                {prices.map(price => {
                  const segment = catalogData.customerSegments.find(s => s.id === price.customer_segment_id);
                  const location = catalogData.locations.find(l => l.id === price.location_id);
                  const priceList = catalogData.priceLists.find(pl => pl.id === price.price_list_id);

                  return (
                    <Col xs={24} sm={12} key={price.id}>
                      <Card size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                            {price.currency} {price.amount.toFixed(2)}
                          </Text>
                          {priceList && <Text type="secondary">Price List: {priceList.name}</Text>}
                          {price.min_quantity > 1 && <Text>Min Quantity: {price.min_quantity}</Text>}
                          {price.max_quantity && <Text>Max Quantity: {price.max_quantity}</Text>}
                          {segment && <Tag color="blue">Segment: {segment.name}</Tag>}
                          {location && <Tag color="green">Location: {location.name}</Tag>}
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </>
          )}

          {variants.length > 0 && (
            <>
              <Divider>Variants</Divider>
              <Row gutter={[16, 16]}>
                {variants.map(variant => {
                  const variantPrice = getOfferingPrice(selectedOffering.id, variant.id);

                  return (
                    <Col xs={24} sm={12} key={variant.id}>
                      <Card size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text strong>SKU: {variant.sku}</Text>
                          <Text>Attributes: {formatAttributes(variant.attributes)}</Text>
                          {variantPrice && (
                            <Text style={{ color: '#52c41a' }}>
                              {variantPrice.currency} {variantPrice.amount.toFixed(2)}
                            </Text>
                          )}
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </>
          )}

          {bundle && bundleItems.length > 0 && (
            <>
              <Divider>Bundle Components</Divider>
              <Row gutter={[16, 16]}>
                {bundleItems.map(item => {
                  const componentOffering = catalogData.offerings.find(o => o.id === item.component_offering_id);

                  return (
                    <Col span={24} key={`${item.bundle_id}-${item.component_offering_id}`}>
                      <Card size="small">
                        <Space>
                          <Text strong>{componentOffering?.name || 'Unknown Offering'}</Text>
                          <Tag color="blue">Qty: {item.quantity}</Tag>
                          <Tag color={item.is_required ? 'green' : 'orange'}>
                            {item.is_required ? 'Required' : 'Optional'}
                          </Tag>
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </>
          )}

          {discounts.length > 0 && (
            <>
              <Divider>Available Discounts</Divider>
              <Row gutter={[16, 16]}>
                {discounts.map(discount => {
                  const rules = catalogData.discountRules.filter(r => r.discount_id === discount.id);

                  return (
                    <Col span={24} key={discount.id}>
                      <Card size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space>
                            <Text strong>{discount.name}</Text>
                            <Tag color="red">{discount.short_code}</Tag>
                          </Space>
                          <Text>
                            Type: {discount.type} | Value: {
                              discount.type === 'percentage'
                                ? `${(discount.value * 100).toFixed(0)}%`
                                : `${discount.value.toFixed(2)}`
                            }
                          </Text>
                          {rules.map(rule => (
                            <Text key={rule.id} type="secondary">
                              Rule: {rule.rule_type} {rule.min_quantity && `(Min: ${rule.min_quantity})`}
                            </Text>
                          ))}
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </>
          )}
        </Space>
      </Modal>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              E-Commerce Catalog
            </Title>
          </Col>
          <Col>
            <Select
              style={{ width: '100%', minWidth: 200, maxWidth: 300 }}
              placeholder="Select Organization"
              value={selectedOrganization}
              onChange={setSelectedOrganization}
              loading={organizations.length === 0}
            >
              {organizations.map(org => (
                <Option key={org.id} value={org.id}>
                  {org.name}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Header>

      <Content style={{ padding: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Search and Filters */}
          <Card>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="Search offerings by name or code..."
                  allowClear
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={setSearchTerm}
                  prefix={<SearchOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Filter by type"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  allowClear
                >
                  <Option value="product">Product</Option>
                  <Option value="service">Service</Option>
                  <Option value="subscription">Subscription</Option>
                  <Option value="bundle">Bundle</Option>
                  <Option value="digital">Digital</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Digital items"
                  value={digitalFilter}
                  onChange={setDigitalFilter}
                  allowClear
                >
                  <Option value="true">Digital Only</Option>
                  <Option value="false">Non-Digital Only</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Service items"
                  value={serviceFilter}
                  onChange={setServiceFilter}
                  allowClear
                >
                  <Option value="true">Services Only</Option>
                  <Option value="false">Non-Services Only</Option>
                </Select>
              </Col>
              <Col xs={24} md={4}>
                <Button
                  style={{ width: '100%' }}
                  icon={<FilterOutlined />}
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter([]);
                    setDigitalFilter(undefined);
                    setServiceFilter(undefined);
                  }}
                >
                  Clear Filters
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Results Summary */}
          {catalogData && (
            <Alert
              message={`Showing ${filteredOfferings.length} of ${catalogData.offerings.length} offerings`}
              type="info"
              showIcon
              icon={<TagOutlined />}
            />
          )}

          {/* Catalog Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading catalog...</div>
            </div>
          ) : filteredOfferings.length > 0 ? (
            <Row gutter={[24, 24]}>
              {filteredOfferings.map(offering => (
                <Col key={offering.id} xs={24} sm={12} lg={8} xl={6}>
                  {renderOfferingCard(offering)}
                </Col>
              ))}
            </Row>
          ) : (
            <Empty
              description="No offerings found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Space>

        {renderDetailModal()}
      </Content>
    </Layout>
  );
};

export default EcomCatalogPage;