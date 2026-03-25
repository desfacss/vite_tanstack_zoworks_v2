// src/modules/shop/services/cartService.ts
import { supabase } from '@/lib/supabase';
import type { CartItem } from '../types';

const CART_TABLE = 'carts';
const SCHEMA = 'commerce';

export async function getDbCart(orgId: string, customerId?: string, sessionToken?: string) {
  let query = supabase.schema(SCHEMA).from(CART_TABLE).select('*').eq('organization_id', orgId);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  } else if (sessionToken) {
    query = query.eq('session_token', sessionToken);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('getDbCart error:', error);
    return null;
  }
  return data;
}

export async function upsertDbCart(orgId: string, items: CartItem[], customerId?: string, sessionToken?: string) {
  const payload: any = {
    organization_id: orgId,
    items: items,
    updated_at: new Date().toISOString()
  };

  if (customerId) {
    payload.customer_id = customerId;
  } else if (sessionToken) {
    payload.session_token = sessionToken;
  }

  // Use upsert with a logical conflict check or a manual check-then-update/insert
  // For simplicity, we'll fetch first and then update or insert
  const existing = await getDbCart(orgId, customerId, sessionToken);

  if (existing) {
    const { error } = await supabase
      .schema(SCHEMA)
      .from(CART_TABLE)
      .update(payload)
      .eq('id', existing.id);
    if (error) console.error('upsertDbCart update error:', error);
  } else {
    const { error } = await supabase
      .schema(SCHEMA)
      .from(CART_TABLE)
      .insert(payload);
    if (error) console.error('upsertDbCart insert error:', error);
  }
}

export async function clearDbCart(orgId: string, customerId?: string, sessionToken?: string) {
  let query = supabase.schema(SCHEMA).from(CART_TABLE).delete().eq('organization_id', orgId);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  } else if (sessionToken) {
    query = query.eq('session_token', sessionToken);
  }

  const { error } = await query;
  if (error) console.error('clearDbCart error:', error);
}

export async function syncGuestCartToUser(orgId: string, sessionToken: string, customerId: string) {
  // 1. Get guest cart
  const guestCart = await getDbCart(orgId, undefined, sessionToken);
  if (!guestCart) return;

  // 2. Get user cart
  const userCart = await getDbCart(orgId, customerId);

  if (userCart) {
    // Merge items (simple append for now, can be smarter)
    const mergedItems = [...userCart.items, ...guestCart.items];
    // De-duplicate by product and variant
    const uniqueItems = mergedItems.reduce((acc: CartItem[], item: CartItem) => {
      const existing = acc.find(i => i.product.id === item.product.id && (i.variant?.id ?? null) === (item.variant?.id ?? null));
      if (existing) {
        existing.quantity += item.quantity;
        existing.line_total = existing.price * existing.quantity;
      } else {
        acc.push(item);
      }
      return acc;
    }, []);

    await upsertDbCart(orgId, uniqueItems, customerId);
    await clearDbCart(orgId, undefined, sessionToken);
  } else {
    // Transfer guest cart to user
    const { error } = await supabase
      .schema(SCHEMA)
      .from(CART_TABLE)
      .update({ customer_id: customerId, session_token: null })
      .eq('id', guestCart.id);
    if (error) console.error('syncGuestCartToUser error:', error);
  }
}
