// src/modules/shop/hooks/useWishlist.ts
import { useState, useCallback } from 'react';
import type { Product } from '../types';

const WISHLIST_KEY = 'shop_wishlist';

export function useWishlist() {
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
    catch { return []; }
  });

  const toggle = useCallback((product: Product) => {
    setWishlist(prev => {
      const exists = prev.some(p => p.id === product.id);
      const updated = exists ? prev.filter(p => p.id !== product.id) : [...prev, product];
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.some(p => p.id === productId);
  }, [wishlist]);

  const remove = useCallback((productId: string) => {
    setWishlist(prev => {
      const updated = prev.filter(p => p.id !== productId);
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { wishlist, toggle, isInWishlist, remove, count: wishlist.length };
}
