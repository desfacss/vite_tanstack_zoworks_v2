// src/modules/shop/services/dataService.ts
import { supabase } from '@/lib/supabase';
import type { Product, Category, ProductFilters, Order, Address, Discount } from '../types';

// const ORG_ID = () => import.meta.env.VITE_PUBLIC_ORG_ID as string;

// ─── Categories ───────────────────────────────────────────────────────────────

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
  const { category_id, search, min_price, max_price, type, sort = 'newest', page = 1, limit = 24 } = filters;

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

// ─── Mock Orders (finance schema not yet live) ────────────────────────────────

const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-001',
    display_id: 'ZW-2024-001',
    status: 'delivered',
    payment_status: 'paid',
    subtotal: 2499,
    discount_total: 0,
    shipping_total: 99,
    tax_total: 225,
    grand_total: 2823,
    shipping_address: { id: 'addr-1', full_name: 'Jane Doe', phone: '9876543210', line1: '123 Main St', city: 'Bangalore', state: 'Karnataka', postal_code: '560001', country: 'IN' },
    billing_address: { id: 'addr-1', full_name: 'Jane Doe', phone: '9876543210', line1: '123 Main St', city: 'Bangalore', state: 'Karnataka', postal_code: '560001', country: 'IN' },
    created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    items: [
      { id: 'oi-1', offering_id: 'p1', product_name: 'Premium Widget', quantity: 2, unit_price: 1249.5, discount_amount: 0, line_total: 2499 }
    ]
  },
  {
    id: 'ord-002',
    display_id: 'ZW-2024-002',
    status: 'processing',
    payment_status: 'paid',
    subtotal: 5999,
    discount_total: 600,
    shipping_total: 0,
    tax_total: 539,
    grand_total: 5938,
    shipping_address: { id: 'addr-1', full_name: 'Jane Doe', phone: '9876543210', line1: '123 Main St', city: 'Bangalore', state: 'Karnataka', postal_code: '560001', country: 'IN' },
    billing_address: { id: 'addr-1', full_name: 'Jane Doe', phone: '9876543210', line1: '123 Main St', city: 'Bangalore', state: 'Karnataka', postal_code: '560001', country: 'IN' },
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    items: [
      { id: 'oi-2', offering_id: 'p2', product_name: 'Pro Service Package', quantity: 1, unit_price: 5999, discount_amount: 600, line_total: 5399 }
    ]
  }
];

export function getMockOrders(): Order[] { return MOCK_ORDERS; }
export function getMockOrderById(id: string): Order | undefined { return MOCK_ORDERS.find(o => o.id === id); }

// ─── Mock Addresses ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'shop_addresses';

export function getSavedAddresses(): Address[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveAddress(address: Address): void {
  const addresses = getSavedAddresses();
  const idx = addresses.findIndex(a => a.id === address.id);
  if (idx >= 0) addresses[idx] = address;
  else addresses.push(address);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
}

export function deleteAddress(id: string): void {
  const addresses = getSavedAddresses().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
}
