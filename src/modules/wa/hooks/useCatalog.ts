import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Type definition for catalog offerings/products
export interface Offering {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    price?: number;
    sku?: string;
    image_url?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

const getCatalogSchemaName = () => 'catalog';
const getOfferingTableName = () => 'offerings';

export const useCatalogOfferings = (organizationId?: string) => {
    // console.log('useCatalogOfferings: hook called with', organizationId);
    return useQuery<Offering[]>({
        queryKey: ['catalog_offerings', organizationId],
        queryFn: async () => {
            console.log('useCatalogOfferings: fetching for org', organizationId);
            if (!organizationId) {
                console.warn('useCatalogOfferings: no organizationId provided');
                return [];
            }

            const { data, error } = await supabase
                .schema(getCatalogSchemaName())
                .from(getOfferingTableName())
                .select('*')
                .eq('organization_id', organizationId)
                .eq('is_active', true) // Only show active products in picker
                .order('name');

            if (error) throw error;
            return data || [];
        },
        enabled: !!organizationId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
