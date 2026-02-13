
import { supabase } from '@/lib/supabase';
import { OfferingVariant } from '../types/ecom';

interface MetaCatalogItem {
    method: 'UPDATE' | 'DELETE';
    data: {
        id: string;
        title: string;
        description: string;
        availability: 'in stock' | 'out of stock';
        condition: 'new' | 'refurbished' | 'used';
        price: string;
        link: string;
        image_link: string;
        brand: string;
        retailer_id: string;
        currency: string;
    };
}

export const MetaCommerceSyncService = {
    /**
     * Creates a new Meta Catalog for the organization and saves it to app_settings.
     */
    async createCatalog(organizationId: string, accessToken: string, wabaId: string, orgName: string) {
        // 1. Resolve Business ID from WABA
        const businessId = await this.resolveBusinessId(wabaId, accessToken);

        // 2. Create Catalog via Meta API
        const response = await fetch(`https://graph.facebook.com/v21.0/${businessId}/owned_product_catalogs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                name: `Zoworks Catalog - ${orgName}`,
                vertical: 'ecommerce'
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error?.message || 'Failed to create Meta Catalog');
        }

        const catalogId = result.id;

        // 3. Save Catalog ID to Supabase Organizations table
        // We use a JSONB merge to update the nested structure
        const { error: updateError } = await supabase
            .schema('identity')
            .from('organizations')
            .update({
                app_settings: supabase.rpc('jsonb_set_recursive', {
                    target: 'app_settings',
                    path: '{channels,whatsapp,commerce,catalog_id}',
                    value: `"${catalogId}"`
                })
            })
            .eq('id', organizationId);

        // Fallback if RPC is not available (standard update)
        if (updateError) {
            // Fetch current settings first
            const { data: org } = await supabase.schema('identity').from('organizations').select('app_settings').eq('id', organizationId).single();
            if (org) {
                const newSettings = { ...org.app_settings };
                if (!newSettings.channels) newSettings.channels = {};
                if (!newSettings.channels.whatsapp) newSettings.channels.whatsapp = {};
                if (!newSettings.channels.whatsapp.commerce) newSettings.channels.whatsapp.commerce = {};
                newSettings.channels.whatsapp.commerce.catalog_id = catalogId;
                newSettings.channels.whatsapp.commerce.sync_enabled = true;

                await supabase.schema('identity').from('organizations').update({ app_settings: newSettings }).eq('id', organizationId);
            }
        }

        return catalogId;
    },

    /**
     * Resolves the Business Manager ID that owns the WABA.
     */
    async resolveBusinessId(wabaId: string, accessToken: string) {
        if (!wabaId || wabaId === 'undefined') {
            throw new Error("Invalid WABA ID provided. Please check your WhatsApp configuration.");
        }

        const response = await fetch(`https://graph.facebook.com/v21.0/${wabaId}?fields=owner_business_info`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const result = await response.json();

        if (result.error) {
            throw new Error(`Meta API Error: ${result.error.message}`);
        }

        const businessId = result.owner_business_info?.id || result.id;
        if (!businessId) {
            throw new Error("Could not resolve Meta Business ID from WABA.");
        }

        return businessId;
    },

    /**
     * Syncs the entire organization catalog to Meta.
     */
    async syncCatalog(organizationId: string, accessToken: string, catalogId: string) {
        // ... (existing syncCatalog logic)
        const { data: offerings, error } = await supabase
            .schema('catalog')
            .from('offerings')
            .select(`
                *,
                variants:offering_variants(*),
                prices:offering_prices(*)
            `)
            .eq('organization_id', organizationId);

        if (error) throw error;
        if (!offerings) return;

        const batchRequests: MetaCatalogItem[] = [];

        offerings.forEach((offering) => {
            const variants = offering.variants || [];
            const basePrice = offering.prices?.find((p: any) => p.currency === 'INR')?.amount || 0;

            if (variants.length > 0) {
                variants.forEach((variant: OfferingVariant) => {
                    const variantPrice = offering.prices?.find((p: any) => p.offering_variant_id === variant.id)?.amount || basePrice;
                    batchRequests.push(this.mapToMeta(offering, variant, variantPrice));
                });
            } else {
                batchRequests.push(this.mapToMeta(offering, null, basePrice));
            }
        });

        const response = await fetch(`https://graph.facebook.com/v21.0/${catalogId}/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                allow_upsert: true,
                requests: batchRequests,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error?.message || 'Failed to sync with Meta');
        }

        return result;
    },

    mapToMeta(offering: any, variant: OfferingVariant | null, price: number): MetaCatalogItem {
        const id = variant ? variant.sku : offering.short_code;
        return {
            method: 'UPDATE',
            data: {
                id: id,
                retailer_id: id,
                title: offering.name + (variant ? ` (${Object.values(variant.attributes).join(' ')})` : ''),
                description: offering.description || offering.name,
                availability: offering.is_active ? 'in stock' : 'out of stock',
                condition: 'new',
                price: `${price} INR`,
                currency: 'INR',
                link: `https://shop.zoworks.ai/p/${offering.short_code}${variant ? `?v=${variant.sku}` : ''}`,
                image_link: 'https://zoworks.ai/placeholder-product.png',
                brand: 'Zoworks',
            },
        };
    }
};
