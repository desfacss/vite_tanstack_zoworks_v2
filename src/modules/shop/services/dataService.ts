// src/modules/shop/services/dataService.ts
import { supabase } from '@/lib/supabase';
import type { Product, Category, ProductFilters, Order, Address, Review, Discount } from '../types';

// const ORG_ID = () => import.meta.env.VITE_PUBLIC_ORG_ID as string;

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategoryBySlug(orgId: string, slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .schema('catalog')
    .from('categories')
    .select('*')
    .eq('organization_id', orgId)
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('getCategoryBySlug:', error);
    return null;
  }
  return data;
}

export async function getCategories(orgId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .schema('catalog')
    .from('offering_categories')
    .select('*')
    .eq('organization_id', orgId)
    .order('name');
  if (error) console.error('getCategories:', error);
  return data || [];
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(orgId: string, filters: ProductFilters = {}): Promise<{ products: Product[]; total: number }> {
  const { category_id, brand, sort, page = 1, limit = 24, min_price, max_price, search, type } = filters;

  let query = supabase.schema('catalog').from('offerings').select(`
    *,
    offering_prices ( amount, currency ),
    offering_variants ( 
      inventory_levels ( quantity )
    )
  `, { count: 'exact' }).eq('organization_id', orgId).eq('is_active', true);

  if (category_id) query = query.eq('category_id', category_id);
  if (search) query = query.ilike('name', `%${search}%`);
  if (type) query = query.eq('type', type);
  if (brand) query = query.eq('brand', brand);

  // Sorting
  if (sort === 'newest') query = query.order('created_at', { ascending: false });
  else if (sort === 'popularity') query = query.order('popularity_score', { ascending: false });

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) console.error('getProducts:', error);

  const products: Product[] = (data || []).map(normalizeProduct);

  let result = products;
  if (min_price !== undefined) result = result.filter(p => p.price !== undefined && p.price >= min_price);
  if (max_price !== undefined) result = result.filter(p => p.price !== undefined && p.price <= max_price);
  if (sort === 'price_asc') result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (sort === 'price_desc') result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  return { products: result, total: count ?? result.length };
}

export async function getProductById(orgId: string, id: string): Promise<Product | null> {
  const { data, error } = await supabase.schema('catalog').from('offerings').select(`
    *,
    offering_prices ( * ),
    offering_variants ( 
      *,
      inventory_levels ( * )
    ),
    offering_bundles ( *, bundle_items ( * ) )
  `).eq('organization_id', orgId).eq('id', id).single();
  if (error) { console.error('getProductById:', error); return null; }
  return normalizeProduct(data);
}

export async function getFeaturedProducts(orgId: string, limit = 8): Promise<Product[]> {
  const { data, error } = await supabase.schema('catalog').from('offerings').select(`
    *, 
    offering_prices ( amount, currency ), 
    offering_variants ( 
      inventory_levels ( quantity )
    )
  `).eq('organization_id', orgId).eq('is_active', true).order('popularity_score', { ascending: false }).limit(limit);
  if (error) console.error('getFeaturedProducts:', error);
  return (data || []).map(normalizeProduct);
}

export async function searchProducts(orgId: string, query: string): Promise<Product[]> {
  const { data, error } = await supabase.schema('catalog').from('offerings').select(`
    *, 
    offering_prices ( amount, currency ),
    offering_variants ( 
      inventory_levels ( quantity )
    )
  `).eq('organization_id', orgId).eq('is_active', true).or(`name.ilike.%${query}%,description.ilike.%${query}%`).limit(20);
  if (error) console.error('searchProducts:', error);
  return (data || []).map(normalizeProduct);
}

function normalizeProduct(raw: any): Product {
  const prices: any[] = raw.offering_prices || [];
  const variants: any[] = raw.offering_variants || [];
  
  const basePrice = prices[0]?.amount ?? 0;
  
  // Sum inventory across all variants
  const totalStock = variants.reduce((sum: number, v: any) => {
    const inv: any[] = v.inventory_levels || [];
    return sum + inv.reduce((s: number, l: any) => s + (l.quantity ?? 0), 0);
  }, 0);

  return {
    ...raw,
    price: basePrice,
    original_price: raw.meta?.original_price ?? basePrice,
    discount_percent: raw.meta?.discount_percent ?? 0,
    stock: totalStock,
    variants: variants.map(v => ({
      ...v,
      stock: (v.inventory_levels || []).reduce((s: number, l: any) => s + (l.quantity ?? 0), 0)
    })),
  };
}

// ─── Discounts ────────────────────────────────────────────────────────────────

export async function getDiscountByCode(code: string): Promise<Discount | null> {
  const { data, error } = await supabase.schema('catalog').from('discounts')
    .select('*').eq('code', code).eq('is_active', true).single();
  if (error) return null;
  return data;
}

// ─── Real Orders (commerce schema) ───────────────────────────────────────────

export async function getOrders(orgId: string, customerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .schema('commerce')
    .from('orders')
    .select(`
      *,
      items:order_items (
        *,
        offering:offering_id ( name )
      )
    `)
    .eq('organization_id', orgId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getOrders:', error);
    return [];
  }

  return (data || []).map(normalizeOrder);
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .schema('commerce')
    .from('orders')
    .select(`
      *,
      items:order_items (
        *,
        offering:offering_id ( name )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('getOrderById:', error);
    return null;
  }

  return normalizeOrder(data);
}

function normalizeOrder(raw: any): Order {
  return {
    ...raw,
    items: (raw.items || []).map((item: any) => ({
      ...item,
      product_name: item.offering?.name || item.name
    })),
    subtotal: raw.subtotal_price || 0,
    discount_total: raw.total_discounts || 0,
    shipping_total: raw.total_shipping || 0,
    tax_total: raw.total_tax || 0,
    grand_total: raw.total_price || 0,
    display_id: raw.order_number || raw.id.slice(0, 8)
  };
}

// ─── Real Addresses (crm schema) ──────────────────────────────────────────────

export async function getCustomerAddresses(customerId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .schema('crm')
    .from('contacts')
    .select('details')
    .eq('id', customerId)
    .single();

  if (error) {
    console.error('getCustomerAddresses:', error);
    return [];
  }

  return data?.details?.shipping_addresses || [];
}

export async function saveAddress(customerId: string, address: Address): Promise<void> {
  // 1. Get current addresses
  const currentAddresses = await getCustomerAddresses(customerId);
  
  // 2. Update or append
  let updated;
  if (!address.id) {
    address.id = crypto.randomUUID();
    updated = [...currentAddresses, address];
  } else {
    updated = currentAddresses.map(a => a.id === address.id ? address : a);
    if (!updated.find(a => a.id === address.id)) {
      updated.push(address);
    }
  }

  // 3. Save back to contacts.details
  const { error } = await supabase
    .schema('crm')
    .from('contacts')
    .update({ 
      details: { 
        shipping_addresses: updated 
      } 
    })
    .eq('id', customerId);

  if (error) console.error('saveAddress:', error);
}

export async function deleteAddress(customerId: string, addressId: string): Promise<void> {
  const currentAddresses = await getCustomerAddresses(customerId);
  const updated = currentAddresses.filter(a => a.id !== addressId);

  const { error } = await supabase
    .schema('crm')
    .from('contacts')
    .update({ 
      details: { 
        shipping_addresses: updated 
      } 
    })
    .eq('id', customerId);

  if (error) console.error('deleteAddress:', error);
}

export async function createOrder(cartId: string, email: string, shippingAddress: Address, billingAddress?: Address): Promise<{ order_id: string, order_number: string, total_amount: number, payment_link: string } | null> {
  const { data, error } = await supabase
    .schema('commerce')
    .rpc('create_order_with_payment', {
      p_cart_id: cartId,
      p_email: email,
      p_shipping_address: shippingAddress,
      p_billing_address: billingAddress || shippingAddress
    });

  if (error) {
    console.error('createOrder RPC error:', error);
    return null;
  }

  return data;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getProductReviews(orgId: string, offeringId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .schema('commerce')
    .from('reviews')
    .select(`
      *,
      customer:crm.contacts!customer_id ( first_name, last_name )
    `)
    .eq('organization_id', orgId)
    .eq('offering_id', offeringId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getProductReviews error:', error);
    return [];
  }

  return (data || []).map((r: any) => ({
    ...r,
    customer_name: r.customer ? `${r.customer.first_name || ''} ${r.customer.last_name || ''}`.trim() : 'Anonymous'
  }));
}

export async function submitReview(orgId: string, review: Omit<Review, 'id' | 'created_at' | 'status' | 'is_verified_purchase'>): Promise<boolean> {
  const { error } = await supabase
    .schema('commerce')
    .from('reviews')
    .insert({
      organization_id: orgId,
      ...review,
      status: 'pending' // Default to pending for moderation
    });

  if (error) {
    console.error('submitReview error:', error);
    return false;
  }
  return true;
}

export async function getSearchSuggestions(orgId: string, query: string): Promise<Product[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .schema('catalog')
    .from('offerings')
    .select('id, name, type')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .limit(5);

  if (error) {
    console.error('getSearchSuggestions error:', error);
    return [];
  }
  return data as Product[];
}

// ─── Mock Helpers (Compatibility) ──────────────────────────────────────────
export function getMockOrders(): Order[] { return []; }
export function getSavedAddressesLegacy(): Address[] { return []; }
