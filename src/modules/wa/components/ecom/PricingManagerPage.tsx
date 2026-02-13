import React, { useState, useMemo } from 'react';
import {
    Table,
    Button,
    App,
    InputNumber,
    Select,
    Tooltip,
    Alert,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useResponsive } from '../../hooks/useResponsive';

const generateUUID = () => crypto.randomUUID();
import {
    OfferingVariant,
    Location,
    CustomerSegment,
    PriceList,
    OfferingPrice,
} from '../../types/ecom';
import { useAuthStore } from '@/lib/authStore';

const { Option } = Select;

const getCatalogSchemaName = () => 'catalog';
const getIdentitySchemaName = () => 'identity';

const getPriceListTableName = () => 'price_lists';
const getOfferingVariantTableName = () => 'offering_variants';
const getOfferingPriceTableName = () => 'offering_prices';
const getLocationTableName = () => 'locations';
const getCustomerSegmentTableName = () => 'wa_contact_segments';

interface PricingManagerPageProps {
    selectedOrganization: string;
}

interface VariantWithOffering extends OfferingVariant {
    offering?: { name: string };
}

const PricingManagerPage: React.FC<PricingManagerPageProps> = ({ selectedOrganization }) => {
    const { isMobile } = useResponsive();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [selectedPriceList, setSelectedPriceList] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<{ [key: string]: any }>({});

    const { data: priceLists = [], isLoading: isLoadingPriceLists } = useQuery<PriceList[]>({
        queryKey: [getPriceListTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getPriceListTableName())
                .select('*')
                .eq('organization_id', selectedOrganization);
            if (error) throw error;
            if (data?.length && !selectedPriceList) {
                setSelectedPriceList(data[0].id);
            }
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const { data: offeringsAndVariants = [], isLoading: isLoadingVariants } = useQuery<VariantWithOffering[]>({
        queryKey: [getOfferingVariantTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getOfferingVariantTableName())
                .select(`*, offering:offerings(name)`)
                .eq('organization_id', selectedOrganization)
                .order('sku');
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const { data: locations = [], isLoading: isLoadingLocations } = useQuery<Location[]>({
        queryKey: [getLocationTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getIdentitySchemaName())
                .from(getLocationTableName())
                .select('*')
                .eq('organization_id', selectedOrganization)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const { data: customerSegments = [], isLoading: isLoadingSegments } = useQuery<CustomerSegment[]>({
        queryKey: [getCustomerSegmentTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getIdentitySchemaName())
                .from(getCustomerSegmentTableName())
                .select('*')
                .eq('organization_id', selectedOrganization)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const { data: offeringPrices = [], isLoading: isLoadingPrices } = useQuery<OfferingPrice[]>({
        queryKey: [getOfferingPriceTableName(), selectedOrganization, selectedPriceList],
        queryFn: async () => {
            if (!selectedPriceList) return [];
            const { data, error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getOfferingPriceTableName())
                .select('*')
                .eq('organization_id', selectedOrganization)
                .eq('price_list_id', selectedPriceList)
                .order('offering_variant_id');
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization && !!selectedPriceList,
    });

    const isLoading = isLoadingPriceLists || isLoadingVariants || isLoadingLocations || isLoadingSegments || isLoadingPrices;

    const dataSource = useMemo(() => {
        const mergedData = offeringsAndVariants.map(variant => {
            const row: any = {
                ...variant,
                key: variant.id,
            };
            locations.forEach(location => {
                const price = offeringPrices.find(
                    p => p.offering_variant_id === variant.id && p.location_id === location.id
                );
                row[`location_${location.id}`] = price ? price.amount : null;
                row[`price_id_location_${location.id}`] = price ? price.id : null;
            });
            customerSegments.forEach(segment => {
                const price = offeringPrices.find(
                    p => p.offering_variant_id === variant.id && p.customer_segment_id === segment.id
                );
                row[`segment_${segment.id}`] = price ? price.amount : null;
                row[`price_id_segment_${segment.id}`] = price ? price.id : null;
            });
            return row;
        });
        return mergedData;
    }, [offeringsAndVariants, locations, customerSegments, offeringPrices]);

    const handleEdit = (value: number | null, key: string, columnKey: string) => {
        setEditingData(prev => ({
            ...prev,
            [`${key}_${columnKey}`]: value,
        }));
    };

    const hasUnsavedChanges = Object.keys(editingData).length > 0;

    const savePricingMutation = useMutation({
        mutationFn: async (updatedPrices: any[]) => {
            if (!user) throw new Error('User not authenticated');

            const upsertPayload = updatedPrices.map(price => {
                const newRecord = {
                    ...price,
                    id: price.id || generateUUID(),
                    organization_id: selectedOrganization,
                    price_list_id: selectedPriceList,
                    created_by: price.created_by || user.id,
                    updated_by: user.id,
                    updated_at: new Date().toISOString(),
                    version: price.version ? price.version + 1 : 1,
                };
                return newRecord;
            });

            const { error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getOfferingPriceTableName())
                .upsert(upsertPayload);

            if (error) throw error;
        },
        onSuccess: () => {
            message.success('Pricing updated successfully');
            setEditingData({});
            queryClient.invalidateQueries({ queryKey: [getOfferingPriceTableName(), selectedOrganization, selectedPriceList] });
        },
        onError: (error) => {
            console.error('Error saving pricing:', error);
            message.error('Failed to save pricing');
        },
    });

    const handleSave = () => {
        if (!selectedPriceList) {
            message.error("Please select a price list to save changes.");
            return;
        }
        const updatedPrices: any[] = [];
        dataSource.forEach(row => {
            // Process locations
            locations.forEach(location => {
                const columnKey = `location_${location.id}`;
                const priceIdColumnKey = `price_id_location_${location.id}`;
                const editingKey = `${row.id}_${columnKey}`;

                if (editingData.hasOwnProperty(editingKey)) {
                    const priceValue = editingData[editingKey];
                    if (priceValue !== null) {
                        const priceObject = {
                            id: row[priceIdColumnKey] || null,
                            offering_variant_id: row.id,
                            amount: priceValue,
                            currency: 'USD',
                            min_quantity: 1,
                            location_id: location.id,
                            customer_segment_id: null,
                            version: null,
                        };
                        updatedPrices.push(priceObject);
                    }
                }
            });
            // Process customer segments
            customerSegments.forEach(segment => {
                const columnKey = `segment_${segment.id}`;
                const priceIdColumnKey = `price_id_segment_${segment.id}`;
                const editingKey = `${row.id}_${columnKey}`;

                if (editingData.hasOwnProperty(editingKey)) {
                    const priceValue = editingData[editingKey];
                    if (priceValue !== null) {
                        const priceObject = {
                            id: row[priceIdColumnKey] || null,
                            offering_variant_id: row.id,
                            amount: priceValue,
                            currency: 'USD',
                            min_quantity: 1,
                            location_id: null,
                            customer_segment_id: segment.id,
                            version: null,
                        };
                        updatedPrices.push(priceObject);
                    }
                }
            });
        });
        savePricingMutation.mutate(updatedPrices);
    };

    const dynamicColumns = useMemo(() => {
        const baseColumns = [
            {
                title: 'Product',
                dataIndex: ['offering', 'name'],
                key: 'offeringName',
                width: 200,
                fixed: 'left' as const,
            },
            {
                title: 'Variant SKU',
                dataIndex: 'sku',
                key: 'sku',
                width: 150,
                fixed: 'left' as const,
            },
        ];

        const locationColumns = locations.map(location => ({
            title: (
                <Tooltip title={`Location: ${location.name}`}>
                    <span>{`Loc: ${location.short_code}`}</span>
                </Tooltip>
            ),
            key: `location_${location.id}`,
            dataIndex: `location_${location.id}`,
            width: 120,
            render: (text: number, record: any) => (
                <InputNumber
                    min={0}
                    value={editingData[`${record.id}_location_${location.id}`] ?? text}
                    onChange={value => handleEdit(value, record.id, `location_${location.id}`)}
                    style={{ width: '100%' }}
                />
            ),
        }));

        const segmentColumns = customerSegments.map(segment => ({
            title: (
                <Tooltip title={`Customer Segment: ${segment.name}`}>
                    <span>{`Seg: ${segment.short_code}`}</span>
                </Tooltip>
            ),
            key: `segment_${segment.id}`,
            dataIndex: `segment_${segment.id}`,
            width: 120,
            render: (text: number, record: any) => (
                <InputNumber
                    min={0}
                    value={editingData[`${record.id}_segment_${segment.id}`] ?? text}
                    onChange={value => handleEdit(value, record.id, `segment_${segment.id}`)}
                    style={{ width: '100%' }}
                />
            ),
        }));

        return [...baseColumns, ...locationColumns, ...segmentColumns];
    }, [locations, customerSegments, editingData]);

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <Select
                    placeholder="Select Price List"
                    value={selectedPriceList}
                    onChange={setSelectedPriceList}
                    style={{ width: 200 }}
                    loading={isLoadingPriceLists}
                    className="input-mobile"
                >
                    {priceLists.map(pl => (
                        <Option key={pl.id} value={pl.id}>{pl.name}</Option>
                    ))}
                </Select>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || savePricingMutation.isPending || !selectedPriceList}
                    loading={savePricingMutation.isPending}
                >
                    Save Changes
                </Button>
            </div>

            {isMobile && (
                <Alert
                    message="Scroll horizontally to view all pricing columns"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    closable
                />
            )}

            <Table
                columns={dynamicColumns}
                dataSource={dataSource}
                rowKey="id"
                loading={isLoading}
                scroll={{ x: 'max-content' }}
                pagination={false}
                size={isMobile ? 'small' : 'middle'}
            />
        </>
    );
};

export default PricingManagerPage;
