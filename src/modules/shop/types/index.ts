// src/modules/shop/types/index.ts
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string | null;
  meta?: Record<string, any>;
  organization_id: string;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  offering_id: string;
  sku?: string;
  attributes: Record<string, string>; // { color: 'Red', size: 'XL' }
  price_adjustment?: number;
  inventory_quantity?: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductPrice {
  id: string;
  offering_id: string;
  price_list_id?: string;
  amount: number;
  currency: string;
  min_quantity?: number;
  max_quantity?: number;
}

export interface InventoryLevel {
  id: string;
  offering_id: string;
  location_id?: string;
  quantity: number;
  reserved_quantity?: number;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  type: 'product' | 'service' | 'digital' | 'bundle';
  category_id?: string | null;
  brand?: string;
  sku?: string;
  is_active: boolean;
  popularity_score?: number;
  meta?: {
    images?: string[];
    featured?: boolean;
    tags?: string[];
    faqs?: Array<{ question: string; answer: string }>;
    [key: string]: any;
  };
  created_at: string;
  // Joined fields
  price?: number;
  original_price?: number;
  discount_percent?: number;
  stock?: number;
  variants?: ProductVariant[];
  category?: Category;
}

export interface CartItem {
  id: string; // local ID
  product: Product;
  variant?: ProductVariant | null;
  quantity: number;
  price: number;
  line_total: number;
  added_at: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  coupon_code?: string;
}

export interface Address {
  id: string;
  label?: string; // 'Home', 'Work'
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

export interface OrderItem {
  id: string;
  offering_id: string;
  product_name: string;
  variant_label?: string;
  quantity: number;
  price: number;
  discount_amount: number;
  line_total: number;
  product?: Product;
}

export interface Order {
  id: string;
  display_id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  shipping_address: Address;
  billing_address: Address;
  notes?: string;
  created_at: string;
  items: OrderItem[];
}

export interface ProductFilters {
  category_id?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  type?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popularity';
  page?: number;
  limit?: number;
}

export interface Discount {
  id: string;
  code?: string;
  type: 'percentage' | 'fixed';
  value: number;
  is_active: boolean;
  min_order_amount?: number;
  expires_at?: string;
}

export interface Review {
  id: string;
  offering_id: string;
  customer_id: string;
  rating: number;
  title?: string;
  content?: string;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  customer_name?: string; // To be joined
}

export interface RatingSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<number, number>;
}

// Calendar / Booking types (from calendar schema)
export interface EventType {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  description?: string;
  duration_minutes: number;
  color?: string;
  is_active: boolean;
  booking_mode: string;
  assignment_strategy: string;
  credit_cost?: number;
  buffer_minutes?: number;
  created_at: string;
}

export interface BookingSlot {
  date: string; // ISO date string
  time: string; // '09:00'
  datetime: string; // full ISO datetime
  available: boolean;
}
