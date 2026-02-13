// Types for the e-commerce catalog module ported from zo_waCRM

export interface Organization {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface Location {
    id: string;
    organization_id: string;
    name: string;
    short_code: string;
    created_at: string;
    updated_at: string;
}

export interface CustomerSegment {
    id: string;
    organization_id: string;
    name: string;
    short_code: string;
    created_at: string;
    updated_at: string;
}

export interface Offering {
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
    // Populated by queries
    variants?: OfferingVariant[];
    bundles?: OfferingBundle[];
}

export interface OfferingVariant {
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

export interface OfferingBundle {
    id: string;
    offering_id: string;
    organization_id: string;
    name: string;
    created_at: string;
    updated_at: string;
    version: number;
    // Populated by queries
    items?: BundleItem[];
}

export interface BundleItem {
    id?: string;
    bundle_id: string;
    component_offering_id: string;
    quantity: number;
    organization_id: string;
    is_required: boolean;
    created_at: string;
    updated_at: string;
    version: number;
    // Populated by queries
    component_offering?: { name: string };
}

export interface PriceList {
    id: string;
    organization_id: string;
    name: string;
    short_code: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface OfferingPrice {
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
    // Populated by queries
    offering?: { name: string };
    price_list?: { name: string };
    offering_variant?: { sku: string };
}

export interface Discount {
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

export interface DiscountRule {
    id: string;
    discount_id: string;
    organization_id: string;
    rule_type: 'offering' | 'customer_segment' | 'location';
    target_id: string;
    min_quantity?: number;
    created_at: string;
    updated_at: string;
}

export type EntityType =
    | 'offerings'
    | 'offering-variants'
    | 'offering-bundles'
    | 'price-lists'
    | 'offering-prices'
    | 'discounts'
    | 'discount-rules'
    | 'customer-segments'
    | 'locations';
