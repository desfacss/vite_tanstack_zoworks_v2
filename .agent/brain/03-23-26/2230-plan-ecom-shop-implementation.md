**Session**: 2026-03-23 ~22:19–22:30 IST

# E-commerce Site Development — Implementation Plan

This plan outlines the development of a comprehensive e-commerce site under the `/shop` route. The project uses a phased approach, starting with a robust mock data layer and building out the UI/UX for all requested pages.

## Decisions & Context

- **Module**: New `src/modules/shop` module, separate from the admin `catalog` module
- **Styling**: Vanilla CSS for a "premium" feel + `antd` for functional components
- **Database Strategy**: Read-only from Supabase for existing `catalog` tables; mock data for missing `finance` tables; all mock data kept in a central `dataService.ts` for easy replacement
- **Cart State**: Phase 1 = localStorage only; no server sync until `finance.carts` exists
- **Images**: Use `catalog.offerings.meta.images[]` JSONB convention
- **Razorpay**: UI mockup for now; real integration once `finance.payments` exists

---

## Phase 1 — Foundation (Data Layer)

### [NEW] `src/modules/shop/types/index.ts`
Unified TypeScript interfaces for Product, Variant, Category, CartItem, Order, Address, etc.

### [NEW] `src/modules/shop/services/dataService.ts`
Abstraction layer:
- `getCategories(orgId)` → `catalog.offering_categories`
- `getProducts(orgId, filters)` → `catalog.offerings` + `offering_prices` + `inventory_levels`
- `getProductDetail(id)` → offerings + variants + bundles + bundle_items + prices + discounts
- `getCart()` / `addToCart()` / `updateCart()` → localStorage (mock, easy to replace)
- `getOrders()` / `getOrderDetail()` → mock data (replace with `finance.orders`)
- `getAddresses()` / `saveAddress()` → mock data (replace with `finance.customer_addresses`)

### [NEW] `src/modules/shop/hooks/useCart.ts`
Custom hook wrapping cart state (localStorage-backed), computing subtotals, applying discounts.

---

## Phase 2 — Catalog Browsing (Real Supabase Data)

### [NEW] `src/modules/shop/pages/ShopLayout.tsx`
Shared layout: top nav with cart icon + counter, search bar, category mega-menu, footer.  
Route: `/shop/*`

### [NEW] `src/modules/shop/pages/HomePage.tsx`
- Hero banner (static/config-driven)
- Category grid (from `catalog.offering_categories`)
- Featured products carousel (from `catalog.offerings` with featured flag in `meta`)
- Promotional banners (static)  
Route: `/shop`

### [NEW] `src/modules/shop/pages/ProductListingPage.tsx`
- Category navigation sidebar
- Filter panel: price range, variant attributes (color, size from `offering_variants.attributes`)
- Sort: price asc/desc, newest, popularity
- Paginated 4-column grid of product cards  
Route: `/shop/products?category=&search=`

### [NEW] `src/modules/shop/pages/ProductDetailsPage.tsx`
- Image gallery (from `meta.images[]`)
- Variant picker: chips for color/size from `offering_variants`
- Inventory badge (from `catalog.inventory_levels`)
- Quantity stepper + Add to Cart
- Price with discount badge
- Bundle components display
- Product description tabs  
Route: `/shop/products/:id`

### [NEW] `src/modules/shop/pages/SearchResultsPage.tsx`
- Full text search against `offerings.name`, `offerings.description`
- Same filter/sort as PLP  
Route: `/shop/search?q=`

### [NEW] `src/modules/shop/pages/WishlistPage.tsx`
- Saved items (localStorage for now)
- Add to Cart from wishlist  
Route: `/shop/wishlist`

### [NEW] `src/modules/shop/pages/ComparePage.tsx`
- Side-by-side product comparison (up to 3 items)  
Route: `/shop/compare`

---

## Phase 3 — Transactional Flow (Mock Finance Data)

### [NEW] `src/modules/shop/pages/CartPage.tsx`
- Cart items with images, quantity steppers, remove
- Price subtotal, discount code input
- Proceed to Checkout button  
Route: `/shop/cart`

### [NEW] `src/modules/shop/pages/CheckoutPage.tsx`
- Multi-step: 1) Customer info, 2) Address, 3) Shipping method, 4) Order summary
- Discount code application
- Place Order button  
Route: `/shop/checkout`

### [NEW] `src/modules/shop/pages/PaymentPage.tsx`
- Razorpay UI mockup (real SDK integration placeholder)
- Payment method tabs: Card, UPI, Net Banking
- Processing/confirmation spinner  
Route: `/shop/payment`

### [NEW] `src/modules/shop/pages/OrderConfirmationPage.tsx`
- Order number + summary
- Email confirmation notice
- Download links (for digital products)
- Tracking info placeholder  
Route: `/shop/order-confirmation/:orderId`

---

## Phase 4 — Account Pages (Mock Finance Data)

### [NEW] `src/modules/shop/pages/Account/AccountDashboard.tsx`
Route: `/shop/account`

### [NEW] `src/modules/shop/pages/Account/OrderHistory.tsx`
Route: `/shop/account/orders`

### [NEW] `src/modules/shop/pages/Account/OrderDetails.tsx`
Route: `/shop/account/orders/:orderId`

### [NEW] `src/modules/shop/pages/Account/ProfileManagement.tsx`
Route: `/shop/account/profile`

### [NEW] `src/modules/shop/pages/Account/AddressBook.tsx`
Route: `/shop/account/addresses`

---

## Phase 5 — Support & Auth Wrapper

### [NEW] `src/modules/shop/pages/Support/ContactPage.tsx`
### [NEW] `src/modules/shop/pages/Support/FaqPage.tsx`
### [NEW] `src/modules/shop/pages/Support/PolicyPage.tsx`
(Return Policy, Shipping Policy, T&C, Privacy Policy)

### Shop-aware auth redirect
Update `src/pages/auth/Login.tsx` to detect `/shop` context and redirect to `/shop` after login instead of `/dashboard`.

---

## Route Updates

### [MODIFY] `src/routes/index.tsx`
Add under the `PublicLayout` block:
```tsx
<Route path="/shop" element={<ShopLayout />}>
  <Route index element={<HomePage />} />
  <Route path="products" element={<ProductListingPage />} />
  <Route path="products/:id" element={<ProductDetailsPage />} />
  <Route path="search" element={<SearchResultsPage />} />
  <Route path="wishlist" element={<WishlistPage />} />
  <Route path="compare" element={<ComparePage />} />
  <Route path="cart" element={<CartPage />} />
  <Route path="checkout" element={<CheckoutPage />} />
  <Route path="payment" element={<PaymentPage />} />
  <Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} />
  <Route path="account" element={<AccountDashboard />} />
  <Route path="account/orders" element={<OrderHistory />} />
  <Route path="account/orders/:orderId" element={<OrderDetails />} />
  <Route path="account/profile" element={<ProfileManagement />} />
  <Route path="account/addresses" element={<AddressBook />} />
  <Route path="support/contact" element={<ContactPage />} />
  <Route path="support/faq" element={<FaqPage />} />
  <Route path="support/policy/:type" element={<PolicyPage />} />
</Route>
```

---

## Backend Tables to Create (Backend Team Action Required)

### `catalog` schema additions
- `catalog.wishlists` — user wishlists
- `catalog.wishlist_items` — wishlist line items

### New `finance` schema (all missing)
- `finance.carts` + `finance.cart_items`
- `finance.orders` + `finance.order_items` + `finance.order_status_history`
- `finance.payments` + `finance.payment_methods` + `finance.invoices`
- `finance.customer_addresses` + `finance.customer_profiles`
- `finance.digital_downloads` + `finance.licenses`
- `finance.subscriptions` + `finance.subscription_items` (optional)

Full column-level schema in: `.agent/brain/03-23-26/2230-audit-ecom-shop-gap-analysis.md`

---

## Verification Plan
- Browse shop homepage and PLP using live Supabase data
- Add product to cart, update qty, verify subtotal
- Complete checkout mock flow → land on Order Confirmation
- Test responsive layout on mobile
- Verify `/shop` route is accessible without authentication
