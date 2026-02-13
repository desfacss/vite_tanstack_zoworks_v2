import React, { useState, useMemo } from 'react';
import {
    Table,
    Button,
    App,
    InputNumber,
    Tooltip,
    Alert,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { OfferingVariant, Location } from '../../types/ecom';
import { useAuthStore } from '@/lib/authStore';
import { useResponsive } from '../../hooks/useResponsive';

// Helper function to generate UUID using native crypto API
const generateUUID = () => crypto.randomUUID();

const getInventoryTableName = () => 'inventory_levels';
const getVariantTableName = () => 'offering_variants';
const getLocationTableName = () => 'locations';
const getCatalogSchemaName = () => 'catalog';

interface InventoryManagerPageProps {
    selectedOrganization: string;
}

interface VariantWithOffering extends OfferingVariant {
    offering?: { name: string; is_inventory_tracked: boolean };
}

const InventoryManagerPage: React.FC<InventoryManagerPageProps> = ({ selectedOrganization }) => {
    const { isMobile } = useResponsive();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [editingData, setEditingData] = useState<{ [key: string]: any }>({});

    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: [getLocationTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('identity')
                .from(getLocationTableName())
                .select('*')
                .eq('organization_id', selectedOrganization)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const { data: variants = [], isLoading: isLoadingVariants } = useQuery<VariantWithOffering[]>({
        queryKey: [getVariantTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getVariantTableName())
                .select(`
          *,
          offering:offerings(name, is_inventory_tracked)
        `)
                .eq('organization_id', selectedOrganization)
                .order('sku');
            if (error) throw error;
            return (data || []).filter(v => v.offering?.is_inventory_tracked);
        },
        enabled: !!selectedOrganization,
    });

    const { data: inventoryLevels = [], isLoading: isLoadingInventory } = useQuery<any[]>({
        queryKey: [getInventoryTableName(), selectedOrganization],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getInventoryTableName())
                .select('*')
                .eq('organization_id', selectedOrganization);
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedOrganization,
    });

    const dataSource = useMemo(() => {
        const mergedData = variants.map(variant => {
            const row: any = {
                ...variant,
                key: variant.id,
            };
            locations.forEach(location => {
                const level = inventoryLevels.find(
                    l => l.offering_variant_id === variant.id && l.location_id === location.id
                );
                row[`location_${location.id}`] = level ? level.quantity : 0;
                row[`level_id_${location.id}`] = level ? level.id : null;
            });
            return row;
        });
        return mergedData;
    }, [variants, locations, inventoryLevels]);

    const handleEdit = (value: number, key: string, locationId: string) => {
        setEditingData(prev => ({
            ...prev,
            [`${key}_${locationId}`]: value,
        }));
    };

    const hasUnsavedChanges = Object.keys(editingData).length > 0;

    const saveInventoryMutation = useMutation({
        mutationFn: async (updatedLevels: any[]) => {
            if (!user) throw new Error('User not authenticated');
            const upsertPayload = updatedLevels.map(level => {
                const newRecord = {
                    ...level,
                    id: level.id || generateUUID(),
                    organization_id: selectedOrganization,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id,
                    created_by: level.created_by || user.id,
                    version: level.version ? level.version + 1 : 1,
                };
                return newRecord;
            });

            const { error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getInventoryTableName())
                .upsert(upsertPayload);

            if (error) throw error;
        },
        onSuccess: () => {
            message.success('Inventory updated successfully');
            setEditingData({});
            queryClient.invalidateQueries({ queryKey: [getInventoryTableName(), selectedOrganization] });
        },
        onError: (error) => {
            console.error('Error saving inventory:', error);
            message.error('Failed to save inventory');
        },
    });

    const handleSave = () => {
        const updatedLevels: any[] = [];
        dataSource.forEach(row => {
            locations.forEach(location => {
                const key = `${row.id}_${location.id}`;
                if (editingData.hasOwnProperty(key)) {
                    const existingLevel = inventoryLevels.find(
                        l => l.offering_variant_id === row.id && l.location_id === location.id
                    );
                    updatedLevels.push({
                        id: existingLevel?.id || null,
                        offering_variant_id: row.id,
                        location_id: location.id,
                        quantity: editingData[key],
                        version: existingLevel?.version || null,
                        created_by: existingLevel?.created_by || null,
                    });
                }
            });
        });
        saveInventoryMutation.mutate(updatedLevels);
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
                <Tooltip title={location.name}>
                    <span>{location.short_code}</span>
                </Tooltip>
            ),
            key: location.id,
            dataIndex: `location_${location.id}`,
            width: 100,
            render: (text: number, record: any) => (
                <InputNumber
                    min={0}
                    value={editingData[`${record.id}_${location.id}`] ?? text}
                    onChange={value => handleEdit(value as number, record.id, location.id)}
                    style={{ width: '100%' }}
                />
            ),
        }));

        return [...baseColumns, ...locationColumns];
    }, [locations, editingData]);

    const isLoading = isLoadingVariants || isLoadingInventory;

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || saveInventoryMutation.isPending}
                    loading={saveInventoryMutation.isPending}
                >
                    Save Changes
                </Button>
            </div>

            {isMobile && (
                <Alert
                    message="Scroll horizontally to view all locations"
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

export default InventoryManagerPage;
