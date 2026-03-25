// src/modules/shop/hooks/useCart.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Cart, CartItem, Product, ProductVariant, Discount } from '../types';
import { getDiscountByCode } from '../services/dataService';
import { getDbCart, upsertDbCart } from '../services/cartService';
import { useAuthStore } from '@/lib/authStore';
import { useShop } from '../context/ShopContext';

const CART_KEY = 'shop_cart';
const SESSION_TOKEN_KEY = 'shop_session_token';

function getSessionToken() {
  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

function calcCart(items: CartItem[], coupon?: Discount): Cart {
  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const discount_total = coupon
    ? coupon.type === 'percentage'
      ? Math.round(subtotal * coupon.value) / 100
      : coupon.value
    : 0;
  const shipping_total = subtotal >= 999 || subtotal === 0 ? 0 : 99;
  const tax_total = Math.round((subtotal - discount_total) * 0.18 * 100) / 100;
  const grand_total = subtotal - discount_total + shipping_total + tax_total;
  return { items, subtotal, discount_total, shipping_total, tax_total, grand_total };
}

export function useCart() {
  const { orgId } = useShop();
  const user = useAuthStore(s => s.user);
  const sessionToken = getSessionToken();
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<Discount | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const isFirstUpdate = useRef(true);

  // Initialize: Fetch from DB and sync with LocalStorage
  useEffect(() => {
    async function initCart() {
      const local = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      const userId = user?.id ?? undefined;
      const dbCart = await getDbCart(orgId, userId, userId ? undefined : sessionToken);
      
      if (dbCart) {
        setCartId(dbCart.id);
        if (dbCart.items?.length) {
          setItems(dbCart.items);
        }
      } else if (local.length) {
        setItems(local);
        // Sync local to DB immediately if DB is empty
        await upsertDbCart(orgId, local, userId, userId ? undefined : sessionToken);
        // Fetch again to get the ID (or update upsert to return it)
        const newDbCart = await getDbCart(orgId, userId, userId ? undefined : sessionToken);
        if (newDbCart) setCartId(newDbCart.id);
      }
      setIsInitializing(false);
    }
    initCart();
  }, [orgId, user?.id]);

  // Sync back to DB on changes
  useEffect(() => {
    if (isFirstUpdate.current) {
      isFirstUpdate.current = false;
      return;
    }
    if (isInitializing) return;

    const userId = user?.id ?? undefined;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    upsertDbCart(orgId, items, userId, userId ? undefined : sessionToken);
  }, [items, orgId, user?.id, isInitializing]);

  const cart: Cart = calcCart(items, coupon ?? undefined);

  const addItem = useCallback((product: Product, variant: ProductVariant | null, quantity: number = 1) => {
    setItems(prev => {
      const existingIdx = prev.findIndex(i =>
        i.product.id === product.id && (i.variant?.id ?? null) === (variant?.id ?? null)
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        const item = updated[existingIdx];
        const newQty = item.quantity + quantity;
        updated[existingIdx] = { ...item, quantity: newQty, line_total: item.price * newQty };
        return updated;
      }
      const price = variant?.price_adjustment
        ? (product.price ?? 0) + variant.price_adjustment
        : (product.price ?? 0);
      const newItem: CartItem = {
        id: `${product.id}-${variant?.id ?? 'default'}-${Date.now()}`,
        product,
        variant,
        quantity,
        price,
        line_total: price * quantity,
        added_at: new Date().toISOString(),
      };
      return [...prev, newItem];
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== itemId));
      return;
    }
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, quantity, line_total: i.price * quantity } : i
    ));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
    setCouponError(null);
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    setCouponError(null);
    const discount = await getDiscountByCode(code);
    if (!discount) {
      setCouponError('Invalid or expired coupon code.');
      return false;
    }
    if (discount.min_order_amount && cart.subtotal < discount.min_order_amount) {
      setCouponError(`Minimum order ₹${discount.min_order_amount} required.`);
      return false;
    }
    setCoupon(discount);
    return true;
  }, [cart.subtotal]);

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setCouponError(null);
  }, []);

  return {
    cart,
    cartId,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    coupon,
    couponError,
    isInitializing
  };
}
