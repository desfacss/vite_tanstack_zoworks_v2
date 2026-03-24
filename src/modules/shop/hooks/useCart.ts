// src/modules/shop/hooks/useCart.ts
import { useState, useEffect, useCallback } from 'react';
import type { Cart, CartItem, Product, ProductVariant, Discount } from '../types';
import { getDiscountByCode } from '../services/dataService';

const CART_KEY = 'shop_cart';

const emptyCart: Cart = {
  items: [],
  subtotal: 0,
  discount_total: 0,
  shipping_total: 0,
  tax_total: 0,
  grand_total: 0,
};

function calcCart(items: CartItem[], coupon?: Discount): Cart {
  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const discount_total = coupon
    ? coupon.type === 'percentage'
      ? Math.round(subtotal * coupon.value) / 100
      : coupon.value
    : 0;
  const shipping_total = subtotal >= 999 ? 0 : 99;
  const tax_total = Math.round((subtotal - discount_total) * 0.18 * 100) / 100;
  const grand_total = subtotal - discount_total + shipping_total + tax_total;
  return { items, subtotal, discount_total, shipping_total, tax_total, grand_total };
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  });
  const [coupon, setCoupon] = useState<Discount | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

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
        updated[existingIdx] = { ...item, quantity: newQty, line_total: item.unit_price * newQty };
        return updated;
      }
      const unit_price = variant?.price_adjustment
        ? (product.price ?? 0) + variant.price_adjustment
        : (product.price ?? 0);
      const newItem: CartItem = {
        id: `${product.id}-${variant?.id ?? 'default'}-${Date.now()}`,
        product,
        variant,
        quantity,
        unit_price,
        line_total: unit_price * quantity,
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
      i.id === itemId ? { ...i, quantity, line_total: i.unit_price * quantity } : i
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
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    coupon,
    couponError,
  };
}
