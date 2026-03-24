# Shop Module Implementation Walkthrough (v1)
**Session**: 2026-03-24 ~23:09 IST

## What Was Built

A complete public-facing ecommerce shop module at `/shop/*`.

### Key Design Decisions

#### 1. Follows Project Standards
- **CSS**: `shop.css` uses **project CSS variables** (`--color-primary`, `--color-bg-primary`, `--color-bg-secondary`, `--color-border`, `--tenant-border-radius`, `--layout-padding`, `--header-hover-bg`) — shop automatically respects dark mode and all theme presets.
- **Auth pattern**: Uses `useAuthStore` the same as all other modules.

#### 2. Tenant Config (ShopConfig)
Stored in `organization.app_settings.shop_config` — same pattern as `timesheet_settings`:

```ts
// src/modules/shop/types/config.ts
export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  hero_type: 'static',           // 'slideshow' | 'static' | 'none'
  hero_title: '...',
  plp_columns: 3,                // 2 | 3 | 4
  plp_filter_position: 'sidebar', // 'sidebar' | 'top' | 'none'
  plp_pagination: 'numbered',    // 'numbered' | 'load_more' | 'infinite'
  plp_per_page: 24,
  pdp_image_position: 'left',   // 'left' | 'right'
  pdp_tabs: ['description', 'specs', 'reviews', 'faq'],
  pdp_sticky_cta: true,
  checkout_type: 'single_page', // 'single_page' | 'multi_step'
  checkout_payment_methods: ['card', 'upi', 'netbanking', 'cod'],
  cart_free_shipping_threshold: 999,
  cart_tax_rate: 18,
  features: { wishlist: true, compare: true, reviews: true, booking: true, search: true },
};
```

#### 3. Data Layer
- **Real Supabase**: Categories, products, search all use `catalog` schema.
- **Relationship Fix**: Resolved `PGRST200` error by joining `offerings` to `inventory_levels` via `offering_variants`.
- **Mock Finance**: Orders, addresses use `dataService.getMockOrders()` until `finance` schema is built.
- **Calendar Booking**: BookingPage directly inserts into `calendar.bookings`.

---

## Files Created/Modified

### Foundation
- `src/modules/shop/types/index.ts`
- `src/modules/shop/types/config.ts`
- `src/modules/shop/services/dataService.ts` [MODIFIED]
- `src/modules/shop/hooks/useCart.ts`
- `src/modules/shop/hooks/useWishlist.ts`
- `src/modules/shop/hooks/useShopConfig.ts`
- `src/modules/shop/shop.css`

### Pages
- `src/modules/shop/pages/HomePage.tsx`
- `src/modules/shop/pages/ProductListingPage.tsx`
- `src/modules/shop/pages/ProductDetailsPage.tsx`
- `src/modules/shop/pages/SearchResultsPage.tsx`
- `src/modules/shop/pages/CartPage.tsx`
- `src/modules/shop/pages/CheckoutPage.tsx`
- `src/modules/shop/pages/OrderConfirmationPage.tsx`
- `src/modules/shop/pages/WishlistPage.tsx`
- `src/modules/shop/pages/AccountPage.tsx`
- `src/modules/shop/pages/BookingPage.tsx`
- `src/modules/shop/pages/ShopLayout.tsx`

### Routes & Docs
- `src/routes/index.tsx` [MODIFIED]
- `docs/commerce-catalog/all-pages.md` [MODIFIED]
- `docs/commerce-catalog/plan.md` [MODIFIED]

## Database Objects Referenced
- `catalog.offerings`
- `catalog.offering_categories`
- `catalog.offering_prices`
- `catalog.offering_variants`
- `catalog.inventory_levels`
- `calendar.bookings`
- `calendar.event_types`
